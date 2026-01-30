"""
Re-analyze all feedbacks in the database with the improved sentiment analyzer.
This will update sentiment, confidence, and model version for all feedbacks.
"""
import sqlite3
import sys
from datetime import datetime

sys.path.insert(0, '.')

# Use the GLOBAL instance with loaded ML models
from app.services.sentiment_service import sentiment_analyzer

def reanalyze_all_feedbacks():
    print("=" * 80)
    print("🔄 RE-ANALYZING ALL FEEDBACKS WITH IMPROVED SENTIMENT MODEL")
    print("=" * 80)
    
    # Use global analyzer with loaded ML models
    analyzer = sentiment_analyzer
    
    # Connect to database
    conn = sqlite3.connect('egyptair.db')
    cursor = conn.cursor()
    
    # Get all feedbacks
    cursor.execute('SELECT id, text FROM feedbacks')
    feedbacks = cursor.fetchall()
    
    total = len(feedbacks)
    print(f"\n📊 Total feedbacks to re-analyze: {total}")
    
    # Track statistics
    updated = 0
    sentiment_changes = {'positive': 0, 'negative': 0, 'neutral': 0}
    sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
    errors = 0
    
    print("\n⏳ Processing...")
    
    for i, (fid, text) in enumerate(feedbacks):
        try:
            if not text:
                continue
            
            # Analyze with ML model
            result = analyzer.analyze(text)
            
            sentiment = result['sentiment']
            confidence = result['confidence']
            language = result['language']
            model_version = result['model_version']
            preprocessed = result.get('preprocessed_text', '')
            
            # Update in database
            cursor.execute('''
                UPDATE feedbacks 
                SET sentiment = ?, 
                    sentiment_confidence = ?, 
                    language = ?,
                    model_version = ?,
                    preprocessed_text = ?,
                    analyzed_at = ?
                WHERE id = ?
            ''', (sentiment, confidence, language, model_version, preprocessed, 
                  datetime.utcnow().isoformat(), fid))
            
            sentiment_counts[sentiment] += 1
            updated += 1
            
            # Progress update
            if (i + 1) % 100 == 0 or (i + 1) == total:
                print(f"   Processed {i + 1}/{total} feedbacks...")
                
        except Exception as e:
            errors += 1
            print(f"   ⚠️ Error processing ID {fid}: {e}")
    
    # Commit changes
    conn.commit()
    conn.close()
    
    # Print summary
    print("\n" + "=" * 80)
    print("✅ RE-ANALYSIS COMPLETE!")
    print("=" * 80)
    print(f"\n📊 Results:")
    print(f"   Total processed: {updated}")
    print(f"   Errors: {errors}")
    print(f"\n📈 New Sentiment Distribution:")
    print(f"   POSITIVE: {sentiment_counts['positive']} ({sentiment_counts['positive']/total*100:.1f}%)")
    print(f"   NEGATIVE: {sentiment_counts['negative']} ({sentiment_counts['negative']/total*100:.1f}%)")
    print(f"   NEUTRAL:  {sentiment_counts['neutral']} ({sentiment_counts['neutral']/total*100:.1f}%)")
    print("\n✅ All feedbacks have been re-analyzed with the improved ML model!")

if __name__ == "__main__":
    reanalyze_all_feedbacks()
