"""Test login functionality"""
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to database
conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()

# Get admin user
cursor.execute('SELECT username, hashed_password FROM users WHERE username="admin"')
user = cursor.fetchone()

if user:
    username, hashed_password = user
    print(f"Found user: {username}")
    print(f"Hash starts with: {hashed_password[:20]}...")
    
    # Test password
    test_passwords = ["admin123", "admin", "Admin123"]
    for pwd in test_passwords:
        result = pwd_context.verify(pwd, hashed_password)
        print(f"  Password '{pwd}': {'✅ VALID' if result else '❌ INVALID'}")
else:
    print("❌ Admin user not found!")

conn.close()
