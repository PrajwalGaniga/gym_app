from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class CheckInRequest(BaseModel):
    member_id: str
    override_policy: bool = False  # Set to True if coach overrides block policy

class AttendanceResponse(BaseModel):
    id: str
    member_id: str
    member_code_snapshot: str
    member_name_snapshot: str
    check_in_at_utc: datetime
    check_in_local_date: date
    check_in_local_time: str
    membership_status_at_checkin: str
    is_expired_warning: bool = False
    created_by: str

class PaginatedAttendanceResponse(BaseModel):
    items: List[AttendanceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

