; UI-only probe for the exact directory-page macro in build/installer.nsh.
; It never installs application files or touches the registry.
Unicode true
!define PRODUCT_NAME "Mashup Arena page probe"
!define APP_FILENAME "Mashup Arena"
!define VERSION "0.3.0-beta.4"
!define BUILD_RESOURCES_DIR "..\build"
!addincludedir "..\node_modules\app-builder-lib\templates\nsis\include"
!include "MUI2.nsh"
!include "..\build\installer.nsh"

!macro _isUpdated _a _b _t _f
  Goto `${_f}`
!macroend
!define isUpdated `"" isUpdated ""`

Name "Mashup Arena page probe"
!ifdef PROBE_FRESH
  OutFile "..\release\nsis-directory-fresh-probe.exe"
!else
  OutFile "..\release\nsis-directory-upgrade-probe.exe"
!endif
InstallDir "$TEMP\MashupArenaPageProbe"

Function .onInit
  !ifdef PROBE_FRESH
    StrCpy $MashupUpgrade "0"
  !else
    StrCpy $MashupUpgrade "1"
  !endif
FunctionEnd

Page custom ProbeIntro
!insertmacro customPageAfterChangeDir
!insertmacro MUI_PAGE_INSTFILES
Page custom ProbeDone
!insertmacro MUI_LANGUAGE "English"

Function ProbeIntro
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateLabel} 0u 10u 100% 60u "Update-mode page test. Next must skip location and go straight to progress. No game files are installed."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function ProbeDone
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateLabel} 0u 10u 100% 60u "PASS: the update flow skipped the location page."
  Pop $0
  nsDialogs::Show
FunctionEnd

Section
  ; The only write is a result marker next to the probe executable.
  !ifdef PROBE_FRESH
    StrCpy $1 "$EXEDIR\nsis-directory-fresh-before.txt"
    StrCpy $2 "$EXEDIR\nsis-directory-fresh-after.txt"
  !else
    StrCpy $1 "$EXEDIR\nsis-directory-upgrade-before.txt"
    StrCpy $2 "$EXEDIR\nsis-directory-upgrade-after.txt"
  !endif
  FileOpen $0 "$1" w
  FileWrite $0 "before=$MashupUpgrade"
  FileClose $0
  Call MashupDirectoryPre
  FileOpen $0 "$2" w
  FileWrite $0 "after=$MashupUpgrade"
  FileClose $0
SectionEnd
