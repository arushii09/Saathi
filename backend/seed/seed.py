from datetime import timedelta
from sqlalchemy.orm import Session

from app.db import Base, engine, utcnow
from app.models import Merchant, Device, Settlement


def reset_demo(target_engine=None):
    """Drop, recreate, and load seed merchants m1 to m5 and devices SB-1001 to SB-1005."""
    b_engine = target_engine or engine
    Base.metadata.drop_all(bind=b_engine)
    Base.metadata.create_all(bind=b_engine)

    now = utcnow()
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    merchants_data = [
        Merchant(
            id="m1",
            name="Ramesh Patel",
            shop="Patel Provision Store",
            language="hi",
            created_at=now,
        ),
        Merchant(
            id="m2",
            name="Imran Shaikh",
            shop="Shaikh Electronics",
            language="en",
            created_at=now,
        ),
        Merchant(
            id="m3",
            name="Sunita Sharma",
            shop="Sharma Sweets",
            language="hi",
            created_at=now,
        ),
        Merchant(
            id="m4",
            name="Kavita Joshi",
            shop="Joshi General Store",
            language="hi",
            created_at=now,
        ),
        Merchant(
            id="m5",
            name="Arjun Mehta",
            shop="Mehta Dairy",
            language="en",
            created_at=now,
        ),
    ]

    devices_data = [
        # m1: device offline, network fault. Restart fixes it after about 2 seconds.
        Device(
            id="SB-1001",
            merchant_id="m1",
            status="offline",
            last_heartbeat=now - timedelta(minutes=25),
            error_code="ERR_NETWORK_DISCONNECTED",
            fault_type="network",
            restart_requested_at=None,
            created_at=now,
        ),
        # m2: device online, yesterday's settlement status "processing". Informational reply.
        Device(
            id="SB-1002",
            merchant_id="m2",
            status="online",
            last_heartbeat=now,
            error_code=None,
            fault_type=None,
            restart_requested_at=None,
            created_at=now,
        ),
        # m3: device offline, hardware fault (HW_SPEAKER_FAULT). Restart does NOT fix it. Technician ticket needs human approval.
        Device(
            id="SB-1003",
            merchant_id="m3",
            status="offline",
            last_heartbeat=now - timedelta(minutes=15),
            error_code="HW_SPEAKER_FAULT",
            fault_type="hardware",
            restart_requested_at=None,
            created_at=now,
        ),
        # m4: fraud complaint. Device online. Tier 3 escalate.
        Device(
            id="SB-1004",
            merchant_id="m4",
            status="online",
            last_heartbeat=now,
            error_code=None,
            fault_type=None,
            restart_requested_at=None,
            created_at=now,
        ),
        # m5: device offline (network fault) AND settlement processing together.
        Device(
            id="SB-1005",
            merchant_id="m5",
            status="offline",
            last_heartbeat=now - timedelta(minutes=40),
            error_code="ERR_NETWORK_DISCONNECTED",
            fault_type="network",
            restart_requested_at=None,
            created_at=now,
        ),
    ]

    settlements_data = [
        Settlement(
            merchant_id="m1",
            date=yesterday_str,
            amount=1550.0,
            status="settled",
            expected_by=None,
            created_at=now,
        ),
        # m2: yesterday's settlement status "processing"
        Settlement(
            merchant_id="m2",
            date=yesterday_str,
            amount=4500.0,
            status="processing",
            expected_by="Today, 5:00 PM",
            created_at=now,
        ),
        Settlement(
            merchant_id="m3",
            date=yesterday_str,
            amount=2100.0,
            status="settled",
            expected_by=None,
            created_at=now,
        ),
        Settlement(
            merchant_id="m4",
            date=yesterday_str,
            amount=1800.0,
            status="settled",
            expected_by=None,
            created_at=now,
        ),
        # m5: settlement processing
        Settlement(
            merchant_id="m5",
            date=yesterday_str,
            amount=3200.0,
            status="processing",
            expected_by="Today, 5:00 PM",
            created_at=now,
        ),
    ]

    with Session(b_engine) as session:
        for m in merchants_data:
            session.add(m)
        for d in devices_data:
            session.add(d)
        for s in settlements_data:
            session.add(s)
        session.commit()


if __name__ == "__main__":
    reset_demo()
    print("Demo database reset and seeded successfully.")

