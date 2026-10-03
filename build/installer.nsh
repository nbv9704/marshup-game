!ifndef BUILD_UNINSTALLER
!include "LogicLib.nsh"
!include "${BUILD_RESOURCES_DIR}\installer-version.nsh"

Var MashupUpgrade
Var MashupWasSilent

; Runs after electron-builder selects the previous per-user/per-machine install
; and restores its InstallLocation. Do not infer an install from a portable copy.
!macro customInit
  StrCpy $MashupUpgrade "0"
  StrCpy $MashupWasSilent "0"
  ${If} ${Silent}
    StrCpy $MashupWasSilent "1"
  ${EndIf}

  StrCpy $R7 ""
  StrCpy $R8 ""
  ${If} $hasPerUserInstallation == "1"
  ${AndIf} $hasPerMachineInstallation == "0"
    ReadRegStr $R7 HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    ReadRegStr $R8 HKCU "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${ElseIf} $hasPerMachineInstallation == "1"
  ${AndIf} $hasPerUserInstallation == "0"
    ReadRegStr $R7 HKLM "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    ReadRegStr $R8 HKLM "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${EndIf}

  ${If} $R7 != ""
  ${AndIf} $R8 != ""
  ${AndIf} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    StrCpy $MashupOldVersion "$R8"
    StrCpy $MashupNewVersion "${VERSION}"
    Call MashupCompareVersions
    ${If} $MashupVersionOrder == 0
      MessageBox MB_OK|MB_ICONINFORMATION "Mashup Arena ${VERSION} đã được cài đặt." /SD IDOK
      Quit
    ${ElseIf} $MashupVersionOrder == 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "Máy đang có Mashup Arena $R8 mới hơn bản cài ${VERSION}. Không hạ phiên bản tự động." /SD IDOK
      SetErrorLevel 2
      Quit
    ${EndIf}

    ${If} $MashupWasSilent == "0"
      MessageBox MB_YESNO|MB_ICONQUESTION "Đã tìm thấy Mashup Arena $R8 tại $INSTDIR.$\r$\nNâng cấp lên ${VERSION} và giữ dữ liệu cá nhân?" /SD IDYES IDYES mashupUpgradeConfirmed
      Quit
    ${EndIf}
    mashupUpgradeConfirmed:
    StrCpy $MashupUpgrade "1"
    SetSilent silent
  ${EndIf}
!macroend

; An interactive upgrade has one confirmation and one completion message,
; without the first-install mode/folder/finish wizard. /S remains fully quiet.
!macro customInstall
  ${If} $MashupUpgrade == "1"
  ${AndIf} $MashupWasSilent == "0"
    MessageBox MB_OK|MB_ICONINFORMATION "Đã cập nhật Mashup Arena lên ${VERSION}. Dữ liệu cá nhân được giữ nguyên." /SD IDOK
  ${EndIf}
!macroend
!endif
