import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_wallet_report_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login
        login_res = await client.post("/api/v1/auth/login", json={"username": "coach", "password": "Coach@Gym2026!"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Query wallet with 30d
        res_30d = await client.get("/api/v1/reports/wallet?period=30d", headers=headers)
        assert res_30d.status_code == 200
        data_30d = res_30d.json()
        assert "total_revenue" in data_30d
        assert "total_transactions" in data_30d
        assert "by_payment_method" in data_30d
        assert "recent_transactions" in data_30d
        assert data_30d["period"] == "30d"

        # Query wallet with all time
        res_all = await client.get("/api/v1/reports/wallet?period=all", headers=headers)
        assert res_all.status_code == 200
        data_all = res_all.json()
        assert data_all["period"] == "all"
        assert data_all["start_date"] is None

@pytest.mark.asyncio
async def test_member_new_and_legacy_fields():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={"username": "coach", "password": "Coach@Gym2026!"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get plans
        plans_res = await client.get("/api/v1/plans?active_only=true", headers=headers)
        plans = plans_res.json()
        assert len(plans) > 0
        plan_id = plans[0]["id"]

        unique_code = f"NEW-{uuid.uuid4().hex[:6]}"
        member_payload = {
            "full_name": "Test Athlete With Gender",
            "member_code": unique_code,
            "phone": "9812345678",
            "gender": "Female",
            "joining_date": "2026-01-15",
            "plan_id": plan_id,
            "start_date": "2026-01-15",
            "payment_date": "2026-01-15",
            "amount_paid": 600.0,
            "registration_fee": 100.0,
            "payment_method": "UPI",
            "reference": "UPI-TEST-123",
            "notes": "Testing new registration fee"
        }

        create_res = await client.post("/api/v1/members", json=member_payload, headers=headers)
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["gender"] == "Female"
        assert created["lifetime_revenue"] >= 600.0
        assert created["last_payment_date"] == "2026-01-15"
        assert created["total_months_completed"] >= 0

        # Create Legacy Member
        legacy_code = f"LEG-{uuid.uuid4().hex[:6]}"
        legacy_payload = {
            "member_code": legacy_code,
            "full_name": "Test Legacy Athlete",
            "phone": "9876500001",
            "gender": "Male",
            "joining_date": None,
            "joining_date_known": False,
            "current_expiry_date": "2026-12-31",
            "migration_notes": "Migrated from register page 1"
        }
        leg_res = await client.post("/api/v1/members/legacy", json=legacy_payload, headers=headers)
        assert leg_res.status_code == 201
        legacy_doc = leg_res.json()
        assert legacy_doc["member_code"] == legacy_code
        assert legacy_doc["gender"] == "Male"
        assert legacy_doc["joining_date"] is None
        assert legacy_doc["joining_date_known"] is False
