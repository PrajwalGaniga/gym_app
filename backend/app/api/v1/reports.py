from fastapi import APIRouter, Depends, Query, Response
from typing import Optional
from datetime import date, timedelta
from app.schemas.reports import (
    CollectionsReportResponse,
    MembersReportResponse,
    AttendanceReportResponse,
    WalletReportResponse
)
from app.services.report_service import report_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/wallet", response_model=WalletReportResponse)
async def get_wallet_report(
    period: str = Query("30d", description="Filter range: 7d, 15d, 30d, 6m, 1y, all"),
    admin: dict = Depends(get_current_admin)
):
    return await report_service.get_wallet_report(period)

@router.get("/collections", response_model=CollectionsReportResponse)
async def get_collections_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    today = date.today()
    s_date = start_date or (today - timedelta(days=30))
    e_date = end_date or today
    return await report_service.get_collections_report(s_date, e_date)

@router.get("/members", response_model=MembersReportResponse)
async def get_members_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    today = date.today()
    s_date = start_date or (today - timedelta(days=30))
    e_date = end_date or today
    return await report_service.get_members_report(s_date, e_date)

@router.get("/attendance", response_model=AttendanceReportResponse)
async def get_attendance_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    today = date.today()
    s_date = start_date or (today - timedelta(days=30))
    e_date = end_date or today
    return await report_service.get_attendance_report(s_date, e_date)

@router.get("/attendance/export")
async def export_attendance_csv(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    today = date.today()
    s_date = start_date or (today - timedelta(days=30))
    e_date = end_date or today
    csv_data = await report_service.export_attendance_csv(s_date, e_date)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"}
    )

