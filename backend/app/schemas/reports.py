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

class WalletTransactionItem(BaseModel):
    id: str
    member_id: str
    member_code: str
    member_name: str
    amount: float
    payment_date: str
    payment_method: str
    status: str
    record_origin: str = "regular"
    reference: Optional[str] = None
    notes: Optional[str] = None

class WalletReportResponse(BaseModel):
    period: str  # "7d", "15d", "30d", "6m", "1y", "all"
    start_date: Optional[date] = None
    end_date: date
    total_revenue: float
    total_transactions: int
    average_ticket: float
    by_payment_method: List[PaymentMethodSummary]
    daily_totals: List[Dict[str, Any]]
    recent_transactions: List[WalletTransactionItem]

