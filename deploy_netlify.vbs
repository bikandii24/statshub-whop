Set oShell = CreateObject("WScript.Shell")
Set oFS = CreateObject("Scripting.FileSystemObject")

Dim sPath
sPath = oFS.GetParentFolderName(WScript.ScriptFullName)

' Confirm before deploying
Dim respuesta
respuesta = MsgBox("¿Lanzar deploy a producción en Netlify?" & Chr(13) & Chr(10) & Chr(13) & Chr(10) & "  Web: https://hub-stats.netlify.app", vbYesNo + vbQuestion, "Stats Hub — Deploy")

If respuesta = vbYes Then
    ' Build + deploy to production using Netlify CLI
    oShell.Run "cmd /c cd /d """ & sPath & """ && git add -A && git commit -m ""Deploy: "" && netlify deploy --prod --dir=.next 2>&1", 1, True
    MsgBox "✅ Deploy completado. Visita https://hub-stats.netlify.app", vbInformation, "Stats Hub"
Else
    MsgBox "Deploy cancelado.", vbInformation, "Stats Hub"
End If
