from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PlanBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    duration_unit: str = Field(default="month", pattern="^(month|day)$")
    duration_value: int = Field(..., gt=0)
    price: float = Field(..., ge=0)
    currency: str = Field(default="INR")
    description: Optional[str] = None
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_unit: Optional[str] = Field(default=None, pattern="^(month|day)$")
    duration_value: Optional[int] = Field(default=None, gt=0)
    price: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class PlanResponse(PlanBase):
    id: str
    created_at: datetime
    updated_at: datetime

