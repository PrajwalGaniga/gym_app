from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import Optional
from datetime import date
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaginatedPaymentsResponse,
    VoidPaymentRequest
)
from app.services.payment_service import payment_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(data: PaymentCreate, admin: dict = Depends(get_current_admin)):
    try:
        return await payment_service.create_payment(data, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("", response_model=PaginatedPaymentsResponse)
async def list_payments(
    member_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern="^(completed|voided)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    payment_method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin)
):
    return await payment_service.list_payments(
        member_id=member_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        payment_method=payment_method,
        search_query=search,
        page=page,
        page_size=page_size
    )

@router.get("/export")
async def export_payments_csv(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    csv_data = await payment_service.export_payments_csv(
        start_date=start_date,
        end_date=end_date,
        status=status
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=payments_export.csv"}
    )

@router.post("/{payment_id}/void", response_model=PaymentResponse)
async def void_payment(
    payment_id: str,
    data: VoidPaymentRequest,
    admin: dict = Depends(get_current_admin)
):
    try:
        return await payment_service.void_payment(payment_id, data.reason, admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

