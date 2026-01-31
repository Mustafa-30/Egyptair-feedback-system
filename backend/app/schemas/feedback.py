"""
Feedback Schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class FeedbackType(str, Enum):
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"
    COMPLIMENT = "compliment"
    INQUIRY = "inquiry"


class FeedbackStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class Language(str, Enum):
    AR = "AR"
    EN = "EN"
    MIXED = "Mixed"


# ===============================
# Request Schemas
# ===============================

class FeedbackCreate(BaseModel):
    """Schema for creating feedback"""
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_email: Optional[EmailStr] = None
    flight_number: Optional[str] = Field(None, max_length=20)
    feedback_type: FeedbackType = FeedbackType.INQUIRY
    text: str = Field(..., min_length=10, max_length=5000)
    priority: Priority = Priority.MEDIUM
    feedback_date: Optional[datetime] = None


class FeedbackUpdate(BaseModel):
    """Schema for updating feedback"""
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_email: Optional[EmailStr] = None
    flight_number: Optional[str] = Field(None, max_length=20)
    feedback_type: Optional[FeedbackType] = None
    text: Optional[str] = Field(None, min_length=10, max_length=5000)
    status: Optional[FeedbackStatus] = None
    priority: Optional[Priority] = None
    department: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class FeedbackStatusUpdate(BaseModel):
    """Schema for updating feedback status"""
    status: FeedbackStatus
    notes: Optional[str] = None


class FeedbackAnalyzeRequest(BaseModel):
    """Schema for analyzing text sentiment"""
    text: str = Field(..., min_length=3)
    language: Optional[Language] = None


# ===============================
# Response Schemas
# ===============================

class FeedbackResponse(BaseModel):
    """Schema for feedback response"""
    id: int
    original_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    flight_number: Optional[str] = None
    feedback_type: str
    text: str
    preprocessed_text: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_confidence: Optional[float] = None
    language: str
    status: str
    priority: str
    department: Optional[str] = None
    notes: Optional[str] = None
    source: str
    model_version: Optional[str] = None
    feedback_date: Optional[datetime] = None
    analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    
    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    """Schema for list of feedback"""
    items: list[FeedbackResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SentimentAnalysisResult(BaseModel):
    """Schema for sentiment analysis result"""
    text: str
    sentiment: Sentiment
    confidence: float
    language: Language
    preprocessed_text: str
    model_version: str
