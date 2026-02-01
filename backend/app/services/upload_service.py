"""
File Upload Service for CSV/Excel processing
"""
import os
import io
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime

import pandas as pd
from fastapi import UploadFile, HTTPException

from app.core.config import settings
from app.services.sentiment_service import sentiment_analyzer


def normalize_date(date_value, column_dates: List = None) -> Tuple[Optional[str], Optional[str]]:
    """
    Robust date normalization that handles multiple formats.
    Returns (normalized_date_iso, warning_message)
    
    Supported formats:
    - yyyy-mm-dd (ISO standard)
    - dd/mm/yyyy (European/International)
    - mm/dd/yyyy (US format)
    - dd-mm-yyyy
    - mm-dd-yyyy
    - dd.mm.yyyy
    - yyyy/mm/dd
    - Natural language dates
    """
    if pd.isna(date_value) or date_value is None:
        return None, None
    
    # If already a datetime object
    if isinstance(date_value, (datetime, pd.Timestamp)):
        return date_value.isoformat(), None
    
    date_str = str(date_value).strip()
    if not date_str or date_str.lower() in ['nan', 'nat', 'none', '']:
        return None, None
    
    warning = None
    
    # Try pandas parsing first (handles many formats automatically)
    try:
        # First try without dayfirst to see if it's unambiguous
        parsed = pd.to_datetime(date_str, infer_datetime_format=True)
        return parsed.isoformat(), None
    except:
        pass
    
    # Define format patterns to try
    formats_to_try = [
        # ISO formats (most reliable)
        ('%Y-%m-%d', None),
        ('%Y-%m-%d %H:%M:%S', None),
        ('%Y-%m-%dT%H:%M:%S', None),
        ('%Y-%m-%dT%H:%M:%S.%f', None),
        ('%Y/%m/%d', None),
        
        # European/International formats (day first)
        ('%d/%m/%Y', True),
        ('%d-%m-%Y', True),
        ('%d.%m.%Y', True),
        ('%d/%m/%Y %H:%M:%S', True),
        ('%d-%m-%Y %H:%M:%S', True),
        
        # US formats (month first)
        ('%m/%d/%Y', False),
        ('%m-%d-%Y', False),
        ('%m/%d/%Y %H:%M:%S', False),
        ('%m-%d-%Y %H:%M:%S', False),
        
        # Other common formats
        ('%B %d, %Y', None),  # January 15, 2024
        ('%b %d, %Y', None),  # Jan 15, 2024
        ('%d %B %Y', None),   # 15 January 2024
        ('%d %b %Y', None),   # 15 Jan 2024
    ]
    
    for fmt, is_dayfirst in formats_to_try:
        try:
            parsed = datetime.strptime(date_str, fmt)
            return parsed.isoformat(), None
        except ValueError:
            continue
    
    # Try to detect format from the value itself
    # Check for patterns like dd/mm/yyyy vs mm/dd/yyyy
    date_parts = re.split(r'[/\-.]', date_str.split()[0])  # Split on common separators
    if len(date_parts) == 3:
        part1, part2, part3 = date_parts
        
        try:
            p1, p2, p3 = int(part1), int(part2), int(part3)
            
            # If first part > 12, it must be day (European format)
            if p1 > 12 and p1 <= 31:
                # dd/mm/yyyy format
                if p3 > 100:  # 4-digit year
                    parsed = datetime(p3, p2, p1)
                else:  # 2-digit year
                    year = 2000 + p3 if p3 < 50 else 1900 + p3
                    parsed = datetime(year, p2, p1)
                return parsed.isoformat(), None
            
            # If second part > 12, it must be day (US format)
            elif p2 > 12 and p2 <= 31:
                # mm/dd/yyyy format
                if p3 > 100:
                    parsed = datetime(p3, p1, p2)
                else:
                    year = 2000 + p3 if p3 < 50 else 1900 + p3
                    parsed = datetime(year, p1, p2)
                return parsed.isoformat(), None
            
            # If first part looks like a year
            elif p1 > 1900:
                # yyyy/mm/dd format
                parsed = datetime(p1, p2, p3)
                return parsed.isoformat(), None
            
            # Ambiguous case (both could be day or month)
            # Use column_dates context to help decide if provided
            elif column_dates:
                # Check if other dates in column have values > 12 in first position
                dayfirst_count = sum(1 for d in column_dates 
                                    if d and int(re.split(r'[/\-.]', str(d).split()[0])[0]) > 12)
                if dayfirst_count > len(column_dates) * 0.3:
                    # Likely European format
                    try:
                        parsed = pd.to_datetime(date_str, dayfirst=True)
                        return parsed.isoformat(), "Date format ambiguous, assumed dd/mm/yyyy"
                    except:
                        pass
            
            # Default: try European format first (more common internationally)
            try:
                parsed = pd.to_datetime(date_str, dayfirst=True)
                warning = "Date format ambiguous, assumed dd/mm/yyyy (European format)"
                return parsed.isoformat(), warning
            except:
                pass
            
        except (ValueError, IndexError):
            pass
    
    # Last resort: let pandas try
    try:
        parsed = pd.to_datetime(date_str, errors='coerce')
        if pd.notna(parsed):
            return parsed.isoformat(), "Date parsed with potential ambiguity"
    except:
        pass
    
    return None, f"Could not parse date: {date_str}"


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
        
        # FLEXIBLE TEXT COLUMN DETECTION - accepts ANY reasonable column
        # Priority order for text column detection (expanded list)
        text_columns = [
            'text', 'feedback', 'comment', 'review', 'message', 'description',
            'feedback_review', 'customer_feedback', 'comments', 'reviews',
            'feedback_text', 'customer_comment', 'opinion', 'remarks',
            'notes', 'detail', 'details', 'content', 'body', 'input',
            'customer_review', 'passenger_feedback', 'response', 'note'
        ]
        found_text_col = None
        
        # Step 1: Check for standard column names
        for col in text_columns:
            if col in df.columns:
                found_text_col = col
                break
        
        # Step 2: Check for columns containing these keywords
        if found_text_col is None:
            for col in df.columns:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['text', 'feedback', 'comment', 'review', 'message']):
                    found_text_col = col
                    break
        
        # Step 3: Find ANY column with substantial text content (average length > 15 chars)
        if found_text_col is None:
            for col in df.columns:
                try:
                    if df[col].dtype == 'object':
                        # Calculate average text length (excluding NaN)
                        valid_texts = df[col].dropna().astype(str)
                        if len(valid_texts) > 0:
                            avg_length = valid_texts.str.len().mean()
                            if avg_length > 15:  # More flexible threshold
                                found_text_col = col
                                break
                except:
                    continue
        
        # Step 4: Last resort - use first object/string column
        if found_text_col is None:
            for col in df.columns:
                if df[col].dtype == 'object':
                    found_text_col = col
                    break
        
        # Only fail if truly no text column exists
        if found_text_col is None:
            raise HTTPException(
                status_code=400,
                detail=f"Could not find any text column in your file. Available columns: {', '.join(df.columns)}. Please ensure your file has at least one column with text data."
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
    ) -> Tuple[List[Dict], List[str]]:
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
        
        Returns: (results, date_warnings)
        """
        results = []
        date_warnings = []
        
        # Normalize column names
        df.columns = [str(col).lower().strip() for col in df.columns]
        text_column = text_column.lower().strip()
        
        # Find columns using priority order
        id_col = self._find_column(df, ['id', 'feedback_id', 'ID', 'Id', 'record_id', 'ref', 'reference'])
        name_col = self._find_column(df, ['customer_name', 'name', 'customer', 'full_name'])
        flight_col = self._find_column(df, ['flight_number', 'flight', 'flight_no', 'flight_id'])
        date_col = self._find_column(df, ['flight_date', 'date', 'travel_date', 'flight_dt', 'feedback_date'])
        lang_col = self._find_column(df, ['language', 'lang', 'language_code'])
        
        # Pre-collect all date values for context-based parsing
        all_dates = []
        if date_col:
            all_dates = [row.get(date_col) for _, row in df.iterrows() if pd.notna(row.get(date_col))]
        
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
            
            # Extract flight date with robust parsing
            flight_date = None
            if date_col and pd.notna(row.get(date_col)):
                parsed_date, warning = normalize_date(row[date_col], all_dates)
                flight_date = parsed_date
                if warning and len(date_warnings) < 10:  # Limit warnings
                    date_warnings.append(f"Row {idx + 1}: {warning}")
            
            # Extract language (or auto-detect later)
            specified_language = None
            if lang_col and pd.notna(row.get(lang_col)):
                lang_value = str(row[lang_col]).strip().lower()
                if lang_value in ['ar', 'arabic', 'العربية']:
                    specified_language = 'AR'
                elif lang_value in ['en', 'english']:
                    specified_language = 'EN'
            
            # Extract original ID from file
            original_id = None
            if id_col and pd.notna(row.get(id_col)):
                original_id = str(row[id_col]).strip()
                if original_id == 'nan':
                    original_id = None
            
            feedback_data = {
                "text": text,
                "original_id": original_id,
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
        
        return results, date_warnings
    
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
