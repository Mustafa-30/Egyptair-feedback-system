# 🚀 How to Start the EgyptAir Feedback Analysis System

## ✅ Quick Start (Easiest Method)

Just **double-click** one of these files:

- **`START_PROJECT.bat`** - For Command Prompt
- **`START_PROJECT.ps1`** - For PowerShell (recommended)

Both servers will start automatically in separate windows.

---

## 📋 Manual Start (If needed)

### Option 1: Using PowerShell (Recommended)
```powershell
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend (in new terminal)
npm run dev
```

### Option 2: Using the batch file
```cmd
START_PROJECT.bat
```

---

## 🌐 Access the Application

After starting:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## 🔑 Default Login Credentials

```
Username: admin
Password: admin
```

---

## ⚠️ Troubleshooting

### Problem: "This site can't be reached"

**Solution:**
1. Check if Node.js server is running (look for terminal with `VITE` messages)
2. Check if Backend server is running (look for terminal with `Uvicorn` messages)
3. If either stopped, run `START_PROJECT.bat` again

### Problem: "Invalid credentials"

**Solution:**
1. Reset the database:
   ```powershell
   cd backend
   Remove-Item egyptair.db
   python seed_database.py
   ```
2. Restart the backend server

### Problem: Port already in use

**Solution:**
1. Stop any running Python/Node processes:
   ```powershell
   Get-Process python* | Stop-Process -Force
   Get-Process node* | Stop-Process -Force
   ```
2. Start the project again

---

## 📊 What's New (Matching Your Diagrams)

✅ **5 Database Tables Created:**
- `users` - User accounts
- `feedbacks` - Customer feedback records
- `feedback_files` - Uploaded file tracking ⭐ NEW
- `reports` - Generated reports ⭐ NEW
- `dashboards` - Dashboard configurations ⭐ NEW

✅ **New API Endpoints:**
- `/api/v1/files/` - File management
- `/api/v1/reports/` - Report generation
- `/api/v1/dashboards/` - Dashboard management

✅ **All Diagram Entities Implemented:**
- ER Diagram: ✅ All 5 entities
- Class Diagram: ✅ All methods
- Sequence Diagram: ✅ Complete flow
- Use Case Diagram: ✅ All use cases

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (Dev Server)
- Tailwind CSS
- Recharts (Data Visualization)

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite Database
- AraBERT-v2 (Sentiment Analysis)

---

## 📝 Notes

- Both servers must be running for the application to work
- Don't close the terminal windows while using the application
- Database file: `backend/egyptair.db`
- Uploaded files stored in: `backend/uploads/`

---

## 🎯 Quick Tips

1. **To stop servers**: Close the terminal windows or press `Ctrl+C`
2. **To restart**: Run `START_PROJECT.bat` again
3. **To reset database**: Delete `egyptair.db` and run `seed_database.py`
4. **To view API docs**: Visit http://localhost:8000/docs

---

**Last Updated:** December 25, 2025
**Status:** ✅ Fully Operational
