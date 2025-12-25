' EgyptAir Feedback System - Hidden Launcher
' This script runs both servers in the background (no visible windows)

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the script's folder path
scriptPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' Kill any existing processes on ports 8000 and 3000
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True

' Wait a moment
WScript.Sleep 1000

' Start Backend Server (hidden)
WshShell.CurrentDirectory = scriptPath & "\backend"
WshShell.Run "cmd /c python -m uvicorn main:app --reload --port 8000 --host 127.0.0.1", 0, False

' Wait for backend to initialize
WScript.Sleep 4000

' Start Frontend Server (hidden)
WshShell.CurrentDirectory = scriptPath
WshShell.Run "cmd /c npm run dev", 0, False

' Wait for frontend to initialize
WScript.Sleep 4000

' Open browser
WshShell.Run "http://localhost:3000", 1, False

' Show success message
MsgBox "EgyptAir Feedback System Started!" & vbCrLf & vbCrLf & _
       "Frontend: http://localhost:3000" & vbCrLf & _
       "Backend: http://localhost:8000" & vbCrLf & vbCrLf & _
       "Login: admin / admin" & vbCrLf & vbCrLf & _
       "To STOP servers: Double-click STOP_SERVERS.vbs", _
       vbInformation, "EgyptAir System"
