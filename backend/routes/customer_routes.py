from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.CustomerOut])
def get_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    return db.query(models.Customer).offset(skip).limit(limit).all()


@router.get("/stats")
def get_customer_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total = db.query(models.Customer).count()
    high_risk = db.query(models.Customer).filter(models.Customer.late_payments >= 5).count()
    return {"total": total, "high_risk": high_risk}


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/", response_model=schemas.CustomerOut)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(customer_id: int, customer: schemas.CustomerUpdate,
                    db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in customer.model_dump(exclude_unset=True).items():
        setattr(db_customer, key, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(db_customer)
    db.commit()
    return {"message": "Customer deleted successfully"}
