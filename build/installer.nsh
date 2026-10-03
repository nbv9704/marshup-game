!ifndef BUILD_UNINSTALLER
!include "LogicLib.nsh"
!include "${BUILD_RESOURCES_DIR}\installer-version.nsh"

Var MashupUpgrade

!ifdef PRODUCT_NAME
!include "nsDialogs.nsh"

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

; electron-builder's stock directory page only skips for --updated. Move that
; page into our hook so a downloaded installer can skip it after registry-based
; upgrade detection, without changing where fresh installs can be placed.
!macro customPageAfterChangeDir
  !include "StrContains.nsh"
  !define MUI_PAGE_CUSTOMFUNCTION_PRE MashupDirectoryPre
  !insertmacro MUI_PAGE_DIRECTORY
  !define MUI_PAGE_CUSTOMFUNCTION_PRE MashupInstFilesPre

  Function MashupDirectoryPre
    ${If} $MashupUpgrade == "1"
      Abort
    ${EndIf}
    ${If} ${isUpdated}
      Abort
    ${EndIf}
  FunctionEnd

  Function MashupInstFilesPre
    ${If} $MashupUpgrade == "1"
      Return
    ${EndIf}
    ${StrContains} $0 "${APP_FILENAME}" $INSTDIR
    ${If} $0 == ""
      StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
    ${EndIf}
  FunctionEnd
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
