"""
FeedbackFile API Routes - Manages uploaded files
Matches the FeedbackFile entity operations from diagrams
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import math

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.feedback_file import FeedbackFile, FileStatus
from app.models.feedback import Feedback
from app.schemas.feedback_file import (
    FeedbackFileCreate,
    FeedbackFileUpdate,
    FeedbackFileResponse,
    FeedbackFileListResponse,
    FeedbackFileSummary
)

router = APIRouter()


@router.get("/", response_model=FeedbackFileListResponse)
async def list_feedback_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all uploaded feedback files with pagination
    """
    query = db.query(FeedbackFile)
    
    # Filter by user if not admin/supervisor
    if current_user.role not in ["admin", "supervisor"]:
        query = query.filter(FeedbackFile.user_id == current_user.id)
    
    # Filter by status
    if status:
        query = query.filter(FeedbackFile.status == status)
    
    # Get total count
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Paginate
    files = query.order_by(FeedbackFile.upload_date.desc())\
                 .offset((page - 1) * page_size)\
                 .limit(page_size)\
                 .all()
    
    return FeedbackFileListResponse(
        items=[FeedbackFileResponse.model_validate(f) for f in files],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{file_id}", response_model=FeedbackFileResponse)
async def get_feedback_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific feedback file by ID
    """
    file = db.query(FeedbackFile).filter(FeedbackFile.file_id == file_id).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permission
    if current_user.role not in ["admin", "supervisor"] and file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this file")
    
    return FeedbackFileResponse.model_validate(file)


@router.get("/{file_id}/summary", response_model=FeedbackFileSummary)
async def get_file_summary(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get processing summary for a feedback file
    """
    file = db.query(FeedbackFile).filter(FeedbackFile.file_id == file_id).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    success_rate = (file.success_count / file.total_rows * 100) if file.total_rows > 0 else 0
    
    return FeedbackFileSummary(
        file_id=file.file_id,
        file_name=file.file_name,
        status=file.status,
        total_rows=file.total_rows,
        processed_rows=file.processed_rows,
        success_count=file.success_count,
        error_count=file.error_count,
        success_rate=round(success_rate, 2)
    )


@router.get("/{file_id}/records")
async def get_file_records(
    file_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sentiment: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback records from a specific file
    """
    file = db.query(FeedbackFile).filter(FeedbackFile.file_id == file_id).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    query = db.query(Feedback).filter(Feedback.file_id == file_id)
    
    if sentiment:
        query = query.filter(Feedback.sentiment == sentiment)
    
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    records = query.order_by(Feedback.created_at.desc())\
                   .offset((page - 1) * page_size)\
                   .limit(page_size)\
                   .all()
    
    return {
        "file_id": file_id,
        "file_name": file.file_name,
        "items": [
            {
                "id": r.id,
                "text": r.text,
                "sentiment": r.sentiment,
                "confidence": r.sentiment_confidence,
                "language": r.language,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in records
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.delete("/{file_id}")
async def delete_feedback_file(
    file_id: int,
    delete_records: bool = Query(False, description="Also delete associated feedback records"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a feedback file and optionally its records
    """
    file = db.query(FeedbackFile).filter(FeedbackFile.file_id == file_id).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permission
    if current_user.role not in ["admin", "supervisor"] and file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    # Delete associated records if requested
    records_deleted = 0
    if delete_records:
        records_deleted = db.query(Feedback).filter(Feedback.file_id == file_id).delete()
    else:
        # Just unlink records from file
        db.query(Feedback).filter(Feedback.file_id == file_id).update({"file_id": None})
    
    # Delete file record
    db.delete(file)
    db.commit()
    
    return {
        "message": "File deleted successfully",
        "file_id": file_id,
        "records_deleted": records_deleted
    }


@router.get("/stats/overview")
async def get_files_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overview statistics for all uploaded files
    """
    query = db.query(FeedbackFile)
    
    if current_user.role not in ["admin", "supervisor"]:
        query = query.filter(FeedbackFile.user_id == current_user.id)
    
    total_files = query.count()
    
    # Count by status
    status_counts = db.query(
        FeedbackFile.status,
        func.count(FeedbackFile.file_id)
    ).group_by(FeedbackFile.status).all()
    
    status_dict = {s[0]: s[1] for s in status_counts}
    
    # Total records from all files
    total_records = query.with_entities(func.sum(FeedbackFile.total_rows)).scalar() or 0
    total_processed = query.with_entities(func.sum(FeedbackFile.processed_rows)).scalar() or 0
    
    return {
        "total_files": total_files,
        "total_records": total_records,
        "total_processed": total_processed,
        "by_status": {
            "pending": status_dict.get("pending", 0),
            "processing": status_dict.get("processing", 0),
            "completed": status_dict.get("completed", 0),
            "failed": status_dict.get("failed", 0)
        }
    }
