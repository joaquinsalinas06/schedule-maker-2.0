import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from sqlalchemy.orm import Session

from app.models import User
from app.models.admin_audit_log import AdminAuditLog
from app.utils.dependencies import get_current_admin_user, get_import_service, get_db
from app.services.import_service import ImportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/status")
def admin_status(current_user: User = Depends(get_current_admin_user)):
    """Verify admin access. Returns admin user info."""
    return {
        "is_admin": True,
        "user_id": current_user.id,
        "email": current_user.email,
    }


@router.post("/import/analyze")
async def analyze_csv_import(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Query(..., pattern="^(reset|update)$", description="Import mode: 'reset' or 'update'"),
    university_id: int = Query(1, description="University ID to import for"),
    current_user: User = Depends(get_current_admin_user),
    import_service: ImportService = Depends(get_import_service),
):
    """
    Analyze the uploaded CSV/Excel file.
    Returns a preview of what the import would do WITHOUT modifying the database.
    """
    file_bytes = await file.read()
    validation_errors = import_service.validate_file(
        filename=file.filename,
        content_type=file.content_type,
        file_size=len(file_bytes),
    )

    if validation_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": validation_errors}
        )

    try:
        analysis = import_service.analyze_file(
            file_bytes=file_bytes,
            filename=file.filename,
            mode=mode,
            university_id=university_id,
        )

        logger.info(f"Admin {current_user.email} analyzed CSV import (mode={mode})")

        return {
            "success": True,
            "analysis": analysis,
        }

    except Exception as e:
        logger.error(f"CSV analysis failed for admin {current_user.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error al analizar archivo: {str(e)}"
        )


@router.post("/import/execute")
async def execute_csv_import(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Query(..., pattern="^(reset|update)$", description="Import mode: 'reset' or 'update'"),
    university_id: int = Query(1, description="University ID to import for"),
    current_user: User = Depends(get_current_admin_user),
    import_service: ImportService = Depends(get_import_service),
    db: Session = Depends(get_db),
):
    """
    Execute the import after admin has reviewed the analysis.
    This modifies the database.
    """
    file_bytes = await file.read()
    validation_errors = import_service.validate_file(
        filename=file.filename,
        content_type=file.content_type,
        file_size=len(file_bytes),
    )

    if validation_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": validation_errors}
        )

    try:
        stats = import_service.execute_import(
            file_bytes=file_bytes,
            filename=file.filename,
            mode=mode,
            university_id=university_id,
        )

        # Audit log
        audit = AdminAuditLog(
            user_id=current_user.id,
            action=f"csv_import_{mode}",
            details=stats,
            ip_address=request.client.host if request.client else None,
            file_name=file.filename,
            status="success",
        )
        db.add(audit)
        db.commit()

        logger.info(f"Admin {current_user.email} executed CSV import (mode={mode}): {stats}")

        return {
            "success": True,
            "message": f"Importacion completada exitosamente en modo {mode}",
            "stats": stats,
        }

    except Exception as e:
        logger.error(f"CSV import failed for admin {current_user.email}: {str(e)}")

        # Log failure
        try:
            audit = AdminAuditLog(
                user_id=current_user.id,
                action=f"csv_import_{mode}",
                details={"error": str(e)},
                ip_address=request.client.host if request.client else None,
                file_name=file.filename,
                status="failed",
            )
            db.add(audit)
            db.commit()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Importacion fallida: {str(e)}"
        )


@router.get("/import/history")
def get_import_history(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """Get history of admin import operations."""
    logs = db.query(AdminAuditLog).order_by(
        AdminAuditLog.executed_at.desc()
    ).limit(limit).all()

    return [{
        "id": log.id,
        "action": log.action,
        "file_name": log.file_name,
        "status": log.status,
        "details": log.details,
        "executed_at": log.executed_at.isoformat() if log.executed_at else None,
    } for log in logs]
