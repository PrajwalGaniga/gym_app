from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class PortalLoginRequest(BaseModel):
    member_code: str = Field(..., min_length=1, max_length=30, description="Gym Member ID / Code")
    phone_last_2: str = Field(..., min_length=2, max_length=2, description="Last 2 digits of registered phone number")

class PortalCheckInRequest(BaseModel):
    member_code: str = Field(..., min_length=1, max_length=30, description="Gym Member ID / Code")
    phone_last_2: str = Field(..., min_length=2, max_length=2, description="Last 2 digits of registered phone number")
    latitude: Optional[float] = Field(default=None, description="Current GPS latitude")
    longitude: Optional[float] = Field(default=None, description="Current GPS longitude")

class StreakDetails(BaseModel):
    current_streak: int
    best_streak: int
    sunday_exempt_applied: bool
    grace_period_applied: bool = False
    grace_warning_message: Optional[str] = None
    hours_since_last_checkin: Optional[float] = None

class MembershipDetails(BaseModel):
    plan_name: str
    status: str
    days_remaining: int
    start_date: Optional[str] = None
    expiry_date: Optional[str] = None
    paid_date: Optional[str] = None

class LastPaymentDetails(BaseModel):
    amount: float
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None

class PortalCheckInResponse(BaseModel):
    member_id: str
    full_name: str
    member_code: str
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    already_checked_in_today: bool
    check_in_time: str
    check_in_date: str
    streak: StreakDetails
    membership: MembershipDetails
    last_payment: Optional[LastPaymentDetails] = None
    attendance_dates: List[str] = []
    weekly_off_days: List[int] = [6]
    gym_holidays: List[str] = []

