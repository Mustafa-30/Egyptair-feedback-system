"""
Report API Routes - Full Report Generation with PDF/Excel support
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import math
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.report import Report, ReportStatus
from app.models.feedback import Feedback
from app.schemas.report import (
    ReportResponse,
    ReportListResponse,
    ReportSummary,
)
from app.services.report_service import ReportService, AnalyticsSettings

router = APIRouter()


# ============================================
# Preview & Statistics Endpoints
# ============================================

@router.get("/preview")
async def get_report_preview(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sentiments: Optional[str] = Query(None, description="Comma-separated: positive,negative,neutral"),
    languages: Optional[str] = Query(None, description="Comma-separated: arabic,english"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get preview statistics for report before generating
    """
    service = ReportService(db)
    
    # Parse dates
    parsed_date_from = None
    parsed_date_to = None
    
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except:
            try:
                parsed_date_from = datetime.strptime(date_from, '%Y-%m-%d')
            except:
                pass
    
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            try:
                parsed_date_to = datetime.strptime(date_to, '%Y-%m-%d')
            except:
                pass
    
    # Parse filters
    sentiment_list = sentiments.split(',') if sentiments else None
    language_list = languages.split(',') if languages else None
    
    stats = service.get_preview_stats(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        sentiments=sentiment_list,
        languages=language_list
    )
    
    return stats


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
        },
        "recent_reports": [
            {
                "report_id": r.report_id,
                "title": r.title,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "status": r.status,
                "download_url": f"/api/v1/reports/{r.report_id}/download"
            }
            for r in recent
        ]
    }


# ============================================
# Report Generation Endpoints
# ============================================

@router.get("/test-generate")
async def test_generate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test report generation without full generation"""
    import traceback
    try:
        service = ReportService(db)
        feedbacks, stats = service.get_filtered_feedback()
        return {
            "status": "ok",
            "feedbacks": len(feedbacks),
            "stats": stats,
            "arabic_font": service.arabic_font
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.post("/generate")
async def generate_report(
    report_type: str = Query("summary", description="summary or detailed"),
    title: str = Query("Feedback Analysis Report"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sentiments: Optional[str] = Query(None, description="Comma-separated: positive,negative,neutral"),
    languages: Optional[str] = Query(None, description="Comma-separated: arabic,english"),
    include_executive_summary: bool = Query(True),
    include_sentiment_chart: bool = Query(True),
    include_trend_chart: bool = Query(True),
    include_stats_table: bool = Query(True),
    include_negative_samples: bool = Query(True),
    include_nps_score: bool = Query(True),
    include_top_routes: bool = Query(True),
    include_csat_score: bool = Query(True),
    include_monthly_nps_trend: bool = Query(True),
    include_complaint_categories: bool = Query(True),
    include_logo: bool = Query(True),
    orientation: str = Query("portrait", description="portrait or landscape"),
    nps_target: int = Query(50, description="NPS target score"),
    csat_threshold: int = Query(80, description="CSAT threshold percentage"),
    min_reviews_per_route: int = Query(10, description="Minimum reviews for route ranking"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new report (PDF or Excel)
    """
    import traceback
    import logging
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)
    logger.info(f"Starting report generation: type={report_type}, title={title}")
    
    try:
        logger.info("Creating ReportService...")
        # Create analytics settings from query parameters
        analytics_settings = AnalyticsSettings(
            nps_target=nps_target,
            csat_threshold=csat_threshold,
            min_reviews_per_route=min_reviews_per_route
        )
        service = ReportService(db, analytics_settings=analytics_settings)
        logger.info(f"ReportService created with settings: NPS target={nps_target}, CSAT threshold={csat_threshold}, Min reviews={min_reviews_per_route}")
        
        # Parse dates
        parsed_date_from = None
        parsed_date_to = None
        
        if date_from:
            try:
                parsed_date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except:
                try:
                    parsed_date_from = datetime.strptime(date_from, '%Y-%m-%d')
                except:
                    pass
        
        if date_to:
            try:
                parsed_date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except:
                try:
                    parsed_date_to = datetime.strptime(date_to, '%Y-%m-%d')
                except:
                    pass
        
        # Parse filters
        sentiment_list = sentiments.split(',') if sentiments else None
        language_list = languages.split(',') if languages else None
        
        logger.info("Getting filtered feedback...")
        # Get filtered feedback
        feedbacks, stats = service.get_filtered_feedback(
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            sentiments=sentiment_list,
            languages=language_list
        )
        logger.info(f"Got {len(feedbacks)} feedbacks")
        
        if len(feedbacks) == 0:
            raise HTTPException(status_code=400, detail="No feedback found matching the selected filters")
        
        # Generate report based on type
        logger.info(f"Generating {report_type} report...")
        if report_type == 'detailed':
            # Generate Excel report
            filepath, file_size = service.generate_excel_report(
                title=title,
                feedbacks=feedbacks,
                stats=stats,
                date_from=parsed_date_from,
                date_to=parsed_date_to
            )
            file_format = 'excel'
        else:
            # Generate PDF report
            sections = {
                'executiveSummary': include_executive_summary,
                'sentimentChart': include_sentiment_chart,
                'trendChart': include_trend_chart,
                'statsTable': include_stats_table,
                'negativeSamples': include_negative_samples,
                'npsScore': include_nps_score,
                'topRoutes': include_top_routes,
                'csatScore': include_csat_score,
                'monthlyNpsTrend': include_monthly_nps_trend,
                'complaintCategories': include_complaint_categories
            }
            logger.info(f"Sections: {sections}")
            
            filepath, file_size = service.generate_pdf_report(
                title=title,
                feedbacks=feedbacks,
                stats=stats,
                date_from=parsed_date_from,
                date_to=parsed_date_to,
                sections=sections,
                include_logo=include_logo,
                orientation=orientation
            )
            file_format = 'pdf'
        
        # Save report record to database
        report = Report(
            title=title,
            report_type=report_type,
            date_range_start=parsed_date_from,
            date_range_end=parsed_date_to,
            filters={
                'sentiments': sentiment_list,
                'languages': language_list
            },
            file_format=file_format,
            file_path=filepath,
            file_size=file_size,
            total_records=stats['total'],
            positive_count=stats['positive'],
            negative_count=stats['negative'],
            neutral_count=stats['neutral'],
            status=ReportStatus.COMPLETED.value,
            generated_at=datetime.utcnow(),
            user_id=current_user.id
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        return {
            'report_id': report.report_id,
            'title': report.title,
            'report_type': report_type,
            'file_format': file_format,
            'file_size': file_size,
            'file_size_mb': round(file_size / (1024 * 1024), 2),
            'total_records': stats['total'],
            'positive_count': stats['positive'],
            'negative_count': stats['negative'],
            'neutral_count': stats['neutral'],
            'generated_at': report.generated_at.isoformat() if report.generated_at else None,
            'download_url': f'/api/v1/reports/{report.report_id}/download',
            'status': 'completed'
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.get("/{report_id}/download")
async def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a generated report file
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if current_user.role not in ["admin", "supervisor"] and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to download this report")
    
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    # Determine content type
    if report.file_format == 'pdf':
        media_type = 'application/pdf'
        filename = f"{report.title.replace(' ', '_')}.pdf"
    elif report.file_format in ['excel', 'xlsx']:
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = f"{report.title.replace(' ', '_')}.xlsx"
    else:
        media_type = 'application/octet-stream'
        filename = os.path.basename(report.file_path)
    
    return FileResponse(
        path=report.file_path,
        media_type=media_type,
        filename=filename
    )


# ============================================
# Report Management Endpoints
# ============================================

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
    
    # Delete the file if it exists
    if report.file_path and os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except:
            pass
    
    db.delete(report)
    db.commit()
    
    return {"message": "Report deleted successfully", "report_id": report_id}

