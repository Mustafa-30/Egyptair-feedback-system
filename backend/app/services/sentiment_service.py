"""
Sentiment Analysis Service using AraBERT and NLTK
"""
import re
from typing import Optional, Tuple
from datetime import datetime

# Try to import ML libraries (optional)
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("⚠️ ML libraries not installed. Using rule-based sentiment analysis.")

try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    print("⚠️ NLTK not installed. Using basic text preprocessing.")


class SentimentAnalyzer:
    """
    Sentiment analysis service supporting both Arabic and English text
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.model_name = "aubmindlab/bert-base-arabertv02"
        self.model_version = "rule-based-v1"
        
        # Arabic stopwords (common words to filter out)
        self.arabic_stopwords = {
            'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
            'التي', 'الذي', 'هو', 'هي', 'نحن', 'أنت', 'أنا', 'هم', 'كان', 'كانت',
            'أن', 'لا', 'ما', 'لم', 'قد', 'و', 'أو', 'ثم', 'لكن', 'بل'
        }
        
        # Sentiment word dictionaries
        self.positive_words_ar = {
            'ممتاز', 'رائع', 'جيد', 'جميل', 'شكرا', 'شكراً', 'سعيد', 'محترم',
            'مريح', 'لذيذ', 'أحب', 'احب', 'استمتع', 'استمتعت', 'راضي', 'راضية',
            'أفضل', 'أحسن', 'عظيم', 'مذهل', 'ودود', 'محترف', 'منظم', 'نظيف'
        }
        
        self.negative_words_ar = {
            'سيء', 'سيئ', 'سيئة', 'فظيع', 'مشكلة', 'تأخير', 'إلغاء', 'ضعيف',
            'غير', 'مزعج', 'محبط', 'أسوأ', 'اسوأ', 'كارثة', 'خسارة', 'ضياع',
            'فقدان', 'مفقود', 'متأخر', 'ملغي', 'رفض', 'غاضب', 'منزعج', 'ضيق'
        }
        
        self.positive_words_en = {
            'excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic',
            'perfect', 'love', 'loved', 'best', 'happy', 'satisfied', 'pleased',
            'comfortable', 'friendly', 'professional', 'helpful', 'smooth',
            'enjoyable', 'recommend', 'appreciate', 'thank', 'thanks', 'awesome'
        }
        
        self.negative_words_en = {
            'bad', 'terrible', 'horrible', 'awful', 'worst', 'poor', 'disappointing',
            'disappointed', 'delayed', 'cancelled', 'canceled', 'lost', 'missing',
            'rude', 'unprofessional', 'uncomfortable', 'angry', 'frustrated',
            'problem', 'issue', 'complaint', 'refund', 'never', 'hate', 'avoid'
        }
        
        # Download NLTK data if available
        if NLTK_AVAILABLE:
            try:
                nltk.download('punkt', quiet=True)
                nltk.download('stopwords', quiet=True)
                nltk.download('punkt_tab', quiet=True)
            except:
                pass
    
    def load_model(self):
        """
        Load the AraBERT model for sentiment analysis
        """
        if not ML_AVAILABLE:
            print("⚠️ ML libraries not available. Using rule-based analysis.")
            return False
        
        try:
            print(f"Loading model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=3  # positive, negative, neutral
            )
            self.model_version = f"arabert-v2-{datetime.now().strftime('%Y%m%d')}"
            print("✅ Model loaded successfully")
            return True
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False
    
    def detect_language(self, text: str) -> str:
        """
        Detect if text is Arabic, English, or Mixed
        """
        # Count Arabic and English characters
        arabic_count = len(re.findall(r'[\u0600-\u06FF]', text))
        english_count = len(re.findall(r'[a-zA-Z]', text))
        
        total = arabic_count + english_count
        if total == 0:
            return "EN"
        
        arabic_ratio = arabic_count / total
        
        if arabic_ratio > 0.7:
            return "AR"
        elif arabic_ratio < 0.3:
            return "EN"
        else:
            return "Mixed"
    
    def preprocess_text(self, text: str, language: str) -> str:
        """
        Preprocess text for sentiment analysis
        """
        # Convert to lowercase (for English)
        processed = text.lower() if language == "EN" else text
        
        # Remove URLs
        processed = re.sub(r'http\S+|www\S+|https\S+', '', processed)
        
        # Remove email addresses
        processed = re.sub(r'\S+@\S+', '', processed)
        
        # Remove special characters but keep Arabic letters
        if language == "AR":
            processed = re.sub(r'[^\u0600-\u06FF\s]', ' ', processed)
        else:
            processed = re.sub(r'[^a-zA-Z\s]', ' ', processed)
        
        # Remove extra whitespace
        processed = re.sub(r'\s+', ' ', processed).strip()
        
        # Tokenize and remove stopwords
        if NLTK_AVAILABLE and language == "EN":
            try:
                tokens = word_tokenize(processed)
                stop_words = set(stopwords.words('english'))
                tokens = [t for t in tokens if t not in stop_words]
                processed = ' '.join(tokens)
            except:
                pass
        elif language == "AR":
            # Simple Arabic tokenization
            tokens = processed.split()
            tokens = [t for t in tokens if t not in self.arabic_stopwords]
            processed = ' '.join(tokens)
        
        return processed
    
    def analyze_rule_based(self, text: str, language: str) -> Tuple[str, float]:
        """
        Rule-based sentiment analysis using word dictionaries
        """
        text_lower = text.lower()
        words = set(text_lower.split())
        
        positive_score = 0
        negative_score = 0
        
        if language in ["AR", "Mixed"]:
            positive_score += len(words & self.positive_words_ar)
            negative_score += len(words & self.negative_words_ar)
        
        if language in ["EN", "Mixed"]:
            positive_score += len(words & self.positive_words_en)
            negative_score += len(words & self.negative_words_en)
        
        total_sentiment_words = positive_score + negative_score
        
        if total_sentiment_words == 0:
            return "neutral", 0.6
        
        if positive_score > negative_score:
            confidence = min(0.95, 0.6 + (positive_score - negative_score) * 0.1)
            return "positive", confidence
        elif negative_score > positive_score:
            confidence = min(0.95, 0.6 + (negative_score - positive_score) * 0.1)
            return "negative", confidence
        else:
            return "neutral", 0.5
    
    def analyze_ml_based(self, text: str) -> Tuple[str, float]:
        """
        ML-based sentiment analysis using AraBERT
        """
        if self.model is None or self.tokenizer is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        
        # Predict
        with torch.no_grad():
            outputs = self.model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Get prediction
        predicted_class = torch.argmax(predictions, dim=-1).item()
        confidence = predictions[0][predicted_class].item()
        
        sentiment_map = {0: "negative", 1: "neutral", 2: "positive"}
        sentiment = sentiment_map.get(predicted_class, "neutral")
        
        return sentiment, confidence
    
    def analyze(self, text: str, use_ml: bool = False) -> dict:
        """
        Analyze sentiment of given text
        
        Args:
            text: The text to analyze
            use_ml: Whether to use ML model (if available)
        
        Returns:
            dict with sentiment, confidence, language, etc.
        """
        # Detect language
        language = self.detect_language(text)
        
        # Preprocess
        preprocessed = self.preprocess_text(text, language)
        
        # Analyze sentiment
        if use_ml and self.model is not None:
            sentiment, confidence = self.analyze_ml_based(preprocessed)
        else:
            sentiment, confidence = self.analyze_rule_based(text, language)
        
        return {
            "text": text,
            "sentiment": sentiment,
            "confidence": round(confidence * 100, 1),
            "language": language,
            "preprocessed_text": preprocessed,
            "model_version": self.model_version
        }
    
    def analyze_batch(self, texts: list, use_ml: bool = False) -> list:
        """
        Analyze sentiment for a batch of texts
        """
        results = []
        for text in texts:
            try:
                result = self.analyze(text, use_ml)
                results.append(result)
            except Exception as e:
                results.append({
                    "text": text,
                    "sentiment": "neutral",
                    "confidence": 0,
                    "language": "EN",
                    "preprocessed_text": "",
                    "model_version": self.model_version,
                    "error": str(e)
                })
        return results


# Global instance
sentiment_analyzer = SentimentAnalyzer()
