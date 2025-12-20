# EgyptAir Feedback Analysis - Backend API

A FastAPI-based backend for the EgyptAir Feedback Analysis System with sentiment analysis capabilities.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **Role-Based Access Control** - Admin, Agent, and Viewer roles
- 📊 **Sentiment Analysis** - Arabic and English text analysis
- 📁 **File Upload** - CSV/Excel file processing with batch analysis
- 📈 **Analytics API** - Dashboard statistics and trend analysis
- 🌐 **CORS Enabled** - Frontend integration ready

## Tech Stack

- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with python-jose
- **Password Hashing**: bcrypt via passlib
- **NLP**: NLTK, Transformers (AraBERT)
- **Data Processing**: Pandas, openpyxl

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── requirements.txt     # Python dependencies
├── seed_database.py     # Database seeding script
├── .env                 # Environment configuration
└── app/
    ├── api/             # API route handlers
    │   ├── auth.py      # Authentication endpoints
    │   ├── users.py     # User management
    │   ├── feedback.py  # Feedback CRUD operations
    │   ├── upload.py    # File upload handling
    │   └── analytics.py # Dashboard statistics
    ├── core/            # Core utilities
    │   ├── config.py    # Settings management
    │   ├── database.py  # Database connection
    │   └── security.py  # Auth utilities
    ├── models/          # SQLAlchemy models
    │   ├── user.py      # User model
    │   └── feedback.py  # Feedback model
    ├── schemas/         # Pydantic schemas
    │   ├── auth.py      # Auth request/response
    │   ├── user.py      # User schemas
    │   └── feedback.py  # Feedback schemas
    └── services/        # Business logic
        ├── sentiment_service.py  # Sentiment analysis
        └── upload_service.py     # File processing
```

## Setup

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 13+ (or SQLite for development)
- pip or pipenv

### Installation

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   Create a `.env` file (or use the existing one) with:
   ```env
   DATABASE_URL=sqlite:///./egyptair_feedback.db
   SECRET_KEY=your-super-secret-key-change-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

5. **Initialize database and seed data**:
   ```bash
   python seed_database.py
   ```

6. **Start the server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## API Documentation

Once running, access the interactive API docs at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Default Users

| Username | Password | Role   |
|----------|----------|--------|
| admin    | admin    | Admin  |
| agent    | agent    | Agent  |
| viewer   | viewer   | Viewer |

⚠️ **Important**: Change these passwords in production!

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/register` - Register new user (admin only)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user info

### Users (Admin only)
- `GET /api/users/` - List all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users/` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Feedback
- `GET /api/feedback/` - List feedback (paginated)
- `GET /api/feedback/{id}` - Get feedback by ID
- `POST /api/feedback/` - Create feedback
- `PUT /api/feedback/{id}` - Update feedback
- `DELETE /api/feedback/{id}` - Delete feedback
- `POST /api/feedback/{id}/analyze` - Analyze sentiment
- `POST /api/feedback/analyze-bulk` - Bulk sentiment analysis

### File Upload
- `POST /api/upload/preview` - Preview file contents
- `POST /api/upload/process` - Process and save file data
- `POST /api/upload/analyze-batch` - Batch sentiment analysis

### Analytics
- `GET /api/analytics/stats` - Dashboard statistics
- `GET /api/analytics/trends` - Sentiment trends over time
- `GET /api/analytics/charts` - Chart data for visualization

## Sentiment Analysis

The system supports two modes:

### Rule-Based Analysis (Default)
- Uses keyword dictionaries for Arabic and English
- Fast and doesn't require ML models
- Good for basic sentiment detection

### ML-Based Analysis (Optional)
- Uses AraBERT for Arabic text
- Requires downloading transformer models (~500MB)
- Higher accuracy for Arabic text

To enable ML mode, set `USE_ML_MODEL=true` in `.env`.

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black .
isort .
```

### Type Checking
```bash
mypy .
```

## Production Deployment

1. Use PostgreSQL instead of SQLite
2. Set strong `SECRET_KEY`
3. Enable HTTPS
4. Set `CORS_ORIGINS` appropriately
5. Use environment variables for all secrets
6. Run with gunicorn + uvicorn workers:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

## License

MIT License - EgyptAir Feedback Analysis Project
