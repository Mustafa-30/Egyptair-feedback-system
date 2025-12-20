"""
User Schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    AGENT = "agent"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


# ===============================
# Request Schemas
# ===============================

class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.AGENT
    status: UserStatus = UserStatus.ACTIVE


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    avatar: Optional[str] = None


class UserPasswordChange(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)


# ===============================
# Response Schemas
# ===============================

class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    username: str
    email: str
    name: str
    role: str
    status: str
    avatar: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for list of users"""
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
