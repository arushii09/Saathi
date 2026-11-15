from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Ticket
from app.mock import service
from app import audit


def get_merchant(merchant_id: str, db: Optional[Session] = None) -> dict[str, Any]:
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        merchant = service.get_merchant(db, merchant_id)
        if not merchant:
            return {"ok": False, "data": None, "error": f"Merchant '{merchant_id}' not found."}
        return {"ok": True, "data": merchant, "error": None}
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


def get_device_health(device_id: str, db: Optional[Session] = None) -> dict[str, Any]:
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        health = service.get_device_health(db, device_id)
        if not health:
            return {"ok": False, "data": None, "error": f"Device '{device_id}' not found."}
        return {"ok": True, "data": health, "error": None}
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


def get_settlement_status(merchant_id: str, db: Optional[Session] = None) -> dict[str, Any]:
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        settlements = service.get_settlements(db, merchant_id)
        return {"ok": True, "data": settlements, "error": None}
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


def restart_device(device_id: str, db: Optional[Session] = None) -> dict[str, Any]:
    """Execute restart request. Note: restart_device does not decide permission."""
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        result = service.restart_device(db, device_id)
        if not result:
            return {"ok": False, "data": None, "error": f"Device '{device_id}' not found."}
        return {"ok": True, "data": result, "error": None}
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


def create_technician_ticket(
    device_id: str, diagnosis: str, db: Optional[Session] = None
) -> dict[str, Any]:
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        result = service.create_technician_ticket(db, device_id, diagnosis)
        return {"ok": True, "data": result, "error": None}
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


def escalate_to_human(
    ticket_id: str,
    summary: str,
    rule: Optional[str] = None,
    recommended_next_step: Optional[str] = None,
    db: Optional[Session] = None,
) -> dict[str, Any]:
    """
    Sets ticket status to 'escalated', tier to 'tier 3', builds the 7-field case file,
    and logs an escalation audit event containing the case file payload.
    """
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        ticket = db.scalars(stmt).first()
        if not ticket:
            return {"ok": False, "data": None, "error": f"Ticket '{ticket_id}' not found."}

        ticket.status = "escalated"
        ticket.tier = "tier 3"
        db.commit()
        db.refresh(ticket)

        from app.handoff import build_case_file
        case_file = build_case_file(
            ticket_id=ticket_id,
            escalation_reason={"rule": rule or "R0", "reason": summary} if rule else summary,
            recommended_next_step=recommended_next_step,
            db=db,
        )

        audit.log(
            ticket_id=ticket_id,
            type="escalation",
            payload={"summary": summary, "case_file": case_file},
            db=db,
        )

        return {
            "ok": True,
            "data": {
                "ticket_id": ticket.id,
                "status": ticket.status,
                "tier": ticket.tier,
                "summary": summary,
                "case_file": case_file,
            },
            "error": None,
        }
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


def send_reply(
    ticket_id: str, text: str, language: str, db: Optional[Session] = None
) -> dict[str, Any]:
    """Updates ticket with final reply text and records a reply audit event."""
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        ticket = db.scalars(stmt).first()
        if not ticket:
            return {"ok": False, "data": None, "error": f"Ticket '{ticket_id}' not found."}

        ticket.reply_text = text
        ticket.language = language
        db.commit()
        db.refresh(ticket)

        audit.log(
            ticket_id=ticket_id,
            type="reply",
            payload={"text": text, "language": language},
            db=db,
        )

        return {
            "ok": True,
            "data": {
                "ticket_id": ticket.id,
                "reply_text": ticket.reply_text,
                "language": ticket.language,
            },
            "error": None,
        }
    except Exception as e:
        return {"ok": False, "data": None, "error": str(e)}
    finally:
        if close_on_finish:
            db.close()


TOOL_REGISTRY = {
    "get_merchant": get_merchant,
    "get_device_health": get_device_health,
    "get_settlement_status": get_settlement_status,
    "restart_device": restart_device,
    "create_technician_ticket": create_technician_ticket,
    "escalate_to_human": escalate_to_human,
    "send_reply": send_reply,
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_merchant",
            "description": "Fetch merchant profile and language preference by merchant ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "merchant_id": {
                        "type": "string",
                        "description": "The unique identifier of the merchant (e.g. m1).",
                    }
                },
                "required": ["merchant_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_device_health",
            "description": "Get current health, connectivity status, and error codes for a Soundbox device.",
            "parameters": {
                "type": "object",
                "properties": {
                    "device_id": {
                        "type": "string",
                        "description": "The Soundbox device ID (e.g. SB-1001).",
                    }
                },
                "required": ["device_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_settlement_status",
            "description": "Get payout and settlement history status for a merchant.",
            "parameters": {
                "type": "object",
                "properties": {
                    "merchant_id": {
                        "type": "string",
                        "description": "The unique identifier of the merchant.",
                    }
                },
                "required": ["merchant_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "restart_device",
            "description": "Trigger a remote restart for a Soundbox device.",
            "parameters": {
                "type": "object",
                "properties": {
                    "device_id": {
                        "type": "string",
                        "description": "The Soundbox device ID to restart.",
                    }
                },
                "required": ["device_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_technician_ticket",
            "description": "Schedule a field technician visit for hardware faults.",
            "parameters": {
                "type": "object",
                "properties": {
                    "device_id": {
                        "type": "string",
                        "description": "The Soundbox device ID with hardware failure.",
                    },
                    "diagnosis": {
                        "type": "string",
                        "description": "Details of the diagnosis or hardware fault.",
                    },
                },
                "required": ["device_id", "diagnosis"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_human",
            "description": "Escalate the ticket to a human support agent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticket_id": {
                        "type": "string",
                        "description": "The support ticket ID to escalate.",
                    },
                    "summary": {
                        "type": "string",
                        "description": "Escalation reason or summary of the merchant issue.",
                    },
                },
                "required": ["ticket_id", "summary"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_reply",
            "description": "Send a customer-facing response to the merchant.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticket_id": {
                        "type": "string",
                        "description": "The support ticket ID.",
                    },
                    "text": {
                        "type": "string",
                        "description": "The message text to send to the merchant.",
                    },
                    "language": {
                        "type": "string",
                        "description": "The language code (hi or en).",
                    },
                },
                "required": ["ticket_id", "text", "language"],
            },
        },
    },
]

