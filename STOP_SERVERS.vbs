' EgyptAir Feedback System - Stop Servers
' This script stops all running servers

Set WshShell = CreateObject("WScript.Shell")

' Kill Python processes (backend)
WshShell.Run "cmd /c taskkill /F /IM python.exe", 0, True
WshShell.Run "cmd /c taskkill /F /IM python3.11.exe", 0, True

' Kill Node processes (frontend)  
WshShell.Run "cmd /c taskkill /F /IM node.exe", 0, True

MsgBox "All EgyptAir servers stopped.", vbInformation, "EgyptAir System"
