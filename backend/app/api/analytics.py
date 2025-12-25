"""
Analytics API Routes
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.feedback import Feedback

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(
    days: int = Query(30, ge=1, le=365),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sentiment: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics with optional filters
    """
    # Calculate date range
    if date_from and date_to:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
    else:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
    
    # Base query with date filter
    query = db.query(Feedback).filter(Feedback.created_at >= start_date)
    if date_to:
        query = query.filter(Feedback.created_at <= end_date)
    
    # Apply sentiment filter if provided
    if sentiment and sentiment != 'all':
        query = query.filter(Feedback.sentiment == sentiment)
    
    # Total feedback count (all time)
    total_feedback = db.query(func.count(Feedback.id)).scalar() or 0
    
    # Feedback in date range
    feedback_in_range = query.count()
    
    # Today's feedback
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(func.count(Feedback.id)).filter(
        Feedback.created_at >= today_start
    ).scalar() or 0
    
    # Previous period for comparison
    period_length = (end_date - start_date).days or days
    prev_start = start_date - timedelta(days=period_length)
    prev_count = db.query(func.count(Feedback.id)).filter(
        and_(Feedback.created_at >= prev_start, Feedback.created_at < start_date)
    ).scalar() or 0
    
    # Calculate change percentage
    if prev_count > 0:
        change = ((feedback_in_range - prev_count) / prev_count) * 100
        change_str = f"+{change:.1f}%" if change > 0 else f"{change:.1f}%"
    else:
        change_str = "+100%" if feedback_in_range > 0 else "0%"
    
    # Sentiment counts (within date range)
    sentiment_query = db.query(Feedback).filter(Feedback.created_at >= start_date)
    if date_to:
        sentiment_query = sentiment_query.filter(Feedback.created_at <= end_date)
    
    sentiment_counts = sentiment_query.with_entities(
        Feedback.sentiment,
        func.count(Feedback.id)
    ).group_by(Feedback.sentiment).all()
    
    sentiment_dict = {s[0]: s[1] for s in sentiment_counts if s[0]}
    positive = sentiment_dict.get("positive", 0)
    negative = sentiment_dict.get("negative", 0)
    neutral = sentiment_dict.get("neutral", 0)
    
    total_with_sentiment = positive + negative + neutral
    
    # Pending feedback count
    pending_count = db.query(func.count(Feedback.id)).filter(
        Feedback.status == "pending"
    ).scalar() or 0
    
    # Resolved count for resolution rate
    resolved_count = db.query(func.count(Feedback.id)).filter(
        Feedback.status == "resolved"
    ).scalar() or 0
    
    resolution_rate = round((resolved_count / total_feedback * 100) if total_feedback > 0 else 0, 1)
    
    # Average confidence
    avg_confidence = db.query(func.avg(Feedback.sentiment_confidence)).scalar() or 0
    
    # Language distribution
    language_counts = db.query(
        Feedback.language,
        func.count(Feedback.id)
    ).group_by(Feedback.language).all()
    
    language_dict = {l[0]: l[1] for l in language_counts if l[0]}
    arabic_count = language_dict.get("AR", 0)
    english_count = language_dict.get("EN", 0)
    
    # Priority distribution
    priority_counts = db.query(
        Feedback.priority,
        func.count(Feedback.id)
    ).group_by(Feedback.priority).all()
    
    priority_dict = {p[0]: p[1] for p in priority_counts if p[0]}
    
    return {
        "total_feedback": total_feedback,
        "feedback_in_range": feedback_in_range,
        "total_change": change_str,
        "today_count": today_count,
        "positive_count": positive,
        "positive_feedback": positive,
        "positive_percentage": round((positive / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1),
        "negative_count": negative,
        "negative_feedback": negative,
        "negative_percentage": round((negative / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1),
        "neutral_count": neutral,
        "neutral_feedback": neutral,
        "neutral_percentage": round((neutral / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1),
        "pending_count": pending_count,
        "average_confidence": round(avg_confidence * 100, 1) if avg_confidence else 0,
        "resolution_rate": resolution_rate,
        "language_distribution": {
            "arabic": arabic_count,
            "english": english_count,
            "total": arabic_count + english_count
        },
        "priority_distribution": {
            "high": priority_dict.get("high", 0),
            "medium": priority_dict.get("medium", 0),
            "low": priority_dict.get("low", 0),
            "urgent": priority_dict.get("urgent", 0)
        },
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": days
        },
        "last_updated": datetime.utcnow().isoformat()
    }


@router.get("/sentiment-trends")
async def get_sentiment_trends(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get sentiment trends over time
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Group by date and sentiment
    results = db.query(
        func.date(Feedback.created_at).label('date'),
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        Feedback.created_at >= start_date
    ).group_by(
        func.date(Feedback.created_at),
        Feedback.sentiment
    ).all()
    
    # Process results into date-grouped format
    trends = {}
    for row in results:
        # Handle both date objects and strings
        if row.date:
            if isinstance(row.date, str):
                try:
                    from datetime import datetime as dt
                    parsed_date = dt.strptime(row.date, "%Y-%m-%d")
                    date_str = parsed_date.strftime("%b %d")
                except:
                    date_str = row.date[:10] if len(row.date) >= 10 else row.date
            else:
                date_str = row.date.strftime("%b %d")
        else:
            date_str = "Unknown"
        if date_str not in trends:
            trends[date_str] = {"date": date_str, "positive": 0, "negative": 0, "neutral": 0}
        if row.sentiment:
            trends[date_str][row.sentiment] = row.count
    
    # Sort by date and return as list
    sorted_trends = sorted(trends.values(), key=lambda x: x["date"])
    
    return sorted_trends


@router.get("/by-status")
async def get_feedback_by_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback count by status
    """
    results = db.query(
        Feedback.status,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.status).all()
    
    return [{"status": r.status, "count": r.count} for r in results]


@router.get("/by-priority")
async def get_feedback_by_priority(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback count by priority
    """
    results = db.query(
        Feedback.priority,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.priority).all()
    
    return [{"priority": r.priority, "count": r.count} for r in results]


@router.get("/by-type")
async def get_feedback_by_type(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback count by type
    """
    results = db.query(
        Feedback.feedback_type,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.feedback_type).all()
    
    return [{"type": r.feedback_type, "count": r.count} for r in results]


@router.get("/by-language")
async def get_feedback_by_language(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback count by language
    """
    results = db.query(
        Feedback.language,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.language).all()
    
    return [{"language": r.language, "count": r.count} for r in results]


@router.get("/by-source")
async def get_feedback_by_source(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback count by source
    """
    results = db.query(
        Feedback.source,
        func.count(Feedback.id).label('count')
    ).group_by(Feedback.source).all()
    
    return [{"source": r.source, "count": r.count} for r in results]


@router.get("/recent")
async def get_recent_feedback(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get most recent feedback entries
    """
    feedbacks = db.query(Feedback).order_by(
        Feedback.created_at.desc()
    ).limit(limit).all()
    
    return feedbacks


@router.get("/summary")
async def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive analytics summary
    """
    total = db.query(func.count(Feedback.id)).scalar() or 0
    
    # Today's feedback
    today = datetime.utcnow().date()
    today_count = db.query(func.count(Feedback.id)).filter(
        func.date(Feedback.created_at) == today
    ).scalar() or 0
    
    # This week
    week_start = datetime.utcnow() - timedelta(days=7)
    week_count = db.query(func.count(Feedback.id)).filter(
        Feedback.created_at >= week_start
    ).scalar() or 0
    
    # Pending feedback
    pending_count = db.query(func.count(Feedback.id)).filter(
        Feedback.status == "pending"
    ).scalar() or 0
    
    # Average confidence
    avg_confidence = db.query(func.avg(Feedback.sentiment_confidence)).scalar() or 0
    
    return {
        "total_feedback": total,
        "today_count": today_count,
        "week_count": week_count,
        "pending_count": pending_count,
        "average_confidence": round(avg_confidence, 1)
    }
