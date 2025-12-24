"""
Report Schemas for request/response validation
Matches the Report entity from the diagrams
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReportType(str, Enum):
    SUMMARY = "summary"
    DETAILED = "detailed"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    TREND_ANALYSIS = "trend_analysis"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class ReportStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


# ===============================
# Request Schemas
# ===============================

class ReportCreate(BaseModel):
    """Schema for creating a report"""
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    report_type: ReportType = ReportType.SUMMARY
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    filters: Optional[Dict[str, Any]] = None
    file_format: ReportFormat = ReportFormat.PDF


class ReportUpdate(BaseModel):
    """Schema for updating a report"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[ReportStatus] = None
    file_path: Optional[str] = None
    error_message: Optional[str] = None


class ReportGenerateRequest(BaseModel):
    """Schema for report generation request"""
    report_type: ReportType = ReportType.SUMMARY
    title: Optional[str] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    filters: Optional[Dict[str, Any]] = None
    export_format: ReportFormat = ReportFormat.PDF
    include_charts: bool = True


# ===============================
# Response Schemas
# ===============================

class ReportResponse(BaseModel):
    """Schema for report response"""
    report_id: int
    title: str
    description: Optional[str] = None
    report_type: str
    created_at: datetime
    generated_at: Optional[datetime] = None
    file_path: Optional[str] = None
    file_format: str
    file_size: Optional[int] = None
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    filters: Optional[Dict[str, Any]] = None
    total_records: int
    positive_count: int
    negative_count: int
    neutral_count: int
    status: str
    error_message: Optional[str] = None
    user_id: int
    
    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Schema for list of reports"""
    items: List[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReportSummary(BaseModel):
    """Schema for report summary statistics"""
    total_records: int
    positive_count: int
    positive_percentage: float
    negative_count: int
    negative_percentage: float
    neutral_count: int
    neutral_percentage: float
    date_range: Optional[Dict[str, str]] = None
    sentiment_trends: Optional[List[Dict[str, Any]]] = None
    language_distribution: Optional[Dict[str, int]] = None
