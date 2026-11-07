from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class MembershipResponse(BaseModel):
    id: str
    member_id: str
    plan_id: str
    plan_name_snapshot: str
    start_date: date
    expiry_date: date
    payment_id: Optional[str] = None
    status: str
    remaining_days: int
    record_origin: str = "regular"  # "regular", "legacy", "migration"
    created_at: datetime
    created_by: str

class RenewalRequest(BaseModel):
    plan_id: str
    payment_amount: float = Field(..., ge=0)
    payment_date: date
    payment_method: str = Field(..., pattern="^(Cash|UPI|Card|Bank Transfer|Other)$")
    custom_start_date: Optional[date] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None

class RenewalPreviewResponse(BaseModel):
    member_id: str
    member_code: str
    member_name: str
    current_expiry_date: Optional[date] = None
    calculated_start_date: date
    calculated_expiry_date: date
    plan_name: str
    amount: float
    is_extended_from_expiry: bool

class ExpiryMigrationRequest(BaseModel):
    new_expiry_date: date
    reason: str = Field(..., min_length=3, max_length=500, description="Audit reason for manual expiry migration")

