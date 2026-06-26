import anthropic
import os


TONE_INSTRUCTIONS = {
    "friendly": (
        "Write in a warm, friendly, and understanding tone. "
        "Be empathetic and assume the delay might be an oversight. "
        "Keep the language approachable and professional."
    ),
    "firm": (
        "Write in a professional and firm tone. "
        "Be clear about the urgency and the specific amount outstanding. "
        "Mention consequences if payment is not received soon, without being aggressive."
    ),
    "urgent": (
        "Write in an urgent tone. Clearly state this is a serious matter. "
        "Emphasize the immediate need for payment and potential consequences including "
        "service suspension, late fees, and possible legal action. Be direct and factual."
    )
}

ESCALATION_CONTEXT = {
    1: "This is a first reminder — the customer may have simply forgotten.",
    2: "This is a follow-up reminder — the invoice is overdue by 1-2 weeks.",
    3: "This is a final notice — the invoice is seriously overdue (2-4 weeks).",
    4: "This is a legal/collections notice — the invoice is critically overdue (30+ days)."
}


def generate_reminder_email(
    customer_name: str,
    customer_email: str,
    company_name: str,
    invoice_number: str,
    amount: float,
    due_date: str,
    days_overdue: int,
    tone: str = "friendly",
    escalation_level: int = 1
) -> dict:
    """
    Generate a personalized payment reminder email using Claude AI.
    Returns a dict with 'subject' and 'body'.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    if not api_key or api_key == "your-api-key-here":
        # Return a template email if no API key is set
        return _generate_template_email(
            customer_name, company_name, invoice_number,
            amount, due_date, days_overdue, tone, escalation_level
        )

    try:
        client = anthropic.Anthropic(api_key=api_key)

        tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["friendly"])
        escalation_context = ESCALATION_CONTEXT.get(escalation_level, ESCALATION_CONTEXT[1])

        overdue_text = (
            f"The invoice was due on {due_date} and is now {days_overdue} day(s) overdue."
            if days_overdue > 0
            else f"The invoice is due on {due_date}."
        )

        prompt = f"""Generate a professional payment reminder email with these details:

Customer Name: {customer_name}
Company: {company_name}
Invoice Number: {invoice_number}
Amount Due: ₹{amount:,.2f}
Due Date: {due_date}
{overdue_text}
Escalation Context: {escalation_context}

Tone Instructions: {tone_instruction}

Requirements:
- Start with "Subject: [your subject here]" on the first line
- Then a blank line
- Then the email body
- Include: greeting, invoice details, payment request, payment methods note, professional closing
- Sign from: "AI Payment Reminder Team, FinCollect Solutions"
- Keep it concise (150-200 words max)
- Do NOT use placeholders like [your name] — use the actual details provided"""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )

        full_text = message.content[0].text.strip()

        # Parse subject and body
        lines = full_text.split("\n")
        subject = ""
        body_lines = []
        body_started = False

        for line in lines:
            if line.lower().startswith("subject:"):
                subject = line[8:].strip()
            elif subject and not body_started and line.strip() == "":
                body_started = True
            elif body_started or subject:
                body_lines.append(line)

        body = "\n".join(body_lines).strip()
        if not subject:
            subject = f"Payment Reminder - Invoice {invoice_number}"
        if not body:
            body = full_text

        return {"subject": subject, "body": body}

    except Exception as e:
        print(f"AI generation error: {e}")
        return _generate_template_email(
            customer_name, company_name, invoice_number,
            amount, due_date, days_overdue, tone, escalation_level
        )


def _generate_template_email(
    customer_name, company_name, invoice_number,
    amount, due_date, days_overdue, tone, escalation_level
) -> dict:
    """Fallback template-based email generation."""
    if tone == "friendly":
        subject = f"Friendly Reminder: Invoice {invoice_number} Payment Due"
        greeting = f"Dear {customer_name},"
        body_middle = (
            f"I hope this message finds you well. This is a gentle reminder that "
            f"Invoice {invoice_number} for ₹{amount:,.2f} "
            + (f"was due on {due_date} and is now {days_overdue} day(s) overdue." if days_overdue > 0 else f"is due on {due_date}.")
            + "\n\nWe understand that things can get busy and this may have been an oversight. "
            "We kindly request you to process the payment at your earliest convenience."
        )
    elif tone == "firm":
        subject = f"Action Required: Overdue Payment - Invoice {invoice_number}"
        greeting = f"Dear {customer_name},"
        body_middle = (
            f"This is a formal reminder regarding Invoice {invoice_number} for ₹{amount:,.2f} "
            f"from {company_name}, which is now {days_overdue} day(s) overdue (due date: {due_date}).\n\n"
            "We request immediate payment to avoid further delays. Continued non-payment may result "
            "in service suspension and additional late fees."
        )
    else:  # urgent
        subject = f"URGENT: Final Notice - Invoice {invoice_number} Critically Overdue"
        greeting = f"Dear {customer_name},"
        body_middle = (
            f"FINAL NOTICE: Invoice {invoice_number} for ₹{amount:,.2f} is now {days_overdue} days overdue. "
            f"Original due date: {due_date}.\n\n"
            "Despite previous reminders, payment has not been received. "
            "Please be advised that failure to settle this amount within 48 hours may result in "
            "account suspension, late payment penalties, and referral to our legal/collections team."
        )

    body = f"""{greeting}

{body_middle}

Invoice Details:
- Invoice Number: {invoice_number}
- Amount Due: ₹{amount:,.2f}
- Due Date: {due_date}

Please use your preferred payment method (bank transfer, UPI, or online portal) to settle this invoice.

If you have already made the payment, please disregard this notice and share the confirmation.

For any queries, please reply to this email.

Best regards,
FinCollect Solutions
AI Payment Reminder Team
📧 support@fincollect.ai | 📞 +91-800-COLLECT"""

    return {"subject": subject, "body": body}
