from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.members import router as members_router
from app.api.v1.memberships import router as memberships_router
from app.api.v1.payments import router as payments_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.plans import router as plans_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.reports import router as reports_router
from app.api.v1.settings import router as settings_router
from app.api.v1.imports import router as imports_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(members_router)
api_router.include_router(memberships_router)
api_router.include_router(payments_router)
api_router.include_router(attendance_router)
api_router.include_router(plans_router)
api_router.include_router(reports_router)
api_router.include_router(settings_router)
api_router.include_router(imports_router)
