"""
User Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    AGENT = "agent"
    VIEWER = "viewer"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class User(Base):
    """
    User database model
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.AGENT.value, nullable=False)
    status = Column(String(20), default=UserStatus.ACTIVE.value, nullable=False)
    avatar = Column(String(255), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - use foreign_keys to specify which FK to use
    feedbacks = relationship(
        "Feedback", 
        back_populates="created_by_user",
        foreign_keys="[Feedback.created_by]"
    )
    
    # New relationships matching ER Diagram
    uploaded_files = relationship(
        "FeedbackFile",
        back_populates="uploader",
        foreign_keys="[FeedbackFile.user_id]"
    )
    
    reports = relationship(
        "Report",
        back_populates="owner",
        foreign_keys="[Report.user_id]"
    )
    
    dashboards = relationship(
        "Dashboard",
        back_populates="owner",
        foreign_keys="[Dashboard.user_id]"
    )
    
    def __repr__(self):
        return f"<User {self.username}>"
