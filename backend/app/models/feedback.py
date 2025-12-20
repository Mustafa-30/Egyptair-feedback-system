"""
Feedback Model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class FeedbackType(str, enum.Enum):
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"
    COMPLIMENT = "compliment"
    INQUIRY = "inquiry"


class FeedbackStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Sentiment(str, enum.Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class Language(str, enum.Enum):
    AR = "AR"
    EN = "EN"
    MIXED = "Mixed"


class FeedbackSource(str, enum.Enum):
    MANUAL = "manual"
    UPLOAD = "upload"
    SURVEY = "survey"
    EMAIL = "email"
    COMPLAINT = "complaint"
    SOCIAL = "social"


class Feedback(Base):
    """
    Feedback database model
    """
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Customer Information
    customer_name = Column(String(100), nullable=True)
    customer_email = Column(String(100), nullable=True)
    flight_number = Column(String(20), nullable=True)
    
    # Feedback Content
    feedback_type = Column(String(20), default=FeedbackType.INQUIRY.value)
    text = Column(Text, nullable=False)
    preprocessed_text = Column(Text, nullable=True)
    
    # Classification
    sentiment = Column(String(20), nullable=True)
    sentiment_confidence = Column(Float, nullable=True)
    language = Column(String(10), default=Language.EN.value)
    
    # Status & Priority
    status = Column(String(20), default=FeedbackStatus.PENDING.value)
    priority = Column(String(20), default=Priority.MEDIUM.value)
    
    # Assignment
    department = Column(String(50), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Internal Notes
    notes = Column(Text, nullable=True)
    
    # Source & Metadata
    source = Column(String(20), default=FeedbackSource.MANUAL.value)
    model_version = Column(String(50), nullable=True)
    
    # Timestamps
    feedback_date = Column(DateTime(timezone=True), nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Created by
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    created_by_user = relationship("User", back_populates="feedbacks", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<Feedback {self.id}: {self.sentiment}>"
