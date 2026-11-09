from fastapi import APIRouter, Request, status
from app.schemas.portal import PortalCheckInRequest, PortalCheckInResponse
from app.services.portal_service import portal_service
from app.repositories.settings_repo import settings_repo

router = APIRouter(prefix="/portal", tags=["Member Portal"])

@router.get("/gym-info")
async def get_portal_gym_info():
    """Public basic gym identity for the check-in page header."""
    settings = await settings_repo.get_settings()
    return {
        "gym_name": settings.get("gym_name", "IronPulse Fitness"),
        "trainer_name": settings.get("trainer_name", "Coach"),
        "logo_url": settings.get("logo_url"),
        "geofence_enabled": settings.get("geofence_enabled", True) and settings.get("gym_latitude") is not None
    }

@router.post("/checkin", response_model=PortalCheckInResponse, status_code=status.HTTP_200_OK)
async def portal_check_in(req: PortalCheckInRequest, request: Request):
    """
    Public member self-checkin endpoint.
    Verifies member ID, last 2 digits of phone, GPS geofence, records attendance,
    and returns member streak, membership validity, and payment details.
    """
    client_ip = request.headers.get("X-Forwarded-For")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    return await portal_service.check_in_member(req, client_ip)

