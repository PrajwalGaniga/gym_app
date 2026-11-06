from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse
from app.repositories.plan_repo import plan_repo
from app.api.deps import get_current_admin

router = APIRouter(prefix="/plans", tags=["Membership Plans"])

@router.get("", response_model=List[PlanResponse])
async def list_plans(admin: dict = Depends(get_current_admin)):
    await plan_repo.seed_default_plans()
    return await plan_repo.list_plans(active_only=False)

@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(data: PlanCreate, admin: dict = Depends(get_current_admin)):
    doc = await plan_repo.create_plan(data.model_dump())
    return doc

@router.patch("/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: str, data: PlanUpdate, admin: dict = Depends(get_current_admin)):
    updates = data.model_dump(exclude_unset=True)
    updated = await plan_repo.update_plan(plan_id, updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return updated
