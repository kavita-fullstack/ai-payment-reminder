from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.ReminderOut])
def get_reminders(skip: int = 0, limit: int = 50, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    return (
        db.query(models.Reminder)
        .order_by(models.Reminder.sent_at.desc())
        .offset(skip).limit(limit).all()
    )


@router.get("/with-details")
def get_reminders_with_details(db: Session = Depends(get_db),
                                current_user=Depends(get_current_user)):
    reminders = (
        db.query(models.Reminder)
        .options(joinedload(models.Reminder.invoice), joinedload(models.Reminder.customer))
        .order_by(models.Reminder.sent_at.desc())
        .limit(50).all()
    )
    return [
        {
            "id": r.id,
            "invoice_number": r.invoice.invoice_number if r.invoice else "N/A",
            "customer_name": r.customer.name if r.customer else "N/A",
            "company": r.customer.company if r.customer else "N/A",
            "customer_email": r.customer.email if r.customer else "N/A",
            "subject": r.subject,
            "email_content": r.email_content,
            "tone": r.tone,
            "status": r.status,
            "escalation_level": r.escalation_level,
            "sent_at": r.sent_at.isoformat(),
            "amount": r.invoice.amount if r.invoice else 0
        }
        for r in reminders
    ]


@router.patch("/{reminder_id}/mark-sent")
def mark_reminder_sent(reminder_id: int, db: Session = Depends(get_db),
                       current_user=Depends(get_current_user)):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.status = "sent"
    db.commit()
    return {"message": "Reminder marked as sent"}


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted"}
