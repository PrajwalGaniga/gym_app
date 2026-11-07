from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class LegacyImportRow(BaseModel):
    member_code: str = Field(..., min_length=1, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=7, max_length=20)
    joining_date: Optional[date] = None
    expiry_date: Optional[date] = None
    payment_amount: Optional[float] = Field(default=None, ge=0)
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class LegacyImportPreviewRow(BaseModel):
    row_number: int
    member_code: str
    full_name: str
    phone: str
    joining_date: Optional[date] = None
    expiry_date: Optional[date] = None
    payment_amount: Optional[float] = None
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    is_valid: bool = True
    errors: List[str] = []

class LegacyImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_codes: List[str]
    rows: List[LegacyImportPreviewRow]

class LegacyImportCommitRequest(BaseModel):
    rows: List[LegacyImportRow]

class LegacyImportResultResponse(BaseModel):
    imported_count: int
    skipped_count: int
    errors: List[str]

