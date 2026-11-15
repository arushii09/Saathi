from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.models import Approval, Ticket
from app import audit, tools

router = APIRouter()


class RejectRequest(BaseModel):
    reason: Optional[str] = "Rejected by human supervisor."


def format_approval(a: Approval) -> dict[str, Any]:
    return {
        "id": a.id,
        "ticket_id": a.ticket_id,
        "tool_name": a.tool_name,
        "args": a.args,
        "status": a.status,
        "decision_reason": a.decision_reason,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "decided_at": a.decided_at.isoformat() if a.decided_at else None,
    }


@router.get("/approvals")
def list_pending_approvals(db: Session = Depends(get_db)):
    stmt = (
        select(Approval)
        .where(Approval.status == "pending")
        .order_by(Approval.created_at.desc())
    )
    approvals = db.scalars(stmt).all()
    return [format_approval(a) for a in approvals]


@router.post("/approvals/{approval_id}/approve")
def approve_request(approval_id: str, db: Session = Depends(get_db)):
    approval = db.scalars(select(Approval).where(Approval.id == approval_id)).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPROVAL_NOT_FOUND", "message": f"Approval '{approval_id}' not found."},
        )

    # Idempotent: if already approved, return current state
    if approval.status == "approved":
        ticket = db.scalars(select(Ticket).where(Ticket.id == approval.ticket_id)).first()
        return {
            "id": approval.id,
            "ticket_id": approval.ticket_id,
            "status": "approved",
            "ticket_status": ticket.status if ticket else "resolved",
            "idempotent": True,
        }

    # 1. Update approval status
    approval.status = "approved"
    approval.decided_at = utcnow()
    db.commit()

    # 2. Write approval_decided audit log
    audit.log(
        ticket_id=approval.ticket_id,
        type="approval_decided",
        payload={"decision": "approved", "approval_id": approval.id},
        db=db,
    )

    # 3. Create mock technician ticket via tool
    args = approval.args or {}
    device_id = args.get("device_id", "SB-1003")
    diagnosis = args.get("diagnosis", "Approved field technician dispatch")
    tool_result = tools.create_technician_ticket(device_id=device_id, diagnosis=diagnosis, db=db)

    # 4. Write tool_result audit log
    audit.log(
        ticket_id=approval.ticket_id,
        type="tool_result",
        payload={"tool": "create_technician_ticket", "result": tool_result},
        db=db,
    )

    # 5. Set ticket resolved
    ticket = db.scalars(select(Ticket).where(Ticket.id == approval.ticket_id)).first()
    if ticket:
        ticket.status = "resolved"
        ticket.resolved_at = utcnow()
        db.commit()

    return {
        "id": approval.id,
        "ticket_id": approval.ticket_id,
        "status": "approved",
        "ticket_status": ticket.status if ticket else "resolved",
        "tool_result": tool_result,
        "idempotent": False,
    }


@router.post("/approvals/{approval_id}/reject")
def reject_request(
    approval_id: str,
    req: RejectRequest = RejectRequest(),
    db: Session = Depends(get_db),
):
    approval = db.scalars(select(Approval).where(Approval.id == approval_id)).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "APPROVAL_NOT_FOUND", "message": f"Approval '{approval_id}' not found."},
        )

    # Idempotent: if already rejected, return current state
    if approval.status == "rejected":
        ticket = db.scalars(select(Ticket).where(Ticket.id == approval.ticket_id)).first()
        return {
            "id": approval.id,
            "ticket_id": approval.ticket_id,
            "status": "rejected",
            "reason": approval.decision_reason,
            "ticket_status": ticket.status if ticket else "escalated",
            "idempotent": True,
        }

    # 1. Update approval status and reason
    approval.status = "rejected"
    approval.decision_reason = req.reason or "Rejected by human supervisor."
    approval.decided_at = utcnow()
    db.commit()

    # 2. Write approval_decided audit log
    audit.log(
        ticket_id=approval.ticket_id,
        type="approval_decided",
        payload={"decision": "rejected", "reason": approval.decision_reason, "approval_id": approval.id},
        db=db,
    )

    # 3. Set ticket escalated
    ticket = db.scalars(select(Ticket).where(Ticket.id == approval.ticket_id)).first()
    if ticket:
        ticket.status = "escalated"
        ticket.tier = "tier 3"
        db.commit()

    return {
        "id": approval.id,
        "ticket_id": approval.ticket_id,
        "status": "rejected",
        "reason": approval.decision_reason,
        "ticket_status": ticket.status if ticket else "escalated",
        "idempotent": False,
    }

