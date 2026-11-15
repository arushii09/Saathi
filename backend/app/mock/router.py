from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.mock import service

router = APIRouter()


class TechnicianTicketRequest(BaseModel):
    device_id: str
    diagnosis: str


@router.get("/merchants/{merchant_id}")
def get_merchant(merchant_id: str, db: Session = Depends(get_db)):
    merchant = service.get_merchant(db, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MERCHANT_NOT_FOUND", "message": f"Merchant '{merchant_id}' not found."},
        )
    return merchant


@router.get("/devices/{device_id}/health")
def get_device_health(device_id: str, db: Session = Depends(get_db)):
    health = service.get_device_health(db, device_id)
    if not health:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DEVICE_NOT_FOUND", "message": f"Device '{device_id}' not found."},
        )
    return health


@router.get("/settlements")
def get_settlements(merchant_id: str = Query(..., description="Merchant ID"), db: Session = Depends(get_db)):
    return service.get_settlements(db, merchant_id)


@router.post("/devices/{device_id}/restart")
def restart_device(device_id: str, db: Session = Depends(get_db)):
    result = service.restart_device(db, device_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DEVICE_NOT_FOUND", "message": f"Device '{device_id}' not found."},
        )
    return result


@router.post("/technician-tickets", status_code=status.HTTP_201_CREATED)
def create_technician_ticket(ticket_req: TechnicianTicketRequest, db: Session = Depends(get_db)):
    return service.create_technician_ticket(db, ticket_req.device_id, ticket_req.diagnosis)

