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
        """
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Look for common column names (including user's format: feedback_id, feedback_review, feedback_date)
        text_columns = ['text', 'feedback', 'comment', 'description', 'message', 'review', 'feedback_review']
        found_text_col = None
        
        for col in df.columns:
            if col.lower() in text_columns:
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
                detail="Could not find feedback text column. Please include a column named 'text', 'feedback', or 'comment'."
            )
        
        return {
            "total_rows": len(df),
            "columns": list(df.columns),
            "text_column": found_text_col,
            "sample_data": df.head(5).to_dict(orient='records')
        }
    
    def process_feedback_data(
        self,
        df: pd.DataFrame,
        text_column: str,
        analyze_sentiment: bool = True
    ) -> List[Dict]:
        """
        Process DataFrame and extract feedback data
        """
        results = []
        
        for idx, row in df.iterrows():
            text = str(row.get(text_column, '')).strip()
            
            if not text or text == 'nan' or len(text) < 5:
                continue
            
            feedback_data = {
                "text": text,
                "customer_name": str(row.get('customer_name', row.get('name', ''))) if 'customer_name' in row or 'name' in row else None,
                "customer_email": str(row.get('customer_email', row.get('email', ''))) if 'customer_email' in row or 'email' in row else None,
                "flight_number": str(row.get('flight_number', row.get('flight', ''))) if 'flight_number' in row or 'flight' in row else None,
                "feedback_date": None,
                "source": "upload"
            }
            
            # Try to parse date (including user's feedback_date column)
            for date_col in ['feedback_date', 'date', 'created_at', 'timestamp']:
                if date_col in df.columns and pd.notna(row.get(date_col)):
                    try:
                        feedback_data["feedback_date"] = pd.to_datetime(row[date_col]).isoformat()
                    except:
                        pass
                    break
            
            # Try to get feedback ID if provided
            for id_col in ['feedback_id', 'id', 'ID']:
                if id_col in df.columns and pd.notna(row.get(id_col)):
                    feedback_data["external_id"] = str(row[id_col])
                    break
            
            # Analyze sentiment if requested
            if analyze_sentiment:
                analysis = sentiment_analyzer.analyze(text)
                feedback_data.update({
                    "sentiment": analysis["sentiment"],
                    "sentiment_confidence": analysis["confidence"],
                    "language": analysis["language"],
                    "preprocessed_text": analysis["preprocessed_text"],
                    "model_version": analysis["model_version"],
                    "analyzed_at": datetime.utcnow().isoformat()
                })
            
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
