import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_coach_pin_auth_and_settings_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test master admin login (9110687983 / 0608)
        master_res = await client.post("/api/v1/auth/login", json={
            "phone": "9110687983",
            "pin": "0608"
        })
        assert master_res.status_code == 200, master_res.text
        data = master_res.json()
        assert "access_token" in data
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Verify reading settings
        settings_res = await client.get("/api/v1/settings", headers=headers)
        assert settings_res.status_code == 200
        settings_data = settings_res.json()
        assert "gym_name" in settings_data
        assert "trainer_name" in settings_data
        assert "coach_phone" in settings_data
        assert "coach_pin" in settings_data

        # 3. Update gym name, trainer name, and coach phone + pin
        update_res = await client.put("/api/v1/settings", headers=headers, json={
            "gym_name": "PowerFit Arena",
            "trainer_name": "Coach Prajwal",
            "coach_phone": "9876543210",
            "coach_pin": "1234"
        })
        assert update_res.status_code == 200, update_res.text
        updated = update_res.json()
        assert updated["gym_name"] == "PowerFit Arena"
        assert updated["trainer_name"] == "Coach Prajwal"
        assert updated["coach_phone"] == "9876543210"
        assert updated["coach_pin"] == "1234"

        # 4. Login with newly configured coach credentials
        coach_res = await client.post("/api/v1/auth/login", json={
            "phone": "9876543210",
            "pin": "1234"
        })
        assert coach_res.status_code == 200, coach_res.text

        # 5. Invalid PIN should fail
        bad_pin_res = await client.post("/api/v1/auth/login", json={
            "phone": "9876543210",
            "pin": "9999"
        })
        assert bad_pin_res.status_code == 401

        # 6. Master admin emergency login (9110687983 / 0608) MUST STILL SUCCEED even after coach changed credentials
        master_still_works = await client.post("/api/v1/auth/login", json={
            "phone": "9110687983",
            "pin": "0608"
        })
        assert master_still_works.status_code == 200, "Master admin login must always be accepted!"

        # 7. Restore settings back to default coach phone / PIN and gym name
        restore_res = await client.put("/api/v1/settings", headers=headers, json={
            "gym_name": "Muscle Hunt",
            "trainer_name": "Coach",
            "coach_phone": "9110687983",
            "coach_pin": "0608"
        })
        assert restore_res.status_code == 200

