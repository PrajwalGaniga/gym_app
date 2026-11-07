from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class PhotoObject(BaseModel):
    url: str
    storage_key: Optional[str] = None
    thumbnail_url: Optional[str] = None
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None

class MemberCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    member_code: Optional[str] = Field(default=None, max_length=50)
    phone: str = Field(..., min_length=7, max_length=20)
    gender: Optional[str] = Field(default="Male", pattern="^(Male|Female|Other)$")
    joining_date: date
    plan_id: str
    start_date: Optional[date] = None
    payment_date: Optional[date] = None
    amount_paid: float = Field(..., ge=0)
    registration_fee: Optional[float] = Field(default=100.0, ge=0)
    payment_method: str = Field(..., pattern="^(Cash|UPI|Card|Bank Transfer|Other)$")
    reference: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class LegacyMemberCreate(BaseModel):
    member_code: str = Field(..., min_length=1, max_length=50, description="Existing member ID preserved exactly")
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=7, max_length=20)
    gender: Optional[str] = Field(default=None)
    joining_date: Optional[date] = None
    joining_date_known: bool = True
    plan_id: Optional[str] = None
    current_start_date: Optional[date] = None
    current_expiry_date: Optional[date] = None
    payment_amount: Optional[float] = Field(default=None, ge=0)
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    migration_notes: Optional[str] = None
    photo_url: Optional[str] = None

    @field_validator("payment_method")
    def validate_method(cls, v):
        if v and v not in ("Cash", "UPI", "Card", "Bank Transfer", "Other"):
            raise ValueError("Invalid payment method")
        return v

class MemberUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, min_length=7, max_length=20)
    gender: Optional[str] = Field(default=None)
    joining_date: Optional[date] = None
    notes: Optional[str] = None

class MembershipSnapshot(BaseModel):
    id: str
    plan_name: str
    start_date: date
    expiry_date: date
    status: str  # paid, expiring_soon, expired
    remaining_days: int
    record_origin: str = "regular"

class MemberResponse(BaseModel):
    id: str
    member_code: str
    full_name: str
    phone: str
    normalized_phone: str
    gender: Optional[str] = None
    photo: Optional[PhotoObject] = None
    joining_date: Optional[date] = None
    joining_date_known: bool = True
    notes: Optional[str] = None
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    current_membership: Optional[MembershipSnapshot] = None
    status: str = "expired"  # dynamic status
    remaining_days: int = 0
    last_payment_date: Optional[date] = None
    total_months_completed: int = 0
    lifetime_revenue: float = 0.0

class PaginatedMembersResponse(BaseModel):
    items: List[MemberResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

