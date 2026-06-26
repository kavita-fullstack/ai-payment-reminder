import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "payment_risk_model.pkl")


def train_model():
    """Train a RandomForest classifier on synthetic payment history data."""
    print("🤖 Training ML payment risk model...")
    np.random.seed(42)
    n = 2000

    # Synthetic feature generation
    invoice_amount = np.random.uniform(1000, 500000, n)
    days_overdue = np.random.randint(0, 90, n)
    late_payment_rate = np.random.uniform(0, 1, n)
    credit_score = np.random.randint(300, 850, n)
    avg_payment_days = np.random.uniform(1, 90, n)
    total_invoices = np.random.randint(1, 100, n)
    invoice_count_recent = np.random.randint(0, 10, n)

    X = np.column_stack([
        invoice_amount,
        days_overdue,
        late_payment_rate,
        credit_score,
        avg_payment_days,
        total_invoices,
        invoice_count_recent
    ])

    # Risk label: 1 = late payer
    y = (
        (late_payment_rate > 0.35) |
        (days_overdue > 10) |
        (credit_score < 500) |
        (avg_payment_days > 40)
    ).astype(int)

    # Add realistic noise
    noise_idx = np.random.choice(n, size=int(n * 0.08), replace=False)
    y[noise_idx] = 1 - y[noise_idx]

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        ))
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"✅ ML model trained and saved to {MODEL_PATH}")
    return pipeline


def ensure_model_trained():
    if not os.path.exists(MODEL_PATH):
        train_model()


def predict_risk(
    invoice_amount: float,
    days_overdue: int,
    late_payment_rate: float,
    credit_score: int,
    avg_payment_days: float,
    total_invoices: int,
    invoice_count_recent: int = 0
) -> dict:
    ensure_model_trained()
    pipeline = joblib.load(MODEL_PATH)

    features = np.array([[
        invoice_amount,
        days_overdue,
        late_payment_rate,
        credit_score,
        avg_payment_days,
        total_invoices,
        invoice_count_recent
    ]])

    probability = float(pipeline.predict_proba(features)[0][1])
    risk_score = round(probability * 100, 2)

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Smart reminder timing
    if days_overdue == 0:
        smart_timing = "Send reminder 3 days before due date"
    elif days_overdue <= 3:
        smart_timing = "Send reminder today — just overdue"
    elif days_overdue <= 7:
        smart_timing = "Send urgent reminder now"
    elif days_overdue <= 14:
        smart_timing = "Send firm reminder + call customer"
    elif days_overdue <= 30:
        smart_timing = "Escalate to management immediately"
    else:
        smart_timing = "Consider legal/collections action"

    # Escalation level
    if days_overdue == 0:
        escalation_level = 1
        action = "Pre-due friendly reminder"
    elif days_overdue <= 7:
        escalation_level = 1
        action = "Send friendly payment reminder"
    elif days_overdue <= 14:
        escalation_level = 2
        action = "Send firm reminder with clear deadline"
    elif days_overdue <= 30:
        escalation_level = 3
        action = "Urgent notice + management escalation"
    else:
        escalation_level = 4
        action = "Legal action / collections recommended"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "probability": probability,
        "smart_timing": smart_timing,
        "escalation_level": escalation_level,
        "recommended_action": action
    }
