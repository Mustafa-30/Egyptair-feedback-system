"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    # Application
    APP_NAME: str = "EgyptAir Feedback API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/egyptair_db"
    
    # JWT
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3000,http://127.0.0.1:3002,http://127.0.0.1:5173"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"
    
    # Sentiment Analysis
    USE_GPU: bool = False
    MODEL_NAME: str = "aubmindlab/bert-base-arabertv02"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    """
    return Settings()


settings = get_settings()
