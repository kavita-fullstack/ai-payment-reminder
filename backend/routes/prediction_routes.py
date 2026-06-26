from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models, schemas
from auth import get_current_user
from ml.predictor import predict_risk
from ai.email_generator import generate_reminder_email
from ai.email_sender import send_email_to_customer
from ai.agentic_ai import run_collection_agent
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()


class SendEmailRequest(BaseModel):
    reminder_id: int


# ─── Risk Scoring ────────────────────────────────────────────────────────────

@router.get("/risk-all")
def get_all_risk_scores(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Return all non-paid invoices with their risk scores."""
    invoices = (
        db.query(models.Invoice)
        .options(joinedload(models.Invoice.customer))
        .filter(models.Invoice.status != "paid")
        .all()
    )
    results = []
    for inv in invoices:
        c = inv.customer
        late_rate = (c.late_payments / max(c.total_invoices, 1)) if c else 0.3
        result = predict_risk(
            invoice_amount=inv.amount,
            days_overdue=inv.days_overdue,
            late_payment_rate=late_rate,
            credit_score=c.credit_score if c else 600,
            avg_payment_days=c.avg_payment_days if c else 30,
            total_invoices=c.total_invoices if c else 1,
        )
        inv.risk_score = result["risk_score"]
        inv.risk_level = result["risk_level"]
        inv.escalation_level = result["escalation_level"]
        inv.recommended_action = result["recommended_action"]
        results.append({
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": c.name if c else "N/A",
            "company": c.company if c else "N/A",
            "amount": inv.amount,
            "days_overdue": inv.days_overdue,
            "status": inv.status,
            **result
        })
    db.commit()
    return sorted(results, key=lambda x: x["risk_score"], reverse=True)


@router.post("/predict/{invoice_id}", response_model=schemas.PredictionResult)
def predict_invoice_risk(invoice_id: int, db: Session = Depends(get_db),
                         current_user=Depends(get_current_user)):
    inv = db.query(models.Invoice).options(joinedload(models.Invoice.customer)).filter(
        models.Invoice.id == invoice_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    c = inv.customer
    late_rate = (c.late_payments / max(c.total_invoices, 1)) if c else 0.3
    result = predict_risk(
        invoice_amount=inv.amount,
        days_overdue=inv.days_overdue,
        late_payment_rate=late_rate,
        credit_score=c.credit_score if c else 600,
        avg_payment_days=c.avg_payment_days if c else 30,
        total_invoices=c.total_invoices if c else 1,
    )
    inv.risk_score = result["risk_score"]
    inv.risk_level = result["risk_level"]
    inv.escalation_level = result["escalation_level"]
    inv.recommended_action = result["recommended_action"]
    db.commit()

    return schemas.PredictionResult(invoice_id=invoice_id, **result)


# ─── Email Generation ─────────────────────────────────────────────────────────

@router.post("/generate-email")
def generate_email(data: schemas.ReminderGenerate, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    inv = db.query(models.Invoice).options(joinedload(models.Invoice.customer)).filter(
        models.Invoice.id == data.invoice_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    c = inv.customer
    due_str = inv.due_date.strftime("%d %b %Y")
    email_data = generate_reminder_email(
        customer_name=c.name if c else "Valued Customer",
        customer_email=c.email if c else "",
        company_name=c.company if c else "Your Company",
        invoice_number=inv.invoice_number,
        amount=inv.amount,
        due_date=due_str,
        days_overdue=inv.days_overdue,
        tone=data.tone,
        escalation_level=inv.escalation_level or 1
    )

    # Save reminder record
    reminder = models.Reminder(
        invoice_id=inv.id,
        customer_id=inv.customer_id,
        subject=email_data.get("subject", ""),
        email_content=email_data.get("body", ""),
        tone=data.tone,
        escalation_level=inv.escalation_level or 1,
        status="generated"
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return {
        "reminder_id": reminder.id,
        "invoice_number": inv.invoice_number,
        "customer_name": c.name if c else "N/A",
        "customer_email": c.email if c else "",
        "subject": email_data.get("subject", ""),
        "body": email_data.get("body", ""),
        "tone": data.tone,
        "escalation_level": inv.escalation_level,
        "risk_level": inv.risk_level,
        "recommended_action": inv.recommended_action
    }


# ─── Send Email ───────────────────────────────────────────────────────────────

@router.post("/send-email/{reminder_id}")
def send_email(reminder_id: int, db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    """Send the generated email to the customer via SMTP."""
    reminder = (
        db.query(models.Reminder)
        .options(joinedload(models.Reminder.customer), joinedload(models.Reminder.invoice))
        .filter(models.Reminder.id == reminder_id)
        .first()
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    c = reminder.customer
    if not c or not c.email:
        raise HTTPException(status_code=400, detail="Customer email not found")

    result = send_email_to_customer(
        to_email=c.email,
        customer_name=c.name,
        subject=reminder.subject or f"Payment Reminder - {reminder.invoice.invoice_number if reminder.invoice else ''}",
        body=reminder.email_content or ""
    )

    if result["success"]:
        reminder.status = "sent"
        db.commit()

    return result


# ─── Agentic AI ───────────────────────────────────────────────────────────────

@router.get("/agent/collection-plan")
def get_collection_plan(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Agentic AI endpoint: Claude autonomously analyzes all unpaid invoices
    and returns a prioritized collection action plan.
    """
    invoices = (
        db.query(models.Invoice)
        .options(joinedload(models.Invoice.customer))
        .filter(models.Invoice.status != "paid")
        .all()
    )

    # Build data payload for the agent
    invoice_data = []
    for inv in invoices:
        c = inv.customer
        invoice_data.append({
            "invoice_number": inv.invoice_number,
            "customer_name": c.name if c else "N/A",
            "company": c.company if c else "N/A",
            "customer_email": c.email if c else "",
            "amount": inv.amount,
            "days_overdue": inv.days_overdue,
            "risk_level": inv.risk_level or "LOW",
            "risk_score": inv.risk_score or 0,
            "status": inv.status,
            "escalation_level": inv.escalation_level or 1,
            "recommended_action": inv.recommended_action or "",
        })

    plan = run_collection_agent(invoice_data)
    return {
        "total_invoices_analyzed": len(invoice_data),
        "generated_at": datetime.utcnow().isoformat(),
        **plan
    }
