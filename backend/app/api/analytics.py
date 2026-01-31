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
            # Make end_date inclusive (end of day)
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
    else:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
    
    # Base query with date filter - use feedback_date instead of created_at
    # feedback_date is the actual date from the uploaded file
    query = db.query(Feedback).filter(Feedback.feedback_date >= start_date)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get top complaint categories from negative feedback
    Extracts common keywords/themes from complaint texts
    """
    # Get negative feedback texts
    negative_feedback = db.query(Feedback.text, Feedback.feedback_type).filter(
        Feedback.sentiment == "negative"
    ).limit(500).all()
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Customer Satisfaction (CSAT) score based on positive feedback ratio
    CSAT = (Positive Feedback / Total Feedback) * 100
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get sentiment counts for the period
    results = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        Feedback.created_at >= start_date
    ).group_by(Feedback.sentiment).all()
    
    sentiment_dict = {r.sentiment: r.count for r in results if r.sentiment}
    positive = sentiment_dict.get("positive", 0)
    negative = sentiment_dict.get("negative", 0)
    neutral = sentiment_dict.get("neutral", 0)
    total = positive + negative + neutral
    
    # CSAT calculation (positive feedback percentage)
    csat_score = round((positive / total * 100) if total > 0 else 0, 1)
    
    # Previous period for comparison
    prev_start = start_date - timedelta(days=days)
    prev_results = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        and_(Feedback.created_at >= prev_start, Feedback.created_at < start_date)
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
        "period_days": days,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Net Promoter Score (NPS) based on sentiment.
    
    NPS Mapping for sentiment-based feedback:
    - Positive sentiment = Promoters (score 9-10)
    - Neutral sentiment = Passives (score 7-8)  
    - Negative sentiment = Detractors (score 0-6)
    
    NPS = % Promoters - % Detractors
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get sentiment counts for the period
    results = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        Feedback.created_at >= start_date
    ).group_by(Feedback.sentiment).all()
    
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
    prev_start = start_date - timedelta(days=days)
    prev_results = db.query(
        Feedback.sentiment,
        func.count(Feedback.id).label('count')
    ).filter(
        and_(Feedback.created_at >= prev_start, Feedback.created_at < start_date)
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
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get NPS score history by month for trend visualization.
    Returns monthly NPS scores for the specified number of months.
    """
    end_date = datetime.utcnow()
    history = []
    
    for i in range(months - 1, -1, -1):
        # Calculate month boundaries
        month_end = end_date - timedelta(days=i * 30)
        month_start = month_end - timedelta(days=30)
        
        # Get sentiment counts for this month
        results = db.query(
            Feedback.sentiment,
            func.count(Feedback.id).label('count')
        ).filter(
            and_(Feedback.created_at >= month_start, Feedback.created_at < month_end)
        ).group_by(Feedback.sentiment).all()
        
        sentiment_dict = {r.sentiment: r.count for r in results if r.sentiment}
        promoters = sentiment_dict.get("positive", 0)
        detractors = sentiment_dict.get("negative", 0)
        total = sum(sentiment_dict.values())
        
        if total > 0:
            nps = round(((promoters / total) * 100) - ((detractors / total) * 100))
        else:
            nps = 0
        
        # Format month label
        month_label = month_end.strftime("%b %Y")
        
        history.append({
            "month": month_label,
            "nps": nps,
            "total_responses": total,
            "promoters": promoters,
            "detractors": detractors
        })
    
    return {
        "history": history,
        "target_nps": 50,  # Target NPS score
        "industry_benchmark": 35
    }


@router.get("/top-routes")
async def get_top_routes(
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get top routes with most feedback, including sentiment breakdown and average rating.
    Enhanced version of feedback-by-route with more useful metrics.
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
    
    # Calculate average rating and sentiment score for each route
    for route_data in routes.values():
        total = route_data["total"]
        if total > 0:
            # Calculate sentiment-based rating (1-5 scale)
            # Positive = 5, Neutral = 3, Negative = 1
            weighted_sum = (
                route_data["positive"] * 5 +
                route_data["neutral"] * 3 +
                route_data["negative"] * 1
            )
            route_data["avg_rating"] = round(weighted_sum / total, 1)
            route_data["positive_pct"] = round((route_data["positive"] / total) * 100, 1)
            route_data["negative_pct"] = round((route_data["negative"] / total) * 100, 1)
        else:
            route_data["avg_rating"] = 0
            route_data["positive_pct"] = 0
            route_data["negative_pct"] = 0
    
    # Sort by total feedback count and get top N
    sorted_routes = sorted(
        routes.values(),
        key=lambda x: x["total"],
        reverse=True
    )[:limit]
    
    return sorted_routes
