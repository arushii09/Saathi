from datetime import timedelta
import pytest
from fastapi import HTTPException

from app.db import engine, SessionLocal, utcnow
from app.models import Ticket, Approval, Device, Merchant
from seed.seed import reset_demo
from app.routes.tickets import (
    list_tickets,
    get_ticket,
    confirm_ticket,
    ConfirmRequest,
)
from app.routes.approvals import (
    list_pending_approvals,
    approve_request,
    reject_request,
    RejectRequest,
)
from app.routes.escalations import list_escalations
from app.routes.admin import (
    simulate_outage,
    admin_reset,
    get_metrics,
    OutageRequest,
)
from app.helpers import detect_yes_no, confirmed_actions_for, record_confirmation
from app.handoff import build_case_file, check_case_file, escalate_and_notify


@pytest.fixture(autouse=True)
def init_test_db():
    reset_demo(engine)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# 1. detect_yes_no in English, Hinglish, and Devanagari
def test_detect_yes_no_comprehensive():
    # English & Hinglish Yes
    assert detect_yes_no("yes please") == "yes"
    assert detect_yes_no("yeah") == "yes"
    assert detect_yes_no("ok done") == "yes"
    assert detect_yes_no("haan restart karo") == "yes"
    assert detect_yes_no("haa") == "yes"
    assert detect_yes_no("ha kar do") == "yes"
    assert detect_yes_no("kardo") == "yes"
    assert detect_yes_no("theek hai") == "yes"

    # Devanagari Yes
    assert detect_yes_no("हाँ जरूर") == "yes"
    assert detect_yes_no("हां") == "yes"
    assert detect_yes_no("ठीक है") == "yes"
    assert detect_yes_no("कर दो") == "yes"

    # English & Hinglish No
    assert detect_yes_no("no do not") == "no"
    assert detect_yes_no("nahi chahiye") == "no"
    assert detect_yes_no("nahin") == "no"
    assert detect_yes_no("mat karo") == "no"

    # Devanagari No
    assert detect_yes_no("नहीं") == "no"
    assert detect_yes_no("मत करो") == "no"

    # Conflicts & unrelated
    assert detect_yes_no("haan nahi") is None
    assert detect_yes_no("soundbox check karo") is None
    assert detect_yes_no("") is None


# 2. Tickets listing and detail with trace
def test_tickets_get_and_trace(db):
    t1 = Ticket(
        id="T-LIST-1",
        merchant_id="m1",
        source="voice",
        status="open",
        tier="tier 1",
        intent="network_issue",
        transcript="Device offline hai",
        language="hi",
        stt_confidence=0.88,
        pending_tool="restart_device",
        pending_args={"device_id": "SB-1001"},
        created_at=utcnow() - timedelta(minutes=5),
    )
    t2 = Ticket(
        id="T-LIST-2",
        merchant_id="m2",
        source="text",
        status="resolved",
        tier="tier 1",
        intent="settlement_inquiry",
        transcript="Settlement kab aayega",
        language="en",
        created_at=utcnow(),
        resolved_at=utcnow(),
    )
    db.add(t1)
    db.add(t2)
    db.commit()

    # List all (newest first)
    all_tickets = list_tickets(status=None, db=db)
    assert len(all_tickets) >= 2
    assert all_tickets[0]["id"] == "T-LIST-2"

    # Filter by status
    open_tickets = list_tickets(status="open", db=db)
    assert any(t["id"] == "T-LIST-1" for t in open_tickets)
    assert not any(t["id"] == "T-LIST-2" for t in open_tickets)

    # Get single ticket with trace and pending fields
    detail = get_ticket("T-LIST-1", db=db)
    assert detail["id"] == "T-LIST-1"
    assert detail["pending_tool"] == "restart_device"
    assert detail["pending_args"] == {"device_id": "SB-1001"}
    assert "trace" in detail
    assert isinstance(detail["trace"], list)


# 3. Confirm route: 409 outside awaiting_merchant, 200 inside, idempotent
def test_ticket_confirm_lifecycle_and_idempotency(db):
    ticket = Ticket(
        id="T-CONFIRM-TEST",
        merchant_id="m1",
        source="voice",
        status="open",
        pending_tool="restart_device",
        pending_args={"device_id": "SB-1001"},
        language="hi",
    )
    db.add(ticket)
    db.commit()

    # Outside awaiting_merchant -> must return 409
    with pytest.raises(HTTPException) as exc_info:
        confirm_ticket("T-CONFIRM-TEST", ConfirmRequest(answer="yes"), db=db)
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "CONFLICT"

    # Set to awaiting_merchant -> confirm succeeds
    ticket.status = "awaiting_merchant"
    db.commit()

    res1 = confirm_ticket("T-CONFIRM-TEST", ConfirmRequest(answer="yes"), db=db)
    assert res1["recorded"] is True
    assert res1["answer"] == "yes"

    # Verify confirmation recorded
    actions = confirmed_actions_for("T-CONFIRM-TEST", db=db)
    assert len(actions) == 1
    assert actions[0]["tool"] == "restart_device"

    # Idempotent second confirmation
    res2 = confirm_ticket("T-CONFIRM-TEST", ConfirmRequest(answer="yes"), db=db)
    assert res2["recorded"] is True
    actions2 = confirmed_actions_for("T-CONFIRM-TEST", db=db)
    assert len(actions2) == 1  # Not duplicated!


# 4. Approvals: list pending, approve, reject, idempotent
def test_approvals_lifecycle_and_idempotency(db):
    ticket = Ticket(
        id="T-APP-TEST",
        merchant_id="m3",
        source="voice",
        status="pending_approval",
        language="hi",
    )
    db.add(ticket)

    appr = Approval(
        id="APP-101",
        ticket_id="T-APP-TEST",
        tool_name="create_technician_ticket",
        args={"device_id": "SB-1003", "diagnosis": "Hardware speaker broken"},
        status="pending",
    )
    db.add(appr)
    db.commit()

    # List pending approvals
    pending = list_pending_approvals(db=db)
    assert any(a["id"] == "APP-101" for a in pending)

    # Approve
    res_appr = approve_request("APP-101", db=db)
    assert res_appr["status"] == "approved"
    assert res_appr["ticket_status"] == "resolved"
    assert "tool_result" in res_appr
    assert res_appr["tool_result"]["ok"] is True

    # Check ticket resolved in DB
    db.refresh(ticket)
    assert ticket.status == "resolved"
    assert ticket.resolved_at is not None

    # Idempotent re-approve
    res_appr2 = approve_request("APP-101", db=db)
    assert res_appr2["status"] == "approved"
    assert res_appr2["idempotent"] is True

    # Test reject route on a new approval
    appr_rej = Approval(
        id="APP-REJ-1",
        ticket_id="T-APP-TEST",
        tool_name="create_technician_ticket",
        status="pending",
    )
    db.add(appr_rej)
    db.commit()

    res_rej = reject_request(
        "APP-REJ-1", RejectRequest(reason="Technician unavailable"), db=db
    )
    assert res_rej["status"] == "rejected"
    assert res_rej["ticket_status"] == "escalated"

    db.refresh(ticket)
    assert ticket.status == "escalated"
    assert ticket.tier == "tier 3"

    # Idempotent re-reject
    res_rej2 = reject_request("APP-REJ-1", RejectRequest(), db=db)
    assert res_rej2["status"] == "rejected"
    assert res_rej2["idempotent"] is True


# 5. Escalations list and case file completeness
def test_escalations_route_and_case_file(db):
    ticket = Ticket(
        id="T-ESC-ROUTE",
        merchant_id="m4",
        source="voice",
        status="escalated",
        tier="tier 3",
        intent="fraud",
        transcript="Account se paise kat gaye bina permission",
        language="hi",
    )
    db.add(ticket)
    db.commit()

    escalations = list_escalations(db=db)
    target = next((e for e in escalations if e["id"] == "T-ESC-ROUTE"), None)
    assert target is not None
    assert "case_file" in target

    case = target["case_file"]
    missing = check_case_file(case)
    assert missing == [], f"Missing case file fields: {missing}"
    assert case["merchant"]["id"] == "m4"
    assert case["issue"]["intent"] == "fraud"


# 6. Simulate outage endpoint
def test_simulate_outage(db):
    # Device SB-1002 starts online
    dev_init = db.get(Device, "SB-1002")
    assert dev_init.status == "online"

    res = simulate_outage(OutageRequest(device_id="SB-1002"), db=db)
    assert res["simulated"] is True
    assert res["status"] == "offline"
    assert res["error_code"] == "NET_TIMEOUT"
    assert res["fault_type"] == "network"

    db.refresh(dev_init)
    assert dev_init.status == "offline"
    assert dev_init.error_code == "NET_TIMEOUT"

    # Unknown device -> 404
    with pytest.raises(HTTPException) as exc_info:
        simulate_outage(OutageRequest(device_id="SB-INVALID"), db=db)
    assert exc_info.value.status_code == 404


# 7. Admin reset restores seed state
def test_admin_reset_restores_seed_state(db):
    # Alter state
    dev = db.get(Device, "SB-1002")
    dev.status = "offline"
    dev.error_code = "MANUAL_FAULT"
    db.commit()

    # Reset
    res = admin_reset()
    assert res["status"] == "ok"

    # Verify restored
    with SessionLocal() as s:
        d2 = s.get(Device, "SB-1002")
        assert d2.status == "online"
        assert d2.error_code is None
        d1 = s.get(Device, "SB-1001")
        assert d1.status == "offline"


# 8. Metrics route
def test_metrics_route(db):
    # Create sample resolved and escalated tickets
    t_res = Ticket(
        id="T-METRIC-RES",
        merchant_id="m1",
        status="resolved",
        tier="tier 1",
        created_at=utcnow() - timedelta(seconds=120),
        resolved_at=utcnow(),
        language="hi",
    )
    t_esc = Ticket(
        id="T-METRIC-ESC",
        merchant_id="m4",
        status="escalated",
        tier="tier 3",
        created_at=utcnow(),
        language="hi",
    )
    db.add(t_res)
    db.add(t_esc)
    db.commit()

    metrics = get_metrics(db=db)
    assert "tickets_by_tier" in metrics
    assert "tier 1" in metrics["tickets_by_tier"]
    assert "tier 3" in metrics["tickets_by_tier"]
    assert metrics["average_seconds_to_resolution"] is not None
    assert metrics["escalation_count"] >= 1
    assert 0.0 <= metrics["handoff_completeness"] <= 1.0
    assert metrics["downtime_recovered"]["synthetic"] is True


# 9. escalate_and_notify helper
def test_escalate_and_notify_helper(db):
    ticket = Ticket(
        id="T-ESC-NOTIFY",
        merchant_id="m1",
        status="open",
        intent="unauthorised_transaction",
        transcript="Unauthorized debit happened",
        language="hi",
    )
    db.add(ticket)
    db.commit()

    res = escalate_and_notify(
        ticket_id="T-ESC-NOTIFY",
        reason="Suspicious transaction reported",
        next_step="Fraud investigation",
        language="hi",
        db=db,
    )
    assert res["escalation"]["ok"] is True
    assert res["reply"]["ok"] is True

    db.refresh(ticket)
    assert ticket.status == "escalated"
    assert ticket.tier == "tier 3"
    assert ticket.reply_text is not None

