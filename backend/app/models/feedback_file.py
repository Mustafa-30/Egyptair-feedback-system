"""
FeedbackFile Model - Represents uploaded feedback files
Matches the FeedbackFile entity from the ER Diagram
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class FileStatus(str, enum.Enum):
    """Status of uploaded files"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FileType(str, enum.Enum):
    """Supported file types"""
    CSV = "csv"
    XLSX = "xlsx"
    XLS = "xls"


class FeedbackFile(Base):
    """
    FeedbackFile database model
    Represents an uploaded file containing feedback data
    
    Relationships:
    - User (Many-to-One): A user can upload multiple files
    - FeedbackRecord (One-to-Many): A file contains multiple feedback records
    """
    __tablename__ = "feedback_files"
    
    # Primary Key - matches File_ID in diagram
    file_id = Column(Integer, primary_key=True, index=True)
    
    # File Information - matches diagram attributes
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    file_path = Column(String(500), nullable=True)  # Storage path
    
    # Upload Information
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Processing Status - matches Status in diagram
    status = Column(String(20), default=FileStatus.PENDING.value)
    
    # Processing Statistics
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    # Error Information
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Foreign Key - User who uploaded the file
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    uploader = relationship("User", back_populates="uploaded_files", foreign_keys=[user_id])
    feedback_records = relationship("Feedback", back_populates="source_file", cascade="all, delete-orphan")
    
    def validate(self) -> bool:
        """
        Validate the file
        Matches + Validate() : bool from class diagram
        """
        valid_types = ['csv', 'xlsx', 'xls']
        return self.file_type.lower() in valid_types and self.file_size is not None and self.file_size > 0
    
    def __repr__(self):
        return f"<FeedbackFile {self.file_id}: {self.file_name}>"
