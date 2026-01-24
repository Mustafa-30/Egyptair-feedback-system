"""
Script to re-analyze all existing feedback with improved sentiment analysis.
Run with: python reanalyze_feedback.py
"""
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, '.')

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.feedback import Feedback
from app.services.sentiment_service import sentiment_analyzer, ML_AVAILABLE

def reanalyze_all_feedback():
    print("=" * 70)
    print("RE-ANALYZING ALL FEEDBACK WITH IMPROVED SENTIMENT ANALYSIS")
    print("=" * 70)
    
    print(f"\nML Available: {ML_AVAILABLE}")
    print(f"Model Version: {sentiment_analyzer.model_version}")
    
    # Check if ML is loaded
    ml_loaded = (
        (hasattr(sentiment_analyzer, 'english_pipeline') and sentiment_analyzer.english_pipeline is not None) or
        (hasattr(sentiment_analyzer, 'arabic_pipeline') and sentiment_analyzer.arabic_pipeline is not None)
    )
    print(f"ML Models Loaded: {ml_loaded}")
    
    if not ml_loaded and ML_AVAILABLE:
        print("\n[INFO] Loading ML models...")
        sentiment_analyzer.load_model()
    
    db = SessionLocal()
    
    try:
        # Get all feedback
        feedbacks = db.query(Feedback).all()
        total = len(feedbacks)
        
        print(f"\n[INFO] Found {total} feedback entries to analyze")
        print("-" * 70)
        
        updated_count = 0
        changed_positive = 0
        changed_negative = 0
        changed_neutral = 0
        
        for i, fb in enumerate(feedbacks):
            if not fb.text:
                continue
            
            # Re-analyze with improved system
            result = sentiment_analyzer.analyze(fb.text)
            
            new_sentiment = result['sentiment']
            new_confidence = result['confidence']
            new_language = result['language']
            
            # Check if changed
            old_sentiment = fb.sentiment
            old_confidence = fb.sentiment_confidence or 0
            changed = (
                old_sentiment != new_sentiment or 
                abs(old_confidence - new_confidence) > 5
            )
            
            if changed:
                # Track changes
                if new_sentiment == 'positive':
                    changed_positive += 1
                elif new_sentiment == 'negative':
                    changed_negative += 1
                else:
                    changed_neutral += 1
                
                # Show significant changes
                if old_sentiment != new_sentiment:
                    text_preview = fb.text[:60] + "..." if len(fb.text) > 60 else fb.text
                    print(f"[{i+1}/{total}] ID {fb.id}: {old_sentiment} -> {new_sentiment}")
                    print(f"         Text: {text_preview}")
                    print(f"         Confidence: {old_confidence}% -> {new_confidence}%")
                    print()
                
                # Update database
                fb.sentiment = new_sentiment
                fb.sentiment_confidence = new_confidence
                fb.language = new_language
                updated_count += 1
            
            # Progress indicator
            if (i + 1) % 100 == 0:
                print(f"[PROGRESS] Processed {i+1}/{total} entries...")
        
        # Commit changes
        db.commit()
        
        print("-" * 70)
        print(f"\n[COMPLETE] Re-analysis finished!")
        print(f"  Total feedback: {total}")
        print(f"  Updated: {updated_count}")
        print(f"  Changed to POSITIVE: {changed_positive}")
        print(f"  Changed to NEGATIVE: {changed_negative}")
        print(f"  Changed to NEUTRAL: {changed_neutral}")
        print(f"  Unchanged: {total - updated_count}")
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reanalyze_all_feedback()
