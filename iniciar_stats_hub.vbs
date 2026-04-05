Set oShell = CreateObject("WScript.Shell")
Set oFS = CreateObject("Scripting.FileSystemObject")

' Kill existing node processes silently
oShell.Run "taskkill /f /im node.exe", 0, True

' Small wait to ensure port is free
WScript.Sleep 1500

' Open browser
oShell.Run "http://localhost:3000", 1, False

' Run npm dev in background silently (no terminal window)
Dim sPath
sPath = oFS.GetParentFolderName(WScript.ScriptFullName)
oShell.Run "cmd /c cd /d """ & sPath & """ && npm run dev -- -p 3000", 0, False
