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
    days: Optional[int] = Query(None, ge=1, le=365),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sentiment: Optional[str] = None,
    show_all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard statistics with optional filters.
    If no date filters are specified and show_all=true, returns all data.
    Otherwise defaults to last 30 days.
    """
    # Calculate date range
    use_date_filter = True
    if date_from and date_to:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            # Make end_date inclusive (end of day)
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days or 30)
    elif show_all or (days is None and not date_from and not date_to):
        # Show all data when show_all=true or no date params provided
        use_date_filter = False
        end_date = datetime.utcnow()
        start_date = datetime(2000, 1, 1)  # Very old date to include all
    else:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days or 30)
    
    # Base query with optional date filter - use feedback_date instead of created_at
    # feedback_date is the actual date from the uploaded file
    query = db.query(Feedback)
    if use_date_filter:
        query = query.filter(Feedback.feedback_date >= start_date)
        if date_to:
            query = query.filter(Feedback.feedback_date <= end_date)
    
    # Apply sentiment filter if provided
    if sentiment and sentiment != 'all':
        query = query.filter(Feedback.sentiment == sentiment)
    
    # Total feedback count (all time)
    total_feedback = db.query(func.count(Feedback.id)).scalar() or 0
    
    # Feedback in date range
    feedback_in_range = query.count()
    
    # Today's feedback - use feedback_date
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(func.count(Feedback.id)).filter(
        Feedback.feedback_date >= today_start
    ).scalar() or 0
    
    # Previous period for comparison - use feedback_date
    period_length = (end_date - start_date).days or days
    prev_start = start_date - timedelta(days=period_length)
    prev_count = db.query(func.count(Feedback.id)).filter(
        and_(Feedback.feedback_date >= prev_start, Feedback.feedback_date < start_date)
    ).scalar() or 0
    
    # Calculate change percentage
    if prev_count > 0:
        change = ((feedback_in_range - prev_count) / prev_count) * 100
        change_str = f"+{change:.1f}%" if change > 0 else f"{change:.1f}%"
    else:
        change_str = "+100%" if feedback_in_range > 0 else "0%"
    
    # Sentiment counts (within date range) - use feedback_date
    # IMPORTANT: Don't apply sentiment filter here - we always want all sentiment counts
    # for proper percentage calculation. The sentiment filter only affects the main query.
    sentiment_query = db.query(Feedback).filter(Feedback.feedback_date >= start_date)
    if date_to:
        sentiment_query = sentiment_query.filter(Feedback.feedback_date <= end_date)
    
    sentiment_counts = sentiment_query.with_entities(
        Feedback.sentiment,
        func.count(Feedback.id)
    ).group_by(Feedback.sentiment).all()
    
    sentiment_dict = {s[0]: s[1] for s in sentiment_counts if s[0]}
    positive = sentiment_dict.get("positive", 0)
    negative = sentiment_dict.get("negative", 0)
    neutral = sentiment_dict.get("neutral", 0)
    
    total_with_sentiment = positive + negative + neutral
    
    # Pending feedback count - ONLY negative feedback that is pending
    pending_count = db.query(func.count(Feedback.id)).filter(
        Feedback.status == "pending",
        Feedback.sentiment == "negative"
    ).scalar() or 0
    
    # Resolved count for resolution rate - based on negative feedback only
    # Total negative feedback that needs review
    total_negative = db.query(func.count(Feedback.id)).filter(
        Feedback.sentiment == "negative"
    ).scalar() or 0
    
    # Resolved negative feedback
    resolved_negative = db.query(func.count(Feedback.id)).filter(
        Feedback.status == "resolved",
        Feedback.sentiment == "negative"
    ).scalar() or 0
    
    # Resolution rate = resolved negative / total negative
    resolution_rate = round((resolved_negative / total_negative * 100) if total_negative > 0 else 0, 1)
    
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
        "average_confidence": round(avg_confidence, 1) if avg_confidence else 0,
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
    aggregate: str = Query("auto", pattern="^(auto|daily|weekly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get sentiment trends over time.
    aggregate: 'auto' (choose based on data density), 'daily', or 'weekly'
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Count total data points to determine aggregation
    total_count = db.query(func.count(Feedback.id)).filter(
        Feedback.created_at >= start_date
    ).scalar() or 0
    
    # Count unique days with data
    unique_days = db.query(func.count(func.distinct(func.date(Feedback.created_at)))).filter(
        Feedback.created_at >= start_date
    ).scalar() or 0
    
    # Auto-determine aggregation: weekly if sparse data (less than 40% coverage)
    use_weekly = aggregate == "weekly" or (aggregate == "auto" and unique_days < days * 0.4)
    
    if use_weekly:
        # Weekly aggregation using ISO week
        results = db.query(
            func.strftime('%Y-W%W', Feedback.created_at).label('week'),
            Feedback.sentiment,
            func.count(Feedback.id).label('count')
        ).filter(
            Feedback.created_at >= start_date
        ).group_by(
            func.strftime('%Y-W%W', Feedback.created_at),
            Feedback.sentiment
        ).all()
        
        # Process weekly results
        trends = {}
        for row in results:
            week_str = row.week if row.week else "Unknown"
            if week_str not in trends:
                trends[week_str] = {"date": week_str, "positive": 0, "negative": 0, "neutral": 0}
            if row.sentiment:
                trends[week_str][row.sentiment] = row.count
        
        # Fill in missing weeks to create continuous data
        # Get start and end week numbers
        from datetime import datetime, timedelta
        current = start_date
        end = end_date
        while current <= end:
            week_str = current.strftime('%Y-W%W')
            if week_str not in trends:
                trends[week_str] = {"date": week_str, "positive": 0, "negative": 0, "neutral": 0}
            current += timedelta(days=7)
        
        sorted_trends = sorted(trends.values(), key=lambda x: x["date"])
    else:
        # Daily aggregation with filled dates
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
        
        # Process into date-grouped format
        trends = {}
        for row in results:
            if row.date:
                if isinstance(row.date, str):
                    try:
                        parsed_date = datetime.strptime(row.date, "%Y-%m-%d")
                        date_str = parsed_date.strftime("%b %d")
                        sort_key = row.date
                    except:
                        date_str = row.date[:10] if len(row.date) >= 10 else row.date
                        sort_key = row.date
                else:
                    date_str = row.date.strftime("%b %d")
                    sort_key = row.date.strftime("%Y-%m-%d")
            else:
                date_str = "Unknown"
                sort_key = "9999-99-99"
            
            if date_str not in trends:
                trends[date_str] = {"date": date_str, "positive": 0, "negative": 0, "neutral": 0, "_sort": sort_key}
            if row.sentiment:
                trends[date_str][row.sentiment] = row.count
        
        # Fill missing dates with zeros for continuous chart
        current = start_date.date() if hasattr(start_date, 'date') else start_date
        end = end_date.date() if hasattr(end_date, 'date') else end_date
        
        while current <= end:
            date_str = current.strftime("%b %d")
            if date_str not in trends:
                trends[date_str] = {
                    "date": date_str,
                    "positive": 0,
                    "negative": 0,
                    "neutral": 0,
                    "_sort": current.strftime("%Y-%m-%d")
                }
            current += timedelta(days=1)
        
        # Sort by actual date and remove sort key
        sorted_trends = sorted(trends.values(), key=lambda x: x.get("_sort", x["date"]))
        for t in sorted_trends:
            t.pop("_sort", None)
    
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


@router.get("/top-complaints")
async def get_top_complaints(
    limit: int = Query(5, ge=1, le=20),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get top complaint categories from negative feedback.
    Supports date filtering with feedback_date.
    """
    # Build base query for negative feedback
    query = db.query(Feedback.text, Feedback.feedback_type).filter(
        Feedback.sentiment == "negative"
    )
    
    # Apply date filters if provided
    if date_from:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(Feedback.feedback_date >= start_date)
        except:
            pass
    
    if date_to:
        try:
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            end_date = end_date.replace(hour=23, minute=59, second=59)
            query = query.filter(Feedback.feedback_date <= end_date)
        except:
            pass
    
    negative_feedback = query.limit(500).all()
    
    # Common complaint categories and their keywords
    complaint_categories = {
        "Delay/Cancellation": ["delay", "delayed", "cancel", "cancelled", "late", "wait", "hours", "تأخير", "إلغاء", "تأخر"],
        "Lost Baggage": ["luggage", "baggage", "bag", "lost", "missing", "suitcase", "حقيبة", "أمتعة", "ضائعة"],
        "Poor Service": ["rude", "unhelpful", "staff", "service", "attitude", "خدمة", "سيء", "موظف"],
        "Seat Issues": ["seat", "uncomfortable", "space", "legroom", "cramped", "مقعد", "ضيق"],
        "Food Quality": ["food", "meal", "cold", "taste", "quality", "طعام", "وجبة", "بارد"],
        "Booking Problems": ["booking", "reservation", "website", "app", "حجز", "موقع", "تطبيق"],
        "Refund Issues": ["refund", "money", "charge", "payment", "استرداد", "مال", "دفع"],
        "Check-in Problems": ["check-in", "checkin", "counter", "queue", "line", "تسجيل", "طابور"],
        "Communication": ["communication", "inform", "notification", "update", "تواصل", "إبلاغ"],
        "Cleanliness": ["dirty", "clean", "hygiene", "toilet", "نظافة", "قذر", "حمام"]
    }
    
    # Count occurrences of each category
    category_counts = {cat: 0 for cat in complaint_categories}
    
    for feedback_text, _ in negative_feedback:
        if feedback_text:
            text_lower = feedback_text.lower()
            for category, keywords in complaint_categories.items():
                if any(keyword in text_lower for keyword in keywords):
                    category_counts[category] += 1
    
    # Sort by count and get top N
    sorted_complaints = sorted(
        [{"category": cat, "count": count} for cat, count in category_counts.items() if count > 0],
        key=lambda x: x["count"],
        reverse=True
    )[:limit]
    
    # Calculate percentages
    total = sum(c["count"] for c in sorted_complaints)
    for complaint in sorted_complaints:
        complaint["percentage"] = round((complaint["count"] / total * 100) if total > 0 else 0, 1)
    
    return sorted_complaints


@router.get("/feedback-by-route")
async def get_feedback_by_route(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback distribution by flight routes (flight_number)
    """
    # Get feedback count by flight number with sentiment breakdown
    results = db.query(
        Feedback.flight_number,
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        Feedback.flight_number.isnot(None),
        Feedback.flight_number != ""
    ).group_by(
        Feedback.flight_number,
        Feedback.sentiment
    ).all()
    
    # Process into route-based format
    routes = {}
    for row in results:
        route = row.flight_number
        if route not in routes:
            routes[route] = {
                "route": route,
                "total": 0,
                "positive": 0,
                "negative": 0,
                "neutral": 0
            }
        routes[route]["total"] += row.count
        if row.sentiment in ["positive", "negative", "neutral"]:
            routes[route][row.sentiment] = row.count
    
    # Sort by total and get top N
    sorted_routes = sorted(
        routes.values(),
        key=lambda x: x["total"],
        reverse=True
    )[:limit]
    
    return sorted_routes


@router.get("/csat-score")
async def get_csat_score(
    days: int = Query(30, ge=1, le=365),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    show_all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Customer Satisfaction (CSAT) score based on positive feedback ratio.
    Uses feedback_date for accurate filtering.
    CSAT = (Positive Feedback / Total Feedback) * 100
    """
    # Calculate date range
    use_date_filter = True
    if date_from and date_to:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
    elif show_all:
        use_date_filter = False
        # Get date range from actual data
        max_date = db.query(func.max(Feedback.feedback_date)).scalar()
        min_date = db.query(func.min(Feedback.feedback_date)).scalar()
        if max_date and min_date:
            end_date = max_date
            start_date = min_date
        else:
            end_date = datetime.utcnow()
            start_date = datetime(2000, 1, 1)
    else:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
    
    # Get sentiment counts for the period using feedback_date
    query = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    )
    
    if use_date_filter or (date_from and date_to):
        query = query.filter(Feedback.feedback_date >= start_date)
        if date_to or not show_all:
            query = query.filter(Feedback.feedback_date <= end_date)
    
    results = query.group_by(Feedback.sentiment).all()
    
    sentiment_dict = {r.sentiment: r.count for r in results if r.sentiment}
    positive = sentiment_dict.get("positive", 0)
    negative = sentiment_dict.get("negative", 0)
    neutral = sentiment_dict.get("neutral", 0)
    total = positive + negative + neutral
    
    # CSAT calculation (positive feedback percentage)
    csat_score = round((positive / total * 100) if total > 0 else 0, 1)
    
    # Previous period for comparison
    period_length = (end_date - start_date).days if use_date_filter else days
    prev_start = start_date - timedelta(days=period_length)
    prev_results = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        and_(Feedback.feedback_date >= prev_start, Feedback.feedback_date < start_date)
    ).group_by(Feedback.sentiment).all()
    
    prev_dict = {r.sentiment: r.count for r in prev_results if r.sentiment}
    prev_positive = prev_dict.get("positive", 0)
    prev_total = sum(prev_dict.values())
    prev_csat = round((prev_positive / prev_total * 100) if prev_total > 0 else 0, 1)
    
    # Calculate change
    csat_change = round(csat_score - prev_csat, 1)
    
    return {
        "csat_score": csat_score,
        "previous_score": prev_csat,
        "change": csat_change,
        "positive_count": positive,
        "total_count": total,
        "period_days": period_length,
        "grade": "Excellent" if csat_score >= 80 else "Good" if csat_score >= 60 else "Fair" if csat_score >= 40 else "Poor"
    }


@router.get("/response-time")
async def get_response_time_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get response time metrics for feedback handling
    Calculates average time from creation to resolution
    """
    # Get resolved feedback with timestamps
    resolved_feedback = db.query(Feedback).filter(
        Feedback.status == "resolved",
        Feedback.updated_at.isnot(None),
        Feedback.created_at.isnot(None)
    ).all()
    
    if not resolved_feedback:
        return {
            "average_response_hours": 0,
            "average_response_days": 0,
            "total_resolved": 0,
            "resolved_today": 0,
            "resolved_this_week": 0,
            "performance_grade": "N/A"
        }
    
    # Calculate response times
    total_hours = 0
    valid_count = 0
    today = datetime.utcnow().date()
    week_start = datetime.utcnow() - timedelta(days=7)
    resolved_today = 0
    resolved_this_week = 0
    
    for feedback in resolved_feedback:
        if feedback.updated_at and feedback.created_at:
            diff = feedback.updated_at - feedback.created_at
            hours = diff.total_seconds() / 3600
            if hours >= 0:  # Valid positive duration
                total_hours += hours
                valid_count += 1
        
        if feedback.updated_at:
            if feedback.updated_at.date() == today:
                resolved_today += 1
            if feedback.updated_at >= week_start:
                resolved_this_week += 1
    
    avg_hours = round(total_hours / valid_count, 1) if valid_count > 0 else 0
    avg_days = round(avg_hours / 24, 1)
    
    # Performance grade based on response time
    if avg_hours <= 24:
        grade = "Excellent"
    elif avg_hours <= 48:
        grade = "Good"
    elif avg_hours <= 72:
        grade = "Fair"
    else:
        grade = "Needs Improvement"
    
    return {
        "average_response_hours": avg_hours,
        "average_response_days": avg_days,
        "total_resolved": len(resolved_feedback),
        "resolved_today": resolved_today,
        "resolved_this_week": resolved_this_week,
        "performance_grade": grade
    }


@router.get("/comparison")
async def get_period_comparison(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comparison data between current period and previous period.
    Returns side-by-side metrics for trend analysis.
    """
    end_date = datetime.utcnow()
    current_start = end_date - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    
    def get_period_stats(start: datetime, end: datetime) -> dict:
        """Get stats for a specific period"""
        query = db.query(Feedback).filter(
            and_(Feedback.created_at >= start, Feedback.created_at < end)
        )
        
        total = query.count()
        
        sentiment_counts = query.with_entities(
            Feedback.sentiment,
            func.count(Feedback.id)
        ).group_by(Feedback.sentiment).all()
        
        sentiment_dict = {s[0]: s[1] for s in sentiment_counts if s[0]}
        positive = sentiment_dict.get("positive", 0)
        negative = sentiment_dict.get("negative", 0)
        neutral = sentiment_dict.get("neutral", 0)
        
        # Calculate percentages
        total_with_sentiment = positive + negative + neutral
        positive_pct = round((positive / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1)
        negative_pct = round((negative / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1)
        neutral_pct = round((neutral / total_with_sentiment * 100) if total_with_sentiment > 0 else 0, 1)
        
        # Average confidence
        avg_conf = db.query(func.avg(Feedback.sentiment_confidence)).filter(
            and_(Feedback.created_at >= start, Feedback.created_at < end)
        ).scalar() or 0
        
        return {
            "total": total,
            "positive": positive,
            "negative": negative,
            "neutral": neutral,
            "positive_pct": positive_pct,
            "negative_pct": negative_pct,
            "neutral_pct": neutral_pct,
            "avg_confidence": round(avg_conf, 1)
        }
    
    current_stats = get_period_stats(current_start, end_date)
    previous_stats = get_period_stats(previous_start, current_start)
    
    # Calculate changes
    def calc_change(current: float, previous: float) -> dict:
        if previous == 0:
            change = 100 if current > 0 else 0
        else:
            change = round(((current - previous) / previous) * 100, 1)
        return {
            "value": change,
            "direction": "up" if change > 0 else "down" if change < 0 else "same"
        }
    
    return {
        "period_days": days,
        "current_period": {
            "start": current_start.isoformat(),
            "end": end_date.isoformat(),
            "stats": current_stats
        },
        "previous_period": {
            "start": previous_start.isoformat(),
            "end": current_start.isoformat(),
            "stats": previous_stats
        },
        "changes": {
            "total": calc_change(current_stats["total"], previous_stats["total"]),
            "positive": calc_change(current_stats["positive"], previous_stats["positive"]),
            "negative": calc_change(current_stats["negative"], previous_stats["negative"]),
            "neutral": calc_change(current_stats["neutral"], previous_stats["neutral"]),
            "positive_pct": calc_change(current_stats["positive_pct"], previous_stats["positive_pct"]),
            "negative_pct": calc_change(current_stats["negative_pct"], previous_stats["negative_pct"])
        }
    }


@router.get("/nps-score")
async def get_nps_score(
    days: int = Query(30, ge=1, le=365),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    show_all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Net Promoter Score (NPS) based on sentiment.
    Uses feedback_date for accurate filtering.
    
    NPS Mapping for sentiment-based feedback:
    - Positive sentiment = Promoters (score 9-10)
    - Neutral sentiment = Passives (score 7-8)  
    - Negative sentiment = Detractors (score 0-6)
    
    NPS = % Promoters - % Detractors
    """
    # Calculate date range
    use_date_filter = True
    if date_from and date_to:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
    elif show_all:
        use_date_filter = False
        max_date = db.query(func.max(Feedback.feedback_date)).scalar()
        min_date = db.query(func.min(Feedback.feedback_date)).scalar()
        if max_date and min_date:
            end_date = max_date
            start_date = min_date
        else:
            end_date = datetime.utcnow()
            start_date = datetime(2000, 1, 1)
    else:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
    
    # Get sentiment counts for the period using feedback_date
    query = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    )
    
    if use_date_filter or (date_from and date_to):
        query = query.filter(Feedback.feedback_date >= start_date)
        if date_to or not show_all:
            query = query.filter(Feedback.feedback_date <= end_date)
    
    results = query.group_by(Feedback.sentiment).all()
    
    sentiment_dict = {r.sentiment: r.count for r in results if r.sentiment}
    promoters = sentiment_dict.get("positive", 0)  # Positive = Promoters
    passives = sentiment_dict.get("neutral", 0)    # Neutral = Passives
    detractors = sentiment_dict.get("negative", 0) # Negative = Detractors
    total = promoters + passives + detractors
    
    # Calculate NPS
    if total > 0:
        promoter_pct = round((promoters / total) * 100, 1)
        detractor_pct = round((detractors / total) * 100, 1)
        passive_pct = round((passives / total) * 100, 1)
        nps_score = round(promoter_pct - detractor_pct)
    else:
        promoter_pct = detractor_pct = passive_pct = 0
        nps_score = 0
    
    # Previous period for comparison
    period_length = (end_date - start_date).days if use_date_filter else days
    prev_start = start_date - timedelta(days=period_length)
    prev_results = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        and_(Feedback.feedback_date >= prev_start, Feedback.feedback_date < start_date)
    ).group_by(Feedback.sentiment).all()
    
    prev_dict = {r.sentiment: r.count for r in prev_results if r.sentiment}
    prev_promoters = prev_dict.get("positive", 0)
    prev_detractors = prev_dict.get("negative", 0)
    prev_total = sum(prev_dict.values())
    
    if prev_total > 0:
        prev_promoter_pct = (prev_promoters / prev_total) * 100
        prev_detractor_pct = (prev_detractors / prev_total) * 100
        prev_nps = round(prev_promoter_pct - prev_detractor_pct)
    else:
        prev_nps = 0
    
    nps_change = nps_score - prev_nps
    
    # NPS Grade
    if nps_score >= 70:
        grade = "World Class"
    elif nps_score >= 50:
        grade = "Excellent"
    elif nps_score >= 30:
        grade = "Good"
    elif nps_score >= 0:
        grade = "Needs Improvement"
    else:
        grade = "Critical"
    
    return {
        "nps_score": nps_score,
        "previous_nps": prev_nps,
        "change": nps_change,
        "promoters": promoters,
        "passives": passives,
        "detractors": detractors,
        "promoter_pct": promoter_pct,
        "passive_pct": passive_pct,
        "detractor_pct": detractor_pct,
        "total_responses": total,
        "period_days": days,
        "grade": grade,
        "industry_benchmark": 35  # Airline industry average NPS
    }


@router.get("/nps-history")
async def get_nps_history(
    months: int = Query(6, ge=1, le=24),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get NPS score history by month for trend visualization.
    Returns monthly NPS scores calculated independently for each calendar month.
    Always returns a full timeline with all months in the date range.
    
    NPS Calculation (based on sentiment as proxy for ratings):
    - Promoters: positive sentiment (equivalent to ratings 9-10)
    - Detractors: negative sentiment (equivalent to ratings 0-6)
    - Passives: neutral sentiment (equivalent to ratings 7-8)
    - NPS = Promoters% - Detractors%
    """
    from sqlalchemy import extract
    from calendar import monthrange
    from dateutil.relativedelta import relativedelta
    
    history = []
    min_responses_threshold = 5  # Minimum responses needed for valid NPS calculation
    
    # Determine the date range for the timeline
    if date_from and date_to:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except Exception:
            # Fall back to data range
            start_date = None
            end_date = None
    else:
        start_date = None
        end_date = None
    
    # If no date range specified, use actual data range
    if not start_date or not end_date:
        max_date = db.query(func.max(Feedback.feedback_date)).scalar()
        min_date = db.query(func.min(Feedback.feedback_date)).scalar()
        
        if max_date and min_date:
            # Use the last N months from max_date
            end_date = max_date
            start_date = max_date - relativedelta(months=months-1)
            # Align to start of month
            start_date = start_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            # No data at all
            return {
                "history": [],
                "target_nps": 50,
                "industry_benchmark": 35,
                "summary": {
                    "avg_nps": None,
                    "max_nps": None,
                    "min_nps": None,
                    "months_above_target": 0,
                    "total_months": 0,
                    "months_with_data": 0
                }
            }
    
    # Generate full list of months in the timeline
    timeline_months = []
    current = datetime(start_date.year, start_date.month, 1)
    end_month = datetime(end_date.year, end_date.month, 1)
    
    while current <= end_month:
        timeline_months.append({
            'year': current.year,
            'month': current.month,
            'key': f'{current.year}-{current.month:02d}',
            'label': current.strftime("%b %Y")
        })
        current = current + relativedelta(months=1)
    
    # Build query to get actual data grouped by month
    base_query = db.query(
        extract('year', Feedback.feedback_date).label('year'),
        extract('month', Feedback.feedback_date).label('month'),
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        Feedback.feedback_date.isnot(None),
        Feedback.sentiment.isnot(None),
        Feedback.feedback_date >= datetime(start_date.year, start_date.month, 1),
        Feedback.feedback_date <= end_date.replace(hour=23, minute=59, second=59)
    )
    
    # Group by year and month, then by sentiment
    results = base_query.group_by(
        extract('year', Feedback.feedback_date),
        extract('month', Feedback.feedback_date),
        Feedback.sentiment
    ).all()
    
    # Process results into monthly data dictionary
    months_data = {}
    for row in results:
        if row.year is None or row.month is None:
            continue
        year, month = int(row.year), int(row.month)
        key = f'{year}-{month:02d}'
        if key not in months_data:
            months_data[key] = {
                'positive': 0,
                'negative': 0,
                'neutral': 0
            }
        if row.sentiment:
            months_data[key][row.sentiment] = row.count
    
    # Build history with all months in timeline (including those with no data)
    for timeline_month in timeline_months:
        key = timeline_month['key']
        month_label = timeline_month['label']
        
        if key in months_data:
            data = months_data[key]
            promoters = data['positive']
            detractors = data['negative']
            passives = data['neutral']
            total = promoters + detractors + passives
            
            if total >= min_responses_threshold:
                promoters_pct = (promoters / total) * 100
                detractors_pct = (detractors / total) * 100
                nps = round(promoters_pct - detractors_pct)
                has_sufficient_data = True
            elif total > 0:
                promoters_pct = (promoters / total) * 100
                detractors_pct = (detractors / total) * 100
                nps = round(promoters_pct - detractors_pct)
                has_sufficient_data = False
            else:
                promoters_pct = 0
                detractors_pct = 0
                nps = None
                has_sufficient_data = False
            
            history.append({
                "month": month_label,
                "nps": nps,
                "total_responses": total,
                "promoters": promoters,
                "detractors": detractors,
                "passives": passives,
                "promoters_pct": round(promoters_pct, 1),
                "detractors_pct": round(detractors_pct, 1),
                "has_sufficient_data": has_sufficient_data,
                "has_data": True
            })
        else:
            # No data for this month - include it with null values
            history.append({
                "month": month_label,
                "nps": None,
                "total_responses": 0,
                "promoters": 0,
                "detractors": 0,
                "passives": 0,
                "promoters_pct": 0,
                "detractors_pct": 0,
                "has_sufficient_data": False,
                "has_data": False
            })
    
    # Limit to requested number of months (most recent) if needed
    if len(history) > months:
        history = history[-months:]
    
    # Calculate summary statistics
    valid_nps_values = [h["nps"] for h in history if h["nps"] is not None and h["has_sufficient_data"]]
    
    return {
        "history": history,
        "target_nps": 50,
        "industry_benchmark": 35,
        "summary": {
            "avg_nps": round(sum(valid_nps_values) / len(valid_nps_values)) if valid_nps_values else None,
            "max_nps": max(valid_nps_values) if valid_nps_values else None,
            "min_nps": min(valid_nps_values) if valid_nps_values else None,
            "months_above_target": len([v for v in valid_nps_values if v >= 50]),
            "total_months": len(history),
            "months_with_data": len([h for h in history if h["has_data"]])
        }
    }


@router.get("/top-routes")
async def get_top_routes(
    limit: int = Query(10, ge=1, le=20),
    sort_by: str = Query("weighted", regex="^(volume|rating|weighted)$"),
    min_reviews: int = Query(5, ge=1, le=100),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get routes with feedback, ranked by specified criteria.
    
    Ranking Criteria (sort_by parameter):
    - "volume": Most Reviewed Routes - ranked by total number of reviews
    - "rating": Highest Rated Routes - ranked by average rating (with minimum review threshold)
    - "weighted": Best Routes (default) - ranked by Wilson Score (balances rating with sample size)
    
    The weighted score uses a Bayesian approach that:
    - Penalizes routes with few reviews to avoid ranking bias
    - Routes must meet min_reviews threshold for rating-based rankings
    - Considers both positive feedback ratio and sample size confidence
    
    Parameters:
    - sort_by: Ranking method ("volume", "rating", or "weighted")
    - min_reviews: Minimum reviews required for rating-based rankings (default: 5)
    - limit: Maximum number of routes to return
    - date_from/date_to: Optional date range filter
    """
    import math
    
    # Build base query
    query = db.query(
        Feedback.flight_number,
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        Feedback.flight_number.isnot(None),
        Feedback.flight_number != ""
    )
    
    # Apply date filters if provided
    if date_from:
        try:
            start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(Feedback.feedback_date >= start_date)
        except:
            pass
    
    if date_to:
        try:
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            end_date = end_date.replace(hour=23, minute=59, second=59)
            query = query.filter(Feedback.feedback_date <= end_date)
        except:
            pass
    
    results = query.group_by(
        Feedback.flight_number,
        Feedback.sentiment
    ).all()
    
    # Process into route-based format
    routes = {}
    for row in results:
        route = row.flight_number
        if route not in routes:
            routes[route] = {
                "route": route,
                "total": 0,
                "positive": 0,
                "negative": 0,
                "neutral": 0
            }
        routes[route]["total"] += row.count
        if row.sentiment in ["positive", "negative", "neutral"]:
            routes[route][row.sentiment] = row.count
    
    # Calculate metrics for each route
    for route_data in routes.values():
        total = route_data["total"]
        positive = route_data["positive"]
        negative = route_data["negative"]
        
        if total > 0:
            # Calculate sentiment-based rating (1-5 scale)
            # Positive = 5, Neutral = 3, Negative = 1
            weighted_sum = (
                positive * 5 +
                route_data["neutral"] * 3 +
                negative * 1
            )
            avg_rating = weighted_sum / total
            route_data["avg_rating"] = round(avg_rating, 2)
            route_data["positive_pct"] = round((positive / total) * 100, 1)
            route_data["negative_pct"] = round((negative / total) * 100, 1)
            
            # Calculate Wilson Score Lower Bound for ranking
            # This is a statistically sound way to rank items by positive ratio
            # while accounting for sample size uncertainty
            # Formula: Wilson Score Lower Bound at 95% confidence
            p = positive / total  # Positive proportion
            n = total  # Sample size
            z = 1.96  # Z-score for 95% confidence
            
            # Wilson score lower bound formula
            denominator = 1 + (z * z) / n
            center = p + (z * z) / (2 * n)
            spread = z * math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)
            wilson_score = (center - spread) / denominator
            
            route_data["wilson_score"] = round(wilson_score, 4)
            
            # Confidence level based on sample size
            if total >= 50:
                route_data["confidence"] = "high"
            elif total >= min_reviews:
                route_data["confidence"] = "medium"
            else:
                route_data["confidence"] = "low"
            
            # Flag if meets minimum review threshold
            route_data["meets_threshold"] = total >= min_reviews
        else:
            route_data["avg_rating"] = 0
            route_data["positive_pct"] = 0
            route_data["negative_pct"] = 0
            route_data["wilson_score"] = 0
            route_data["confidence"] = "none"
            route_data["meets_threshold"] = False
    
    # Sort based on criteria
    if sort_by == "volume":
        # Most Reviewed Routes - simple count ranking
        sorted_routes = sorted(
            routes.values(),
            key=lambda x: x["total"],
            reverse=True
        )
        ranking_method = "volume"
        ranking_description = "Ranked by total number of reviews"
    elif sort_by == "rating":
        # Highest Rated Routes - filter by min_reviews, then sort by rating
        qualified_routes = [r for r in routes.values() if r["meets_threshold"]]
        unqualified_routes = [r for r in routes.values() if not r["meets_threshold"]]
        
        # Sort qualified by rating, unqualified by volume
        sorted_qualified = sorted(qualified_routes, key=lambda x: x["avg_rating"], reverse=True)
        sorted_unqualified = sorted(unqualified_routes, key=lambda x: x["total"], reverse=True)
        
        # Qualified routes first, then unqualified
        sorted_routes = sorted_qualified + sorted_unqualified
        ranking_method = "rating"
        ranking_description = f"Ranked by average rating (minimum {min_reviews} reviews required)"
    else:  # weighted (default)
        # Best Routes - Wilson Score ranking (statistically sound)
        # Routes with enough reviews are ranked by wilson_score
        # Routes without enough reviews are deprioritized
        qualified_routes = [r for r in routes.values() if r["meets_threshold"]]
        unqualified_routes = [r for r in routes.values() if not r["meets_threshold"]]
        
        sorted_qualified = sorted(qualified_routes, key=lambda x: x["wilson_score"], reverse=True)
        sorted_unqualified = sorted(unqualified_routes, key=lambda x: x["total"], reverse=True)
        
        sorted_routes = sorted_qualified + sorted_unqualified
        ranking_method = "weighted"
        ranking_description = f"Ranked by Wilson Score (balances rating with statistical confidence, minimum {min_reviews} reviews)"
    
    # Limit results
    sorted_routes = sorted_routes[:limit]
    
    return {
        "routes": sorted_routes,
        "ranking_method": ranking_method,
        "ranking_description": ranking_description,
        "min_reviews_threshold": min_reviews,
        "total_routes_analyzed": len(routes)
    }
