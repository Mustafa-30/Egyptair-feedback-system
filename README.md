

  ## 🚀 Quick Start (RECOMMENDED)

**Double-click `START_SERVERS.bat`** - That's it! Everything starts automatically.

### ✅ What happens:
- Backend starts on port **8000**
- Frontend starts on port **3000**  
- Browser opens automatically
- Login with: **admin** / **admin123**

---

## 🛠️ Manual Setup (If needed)

### First Time Setup:
```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### Start Servers:
```bash
# Option 1: Automatic (Windows)
START_SERVERS.bat

# Option 2: Manual
# Terminal 1 - Backend:
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend:
npm run dev
```

### 🌐 Access:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 🔑 Default Login:
- **Username:** admin
- **Password:** admin123

---

## ⚠️ Troubleshooting

**"Invalid credentials" or connection errors?**
1. Make sure BOTH servers are running (check terminal windows)
2. Backend MUST be on port **8000** (not 8001)
3. Frontend expects backend at `http://localhost:8000`
4. Hard refresh browser (Ctrl+F5)

**Port already in use?**
```powershell
# Kill processes on port 8000 or 3000:
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```
  
