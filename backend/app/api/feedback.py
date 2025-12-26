"""
Feedback Management API Routes
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.database import get_db
from app.core.security import get_current_user, require_supervisor
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackUpdate,
    FeedbackResponse,
    FeedbackListResponse,
    FeedbackStatusUpdate,
    FeedbackAnalyzeRequest,
    SentimentAnalysisResult
)
from app.services.sentiment_service import sentiment_analyzer

router = APIRouter()


@router.get("/", response_model=FeedbackListResponse)
async def get_feedbacks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    sentiment: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    language: Optional[str] = None,
    feedback_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all feedback with filters and pagination
    """
    query = db.query(Feedback)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Feedback.text.ilike(f"%{search}%"),
                Feedback.customer_name.ilike(f"%{search}%"),
                Feedback.customer_email.ilike(f"%{search}%")
            )
        )
    
    if sentiment:
        query = query.filter(Feedback.sentiment == sentiment)
    
    if status:
        query = query.filter(Feedback.status == status)
    
    if priority:
        query = query.filter(Feedback.priority == priority)
    
    if language:
        query = query.filter(Feedback.language == language)
    
    if feedback_type:
        query = query.filter(Feedback.feedback_type == feedback_type)
    
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from)
            query = query.filter(Feedback.created_at >= from_date)
        except:
            pass
    
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to)
            query = query.filter(Feedback.created_at <= to_date)
        except:
            pass
    
    # Order by newest first
    query = query.order_by(Feedback.created_at.desc())
    
    # Get total count
    total = query.count()
    
    # Pagination
    offset = (page - 1) * page_size
    feedbacks = query.offset(offset).limit(page_size).all()
    
    return {
        "items": feedbacks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific feedback by ID
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    return feedback


@router.post("/", response_model=FeedbackResponse)
async def create_feedback(
    feedback_data: FeedbackCreate,
    analyze: bool = Query(True, description="Analyze sentiment automatically"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create new feedback entry
    """
    # Create feedback object
    db_feedback = Feedback(
        customer_name=feedback_data.customer_name,
        customer_email=feedback_data.customer_email,
        flight_number=feedback_data.flight_number,
        feedback_type=feedback_data.feedback_type.value,
        text=feedback_data.text,
        priority=feedback_data.priority.value,
        feedback_date=feedback_data.feedback_date or datetime.utcnow(),
        source="manual",
        created_by=current_user.id
    )
    
    # Analyze sentiment if requested
    if analyze:
        analysis = sentiment_analyzer.analyze(feedback_data.text)
        db_feedback.sentiment = analysis["sentiment"]
        db_feedback.sentiment_confidence = analysis["confidence"]
        db_feedback.language = analysis["language"]
        db_feedback.preprocessed_text = analysis["preprocessed_text"]
        db_feedback.model_version = analysis["model_version"]
        db_feedback.analyzed_at = datetime.utcnow()
    
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    
    return db_feedback


@router.put("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: int,
    feedback_data: FeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update feedback entry
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Update fields
    update_data = feedback_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if hasattr(value, 'value'):  # Handle enums
                setattr(feedback, field, value.value)
            else:
                setattr(feedback, field, value)
    
    # Re-analyze if text changed
    if feedback_data.text:
        analysis = sentiment_analyzer.analyze(feedback_data.text)
        feedback.sentiment = analysis["sentiment"]
        feedback.sentiment_confidence = analysis["confidence"]
        feedback.language = analysis["language"]
        feedback.preprocessed_text = analysis["preprocessed_text"]
        feedback.analyzed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(feedback)
    
    return feedback


@router.patch("/{feedback_id}/status", response_model=FeedbackResponse)
async def update_feedback_status(
    feedback_id: int,
    status_data: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """
    Update feedback status (Supervisor only)
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    feedback.status = status_data.status.value
    if status_data.notes:
        feedback.notes = status_data.notes
    
    db.commit()
    db.refresh(feedback)
    
    return feedback


@router.delete("/{feedback_id}")
async def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """
    Delete feedback (Supervisor only)
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    db.delete(feedback)
    db.commit()
    
    return {"message": "Feedback deleted successfully"}


@router.post("/analyze", response_model=SentimentAnalysisResult)
async def analyze_text(
    request: FeedbackAnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze sentiment of given text without saving
    """
    analysis = sentiment_analyzer.analyze(request.text)
    
    return {
        "text": analysis["text"],
        "sentiment": analysis["sentiment"],
        "confidence": analysis["confidence"],
        "language": analysis["language"],
        "preprocessed_text": analysis["preprocessed_text"],
        "model_version": analysis["model_version"]
    }


@router.post("/bulk-delete")
async def bulk_delete_feedbacks(
    feedback_ids: list[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """
    Delete multiple feedbacks (Supervisor only)
    """
    deleted_count = db.query(Feedback).filter(Feedback.id.in_(feedback_ids)).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"Deleted {deleted_count} feedback entries"}


@router.post("/bulk-status")
async def bulk_update_status(
    feedback_ids: list[int],
    status_data: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """
    Update status of multiple feedbacks (Supervisor only)
    """
    updated_count = db.query(Feedback).filter(Feedback.id.in_(feedback_ids)).update(
        {"status": status_data.status.value},
        synchronize_session=False
    )
    db.commit()
    
    return {"message": f"Updated {updated_count} feedback entries"}


@router.delete("/clear-all")
async def clear_all_feedback(
    confirm: bool = Query(False, description="Must be true to confirm deletion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """
    Delete ALL feedback entries (Supervisor/Admin only)
    Requires confirm=true to prevent accidental deletion
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set confirm=true to confirm deletion of all feedback"
        )
    
    # Count before deletion
    total_count = db.query(Feedback).count()
    
    # Delete all feedback
    db.query(Feedback).delete(synchronize_session=False)
    db.commit()
    
    return {
        "message": f"Successfully deleted all feedback entries",
        "deleted_count": total_count
    }

