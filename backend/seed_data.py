from database import SessionLocal
import models
from auth import get_password_hash
from datetime import datetime, timedelta
import random


def seed_database():
    db = SessionLocal()
    try:
        # Skip if already seeded
        if db.query(models.User).count() > 0:
            return

        print("🌱 Seeding database with sample data...")

        # Create admin user
        admin = models.User(
            username="admin",
            email="admin@payremind.ai",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin)
        db.flush()

        # Sample customers
        customers_data = [
            {"name": "Rajesh Kumar", "email": "rajesh@techsolutions.in", "phone": "+91-9876543210", "company": "TechSolutions Pvt Ltd", "credit_score": 780, "avg_payment_days": 12.0, "late_payments": 1, "paid_invoices": 8},
            {"name": "Priya Sharma", "email": "priya@designhub.in", "phone": "+91-9765432109", "company": "DesignHub Studios", "credit_score": 620, "avg_payment_days": 35.0, "late_payments": 5, "paid_invoices": 6},
            {"name": "Amit Patel", "email": "amit@globaltraders.co", "phone": "+91-9654321098", "company": "Global Traders Co.", "credit_score": 550, "avg_payment_days": 45.0, "late_payments": 8, "paid_invoices": 4},
            {"name": "Sneha Gupta", "email": "sneha@freshmart.in", "phone": "+91-9543210987", "company": "FreshMart Retail", "credit_score": 720, "avg_payment_days": 18.0, "late_payments": 2, "paid_invoices": 12},
            {"name": "Vikram Singh", "email": "vikram@infrabuild.in", "phone": "+91-9432109876", "company": "InfraBuild Corp", "credit_score": 480, "avg_payment_days": 55.0, "late_payments": 10, "paid_invoices": 3},
        ]

        customers = []
        for c_data in customers_data:
            avg_days = c_data.pop("avg_payment_days")
            late = c_data.pop("late_payments")
            paid = c_data.pop("paid_invoices")
            customer = models.Customer(**c_data, avg_payment_days=avg_days, late_payments=late, paid_invoices=paid)
            db.add(customer)
            db.flush()
            customers.append(customer)

        # Sample invoices
        now = datetime.utcnow()
        invoices_data = [
            # Customer 0 (good payer)
            {"invoice_number": "INV-2024-001", "customer": customers[0], "amount": 85000.0, "due_date": now + timedelta(days=10), "status": "pending", "risk_score": 15.0, "risk_level": "LOW"},
            {"invoice_number": "INV-2024-002", "customer": customers[0], "amount": 42000.0, "due_date": now - timedelta(days=3), "status": "overdue", "risk_score": 28.0, "risk_level": "LOW"},

            # Customer 1 (medium risk)
            {"invoice_number": "INV-2024-003", "customer": customers[1], "amount": 63000.0, "due_date": now - timedelta(days=15), "status": "overdue", "risk_score": 62.0, "risk_level": "MEDIUM"},
            {"invoice_number": "INV-2024-004", "customer": customers[1], "amount": 28500.0, "due_date": now + timedelta(days=5), "status": "pending", "risk_score": 55.0, "risk_level": "MEDIUM"},

            # Customer 2 (high risk)
            {"invoice_number": "INV-2024-005", "customer": customers[2], "amount": 120000.0, "due_date": now - timedelta(days=32), "status": "overdue", "risk_score": 88.0, "risk_level": "HIGH"},
            {"invoice_number": "INV-2024-006", "customer": customers[2], "amount": 55000.0, "due_date": now - timedelta(days=8), "status": "overdue", "risk_score": 79.0, "risk_level": "HIGH"},

            # Customer 3 (good payer)
            {"invoice_number": "INV-2024-007", "customer": customers[3], "amount": 38000.0, "due_date": now - timedelta(days=1), "status": "overdue", "risk_score": 22.0, "risk_level": "LOW"},
            {"invoice_number": "INV-2024-008", "customer": customers[3], "amount": 95000.0, "due_date": now + timedelta(days=14), "status": "pending", "risk_score": 18.0, "risk_level": "LOW"},

            # Customer 4 (very high risk)
            {"invoice_number": "INV-2024-009", "customer": customers[4], "amount": 200000.0, "due_date": now - timedelta(days=45), "status": "overdue", "risk_score": 94.0, "risk_level": "HIGH"},
            {"invoice_number": "INV-2024-010", "customer": customers[4], "amount": 75000.0, "due_date": now - timedelta(days=20), "status": "overdue", "risk_score": 85.0, "risk_level": "HIGH"},

            # Paid invoices
            {"invoice_number": "INV-2024-011", "customer": customers[0], "amount": 50000.0, "due_date": now - timedelta(days=30), "status": "paid", "risk_score": 10.0, "risk_level": "LOW"},
            {"invoice_number": "INV-2024-012", "customer": customers[3], "amount": 67000.0, "due_date": now - timedelta(days=20), "status": "paid", "risk_score": 12.0, "risk_level": "LOW"},
        ]

        for inv_data in invoices_data:
            customer = inv_data.pop("customer")
            days_overdue = max(0, int((now - inv_data["due_date"]).days)) if inv_data["due_date"] < now else 0
            
            # Escalation level based on days overdue
            if days_overdue == 0:
                escalation = 1
                action = "Schedule friendly reminder before due date"
            elif days_overdue <= 7:
                escalation = 1
                action = "Send friendly payment reminder"
            elif days_overdue <= 14:
                escalation = 2
                action = "Send firm reminder with urgency"
            elif days_overdue <= 30:
                escalation = 3
                action = "Urgent reminder + escalate to management"
            else:
                escalation = 4
                action = "Legal action / collections recommended"

            invoice = models.Invoice(
                **inv_data,
                customer_id=customer.id,
                days_overdue=days_overdue,
                escalation_level=escalation,
                recommended_action=action,
                description=f"Services rendered for {customer.company}"
            )
            db.add(invoice)
            db.flush()

            # Update customer stats
            customer.total_invoices += 1
            if inv_data["status"] == "paid":
                customer.paid_invoices += 1
            if inv_data["status"] == "overdue":
                customer.total_outstanding += inv_data["amount"]

        db.commit()
        print("✅ Database seeded successfully!")
        print("   Login: admin / admin123")

    except Exception as e:
        print(f"❌ Seeding error: {e}")
        db.rollback()
    finally:
        db.close()
