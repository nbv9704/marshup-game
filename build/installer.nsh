!ifndef BUILD_UNINSTALLER
!include "LogicLib.nsh"
!include "${BUILD_RESOURCES_DIR}\installer-version.nsh"

Var MashupUpgrade

!ifdef PRODUCT_NAME
!include "nsDialogs.nsh"
; Treat a version-checked existing install like --updated for the page skipper.
; Keep electron-builder's original command-line behavior as a fallback.
!macroundef _isUpdated
!macro _isUpdated _a _b _t _f
  StrCmp "$MashupUpgrade" "1" `${_t}` 0
  ${StdUtils.TestParameter} $R9 "updated"
  StrCmp "$R9" "true" `${_t}` `${_f}`
!macroend

!macro customWelcomePage
  Page custom MashupUpgradePageCreate
  Function MashupUpgradePageCreate
    ${If} $MashupUpgrade != "1"
    ${OrIf} ${UAC_IsInnerInstance}
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "CẬP NHẬT MASHUP ARENA" "Đã tìm thấy phiên bản được cài trên máy này"
    nsDialogs::Create 1018
    Pop $R0
    ${NSD_CreateLabel} 0u 8u 100% 50u "Phiên bản hiện tại: $MashupOldVersion | Phiên bản mới: ${VERSION}"
    Pop $R1
    ${NSD_CreateLabel} 0u 73u 100% 65u "Nhấn Cập nhật để thay thế ứng dụng tại $INSTDIR. Dữ liệu cá nhân và ván đã lưu sẽ được giữ nguyên."
    Pop $R1
    GetDlgItem $R0 $HWNDPARENT 1
    SendMessage $R0 ${WM_SETTEXT} 0 "STR:CẬP NHẬT"
    nsDialogs::Show
  FunctionEnd
!macroend

!macro customInstallMode
  ${If} $MashupUpgrade == "1"
    ${If} $hasPerMachineInstallation == "1"
      StrCpy $isForceMachineInstall "1"
    ${Else}
      StrCpy $isForceCurrentInstall "1"
    ${EndIf}
  ${EndIf}
!macroend

!macro customFinishPage
  Page custom MashupFinishPageCreate
  Function MashupFinishPageCreate
    ${If} $MashupUpgrade == "1"
      !insertmacro MUI_HEADER_TEXT "CẬP NHẬT HOÀN TẤT" "Mashup Arena đã sẵn sàng"
    ${Else}
      !insertmacro MUI_HEADER_TEXT "CÀI ĐẶT HOÀN TẤT" "Mashup Arena đã sẵn sàng"
    ${EndIf}
    nsDialogs::Create 1018
    Pop $R0
    ${If} $MashupUpgrade == "1"
      ${NSD_CreateLabel} 0u 10u 100% 80u "Đã cập nhật Mashup Arena lên ${VERSION}. Dữ liệu cá nhân và các ván đã lưu được giữ nguyên."
    ${Else}
      ${NSD_CreateLabel} 0u 10u 100% 80u "Đã cài đặt Mashup Arena ${VERSION}. Bạn có thể mở game từ Start Menu hoặc lối tắt trên Desktop."
    ${EndIf}
    Pop $R1
    GetDlgItem $R0 $HWNDPARENT 1
    SendMessage $R0 ${WM_SETTEXT} 0 "STR:HOÀN TẤT"
    nsDialogs::Show
  FunctionEnd
!macroend
!endif

; Runs after electron-builder selects the previous per-user/per-machine install
; and restores its InstallLocation. Do not infer an install from a portable copy.
!macro customInit
  StrCpy $MashupUpgrade "0"

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

    StrCpy $MashupUpgrade "1"
  ${EndIf}
!macroend
!endif
