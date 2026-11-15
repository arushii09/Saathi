import uuid
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import utcnow
from app.models import Merchant, Device, Settlement, TechnicianTicket


def get_merchant(db: Session, merchant_id: str) -> Optional[dict[str, Any]]:
    stmt = select(Merchant).where(Merchant.id == merchant_id)
    merchant = db.scalars(stmt).first()
    if not merchant:
        return None
    return {
        "id": merchant.id,
        "name": merchant.name,
        "shop": merchant.shop,
        "language": merchant.language,
    }


def get_device_health(db: Session, device_id: str) -> Optional[dict[str, Any]]:
    stmt = select(Device).where(Device.id == device_id)
    device = db.scalars(stmt).first()
    if not device:
        return None

    if device.restart_requested_at is not None:
        now = utcnow()
        elapsed = (now - device.restart_requested_at).total_seconds()
        if elapsed >= 2.0:
            if device.fault_type == "network":
                device.status = "online"
                device.error_code = None
                device.fault_type = None
                device.last_heartbeat = now
                device.restart_requested_at = None
                db.commit()
                db.refresh(device)
            # If fault_type is hardware, it stays offline and error_code remains

    return {
        "device_id": device.id,
        "status": device.status,
        "last_heartbeat": device.last_heartbeat.isoformat() if device.last_heartbeat else None,
        "error_code": device.error_code,
    }


def get_settlements(db: Session, merchant_id: str) -> list[dict[str, Any]]:
    stmt = select(Settlement).where(Settlement.merchant_id == merchant_id)
    settlements = db.scalars(stmt).all()
    return [
        {
            "date": s.date,
            "amount": s.amount,
            "status": s.status,
            "expected_by": s.expected_by,
        }
        for s in settlements
    ]


def restart_device(db: Session, device_id: str) -> Optional[dict[str, Any]]:
    stmt = select(Device).where(Device.id == device_id)
    device = db.scalars(stmt).first()
    if not device:
        return None

    device.restart_requested_at = utcnow()
    db.commit()
    db.refresh(device)
    return {"accepted": True}


def create_technician_ticket(
    db: Session, device_id: str, diagnosis: str, merchant_id: Optional[str] = None
) -> dict[str, Any]:
    ticket_id = f"TT-{uuid.uuid4().hex[:6].upper()}"
    if not merchant_id:
        dev = db.scalars(select(Device).where(Device.id == device_id)).first()
        if dev:
            merchant_id = dev.merchant_id

    tt = TechnicianTicket(
        id=ticket_id,
        device_id=device_id,
        merchant_id=merchant_id,
        diagnosis=diagnosis,
        status="scheduled",
        created_at=utcnow(),
    )
    db.add(tt)
    db.commit()
    db.refresh(tt)
    return {
        "id": tt.id,
        "device_id": tt.device_id,
        "diagnosis": tt.diagnosis,
        "status": tt.status,
        "created_at": tt.created_at.isoformat(),
    }

