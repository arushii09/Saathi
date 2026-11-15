import re
import unicodedata
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, utcnow
from app.models import Ticket, Confirmation
from app import audit


def normalize_text_helpers(text: str) -> str:
    """Normalize text for exact phrase/whole-word matching."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text).lower()
    cleaned = "".join(
        " " if unicodedata.category(c).startswith("P") else c for c in normalized
    )
    return re.sub(r"\s+", " ", cleaned).strip()


RAW_YES_TERMS = [
    "yes", "yeah", "ok", "haan", "haa", "ha", "kar do", "kardo", "theek hai",
    "हाँ", "हां", "ठीक है", "कर दो",
]

RAW_NO_TERMS = [
    "no", "nahi", "nahin", "mat karo", "नहीं", "मत करो",
]

YES_TERMS = [normalize_text_helpers(t) for t in RAW_YES_TERMS]
NO_TERMS = [normalize_text_helpers(t) for t in RAW_NO_TERMS]


def detect_yes_no(text: str, language: Optional[str] = None) -> Optional[str]:
    """
    Detects affirmative or negative intent by whole-word/whole-phrase match in code.
    Never uses an LLM.
    If both yes and no match, returns None.
    If only yes matches, returns 'yes'.
    If only no matches, returns 'no'.
    Otherwise returns None.
    """
    if not text:
        return None

    padded = f" {normalize_text_helpers(text)} "

    has_yes = any(f" {y} " in padded for y in YES_TERMS)
    has_no = any(f" {n} " in padded for n in NO_TERMS)

    if has_yes and has_no:
        return None
    if has_yes:
        return "yes"
    if has_no:
        return "no"
    return None


def confirmed_actions_for(
    ticket_id: str, db: Optional[Session] = None
) -> list[dict[str, Any]]:
    """Retrieves all confirmed actions for a given ticket."""
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        stmt = (
            select(Confirmation)
            .where(Confirmation.ticket_id == ticket_id, Confirmation.answer == "yes")
            .order_by(Confirmation.created_at.asc())
        )
        confirmations = db.scalars(stmt).all()
        return [
            {
                "tool": c.tool_name,
                "ticket_id": c.ticket_id,
                "at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in confirmations
        ]
    finally:
        if close_session:
            db.close()


def record_confirmation(
    ticket_id: str, answer: str, db: Optional[Session] = None
) -> dict[str, Any]:
    """
    The ONE place that stores a Confirmation row (only for answer 'yes', for the ticket's pending_tool),
    writes the merchant_confirmation audit event, and is idempotent.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        ticket = db.scalars(stmt).first()
        if not ticket:
            raise ValueError(f"Ticket '{ticket_id}' not found.")

        ans = answer.strip().lower()
        pending_tool = ticket.pending_tool

        if ans == "yes":
            # Idempotency check: see if already recorded
            stmt_conf = select(Confirmation).where(
                Confirmation.ticket_id == ticket_id,
                Confirmation.tool_name == pending_tool,
                Confirmation.answer == "yes",
            )
            existing = db.scalars(stmt_conf).first()
            if not existing:
                conf = Confirmation(
                    ticket_id=ticket_id,
                    tool_name=pending_tool,
                    answer="yes",
                    created_at=utcnow(),
                )
                db.add(conf)
                db.commit()

                audit.log(
                    ticket_id=ticket_id,
                    type="merchant_confirmation",
                    payload={"answer": "yes", "tool": pending_tool},
                    db=db,
                )
                db.commit()

            return {
                "ticket_id": ticket_id,
                "tool": pending_tool,
                "answer": "yes",
                "recorded": True,
            }
        else:
            # Answer is 'no': do not store Confirmation row, record audit event
            audit.log(
                ticket_id=ticket_id,
                type="merchant_confirmation",
                payload={"answer": "no", "tool": pending_tool},
                db=db,
            )
            db.commit()
            return {
                "ticket_id": ticket_id,
                "tool": pending_tool,
                "answer": "no",
                "recorded": True,
            }
    finally:
        if close_session:
            db.close()

