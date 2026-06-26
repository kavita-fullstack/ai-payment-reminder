# 🤖 AI Payment Reminder Assistant

An AI-powered payment collection system with ML risk prediction, Claude AI email generation, **actual email sending**, and an **Agentic AI collection planner**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 Dashboard | Real-time stats — outstanding amounts, overdue counts, risk overview |
| 👥 Customers | Full CRUD for customer accounts with payment history |
| 🧾 Invoices | Create/edit/delete invoices with auto overdue detection (**bug fixed**) |
| 🤖 AI Risk Predictions | ML model scores every invoice (LOW / MEDIUM / HIGH risk) |
| ✉️ AI Email Generation | Claude AI writes personalized reminder emails (3 tones) |
| 📧 **Send Email to Customer** | Sends the generated email directly via SMTP (new!) |
| 🧠 **Agentic AI Planner** | Claude autonomously analyzes your entire portfolio and returns a prioritized action plan (new!) |

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and SMTP credentials
python main.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Open: http://localhost:3000  
Login: `admin` / `admin123`

---

## 📧 Email Sending Setup (Gmail)

1. Enable 2-Step Verification on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an App Password for "Mail"
4. Add to `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_NAME=FinCollect Solutions
```

> For other providers: Office365 uses `smtp.office365.com:587`, Mailgun/SendGrid also work.

---

## 🧠 Agentic AI — How It Works

The **Agentic AI Planner** (sidebar → "Agentic AI") sends your full invoice portfolio to Claude, which autonomously:

1. Reads all unpaid invoices with risk scores, overdue days, customer history
2. Applies collection strategy reasoning
3. Returns a prioritized action plan (calls, emails, legal notices) ranked by urgency

No API key? It falls back to a rule-based plan automatically.

---

## 🔧 Invoice Bug Fix

**Problem:** Creating invoices with a future or timezone-aware `due_date` caused a comparison error (`TypeError: can't compare offset-naive and offset-aware datetimes`).

**Fix:** `invoice_routes.py` now strips timezone info (`_naive()` helper) before any datetime arithmetic, making all comparisons safe.

---

## 📁 Project Structure

```
ai-payment-reminder/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── database.py
│   ├── seed_data.py
│   ├── requirements.txt
│   ├── .env                    ← your secrets (never commit)
│   ├── .env.example
│   ├── ai/
│   │   ├── email_generator.py  ← Claude AI email writer
│   │   ├── email_sender.py     ← SMTP send (new)
│   │   └── agentic_ai.py       ← Agentic collection planner (new)
│   ├── ml/
│   │   └── predictor.py        ← scikit-learn risk model
│   └── routes/
│       ├── auth_routes.py
│       ├── customer_routes.py
│       ├── invoice_routes.py   ← bug fixed
│       ├── reminder_routes.py
│       └── prediction_routes.py ← send-email + agent endpoints (new)
└── frontend/
    └── src/
        ├── App.jsx             ← AgentAI route added
        ├── components/
        │   └── Sidebar.jsx     ← Agentic AI nav item (new)
        └── pages/
            ├── Reminders.jsx   ← Send Email button (new)
            └── AgentAI.jsx     ← Agentic AI page (new)
```

---

## 🔑 API Endpoints (new)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predictions/send-email/{reminder_id}` | Send reminder email via SMTP |
| GET | `/api/predictions/agent/collection-plan` | Run Agentic AI collection planner |

---

## 🛠 Tech Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, scikit-learn
- **AI:** Anthropic Claude (`claude-sonnet-4-20250514`)
- **Email:** Python `smtplib` (SMTP/TLS)
- **Frontend:** React, React Router, react-hot-toast
