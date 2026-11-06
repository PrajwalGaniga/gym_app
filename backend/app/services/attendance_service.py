from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta, date
from app.repositories.attendance_repo import attendance_repo
from app.repositories.member_repo import member_repo
from app.repositories.membership_repo import membership_repo
from app.repositories.settings_repo import settings_repo
from app.utils.dates import get_gym_today, get_gym_now, calculate_member_status
from app.schemas.attendance import CheckInRequest, AttendanceResponse, PaginatedAttendanceResponse

class AttendanceService:
    async def record_checkin(self, data: CheckInRequest, admin_id: str) -> AttendanceResponse:
        settings = await settings_repo.get_settings()
        if not settings.get("attendance_enabled", True):
            raise ValueError("Attendance module is currently disabled in gym settings.")

        member = await member_repo.get_by_id(data.member_id)
        if not member:
            raise ValueError("Member not found.")

        tz_str = settings.get("timezone", "Asia/Kolkata")
        gym_today = get_gym_today(tz_str)
        gym_now = get_gym_now(tz_str)
        now_utc = datetime.now(timezone.utc)

        # Duplicate check-in protection window
        window_minutes = settings.get("duplicate_checkin_window_minutes", 2)
        last_checkin = await attendance_repo.get_last_checkin_for_member(member["id"])
        if last_checkin:
            last_utc = last_checkin["check_in_at_utc"]
            # Ensure timezone-aware comparison
            if last_utc.tzinfo is None:
                last_utc = last_utc.replace(tzinfo=timezone.utc)
            delta = now_utc - last_utc
            if delta < timedelta(minutes=window_minutes):
                seconds_ago = int(delta.total_seconds())
                raise ValueError(
                    f"Duplicate check-in detected. {member['full_name']} checked in {seconds_ago} seconds ago. "
                    f"Please wait at least {window_minutes} minutes before checking in again."
                )

        # Determine membership status at check-in
        latest_m = await membership_repo.get_latest_membership_for_member(member["id"])
        status = "expired"
        is_expired_warning = True

        if latest_m:
            try:
                exp_d = datetime.strptime(latest_m["expiry_date"], "%Y-%m-%d").date()
                status, rem = calculate_member_status(exp_d, gym_today)
                is_expired_warning = (status == "expired")
            except Exception:
                pass

        # Check expired policy
        policy = settings.get("expired_checkin_policy", "warn")
        if is_expired_warning and policy == "block" and not data.override_policy:
            raise ValueError(
                f"Entry blocked: Membership for {member['full_name']} is EXPIRED. "
                "Gym policy prohibits expired check-ins. Coach can override with explicit permission."
            )

        # Record check-in
        doc = await attendance_repo.record_checkin({
            "member_id": member["id"],
            "member_code_snapshot": member["member_code"],
            "member_name_snapshot": member["full_name"],
            "check_in_local_date": gym_today,
            "check_in_local_time": gym_now.strftime("%H:%M:%S"),
            "membership_status_at_checkin": status,
            "is_expired_warning": is_expired_warning,
            "created_by": admin_id
        })

        return self._to_attendance_response(doc)

    async def get_today_attendance(self, page: int = 1, page_size: int = 20) -> PaginatedAttendanceResponse:
        settings = await settings_repo.get_settings()
        gym_today = get_gym_today(settings.get("timezone", "Asia/Kolkata"))
        docs, total = await attendance_repo.get_today_attendance(gym_today, page, page_size)
        items = [self._to_attendance_response(d) for d in docs]
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        return PaginatedAttendanceResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def get_member_attendance(self, member_id: str, page: int = 1, page_size: int = 20) -> PaginatedAttendanceResponse:
        docs, total = await attendance_repo.get_member_attendance(member_id, page, page_size)
        items = [self._to_attendance_response(d) for d in docs]
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
        return PaginatedAttendanceResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def _to_attendance_response(self, doc: Dict[str, Any]) -> AttendanceResponse:
        local_d = datetime.strptime(doc["check_in_local_date"], "%Y-%m-%d").date() if isinstance(doc.get("check_in_local_date"), str) else doc.get("check_in_local_date")
        return AttendanceResponse(
            id=doc["id"],
            member_id=doc["member_id"],
            member_code_snapshot=doc.get("member_code_snapshot", ""),
            member_name_snapshot=doc.get("member_name_snapshot", ""),
            check_in_at_utc=doc["check_in_at_utc"],
            check_in_local_date=local_d,
            check_in_local_time=doc.get("check_in_local_time", ""),
            membership_status_at_checkin=doc.get("membership_status_at_checkin", "paid"),
            is_expired_warning=doc.get("is_expired_warning", False),
            created_by=doc.get("created_by", "admin")
        )

attendance_service = AttendanceService()
