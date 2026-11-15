from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Ticket, Merchant
from app import audit

REQUIRED_CASE_FIELDS = [
    "ticket_id",
    "merchant",
    "issue",
    "checks_done",
    "actions_taken",
    "escalation_reason",
    "recommended_next_step",
]


def check_case_file(case: dict[str, Any]) -> list[str]:
    """Returns a list of missing field names from the 7 contract fields."""
    if not isinstance(case, dict):
        return list(REQUIRED_CASE_FIELDS)
    missing = []
    for field in REQUIRED_CASE_FIELDS:
        if field not in case or case[field] is None:
            missing.append(field)
    return missing


def build_case_file(
    ticket_id: str,
    escalation_reason: Optional[Any] = None,
    recommended_next_step: Optional[str] = None,
    db: Optional[Session] = None,
) -> dict[str, Any]:
    """
    Builds the 7-field handoff case file for a ticket as specified in CONTRACTS.md:
    ticket_id, merchant (id, name, shop, language), issue (transcript and intent),
    checks_done, actions_taken, escalation_reason (rule id and reason), recommended_next_step.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        ticket = db.scalars(select(Ticket).where(Ticket.id == ticket_id)).first()
        if not ticket:
            raise ValueError(f"Ticket '{ticket_id}' not found.")

        # 1. merchant
        merchant = db.scalars(select(Merchant).where(Merchant.id == ticket.merchant_id)).first()
        if merchant:
            merchant_info = {
                "id": merchant.id,
                "name": merchant.name,
                "shop": merchant.shop,
                "language": merchant.language,
            }
        else:
            merchant_info = {
                "id": ticket.merchant_id,
                "name": "Unknown",
                "shop": "Unknown",
                "language": ticket.language,
            }

        # 2. issue
        issue = {
            "transcript": ticket.transcript or "",
            "intent": ticket.intent or "unclassified",
        }

        # 3. trace audit logs for checks and actions
        trace = audit.get_trace(ticket_id, db=db)
        checks_done = []
        actions_taken = []
        trace_escalation_reason = None

        for item in trace:
            itype = item.get("type")
            payload = item.get("payload") or {}

            if itype == "tool_call":
                tool = payload.get("tool") if isinstance(payload, dict) else None
                if tool in ("get_merchant", "get_device_health", "get_settlement_status"):
                    checks_done.append({"tool": tool, "args": payload.get("args")})
                elif tool in ("restart_device", "create_technician_ticket", "send_reply"):
                    actions_taken.append({"tool": tool, "args": payload.get("args")})
            elif itype == "tool_result":
                tool = payload.get("tool") if isinstance(payload, dict) else None
                if tool in ("get_merchant", "get_device_health", "get_settlement_status"):
                    checks_done.append({"result": tool, "data": payload.get("data")})
                elif tool in ("restart_device", "create_technician_ticket", "send_reply"):
                    actions_taken.append({"result": tool, "data": payload.get("data")})
            elif itype == "merchant_confirmation":
                actions_taken.append({"action": "merchant_confirmation", "details": payload})
            elif itype == "escalation":
                if isinstance(payload, dict):
                    trace_escalation_reason = payload.get("summary")

        # 4. escalation_reason
        if escalation_reason is not None:
            final_escalation_reason = escalation_reason
        elif trace_escalation_reason is not None:
            final_escalation_reason = trace_escalation_reason
        else:
            final_escalation_reason = {
                "rule": "R3",
                "reason": f"Escalated due to intent '{ticket.intent}' or merchant request.",
            }

        # 5. recommended_next_step
        if recommended_next_step:
            final_next_step = recommended_next_step
        else:
            intent = ticket.intent or ""
            if "fraud" in intent or "unauthorised" in intent:
                final_next_step = "Route to Fraud Desk to verify recent transactions and secure account."
            elif "hardware" in intent:
                final_next_step = "Dispatch field technician for on-site Soundbox inspection/replacement."
            elif "kyc" in intent:
                final_next_step = "Connect merchant with KYC verification desk."
            else:
                final_next_step = "Agent should call merchant back and inspect Soundbox logs."

        case_file = {
            "ticket_id": ticket_id,
            "merchant": merchant_info,
            "issue": issue,
            "checks_done": checks_done,
            "actions_taken": actions_taken,
            "escalation_reason": final_escalation_reason,
            "recommended_next_step": final_next_step,
        }
        return case_file
    finally:
        if close_session:
            db.close()


def escalate_and_notify(
    ticket_id: str,
    reason: str,
    next_step: Optional[str] = None,
    language: str = "hi",
    db: Optional[Session] = None,
) -> dict[str, Any]:
    """
    Calls escalate_to_human, then sends the fixed template through send_reply.
    Returns both results.
    """
    from app import tools
    from app.messages import ESCALATION_MESSAGES

    esc_res = tools.escalate_to_human(
        ticket_id=ticket_id,
        summary=reason,
        recommended_next_step=next_step,
        db=db,
    )

    template = ESCALATION_MESSAGES.get(language, ESCALATION_MESSAGES["en"])
    reply_res = tools.send_reply(
        ticket_id=ticket_id,
        text=template,
        language=language,
        db=db,
    )

    return {
        "escalation": esc_res,
        "reply": reply_res,
    }

