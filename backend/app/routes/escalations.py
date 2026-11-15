from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Ticket, AuditLog
from app.handoff import build_case_file
from app.routes.tickets import format_ticket

router = APIRouter()


@router.get("/escalations")
def list_escalations(db: Session = Depends(get_db)):
    stmt = (
        select(Ticket)
        .where(Ticket.status == "escalated")
        .order_by(Ticket.created_at.desc())
    )
    tickets = db.scalars(stmt).all()

    results = []
    for t in tickets:
        formatted = format_ticket(t)

        # Look for case_file in audit logs first
        stmt_audit = (
            select(AuditLog)
            .where(AuditLog.ticket_id == t.id, AuditLog.type == "escalation")
            .order_by(AuditLog.step_no.desc())
        )
        audit_entry = db.scalars(stmt_audit).first()
        case_file = None
        if audit_entry and isinstance(audit_entry.payload, dict):
            case_file = audit_entry.payload.get("case_file")

        if not case_file:
            case_file = build_case_file(t.id, db=db)

        formatted["case_file"] = case_file
        results.append(formatted)

    return results

