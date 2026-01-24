Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Project directory
projectDir = "d:\Gruaduation project\Code of project\Egyptair-feedback-system"
backendDir = projectDir & "\backend"

' Kill existing processes first
WshShell.Run "taskkill /f /im python.exe", 0, True
WshShell.Run "taskkill /f /im node.exe", 0, True
WScript.Sleep 2000

' Start Backend Server (completely hidden, no window)
WshShell.Run "cmd /c cd /d """ & backendDir & """ && python -m uvicorn main:app --host 0.0.0.0 --port 8001", 0, False

' Wait for backend to start
WScript.Sleep 4000

' Start Frontend Server (completely hidden, no window)
WshShell.Run "cmd /c cd /d """ & projectDir & """ && npm run dev", 0, False

' Wait for frontend to start
WScript.Sleep 5000

' Open browser automatically
WshShell.Run "http://localhost:5173"
