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
        
        # ========== EXPANDED NEUTRAL/MIXED WORDS ==========
        self.neutral_words_en = {
            # Basic neutral indicators
            'okay', 'ok', 'alright', 'average', 'normal', 'standard', 'typical',
            'regular', 'usual', 'ordinary', 'moderate', 'medium', 'so-so',
            'mixed', 'varied', 'sometimes', 'occasionally', 'depends',
            # Mild positive (not strong enough to be positive)
            'fine', 'decent', 'acceptable', 'adequate', 'reasonable', 'fair',
            'passable', 'tolerable', 'satisfactory', 'sufficient', 'workable',
            # Uncertainty indicators
            'maybe', 'perhaps', 'somewhat', 'partially', 'partly', 'sort of',
            'kind of', 'more or less', 'could be', 'might be', 'not sure',
            # Balanced/mixed signals
            'pros and cons', 'hit or miss', 'ups and downs', 'mixed feelings',
            'both good and bad', 'some good some bad', 'neither here nor there',
            # Expectation-based neutral
            'as expected', 'what i expected', 'nothing special', 'nothing extraordinary',
            'nothing remarkable', 'unremarkable', 'uneventful', 'routine',
            # Comparative neutral
            'same as usual', 'like always', 'no different', 'no change',
            'similar to before', 'about average', 'middle of the road'
        }
        
        self.neutral_words_ar = {
            # Basic neutral
            'عادي', 'عادية', 'متوسط', 'متوسطة', 'مقبول', 'مقبولة',
            'احيانا', 'أحياناً', 'بعض', 'ممكن', 'يعتمد',
            # Mild/acceptable
            'معقول', 'معقولة', 'لا بأس', 'مش وحش', 'ماشي', 'تمام',
            'كويس', 'نص نص', 'وسط', 'بين بين',
            # Uncertainty
            'ربما', 'يمكن', 'محتمل', 'نوعا ما', 'إلى حد ما',
            # Nothing special
            'عادي جدا', 'مفيش جديد', 'زي ما هو', 'زي العادة',
            'المتوقع', 'كالمعتاد', 'لا شيء مميز'
        }
        
        # ========== NEUTRAL PHRASE PATTERNS ==========
        self.neutral_patterns_en = [
            # "It was X" patterns with neutral words
            r'\b(it was|was|were|is|are)\s+(okay|ok|fine|decent|average|alright|acceptable)\b',
            # "Not bad" / "Not great" patterns (neutral, not negative)
            r'\bnot\s+(bad|terrible|awful|horrible)\b(?!.{0,20}(but|however|although))',
            r'\bnot\s+(great|amazing|excellent|outstanding)\b(?!.{0,20}(but|however|although))',
            # "Could be better/worse" patterns
            r'\bcould\s+(be|have been)\s+(better|worse)\b',
            r'\bcould\s+improve\b',
            r'\broom\s+for\s+improvement\b',
            # Expectation patterns
            r'\b(met|meets)\s+(my\s+)?expectations?\b',
            r'\bas\s+(i\s+)?expected\b',
            r'\bnothing\s+(special|extraordinary|remarkable|to\s+write\s+home\s+about)\b',
            # Balanced patterns
            r'\b(some|a\s+few)\s+(good|positive).{0,20}(some|a\s+few)\s+(bad|negative|issues?)\b',
            r'\b(has|have)\s+(its|their)\s+(pros\s+and\s+cons|ups\s+and\s+downs)\b',
            # Hedging language
            r'\b(i\s+guess|i\s+suppose|i\s+think)\s+(it\'?s?\s+)?(okay|fine|alright)\b',
            # "Just" patterns (minimizing)
            r'\bjust\s+(okay|fine|average|normal)\b',
            # Neither patterns
            r'\bneither\s+(good|great|bad|terrible)\s+nor\s+(good|great|bad|terrible)\b',
            # Specific neutral phrases
            r'\b(no\s+complaints?|can\'t\s+complain|nothing\s+wrong)\b',
            r'\b(did\s+the\s+job|got\s+the\s+job\s+done|served\s+its\s+purpose)\b',
            r'\b(standard|typical|normal)\s+(service|flight|experience)\b',
        ]
        
        self.neutral_patterns_ar = [
            r'\bعادي\s*(جدا|جداً)?\b',
            r'\bمقبول\s*(إلى|الى)?\s*(حد)?\s*(ما)?\b',
            r'\bلا\s*بأس\b',
            r'\bمعقول\b',
            r'\bكالمتوقع\b',
            r'\bزي\s*العادة\b',
            r'\bنص\s*نص\b',
            r'\bلا\s*شكوى\b',
            r'\bممكن\s*أفضل\b',
            r'\bمحتاج\s*تحسين\b',
        ]
        
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
        
        # =================================================================
        # CHECK FOR MIXED SENTIMENT PATTERNS FIRST (English)
        # "X but Y" patterns where second part determines overall sentiment
        # =================================================================
        if language in ["EN", "Mixed"]:
            # Strong negative words that override positive when after "but/however"
            strong_negatives = ['terrible', 'horrible', 'awful', 'worst', 'disgusting', 
                               'unacceptable', 'rude', 'delayed', 'late', 'lost', 'cancelled',
                               'canceled', 'disappointing', 'disappointed', 'poor', 'bad']
            
            # Check for "positive but STRONG_NEGATIVE" pattern
            but_match = re.search(r'\b(but|however|although|though|yet)\b', text_lower)
            if but_match:
                text_after_but = text_lower[but_match.end():]
                # Check if strong negative words appear after "but"
                for neg_word in strong_negatives:
                    if neg_word in text_after_but:
                        # This is a mixed sentiment that leans negative
                        return "negative", 0.75
            
            # Check for "mediocre" - always negative
            if 'mediocre' in text_lower:
                return "negative", 0.75
        
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
    
    def _verify_arabic_sentiment(self, text: str, ml_sentiment: str, ml_confidence: float) -> Tuple[str, float]:
        """
        Verify and correct Arabic sentiment using strong keyword matching.
        Arabic ML models can be inconsistent, so we use keyword-based verification.
        """
        # Strong positive Arabic keywords (clear indicators)
        strong_positive_ar = [
            'ممتاز', 'ممتازة', 'رائع', 'رائعة', 'مذهل', 'مذهلة', 'استثنائي', 'استثنائية',
            'عظيم', 'عظيمة', 'مدهش', 'مدهشة', 'فخم', 'فخمة', 'احترافي', 'احترافية',
            'محترف', 'محترفة', 'مثالي', 'مثالية', 'أفضل', 'افضل', 'الأفضل',
            'روعة', 'روعه', 'تحفة', 'تحفه', 'هايل', 'هايله', 'زي الفل',
            'أحسن', 'احسن', 'سعيد', 'سعيدة', 'راضي', 'راضية', 'مرتاح', 'مرتاحة',
            'انصح', 'أنصح', 'اوصي', 'أوصي', 'سأعود', 'ساعود', 'سأكرر', 'ساكرر',
            'ودود', 'ودودة', 'لطيف', 'لطيفة', 'جميل', 'جميلة',
        ]
        
        # Strong negative Arabic keywords (clear indicators)
        strong_negative_ar = [
            'سيء', 'سيئة', 'سيئ', 'فظيع', 'فظيعة', 'أسوأ', 'اسوأ', 'الأسوأ',
            'مخيب', 'مخيبة', 'محبط', 'محبطة', 'كارثة', 'كارثي', 'كارثية',
            'فاشل', 'فاشلة', 'فشل', 'خيبة', 'مقرف', 'مقرفة',
            'وقح', 'وقحة', 'فظ', 'فظة', 'سخيف', 'سخيفة', 'مهين', 'مهينة',
            'بارد', 'باردة', 'بارداً', 'باردًا',  # Cold food
            'غير شهي', 'طعم سيء', 'جودة سيئة',
            'مزعج', 'مزعجة', 'قذر', 'قذرة', 'وسخ', 'متسخ', 'متسخة',
            'ضيق', 'ضيقة', 'غير مريح', 'غير مريحة',
            'للآمال',  # Part of 'disappointing'
            'غير متعاون', 'غير متعاونة',
        ]
        
        # Neutral Arabic keywords
        neutral_ar = [
            'عادي', 'عادية', 'متوسط', 'متوسطة', 'مقبول', 'مقبولة',
            'معقول', 'معقولة', 'لا بأس', 'نص نص', 'ماشي',
        ]
        
        # Count keyword occurrences
        pos_count = 0
        neg_count = 0
        neutral_count = 0
        
        for word in strong_positive_ar:
            if word in text:
                pos_count += 1
        
        for word in strong_negative_ar:
            if word in text:
                neg_count += 1
        
        for word in neutral_ar:
            if word in text:
                neutral_count += 1
        
        # Check for negation before positive words
        # Only check immediately adjacent words (within 8 chars - enough for "غير " or "ليست ")
        has_negated_positive = False
        for pos_word in ['جيد', 'جيدة', 'ممتاز', 'ممتازة', 'رائع', 'رائعة', 'مريح', 'مريحة']:
            if pos_word in text:
                word_pos = text.find(pos_word)
                # Only look 8 characters back (enough for "غير " or "ليست ")
                text_before = text[max(0, word_pos - 8):word_pos]
                # Only check for direct negation words that directly precede the positive word
                for neg in ['ليست', 'ليس', 'غير', 'مش']:
                    if neg in text_before:
                        has_negated_positive = True
                        neg_count += 2
                        pos_count = max(0, pos_count - 1)
                        break
        
        # DECISION LOGIC - Order matters!
        
        # 1. If neutral words and no strong sentiment, return neutral
        if neutral_count >= 2 and neg_count == 0 and pos_count == 0:
            return 'neutral', 0.80
        
        if neutral_count >= 1 and neg_count == 0 and pos_count == 0:
            return 'neutral', 0.75
        
        # 2. Strong negative signals
        if neg_count >= 2:
            return 'negative', min(0.95, 0.75 + neg_count * 0.05)
        
        if neg_count >= 1 and pos_count == 0:
            return 'negative', 0.85
        
        # 3. Negated positive = negative
        if has_negated_positive:
            return 'negative', 0.75
        
        # 4. Strong positive signals
        if pos_count >= 2 and pos_count > neg_count:
            return 'positive', min(0.95, 0.75 + pos_count * 0.05)
        
        if pos_count >= 1 and neg_count == 0 and neutral_count == 0:
            return 'positive', 0.80
        
        # 5. Neutral with weak sentiment signals
        if neutral_count >= 1:
            return 'neutral', 0.70
        
        # 6. Mixed signals
        if pos_count == neg_count and pos_count > 0:
            return 'neutral', 0.65
        
        # 7. Compare counts
        if pos_count > neg_count:
            return 'positive', 0.70
        elif neg_count > pos_count:
            return 'negative', 0.70
        
        # 8. Fallback to ML with reduced confidence
        return ml_sentiment, min(ml_confidence, 0.60)
    
    def analyze_ml_based(self, text: str, language: str = "EN") -> Tuple[str, float]:
        """
        ML-based sentiment analysis using pre-trained models
        Combines ML prediction with rule-based negation handling
        Enhanced to detect neutral/mixed sentiments
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
            # CAMeL uses: positive, negative, neutral, mixed
            # Multilingual uses: 1 star - 5 stars
            label_lower = label.lower()
            
            if label in ['POSITIVE', 'POS', 'LABEL_2'] or label_lower in ['positive', 'pos', 'very_positive'] or '5 star' in label_lower or '4 star' in label_lower:
                ml_sentiment = 'positive'
            elif label in ['NEGATIVE', 'NEG', 'LABEL_0'] or label_lower in ['negative', 'neg', 'very_negative'] or '1 star' in label_lower or '2 star' in label_lower:
                ml_sentiment = 'negative'
            elif label in ['NEUTRAL', 'LABEL_1'] or label_lower in ['neutral', 'mixed', '3 star']:
                ml_sentiment = 'neutral'
            else:
                # Unknown label - use confidence to decide
                if confidence > 0.75:
                    ml_sentiment = 'positive'
                elif confidence < 0.35:
                    ml_sentiment = 'negative'
                else:
                    ml_sentiment = 'neutral'
            
            # Check for neutral indicators (low confidence or mixed signals)
            text_lower = text.lower()
            
            # ============================================================
            # STRONG NEGATIVE WORDS - Check FIRST (before neutral detection)
            # These override neutral patterns
            # ============================================================
            strong_negative_words = [
                'mediocre', 'terrible', 'horrible', 'awful', 'worst', 
                'disgusting', 'unacceptable', 'nightmare', 'disaster',
                'disappointed', 'disappointing', 'disappointment',
                'dismissive', 'unhelpful', 'rude', 'unprofessional',
                'stale', 'cold and', 'unappetizing', 'inedible',
                'extremely disappointed', 'deeply disappointed',
                'very disappointed', 'totally disappointed',
                'frustrating', 'frustrated', 'frustration',
                'disinterested', 'ignored', 'no explanation',
                'no compensation', 'two hours late', 'hours late',
                'baggage arrived late', 'baggage was late', 'luggage late',
                'minimal communication', 'no communication'
            ]
            # Check for strong negative phrases/words
            has_strong_negative = any(word in text_lower for word in strong_negative_words)
            
            # Also check for Arabic strong negatives
            arabic_strong_negatives = ['مخيبة', 'سيئة', 'فظيع', 'مقرف', 'بارد', 'غير شهي']
            if language == "AR":
                has_strong_negative = has_strong_negative or any(word in text for word in arabic_strong_negatives)
            
            if has_strong_negative:
                return 'negative', 0.85
            
            # ============================================================
            # EARLY NEUTRAL DETECTION - Only for truly neutral text
            # Must NOT contain any negative indicators
            # ============================================================
            
            # First check if there are ANY negative words (weak check)
            weak_negative_indicators = [
                'problem', 'issue', 'delay', 'late', 'slow', 'poor',
                'bad', 'uncomfortable', 'cramped', 'cold', 'dirty',
                'rude', 'ignored', 'waited', 'never'
            ]
            has_any_negative = any(word in text_lower for word in weak_negative_indicators)
            
            # 1. Explicit rating mentions that are neutral (3/5, 3 stars, etc.)
            neutral_rating_patterns = [
                r'\b3\s*/\s*5\b',                    # 3/5
                r'\b3\s+out\s+of\s+5\b',             # 3 out of 5
                r'\b(three|3)\s+stars?\b',           # 3 stars
                r'\brating:\s*(3|neutral)\b',        # Rating: 3 or Rating: Neutral
                r'\b(5|6|7)\s*/\s*10\b',             # 5/10, 6/10, 7/10
                r'\boverall\s+experience:\s*neutral\b',  # Overall Experience: Neutral
            ]
            
            # 2. Explicit neutral/mixed language - ONLY if no negative indicators
            explicit_neutral_patterns = [
                r'\bmixed\s+experience\b',           # mixed experience
                r'\bfairly\s+standard\b',            # fairly standard
            ]
            
            # Only match "satisfactory" if it's truly positive context (no negatives)
            is_explicit_neutral = False
            
            # Check for explicit neutral ratings first (these are strong signals)
            if any(re.search(pattern, text_lower) for pattern in neutral_rating_patterns):
                # Check it's not a low rating like 2/5
                if not re.search(r'\b[12]\s*/\s*5\b', text_lower) and not re.search(r'\b[12]\s+stars?\b', text_lower):
                    is_explicit_neutral = True
            
            # Check for neutral language only if no negative words present
            if not has_any_negative:
                if any(re.search(pattern, text_lower) for pattern in explicit_neutral_patterns):
                    is_explicit_neutral = True
                # "satisfactory" only counts as neutral if no negative indicators
                if 'satisfactory' in text_lower:
                    is_explicit_neutral = True
            
            if is_explicit_neutral:
                return 'neutral', 0.75
            
            # ============================================================
            # ARABIC RULE-BASED VERIFICATION
            # Arabic ML model (CAMeL) can be inconsistent, so we verify with keywords
            # ============================================================
            if language == "AR":
                ml_sentiment, confidence = self._verify_arabic_sentiment(text, ml_sentiment, confidence)
                return ml_sentiment, confidence
            
            # ============================================================
            # FOR LONG FEEDBACKS: Use weighted scoring approach
            # Short feedbacks (< 50 words): Use pattern matching
            # Long feedbacks (>= 50 words): Count positive vs negative
            # ============================================================
            word_count = len(text_lower.split())
            
            if word_count >= 50:
                # LONG FEEDBACK: Use weighted scoring
                
                # Strong positive indicators (high weight)
                strong_positive = ['excellent', 'fantastic', 'amazing', 'wonderful', 'outstanding', 
                                   'exceptional', 'superb', 'brilliant', 'immaculate', 'perfect', 'best',
                                   'very good', 'really good', 'pretty good', 'quite good',
                                   'staff very good', 'service very good', 'very nice', 'really nice',
                                   'above average', 'well done', 'highly recommend']
                
                # Medium positive indicators
                medium_positive = ['great', 'lovely', 'impressed', 'impressive', 'professional',
                                   'comfortable', 'recommend', 'smooth', 'spacious', 'roomy', 'ample',
                                   'enjoyed', 'love', 'loved', 'no complaints', 'on time', 'early']
                
                # Weak positive (don't count as strongly)
                weak_positive = ['good', 'nice', 'pleasant', 'friendly', 'helpful', 'clean', 
                                 'acceptable', 'ok', 'decent', 'fine', 'new']
                
                # Strong negative indicators (high weight)
                strong_negative = ['terrible', 'horrible', 'awful', 'worst', 'disgusting', 
                                   'unacceptable', 'nightmare', 'avoid', 'never again', 
                                   'biggest problem', 'not friendly at all', 'very poor',
                                   'never fly', 'never recommend', 'waste of money', 'rip off']
                
                # Medium negative indicators
                medium_negative = ['disappointed', 'disappointing', 'poor', 'rude', 'unprofessional',
                                   'dirty', 'filthy', 'delayed', 'lost', 'problem', 'disinterested',
                                   'apathetic', 'incompetent', 'impersonal', 'not friendly', 'bad']
                
                # Weak negative (don't count as strongly)
                weak_negative = ['tired', 'tatty', 'cramped', 'uncomfortable', 'late', 
                                 'limited', 'below', 'ordinary', 'older plane', 'old plane']
                
                # Helper function - simple contains but avoid substring matches
                def score_text(word_list, text, weight):
                    score = 0
                    for word in word_list:
                        if ' ' in word:
                            # Phrase - direct match
                            if word in text:
                                score += weight
                        else:
                            # Single word - check it's not part of another word
                            # Use simple spacing check
                            patterns = [
                                f' {word} ', f' {word}.', f' {word},', f' {word}!',
                                f' {word}-', f'{word} ', f' {word}\n', f' {word}:'
                            ]
                            if any(p in f' {text} ' for p in patterns):
                                score += weight
                    return score
                
                # Count occurrences with weights
                pos_score = 0
                neg_score = 0
                
                pos_score += score_text(strong_positive, text_lower, 3)
                pos_score += score_text(medium_positive, text_lower, 2)
                pos_score += score_text(weak_positive, text_lower, 0.5)
                
                neg_score += score_text(strong_negative, text_lower, 4)
                neg_score += score_text(medium_negative, text_lower, 2)
                neg_score += score_text(weak_negative, text_lower, 0.5)
                
                # Check for explicit neutral phrases
                neutral_phrases = [
                    'nothing bad but nothing', 'nothing too good', 'nothing special',
                    'average experience', 'alright nothing bad', 'not bad not great',
                    'could be better could be worse', 'mixed feelings', 'pros and cons',
                    'mixed experience', 'fairly standard', 'satisfactory', 'overall satisfactory',
                    'had its moments', 'room for improvement', 'hit or miss'
                ]
                has_neutral_phrase = any(phrase in text_lower for phrase in neutral_phrases)
                
                # Determine sentiment based on score difference
                score_diff = pos_score - neg_score
                total_score = max(pos_score + neg_score, 1)
                
                # Calculate ratio of smaller to larger score
                if total_score > 0 and max(pos_score, neg_score) > 0:
                    ratio = min(pos_score, neg_score) / max(pos_score, neg_score)
                else:
                    ratio = 0
                
                # Balanced = ratio is close (both sides have comparable weight)
                # ratio >= 0.5 means smaller score is at least 50% of larger
                # AND the difference is not too extreme
                is_balanced = ratio >= 0.5 and abs(score_diff) <= 6
                
                if has_neutral_phrase:
                    # Explicit neutral phrase found
                    ml_sentiment = 'neutral'
                    confidence = 0.75
                elif is_balanced:
                    # Both positive and negative elements present and close
                    ml_sentiment = 'neutral'
                    confidence = 0.70
                elif score_diff >= 7:
                    # Clearly more positive (need strong majority)
                    ml_sentiment = 'positive'
                    confidence = min(0.95, 0.70 + (score_diff / total_score) * 0.25)
                elif score_diff <= -4:
                    # Clearly more negative
                    ml_sentiment = 'negative'
                    confidence = min(0.95, 0.70 + (abs(score_diff) / total_score) * 0.25)
                elif is_balanced:
                    # Balanced feedback = neutral
                    ml_sentiment = 'neutral'
                    confidence = 0.70
                else:
                    # Slight lean - use ML result with lower confidence
                    confidence = min(confidence, 0.65)
                
                return ml_sentiment, confidence
            
            # ============================================================
            # SHORT FEEDBACKS: Use pattern matching (original logic)
            # ============================================================
            
            # MIXED SENTIMENT PATTERNS - Check FIRST (highest priority)
            # These override both positive and negative classifications
            mixed_sentiment_patterns = [
                # Positive followed by "but/however" + negative
                r'\b(good|great|nice|excellent|friendly|helpful|comfortable|pleasant|satisfied)\b.{0,40}\b(but|however|although|though|yet)\b.{0,40}\b(bad|poor|terrible|delayed|late|problem|issue|disappointing|unacceptable|awful|horrible|worst|uncomfortable)\b',
                # Negative followed by "but/however" + positive  
                r'\b(bad|poor|terrible|delayed|late|problem|issue|disappointing|unacceptable|uncomfortable)\b.{0,40}\b(but|however|although|though|yet)\b.{0,40}\b(good|great|nice|excellent|friendly|helpful|pleasant)\b',
                # Specific mixed patterns with variations
                r'\b(liked|enjoyed|good|nice|great)\b.{0,30}(but|however).{0,30}(didn\'t|don\'t|not|problem|issue|delay|late|bad|poor)\b',
                r'\b(didn\'t|don\'t|not|problem|issue|delay|late|bad)\b.{0,30}(but|however).{0,30}(liked|enjoyed|good|nice|great)\b',
                # "X was Y but Z was W" patterns - extended with "however"
                r'\b(\w+)\s+(was|were)\s+(nice|good|great|friendly)\b.{0,40}\b(but|however)\b.{0,40}\b(was|were)\s+(bad|terrible|unacceptable|delayed|late|awful|uncomfortable)\b',
                r'\b(\w+)\s+(was|were)\s+(bad|terrible|awful|delayed|uncomfortable)\b.{0,40}\b(but|however)\b.{0,40}\b(was|were)\s+(nice|good|great|friendly)\b',
                # Double negation patterns (wasn't X... wasn't Y) - NEUTRAL
                r'\b(wasn\'t|weren\'t|isn\'t|aren\'t)\s+\w+\s+.{0,30}(wasn\'t|weren\'t|isn\'t|aren\'t)\s+\w+\b',
                # "wasn't terrible but wasn't amazing" type patterns
                r'\b(wasn\'t|weren\'t)\s+(terrible|awful|bad|horrible).{0,30}(wasn\'t|weren\'t)\s+(great|amazing|excellent|good)\b',
                r'\b(wasn\'t|weren\'t)\s+(great|amazing|excellent|good).{0,30}(wasn\'t|weren\'t)\s+(terrible|awful|bad|horrible)\b',
                # Room for improvement patterns
                r'\broom\s+for\s+improvement\b',
                r'\bcould\s+(use|have)\s+(some\s+)?improvement\b',
                r'\bimprovement\s+.{0,20}(but|however).{0,20}(not\s+)?(terrible|bad|awful)\b',
            ]
            
            is_mixed_sentiment = any(re.search(pattern, text_lower) for pattern in mixed_sentiment_patterns)
            
            if is_mixed_sentiment:
                ml_sentiment = 'neutral'
                confidence = 0.75  # Mixed signals = neutral with decent confidence
            else:
                # ============================================================
                # STRONG NEGATIVE PATTERNS - Only if NOT mixed sentiment
                # ============================================================
                strong_negative_patterns = [
                    r'\bnever\s+(recommend|again|fly|use|come\s*back|return|book|trust)\b',
                    r'\b(would\s*not|wouldn\'t|won\'t)\s+recommend\b',
                    r'\b(avoid|stay\s*away|don\'t\s*use|waste\s*of)\b',
                    r'\b(worst|terrible|horrible|awful|disgusting)\b(?!.{0,30}\b(but|however|although)\b)',  # Not followed by "but"
                    r'\b(never\s+again|total\s+disaster|complete\s+failure)\b',
                    r'\b(rip\s*off|scam|fraud|nightmare)\b',
                    r'\bmediocre\b'  # "mediocre" is always negative
                ]
                
                is_strong_negative = any(re.search(pattern, text_lower) for pattern in strong_negative_patterns)
                
                if is_strong_negative:
                    ml_sentiment = 'negative'
                    confidence = max(confidence, 0.85)
                else:
                    # ============================================================
                    # ENHANCED NEUTRAL PATTERNS - Comprehensive detection
                    # ============================================================
                    
                    # Use class-level patterns if available, otherwise define inline
                    if hasattr(self, 'neutral_patterns_en'):
                        neutral_patterns = self.neutral_patterns_en + self.neutral_patterns_ar
                    else:
                        neutral_patterns = [
                            r'\b(okay|ok|alright|average|so-so|decent|acceptable|fair|moderate)\b',
                            r'\b(could be better|nothing special|not bad|not great)\b',
                            r'\bعادي\b|\bمقبول\b|\bمتوسط\b'
                        ]
                    
                    # Additional in-line patterns for comprehensive neutral detection
                    extended_neutral_patterns = [
                        # Basic neutral words
                        r'\b(okay|ok|alright|average|so-so|decent|acceptable|fair|moderate|fine)\b',
                        # "It was X" patterns
                        r'\b(it\s+was|was|is|are)\s+(okay|ok|fine|decent|average|alright|acceptable)\b',
                        # "Not bad/great" patterns (neutral, not strongly positive/negative)
                        r'\bnot\s+(bad|terrible|great|amazing)\b(?!.{0,15}(but|however))',
                        # "Could be better/worse" patterns
                        r'\bcould\s+(be|have\s+been)\s+(better|worse)\b',
                        r'\broom\s+for\s+improvement\b',
                        r'\bcould\s+improve\b',
                        # Expectation patterns
                        r'\b(met|meets)\s+(my\s+)?expectations?\b',
                        r'\bas\s+(i\s+)?expected\b',
                        r'\bnothing\s+(special|extraordinary|remarkable|to\s+write\s+home\s+about)\b',
                        # Hedging language
                        r'\b(i\s+guess|i\s+suppose)\s+(it\'?s?\s+)?(okay|fine|alright)\b',
                        # "Just" patterns (minimizing)
                        r'\bjust\s+(okay|fine|average|normal)\b',
                        # Neither patterns
                        r'\bneither\s+good\s+nor\s+bad\b',
                        r'\bneither\s+great\s+nor\s+terrible\b',
                        # Specific neutral phrases
                        r'\b(no\s+complaints?|can\'t\s+complain|nothing\s+wrong)\b',
                        r'\b(did\s+the\s+job|got\s+the\s+job\s+done|served\s+its\s+purpose)\b',
                        r'\b(standard|typical|normal)\s+(service|flight|experience)\b',
                        # Quantified neutral (middle ratings)
                        r'\b(3|three)\s*(out\s+of|/)\s*(5|five)\b',
                        r'\b(5|6|7)\s*(out\s+of|/)\s*10\b',
                        # Arabic neutral patterns
                        r'\bعادي\s*(جدا|جداً)?\b',
                        r'\bمقبول\b',
                        r'\bمتوسط\b',
                        r'\bلا\s*بأس\b',
                        r'\bمعقول\b',
                        r'\bنص\s*نص\b',
                        r'\bزي\s*العادة\b',
                        r'\bكالمتوقع\b',
                    ]
                    
                    # Combine all neutral patterns
                    all_neutral_patterns = neutral_patterns + extended_neutral_patterns
                    
                    has_neutral_pattern = any(re.search(pattern, text_lower) for pattern in all_neutral_patterns)
                    
                    # Also check for neutral word presence (both English and Arabic)
                    has_neutral_words = False
                    text_words = set(text_lower.split())
                    
                    # Check English neutral words
                    if hasattr(self, 'neutral_words_en'):
                        neutral_word_count_en = len(text_words.intersection(self.neutral_words_en))
                        if neutral_word_count_en >= 1:
                            has_neutral_words = True
                    
                    # Check Arabic neutral words (important for Arabic text!)
                    if hasattr(self, 'neutral_words_ar') and language == "AR":
                        neutral_word_count_ar = len(text_words.intersection(self.neutral_words_ar))
                        if neutral_word_count_ar >= 1:
                            has_neutral_words = True
                    
                    # Check for low confidence from ML model (indicates uncertainty)
                    low_ml_confidence = confidence < 0.60
                    
                    # If neutral patterns OR neutral words (for Arabic always, for English if low confidence)
                    if has_neutral_pattern:
                        ml_sentiment = 'neutral'
                        confidence = 0.70
                    elif has_neutral_words and (language == "AR" or low_ml_confidence):
                        # For Arabic, neutral words are strong indicators
                        # For English, only if ML is uncertain
                        ml_sentiment = 'neutral'
                        confidence = 0.70 if language == "AR" else 0.60
            
            # Apply negation handling - this is crucial!
            # If we detect negation and the ML model doesn't catch it, override
            has_negation, negated_words = self.detect_negation(text, language)
            
            if has_negation and len(negated_words) > 0:
                # Check if ML missed a negated positive
                if ml_sentiment == 'positive':
                    # Check if positive words are negated
                    text_lower = text.lower()
                    pos_words = self.positive_words_en if language in ["EN", "Mixed"] else self.positive_words_ar
                    
                    negation_detected = False
                    for neg_word in negated_words:
                        neg_word_lower = neg_word.lower()
                        # Check if the negated word is a positive word
                        if neg_word_lower in pos_words or any(pos in neg_word_lower or neg_word_lower in pos for pos in pos_words):
                            # Positive word is negated - flip to negative
                            ml_sentiment = 'negative'
                            confidence = max(0.70, min(0.85, confidence * 0.9))  # Adjust confidence
                            negation_detected = True
                            break
                    
                    # Also check common negation patterns if not already detected
                    if not negation_detected:
                        negation_patterns = [
                            r"not\s+(good|great|nice|happy|satisfied|comfortable|helpful|pleased|excellent|fine)",
                            r"(don't|doesn't|didn't|won't|wouldn't|can't|couldn't)\s+(like|love|enjoy|recommend|want|appreciate)",
                            r"never\s+(again|recommend|fly|use|return|come\s+back)",
                            r"(wasn't|weren't|isn't|aren't)\s+(good|helpful|friendly|professional|pleasant|comfortable)",
                            r"no\s+(good|help|service|support|response)",
                            r"nothing\s+(good|positive|helpful|useful)"
                        ]
                        for pattern in negation_patterns:
                            if re.search(pattern, text_lower):
                                ml_sentiment = 'negative'
                                confidence = max(0.75, confidence * 0.9)
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
    
    def analyze_batch(self, texts: list, use_ml: bool = True) -> list:
        """
        Analyze sentiment for a batch of texts
        Defaults to use_ml=True for better accuracy
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
