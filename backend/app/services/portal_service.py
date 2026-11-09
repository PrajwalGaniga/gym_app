from typing import Dict, Any, Optional, Set, List
from datetime import datetime, timezone, timedelta, date
from fastapi import HTTPException
import re

from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.payment_repo import payment_repo
from app.repositories.attendance_repo import attendance_repo
from app.repositories.settings_repo import settings_repo
from app.utils.dates import get_gym_today, get_gym_now, calculate_member_status
from app.utils.geofence import calculate_distance_meters
from app.schemas.portal import (
    PortalLoginRequest,
    PortalCheckInRequest,
    PortalCheckInResponse,
    StreakDetails,
    MembershipDetails,
    LastPaymentDetails
)

class PortalService:
    def __init__(self):
        # In-memory rate limiting: { "ip_or_code": [timestamp1, timestamp2, ...] }
        self._failed_attempts: Dict[str, List[datetime]] = {}

    def _check_rate_limit(self, identifier: str, max_attempts: int = 5, window_minutes: int = 15):
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=window_minutes)
        attempts = self._failed_attempts.get(identifier, [])
        valid_attempts = [t for t in attempts if t > cutoff]
        self._failed_attempts[identifier] = valid_attempts

        if len(valid_attempts) >= max_attempts:
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed verification attempts. Please wait {window_minutes} minutes or speak with the coach."
            )

    def _record_failed_attempt(self, identifier: str):
        now = datetime.now(timezone.utc)
        if identifier not in self._failed_attempts:
            self._failed_attempts[identifier] = []
        self._failed_attempts[identifier].append(now)

    def _clear_failed_attempts(self, identifier: str):
        if identifier in self._failed_attempts:
            del self._failed_attempts[identifier]

    async def _authenticate_member(self, member_code: str, phone_last_2: str, client_ip: str) -> Dict[str, Any]:
        rate_key = f"{client_ip}:{member_code.strip()}"
        self._check_rate_limit(rate_key)

        code_clean = member_code.strip()
        doc = await member_repo.collection.find_one({
            "member_code": {"$regex": f"^{re.escape(code_clean)}$", "$options": "i"},
            "is_archived": False
        })
        if not doc:
            self._record_failed_attempt(rate_key)
            raise HTTPException(
                status_code=401,
                detail="Member ID not found. Please double-check your ID or check with the coach."
            )

        phone_raw = doc.get("normalized_phone") or doc.get("phone") or ""
        digits = "".join(c for c in phone_raw if c.isdigit())
        if not digits.endswith(phone_last_2.strip()):
            self._record_failed_attempt(rate_key)
            raise HTTPException(
                status_code=401,
                detail="Phone number verification failed. Please enter the correct last 2 digits of your registered phone."
            )

        self._clear_failed_attempts(rate_key)
        return doc

    async def _build_portal_response(
        self,
        doc: Dict[str, Any],
        settings: Dict[str, Any],
        already_checked_in: bool,
        check_in_time: str
    ) -> PortalCheckInResponse:
        member_id = str(doc["_id"])
        full_name = doc.get("full_name", "")
        photo_info = doc.get("photo") or {}
        photo_url = photo_info.get("url") or photo_info.get("thumbnail_url")
        gender = doc.get("gender")

        tz_str = settings.get("timezone", "Asia/Kolkata")
        gym_today = get_gym_today(tz_str)
        gym_now = get_gym_now(tz_str)
        today_iso = gym_today.isoformat()

        # Attended dates history
        distinct_dates = await attendance_repo.collection.distinct(
            "check_in_local_date",
            {"member_id": member_id}
        )
        attended_set: Set[date] = set()
        for d_str in distinct_dates:
            try:
                attended_set.add(datetime.strptime(d_str, "%Y-%m-%d").date())
            except Exception:
                pass
        
        if already_checked_in:
            attended_set.add(gym_today)

        weekly_off_days: Set[int] = set(settings.get("weekly_off_days", [6]))
        gym_holidays: Set[date] = set()
        for h_str in settings.get("gym_holidays", []):
            try:
                gym_holidays.add(datetime.strptime(h_str, "%Y-%m-%d").date())
            except Exception:
                pass

        # Hours elapsed since previous check-in (before today)
        prev_checkin = await attendance_repo.collection.find_one(
            {"member_id": member_id, "check_in_local_date": {"$ne": today_iso}},
            sort=[("check_in_at_utc", -1)]
        )
        hours_since_last = None
        if prev_checkin and prev_checkin.get("check_in_at_utc"):
            prev_utc = prev_checkin["check_in_at_utc"]
            if prev_utc.tzinfo is None:
                prev_utc = prev_utc.replace(tzinfo=timezone.utc)
            now_utc = datetime.now(timezone.utc)
            hours_since_last = round((now_utc - prev_utc).total_seconds() / 3600.0, 1)

        # Calculate current streak backwards from today (or from yesterday if not checked in yet today)
        current_streak = 0
        sunday_exempt_applied = False
        grace_period_applied = False
        consecutive_missed = 0

        # If already checked in today, calculate from today; otherwise start checking from yesterday
        curr_d = gym_today if already_checked_in else (gym_today - timedelta(days=1))
        recent_gap_encountered = False

        while True:
            if curr_d in attended_set:
                current_streak += 1
                consecutive_missed = 0
                if recent_gap_encountered:
                    grace_period_applied = True
                curr_d -= timedelta(days=1)
            elif curr_d.weekday() in weekly_off_days or curr_d in gym_holidays:
                sunday_exempt_applied = True
                curr_d -= timedelta(days=1)
            else:
                consecutive_missed += 1
                if consecutive_missed == 1:
                    # 1 missed working day: within 48h grace window
                    if current_streak > 0 and not recent_gap_encountered:
                        recent_gap_encountered = True
                    curr_d -= timedelta(days=1)
                else:
                    # 2+ consecutive missed working days: streak breaks
                    break

        grace_warning_message = None
        if grace_period_applied:
            grace_warning_message = "⚠️ Streak Saved: You missed a workout (>24h), but checked in within the 48-hour grace window!"

        # Best streak calculation
        best_streak = max(current_streak, 1)
        if attended_set:
            sorted_dates = sorted(list(attended_set))
            running = 0
            prev_d = None
            for d in sorted_dates:
                if prev_d is None:
                    running = 1
                else:
                    gap_days = (d - prev_d).days
                    if gap_days == 1:
                        running += 1
                    else:
                        missed_open_days = 0
                        chk = prev_d + timedelta(days=1)
                        while chk < d:
                            if chk.weekday() not in weekly_off_days and chk not in gym_holidays:
                                missed_open_days += 1
                            chk += timedelta(days=1)

                        if missed_open_days <= 1:
                            running += 1
                        else:
                            running = 1
                if running > best_streak:
                    best_streak = running
                prev_d = d

        # Membership Details
        latest_membership = await membership_repo.get_latest_membership_for_member(member_id)
        start_date_str = None
        exp_date_str = None
        paid_date_str = None

        if latest_membership:
            plan_name = latest_membership.get("plan_name", "Standard Membership")
            start_date_str = latest_membership.get("start_date")
            exp_date_str = latest_membership.get("expiry_date")
            if exp_date_str:
                exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d").date()
                status_calc, days_left = calculate_member_status(exp_date, gym_today)
            else:
                status_calc, days_left = "expired", 0
        else:
            plan_name = "No Active Plan"
            status_calc, days_left = "expired", 0

        # Last Payment Details
        last_payment = None
        payment_cursor = payment_repo.collection.find({
            "member_id": member_id,
            "status": "completed"
        }).sort("payment_date", -1).limit(1)

        async for p_doc in payment_cursor:
            paid_date_str = p_doc.get("payment_date")
            last_payment = LastPaymentDetails(
                amount=float(p_doc.get("amount", 0)),
                payment_date=paid_date_str,
                payment_method=p_doc.get("payment_method")
            )

        return PortalCheckInResponse(
            member_id=member_id,
            full_name=full_name,
            member_code=doc.get("member_code", ""),
            photo_url=photo_url,
            gender=gender,
            already_checked_in_today=already_checked_in,
            check_in_time=check_in_time,
            check_in_date=today_iso,
            streak=StreakDetails(
                current_streak=current_streak,
                best_streak=best_streak,
                sunday_exempt_applied=sunday_exempt_applied,
                grace_period_applied=grace_period_applied,
                grace_warning_message=grace_warning_message,
                hours_since_last_checkin=hours_since_last
            ),
            membership=MembershipDetails(
                plan_name=plan_name,
                status=status_calc,
                days_remaining=days_left,
                start_date=start_date_str,
                expiry_date=exp_date_str,
                paid_date=paid_date_str
            ),
            last_payment=last_payment,
            attendance_dates=sorted(list(distinct_dates)),
            weekly_off_days=list(weekly_off_days),
            gym_holidays=settings.get("gym_holidays", [])
        )

    async def view_member_portal(self, req: PortalLoginRequest, client_ip: str) -> PortalCheckInResponse:
        """
        Step 1: 'Enter Gym' Login.
        Accessible from anywhere (NO GPS check).
        Returns member streak, attendance calendar, and membership details.
        """
        doc = await self._authenticate_member(req.member_code, req.phone_last_2, client_ip)
        settings = await settings_repo.get_settings()

        tz_str = settings.get("timezone", "Asia/Kolkata")
        gym_today = get_gym_today(tz_str)
        gym_now = get_gym_now(tz_str)
        today_iso = gym_today.isoformat()

        existing_today = await attendance_repo.collection.find_one({
            "member_id": str(doc["_id"]),
            "check_in_local_date": today_iso
        })

        already_checked_in = bool(existing_today)
        check_in_time = existing_today.get("check_in_local_time", gym_now.strftime("%I:%M %p")) if existing_today else "Not Checked In Today"

        return await self._build_portal_response(doc, settings, already_checked_in, check_in_time)

    async def check_in_member(self, req: PortalCheckInRequest, client_ip: str) -> PortalCheckInResponse:
        """
        Step 2: 'Check In Today' Button Action.
        GPS location verified. Records attendance for today and updates streak.
        """
        doc = await self._authenticate_member(req.member_code, req.phone_last_2, client_ip)
        settings = await settings_repo.get_settings()

        if not settings.get("attendance_enabled", True):
            raise HTTPException(status_code=400, detail="Attendance system is currently disabled by gym administration.")

        # GPS Geofence Verification
        if settings.get("geofence_enabled", True):
            gym_lat = settings.get("gym_latitude")
            gym_lon = settings.get("gym_longitude")
            radius = settings.get("geofence_radius_meters", 100)

            if gym_lat is not None and gym_lon is not None:
                if req.latitude is None or req.longitude is None:
                    raise HTTPException(
                        status_code=400,
                        detail="GPS location is required to verify you are inside Muscle Hunt. Please enable location permissions on your phone."
                    )
                dist = calculate_distance_meters(req.latitude, req.longitude, gym_lat, gym_lon)
                if dist > radius:
                    dist_m = int(round(dist))
                    raise HTTPException(
                        status_code=400,
                        detail=f"Location verification failed: You are approximately {dist_m}m away from the gym (allowed: {radius}m). You must be inside the gym to check in."
                    )

        member_id = str(doc["_id"])
        full_name = doc.get("full_name", "")
        code_clean = doc.get("member_code", req.member_code.strip())

        tz_str = settings.get("timezone", "Asia/Kolkata")
        gym_today = get_gym_today(tz_str)
        gym_now = get_gym_now(tz_str)
        today_iso = gym_today.isoformat()

        existing_today = await attendance_repo.collection.find_one({
            "member_id": member_id,
            "check_in_local_date": today_iso
        })

        if existing_today:
            already_checked_in = True
            check_in_time = existing_today.get("check_in_local_time", gym_now.strftime("%I:%M %p"))
        else:
            already_checked_in = True
            check_in_time = gym_now.strftime("%I:%M %p")

            # Determine membership status for check-in snapshot
            latest_m = await membership_repo.get_latest_membership_for_member(member_id)
            mem_status = "expired"
            is_warning = True
            if latest_m and latest_m.get("expiry_date"):
                try:
                    exp_d = datetime.strptime(latest_m["expiry_date"], "%Y-%m-%d").date()
                    mem_status, _ = calculate_member_status(exp_d, gym_today)
                    is_warning = (mem_status == "expired")
                except Exception:
                    pass

            # Record attendance in database
            await attendance_repo.record_checkin({
                "member_id": member_id,
                "member_code_snapshot": code_clean,
                "member_name_snapshot": full_name,
                "check_in_local_date": gym_today,
                "check_in_local_time": check_in_time,
                "membership_status_at_checkin": mem_status,
                "is_expired_warning": is_warning,
                "created_by": "portal_self_qr"
            })

        return await self._build_portal_response(doc, settings, True, check_in_time)

portal_service = PortalService()
