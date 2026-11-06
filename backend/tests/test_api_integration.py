import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import db_manager

@pytest.mark.asyncio
async def test_health_and_readiness():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        res_ready = await client.get("/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"

@pytest.mark.asyncio
async def test_auth_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Invalid login
        bad_res = await client.post("/api/v1/auth/login", json={"username": "coach", "password": "WrongPassword!"})
        assert bad_res.status_code == 401

        # Valid login
        login_res = await client.post("/api/v1/auth/login", json={"username": "coach", "password": "Coach@Gym2026!"})
        assert login_res.status_code == 200
        data = login_res.json()
        assert "access_token" in data
        assert data["admin"]["username"] == "coach"

        # Check /auth/me using token
        token = data["access_token"]
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "coach"

@pytest.mark.asyncio
async def test_dashboard_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={"username": "coach", "password": "Coach@Gym2026!"})
        token = login_res.json()["access_token"]

        dash_res = await client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
        assert dash_res.status_code == 200
        data = dash_res.json()
        assert "total_members" in data
        assert "paid_members" in data
        assert "expiring_soon_members" in data
        assert "expired_members" in data
        assert "collections_this_month" in data
        assert isinstance(data["revenue_chart"], list)


@pytest.mark.asyncio
async def test_member_lifecycle_and_renewal():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/v1/auth/login", json={"username": "coach", "password": "Coach@Gym2026!"})
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Get plans to get plan_id
        plans_res = await client.get("/api/v1/plans", headers=auth_headers)
        assert plans_res.status_code == 200
        plans = plans_res.json()
        assert len(plans) >= 1
        plan_id = plans[0]["id"]

        # 3. Register New Member
        reg_payload = {
            "full_name": "Test Fitness Member",
            "phone": "+919876543210",
            "joining_date": "2026-03-01",
            "plan_id": plan_id,
            "amount_paid": 1500.0,
            "payment_method": "UPI",
            "notes": "Testing integration lifecycle"
        }
        create_res = await client.post("/api/v1/members", json=reg_payload, headers=auth_headers)
        assert create_res.status_code == 201
        member = create_res.json()
        member_id = member["id"]
        assert member["full_name"] == "Test Fitness Member"
        assert member["member_code"].startswith("GYM")
        assert member["status"] in ("paid", "expiring_soon", "expired")

        # 4. Register Legacy Member with existing ID
        import uuid
        legacy_code = f"LEG-TEST-{uuid.uuid4().hex[:6].upper()}"
        legacy_payload = {
            "member_code": legacy_code,
            "full_name": "Legacy Member One",
            "phone": "9811223344",
            "joining_date_known": False,
            "current_expiry_date": "2026-06-30",
            "migration_notes": "Existing gym member since 2023"
        }
        legacy_res = await client.post("/api/v1/members/legacy", json=legacy_payload, headers=auth_headers)
        assert legacy_res.status_code == 201
        legacy_member = legacy_res.json()
        assert legacy_member["member_code"] == legacy_code
        assert legacy_member["joining_date_known"] is False

        # 5. Preview Renewal
        preview_res = await client.get(
            f"/api/v1/memberships/preview-renewal?member_id={member_id}&plan_id={plan_id}",
            headers=auth_headers
        )
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert "calculated_start_date" in preview_data
        assert "calculated_expiry_date" in preview_data

        # 6. Execute Renewal
        renewal_payload = {
            "plan_id": plan_id,
            "payment_amount": 1500.0,
            "payment_date": "2026-03-05",
            "payment_method": "Cash",
            "notes": "Renewed early"
        }
        renew_res = await client.post(f"/api/v1/memberships/{member_id}/renew", json=renewal_payload, headers=auth_headers)
        assert renew_res.status_code == 200

        # 7. Member details should have payment history
        payments_res = await client.get(f"/api/v1/members/{member_id}/payments", headers=auth_headers)
        assert payments_res.status_code == 200
        p_data = payments_res.json()
        assert p_data["total"] >= 2  # initial + renewal

        # 8. Check in member for attendance
        chk_res = await client.post("/api/v1/attendance/check-in", json={"member_id": member_id}, headers=auth_headers)
        assert chk_res.status_code == 200
        chk_data = chk_res.json()
        assert chk_data["member_code_snapshot"] == member["member_code"]

        # Duplicate check-in should be rejected
        dup_chk_res = await client.post("/api/v1/attendance/check-in", json={"member_id": member_id}, headers=auth_headers)
        assert dup_chk_res.status_code == 400
        assert "Duplicate check-in" in dup_chk_res.json()["detail"]
