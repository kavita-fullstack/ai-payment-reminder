from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20))
    company = Column(String(100))
    total_invoices = Column(Integer, default=0)
    late_payments = Column(Integer, default=0)
    paid_invoices = Column(Integer, default=0)
    avg_payment_days = Column(Float, default=0.0)
    credit_score = Column(Integer, default=700)
    total_outstanding = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    issued_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")  # pending, paid, overdue
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(10), default="LOW")  # LOW, MEDIUM, HIGH
    days_overdue = Column(Integer, default=0)
    description = Column(Text)
    escalation_level = Column(Integer, default=1)
    recommended_action = Column(String(200))
    customer = relationship("Customer", back_populates="invoices")
    reminders = relationship("Reminder", back_populates="invoice", cascade="all, delete")


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    subject = Column(String(200))
    email_content = Column(Text)
    tone = Column(String(20), default="friendly")  # friendly, firm, urgent
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="sent")
    escalation_level = Column(Integer, default=1)
    invoice = relationship("Invoice", back_populates="reminders")
    customer = relationship("Customer")
