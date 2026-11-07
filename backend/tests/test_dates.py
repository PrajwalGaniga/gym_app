from datetime import date
import pytest
from app.utils.dates import calculate_plan_expiry

def test_calendar_month_jan_31_non_leap_year():
    # 2025 is not a leap year. Feb has 28 days.
    start = date(2025, 1, 31)
    expiry = calculate_plan_expiry(start, "month", 1)
    assert expiry == date(2025, 2, 28)

def test_calendar_month_jan_31_leap_year():
    # 2028 is a leap year. Feb has 29 days.
    start = date(2028, 1, 31)
    expiry = calculate_plan_expiry(start, "month", 1)
    assert expiry == date(2028, 2, 29)

def test_calendar_month_mar_31():
    # April has 30 days. Mar 31 + 1 month ends Apr 30.
    start = date(2026, 3, 31)
    expiry = calculate_plan_expiry(start, "month", 1)
    assert expiry == date(2026, 4, 30)

def test_calendar_month_mid_month():
    # Jan 15 + 1 month ends Feb 14 (inclusive)
    start = date(2026, 1, 15)
    expiry = calculate_plan_expiry(start, "month", 1)
    assert expiry == date(2026, 2, 14)

def test_calendar_month_first_day():
    # Jan 1 + 1 month ends Jan 31
    start = date(2026, 1, 1)
    expiry = calculate_plan_expiry(start, "month", 1)
    assert expiry == date(2026, 1, 31)

def test_calendar_month_multi_month():
    # Jan 31 + 3 months ends Apr 30
    start = date(2026, 1, 31)
    expiry = calculate_plan_expiry(start, "month", 3)
    assert expiry == date(2026, 4, 30)

    # Jan 15 + 12 months ends Jan 14 next year
    start = date(2026, 1, 15)
    expiry = calculate_plan_expiry(start, "month", 12)
    assert expiry == date(2027, 1, 14)

def test_day_unit_plan():
    start = date(2026, 1, 1)
    expiry = calculate_plan_expiry(start, "day", 1)
    assert expiry == date(2026, 1, 1)  # 1-day membership ends same day

    expiry_30 = calculate_plan_expiry(start, "day", 30)
    assert expiry_30 == date(2026, 1, 30)

