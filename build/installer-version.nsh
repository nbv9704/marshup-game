!include "LogicLib.nsh"
!include "WordFunc.nsh"

Var MashupOldVersion
Var MashupNewVersion
Var MashupVersionOrder
Var MashupOldCore
Var MashupNewCore
Var MashupOldPrerelease
Var MashupNewPrerelease

; Result: 0 same, 1 installed version newer, 2 installed version older.
; VersionCompare handles dotted numbers, but incorrectly sorts 0.3.0 below
; 0.3.0-beta.2. Compare numeric cores first, then rank stable above beta.
Function MashupCompareVersions
  StrCpy $MashupOldCore $MashupOldVersion
  StrCpy $MashupNewCore $MashupNewVersion
  StrCpy $MashupOldPrerelease "0"
  StrCpy $MashupNewPrerelease "0"

  StrCpy $R0 0
  mashupScanOld:
    StrCpy $R1 $MashupOldVersion 1 $R0
    StrCmp $R1 "" mashupOldDone
    StrCmp $R1 "-" mashupOldDash
    IntOp $R0 $R0 + 1
    Goto mashupScanOld
  mashupOldDash:
    StrCpy $MashupOldCore $MashupOldVersion $R0
    StrCpy $MashupOldPrerelease "1"
  mashupOldDone:

  StrCpy $R0 0
  mashupScanNew:
    StrCpy $R1 $MashupNewVersion 1 $R0
    StrCmp $R1 "" mashupNewDone
    StrCmp $R1 "-" mashupNewDash
    IntOp $R0 $R0 + 1
    Goto mashupScanNew
  mashupNewDash:
    StrCpy $MashupNewCore $MashupNewVersion $R0
    StrCpy $MashupNewPrerelease "1"
  mashupNewDone:

  ${VersionCompare} "$MashupOldCore" "$MashupNewCore" $MashupVersionOrder
  ${If} $MashupVersionOrder != 0
    Return
  ${EndIf}
  ${If} $MashupOldPrerelease == "0"
  ${AndIf} $MashupNewPrerelease == "1"
    StrCpy $MashupVersionOrder "1"
  ${ElseIf} $MashupOldPrerelease == "1"
  ${AndIf} $MashupNewPrerelease == "0"
    StrCpy $MashupVersionOrder "2"
  ${ElseIf} $MashupOldPrerelease == "1"
    ${VersionCompare} "$MashupOldVersion" "$MashupNewVersion" $MashupVersionOrder
  ${Else}
    StrCpy $MashupVersionOrder "0"
  ${EndIf}
FunctionEnd
