"""
Report API Routes - Manages reports
Matches the Report entity operations from diagrams
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import math
import json
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.report import Report, ReportStatus, ReportType as ReportTypeModel
from app.models.feedback import Feedback
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportListResponse,
    ReportGenerateRequest,
    ReportSummary,
    ReportType
)

router = APIRouter()


@router.get("/", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    report_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all reports with pagination
    """
    query = db.query(Report)
    
    # Filter by user if not admin/supervisor
    if current_user.role not in ["admin", "supervisor"]:
        query = query.filter(Report.user_id == current_user.id)
    
    if report_type:
        query = query.filter(Report.report_type == report_type)
    
    if status:
        query = query.filter(Report.status == status)
    
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    reports = query.order_by(Report.created_at.desc())\
                   .offset((page - 1) * page_size)\
                   .limit(page_size)\
                   .all()
    
    return ReportListResponse(
        items=[ReportResponse.model_validate(r) for r in reports],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific report by ID
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if current_user.role not in ["admin", "supervisor"] and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    
    return ReportResponse.model_validate(report)


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new report
    Implements + generate(records: List<FeedbackRecord>) : void from class diagram
    """
    # Build query for feedback data
    query = db.query(Feedback)
    
    # Apply date range filters
    if request.date_range_start:
        query = query.filter(Feedback.created_at >= request.date_range_start)
    if request.date_range_end:
        query = query.filter(Feedback.created_at <= request.date_range_end)
    
    # Apply additional filters
    if request.filters:
        if request.filters.get("sentiment"):
            query = query.filter(Feedback.sentiment == request.filters["sentiment"])
        if request.filters.get("language"):
            query = query.filter(Feedback.language == request.filters["language"])
    
    # Get feedback data
    feedbacks = query.all()
    
    # Calculate statistics
    total_records = len(feedbacks)
    positive_count = sum(1 for f in feedbacks if f.sentiment == "positive")
    negative_count = sum(1 for f in feedbacks if f.sentiment == "negative")
    neutral_count = sum(1 for f in feedbacks if f.sentiment == "neutral")
    
    # Create report
    report = Report(
        title=request.title or f"{request.report_type.value.title()} Report - {datetime.now().strftime('%Y-%m-%d')}",
        report_type=request.report_type.value,
        date_range_start=request.date_range_start,
        date_range_end=request.date_range_end,
        filters=request.filters,
        file_format=request.export_format.value,
        total_records=total_records,
        positive_count=positive_count,
        negative_count=negative_count,
        neutral_count=neutral_count,
        status=ReportStatus.COMPLETED.value,
        generated_at=datetime.utcnow(),
        user_id=current_user.id
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return ReportResponse.model_validate(report)


@router.get("/{report_id}/summary", response_model=ReportSummary)
async def get_report_summary(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed summary for a report
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    total = report.total_records or 1
    
    return ReportSummary(
        total_records=report.total_records,
        positive_count=report.positive_count,
        positive_percentage=round((report.positive_count / total * 100), 1) if total > 0 else 0,
        negative_count=report.negative_count,
        negative_percentage=round((report.negative_count / total * 100), 1) if total > 0 else 0,
        neutral_count=report.neutral_count,
        neutral_percentage=round((report.neutral_count / total * 100), 1) if total > 0 else 0,
        date_range={
            "start": report.date_range_start.isoformat() if report.date_range_start else None,
            "end": report.date_range_end.isoformat() if report.date_range_end else None
        } if report.date_range_start or report.date_range_end else None
    )


@router.post("/{report_id}/export")
async def export_report(
    report_id: int,
    format: str = Query("pdf", regex="^(pdf|excel|csv|json)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export a report to file
    Implements + export() : file from class diagram
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report format
    report.file_format = format
    db.commit()
    
    # In a real implementation, this would generate the actual file
    # For now, return export info
    return {
        "report_id": report_id,
        "title": report.title,
        "format": format,
        "status": "ready",
        "download_url": f"/api/v1/reports/{report_id}/download?format={format}",
        "message": f"Report ready for download in {format.upper()} format"
    }


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a report
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if current_user.role not in ["admin", "supervisor"] and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
    
    db.delete(report)
    db.commit()
    
    return {"message": "Report deleted successfully", "report_id": report_id}


@router.get("/stats/overview")
async def get_reports_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overview statistics for reports
    """
    query = db.query(Report)
    
    if current_user.role not in ["admin", "supervisor"]:
        query = query.filter(Report.user_id == current_user.id)
    
    total_reports = query.count()
    
    # Count by type
    type_counts = db.query(
        Report.report_type,
        func.count(Report.report_id)
    ).group_by(Report.report_type).all()
    
    type_dict = {t[0]: t[1] for t in type_counts}
    
    # Recent reports
    recent = query.order_by(Report.created_at.desc()).limit(5).all()
    
    return {
        "total_reports": total_reports,
        "by_type": {
            "summary": type_dict.get("summary", 0),
            "detailed": type_dict.get("detailed", 0),
            "sentiment_analysis": type_dict.get("sentiment_analysis", 0),
            "trend_analysis": type_dict.get("trend_analysis", 0)
        },
        "recent_reports": [
            {
                "report_id": r.report_id,
                "title": r.title,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "status": r.status
            }
            for r in recent
        ]
    }
