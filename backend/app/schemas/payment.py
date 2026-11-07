from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class PaymentCreate(BaseModel):
    member_id: str
    membership_id: Optional[str] = None
    amount: float = Field(..., ge=0)
    payment_date: date
    payment_method: str = Field(..., pattern="^(Cash|UPI|Card|Bank Transfer|Other)$")
    reference: Optional[str] = None
    notes: Optional[str] = None

class VoidPaymentRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory reason for voiding a payment")

class PaymentResponse(BaseModel):
    id: str
    member_id: str
    member_code_snapshot: str
    member_name_snapshot: str
    membership_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    payment_date: date
    payment_method: str
    reference: Optional[str] = None
    status: str = "completed"  # "completed" or "voided"
    record_origin: str = "regular"  # "regular" or "legacy"
    void_reason: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

class PaginatedPaymentsResponse(BaseModel):
    items: List[PaymentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    total_amount_collected: float

