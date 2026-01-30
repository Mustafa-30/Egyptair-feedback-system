import sqlite3
import sys
sys.path.insert(0, '.')

# Use the GLOBAL instance with loaded ML models
from app.services.sentiment_service import sentiment_analyzer

analyzer = sentiment_analyzer

conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()

# Get Arabic feedbacks
cursor.execute("SELECT id, text, sentiment, sentiment_confidence FROM feedbacks WHERE language = 'AR' LIMIT 30")
rows = cursor.fetchall()

print("=" * 120)
print("ARABIC FEEDBACK CURRENT ANALYSIS")
print("=" * 120)

for row in rows:
    fid, text, sentiment, conf = row
    short_text = text[:70] if text else 'N/A'
    print(f"ID {fid:3} | {sentiment:10} | {conf:4.0f}% | {short_text}...")

print("\n\n")
print("=" * 120)
print("TESTING ARABIC SENTIMENT ANALYSIS")
print("=" * 120)

# Test specific Arabic samples
test_cases = [
    ("تجربة سيئة جداً مع مصر للطيران، الطعام كان بارداً وغير شهي", "negative"),
    ("كان السفر مع مصر للطيران تجربة رائعة جداً، الطاقم كان محترفاً", "positive"),
    ("الرحلة كانت عادية ومقبولة، لا شيء مميز", "neutral"),
    ("الخدمة ممتازة والطاقم محترف جداً", "positive"),
    ("الطعام المقدم كان بارداً وسيء الطعم", "negative"),
    ("الرحلة كانت مخيبة للآمال جداً", "negative"),
    ("تجربة رائعة وسأكررها بالتأكيد", "positive"),
    ("الخدمة ليست جيدة والطاقم غير متعاون", "negative"),
    ("رحلة عادية جداً، متوسطة المستوى", "neutral"),
    ("أسوأ تجربة طيران في حياتي", "negative"),
]

print(f"\n{'Expected':10} | {'Got':10} | {'Conf':5} | {'Match':5} | Text")
print("-" * 100)

correct = 0
for text, expected in test_cases:
    result = analyzer.analyze(text)
    got = result['sentiment']
    conf = result['confidence']
    match = "✓" if got == expected else "✗"
    if got == expected:
        correct += 1
    print(f"{expected:10} | {got:10} | {conf:4.0f}% | {match:5} | {text[:50]}...")

print(f"\n📊 Arabic Accuracy: {correct}/{len(test_cases)} ({correct/len(test_cases)*100:.0f}%)")

conn.close()
