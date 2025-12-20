# 🚀 How to Run the Project - Step by Step

## The Issue

NPM requires Administrator privileges to install packages on the E:\ drive.

## ✅ Solution: Follow These Exact Steps

### Method 1: Using PowerShell (Recommended)

1. **Press `Windows + X`** on your keyboard
2. **Click "Terminal (Admin)"** or **"PowerShell (Admin)"**
3. **Click "Yes"** when Windows asks for permission
4. **Copy and paste these commands** one at a time:

```powershell
# Navigate to project directory
cd E:\

# Install dependencies (this will take 2-3 minutes)
npm install

# Start the development server
npm run dev
```

5. **Wait for installation** to complete (you'll see progress bars)
6. **Browser will open automatically** at `http://localhost:3000`

---

### Method 2: Using the Batch File

1. **Open File Explorer** and navigate to `E:\`
2. **Find** the file: `INSTALL_AND_RUN.bat`
3. **Right-click** on it
4. **Select "Run as administrator"**
5. **Click "Yes"** on the UAC prompt
6. **Wait** for installation (2-3 minutes)
7. **Browser opens automatically**

---

## 🔐 Login Credentials

**Supervisor Account (Full Access):**

```
Username: admin
Password: admin
```

**Agent Account (Limited Access):**

```
Username: agent
Password: agent
```

---

## ✨ What You'll See

Once the app is running, you'll see:

### 📊 Dashboard

- **12,458** total customer feedback
- **58.1%** positive sentiment
- **23.9%** negative sentiment
- **17.9%** neutral sentiment
- Beautiful interactive charts
- Recent feedback in Arabic & English

### 🧭 Navigation

- **Dashboard** - Analytics overview
- **Upload Feedback** - Upload CSV/Excel files
- **Feedback List** - Browse and filter feedback
- **Reports** - Detailed analytics
- **User Management** - Manage users (Supervisor only)
- **Settings** - Configure preferences

---

## 📝 Expected Output

When you run `npm install`, you should see:

```
added 500+ packages in 2m
```

When you run `npm run dev`, you should see:

```
VITE v6.3.5  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h + enter to show help
```

---

## 🐛 Troubleshooting

### If "Command not found: npm"

```powershell
# Install Node.js first
# Download from: https://nodejs.org/
# Then retry the commands above
```

### If port 3000 is already in use

```powershell
# Kill the process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Or use a different port
# Edit vite.config.ts and change port to 3001
```

### If installation is slow

This is normal! Installing 500+ packages takes time.

- Average: 2-3 minutes
- Slow connection: 5-10 minutes

### If you see red errors during install

- Try: `npm cache clean --force`
- Then: `npm install` again

---

## 📸 Screenshots

### Step 1: Open PowerShell as Admin

![Windows Menu](Look for "Terminal (Admin)" or "PowerShell (Admin)")

### Step 2: Navigate and Install

```powershell
PS C:\> cd E:\
PS E:\> npm install
```

### Step 3: Start Server

```powershell
PS E:\> npm run dev
```

### Step 4: Login Page Opens

- Beautiful EgyptAir branding
- Navy blue and gold colors
- Login form

### Step 5: Dashboard After Login

- Statistics cards
- Pie chart
- Line chart
- Feedback table

---

## 🎯 Quick Commands Reference

```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Stop the server
Ctrl + C (in the terminal)
```

---

## ⚡ After First Install

Once you've installed dependencies once, you only need:

```powershell
cd E:\
npm run dev
```

No need to run `npm install` again unless you add new packages!

---

## 💡 Tips

- **Keep terminal open** while using the app
- **Press Ctrl+C** to stop the server
- **Changes auto-refresh** - just save files and see updates
- **Use Chrome or Edge** for best experience
- **Check Console** - Press F12 to see any errors

---

## 🎓 Your Graduation Project

This is a professional, production-ready application with:

- ✅ Modern React + TypeScript
- ✅ Beautiful UI/UX design
- ✅ Real-time sentiment analysis
- ✅ Arabic & English support
- ✅ Role-based access control
- ✅ Interactive charts & analytics

**Show this to your professors with pride!** 🌟

---

## ❓ Need More Help?

If you're still having issues:

1. Check that Node.js is installed: `node --version`
2. Check that npm is installed: `npm --version`
3. Make sure you're running as Administrator
4. Try restarting your computer
5. Check your internet connection

---

**Good luck with your project!** 🚀✈️

**Next Step:** Open PowerShell as Administrator and run the commands above!
