"""
Report Model - Represents generated reports
Matches the Report entity from the ER Diagram
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from typing import List, Optional

from app.core.database import Base


class ReportType(str, enum.Enum):
    """Types of reports that can be generated"""
    SUMMARY = "summary"
    DETAILED = "detailed"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    TREND_ANALYSIS = "trend_analysis"
    CUSTOM = "custom"


class ReportFormat(str, enum.Enum):
    """Export formats for reports"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class ReportStatus(str, enum.Enum):
    """Status of report generation"""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Report(Base):
    """
    Report database model
    Represents a generated analytical report
    
    Relationships:
    - User (Many-to-One): A user can generate multiple reports
    - Dashboard (One-to-Many): Reports can be visualized in dashboards
    """
    __tablename__ = "reports"
    
    # Primary Key - matches Report_ID in diagram
    report_id = Column(Integer, primary_key=True, index=True)
    
    # Report Information - matches diagram attributes
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    report_type = Column(String(50), default=ReportType.SUMMARY.value)
    
    # Generation Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_at = Column(DateTime(timezone=True), nullable=True)
    
    # File Storage - matches File_Path in diagram
    file_path = Column(String(500), nullable=True)
    file_format = Column(String(20), default=ReportFormat.PDF.value)
    file_size = Column(Integer, nullable=True)
    
    # Report Parameters
    date_range_start = Column(DateTime(timezone=True), nullable=True)
    date_range_end = Column(DateTime(timezone=True), nullable=True)
    filters = Column(JSON, nullable=True)  # Store filter parameters as JSON
    
    # Report Data Summary
    total_records = Column(Integer, default=0)
    positive_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    
    # Status
    status = Column(String(20), default=ReportStatus.PENDING.value)
    error_message = Column(Text, nullable=True)
    
    # Foreign Key - User who generated the report
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="reports", foreign_keys=[user_id])
    dashboards = relationship("Dashboard", back_populates="source_report", cascade="all, delete-orphan")
    
    def generate(self, records: List[dict]) -> None:
        """
        Generate report from feedback records
        Matches + generate(records: List<FeedbackRecord>) : void from class diagram
        """
        self.total_records = len(records)
        self.positive_count = sum(1 for r in records if r.get('sentiment') == 'positive')
        self.negative_count = sum(1 for r in records if r.get('sentiment') == 'negative')
        self.neutral_count = sum(1 for r in records if r.get('sentiment') == 'neutral')
        self.status = ReportStatus.COMPLETED.value
        self.generated_at = func.now()
    
    def export(self, format: str = "pdf") -> Optional[str]:
        """
        Export report to file
        Matches + export() : file from class diagram
        """
        self.file_format = format
        # Returns file path after export
        return self.file_path
    
    def __repr__(self):
        return f"<Report {self.report_id}: {self.title}>"
