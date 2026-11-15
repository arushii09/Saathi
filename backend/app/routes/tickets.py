import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.models import Ticket, Merchant
from app import audit
from app.helpers import record_confirmation, detect_yes_no

router = APIRouter()


class TextRequest(BaseModel):
    merchant_id: str
    text: str


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


@router.post("/text")
def process_text_input(
    req: TextRequest,
    db: Session = Depends(get_db),
):
    merchant_id = req.merchant_id.strip() if req.merchant_id else ""
    text = req.text.strip() if req.text else ""

    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": "merchant_id is required."},
        )
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": "text cannot be empty."},
        )

    merchant = db.scalars(select(Merchant).where(Merchant.id == merchant_id)).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MERCHANT_NOT_FOUND", "message": f"Merchant '{merchant_id}' not found."},
        )

    # Conversational check: if merchant has an active awaiting_merchant ticket and replies yes/no
    pending_ticket = (
        db.scalars(
            select(Ticket)
            .where(Ticket.merchant_id == merchant.id, Ticket.status == "awaiting_merchant")
            .order_by(Ticket.created_at.desc())
        ).first()
    )
    detected_ans = detect_yes_no(text)
    if pending_ticket and detected_ans:
        record_confirmation(ticket_id=pending_ticket.id, answer=detected_ans, db=db)
        from app.agent import resume
        resume(ticket_id=pending_ticket.id, answer=detected_ans, db=db)
        db.refresh(pending_ticket)
        return {
            "ticket_id": pending_ticket.id,
            "transcript": text,
            "language": pending_ticket.language,
            "confidence": 1.0,
            "reply_text": pending_ticket.reply_text,
            "reply_audio_url": None,
            "tier": pending_ticket.tier or "tier 2A",
            "status": pending_ticket.status,
        }

    ticket_id = f"T-{uuid.uuid4().hex[:8].upper()}"
    ticket = Ticket(
        id=ticket_id,
        merchant_id=merchant.id,
        source="text",
        status="open",
        transcript=text,
        language=merchant.language or "hi",
        stt_confidence=1.0,
        created_at=utcnow(),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    audit.log(
        ticket_id=ticket.id,
        type="input",
        payload={"source": "text", "text": text, "merchant_id": merchant.id},
        db=db,
    )

    from app.agent import run_agent
    run_agent(ticket_id=ticket.id, db=db)
    db.refresh(ticket)

    return {
        "ticket_id": ticket.id,
        "transcript": ticket.transcript,
        "language": ticket.language,
        "confidence": ticket.stt_confidence,
        "reply_text": ticket.reply_text,
        "reply_audio_url": None,
        "tier": ticket.tier or "tier 1",
        "status": ticket.status,
    }


