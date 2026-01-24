"""
Test script for the enhanced sentiment analysis
Run with: python test_sentiment.py
"""
import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, '.')

from app.services.sentiment_service import sentiment_analyzer, ML_AVAILABLE

def test_sentiment():
    print("=" * 60)
    print("🧪 SENTIMENT ANALYSIS TEST")
    print("=" * 60)
    print(f"\n📊 ML Libraries Available: {ML_AVAILABLE}")
    print(f"📊 Model Version: {sentiment_analyzer.model_version}")
    
    # Test cases - including negation patterns
    test_cases = [
        # Negation tests (should be NEGATIVE)
        ("The service was not good", "negative", "Negation test"),
        ("I don't like this airline", "negative", "Contraction negation"),
        ("Flight was not comfortable at all", "negative", "Double negation emphasis"),
        ("The staff wasn't helpful", "negative", "wasn't negation"),
        ("Never flying with them again", "negative", "Never negation"),
        ("The food was not bad", "neutral/positive", "Double negative"),
        
        # Expanded negative words
        ("The seats were cramped and limited legroom", "negative", "Cramped/limited"),
        ("Very crowded and uncomfortable", "negative", "Crowded"),
        ("The flight was delayed for 3 hours", "negative", "Delayed"),
        ("Mediocre service, nothing special", "negative", "Mediocre"),
        
        # Neutral words
        ("The flight was okay, nothing special", "neutral", "Okay neutral"),
        ("Average experience overall", "neutral", "Average"),
        ("It was alright I guess", "neutral", "Alright"),
        
        # Positive tests
        ("Excellent service and friendly staff!", "positive", "Clear positive"),
        ("I really love this airline", "positive", "Love positive"),
        ("Very comfortable and spacious seats", "positive", "Spacious positive"),
        ("Professional crew and smooth flight", "positive", "Professional"),
        
        # Arabic tests
        ("الخدمة ممتازة والطاقم محترف", "positive", "Arabic positive"),
        ("الخدمة ليست جيدة", "negative", "Arabic negation"),
        ("التجربة كانت سيئة جداً", "negative", "Arabic negative"),
        ("الطائرة مزدحمة وضيقة", "negative", "Arabic cramped"),
        ("الرحلة عادية ومقبولة", "neutral", "Arabic neutral"),
        
        # Mixed sentiment
        ("Good food but terrible service", "negative", "Mixed - leans negative"),
        ("Nice staff but flight was delayed", "negative", "Mixed with delayed"),
    ]
    
    print("\n" + "=" * 60)
    print("📝 RULE-BASED ANALYSIS RESULTS")
    print("=" * 60)
    
    correct = 0
    total = len(test_cases)
    
    for text, expected, description in test_cases:
        result = sentiment_analyzer.analyze(text, use_ml=False)
        
        # Check if result matches expected (handle neutral/positive case)
        is_correct = (
            result['sentiment'] == expected or 
            (expected == "neutral/positive" and result['sentiment'] in ['neutral', 'positive'])
        )
        
        if is_correct:
            correct += 1
            status = "✅"
        else:
            status = "❌"
        
        negation_info = f" [NEGATION: {result.get('negated_words', [])}]" if result.get('has_negation') else ""
        
        print(f"\n{status} {description}")
        print(f"   Text: \"{text}\"")
        print(f"   Expected: {expected} | Got: {result['sentiment']} ({result['confidence']}%){negation_info}")
    
    accuracy = (correct / total) * 100
    print(f"\n{'=' * 60}")
    print(f"📊 RULE-BASED ACCURACY: {correct}/{total} ({accuracy:.1f}%)")
    print(f"{'=' * 60}")
    
    # Test ML if available
    if ML_AVAILABLE:
        print("\n\n" + "=" * 60)
        print("🤖 LOADING ML MODEL...")
        print("=" * 60)
        
        if sentiment_analyzer.load_model():
            print("\n" + "=" * 60)
            print("📝 ML-BASED ANALYSIS RESULTS")
            print("=" * 60)
            
            ml_correct = 0
            
            for text, expected, description in test_cases[:10]:  # Test first 10 for speed
                result = sentiment_analyzer.analyze(text, use_ml=True)
                
                is_correct = (
                    result['sentiment'] == expected or 
                    (expected == "neutral/positive" and result['sentiment'] in ['neutral', 'positive'])
                )
                
                if is_correct:
                    ml_correct += 1
                    status = "✅"
                else:
                    status = "❌"
                
                print(f"\n{status} {description}")
                print(f"   Text: \"{text}\"")
                print(f"   Expected: {expected} | Got: {result['sentiment']} ({result['confidence']}%)")
            
            ml_accuracy = (ml_correct / 10) * 100
            print(f"\n{'=' * 60}")
            print(f"📊 ML-BASED ACCURACY: {ml_correct}/10 ({ml_accuracy:.1f}%)")
            print(f"{'=' * 60}")
        else:
            print("⚠️ Could not load ML model")
    else:
        print("\n⚠️ ML libraries not installed. Run: pip install transformers torch sentencepiece")
    
    print("\n✅ Test completed!")
    return accuracy

if __name__ == "__main__":
    test_sentiment()
