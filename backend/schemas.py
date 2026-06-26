from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Auth Schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    email: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# Customer Schemas
class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    credit_score: Optional[int] = 700

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: Optional[str] = None
    email: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    total_invoices: int
    late_payments: int
    paid_invoices: int
    avg_payment_days: float
    total_outstanding: float
    created_at: datetime
    class Config:
        from_attributes = True


# Invoice Schemas
class InvoiceBase(BaseModel):
    invoice_number: str
    customer_id: int
    amount: float
    due_date: datetime
    description: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    amount: Optional[float] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    description: Optional[str] = None

class InvoiceOut(InvoiceBase):
    id: int
    status: str
    risk_score: float
    risk_level: str
    days_overdue: int
    escalation_level: int
    recommended_action: Optional[str]
    issued_date: datetime
    customer: Optional[CustomerOut] = None
    class Config:
        from_attributes = True


# Reminder Schemas
class ReminderGenerate(BaseModel):
    invoice_id: int
    tone: str = "friendly"

class ReminderOut(BaseModel):
    id: int
    invoice_id: int
    customer_id: int
    subject: Optional[str]
    email_content: Optional[str]
    tone: str
    sent_at: datetime
    status: str
    escalation_level: int
    class Config:
        from_attributes = True


# Prediction Schema
class PredictionResult(BaseModel):
    invoice_id: int
    risk_score: float
    risk_level: str
    probability: float
    recommended_action: str
    smart_timing: str
    escalation_level: int


# Dashboard Stats
class DashboardStats(BaseModel):
    total_invoices: int
    pending_invoices: int
    overdue_invoices: int
    paid_invoices: int
    total_outstanding: float
    total_collected: float
    high_risk_count: int
    total_customers: int
