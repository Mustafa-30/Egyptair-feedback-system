"""
Dashboard Schemas for request/response validation
Matches the Dashboard entity from the diagrams
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DashboardType(str, Enum):
    OVERVIEW = "overview"
    SENTIMENT = "sentiment"
    TRENDS = "trends"
    CUSTOM = "custom"


# ===============================
# Request Schemas
# ===============================

class DashboardCreate(BaseModel):
    """Schema for creating a dashboard"""
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    dashboard_type: DashboardType = DashboardType.OVERVIEW
    layout_config: Optional[Dict[str, Any]] = None
    chart_config: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    is_default: bool = False
    is_public: bool = False
    refresh_interval: int = 300
    report_id: Optional[int] = None


class DashboardUpdate(BaseModel):
    """Schema for updating a dashboard"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    dashboard_type: Optional[DashboardType] = None
    layout_config: Optional[Dict[str, Any]] = None
    chart_config: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None
    is_public: Optional[bool] = None
    refresh_interval: Optional[int] = None
    report_id: Optional[int] = None


# ===============================
# Response Schemas
# ===============================

class DashboardResponse(BaseModel):
    """Schema for dashboard response"""
    dashboard_id: int
    title: str
    description: Optional[str] = None
    dashboard_type: str
    layout_config: Optional[Dict[str, Any]] = None
    chart_config: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    is_default: bool
    is_public: bool
    refresh_interval: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_viewed_at: Optional[datetime] = None
    user_id: int
    report_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class DashboardListResponse(BaseModel):
    """Schema for list of dashboards"""
    items: List[DashboardResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ChartData(BaseModel):
    """Schema for chart data"""
    chart_type: str
    labels: List[str]
    datasets: List[Dict[str, Any]]
    options: Optional[Dict[str, Any]] = None


class DashboardStats(BaseModel):
    """Schema for dashboard statistics - matches frontend DashboardStats interface"""
    total_feedback: int
    total_change: str
    positive_feedback: int
    positive_percentage: float
    negative_feedback: int
    negative_percentage: float
    neutral_feedback: int
    neutral_percentage: float
    sentiment_pie_data: Optional[List[Dict[str, Any]]] = None
    trend_line_data: Optional[List[Dict[str, Any]]] = None
    recent_feedback: Optional[List[Dict[str, Any]]] = None
