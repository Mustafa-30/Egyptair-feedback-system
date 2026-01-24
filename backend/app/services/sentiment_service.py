"""
Sentiment Analysis Service using AraBERT and NLTK
Enhanced with negation handling and expanded keyword lists
"""
import re
from typing import Optional, Tuple, List
from datetime import datetime

# Try to import ML libraries (optional)
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
    import torch
    ML_AVAILABLE = True
    print("[OK] ML libraries loaded successfully!")
except ImportError:
    ML_AVAILABLE = False
    print("[WARN] ML libraries not installed. Using rule-based sentiment analysis.")

try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    print("[WARN] NLTK not installed. Using basic text preprocessing.")


class SentimentAnalyzer:
    """
    Sentiment analysis service supporting both Arabic and English text
    Enhanced with negation handling and ML-based analysis
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.sentiment_pipeline = None
        self.arabic_pipeline = None
        self.english_pipeline = None
        # Use a proper Arabic sentiment model
        self.model_name = "CAMeL-Lab/bert-base-arabic-camelbert-msa-sentiment"
        self.model_version = "rule-based-v2"
        
        # Arabic stopwords (common words to filter out)
        self.arabic_stopwords = {
            'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
            'التي', 'الذي', 'هو', 'هي', 'نحن', 'أنت', 'أنا', 'هم', 'كان', 'كانت',
            'أن', 'ما', 'لم', 'قد', 'و', 'أو', 'ثم', 'لكن', 'بل'
        }
        
        # ========== NEGATION PATTERNS ==========
        # English negation words
        self.negation_words_en = {
            'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
            'hardly', 'barely', 'scarcely', "n't", "nt", 'dont', "don't",
            'doesnt', "doesn't", 'didnt', "didn't", 'wasnt', "wasn't",
            'werent', "weren't", 'wont', "won't", 'wouldnt', "wouldn't",
            'couldnt', "couldn't", 'shouldnt', "shouldn't", 'isnt', "isn't",
            'arent', "aren't", 'havent', "haven't", 'hasnt', "hasn't",
            'hadnt', "hadn't", 'without', 'lack', 'lacking', 'lacks'
        }
        
        # Arabic negation words
        self.negation_words_ar = {
            'لا', 'لم', 'لن', 'ما', 'ليس', 'ليست', 'غير', 'بدون', 'عدم',
            'مش', 'مو', 'ماكان', 'ماكانت', 'لست', 'لسنا', 'ليسوا'
        }
        
        # ========== EXPANDED POSITIVE WORDS ==========
        self.positive_words_ar = {
            # Original words
            'ممتاز', 'رائع', 'جيد', 'جميل', 'شكرا', 'شكراً', 'سعيد', 'محترم',
            'مريح', 'لذيذ', 'أحب', 'احب', 'استمتع', 'استمتعت', 'راضي', 'راضية',
            'أفضل', 'أحسن', 'عظيم', 'مذهل', 'ودود', 'محترف', 'منظم', 'نظيف',
            # New additions
            'متميز', 'فخم', 'رائعة', 'ممتازة', 'مبهر', 'مبهرة', 'سلس', 'سلسة',
            'مثالي', 'مثالية', 'مدهش', 'مدهشة', 'استثنائي', 'استثنائية',
            'موصى', 'انصح', 'أنصح', 'بارع',
            'كفء', 'كفاءة', 'ممتنة', 'ممتن', 'سريع', 'سريعة', 'واسع', 'واسعة',
            'مرتب', 'مرتبة', 'لطيف', 'لطيفة', 'حلو', 'حلوة', 'تمام',
            'عجبني', 'أعجبني', 'رضا', 'سهل', 'سهلة', 'مميز', 'مميزة',
            'جيدة', 'جيده',  # Feminine forms
            # Travel/Flight specific positive (from your data)
            'سأسافر', 'ساسافر', 'مرة أخرى', 'اخرى', 'تجربة رائعة', 'خدمة ممتازة',
            'مريحة', 'مريحه', 'خدمة العملاء', 'سير الرحلة', 
            # More colloquial Arabic
            'حلوه', 'تمام', 'عال', 'عالي', 'زي الفل', 'جميله', 'جميلة',
            'روعة', 'روعه', 'هايل', 'هايله', 'ممتاز', 'تحفة', 'تحفه'
        }
        
        self.positive_words_en = {
            # Original words
            'excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic',
            'perfect', 'love', 'loved', 'best', 'happy', 'satisfied', 'pleased',
            'comfortable', 'friendly', 'professional', 'helpful', 'smooth',
            'enjoyable', 'recommend', 'appreciate', 'thank', 'thanks', 'awesome',
            # New additions - more nuanced positive words
            'pleasant', 'delightful', 'exceptional', 'outstanding', 'superb',
            'brilliant', 'impressive', 'remarkable', 'lovely', 'nice', 'fine',
            'decent', 'adequate', 'reasonable', 'fair', 'acceptable', 'spacious',
            'clean', 'efficient', 'quick', 'fast', 'prompt', 'punctual',
            'courteous', 'polite', 'attentive', 'caring', 'kind', 'warm',
            'welcoming', 'gracious', 'generous', 'accommodating', 'flexible',
            'understanding', 'patient', 'thorough', 'careful', 'reliable',
            'trustworthy', 'dependable', 'consistent', 'organized', 'tidy',
            'fresh', 'modern', 'upgraded', 'improved', 'enhanced', 'exceeded',
            'surpassed', 'impressed', 'thrilled', 'delighted', 'overjoyed',
            # Verb forms (for negation detection)
            'like', 'liked', 'enjoy', 'enjoyed', 'prefer', 'preferred'
        }
        
        # ========== EXPANDED NEGATIVE WORDS ==========
        self.negative_words_ar = {
            # Original words
            'سيء', 'سيئ', 'سيئة', 'فظيع', 'مشكلة', 'تأخير', 'إلغاء', 'ضعيف',
            'مزعج', 'محبط', 'أسوأ', 'اسوأ', 'كارثة', 'خسارة', 'ضياع',
            'فقدان', 'مفقود', 'متأخر', 'ملغي', 'رفض', 'غاضب', 'منزعج', 'ضيق',
            # New additions
            'محدود', 'محدودة', 'ضيقة', 'بطيء', 'بطيئة', 'متعب', 'متعبة',
            'مرهق', 'مرهقة', 'صعب', 'صعبة', 'معقد', 'معقدة', 'مربك', 'مربكة',
            'فوضى', 'فوضوي', 'قذر', 'قذرة', 'وسخ', 'وسخة', 'متسخ', 'متسخة',
            'بارد', 'باردة', 'حار', 'حارة', 'مزدحم', 'مزدحمة', 'مكتظ', 'مكتظة',
            'منهك', 'منهكة', 'مقرف', 'مقرفة', 'رديء', 'رديئة', 'سخيف', 'سخيفة',
            'وقح', 'وقحة', 'فظ', 'فظة', 'خشن', 'خشنة', 'جاف', 'جافة',
            'عطل', 'عطلان', 'معطل', 'معطلة', 'خراب', 'خربان', 'مكسور', 'مكسورة',
            'نقص', 'ناقص', 'ناقصة', 'غائب', 'غائبة', 'مفقودة', 'ضائع', 'ضائعة',
            'زهقت', 'زهقان', 'ملل', 'ممل', 'مملة', 'طويل', 'طويلة'
        }
        
        self.negative_words_en = {
            # Original words
            'bad', 'terrible', 'horrible', 'awful', 'worst', 'poor', 'disappointing',
            'disappointed', 'delayed', 'cancelled', 'canceled', 'lost', 'missing',
            'rude', 'unprofessional', 'uncomfortable', 'angry', 'frustrated',
            'problem', 'issue', 'complaint', 'refund', 'hate', 'avoid',
            # New additions - nuanced negative words
            'limited', 'cramped', 'crowded', 'tight', 'narrow', 'small',
            'broken', 'damaged', 'defective', 'faulty', 'malfunctioning',
            'slow', 'sluggish', 'late', 'overdue', 'behind', 'waiting',
            'dirty', 'filthy', 'unclean', 'messy', 'stained', 'smelly',
            'cold', 'hot', 'freezing', 'stuffy', 'noisy', 'loud',
            'boring', 'tedious', 'exhausting', 'tiring', 'stressful',
            'confusing', 'complicated', 'difficult', 'hard', 'complex',
            'overpriced', 'expensive', 'costly', 'ripoff', 'scam',
            'mediocre', 'subpar', 'inferior', 'inadequate', 'insufficient',
            'lacking', 'deficient', 'flawed', 'imperfect', 'unsatisfactory',
            'unacceptable', 'intolerable', 'unbearable', 'outrageous',
            'ridiculous', 'absurd', 'pathetic', 'shameful', 'disgraceful',
            'incompetent', 'careless', 'negligent', 'irresponsible', 'lazy',
            'unhelpful', 'unresponsive', 'ignored', 'neglected', 'dismissed',
            'disrespectful', 'condescending', 'arrogant', 'impatient', 'hostile',
            'aggressive', 'threatening', 'offensive', 'insulting', 'abusive',
            'wasted', 'ruined', 'spoiled', 'destroyed', 'failed', 'failure',
            # Strong negative phrases (single words that indicate negativity)
            'never', 'nightmare', 'disaster', 'horrific', 'atrocious', 'dreadful',
            'appalling', 'disgust', 'disgusting', 'disgusted', 'regret', 'regretted',
            'waste', 'worthless', 'useless', 'pointless', 'hopeless'
        }
        
        # ========== NEUTRAL/MIXED WORDS ==========
        self.neutral_words_en = {
            'okay', 'ok', 'alright', 'average', 'normal', 'standard', 'typical',
            'regular', 'usual', 'ordinary', 'moderate', 'medium', 'so-so',
            'mixed', 'varied', 'sometimes', 'occasionally', 'depends'
        }
        
        self.neutral_words_ar = {
            'عادي', 'عادية', 'متوسط', 'متوسطة', 'مقبول', 'مقبولة',
            'احيانا', 'أحياناً', 'بعض', 'ممكن', 'يعتمد'
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
        Load the AraBERT/CAMeL sentiment model for sentiment analysis
        """
        if not ML_AVAILABLE:
            print("[WARN] ML libraries not available. Using rule-based analysis.")
            return False
        
        try:
            print("[INFO] Loading sentiment models...")
            print("       This may take a few minutes on first run...")
            
            # Load Arabic sentiment model
            try:
                arabic_model = "CAMeL-Lab/bert-base-arabic-camelbert-msa-sentiment"
                self.arabic_pipeline = pipeline(
                    "sentiment-analysis",
                    model=arabic_model,
                    tokenizer=arabic_model
                )
                print("[OK] Arabic sentiment model (CAMeL) loaded!")
            except Exception as e:
                print(f"[WARN] Arabic model failed: {e}")
                self.arabic_pipeline = None
            
            # Load English/Multilingual sentiment model
            try:
                english_model = "distilbert-base-uncased-finetuned-sst-2-english"
                self.english_pipeline = pipeline(
                    "sentiment-analysis",
                    model=english_model,
                    tokenizer=english_model
                )
                print("[OK] English sentiment model (DistilBERT) loaded!")
            except Exception as e:
                print(f"[WARN] English model failed: {e}")
                self.english_pipeline = None
            
            # Set main pipeline for backward compatibility
            self.sentiment_pipeline = self.english_pipeline or self.arabic_pipeline
            self.model_version = f"hybrid-sentiment-{datetime.now().strftime('%Y%m%d')}"
            
            if self.sentiment_pipeline:
                return True
            else:
                print("[ERROR] No models loaded. Using rule-based analysis.")
                return False
            
        except Exception as e:
            print(f"[ERROR] Error loading model: {e}")
            print("        Falling back to enhanced rule-based analysis.")
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
    
    def detect_negation(self, text: str, language: str) -> Tuple[bool, List[str]]:
        """
        Detect negation patterns in text
        Returns: (has_negation, list of negated words)
        """
        text_lower = text.lower()
        words = text_lower.split()
        
        negation_words = self.negation_words_en if language in ["EN", "Mixed"] else self.negation_words_ar
        if language == "Mixed":
            negation_words = self.negation_words_en | self.negation_words_ar
        
        has_negation = False
        negated_words = []
        
        # Check for negation words
        for i, word in enumerate(words):
            # Clean the word
            clean_word = re.sub(r'[^\w\u0600-\u06FF]', '', word)
            
            if clean_word in negation_words:
                has_negation = True
                # Get the next 1-3 words that might be negated
                for j in range(1, 4):
                    if i + j < len(words):
                        negated_words.append(re.sub(r'[^\w\u0600-\u06FF]', '', words[i + j]))
        
        # Check for English contractions with n't
        if language in ["EN", "Mixed"]:
            # Patterns like "not good", "don't like", "wasn't happy"
            negation_patterns = [
                r"\b(not|n't|never|no)\s+(\w+)",
                r"\b(don't|doesn't|didn't|won't|wouldn't|couldn't|shouldn't|can't|cannot)\s+(\w+)",
                r"\b(wasn't|weren't|isn't|aren't|haven't|hasn't|hadn't)\s+(\w+)"
            ]
            for pattern in negation_patterns:
                matches = re.findall(pattern, text_lower)
                for match in matches:
                    has_negation = True
                    if isinstance(match, tuple) and len(match) > 1:
                        negated_words.append(match[1])
        
        return has_negation, negated_words
    
    def analyze_rule_based(self, text: str, language: str) -> Tuple[str, float]:
        """
        Enhanced rule-based sentiment analysis with negation handling
        """
        text_lower = text.lower()
        # For English, use word boundaries; for Arabic, check substrings
        words_en = set(re.findall(r'\b[a-zA-Z]+\b', text_lower))
        
        # Detect negation
        has_negation, negated_words = self.detect_negation(text, language)
        negated_words_set = set(w.lower() for w in negated_words)
        
        positive_score = 0
        negative_score = 0
        neutral_score = 0
        
        # Score Arabic words (check if keyword appears anywhere in text)
        if language in ["AR", "Mixed"]:
            for word in self.positive_words_ar:
                if word in text:  # Arabic: check substring match
                    # Check if this positive word is negated
                    if self._is_word_negated_ar(text, word):
                        negative_score += 1.5  # Negated positive = strong negative
                    else:
                        positive_score += 1
            
            for word in self.negative_words_ar:
                if word in text:  # Arabic: check substring match
                    if self._is_word_negated_ar(text, word):
                        positive_score += 0.5  # Negated negative = slightly positive
                    else:
                        negative_score += 1
            
            # Check neutral words
            for word in self.neutral_words_ar:
                if word in text:
                    neutral_score += 0.5
        
        # Score English words (use word boundaries)
        if language in ["EN", "Mixed"]:
            for word in self.positive_words_en:
                if word in words_en:
                    if word in negated_words_set or (has_negation and self._is_word_negated(text_lower, word, "EN")):
                        negative_score += 1.5  # Negated positive = strong negative
                    else:
                        positive_score += 1
            
            for word in self.negative_words_en:
                if word in words_en:
                    if word in negated_words_set or (has_negation and self._is_word_negated(text_lower, word, "EN")):
                        positive_score += 0.5  # Negated negative = slightly positive
                    else:
                        negative_score += 1
            
            # Check neutral words
            for word in self.neutral_words_en:
                if word in words_en:
                    neutral_score += 0.5
        
        total_sentiment_words = positive_score + negative_score + neutral_score
        
        # If no sentiment words found, default to neutral with low confidence
        if total_sentiment_words == 0:
            return "neutral", 0.50
        
        # Calculate sentiment with adjusted confidence
        if positive_score > negative_score and positive_score >= neutral_score:
            diff = positive_score - max(negative_score, neutral_score)
            confidence = min(0.95, 0.60 + diff * 0.10)
            return "positive", confidence
        elif negative_score > positive_score and negative_score >= neutral_score:
            diff = negative_score - max(positive_score, neutral_score)
            confidence = min(0.95, 0.60 + diff * 0.10)
            return "negative", confidence
        elif neutral_score > 0 and abs(positive_score - negative_score) < 0.5:
            return "neutral", 0.65
        elif abs(positive_score - negative_score) < 0.5:
            return "neutral", 0.55
        else:
            # Slight lean based on which is higher
            if positive_score > negative_score:
                return "positive", 0.58
            else:
                return "negative", 0.58
    
    def _is_word_negated(self, text: str, word: str, language: str) -> bool:
        """
        Check if a specific word is preceded by a negation within 3-4 words
        """
        text_lower = text.lower()
        negation_words = self.negation_words_en if language in ["EN", "Mixed"] else self.negation_words_ar
        if language == "Mixed":
            negation_words = self.negation_words_en | self.negation_words_ar
        
        # Find the word position
        word_match = re.search(r'\b' + re.escape(word.lower()) + r'\b', text_lower)
        if not word_match:
            return False
        
        word_pos = word_match.start()
        
        # Get text before the word (up to 40 characters to catch longer negations)
        text_before = text_lower[max(0, word_pos - 40):word_pos]
        
        # Check if any negation word appears in the preceding text
        for neg in negation_words:
            if neg in text_before:
                return True
        
        return False
    
    def _is_word_negated_ar(self, text: str, word: str) -> bool:
        """
        Check if an Arabic word is negated (Arabic-specific negation detection)
        Arabic negation typically comes BEFORE the word
        """
        # Find the word position
        word_pos = text.find(word)
        if word_pos == -1:
            return False
        
        # Get text before the word (up to 20 characters for Arabic)
        text_before = text[max(0, word_pos - 20):word_pos]
        
        # Check if any Arabic negation word appears before this word
        for neg in self.negation_words_ar:
            if neg in text_before:
                return True
        
        return False
    
    def analyze_ml_based(self, text: str, language: str = "EN") -> Tuple[str, float]:
        """
        ML-based sentiment analysis using pre-trained models
        Combines ML prediction with rule-based negation handling
        """
        # Select appropriate pipeline based on language
        if language == "AR" and hasattr(self, 'arabic_pipeline') and self.arabic_pipeline:
            pipeline_to_use = self.arabic_pipeline
        elif hasattr(self, 'english_pipeline') and self.english_pipeline:
            pipeline_to_use = self.english_pipeline
        elif self.sentiment_pipeline:
            pipeline_to_use = self.sentiment_pipeline
        else:
            raise ValueError("No ML model loaded. Call load_model() first.")
        
        try:
            # Use the sentiment pipeline
            result = pipeline_to_use(text[:512])[0]  # Truncate to max length
            
            label = result['label'].upper()
            confidence = result['score']
            
            # Map different label formats to our standard labels
            # DistilBERT uses: POSITIVE, NEGATIVE
            # CAMeL uses: positive, negative, neutral
            # Multilingual uses: 1 star - 5 stars
            if label in ['POSITIVE', 'POS'] or 'positive' in label.lower() or '5 star' in label.lower() or '4 star' in label.lower():
                ml_sentiment = 'positive'
            elif label in ['NEGATIVE', 'NEG'] or 'negative' in label.lower() or '1 star' in label.lower() or '2 star' in label.lower():
                ml_sentiment = 'negative'
            else:
                ml_sentiment = 'neutral'
            
            # Apply negation handling - this is crucial!
            # If we detect negation and the ML model doesn't catch it, override
            has_negation, negated_words = self.detect_negation(text, language)
            
            if has_negation:
                # Check if ML missed a negated positive
                if ml_sentiment == 'positive':
                    # Check if positive words are negated
                    text_lower = text.lower()
                    pos_words = self.positive_words_en if language in ["EN", "Mixed"] else self.positive_words_ar
                    
                    for neg_word in negated_words:
                        if neg_word in pos_words or any(pos in neg_word for pos in pos_words):
                            # Positive word is negated - flip to negative
                            ml_sentiment = 'negative'
                            confidence = max(0.65, confidence * 0.8)  # Reduce confidence
                            break
                    
                    # Also check common patterns
                    negation_patterns = [
                        r"not\s+(good|great|nice|happy|satisfied|comfortable|helpful)",
                        r"(don't|doesn't|didn't|won't|wouldn't|can't|couldn't)\s+(like|love|enjoy|recommend)",
                        r"never\s+(again|recommend|fly|use)",
                        r"wasn't\s+(good|helpful|friendly|professional)"
                    ]
                    for pattern in negation_patterns:
                        if re.search(pattern, text_lower):
                            ml_sentiment = 'negative'
                            confidence = max(0.70, confidence * 0.85)
                            break
            
            return ml_sentiment, confidence
            
        except Exception as e:
            print(f"[WARN] ML analysis failed: {e}, falling back to rule-based")
            # Fallback to rule-based
            return self.analyze_rule_based(text, language)
    
    def analyze(self, text: str, use_ml: bool = True) -> dict:
        """
        Analyze sentiment of given text
        
        Args:
            text: The text to analyze
            use_ml: Whether to use ML model (if available) - defaults to True
        
        Returns:
            dict with sentiment, confidence, language, etc.
        """
        # Detect language
        language = self.detect_language(text)
        
        # Detect negation (for info purposes)
        has_negation, negated_words = self.detect_negation(text, language)
        
        # Preprocess
        preprocessed = self.preprocess_text(text, language)
        
        # Check ML availability
        ml_available = (
            (hasattr(self, 'english_pipeline') and self.english_pipeline is not None) or
            (hasattr(self, 'arabic_pipeline') and self.arabic_pipeline is not None) or
            self.sentiment_pipeline is not None
        )
        
        # Use ML if available and requested, otherwise use enhanced rule-based
        if use_ml and ml_available:
            sentiment, confidence = self.analyze_ml_based(text, language)
            model_used = self.model_version
        else:
            sentiment, confidence = self.analyze_rule_based(text, language)
            model_used = "rule-based-v2-enhanced"
        
        return {
            "text": text,
            "sentiment": sentiment,
            "confidence": round(confidence * 100, 1),
            "language": language,
            "preprocessed_text": preprocessed,
            "model_version": model_used,
            "has_negation": has_negation,
            "negated_words": negated_words[:5] if negated_words else []  # Limit to 5
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

# Try to auto-load ML models at startup
try:
    if ML_AVAILABLE:
        print("[INFO] Attempting to load ML models at startup...")
        sentiment_analyzer.load_model()
except Exception as e:
    print(f"[WARN] Could not auto-load ML models: {e}")
