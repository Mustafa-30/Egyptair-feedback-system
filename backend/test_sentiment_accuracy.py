"""
Test Sentiment Analysis Accuracy
Run this script to verify ML models are working correctly
"""
import sys
sys.path.append('.')

from app.services.sentiment_service import sentiment_analyzer

# Test cases covering various scenarios
test_cases = [
    # Positive feedback
    ("The flight was excellent and the staff were very helpful", "positive"),
    ("Great service! I really enjoyed my experience", "positive"),
    ("الخدمة ممتازة والطاقم محترف جداً", "positive"),
    ("رحلة رائعة وخدمة متميزة", "positive"),
    
    # Negative feedback
    ("The flight was terrible and delayed for hours", "negative"),
    ("Worst experience ever, will never fly again", "negative"),
    ("الخدمة سيئة جداً والطائرة متأخرة", "negative"),
    ("تجربة فظيعة وخدمة ضعيفة", "negative"),
    
    # Negated positive (should be negative)
    ("The flight was not good at all", "negative"),
    ("I don't like this service", "negative"),
    ("The staff were not helpful", "negative"),
    ("Never recommend this airline", "negative"),
    ("الخدمة ليست جيدة", "negative"),
    ("لم تكن الرحلة مريحة", "negative"),
    
    # ========== EXPANDED NEUTRAL TEST CASES ==========
    # Basic neutral words
    ("The flight was okay, nothing special", "neutral"),
    ("Average service, could be better", "neutral"),
    ("الرحلة عادية", "neutral"),
    
    # "Fine/Decent" patterns
    ("It was fine, nothing to complain about", "neutral"),
    ("Decent flight, just average really", "neutral"),
    ("The service was acceptable", "neutral"),
    
    # "Not bad/Not great" patterns
    ("Not bad, not great either", "neutral"),
    ("It wasn't terrible but it wasn't amazing", "neutral"),
    
    # Expectation-based neutral
    ("Met my expectations, nothing more nothing less", "neutral"),
    ("As expected, standard service", "neutral"),
    ("Nothing special about this flight", "neutral"),
    
    # Hedging language
    ("I guess it was okay", "neutral"),
    ("The flight was just fine", "neutral"),
    
    # "Could be better" patterns
    ("Could be better, but overall acceptable", "neutral"),
    ("Room for improvement but not terrible", "neutral"),
    
    # Balanced statements
    ("No complaints, did the job", "neutral"),
    ("Can't complain, got me there safely", "neutral"),
    
    # Arabic neutral patterns
    ("الخدمة لا بأس بها", "neutral"),
    ("رحلة معقولة", "neutral"),
    ("الطائرة كانت عادية جداً", "neutral"),
    ("كالمتوقع، لا شيء مميز", "neutral"),
    
    # ========== MIXED SENTIMENT (→ NEUTRAL) ==========
    ("Good flight but bad food", "neutral"),
    ("Staff was nice but the delay was unacceptable", "neutral"),
    ("The crew was friendly however the seats were uncomfortable", "neutral"),
    ("Nice plane but terrible service", "neutral"),
]

print("=" * 80)
print("SENTIMENT ANALYSIS TEST - ML MODELS")
print("=" * 80)
print()

# Check if ML models are loaded
print("[CHECK] Checking ML Models...")
if hasattr(sentiment_analyzer, 'english_pipeline') and sentiment_analyzer.english_pipeline:
    print("[OK] English ML Model: LOADED")
else:
    print("[FAIL] English ML Model: NOT LOADED")

if hasattr(sentiment_analyzer, 'arabic_pipeline') and sentiment_analyzer.arabic_pipeline:
    print("[OK] Arabic ML Model: LOADED")
else:
    print("[FAIL] Arabic ML Model: NOT LOADED")

print()
print("=" * 80)
print("TESTING SENTIMENT ANALYSIS (use_ml=True)")
print("=" * 80)
print()

correct = 0
total = len(test_cases)

for text, expected_sentiment in test_cases:
    result = sentiment_analyzer.analyze(text, use_ml=True)
    predicted = result['sentiment']
    confidence = result['confidence']
    language = result['language']
    
    is_correct = predicted == expected_sentiment
    if is_correct:
        correct += 1
        status = "[OK]"
    else:
        status = "[FAIL]"
    
    print(f"{status} [{language}] {predicted.upper()} ({confidence}%) | Expected: {expected_sentiment.upper()}")
    print(f"   Text: {text[:70]}...")
    
    if result.get('has_negation'):
        print(f"   [!] Negation detected: {result.get('negated_words', [])}")
    
    print()

print("=" * 80)
print(f"ACCURACY: {correct}/{total} = {(correct/total)*100:.1f}%")
print("=" * 80)

if correct / total >= 0.85:
    print("[EXCELLENT] Sentiment analysis is working very well!")
elif correct / total >= 0.70:
    print("[GOOD] Could be improved. Consider fine-tuning.")
else:
    print("[POOR] Check if ML models are properly loaded.")

print()
print("Tips to improve accuracy:")
print("   1. Make sure ML models are loaded (check output above)")
print("   2. For Arabic: CAMeL model should be loaded")
print("   3. For English: DistilBERT model should be loaded")
print("   4. Negation handling is crucial for accuracy")
print()
