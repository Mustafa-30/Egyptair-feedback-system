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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics
    """
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Total feedback count
    total_feedback = db.query(func.count(Feedback.id)).scalar() or 0
    
    # Feedback in date range
    query_range = db.query(Feedback).filter(Feedback.created_at >= start_date)
    feedback_in_range = query_range.count()
    
    # Previous period for comparison
    prev_start = start_date - timedelta(days=days)
    prev_count = db.query(func.count(Feedback.id)).filter(
        and_(Feedback.created_at >= prev_start, Feedback.created_at < start_date)
    ).scalar() or 0
    
    # Calculate change percentage
    if prev_count > 0:
        change = ((feedback_in_range - prev_count) / prev_count) * 100
        change_str = f"+{change:.1f}%" if change > 0 else f"{change:.1f}%"
    else:
        change_str = "+100%" if feedback_in_range > 0 else "0%"
    
    # Sentiment counts
    sentiment_counts = db.query(
        Feedback.sentiment,
        func.count(Feedback.id)
    ).group_by(Feedback.sentiment).all()
    
    sentiment_dict = {s[0]: s[1] for s in sentiment_counts if s[0]}
    positive = sentiment_dict.get("positive", 0)
    negative = sentiment_dict.get("negative", 0)
    neutral = sentiment_dict.get("neutral", 0)
    
    total_with_sentiment = positive + negative + neutral
    
    return {
        "total_feedback": total_feedback,
        "total_change": change_str,
        "positive_feedback": positive,
        "positive_percentage": round((positive / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1),
        "negative_feedback": negative,
        "negative_percentage": round((negative / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1),
        "neutral_feedback": neutral,
        "neutral_percentage": round((neutral / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1),
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": days
        }
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
