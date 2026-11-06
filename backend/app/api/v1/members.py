from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import Optional, List
from app.schemas.member import (
    MemberCreate,
    LegacyMemberCreate,
    MemberUpdate,
    MemberResponse,
    PaginatedMembersResponse
)
from app.services.member_service import member_service
from app.services.image_service import image_service
from app.services.payment_service import payment_service
from app.services.attendance_service import attendance_service
from app.repositories.member_repo import member_repo
from app.api.deps import get_current_admin

router = APIRouter(prefix="/members", tags=["Members"])

@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_new_member(data: MemberCreate, admin: dict = Depends(get_current_admin)):
    try:
        return await member_service.create_new_member(data, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/legacy", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_legacy_member(data: LegacyMemberCreate, admin: dict = Depends(get_current_admin)):
    try:
        return await member_service.create_legacy_member(data, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("", response_model=PaginatedMembersResponse)
async def list_members(
    category: Optional[str] = Query(None, pattern="^(paid|expiring_soon|expired)$"),
    search: Optional[str] = Query(None),
    archived: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin)
):
    return await member_service.list_members(
        category=category,
        search_query=search,
        is_archived=archived,
        page=page,
        page_size=page_size
    )

@router.get("/search")
async def quick_search_members(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    admin: dict = Depends(get_current_admin)
):
    """Global search across Member ID, Phone Number (exact/partial), and Full Name."""
    return await member_repo.quick_search(q, limit)

@router.get("/{member_id}", response_model=MemberResponse)
async def get_member_detail(member_id: str, admin: dict = Depends(get_current_admin)):
    member = await member_service.get_member_detail(member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member

@router.put("/{member_id}", response_model=MemberResponse)
async def update_member_detail(
    member_id: str,
    data: MemberUpdate,
    admin: dict = Depends(get_current_admin)
):
    updates = data.model_dump(exclude_unset=True)
    if "joining_date" in updates and updates["joining_date"]:
        updates["joining_date"] = updates["joining_date"].strftime("%Y-%m-%d")
    
    updated = await member_repo.update_member(member_id, updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return await member_service.get_member_detail(member_id)

@router.post("/{member_id}/archive", response_model=MemberResponse)
async def archive_member(member_id: str, admin: dict = Depends(get_current_admin)):
    archived = await member_repo.archive_member(member_id)
    if not archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return await member_service.get_member_detail(member_id)

@router.post("/{member_id}/restore", response_model=MemberResponse)
async def restore_member(member_id: str, admin: dict = Depends(get_current_admin)):
    restored = await member_repo.restore_member(member_id)
    if not restored:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return await member_service.get_member_detail(member_id)

@router.post("/{member_id}/photo")
async def upload_member_photo(
    member_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    member = await member_repo.get_by_id(member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    file_bytes = await file.read()
    try:
        photo_info = await image_service.save_profile_photo(file_bytes, file.filename or "photo.jpg")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await member_repo.update_photo(member_id, photo_info)
    return photo_info

@router.delete("/{member_id}/photo")
async def remove_member_photo(member_id: str, admin: dict = Depends(get_current_admin)):
    member = await member_repo.get_by_id(member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    await member_repo.update_photo(member_id, None)
    return {"message": "Photo removed successfully"}

@router.get("/{member_id}/payments")
async def get_member_payments(
    member_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin)
):
    return await payment_service.list_payments(member_id=member_id, page=page, page_size=page_size)

@router.get("/{member_id}/attendance")
async def get_member_attendance(
    member_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin)
):
    return await attendance_service.get_member_attendance(member_id=member_id, page=page, page_size=page_size)
