from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from app.schemas.payment import PaymentResponse

class UpcomingRenewalItem(BaseModel):
    member_id: str
    member_code: str
    full_name: str
    phone: str
    plan_name: str
    expiry_date: date
    remaining_days: int
    status: str
    photo_url: Optional[str] = None

class ExpiredCheckinItem(BaseModel):
    attendance_id: str
    member_id: str
    member_code: str
    full_name: str
    check_in_time: str
    expiry_date: Optional[date] = None
    days_expired: int

class MonthlyRevenuePoint(BaseModel):
    month: str  # e.g. "2026-03"
    label: str  # e.g. "Mar 2026"
    amount: float

class DashboardSummaryResponse(BaseModel):
    total_members: int
    paid_members: int
    expiring_soon_members: int
    expired_members: int
    new_registrations_this_month: int
    collections_this_month: float
    today_attendance_count: int
    upcoming_renewals: List[UpcomingRenewalItem]
    recent_payments: List[PaymentResponse]
    expired_checkins_today: List[ExpiredCheckinItem]
    revenue_chart: List[MonthlyRevenuePoint]
