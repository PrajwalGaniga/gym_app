from datetime import date, timedelta
import pytest
from app.utils.dates import calculate_member_status

def test_status_paid():
    today = date(2026, 3, 10)
    # 4 days remaining -> paid
    expiry = date(2026, 3, 14)
    status, remaining = calculate_member_status(expiry, today)
    assert status == "paid"
    assert remaining == 4

def test_status_expiring_soon_3_days():
    today = date(2026, 3, 10)
    # Exactly 3 days remaining -> expiring_soon
    expiry = date(2026, 3, 13)
    status, remaining = calculate_member_status(expiry, today)
    assert status == "expiring_soon"
    assert remaining == 3

def test_status_expiring_soon_1_day():
    today = date(2026, 3, 10)
    # 1 day remaining -> expiring_soon
    expiry = date(2026, 3, 11)
    status, remaining = calculate_member_status(expiry, today)
    assert status == "expiring_soon"
    assert remaining == 1

def test_status_expiring_today():
    today = date(2026, 3, 10)
    # Expiring today (remaining = 0) -> expiring_soon, remains valid through end of today
    expiry = date(2026, 3, 10)
    status, remaining = calculate_member_status(expiry, today)
    assert status == "expiring_soon"
    assert remaining == 0

def test_status_expired_yesterday():
    today = date(2026, 3, 10)
    # Expired yesterday (remaining = -1) -> expired
    expiry = date(2026, 3, 9)
    status, remaining = calculate_member_status(expiry, today)
    assert status == "expired"
    assert remaining == -1

def test_status_expired_long_ago():
    today = date(2026, 3, 10)
    expiry = date(2025, 12, 31)
    status, remaining = calculate_member_status(expiry, today)
    assert status == "expired"
    assert remaining < 0
