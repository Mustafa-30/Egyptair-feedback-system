"""
File Upload Service for CSV/Excel processing
"""
import os
import io
from typing import List, Dict, Optional
from datetime import datetime

import pandas as pd
from fastapi import UploadFile, HTTPException

from app.core.config import settings
from app.services.sentiment_service import sentiment_analyzer


def auto_prioritize(text: str, sentiment: str, confidence: float) -> str:
    """
    Auto-assign priority based on sentiment, confidence, and keywords.
    
    Priority levels:
    - urgent: Very negative with high confidence + critical keywords
    - high: Negative with high confidence or urgent keywords
    - medium: Negative with lower confidence, neutral, or mixed signals
    - low: Positive feedback or minor issues
    """
    text_lower = text.lower()
    
    # Urgent keywords (require immediate attention)
    urgent_keywords = [
        'danger', 'unsafe', 'emergency', 'injured', 'lawsuit', 'legal', 'lawyer',
        'refund now', 'compensation', 'worst ever', 'never again', 'report to',
        'media', 'news', 'tweet', 'social media', 'viral', 'health hazard',
        'خطير', 'طوارئ', 'محامي', 'قانوني', 'أسوأ', 'تعويض', 'إعلام'
    ]
    
    # High priority keywords
    high_keywords = [
        'lost baggage', 'luggage lost', 'missing bag', 'delayed hours', 'cancelled',
        'missed connection', 'refund', 'very disappointed', 'terrible', 'horrible',
        'unacceptable', 'disgusting', 'rude staff', 'worst', 'outrageous',
        'حقيبة مفقودة', 'أمتعة ضائعة', 'ملغي', 'استرداد', 'سيء جدا', 'فظيع'
    ]
    
    # Check for urgent keywords
    has_urgent = any(keyword in text_lower for keyword in urgent_keywords)
    has_high = any(keyword in text_lower for keyword in high_keywords)
    
    # Priority determination logic
    if sentiment == "negative":
        if has_urgent or (confidence >= 90 and has_high):
            return "urgent"
        elif has_high or confidence >= 80:
            return "high"
        elif confidence >= 60:
            return "medium"
        else:
            return "low"
    elif sentiment == "neutral":
        if has_urgent:
            return "high"
        elif has_high:
            return "medium"
        else:
            return "low"
    else:  # positive
        return "low"


class UploadService:
    """
    Service for processing uploaded files (CSV, Excel)
    """
    
    ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}
    
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.max_size = settings.MAX_UPLOAD_SIZE
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def validate_file(self, file: UploadFile) -> bool:
        """
        Validate uploaded file
        """
        # Check file extension
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        
        if ext not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )
        
        return True
    
    async def read_file(self, file: UploadFile) -> pd.DataFrame:
        """
        Read uploaded file into pandas DataFrame
        """
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > self.max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {self.max_size / 1024 / 1024:.1f}MB"
            )
        
        try:
            if ext == '.csv':
                # Try different encodings
                for encoding in ['utf-8', 'utf-8-sig', 'cp1256', 'iso-8859-1']:
                    try:
                        df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise HTTPException(status_code=400, detail="Could not decode CSV file")
            else:
                df = pd.read_excel(io.BytesIO(content))
            
            return df
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error reading file: {str(e)}"
            )
    
    def validate_dataframe(self, df: pd.DataFrame) -> Dict:
        """
        Validate DataFrame structure and return info
        
        Expected columns (prioritized order):
        - text/feedback (REQUIRED): The feedback text
        - customer_name (optional): Customer's full name  
        - flight_number (optional): Flight identifier (e.g., MS777)
        - flight_date (optional): Date of the flight
        - language (optional): 'ar' or 'en' (auto-detected if not provided)
        """
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Normalize column names (lowercase and strip whitespace)
        df.columns = [str(col).lower().strip() for col in df.columns]
        
        # Priority order for text column detection
        text_columns = ['text', 'feedback', 'comment', 'review', 'message', 'feedback_review', 'description']
        found_text_col = None
        
        for col in text_columns:
            if col in df.columns:
                found_text_col = col
                break
        
        # If no standard column found, use first column with text data
        if found_text_col is None:
            for col in df.columns:
                if df[col].dtype == 'object' and df[col].str.len().mean() > 20:
                    found_text_col = col
                    break
        
        if found_text_col is None:
            raise HTTPException(
                status_code=400,
                detail="Could not find feedback text column. Please include a column named 'text' or 'feedback'."
            )
        
        # Detect other expected columns
        detected_columns = {
            "text_column": found_text_col,
            "customer_name_column": self._find_column(df, ['customer_name', 'name', 'customer', 'full_name']),
            "flight_number_column": self._find_column(df, ['flight_number', 'flight', 'flight_no', 'flight_id']),
            "flight_date_column": self._find_column(df, ['flight_date', 'date', 'travel_date', 'flight_dt', 'feedback_date']),
            "language_column": self._find_column(df, ['language', 'lang', 'language_code'])
        }
        
        return {
            "total_rows": len(df),
            "columns": list(df.columns),
            "text_column": found_text_col,
            "detected_columns": detected_columns,
            "sample_data": df.head(5).to_dict(orient='records')
        }
    
    def _find_column(self, df: pd.DataFrame, possible_names: List[str]) -> Optional[str]:
        """
        Find a column by checking multiple possible names
        """
        for name in possible_names:
            if name in df.columns:
                return name
        return None
    
    def process_feedback_data(
        self,
        df: pd.DataFrame,
        text_column: str,
        analyze_sentiment: bool = True
    ) -> List[Dict]:
        """
        Process DataFrame and extract feedback data
        
        Prioritized columns (your preferred format):
        - text/feedback (REQUIRED): The feedback text
        - customer_name: Customer's full name
        - flight_number: Flight identifier (e.g., MS777)
        - flight_date: Date of the flight
        - language: 'ar' or 'en' (auto-detected if not provided)
        
        Omitted columns (not extracted):
        - customer_email
        - service_type
        """
        results = []
        
        # Normalize column names
        df.columns = [str(col).lower().strip() for col in df.columns]
        text_column = text_column.lower().strip()
        
        # Find columns using priority order
        name_col = self._find_column(df, ['customer_name', 'name', 'customer', 'full_name'])
        flight_col = self._find_column(df, ['flight_number', 'flight', 'flight_no', 'flight_id'])
        date_col = self._find_column(df, ['flight_date', 'date', 'travel_date', 'flight_dt', 'feedback_date'])
        lang_col = self._find_column(df, ['language', 'lang', 'language_code'])
        
        for idx, row in df.iterrows():
            text = str(row.get(text_column, '')).strip()
            
            if not text or text == 'nan' or len(text) < 10:
                continue
            
            # Extract customer name
            customer_name = None
            if name_col and pd.notna(row.get(name_col)):
                customer_name = str(row[name_col]).strip()
                if customer_name == 'nan':
                    customer_name = None
            
            # Extract flight number
            flight_number = None
            if flight_col and pd.notna(row.get(flight_col)):
                flight_number = str(row[flight_col]).strip()
                if flight_number == 'nan':
                    flight_number = None
            
            # Extract flight date
            flight_date = None
            if date_col and pd.notna(row.get(date_col)):
                try:
                    flight_date = pd.to_datetime(row[date_col]).isoformat()
                except:
                    pass
            
            # Extract language (or auto-detect later)
            specified_language = None
            if lang_col and pd.notna(row.get(lang_col)):
                lang_value = str(row[lang_col]).strip().lower()
                if lang_value in ['ar', 'arabic', 'العربية']:
                    specified_language = 'AR'
                elif lang_value in ['en', 'english']:
                    specified_language = 'EN'
            
            feedback_data = {
                "text": text,
                "customer_name": customer_name,
                "customer_email": None,  # Omitted per user preference
                "flight_number": flight_number,
                "feedback_date": flight_date,
                "source": "upload"
            }
            
            # Analyze sentiment if requested
            if analyze_sentiment:
                analysis = sentiment_analyzer.analyze(text, use_ml=True)  # Force ML usage
                
                # Auto-assign priority based on sentiment and content
                priority = auto_prioritize(
                    text, 
                    analysis["sentiment"], 
                    analysis["confidence"]
                )
                
                feedback_data.update({
                    "sentiment": analysis["sentiment"],
                    "sentiment_confidence": analysis["confidence"],
                    "language": specified_language or analysis["language"],  # Use specified or auto-detected
                    "preprocessed_text": analysis["preprocessed_text"],
                    "model_version": analysis["model_version"],
                    "analyzed_at": datetime.utcnow().isoformat(),
                    "priority": priority  # Auto-assigned priority
                })
            elif specified_language:
                feedback_data["language"] = specified_language
                feedback_data["priority"] = "medium"  # Default priority when not analyzing
            
            results.append(feedback_data)
        
        return results
    
    async def save_file(self, file: UploadFile) -> str:
        """
        Save uploaded file to disk
        """
        filename = file.filename or f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        filepath = os.path.join(self.upload_dir, filename)
        
        content = await file.read()
        
        with open(filepath, 'wb') as f:
            f.write(content)
        
        # Reset file position
        await file.seek(0)
        
        return filepath


# Global instance
upload_service = UploadService()
