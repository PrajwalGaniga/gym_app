from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from datetime import date
from app.schemas.membership import (
    RenewalRequest,
    RenewalPreviewResponse,
    ExpiryMigrationRequest,
    MembershipResponse
)
from app.services.membership_service import membership_service
from app.repositories.membership_repo import membership_repo
from app.api.deps import get_current_admin

router = APIRouter(prefix="/memberships", tags=["Memberships & Renewals"])

@router.get("/preview-renewal", response_model=RenewalPreviewResponse)
async def preview_renewal(
    member_id: str = Query(...),
    plan_id: str = Query(...),
    payment_date: Optional[date] = Query(None),
    custom_start_date: Optional[date] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    try:
        return await membership_service.preview_renewal(
            member_id=member_id,
            plan_id=plan_id,
            payment_date=payment_date,
            custom_start_date=custom_start_date
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{member_id}/renew", response_model=MembershipResponse)
async def renew_membership(
    member_id: str,
    data: RenewalRequest,
    admin: dict = Depends(get_current_admin)
):
    try:
        return await membership_service.renew_membership(member_id, data, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{member_id}/migrate-expiry", response_model=MembershipResponse)
async def migrate_expiry_date(
    member_id: str,
    data: ExpiryMigrationRequest,
    admin: dict = Depends(get_current_admin)
):
    try:
        return await membership_service.migrate_expiry_date(member_id, data, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{member_id}/history")
async def get_membership_history(member_id: str, admin: dict = Depends(get_current_admin)):
    return await membership_repo.get_all_for_member(member_id)
