import os
from datetime import timedelta
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from sqlalchemy import select

from app.db import engine, SessionLocal, utcnow
from app.models import Ticket, Approval, Device, Merchant
from seed.seed import reset_demo
from app.routes.tickets import (
    process_text_input,
    confirm_ticket,
    TextRequest,
    ConfirmRequest,
)
from app.messages import ESCALATION_MESSAGE_HI, ESCALATION_MESSAGE_EN
from app import audit
from app.agent import GroqAPIError


@pytest.fixture(autouse=True)
def setup_db():
    reset_demo(engine)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 1. Normal Lookup Test (Tier 1 Auto Resolution)
# ---------------------------------------------------------------------------
def test_normal_lookup_settlement(db):
    """
    Scenario: Merchant m2 asks about settlement.
    Groq proposes get_settlement_status tool call.
    Tool executes and returns settlement data.
    Groq receives data and produces final reply.
    """
    mock_responses = [
        # Turn 1: Groq proposes get_settlement_status
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": "call_settle_1",
                    "type": "function",
                    "function": {
                        "name": "get_settlement_status",
                        "arguments": '{"merchant_id": "m2"}',
                    },
                }
            ],
        },
        # Turn 2: Groq gives final direct reply based on settlement data
        {
            "role": "assistant",
            "content": "Your yesterday payout of Rs. 1450 is currently processing and expected by 2:00 PM.",
            "tool_calls": None,
        },
    ]

    with patch("app.agent.call_groq", side_effect=mock_responses):
        res = process_text_input(
            TextRequest(merchant_id="m2", text="What is my settlement status?"),
            db=db,
        )

    assert res["status"] == "resolved_auto"
    assert res["tier"] == "tier 1"
    assert "1450" in res["reply_text"]
    assert res["confidence"] == 1.0
    assert res["language"] == "en"

    # Check audit log trace
    trace = audit.get_trace(res["ticket_id"], db=db)
    trace_types = [t["type"] for t in trace]
    assert "input" in trace_types
    assert "policy" in trace_types
    assert "tool_call" in trace_types
    assert "tool_result" in trace_types
    assert "reply" in trace_types

    # Verify tool_call payload
    tool_call_entry = next(t for t in trace if t["type"] == "tool_call")
    assert tool_call_entry["payload"]["tool"] == "get_settlement_status"
    assert tool_call_entry["payload"]["args"] == {"merchant_id": "m2"}


# ---------------------------------------------------------------------------
# 2. Restart Requiring Confirmation (Tier 2A)
# ---------------------------------------------------------------------------
def test_restart_requiring_confirmation(db):
    """
    Scenario: Merchant m1 asks to restart soundbox.
    Groq proposes restart_device for SB-1001.
    Policy rule R5 requires merchant confirmation -> returns NEEDS_MERCHANT_CONFIRM.
    Ticket status becomes 'awaiting_merchant', pending_tool stored, confirmation prompt sent.
    """
    mock_response = {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "call_restart_1",
                "type": "function",
                "function": {
                    "name": "restart_device",
                    "arguments": '{"device_id": "SB-1001"}',
                },
            }
        ],
    }

    with patch("app.agent.call_groq", return_value=mock_response):
        res = process_text_input(
            TextRequest(merchant_id="m1", text="Mera Soundbox restart kar dijiye"),
            db=db,
        )

    assert res["status"] == "awaiting_merchant"
    assert res["tier"] == "tier 2A"
    assert "रीस्टार्ट" in res["reply_text"] or "restart" in res["reply_text"].lower()

    # Check ticket state in database
    t = db.scalars(select(Ticket).where(Ticket.id == res["ticket_id"])).first()
    assert t is not None
    assert t.status == "awaiting_merchant"
    assert t.tier == "tier 2A"
    assert t.pending_tool == "restart_device"
    assert t.pending_args == {"device_id": "SB-1001"}

    # Check audit trace has policy decision NEEDS_MERCHANT_CONFIRM
    trace = audit.get_trace(res["ticket_id"], db=db)
    policy_entry = next(t for t in trace if t["type"] == "policy")
    assert policy_entry["payload"]["decision"] == "NEEDS_MERCHANT_CONFIRM"
    assert policy_entry["payload"]["tool"] == "restart_device"


# ---------------------------------------------------------------------------
# 3. Successful Confirmation and Restart (Tier 2A -> Tier 1 Resolution)
# ---------------------------------------------------------------------------
def test_successful_confirmation_and_restart(db):
    """
    Scenario: Continuing from an awaiting_merchant ticket for m1.
    Merchant confirms with 'yes' via POST /tickets/{id}/confirm.
    resume() executes restart_device, verifies device recovery, and marks ticket resolved_auto.
    """
    # 1. Initiate restart request
    mock_response = {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "call_restart_1",
                "type": "function",
                "function": {
                    "name": "restart_device",
                    "arguments": '{"device_id": "SB-1001"}',
                },
            }
        ],
    }

    with patch("app.agent.call_groq", return_value=mock_response):
        init_res = process_text_input(
            TextRequest(merchant_id="m1", text="Soundbox nahi chal raha, restart karo"),
            db=db,
        )
    ticket_id = init_res["ticket_id"]
    assert init_res["status"] == "awaiting_merchant"

    def advance_time_on_sleep(seconds):
        dev = db.scalars(select(Device).where(Device.id == "SB-1001")).first()
        if dev:
            dev.restart_requested_at = utcnow() - timedelta(seconds=3.0)
            db.commit()

    with patch("time.sleep", side_effect=advance_time_on_sleep):
        # 2. Confirm the restart
        conf_res = confirm_ticket(ticket_id, ConfirmRequest(answer="yes"), db=db)

    assert conf_res["recorded"] is True
    assert conf_res["answer"] == "yes"

    # Verify ticket is now resolved_auto
    t = db.scalars(select(Ticket).where(Ticket.id == ticket_id)).first()
    assert t.status == "resolved_auto"
    assert t.pending_tool is None
    assert t.pending_args is None
    assert "ऑनलाइन" in t.reply_text or "online" in t.reply_text.lower()

    # Check device SB-1001 is online
    dev_after = db.scalars(select(Device).where(Device.id == "SB-1001")).first()
    assert dev_after.status == "online"


# ---------------------------------------------------------------------------
# 4. Tier 3 Escalation (Fraud / Unauthorized Keywords)
# ---------------------------------------------------------------------------
def test_tier_3_escalation_keyword(db):
    """
    Scenario: Merchant m4 reports unauthorized transaction / fraud.
    Transcript keyword scan detects 'fraud' / 'bina permission'.
    Policy engine immediately routes to fixed escalation template without calling Groq.
    Ticket status becomes 'escalated', tier 'tier 3'.
    """
    groq_mock = MagicMock()
    with patch("app.agent.call_groq", groq_mock):
        res = process_text_input(
            TextRequest(
                merchant_id="m4",
                text="Mera paisa kat gaya fraud transaction hua hai bina permission ke",
            ),
            db=db,
        )

    # Groq must NOT be called for Tier 3 escalation
    groq_mock.assert_not_called()

    assert res["status"] == "escalated"
    assert res["tier"] == "tier 3"
    assert res["reply_text"] == ESCALATION_MESSAGE_HI

    # Check ticket and escalation audit event
    t = db.scalars(select(Ticket).where(Ticket.id == res["ticket_id"])).first()
    assert t.status == "escalated"
    assert t.tier == "tier 3"

    trace = audit.get_trace(res["ticket_id"], db=db)
    esc_entry = next(t for t in trace if t["type"] == "escalation")
    assert "case_file" in esc_entry["payload"]
    assert esc_entry["payload"]["case_file"]["merchant"]["id"] == "m4"


# ---------------------------------------------------------------------------
# 5. Groq API Failure Graceful Handling
# ---------------------------------------------------------------------------
def test_groq_api_failure_handling(db):
    """
    Scenario: Groq API throws an error (e.g. rate limit, connection failure, 500).
    The server must catch it, not crash, return a valid response, and save a polite fallback reply.
    """
    with patch("app.agent.call_groq", side_effect=GroqAPIError("Simulated Groq 500 downtime")):
        res = process_text_input(
            TextRequest(merchant_id="m1", text="Soundbox check karo"),
            db=db,
        )

    # Server must return clean 200 contract response without crashing
    assert "ticket_id" in res
    assert res["status"] == "open"
    assert "तकनीकी समस्या" in res["reply_text"] or "technical error" in res["reply_text"].lower()

    # Verify ticket persisted with fallback message
    t = db.scalars(select(Ticket).where(Ticket.id == res["ticket_id"])).first()
    assert t is not None
    assert t.reply_text == res["reply_text"]


# ---------------------------------------------------------------------------
# 6. Request Validation Tests
# ---------------------------------------------------------------------------
def test_text_request_validation(db):
    """Missing or empty merchant_id or text should raise HTTP 400/404."""
    with pytest.raises(HTTPException) as exc:
        process_text_input(TextRequest(merchant_id="", text="Hello"), db=db)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        process_text_input(TextRequest(merchant_id="m1", text="   "), db=db)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        process_text_input(TextRequest(merchant_id="unknown_merchant", text="Hello"), db=db)
    assert exc.value.status_code == 404
    assert exc.value.detail["code"] == "MERCHANT_NOT_FOUND"


# ---------------------------------------------------------------------------
# 7. Hardware Fault Technician Ticket Approval (Tier 2B)
# ---------------------------------------------------------------------------
def test_hardware_fault_technician_ticket_approval(db):
    """
    Scenario: Merchant m3 has HW_SPEAKER_FAULT.
    Groq proposes create_technician_ticket.
    Policy returns NEEDS_HUMAN_APPROVAL (Rule R6).
    Approval record is created with status 'pending'.
    Ticket status becomes 'pending_approval' (Tier 2B).
    """
    mock_response = {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "call_tech_1",
                "type": "function",
                "function": {
                    "name": "create_technician_ticket",
                    "arguments": '{"device_id": "SB-1003", "diagnosis": "Hardware speaker broken"}',
                },
            }
        ],
    }

    with patch("app.agent.call_groq", return_value=mock_response):
        res = process_text_input(
            TextRequest(merchant_id="m3", text="Soundbox se awaz bilkul nahi aa rahi hai"),
            db=db,
        )

    assert res["status"] == "pending_approval"
    assert res["tier"] == "tier 2B"
    assert "तकनीशियन" in res["reply_text"] or "technician" in res["reply_text"].lower()

    # Verify Approval record created in DB
    apprs = db.scalars(select(Approval).where(Approval.ticket_id == res["ticket_id"])).all()
    assert len(apprs) == 1
    assert apprs[0].status == "pending"
    assert apprs[0].tool_name == "create_technician_ticket"
    assert apprs[0].args == {"device_id": "SB-1003", "diagnosis": "Hardware speaker broken"}


# ---------------------------------------------------------------------------
# 8. Conversational Confirmation via POST /text ("Haan" to pending ticket)
# ---------------------------------------------------------------------------
def test_conversational_text_confirmation(db):
    """
    Scenario: Merchant m1 has an awaiting_merchant ticket.
    Instead of calling /confirm, merchant sends 'Haan kar do' to /text.
    System detects 'yes', confirms the ticket, and resolves the action.
    """
    mock_response = {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": "call_restart_1",
                "type": "function",
                "function": {
                    "name": "restart_device",
                    "arguments": '{"device_id": "SB-1001"}',
                },
            }
        ],
    }

    # Step 1: Trigger restart request -> awaiting_merchant
    with patch("app.agent.call_groq", return_value=mock_response):
        res1 = process_text_input(
            TextRequest(merchant_id="m1", text="Mera soundbox atak gaya hai"),
            db=db,
        )
    assert res1["status"] == "awaiting_merchant"

    # Step 2: Merchant replies 'Haan kar do' in chat
    def advance_time_on_sleep(seconds):
        dev = db.scalars(select(Device).where(Device.id == "SB-1001")).first()
        if dev:
            dev.restart_requested_at = utcnow() - timedelta(seconds=3.0)
            db.commit()

    with patch("time.sleep", side_effect=advance_time_on_sleep):
        res2 = process_text_input(
            TextRequest(merchant_id="m1", text="Haan kar do"),
            db=db,
        )

    assert res2["ticket_id"] == res1["ticket_id"]
    assert res2["status"] == "resolved_auto"
    assert "ऑनलाइन" in res2["reply_text"] or "online" in res2["reply_text"].lower()
