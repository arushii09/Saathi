import json
from datetime import timedelta
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.models import Device, Ticket, AuditLog
from seed.seed import reset_demo
from app.handoff import build_case_file, check_case_file

router = APIRouter()


class OutageRequest(BaseModel):
    device_id: str


@router.post("/simulate/outage")
def simulate_outage(req: OutageRequest, db: Session = Depends(get_db)):
    stmt = select(Device).where(Device.id == req.device_id)
    device = db.scalars(stmt).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DEVICE_NOT_FOUND", "message": f"Device '{req.device_id}' not found."},
        )

    device.status = "offline"
    device.error_code = "NET_TIMEOUT"
    device.fault_type = "network"
    device.last_heartbeat = utcnow() - timedelta(hours=2)  # old heartbeat
    db.commit()
    db.refresh(device)

    scan_triggered = False
    try:
        from app.scheduler import trigger_scan
        trigger_scan()
        scan_triggered = True
    except (ImportError, AttributeError):
        scan_triggered = False

    return {
        "simulated": True,
        "device_id": device.id,
        "status": device.status,
        "error_code": device.error_code,
        "fault_type": device.fault_type,
        "scan_triggered": scan_triggered,
    }


@router.post("/admin/reset")
def admin_reset():
    reset_demo()
    return {"status": "ok", "message": "Demo database reset and seeded successfully."}


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    # 1. Tickets by tier
    tier_counts_query = (
        db.query(Ticket.tier, func.count(Ticket.id))
        .group_by(Ticket.tier)
        .all()
    )
    tickets_by_tier = {
        (tier or "unassigned"): count for tier, count in tier_counts_query
    }

    # 2. Average seconds to resolution
    resolved_tickets = (
        db.query(Ticket)
        .filter(Ticket.resolved_at.isnot(None), Ticket.created_at.isnot(None))
        .all()
    )
    if resolved_tickets:
        durations = [
            (t.resolved_at - t.created_at).total_seconds()
            for t in resolved_tickets
            if t.resolved_at and t.created_at
        ]
        avg_seconds = sum(durations) / len(durations) if durations else None
    else:
        avg_seconds = None

    # 3. Escalation count
    escalation_count = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == "escalated")
        .scalar()
        or 0
    )

    # 4. Handoff completeness for escalated tickets
    escalated_tickets = (
        db.query(Ticket).filter(Ticket.status == "escalated").all()
    )
    if escalated_tickets:
        completeness_scores = []
        for t in escalated_tickets:
            case = build_case_file(t.id, db=db)
            missing = check_case_file(case)
            score = (7 - len(missing)) / 7.0
            completeness_scores.append(score)
        handoff_completeness = sum(completeness_scores) / len(completeness_scores)
    else:
        handoff_completeness = 1.0

    # 5. Downtime recovered (labeled synthetic)
    downtime_recovered = {
        "synthetic": True,
        "seconds": 3600.0,
        "label": "Synthetic estimated downtime recovered by automated intervention",
    }

    # 6. Eval summary from eval/results/summary.json if it exists, else null
    eval_paths = [
        Path("eval/results/summary.json"),
        Path("../eval/results/summary.json"),
    ]
    eval_summary = None
    for ep in eval_paths:
        if ep.exists():
            try:
                eval_summary = json.loads(ep.read_text(encoding="utf-8"))
                break
            except Exception:
                eval_summary = None

    return {
        "tickets_by_tier": tickets_by_tier,
        "average_seconds_to_resolution": avg_seconds,
        "escalation_count": escalation_count,
        "handoff_completeness": handoff_completeness,
        "downtime_recovered": downtime_recovered,
        "eval_summary": eval_summary,
    }

