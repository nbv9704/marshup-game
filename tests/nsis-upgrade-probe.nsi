; Read-only harness for the actual customInit macro. Run with /S; the only
; write is the result file beside this probe executable (never app files/keys).
Unicode true
!ifndef VERSION
  !define VERSION "0.3.0-beta.4"
!endif
!define APP_EXECUTABLE_FILENAME "Mashup Arena.exe"
!define BUILD_RESOURCES_DIR "..\build"
!define UNINSTALL_REGISTRY_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\03fdc028-aca6-59c4-8834-701d0421d91d"
!include "..\build\installer.nsh"
Var hasPerUserInstallation
Var hasPerMachineInstallation
!ifdef PROBE_DOWNGRADE
  OutFile "..\release\nsis-downgrade-probe.exe"
!else
  !ifdef PROBE_FRESH
    OutFile "..\release\nsis-fresh-probe.exe"
  !else
    OutFile "..\release\nsis-upgrade-probe.exe"
  !endif
!endif
SilentInstall normal

Function .onInit
  StrCpy $hasPerUserInstallation "0"
  StrCpy $hasPerMachineInstallation "0"
  !ifndef PROBE_FRESH
    ReadRegStr $INSTDIR HKCU "Software\03fdc028-aca6-59c4-8834-701d0421d91d" "InstallLocation"
    ${If} $INSTDIR != ""
      StrCpy $hasPerUserInstallation "1"
    ${EndIf}
  !endif
  !insertmacro customInit
FunctionEnd

Section
  !ifdef PROBE_DOWNGRADE
    FileOpen $0 "$EXEDIR\nsis-downgrade-probe.txt" w
  !else
    !ifdef PROBE_FRESH
      FileOpen $0 "$EXEDIR\nsis-fresh-probe.txt" w
    !else
      FileOpen $0 "$EXEDIR\nsis-upgrade-probe.txt" w
    !endif
  !endif
  FileWrite $0 "upgrade=$MashupUpgrade$\r$\n"
  FileWrite $0 "old=$MashupOldVersion$\r$\n"
  FileWrite $0 "new=$MashupNewVersion$\r$\n"
  FileWrite $0 "location=$INSTDIR$\r$\n"
  FileClose $0
SectionEnd
