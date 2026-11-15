from typing import Any, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal, utcnow
from app.models import AuditLog

ALLOWED_AUDIT_TYPES = {
    "input",
    "tool_call",
    "policy",
    "tool_result",
    "reply",
    "escalation",
    "merchant_confirmation",
    "approval_decided",
}


def log(
    ticket_id: str,
    type: str,
    payload: Any,
    db: Optional[Session] = None,
) -> AuditLog:
    """
    Append an entry to the audit log for a specific ticket.
    Computes per-ticket step_no monotonically.
    Rejects any type outside the contract specification.
    """
    if type not in ALLOWED_AUDIT_TYPES:
        raise ValueError(
            f"Invalid audit log type '{type}'. Allowed types are: {sorted(ALLOWED_AUDIT_TYPES)}"
        )

    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        stmt = select(func.max(AuditLog.step_no)).where(AuditLog.ticket_id == ticket_id)
        max_step = db.execute(stmt).scalar()
        step_no = 1 if max_step is None else max_step + 1

        entry = AuditLog(
            ticket_id=ticket_id,
            step_no=step_no,
            type=type,
            payload=payload,
            created_at=utcnow(),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    finally:
        if close_on_finish:
            db.close()


def get_trace(ticket_id: str, db: Optional[Session] = None) -> list[dict[str, Any]]:
    """Retrieve complete audit trace for a ticket ordered by step_no."""
    close_on_finish = False
    if db is None:
        db = SessionLocal()
        close_on_finish = True

    try:
        stmt = (
            select(AuditLog)
            .where(AuditLog.ticket_id == ticket_id)
            .order_by(AuditLog.step_no.asc())
        )
        entries = db.scalars(stmt).all()
        return [
            {
                "ticket_id": e.ticket_id,
                "step_no": e.step_no,
                "type": e.type,
                "payload": e.payload,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    finally:
        if close_on_finish:
            db.close()

