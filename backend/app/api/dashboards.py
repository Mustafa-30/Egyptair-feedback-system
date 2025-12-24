"""
Dashboard API Routes - Manages dashboard configurations
Matches the Dashboard entity operations from diagrams
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
from app.models.dashboard import Dashboard, DashboardType as DashboardTypeModel
from app.models.feedback import Feedback
from app.schemas.dashboard import (
    DashboardCreate,
    DashboardUpdate,
    DashboardResponse,
    DashboardListResponse,
    DashboardStats,
    ChartData
)

router = APIRouter()


@router.get("/", response_model=DashboardListResponse)
async def list_dashboards(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    dashboard_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all dashboards with pagination
    """
    query = db.query(Dashboard)
    
    # Filter by user or public dashboards
    if current_user.role not in ["admin", "supervisor"]:
        query = query.filter(
            (Dashboard.user_id == current_user.id) | (Dashboard.is_public == True)
        )
    
    if dashboard_type:
        query = query.filter(Dashboard.dashboard_type == dashboard_type)
    
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    dashboards = query.order_by(Dashboard.created_at.desc())\
                      .offset((page - 1) * page_size)\
                      .limit(page_size)\
                      .all()
    
    return DashboardListResponse(
        items=[DashboardResponse.model_validate(d) for d in dashboards],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/default", response_model=DashboardResponse)
async def get_default_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the default dashboard for the current user
    """
    # First try user's default
    dashboard = db.query(Dashboard).filter(
        Dashboard.user_id == current_user.id,
        Dashboard.is_default == True
    ).first()
    
    # If no user default, get system default (public + default)
    if not dashboard:
        dashboard = db.query(Dashboard).filter(
            Dashboard.is_public == True,
            Dashboard.is_default == True
        ).first()
    
    # If still no dashboard, create a default one
    if not dashboard:
        dashboard = Dashboard(
            title="Default Dashboard",
            dashboard_type="overview",
            is_default=True,
            is_public=False,
            user_id=current_user.id,
            chart_config={
                "sentiment_pie": {"type": "pie", "enabled": True},
                "trend_line": {"type": "line", "enabled": True},
                "recent_table": {"type": "table", "enabled": True}
            }
        )
        db.add(dashboard)
        db.commit()
        db.refresh(dashboard)
    
    # Update last viewed
    dashboard.last_viewed_at = datetime.utcnow()
    db.commit()
    
    return DashboardResponse.model_validate(dashboard)


@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific dashboard by ID
    Implements views relationship from class diagram
    """
    dashboard = db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    if not dashboard.is_public and current_user.role not in ["admin", "supervisor"]:
        if dashboard.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this dashboard")
    
    # Update last viewed
    dashboard.last_viewed_at = datetime.utcnow()
    db.commit()
    
    return DashboardResponse.model_validate(dashboard)


@router.post("/", response_model=DashboardResponse)
async def create_dashboard(
    request: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new dashboard
    """
    # If setting as default, unset other defaults for this user
    if request.is_default:
        db.query(Dashboard).filter(
            Dashboard.user_id == current_user.id,
            Dashboard.is_default == True
        ).update({"is_default": False})
    
    dashboard = Dashboard(
        title=request.title,
        description=request.description,
        dashboard_type=request.dashboard_type.value,
        layout_config=request.layout_config,
        chart_config=request.chart_config,
        filters=request.filters,
        is_default=request.is_default,
        is_public=request.is_public,
        refresh_interval=request.refresh_interval,
        report_id=request.report_id,
        user_id=current_user.id
    )
    
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    
    return DashboardResponse.model_validate(dashboard)


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: int,
    request: DashboardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a dashboard
    """
    dashboard = db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    if current_user.role not in ["admin", "supervisor"] and dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this dashboard")
    
    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    
    if "is_default" in update_data and update_data["is_default"]:
        db.query(Dashboard).filter(
            Dashboard.user_id == current_user.id,
            Dashboard.is_default == True,
            Dashboard.dashboard_id != dashboard_id
        ).update({"is_default": False})
    
    for field, value in update_data.items():
        if hasattr(dashboard, field):
            if field == "dashboard_type" and value:
                value = value.value if hasattr(value, 'value') else value
            setattr(dashboard, field, value)
    
    db.commit()
    db.refresh(dashboard)
    
    return DashboardResponse.model_validate(dashboard)


@router.post("/{dashboard_id}/refresh")
async def refresh_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Refresh dashboard data
    Implements + refresh() : void from class diagram
    """
    dashboard = db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Update last viewed timestamp
    dashboard.last_viewed_at = datetime.utcnow()
    db.commit()
    
    # Get fresh statistics
    total = db.query(func.count(Feedback.id)).scalar() or 0
    
    sentiment_counts = db.query(
        Feedback.sentiment,
        func.count(Feedback.id)
    ).group_by(Feedback.sentiment).all()
    
    sentiment_dict = {s[0]: s[1] for s in sentiment_counts if s[0]}
    positive = sentiment_dict.get("positive", 0)
    negative = sentiment_dict.get("negative", 0)
    neutral = sentiment_dict.get("neutral", 0)
    
    total_with_sentiment = positive + negative + neutral
    
    return {
        "dashboard_id": dashboard_id,
        "refreshed_at": datetime.utcnow().isoformat(),
        "stats": {
            "total_feedback": total,
            "positive_feedback": positive,
            "positive_percentage": round((positive / total_with_sentiment * 100), 1) if total_with_sentiment > 0 else 0,
            "negative_feedback": negative,
            "negative_percentage": round((negative / total_with_sentiment * 100), 1) if total_with_sentiment > 0 else 0,
            "neutral_feedback": neutral,
            "neutral_percentage": round((neutral / total_with_sentiment * 100), 1) if total_with_sentiment > 0 else 0
        }
    }


@router.get("/{dashboard_id}/charts")
async def get_dashboard_charts(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chart data for a dashboard
    Implements + generateCharts(reports: List<Reports>) : void from class diagram
    """
    dashboard = db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Generate chart data based on configuration
    charts = []
    
    # Sentiment pie chart
    sentiment_counts = db.query(
        Feedback.sentiment,
        func.count(Feedback.id)
    ).group_by(Feedback.sentiment).all()
    
    sentiment_dict = {s[0]: s[1] for s in sentiment_counts if s[0]}
    
    charts.append({
        "id": "sentiment_pie",
        "type": "pie",
        "title": "Sentiment Distribution",
        "data": {
            "labels": ["Positive", "Negative", "Neutral"],
            "values": [
                sentiment_dict.get("positive", 0),
                sentiment_dict.get("negative", 0),
                sentiment_dict.get("neutral", 0)
            ],
            "colors": ["#22c55e", "#ef4444", "#3b82f6"]
        }
    })
    
    # Language distribution bar chart
    language_counts = db.query(
        Feedback.language,
        func.count(Feedback.id)
    ).group_by(Feedback.language).all()
    
    charts.append({
        "id": "language_bar",
        "type": "bar",
        "title": "Language Distribution",
        "data": {
            "labels": [l[0] for l in language_counts if l[0]],
            "values": [l[1] for l in language_counts if l[0]]
        }
    })
    
    return {
        "dashboard_id": dashboard_id,
        "charts": charts,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a dashboard
    """
    dashboard = db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    if current_user.role not in ["admin", "supervisor"] and dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dashboard")
    
    db.delete(dashboard)
    db.commit()
    
    return {"message": "Dashboard deleted successfully", "dashboard_id": dashboard_id}
