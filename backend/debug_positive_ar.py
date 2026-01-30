import sys
sys.path.insert(0, '.')
from app.services.sentiment_service import sentiment_analyzer

# This is a clearly POSITIVE feedback
text = '''كان السفر مع مصر للطيران تجربة رائعة جداً، حيث كان طاقم الكابين محترفاً وودوداً جداً ولم يتردد في تلبية جميع احتياجاتنا. الطعام المقدم على الرحلة كان طازجاً وذا جودة عالية، والمقاعد كانت مريحة جداً مما جعل الرحلة ممتعة. بشكل عام، أنصح بشدة بالسفر مع مصر للطيران لأنها توفر خدمة فندقية ممتازة.'''

result = sentiment_analyzer.analyze(text)
print(f'Result: {result["sentiment"]} ({result["confidence"]}%)')
print(f'Expected: POSITIVE')
print(f'Match: {"✓ CORRECT!" if result["sentiment"] == "positive" else "✗ WRONG!"}')

