"""
Database Seeding Script
Run this to create initial admin and agent users
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.feedback import Feedback


def init_database():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")


def seed_users(db: Session):
    """Create default users - Only create one admin to start"""
    print("\nSeeding initial admin user...")
    
    # Check if any users exist
    existing_users = db.query(User).count()
    if existing_users > 0:
        print(f"  ⚠️  {existing_users} users already exist, skipping seed...")
        return
    
    # Create only admin user
    admin = User(
        email="admin@egyptair.com",
        username="admin",
        name="System Administrator",
        hashed_password=get_password_hash("admin123"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value
    )
    db.add(admin)
    print("  ✅ Created admin user (username: admin, password: admin123)")
    print("  ℹ️  Create additional users through the User Management page")
    
    db.commit()


def seed_sample_feedback(db: Session):
    """Create sample feedback data for testing"""
    print("\nSeeding sample feedback...")
    
    # Check if feedback already exists
    existing_count = db.query(Feedback).count()
    if existing_count > 0:
        print(f"  ⚠️  {existing_count} feedback entries already exist, skipping...")
        return
    
    # Get admin user for created_by
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("  ❌ Admin user not found, cannot create feedback")
        return
    
    sample_feedback = [
        {
            "customer_name": "أحمد محمد",
            "customer_email": "ahmed@example.com",
            "flight_number": "MS777",
            "text": "رحلة ممتازة! الطاقم كان رائعاً والخدمة ممتازة. سأسافر مع مصر للطيران مجدداً.",
            "sentiment": "positive",
            "sentiment_confidence": 92.5,
            "language": "AR",
            "source": "survey",
            "status": "reviewed",
            "priority": "low"
        },
        {
            "customer_name": "Sara Williams",
            "customer_email": "sara.w@example.com",
            "flight_number": "MS986",
            "text": "The flight was delayed for 3 hours with no explanation. Very disappointing experience.",
            "sentiment": "negative",
            "sentiment_confidence": 88.0,
            "language": "EN",
            "source": "email",
            "status": "pending",
            "priority": "high"
        },
        {
            "customer_name": "محمود السيد",
            "customer_email": "mahmoud@example.com",
            "flight_number": "MS001",
            "text": "الرحلة كانت عادية، لا شيء مميز ولا سيء.",
            "sentiment": "neutral",
            "sentiment_confidence": 75.0,
            "language": "AR",
            "source": "survey",
            "status": "pending",
            "priority": "medium"
        },
        {
            "customer_name": "John Smith",
            "customer_email": "john.s@example.com",
            "flight_number": "MS987",
            "text": "Excellent business class service. The food was amazing and the crew was very professional.",
            "sentiment": "positive",
            "sentiment_confidence": 95.0,
            "language": "EN",
            "source": "email",
            "status": "reviewed",
            "priority": "low"
        },
        {
            "customer_name": "فاطمة علي",
            "customer_email": "fatima@example.com",
            "flight_number": "MS402",
            "text": "فقدت حقيبتي في المطار ولم أجد أي مساعدة من الموظفين. تجربة سيئة جداً!",
            "sentiment": "negative",
            "sentiment_confidence": 91.0,
            "language": "AR",
            "source": "complaint",
            "status": "pending",
            "priority": "urgent"
        }
    ]
    
    for item in sample_feedback:
        feedback = Feedback(
            customer_name=item["customer_name"],
            customer_email=item["customer_email"],
            flight_number=item["flight_number"],
            text=item["text"],
            sentiment=item["sentiment"],
            sentiment_confidence=item["sentiment_confidence"],
            language=item["language"],
            source=item["source"],
            status=item["status"],
            priority=item["priority"],
            feedback_date=datetime.utcnow(),
            analyzed_at=datetime.utcnow(),
            model_version="rule-based-v1",
            created_by=admin.id
        )
        db.add(feedback)
    
    db.commit()
    print(f"  ✅ Created {len(sample_feedback)} sample feedback entries")


def main():
    """Main seeding function"""
    print("=" * 50)
    print("EgyptAir Feedback Analysis - Database Seeding")
    print("=" * 50)
    
    # Initialize database
    init_database()
    
    # Create session
    db = SessionLocal()
    
    try:
        seed_users(db)
        # Do NOT seed sample feedback - user wants clean database to upload their own data
        # seed_sample_feedback(db)
        
        print("\n" + "=" * 50)
        print("✅ Database seeding completed successfully!")
        print("=" * 50)
        print("\nDefault users:")
        print("  - Admin: admin / admin")
        print("\nYou can now start the server with:")
        print("  uvicorn main:app --reload")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
