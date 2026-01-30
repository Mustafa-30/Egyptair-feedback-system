import sqlite3

conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()

# Get English feedback samples
cursor.execute('''
    SELECT id, text, sentiment, sentiment_confidence, language 
    FROM feedbacks 
    ORDER BY id 
    LIMIT 50
''')
rows = cursor.fetchall()

print("=" * 140)
print("CURRENT FEEDBACK ANALYSIS RESULTS")
print("=" * 140)
print(f"{'ID':4} | {'Sentiment':10} | {'Conf':5} | {'Lang':6} | Feedback Text")
print("-" * 140)

for row in rows:
    fid = row[0]
    text = row[1][:95] if row[1] and len(row[1]) > 95 else (row[1] or 'N/A')
    sentiment = row[2] or 'N/A'
    conf = row[3] if row[3] else 0
    lang = row[4] if row[4] else 'N/A'
    print(f"{fid:4} | {sentiment:10} | {conf:4.0f}% | {lang:6} | {text}")

conn.close()

print("\n" + "=" * 140)
print("Now let's test if re-analysis would give different results...")
print("=" * 140)

# Test re-analysis on some samples
import sys
sys.path.insert(0, '.')
from app.services.sentiment_service import SentimentAnalyzer

analyzer = SentimentAnalyzer()

# Get a few samples to re-analyze
conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()
cursor.execute('SELECT id, text, sentiment FROM feedbacks LIMIT 15')
samples = cursor.fetchall()
conn.close()

print(f"\n{'ID':4} | {'Current':10} | {'Re-Analyzed':10} | {'Conf':5} | {'Match':5} | Text")
print("-" * 140)

mismatches = 0
for sample in samples:
    fid, text, current_sentiment = sample
    if text:
        result = analyzer.analyze(text)
        new_sentiment = result['sentiment']
        confidence = result['confidence']
        match = "✓" if new_sentiment.upper() == (current_sentiment or '').upper() else "✗"
        if match == "✗":
            mismatches += 1
        short_text = text[:80] if len(text) > 80 else text
        print(f"{fid:4} | {current_sentiment or 'N/A':10} | {new_sentiment:10} | {confidence:4.0f}% | {match:5} | {short_text}")

print(f"\n📊 Mismatches: {mismatches}/{len(samples)}")
