import sys
sys.path.insert(0, '.')
from app.services.sentiment_service import SentimentAnalyzer
analyzer = SentimentAnalyzer()

tests = [
    ('الرحلة كانت عادية ومقبولة، لا شيء مميز', 'neutral'),
    ('الطعام المقدم كان بارداً وسيء الطعم', 'negative'),
    ('الرحلة كانت مخيبة للآمال جداً', 'negative'),
]

print("=" * 80)
print("DEBUGGING ARABIC SENTIMENT")
print("=" * 80)

for text, expected in tests:
    # Check language detection
    lang = analyzer.detect_language(text)
    print(f"\nText: {text}")
    print(f"Detected Language: {lang}")
    
    result = analyzer.analyze(text)
    sentiment = result['sentiment']
    confidence = result['confidence']
    
    print(f"Expected: {expected} | Got: {sentiment} ({confidence}%)")
    
    # Check which keywords are found
    checks = []
    if 'عادي' in text: checks.append('عادي')
    if 'عادية' in text: checks.append('عادية')
    if 'مقبول' in text: checks.append('مقبول')
    if 'مقبولة' in text: checks.append('مقبولة')
    if 'بارد' in text: checks.append('بارد')
    if 'باردة' in text: checks.append('باردة')
    if 'بارداً' in text: checks.append('بارداً')
    if 'سيء' in text: checks.append('سيء')
    if 'سيئ' in text: checks.append('سيئ')
    if 'مخيب' in text: checks.append('مخيب')
    if 'مخيبة' in text: checks.append('مخيبة')
    if 'للآمال' in text: checks.append('للآمال')
    if 'رائع' in text: checks.append('رائع')
    if 'رائعة' in text: checks.append('رائعة')
    if 'ممتاز' in text: checks.append('ممتاز')
    
    print(f"Keywords found: {checks}")
    
    # Now test verify function directly
    test_sent, test_conf = analyzer._verify_arabic_sentiment(text, 'neutral', 0.5)
    print(f"Direct verify call: {test_sent} ({test_conf*100:.0f}%)")
    
    match = "✓ CORRECT" if sentiment == expected else "✗ WRONG"
    print(f"Result: {match}")
