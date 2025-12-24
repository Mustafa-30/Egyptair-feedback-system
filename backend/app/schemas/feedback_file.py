"""
FeedbackFile Schemas for request/response validation
Matches the FeedbackFile entity from the diagrams
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FileStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FileType(str, Enum):
    CSV = "csv"
    XLSX = "xlsx"
    XLS = "xls"


# ===============================
# Request Schemas
# ===============================

class FeedbackFileCreate(BaseModel):
    """Schema for creating a feedback file record"""
    file_name: str = Field(..., max_length=255)
    file_type: FileType
    file_size: Optional[int] = None
    file_path: Optional[str] = None
    total_rows: int = 0


class FeedbackFileUpdate(BaseModel):
    """Schema for updating a feedback file record"""
    status: Optional[FileStatus] = None
    processed_rows: Optional[int] = None
    success_count: Optional[int] = None
    error_count: Optional[int] = None
    error_message: Optional[str] = None


# ===============================
# Response Schemas
# ===============================

class FeedbackFileResponse(BaseModel):
    """Schema for feedback file response"""
    file_id: int
    file_name: str
    file_type: str
    file_size: Optional[int] = None
    file_path: Optional[str] = None
    upload_date: datetime
    status: str
    total_rows: int
    processed_rows: int
    success_count: int
    error_count: int
    error_message: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    created_at: datetime
    user_id: int
    
    class Config:
        from_attributes = True


class FeedbackFileListResponse(BaseModel):
    """Schema for list of feedback files"""
    items: List[FeedbackFileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FeedbackFileSummary(BaseModel):
    """Schema for file processing summary"""
    file_id: int
    file_name: str
    status: str
    total_rows: int
    processed_rows: int
    success_count: int
    error_count: int
    success_rate: float
