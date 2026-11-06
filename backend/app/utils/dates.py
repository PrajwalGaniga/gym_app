import calendar
from datetime import date, datetime, timedelta
from typing import Tuple, Optional
import zoneinfo

def get_gym_today(timezone_str: str = "Asia/Kolkata") -> date:
    """Returns today's date strictly in the gym's configured timezone."""
    try:
        tz = zoneinfo.ZoneInfo(timezone_str)
    except Exception:
        tz = zoneinfo.ZoneInfo("Asia/Kolkata")
    return datetime.now(tz).date()

def get_gym_now(timezone_str: str = "Asia/Kolkata") -> datetime:
    """Returns current timezone-aware datetime in gym's configured timezone."""
    try:
        tz = zoneinfo.ZoneInfo(timezone_str)
    except Exception:
        tz = zoneinfo.ZoneInfo("Asia/Kolkata")
    return datetime.now(tz)

def calculate_plan_expiry(start_date: date, duration_unit: str, duration_value: int) -> date:
    """
    Calculates the inclusive expiry date for a membership plan.
    - Duration unit 'month':
      Uses calendar-month arithmetic with clamping to month boundaries.
      End date is the day before the same day in the target month (e.g., Jan 15 -> Feb 14).
      If the start day exceeds the target month's maximum days (e.g., Jan 31 + 1 month),
      it clamps to the final day of the target month (Feb 28/29, Mar 31 -> Apr 30).
    - Duration unit 'day':
      Inclusive: start_date + (duration_value - 1) days.
    """
    if duration_value <= 0:
        raise ValueError("Duration value must be positive")

    unit = duration_unit.lower().strip()
    if unit in ("month", "months"):
        # Target month and year
        target_month_raw = start_date.month + duration_value
        target_year = start_date.year + (target_month_raw - 1) // 12
        target_month = ((target_month_raw - 1) % 12) + 1
        
        target_max_days = calendar.monthrange(target_year, target_month)[1]
        
        # If start day exceeds target month maximum (e.g. Jan 31 -> Feb 28, Mar 31 -> Apr 30)
        if start_date.day > target_max_days:
            # Clamped end of target month
            return date(target_year, target_month, target_max_days)
        else:
            # Normal cycle: the day before the same day in the target month
            target_same_day = date(target_year, target_month, start_date.day)
            return target_same_day - timedelta(days=1)
            
    elif unit in ("day", "days"):
        return start_date + timedelta(days=duration_value - 1)
    else:
        raise ValueError(f"Unsupported duration unit: {duration_unit}")

def calculate_member_status(expiry_date: date, gym_today: date) -> Tuple[str, int]:
    """
    Computes membership status and remaining days:
    - remaining_days = expiry_date - gym_today
    - remaining_days > 3  -> "paid"
    - 0 <= remaining_days <= 3 -> "expiring_soon" (includes expiry day itself)
    - remaining_days < 0 -> "expired"
    Returns (status_string, remaining_days).
    """
    remaining_days = (expiry_date - gym_today).days
    if remaining_days > 3:
        return "paid", remaining_days
    elif 0 <= remaining_days <= 3:
        return "expiring_soon", remaining_days
    else:
        return "expired", remaining_days

def calculate_renewal_dates(
    current_expiry_date: Optional[date],
    payment_date: date,
    custom_start_date: Optional[date],
    duration_unit: str,
    duration_value: int,
    gym_today: date
) -> Tuple[date, date]:
    """
    Calculates start and expiry dates for a renewal:
    - If custom_start_date is explicitly provided by coach, use it.
    - If current_expiry_date exists and >= gym_today:
      Member is renewing before or on expiry date -> new period starts on (current_expiry_date + 1 day).
    - If current_expiry_date is None or < gym_today:
      Member is expired (or has no active period) -> new period starts on payment_date.
    Returns (new_start_date, new_expiry_date).
    """
    if custom_start_date is not None:
        start_date = custom_start_date
    elif current_expiry_date is not None and current_expiry_date >= gym_today:
        start_date = current_expiry_date + timedelta(days=1)
    else:
        start_date = payment_date

    expiry_date = calculate_plan_expiry(start_date, duration_unit, duration_value)
    return start_date, expiry_date
