from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SettingsResponse(BaseModel):
    id: str
    gym_name: str
    logo_url: Optional[str] = None
    timezone: str
    currency: str
    country_calling_code: str
    member_code_prefix: str
    attendance_enabled: bool
    duplicate_checkin_window_minutes: int
    expired_checkin_policy: str  # "warn" or "block"
    date_format: str
    updated_at: datetime

class SettingsUpdate(BaseModel):
    gym_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    country_calling_code: Optional[str] = None
    member_code_prefix: Optional[str] = Field(default=None, min_length=1, max_length=10)
    attendance_enabled: Optional[bool] = None
    duplicate_checkin_window_minutes: Optional[int] = Field(default=None, ge=1, le=60)
    expired_checkin_policy: Optional[str] = Field(default=None, pattern="^(warn|block)$")
    date_format: Optional[str] = None

