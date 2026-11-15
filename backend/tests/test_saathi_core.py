import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func

from app.main import app
from app.db import Base, engine, SessionLocal, get_db
from app.models import Merchant, Device, Settlement, Ticket, AuditLog
from seed.seed import reset_demo
from app import audit, tools


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database is reset and seeded before tests run."""
    reset_demo(engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# 1. Health check test
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# 2. Every mock endpoint and error shape test
def test_every_mock_endpoint(client):
    # GET /mock/merchants/{id}
    res_m1 = client.get("/mock/merchants/m1")
    assert res_m1.status_code == 200
    data_m1 = res_m1.json()
    assert data_m1["id"] == "m1"
    assert data_m1["name"] == "Ramesh Patel"
    assert data_m1["language"] == "hi"

    # GET /mock/merchants/{id} - not found
    res_m_404 = client.get("/mock/merchants/unknown_m")
    assert res_m_404.status_code == 404
    err_json = res_m_404.json()
    assert "error" in err_json
    assert "code" in err_json["error"]
    assert "message" in err_json["error"]

    # GET /mock/devices/{device_id}/health
    res_dev = client.get("/mock/devices/SB-1002/health")
    assert res_dev.status_code == 200
    data_dev = res_dev.json()
    assert data_dev["device_id"] == "SB-1002"
    assert data_dev["status"] == "online"

    # GET /mock/devices/{device_id}/health - not found
    res_dev_404 = client.get("/mock/devices/SB-9999/health")
    assert res_dev_404.status_code == 404
    assert "error" in res_dev_404.json()
    assert res_dev_404.json()["error"]["code"] == "DEVICE_NOT_FOUND"

    # GET /mock/settlements?merchant_id=
    res_settle = client.get("/mock/settlements?merchant_id=m2")
    assert res_settle.status_code == 200
    settle_list = res_settle.json()
    assert isinstance(settle_list, list)
    assert len(settle_list) >= 1
    assert "date" in settle_list[0]
    assert "amount" in settle_list[0]
    assert "status" in settle_list[0]
    assert "expected_by" in settle_list[0]

    # POST /mock/devices/{device_id}/restart
    res_restart = client.post("/mock/devices/SB-1004/restart")
    assert res_restart.status_code == 200
    assert res_restart.json() == {"accepted": True}

    # POST /mock/devices/{device_id}/restart - not found
    res_restart_404 = client.post("/mock/devices/SB-9999/restart")
    assert res_restart_404.status_code == 404
    assert "error" in res_restart_404.json()

    # POST /mock/technician-tickets
    res_tt = client.post(
        "/mock/technician-tickets",
        json={"device_id": "SB-1003", "diagnosis": "Speaker faulty, no sound emitted"},
    )
    assert res_tt.status_code == 201
    tt_data = res_tt.json()
    assert tt_data["status"] == "scheduled"
    assert tt_data["device_id"] == "SB-1003"
    assert "id" in tt_data


# 3. m1 restart ends online after ~2.2s
def test_m1_restart_ends_online_after_2_seconds(client):
    reset_demo(engine)

    # Initial state: offline, network fault
    res_initial = client.get("/mock/devices/SB-1001/health")
    assert res_initial.status_code == 200
    assert res_initial.json()["status"] == "offline"
    assert res_initial.json()["error_code"] == "ERR_NETWORK_DISCONNECTED"

    # Request restart
    restart_res = client.post("/mock/devices/SB-1001/restart")
    assert restart_res.status_code == 200
    assert restart_res.json()["accepted"] is True

    # Immediate health check (< 2s) should still be offline
    res_imm = client.get("/mock/devices/SB-1001/health")
    assert res_imm.json()["status"] == "offline"

    # Wait 2.2 seconds
    time.sleep(2.2)

    # Health check after 2+ seconds: device should be online with error cleared
    res_after = client.get("/mock/devices/SB-1001/health")
    assert res_after.status_code == 200
    data_after = res_after.json()
    assert data_after["status"] == "online"
    assert data_after["error_code"] is None


# 4. m3 stays offline after restart (hardware fault)
def test_m3_stays_offline_after_restart(client):
    reset_demo(engine)

    # Initial state: offline, HW_SPEAKER_FAULT
    res_initial = client.get("/mock/devices/SB-1003/health")
    assert res_initial.status_code == 200
    assert res_initial.json()["status"] == "offline"
    assert res_initial.json()["error_code"] == "HW_SPEAKER_FAULT"

    # Request restart
    restart_res = client.post("/mock/devices/SB-1003/restart")
    assert restart_res.status_code == 200

    # Wait 2.2 seconds
    time.sleep(2.2)

    # Health check after 2+ seconds: must STAY offline for hardware fault
    res_after = client.get("/mock/devices/SB-1003/health")
    assert res_after.status_code == 200
    data_after = res_after.json()
    assert data_after["status"] == "offline"
    assert data_after["error_code"] == "HW_SPEAKER_FAULT"


# 5. m2 settlement is processing
def test_m2_settlement_is_processing(client):
    res = client.get("/mock/settlements?merchant_id=m2")
    assert res.status_code == 200
    settlements = res.json()
    assert len(settlements) >= 1
    processing_settlement = next((s for s in settlements if s["status"] == "processing"), None)
    assert processing_settlement is not None
    assert processing_settlement["amount"] == 4500.0


# 6. m5 is offline with settlement processing
def test_m5_offline_with_settlement_processing(client):
    dev_res = client.get("/mock/devices/SB-1005/health")
    assert dev_res.status_code == 200
    dev_data = dev_res.json()
    assert dev_data["status"] == "offline"
    assert dev_data["error_code"] == "ERR_NETWORK_DISCONNECTED"

    settle_res = client.get("/mock/settlements?merchant_id=m5")
    assert settle_res.status_code == 200
    settlements = settle_res.json()
    assert any(s["status"] == "processing" for s in settlements)


# 7. Seed twice gives same counts
def test_seed_twice_gives_same_counts():
    reset_demo(engine)
    with SessionLocal() as db:
        m_count_1 = db.query(Merchant).count()
        d_count_1 = db.query(Device).count()
        s_count_1 = db.query(Settlement).count()

    assert m_count_1 == 5
    assert d_count_1 == 5
    assert s_count_1 == 5

    # Run seed reset a second time
    reset_demo(engine)
    with SessionLocal() as db:
        m_count_2 = db.query(Merchant).count()
        d_count_2 = db.query(Device).count()
        s_count_2 = db.query(Settlement).count()

    assert m_count_1 == m_count_2 == 5
    assert d_count_1 == d_count_2 == 5
    assert s_count_1 == s_count_2 == 5


# 8. Audit step_no and rejected type
def test_audit_step_no_and_rejected_type():
    with SessionLocal() as db:
        test_ticket = Ticket(
            id="T-AUDIT-TEST",
            merchant_id="m1",
            source="text",
            status="open",
            language="hi",
        )
        db.merge(test_ticket)
        db.commit()

        # Step 1: log input
        entry1 = audit.log("T-AUDIT-TEST", "input", {"text": "Soundbox silent"}, db=db)
        assert entry1.step_no == 1
        assert entry1.type == "input"

        # Step 2: log tool_call
        entry2 = audit.log("T-AUDIT-TEST", "tool_call", {"tool": "get_device_health"}, db=db)
        assert entry2.step_no == 2

        # Step 3: log policy
        entry3 = audit.log("T-AUDIT-TEST", "policy", {"decision": "ALLOW"}, db=db)
        assert entry3.step_no == 3

        # Invalid type should raise ValueError
        with pytest.raises(ValueError) as exc_info:
            audit.log("T-AUDIT-TEST", "illegal_type", {"data": 123}, db=db)
        assert "Invalid audit log type" in str(exc_info.value)

        # get_trace should return trace in order of step_no
        trace = audit.get_trace("T-AUDIT-TEST", db=db)
        assert len(trace) == 3
        assert [t["step_no"] for t in trace] == [1, 2, 3]
        assert [t["type"] for t in trace] == ["input", "tool_call", "policy"]


# 9. Tools shape and behavior
def test_tools_shape():
    with SessionLocal() as db:
        # Create a test ticket for tools testing
        test_ticket = Ticket(
            id="T-TOOL-TEST",
            merchant_id="m1",
            source="text",
            status="open",
            language="hi",
        )
        db.merge(test_ticket)
        db.commit()

        # Check all 7 tools return {ok, data, error} shape and never raise
        # 1. get_merchant
        res1 = tools.get_merchant("m1", db=db)
        assert set(res1.keys()) == {"ok", "data", "error"}
        assert res1["ok"] is True
        assert res1["data"]["id"] == "m1"

        res1_bad = tools.get_merchant("invalid_m", db=db)
        assert res1_bad["ok"] is False
        assert res1_bad["error"] is not None

        # 2. get_device_health
        res2 = tools.get_device_health("SB-1002", db=db)
        assert set(res2.keys()) == {"ok", "data", "error"}
        assert res2["ok"] is True
        assert res2["data"]["device_id"] == "SB-1002"

        res2_bad = tools.get_device_health("SB-NONEXIST", db=db)
        assert res2_bad["ok"] is False

        # 3. get_settlement_status
        res3 = tools.get_settlement_status("m2", db=db)
        assert set(res3.keys()) == {"ok", "data", "error"}
        assert res3["ok"] is True
        assert isinstance(res3["data"], list)

        # 4. restart_device
        res4 = tools.restart_device("SB-1001", db=db)
        assert set(res4.keys()) == {"ok", "data", "error"}
        assert res4["ok"] is True
        assert res4["data"] == {"accepted": True}

        # 5. create_technician_ticket
        res5 = tools.create_technician_ticket("SB-1003", "Hardware fault diagnosis", db=db)
        assert set(res5.keys()) == {"ok", "data", "error"}
        assert res5["ok"] is True
        assert res5["data"]["status"] == "scheduled"

        # 6. escalate_to_human
        res6 = tools.escalate_to_human("T-TOOL-TEST", "Suspected fraud complaint", db=db)
        assert set(res6.keys()) == {"ok", "data", "error"}
        assert res6["ok"] is True
        # Verify ticket was updated to escalated, tier 3
        db.refresh(test_ticket)
        assert test_ticket.status == "escalated"
        assert test_ticket.tier == "tier 3"
        # Verify audit log contains escalation
        trace = audit.get_trace("T-TOOL-TEST", db=db)
        assert any(t["type"] == "escalation" for t in trace)

        # 7. send_reply
        res7 = tools.send_reply("T-TOOL-TEST", "Aapka device restart ho raha hai", "hi", db=db)
        assert set(res7.keys()) == {"ok", "data", "error"}
        assert res7["ok"] is True
        db.refresh(test_ticket)
        assert test_ticket.reply_text == "Aapka device restart ho raha hai"
        trace2 = audit.get_trace("T-TOOL-TEST", db=db)
        assert any(t["type"] == "reply" for t in trace2)

    # Tool schemas and registry
    assert len(tools.TOOL_SCHEMAS) == 7
    for schema in tools.TOOL_SCHEMAS:
        assert schema["type"] == "function"
        assert "function" in schema
        assert "name" in schema["function"]
        assert "parameters" in schema["function"]

    assert len(tools.TOOL_REGISTRY) == 7
    expected_tools = {
        "get_merchant",
        "get_device_health",
        "get_settlement_status",
        "restart_device",
        "create_technician_ticket",
        "escalate_to_human",
        "send_reply",
    }
    assert set(tools.TOOL_REGISTRY.keys()) == expected_tools

