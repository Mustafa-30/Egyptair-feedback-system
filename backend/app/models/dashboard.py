"""
Dashboard Model - Represents dashboard configurations
Matches the Dashboard entity from the ER Diagram
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from typing import List, Optional

from app.core.database import Base


class DashboardType(str, enum.Enum):
    """Types of dashboards"""
    OVERVIEW = "overview"
    SENTIMENT = "sentiment"
    TRENDS = "trends"
    CUSTOM = "custom"


class Dashboard(Base):
    """
    Dashboard database model
    Represents a dashboard configuration for visualizing reports
    
    Relationships:
    - User (Many-to-One): A user can view/create multiple dashboards
    - Report (Many-to-One): A dashboard visualizes one or more reports
    """
    __tablename__ = "dashboards"
    
    # Primary Key - matches Dashboard_ID in diagram
    dashboard_id = Column(Integer, primary_key=True, index=True)
    
    # Dashboard Information - matches diagram attributes
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    dashboard_type = Column(String(50), default=DashboardType.OVERVIEW.value)
    
    # Configuration
    layout_config = Column(JSON, nullable=True)  # Store layout as JSON
    chart_config = Column(JSON, nullable=True)   # Store chart configurations
    filters = Column(JSON, nullable=True)        # Active filters
    
    # Display Settings
    is_default = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    refresh_interval = Column(Integer, default=300)  # Refresh interval in seconds
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.report_id"), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="dashboards", foreign_keys=[user_id])
    source_report = relationship("Report", back_populates="dashboards", foreign_keys=[report_id])
    
    def generate_charts(self, reports: List[dict]) -> None:
        """
        Generate charts from reports data
        Matches + generateCharts(reports: List<Reports>) : void from class diagram
        """
        # Initialize chart configurations based on reports
        self.chart_config = {
            "sentiment_pie": {
                "type": "pie",
                "data_source": "sentiment_distribution"
            },
            "trend_line": {
                "type": "line",
                "data_source": "sentiment_trends"
            },
            "language_bar": {
                "type": "bar",
                "data_source": "language_distribution"
            }
        }
    
    def refresh(self) -> None:
        """
        Refresh dashboard data
        Matches + refresh() : void from class diagram
        """
        self.last_viewed_at = func.now()
    
    def __repr__(self):
        return f"<Dashboard {self.dashboard_id}: {self.title}>"
