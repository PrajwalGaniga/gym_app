from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.repositories.settings_repo import settings_repo
from app.api.deps import get_current_admin

router = APIRouter(prefix="/settings", tags=["Gym Settings"])

@router.get("", response_model=SettingsResponse)
async def get_settings(admin: dict = Depends(get_current_admin)):
    return await settings_repo.get_settings()

@router.put("", response_model=SettingsResponse)
async def update_settings(data: SettingsUpdate, admin: dict = Depends(get_current_admin)):
    updates = data.model_dump(exclude_unset=True)
    return await settings_repo.update_settings(updates)

