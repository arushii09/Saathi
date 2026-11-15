from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Integer, Float, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, utcnow


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "m1"
    name: Mapped[str] = mapped_column(String, nullable=False)
    shop: Mapped[str] = mapped_column(String, nullable=False)
    language: Mapped[str] = mapped_column(String, default="hi", nullable=False)  # "hi" | "en"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="merchant", cascade="all, delete-orphan")
    settlements: Mapped[list["Settlement"]] = relationship("Settlement", back_populates="merchant", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "SB-1001"
    merchant_id: Mapped[str] = mapped_column(String, ForeignKey("merchants.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="offline", nullable=False)  # "online" | "offline"
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    fault_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # "network" | "hardware" | None
    restart_requested_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="devices")

    @property
    def device_id(self) -> str:
        return self.id


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    merchant_id: Mapped[str] = mapped_column(String, ForeignKey("merchants.id"), nullable=False)
    date: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, default="settled", nullable=False)  # "settled" | "processing" | "failed"
    expected_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="settlements")


class TechnicianTicket(Base):
    __tablename__ = "technician_tickets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    device_id: Mapped[str] = mapped_column(String, ForeignKey("devices.id"), nullable=False)
    merchant_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="scheduled", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    merchant_id: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, default="text", nullable=False)  # "text" | "voice"
    status: Mapped[str] = mapped_column(String, default="open", nullable=False)
    # status enum: open | awaiting_merchant | resolved_auto | pending_approval | escalated | resolved | closed
    tier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    intent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String, default="hi", nullable=False)
    stt_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    audio_ref: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reply_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pending_tool: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    pending_args: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AuditLog(Base):
    """Append-only audit log."""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    step_no: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    # type enum: input | tool_call | policy | tool_result | reply | escalation | merchant_confirmation | approval_decided
    payload: Mapped[Any] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ticket_id: Mapped[str] = mapped_column(String, nullable=False)
    tool_name: Mapped[str] = mapped_column(String, nullable=False)
    args: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)  # "pending" | "approved" | "rejected"
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Confirmation(Base):
    __tablename__ = "confirmations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    tool_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    answer: Mapped[str] = mapped_column(String, nullable=False)  # "yes" | "no"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

