from datetime import date
import pytest
from app.utils.dates import calculate_renewal_dates

def test_renewal_before_expiry():
    gym_today = date(2026, 3, 10)
    current_expiry = date(2026, 3, 20)  # 10 days remaining
    payment_date = date(2026, 3, 10)

    # 1 month plan
    new_start, new_expiry = calculate_renewal_dates(
        current_expiry_date=current_expiry,
        payment_date=payment_date,
        custom_start_date=None,
        duration_unit="month",
        duration_value=1,
        gym_today=gym_today
    )
    # Starts day after old expiry -> 2026-03-21
    assert new_start == date(2026, 3, 21)
    # 1 month from Mar 21 ends Apr 20
    assert new_expiry == date(2026, 4, 20)

def test_renewal_on_expiry_date():
    gym_today = date(2026, 3, 10)
    current_expiry = date(2026, 3, 10)  # expires today
    payment_date = date(2026, 3, 10)

    new_start, new_expiry = calculate_renewal_dates(
        current_expiry_date=current_expiry,
        payment_date=payment_date,
        custom_start_date=None,
        duration_unit="month",
        duration_value=1,
        gym_today=gym_today
    )
    # Starts day after old expiry -> 2026-03-11
    assert new_start == date(2026, 3, 11)
    assert new_expiry == date(2026, 4, 10)

def test_renewal_after_expiry():
    gym_today = date(2026, 3, 10)
    current_expiry = date(2026, 2, 28)  # expired 10 days ago
    payment_date = date(2026, 3, 10)

    new_start, new_expiry = calculate_renewal_dates(
        current_expiry_date=current_expiry,
        payment_date=payment_date,
        custom_start_date=None,
        duration_unit="month",
        duration_value=1,
        gym_today=gym_today
    )
    # Starts on payment date -> 2026-03-10
    assert new_start == date(2026, 3, 10)
    assert new_expiry == date(2026, 4, 9)

def test_renewal_custom_start_date():
    gym_today = date(2026, 3, 10)
    current_expiry = date(2026, 3, 5)
    payment_date = date(2026, 3, 10)
    custom_start = date(2026, 3, 15)

    new_start, new_expiry = calculate_renewal_dates(
        current_expiry_date=current_expiry,
        payment_date=payment_date,
        custom_start_date=custom_start,
        duration_unit="month",
        duration_value=1,
        gym_today=gym_today
    )
    assert new_start == date(2026, 3, 15)
    assert new_expiry == date(2026, 4, 14)
