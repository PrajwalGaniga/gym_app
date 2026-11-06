from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date

class PaymentMethodSummary(BaseModel):
    method: str
    amount: float
    count: int

class CollectionsReportResponse(BaseModel):
    start_date: date
    end_date: date
    gross_collected: float
    voided_amount: float
    net_collected: float
    total_transactions: int
    by_payment_method: List[PaymentMethodSummary]
    daily_totals: List[Dict[str, Any]]

class MembersReportResponse(BaseModel):
    start_date: date
    end_date: date
    total_registered: int
    new_registrations: int
    renewals_count: int
    current_paid: int
    current_expiring_soon: int
    current_expired: int

class AttendanceReportResponse(BaseModel):
    start_date: date
    end_date: date
    total_checkins: int
    unique_members: int
    expired_checkins_count: int
    daily_breakdown: List[Dict[str, Any]]
