import pytest
from datetime import date, timedelta
from app.utils.geofence import calculate_distance_meters

def test_haversine_distance_accurate():
    # IronPulse Fitness mock coordinates (Bangalore / Mumbai / etc.)
    gym_lat = 12.9716
    gym_lon = 77.5946

    # 1. Point at the exact same location should be 0 meters
    assert calculate_distance_meters(gym_lat, gym_lon, gym_lat, gym_lon) == 0.0

    # 2. Point ~50 meters north
    # 1 degree latitude ~= 111,000 meters. 0.00045 deg ~= 50 meters
    point_50m = (gym_lat + 0.00045, gym_lon)
    dist = calculate_distance_meters(gym_lat, gym_lon, point_50m[0], point_50m[1])
    assert 45.0 <= dist <= 55.0

    # 3. Point ~2 km away should exceed 100m geofence radius
    point_2km = (gym_lat + 0.018, gym_lon + 0.018)
    dist_2km = calculate_distance_meters(gym_lat, gym_lon, point_2km[0], point_2km[1])
    assert dist_2km > 1000.0

def test_sunday_exempt_streak_logic():
    # Simulate a user attending Friday, Saturday, skipping Sunday (gym closed), attending Monday
    # Dates:
    # 2026-11-06: Friday
    # 2026-11-07: Saturday
    # 2026-11-08: Sunday (Weekly off, weekday = 6)
    # 2026-11-09: Monday
    
    attended_set = {
        date(2026, 11, 6),
        date(2026, 11, 7),
        date(2026, 11, 9)
    }
    weekly_off_days = {6}
    gym_holidays = set()

    curr_d = date(2026, 11, 9)
    streak = 0
    sunday_exempt_applied = False

    while True:
        if curr_d in attended_set:
            streak += 1
            curr_d -= timedelta(days=1)
        elif curr_d.weekday() in weekly_off_days or curr_d in gym_holidays:
            sunday_exempt_applied = True
            curr_d -= timedelta(days=1)
        else:
            break

    # Streak should be 3! (Fri, Sat, Mon, Sunday skipped safely)
    assert streak == 3
    assert sunday_exempt_applied is True

def test_48h_grace_period_streak_logic():
    weekly_off_days = {6}
    gym_holidays = set()

    # Case A: 1 Missed working day (between 24h and 48h)
    # Thursday: Attended
    # Friday: Missed (grace)
    # Saturday: Attended (Today)
    attended_set_grace = {
        date(2026, 11, 5),  # Thu
        date(2026, 11, 7),  # Sat (Today)
    }

    curr_d = date(2026, 11, 7)
    streak = 0
    consecutive_missed = 0
    grace_applied = False
    recent_gap = False

    while True:
        if curr_d in attended_set_grace:
            streak += 1
            consecutive_missed = 0
            if recent_gap:
                grace_applied = True
            curr_d -= timedelta(days=1)
        elif curr_d.weekday() in weekly_off_days or curr_d in gym_holidays:
            curr_d -= timedelta(days=1)
        else:
            consecutive_missed += 1
            if consecutive_missed == 1:
                if streak > 0 and not recent_gap:
                    recent_gap = True
                curr_d -= timedelta(days=1)
            else:
                break

    # Thursday (1) + Saturday (1) = 2 streak saved by 48h grace!
    assert streak == 2
    assert grace_applied is True

    # Case B: 2 Missed working days (>48h elapsed)
    # Wednesday: Attended
    # Thursday: Missed working day
    # Friday: Missed working day
    # Saturday: Attended (Today)
    attended_set_broken = {
        date(2026, 11, 4),  # Wed
        date(2026, 11, 7),  # Sat (Today)
    }

    curr_d = date(2026, 11, 7)
    streak_broken = 0
    consecutive_missed = 0
    grace_applied_broken = False
    recent_gap = False

    while True:
        if curr_d in attended_set_broken:
            streak_broken += 1
            consecutive_missed = 0
            if recent_gap:
                grace_applied_broken = True
            curr_d -= timedelta(days=1)
        elif curr_d.weekday() in weekly_off_days or curr_d in gym_holidays:
            curr_d -= timedelta(days=1)
        else:
            consecutive_missed += 1
            if consecutive_missed == 1:
                if streak_broken > 0 and not recent_gap:
                    recent_gap = True
                curr_d -= timedelta(days=1)
            else:
                break

    # Streak broken! Resets to 1 (only Saturday)
    assert streak_broken == 1
    assert grace_applied_broken is False

