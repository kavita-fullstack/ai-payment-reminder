from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()


def _naive(dt: datetime) -> datetime:
    """Strip timezone info to make datetime naive for comparison."""
    if dt is None:
        return dt
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    now = datetime.utcnow()

    # Auto-update overdue statuses
    overdue_invoices = db.query(models.Invoice).filter(
        models.Invoice.due_date < now,
        models.Invoice.status == "pending"
    ).all()
    for inv in overdue_invoices:
        inv.status = "overdue"
        inv.days_overdue = (now - _naive(inv.due_date)).days
    if overdue_invoices:
        db.commit()

    total = db.query(models.Invoice).count()
    pending = db.query(models.Invoice).filter(models.Invoice.status == "pending").count()
    overdue = db.query(models.Invoice).filter(models.Invoice.status == "overdue").count()
    paid = db.query(models.Invoice).filter(models.Invoice.status == "paid").count()

    outstanding_q = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status.in_(["pending", "overdue"])
    ).scalar() or 0.0

    collected_q = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status == "paid"
    ).scalar() or 0.0

    high_risk = db.query(models.Invoice).filter(
        models.Invoice.risk_level == "HIGH",
        models.Invoice.status != "paid"
    ).count()

    customers = db.query(models.Customer).count()

    return schemas.DashboardStats(
        total_invoices=total,
        pending_invoices=pending,
        overdue_invoices=overdue,
        paid_invoices=paid,
        total_outstanding=round(outstanding_q, 2),
        total_collected=round(collected_q, 2),
        high_risk_count=high_risk,
        total_customers=customers
    )


@router.get("/monthly-revenue")
def get_monthly_revenue(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    invoices = db.query(models.Invoice).filter(models.Invoice.status == "paid").all()
    monthly = {}
    for inv in invoices:
        key = inv.issued_date.strftime("%b %Y")
        monthly[key] = monthly.get(key, 0) + inv.amount

    result = [{"month": k, "revenue": round(v, 2)} for k, v in sorted(monthly.items())]
    if not result:
        result = [{"month": "Jun 2024", "revenue": 0}]
    return result


@router.get("/recent")
def get_recent_invoices(limit: int = 8, db: Session = Depends(get_db),
                        current_user=Depends(get_current_user)):
    invoices = (
        db.query(models.Invoice)
        .options(joinedload(models.Invoice.customer))
        .order_by(models.Invoice.issued_date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": inv.customer.name if inv.customer else "N/A",
            "company": inv.customer.company if inv.customer else "N/A",
            "amount": inv.amount,
            "status": inv.status,
            "risk_level": inv.risk_level,
            "days_overdue": inv.days_overdue,
            "due_date": inv.due_date.isoformat()
        }
        for inv in invoices
    ]


@router.get("/", response_model=List[schemas.InvoiceOut])
def get_invoices(skip: int = 0, limit: int = 100, status: str = None,
                 db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(models.Invoice).options(joinedload(models.Invoice.customer))
    if status:
        query = query.filter(models.Invoice.status == status)
    return query.order_by(models.Invoice.due_date.asc()).offset(skip).limit(limit).all()


@router.get("/{invoice_id}", response_model=schemas.InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    invoice = db.query(models.Invoice).options(joinedload(models.Invoice.customer)).filter(
        models.Invoice.id == invoice_id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/", response_model=schemas.InvoiceOut)
def create_invoice(invoice: schemas.InvoiceCreate, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    # Check duplicate invoice number
    if db.query(models.Invoice).filter(models.Invoice.invoice_number == invoice.invoice_number).first():
        raise HTTPException(status_code=400, detail="Invoice number already exists")

    now = datetime.utcnow()
    due_date_naive = _naive(invoice.due_date)

    # Determine status & overdue days safely
    if due_date_naive < now:
        days_overdue = (now - due_date_naive).days
        status = "overdue"
    else:
        days_overdue = 0
        status = "pending"

    # Build model dict with naive due_date to avoid SQLite timezone issues
    invoice_data = invoice.model_dump()
    invoice_data["due_date"] = due_date_naive

    db_inv = models.Invoice(
        **invoice_data,
        status=status,
        days_overdue=days_overdue
    )
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    # Eagerly load customer for response
    db.refresh(db_inv)
    return db.query(models.Invoice).options(joinedload(models.Invoice.customer)).filter(
        models.Invoice.id == db_inv.id
    ).first()


@router.put("/{invoice_id}", response_model=schemas.InvoiceOut)
def update_invoice(invoice_id: int, invoice: schemas.InvoiceUpdate,
                   db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not db_inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    update_data = invoice.model_dump(exclude_unset=True)
    # Normalize due_date if present
    if "due_date" in update_data and update_data["due_date"]:
        update_data["due_date"] = _naive(update_data["due_date"])
    for key, value in update_data.items():
        setattr(db_inv, key, value)
    db.commit()
    db.refresh(db_inv)
    return db.query(models.Invoice).options(joinedload(models.Invoice.customer)).filter(
        models.Invoice.id == invoice_id
    ).first()


@router.patch("/{invoice_id}/mark-paid")
def mark_invoice_paid(invoice_id: int, db: Session = Depends(get_db),
                      current_user=Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.status = "paid"
    inv.days_overdue = 0
    inv.risk_score = 0.0
    inv.risk_level = "LOW"
    db.commit()
    return {"message": "Invoice marked as paid"}


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(inv)
    db.commit()
    return {"message": "Invoice deleted"}
