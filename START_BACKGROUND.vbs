' EgyptAir Feedback System - Background Launcher
' Starts servers minimized so they persist when you close other windows

Set WshShell = CreateObject("WScript.Shell")
projectDir = "d:\Gruaduation project\Code of project\Egyptair-feedback-system"

' Kill existing servers first
WshShell.Run "taskkill /f /im python.exe", 0, True
WshShell.Run "taskkill /f /im node.exe", 0, True
WScript.Sleep 2000

' Start Backend (minimized window - stays running)
WshShell.Run "cmd /c cd /d """ & projectDir & "\backend"" && python -m uvicorn main:app --host 0.0.0.0 --port 8001", 2, False

WScript.Sleep 4000

' Start Frontend (minimized window - stays running)
WshShell.Run "cmd /c cd /d """ & projectDir & """ && npm run dev", 2, False

WScript.Sleep 5000

' Open browser
WshShell.Run "http://localhost:5173", 1, False

MsgBox "EgyptAir Feedback System is running!" & vbCrLf & vbCrLf & _
       "Backend: http://localhost:8001" & vbCrLf & _
       "Frontend: http://localhost:5173" & vbCrLf & vbCrLf & _
       "Login: admin / admin123" & vbCrLf & vbCrLf & _
       "Note: Two minimized windows are keeping the servers running." & vbCrLf & _
       "Do NOT close those windows or servers will stop." & vbCrLf & vbCrLf & _
       "To stop: Run STOP_ALL_SERVERS.vbs", _
       vbInformation, "EgyptAir System"
