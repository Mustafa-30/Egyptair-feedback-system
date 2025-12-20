"""
API Routes Module
"""
from fastapi import APIRouter

from app.api import auth, users, feedback, upload, analytics

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
