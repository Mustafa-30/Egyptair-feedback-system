import sys
sys.path.insert(0, '.')

# Use the GLOBAL instance, not create a new one
from app.services.sentiment_service import sentiment_analyzer

print('Using GLOBAL sentiment_analyzer instance:')
print(f'  arabic_pipeline is not None: {sentiment_analyzer.arabic_pipeline is not None}')
print(f'  english_pipeline is not None: {sentiment_analyzer.english_pipeline is not None}')

# Test with global instance
tests = [
    ('الرحلة كانت عادية ومقبولة، لا شيء مميز', 'neutral'),
    ('الطعام المقدم كان بارداً وسيء الطعم', 'negative'),
    ('الرحلة كانت مخيبة للآمال جداً', 'negative'),
]

print('\nTesting Arabic sentiment analysis:')
print('=' * 80)

for text, expected in tests:
    result = sentiment_analyzer.analyze(text)
    sentiment = result['sentiment']
    confidence = result['confidence']
    match = "✓" if sentiment == expected else "✗"
    print(f"{match} Expected: {expected:8} | Got: {sentiment:8} ({confidence}%) | {text[:40]}...")
