from fastapi import APIRouter, Depends
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import dashboard_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(admin: dict = Depends(get_current_admin)):
    return await dashboard_service.get_dashboard_summary()

