"""
Quick Password Reset Utility
Run this if you ever get locked out or forget the admin password
"""
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# New password
NEW_PASSWORD = "admin123"

# Update admin password
conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()

# Hash the new password
new_hash = pwd_context.hash(NEW_PASSWORD)

# Update admin user
cursor.execute('UPDATE users SET hashed_password = ? WHERE username = ?', (new_hash, 'admin'))
conn.commit()

if cursor.rowcount > 0:
    print("=" * 60)
    print("✅ ADMIN PASSWORD RESET SUCCESSFUL!")
    print("=" * 60)
    print(f"\n📧 Username: admin")
    print(f"🔑 Password: {NEW_PASSWORD}")
    print(f"\n✅ You can now login with these credentials")
    print("\nℹ️  If you want a different password, edit this file")
    print("    and change NEW_PASSWORD variable at the top\n")
else:
    print("❌ ERROR: Admin user not found in database")
    print("   Run: python seed_database.py")

conn.close()
