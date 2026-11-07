from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.attendance import CheckInRequest, AttendanceResponse, PaginatedAttendanceResponse
from app.services.attendance_service import attendance_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/check-in", response_model=AttendanceResponse)
async def check_in_member(data: CheckInRequest, admin: dict = Depends(get_current_admin)):
    try:
        return await attendance_service.record_checkin(data, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/today", response_model=PaginatedAttendanceResponse)
async def get_today_attendance(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin)
):
    return await attendance_service.get_today_attendance(page=page, page_size=page_size)

