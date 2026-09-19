!include "nsDialogs.nsh"
!include "MUI2.nsh"

!ifndef BUILD_UNINSTALLER
Var CreateDesktopShortcutCheckbox
Var CreateDesktopShortcutRequested

!macro customPageAfterChangeDir
  Page custom DesktopShortcutPageCreate DesktopShortcutPageLeave
!macroend

Function DesktopShortcutPageCreate
  ${If} ${Silent}
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "快捷方式" "选择是否在桌面创建 CodeLearn 快捷方式"

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateCheckbox} 0 16u 100% 12u "创建桌面快捷方式"
  Pop $CreateDesktopShortcutCheckbox
  ${NSD_Uncheck} $CreateDesktopShortcutCheckbox

  nsDialogs::Show
FunctionEnd

Function DesktopShortcutPageLeave
  ${NSD_GetState} $CreateDesktopShortcutCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $CreateDesktopShortcutRequested "1"
  ${Else}
    StrCpy $CreateDesktopShortcutRequested "0"
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} $CreateDesktopShortcutRequested == "1"
    CreateShortCut "$newDesktopLink" "$appExe"
  ${EndIf}
!macroend
!endif

!macro customUnInstall
  Delete "$newDesktopLink"
!macroend
