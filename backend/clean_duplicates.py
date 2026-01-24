"""
Clean up duplicate feedback entries from the database.
Keeps only the FIRST occurrence of each unique feedback text.
Run this script to remove all existing duplicates.
"""
import sys
sys.path.append('.')

from app.core.database import SessionLocal
from app.models.feedback import Feedback
from collections import defaultdict

def clean_duplicates():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("DUPLICATE FEEDBACK CLEANUP")
        print("=" * 60)
        
        # Get all feedback entries
        all_feedback = db.query(Feedback).order_by(Feedback.created_at.asc()).all()
        print(f"\nTotal feedback entries: {len(all_feedback)}")
        
        # Group by normalized text
        text_groups = defaultdict(list)
        for f in all_feedback:
            text_normalized = f.text.strip().lower()
            text_groups[text_normalized].append(f)
        
        # Find groups with duplicates
        duplicates_to_delete = []
        for text, feedbacks in text_groups.items():
            if len(feedbacks) > 1:
                # Keep the first one (oldest), delete the rest
                original = feedbacks[0]
                duplicates = feedbacks[1:]
                
                print(f"\n⚠️  Found {len(feedbacks)} copies of:")
                print(f"   '{text[:60]}...'")
                print(f"   ✓ Keeping ID: {original.feedback_id} (created: {original.created_at})")
                
                for dup in duplicates:
                    print(f"   ✗ Deleting ID: {dup.feedback_id} (created: {dup.created_at})")
                    duplicates_to_delete.append(dup.feedback_id)
        
        if not duplicates_to_delete:
            print("\n✅ No duplicates found! Database is clean.")
            return
        
        print(f"\n" + "=" * 60)
        print(f"Total duplicates to remove: {len(duplicates_to_delete)}")
        print("=" * 60)
        
        # Confirm before deleting
        confirm = input("\nProceed with deletion? (yes/no): ").strip().lower()
        
        if confirm == 'yes':
            # Delete duplicates
            deleted_count = db.query(Feedback).filter(
                Feedback.feedback_id.in_(duplicates_to_delete)
            ).delete(synchronize_session=False)
            
            db.commit()
            
            print(f"\n✅ Successfully deleted {deleted_count} duplicate entries!")
            
            # Verify
            remaining = db.query(Feedback).count()
            print(f"✅ Remaining feedback entries: {remaining}")
        else:
            print("\n❌ Deletion cancelled.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    clean_duplicates()
