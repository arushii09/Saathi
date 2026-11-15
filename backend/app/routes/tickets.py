from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Ticket
from app import audit
from app.helpers import record_confirmation

router = APIRouter()


class ConfirmRequest(BaseModel):
    answer: str  # "yes" | "no"


def format_ticket(t: Ticket) -> dict[str, Any]:
    return {
        "id": t.id,
        "merchant_id": t.merchant_id,
        "source": t.source,
        "status": t.status,
        "tier": t.tier,
        "intent": t.intent,
        "transcript": t.transcript,
        "language": t.language,
        "stt_confidence": t.stt_confidence,
        "audio_ref": t.audio_ref,
        "reply_text": t.reply_text,
        "pending_tool": t.pending_tool,
        "pending_args": t.pending_args,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
    }


@router.get("/tickets")
def list_tickets(
    status: Optional[str] = Query(None, description="Filter by ticket status"),
    db: Session = Depends(get_db),
):
    stmt = select(Ticket).order_by(Ticket.created_at.desc())
    if status:
        stmt = stmt.where(Ticket.status == status)
    tickets = db.scalars(stmt).all()
    return [format_ticket(t) for t in tickets]


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.scalars(select(Ticket).where(Ticket.id == ticket_id)).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TICKET_NOT_FOUND", "message": f"Ticket '{ticket_id}' not found."},
        )

    trace = audit.get_trace(ticket_id, db=db)
    res = format_ticket(ticket)
    res["trace"] = trace
    return res


@router.post("/tickets/{ticket_id}/confirm")
def confirm_ticket(
    ticket_id: str,
    req: ConfirmRequest,
    db: Session = Depends(get_db),
):
    ticket = db.scalars(select(Ticket).where(Ticket.id == ticket_id)).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TICKET_NOT_FOUND", "message": f"Ticket '{ticket_id}' not found."},
        )

    # Contract: confirm route returns 409 unless status is awaiting_merchant
    if ticket.status != "awaiting_merchant":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "CONFLICT",
                "message": f"Ticket '{ticket_id}' has status '{ticket.status}'. Confirmation is only allowed when status is 'awaiting_merchant'.",
            },
        )

    record_res = record_confirmation(ticket_id=ticket_id, answer=req.answer, db=db)

    # Resume agent execution if available
    agent_result = None
    try:
        from app.agent import resume
        agent_result = resume(ticket_id=ticket_id, answer=req.answer)
    except (ImportError, AttributeError):
        agent_result = {"status": "agent_resumed", "simulated": True}

    return {
        "ticket_id": ticket_id,
        "answer": req.answer,
        "recorded": True,
        "confirmation": record_res,
        "agent_result": agent_result,
    }

