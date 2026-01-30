import sqlite3
import sys
sys.path.insert(0, '.')
from app.services.sentiment_service import SentimentAnalyzer

analyzer = SentimentAnalyzer()

conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()

# Find feedbacks with strong negative words that might be misclassified
cursor.execute("""
    SELECT id, text, sentiment, sentiment_confidence 
    FROM feedbacks 
    WHERE (
        text LIKE '%disappointed%' 
        OR text LIKE '%terrible%' 
        OR text LIKE '%awful%' 
        OR text LIKE '%poor%' 
        OR text LIKE '%worst%'
        OR text LIKE '%rude%'
        OR text LIKE '%never again%'
    ) 
    AND sentiment != 'negative'
    LIMIT 20
""")
rows = cursor.fetchall()

print("=" * 120)
print("FEEDBACKS WITH NEGATIVE WORDS BUT NOT CLASSIFIED AS NEGATIVE")
print("=" * 120)

for row in rows:
    fid, text, current_sent, conf = row
    # Re-analyze
    result = analyzer.analyze(text)
    new_sent = result['sentiment']
    new_conf = result['confidence']
    
    print(f"\nID {fid}: Current={current_sent.upper()} ({conf}%) -> Re-analyzed={new_sent.upper()} ({new_conf}%)")
    print(f"Text: {text[:200]}...")
    print("-" * 100)

conn.close()

print("\n\n")
print("=" * 120)
print("FEEDBACKS WITH STRONG POSITIVE WORDS NOT CLASSIFIED AS POSITIVE")
print("=" * 120)

conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()
cursor.execute("""
    SELECT id, text, sentiment, sentiment_confidence 
    FROM feedbacks 
    WHERE (
        text LIKE '%excellent%' 
        OR text LIKE '%amazing%' 
        OR text LIKE '%wonderful%' 
        OR text LIKE '%fantastic%' 
        OR text LIKE '%love%'
    ) 
    AND sentiment != 'positive'
    LIMIT 20
""")
rows = cursor.fetchall()

for row in rows:
    fid, text, current_sent, conf = row
    # Re-analyze
    result = analyzer.analyze(text)
    new_sent = result['sentiment']
    new_conf = result['confidence']
    
    print(f"\nID {fid}: Current={current_sent.upper()} ({conf}%) -> Re-analyzed={new_sent.upper()} ({new_conf}%)")
    print(f"Text: {text[:200]}...")
    print("-" * 100)

conn.close()
