from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from app.schemas.legacy_import import (
    LegacyImportPreviewResponse,
    LegacyImportCommitRequest,
    LegacyImportResultResponse
)
from app.services.legacy_import_service import legacy_import_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/imports", tags=["Legacy Imports"])

@router.get("/template")
async def get_csv_template(admin: dict = Depends(get_current_admin)):
    csv_str = legacy_import_service.get_template_csv()
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=legacy_members_template.csv"}
    )

@router.post("/preview", response_model=LegacyImportPreviewResponse)
async def preview_csv_import(
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    contents = await file.read()
    try:
        csv_text = contents.decode("utf-8-sig")  # Handles UTF-8 BOM if saved from Excel
    except UnicodeDecodeError:
        try:
            csv_text = contents.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to decode CSV file.")

    return await legacy_import_service.preview_csv(csv_text)

@router.post("/commit", response_model=LegacyImportResultResponse)
async def commit_csv_import(
    data: LegacyImportCommitRequest,
    admin: dict = Depends(get_current_admin)
):
    if not data.rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No rows provided for import.")
    return await legacy_import_service.commit_import(data.rows, admin["id"])
