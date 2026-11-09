from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SettingsResponse(BaseModel):
    id: str
    gym_name: str
    trainer_name: Optional[str] = "Coach"
    coach_phone: Optional[str] = "9110687983"
    coach_pin: Optional[str] = "0608"
    logo_url: Optional[str] = None
    timezone: str
    currency: str
    country_calling_code: str
    member_code_prefix: str
    attendance_enabled: bool
    duplicate_checkin_window_minutes: int
    expired_checkin_policy: str  # "warn" or "block"
    date_format: str
    # GPS Geofence & Check-In Settings
    gym_latitude: Optional[float] = None
    gym_longitude: Optional[float] = None
    geofence_radius_meters: Optional[int] = 100
    geofence_enabled: Optional[bool] = True
    weekly_off_days: Optional[List[int]] = [6]  # 6 = Sunday in python date.weekday()
    gym_holidays: Optional[List[str]] = []
    updated_at: datetime

class SettingsUpdate(BaseModel):
    gym_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    trainer_name: Optional[str] = Field(default=None, max_length=100)
    coach_phone: Optional[str] = Field(default=None, max_length=20)
    coach_pin: Optional[str] = Field(default=None, min_length=4, max_length=8)
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    country_calling_code: Optional[str] = None
    member_code_prefix: Optional[str] = Field(default=None, min_length=1, max_length=10)
    attendance_enabled: Optional[bool] = None
    duplicate_checkin_window_minutes: Optional[int] = Field(default=None, ge=1, le=60)
    expired_checkin_policy: Optional[str] = Field(default=None, pattern="^(warn|block)$")
    date_format: Optional[str] = None
    # GPS Geofence & Check-In Updates
    gym_latitude: Optional[float] = None
    gym_longitude: Optional[float] = None
    geofence_radius_meters: Optional[int] = Field(default=None, ge=20, le=1000)
    geofence_enabled: Optional[bool] = None
    weekly_off_days: Optional[List[int]] = None
    gym_holidays: Optional[List[str]] = None

