"""
File Upload API Routes
Updated to create FeedbackFile records matching the ER Diagram
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.feedback import Feedback
from app.models.feedback_file import FeedbackFile, FileStatus
from app.services.upload_service import upload_service
from app.services.sentiment_service import sentiment_analyzer

router = APIRouter()


@router.post("/preview")
async def preview_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Preview uploaded file without saving to database
    """
    # Validate file
    upload_service.validate_file(file)
    
    # Read file
    df = await upload_service.read_file(file)
    
    # Validate structure
    info = upload_service.validate_dataframe(df)
    
    return {
        "filename": file.filename,
        "total_rows": info["total_rows"],
        "columns": info["columns"],
        "text_column": info["text_column"],
        "sample_data": info["sample_data"]
    }


@router.post("/process")
async def process_upload(
    file: UploadFile = File(...),
    text_column: Optional[str] = Query(None, description="Column containing feedback text"),
    analyze_sentiment: bool = Query(True, description="Analyze sentiment for each row"),
    save_to_db: bool = Query(True, description="Save processed data to database"),
    overwrite_duplicates: bool = Query(False, description="Remove duplicate feedback before inserting"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process uploaded file and optionally save to database
    Now creates FeedbackFile record to match ER Diagram
    """
    # Validate file
    upload_service.validate_file(file)
    
    # Read file
    df = await upload_service.read_file(file)
    
    # Validate structure
    info = upload_service.validate_dataframe(df)
    
    # Determine file type from extension
    file_ext = os.path.splitext(file.filename)[1].lower().replace('.', '')
    
    # Create FeedbackFile record - matches diagram entity
    feedback_file = FeedbackFile(
        file_name=file.filename,
        file_type=file_ext,
        file_size=file.size if hasattr(file, 'size') else None,
        upload_date=datetime.utcnow(),
        status=FileStatus.PROCESSING.value,
        total_rows=len(df),
        processed_rows=0,
        success_count=0,
        error_count=0,
        user_id=current_user.id,
        processing_started_at=datetime.utcnow()
    )
    
    if save_to_db:
        db.add(feedback_file)
        db.commit()
        db.refresh(feedback_file)
    
    # Use provided text column or detected one
    text_col = text_column or info["text_column"]
    
    # Process data
    processed_data = upload_service.process_feedback_data(
        df,
        text_col,
        analyze_sentiment=analyze_sentiment
    )
    
    # ============================================================
    # DUPLICATE HANDLING - ALWAYS CHECK, NEVER INSERT DUPLICATES
    # ============================================================
    
    # Step 1: Get all existing feedback texts from database
    existing_feedback = db.query(Feedback).all()
    existing_texts_map = {f.text.strip().lower(): f for f in existing_feedback}
    
    # Step 2: Also track duplicates within the uploaded file itself
    seen_in_upload = set()
    unique_items = []
    duplicates_in_file = 0
    
    for item in processed_data:
        text_normalized = item["text"].strip().lower()
        
        # Skip if we've already seen this text in the current upload
        if text_normalized in seen_in_upload:
            duplicates_in_file += 1
            continue
        
        seen_in_upload.add(text_normalized)
        unique_items.append(item)
    
    # Step 3: Handle duplicates with existing database entries
    duplicates_removed = 0
    duplicates_skipped = 0
    items_to_insert = []
    
    for item in unique_items:
        text_normalized = item["text"].strip().lower()
        
        if text_normalized in existing_texts_map:
            if overwrite_duplicates:
                # Delete old entry - will be replaced with new one
                old_feedback = existing_texts_map[text_normalized]
                db.delete(old_feedback)
                duplicates_removed += 1
                items_to_insert.append(item)
            else:
                # Skip this item - keep old entry
                duplicates_skipped += 1
        else:
            # New unique feedback - add it
            items_to_insert.append(item)
    
    # Commit deletions before inserting
    if duplicates_removed > 0:
        db.commit()
        print(f"[INFO] Removed {duplicates_removed} duplicate entries (will be replaced)")
    
    if duplicates_skipped > 0:
        print(f"[INFO] Skipped {duplicates_skipped} duplicates (kept existing entries)")
    
    if duplicates_in_file > 0:
        print(f"[INFO] Skipped {duplicates_in_file} duplicates within uploaded file")
    
    # ============================================================
    # SAVE TO DATABASE - Only insert unique, non-duplicate items
    # ============================================================
    saved_count = 0
    errors = []
    
    if save_to_db:
        for idx, item in enumerate(items_to_insert):
            try:
                feedback = Feedback(
                    customer_name=item.get("customer_name"),
                    customer_email=item.get("customer_email"),
                    flight_number=item.get("flight_number"),
                    text=item["text"],
                    preprocessed_text=item.get("preprocessed_text"),
                    sentiment=item.get("sentiment"),
                    sentiment_confidence=item.get("sentiment_confidence"),
                    language=item.get("language", "EN"),
                    feedback_date=datetime.fromisoformat(item["feedback_date"]) if item.get("feedback_date") else None,
                    analyzed_at=datetime.fromisoformat(item["analyzed_at"]) if item.get("analyzed_at") else None,
                    model_version=item.get("model_version"),
                    source="upload",
                    status="pending",
                    priority=item.get("priority", "medium"),
                    created_by=current_user.id,
                    file_id=feedback_file.file_id  # Link to FeedbackFile
                )
                db.add(feedback)
                saved_count += 1
            except Exception as e:
                errors.append({"row": idx + 1, "error": str(e)})
        
        # Update FeedbackFile with processing results
        feedback_file.processed_rows = len(processed_data)
        feedback_file.success_count = saved_count
        feedback_file.error_count = len(errors)
        feedback_file.status = FileStatus.COMPLETED.value if not errors else FileStatus.COMPLETED.value
        feedback_file.processing_completed_at = datetime.utcnow()
        
        if errors:
            feedback_file.error_message = f"Errors in {len(errors)} rows: {errors[0]['error'][:100]}..."
        
        db.commit()
    
    return {
        "file_id": feedback_file.file_id if save_to_db else None,
        "filename": file.filename,
        "total_rows": len(df),
        "processed_count": len(processed_data),
        "unique_count": len(unique_items),
        "saved_count": saved_count,
        "error_count": len(errors),
        "duplicates_removed": duplicates_removed,
        "duplicates_skipped": duplicates_skipped,
        "duplicates_in_file": duplicates_in_file,
        "errors": errors[:10] if errors else [],  # Return first 10 errors
        "sample_results": items_to_insert[:5] if items_to_insert else []
    }


@router.post("/analyze-batch")
async def analyze_batch(
    file: UploadFile = File(...),
    text_column: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze sentiment for uploaded file without saving
    """
    # Validate file
    upload_service.validate_file(file)
    
    # Read file
    df = await upload_service.read_file(file)
    
    # Validate structure
    info = upload_service.validate_dataframe(df)
    
    # Use provided text column or detected one
    text_col = text_column or info["text_column"]
    
    # Get texts to analyze
    texts = df[text_col].dropna().astype(str).tolist()
    
    # Analyze batch
    results = sentiment_analyzer.analyze_batch(texts)
    
    # Calculate summary
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    total_confidence = 0
    
    for r in results:
        sentiment_counts[r["sentiment"]] += 1
        total_confidence += r["confidence"]
    
    avg_confidence = total_confidence / len(results) if results else 0
    
    return {
        "filename": file.filename,
        "total_analyzed": len(results),
        "summary": {
            "positive": sentiment_counts["positive"],
            "negative": sentiment_counts["negative"],
            "neutral": sentiment_counts["neutral"],
            "positive_percentage": round(sentiment_counts["positive"] / len(results) * 100, 1) if results else 0,
            "negative_percentage": round(sentiment_counts["negative"] / len(results) * 100, 1) if results else 0,
            "neutral_percentage": round(sentiment_counts["neutral"] / len(results) * 100, 1) if results else 0,
            "average_confidence": round(avg_confidence, 1)
        },
        "sample_results": results[:10]
    }
