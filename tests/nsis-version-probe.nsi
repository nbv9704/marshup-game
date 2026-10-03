Unicode true
!include "..\build\installer-version.nsh"
OutFile "..\release\nsis-version-probe.exe"
SilentInstall silent

!macro probe OLD NEW LABEL
  StrCpy $MashupOldVersion "${OLD}"
  StrCpy $MashupNewVersion "${NEW}"
  Call MashupCompareVersions
  FileWrite $1 "${LABEL}=$MashupVersionOrder$\r$\n"
!macroend

Section
  FileOpen $1 "$EXEDIR\nsis-version-probe.txt" w
  !insertmacro probe "0.2.0" "0.3.0-beta.4" "old-stable"
  !insertmacro probe "0.3.0-beta.3" "0.3.0-beta.4" "old-beta"
  !insertmacro probe "0.3.0-beta.4" "0.3.0-beta.4" "same"
  !insertmacro probe "0.3.0-beta.5" "0.3.0-beta.4" "newer-beta"
  !insertmacro probe "0.3.0" "0.3.0-beta.4" "stable-vs-beta"
  !insertmacro probe "0.3.0-beta.4" "0.3.0" "beta-vs-stable"
  FileClose $1
SectionEnd
