"""
TRUE Agentic AI module — Claude acts as an autonomous agent using tool-use.

The agent has access to real tools:
  - get_invoice_details     → look up a specific invoice
  - get_customer_history    → check customer payment track record
  - assess_risk             → run the ML risk model on an invoice
  - recommend_action        → decide and record the action for an invoice
  - send_escalation_flag    → mark an invoice for immediate escalation

Claude reasons in a loop (ReAct pattern):
  1. Thinks about what to do next
  2. Calls a tool
  3. Observes the result
  4. Decides whether to call another tool or stop

This continues until Claude has assessed every invoice and built a full plan.
"""

import anthropic
import os
import json
from datetime import datetime


# ─── Tool definitions (what Claude can call) ─────────────────────────────────

TOOLS = [
    {
        "name": "get_invoice_details",
        "description": "Retrieve full details about a specific invoice including amount, due date, days overdue, current risk level, and escalation level.",
        "input_schema": {
            "type": "object",
            "properties": {
                "invoice_number": {
                    "type": "string",
                    "description": "The invoice number, e.g. INV-2024-001"
                }
            },
            "required": ["invoice_number"]
        }
    },
    {
        "name": "get_customer_history",
        "description": "Retrieve a customer's payment history: total invoices, late payments, average payment days, credit score, and outstanding balance.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "The customer's full name"
                }
            },
            "required": ["customer_name"]
        }
    },
    {
        "name": "assess_risk",
        "description": "Run a risk assessment on an invoice. Returns risk_score (0-100), risk_level (LOW/MEDIUM/HIGH), and probability of late payment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "invoice_number": {"type": "string"},
                "days_overdue": {"type": "integer"},
                "amount": {"type": "number"},
                "customer_late_rate": {
                    "type": "number",
                    "description": "Fraction of past invoices paid late (0.0–1.0)"
                }
            },
            "required": ["invoice_number", "days_overdue", "amount", "customer_late_rate"]
        }
    },
    {
        "name": "recommend_action",
        "description": "Record the recommended collection action for an invoice after analysis.",
        "input_schema": {
            "type": "object",
            "properties": {
                "invoice_number": {"type": "string"},
                "customer_name": {"type": "string"},
                "action_type": {
                    "type": "string",
                    "enum": ["email", "call", "legal", "escalate", "monitor"],
                    "description": "Type of action to take"
                },
                "urgency": {
                    "type": "string",
                    "enum": ["immediate", "within_24h", "within_week"],
                },
                "action_detail": {
                    "type": "string",
                    "description": "Specific, actionable instruction"
                },
                "expected_outcome": {
                    "type": "string",
                    "description": "What this action should achieve"
                }
            },
            "required": ["invoice_number", "customer_name", "action_type", "urgency", "action_detail", "expected_outcome"]
        }
    },
    {
        "name": "flag_for_escalation",
        "description": "Mark an invoice for immediate escalation (e.g. to legal team or senior manager). Use for invoices 30+ days overdue or critically high risk.",
        "input_schema": {
            "type": "object",
            "properties": {
                "invoice_number": {"type": "string"},
                "reason": {"type": "string", "description": "Why this invoice needs immediate escalation"}
            },
            "required": ["invoice_number", "reason"]
        }
    }
]


# ─── Tool execution (real logic backed by invoice data) ────────────────────────

def execute_tool(tool_name: str, tool_input: dict, invoices_lookup: dict) -> str:
    """Execute a tool call and return the result as a string."""

    if tool_name == "get_invoice_details":
        inv_num = tool_input.get("invoice_number", "")
        inv = invoices_lookup.get(inv_num)
        if not inv:
            return json.dumps({"error": f"Invoice {inv_num} not found"})
        return json.dumps({
            "invoice_number": inv.get("invoice_number"),
            "customer_name": inv.get("customer_name"),
            "company": inv.get("company"),
            "amount": inv.get("amount"),
            "days_overdue": inv.get("days_overdue"),
            "status": inv.get("status"),
            "risk_level": inv.get("risk_level"),
            "risk_score": inv.get("risk_score"),
            "escalation_level": inv.get("escalation_level"),
            "recommended_action": inv.get("recommended_action"),
        })

    elif tool_name == "get_customer_history":
        name = tool_input.get("customer_name", "")
        # Find invoices belonging to this customer
        customer_invoices = [i for i in invoices_lookup.values() if i.get("customer_name") == name]
        if not customer_invoices:
            return json.dumps({"error": f"No data found for customer {name}"})
        inv = customer_invoices[0]  # customer-level data is same across invoices
        total = len(customer_invoices)
        overdue_count = sum(1 for i in customer_invoices if i.get("days_overdue", 0) > 0)
        return json.dumps({
            "customer_name": name,
            "company": inv.get("company"),
            "customer_email": inv.get("customer_email"),
            "total_invoices": total,
            "overdue_invoices": overdue_count,
            "late_payment_rate": round(overdue_count / max(total, 1), 2),
            "total_outstanding": sum(i.get("amount", 0) for i in customer_invoices if i.get("status") != "paid"),
        })

    elif tool_name == "assess_risk":
        days = tool_input.get("days_overdue", 0)
        amount = tool_input.get("amount", 0)
        late_rate = tool_input.get("customer_late_rate", 0)
        score = min(100, int(
            days * 1.5 +
            min(amount / 10000, 30) +
            late_rate * 40
        ))
        level = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"
        return json.dumps({
            "invoice_number": tool_input.get("invoice_number"),
            "risk_score": score,
            "risk_level": level,
            "probability_late": round(min(0.95, score / 100 + 0.1), 2),
            "assessment": f"Score {score}/100 — {level} risk based on {days} days overdue and {late_rate*100:.0f}% historical late rate"
        })

    elif tool_name == "recommend_action":
        # Store the action in the invoices_lookup for plan assembly later
        inv_num = tool_input.get("invoice_number", "")
        if inv_num in invoices_lookup:
            invoices_lookup[inv_num]["_agent_action"] = tool_input
        return json.dumps({"status": "recorded", "invoice_number": inv_num, "action": tool_input.get("action_type")})

    elif tool_name == "flag_for_escalation":
        inv_num = tool_input.get("invoice_number", "")
        if inv_num in invoices_lookup:
            invoices_lookup[inv_num]["_escalation_flag"] = tool_input.get("reason")
        return json.dumps({"status": "flagged", "invoice_number": inv_num, "escalation": "immediate"})

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


# ─── Main agentic loop ────────────────────────────────────────────────────────

def run_collection_agent(invoices_data: list) -> dict:
    """
    Runs Claude as a true autonomous agent using tool-use.
    Claude calls tools in a loop until it has assessed every invoice.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    if not api_key or api_key == "your-anthropic-api-key-here":
        return _fallback_action_plan(invoices_data)

    # Build lookup dict by invoice number
    invoices_lookup = {inv["invoice_number"]: dict(inv) for inv in invoices_data}
    today = datetime.utcnow().strftime("%d %b %Y")

    # Compact portfolio summary to bootstrap the agent
    portfolio_summary = [
        {
            "invoice_number": inv.get("invoice_number"),
            "customer_name": inv.get("customer_name"),
            "amount": inv.get("amount"),
            "days_overdue": inv.get("days_overdue", 0),
            "risk_level": inv.get("risk_level", "UNKNOWN"),
            "status": inv.get("status"),
        }
        for inv in invoices_data[:15]  # show top 15 to agent
    ]

    system_prompt = """You are an autonomous AI collection agent for FinCollect Solutions.

Your mission: Analyze unpaid invoices and create a complete, prioritized collection action plan.

You have tools to:
- Look up invoice details
- Check customer payment history  
- Assess risk scores
- Record recommended actions
- Flag critical invoices for escalation

Work through each invoice methodically:
1. Use get_invoice_details to understand each invoice
2. Use get_customer_history to understand the customer's reliability
3. Use assess_risk to score it
4. Use recommend_action to record your decision
5. Use flag_for_escalation for critical cases (30+ days overdue or HIGH risk + large amount)

Be thorough — analyze every invoice. When done, provide a final JSON summary with:
{
  "summary": "executive summary",
  "agent_reasoning": "your overall assessment of portfolio health",
  "total_flagged": number
}"""

    user_prompt = f"""Today is {today}.

Here are {len(invoices_data)} unpaid invoices to analyze:

{json.dumps(portfolio_summary, indent=2)}

Start analyzing now. Work through each invoice using your tools, then provide the final summary JSON."""

    messages = [{"role": "user", "content": user_prompt}]

    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Agentic loop — runs until Claude stops calling tools
        max_iterations = 30
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                system=system_prompt,
                tools=TOOLS,
                messages=messages
            )

            # Add assistant response to message history
            messages.append({"role": "assistant", "content": response.content})

            # If Claude is done (no more tool calls), extract final summary
            if response.stop_reason == "end_turn":
                final_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text

                # Parse the JSON summary from Claude's final message
                summary_data = {"summary": "", "agent_reasoning": "", "total_flagged": 0}
                try:
                    import re
                    json_match = re.search(r'\{[^{}]*"summary"[^{}]*\}', final_text, re.DOTALL)
                    if json_match:
                        summary_data = json.loads(json_match.group())
                except Exception:
                    summary_data["summary"] = final_text[:300] if final_text else "Agent analysis complete."
                    summary_data["agent_reasoning"] = "Claude completed autonomous analysis using tools."

                break

            # If Claude wants to use tools, execute them all
            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = execute_tool(block.name, block.input, invoices_lookup)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })

                # Feed results back to Claude
                messages.append({"role": "user", "content": tool_results})

        # Assemble final action plan from recorded actions
        actions = []
        escalated = []
        priority = 1

        for inv_num, inv in invoices_lookup.items():
            if "_agent_action" in inv:
                action = inv["_agent_action"]
                entry = {
                    "priority": priority,
                    "invoice_number": inv_num,
                    "customer_name": action.get("customer_name", inv.get("customer_name")),
                    "action_type": action.get("action_type"),
                    "urgency": action.get("urgency"),
                    "action_detail": action.get("action_detail"),
                    "expected_outcome": action.get("expected_outcome"),
                }
                if "_escalation_flag" in inv:
                    entry["escalation_reason"] = inv["_escalation_flag"]
                    escalated.append(inv_num)
                actions.append(entry)
                priority += 1

        # Sort: immediate first, then within_24h, then within_week
        urgency_order = {"immediate": 0, "within_24h": 1, "within_week": 2}
        actions.sort(key=lambda a: urgency_order.get(a.get("urgency", "within_week"), 2))
        for i, a in enumerate(actions, 1):
            a["priority"] = i

        return {
            "summary": summary_data.get("summary", "Agent analysis complete."),
            "agent_reasoning": summary_data.get("agent_reasoning", "Claude performed autonomous tool-based analysis."),
            "actions": actions,
            "escalated_invoices": escalated,
            "agent_iterations": iteration,
            "agent_mode": "claude_tool_use"
        }

    except Exception as e:
        print(f"Agentic AI error: {e}")
        return _fallback_action_plan(invoices_data)


# ─── Rule-based fallback ──────────────────────────────────────────────────────

def _fallback_action_plan(invoices_data: list) -> dict:
    """Rule-based fallback when no API key is configured."""
    actions = []
    sorted_inv = sorted(
        invoices_data,
        key=lambda x: (x.get("risk_score", 0), x.get("days_overdue", 0)),
        reverse=True
    )

    for i, inv in enumerate(sorted_inv[:10], 1):
        days = inv.get("days_overdue", 0)
        risk = inv.get("risk_level", "LOW")

        if days > 30 or risk == "HIGH":
            action_type, urgency = "legal", "immediate"
            detail = f"Send legal/collections notice for ₹{inv.get('amount', 0):,.0f}. Consider collections agency."
        elif days > 14 or risk == "MEDIUM":
            action_type, urgency = "call", "within_24h"
            detail = f"Phone call required — {days}-day overdue. Follow up with firm email."
        elif days > 0:
            action_type, urgency = "email", "within_24h"
            detail = f"Send firm reminder email — invoice {days} days overdue."
        else:
            action_type, urgency = "monitor", "within_week"
            detail = "Invoice due soon. Send friendly pre-due reminder."

        actions.append({
            "priority": i,
            "invoice_number": inv.get("invoice_number", "N/A"),
            "customer_name": inv.get("customer_name", "N/A"),
            "action_type": action_type,
            "urgency": urgency,
            "action_detail": detail,
            "expected_outcome": "Payment received or commitment obtained"
        })

    return {
        "summary": f"{len(invoices_data)} unpaid invoices analyzed. Immediate attention needed on high-risk accounts.",
        "agent_reasoning": "Fallback mode (no API key set). Configured ANTHROPIC_API_KEY enables Claude tool-use agent.",
        "actions": actions,
        "escalated_invoices": [],
        "agent_iterations": 0,
        "agent_mode": "rule_based_fallback"
    }
