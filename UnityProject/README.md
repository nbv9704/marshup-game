# Mashup Arena — Unity migration

This is the new Unity client project. It targets Windows x64 and was created
with Unity 6000.6.4f1's 3D template. Unity CLI's Pipeline package is included
for editor automation. No Unity Cloud project or hosted backend is required.

## Current status

The first interactive slice is implemented: 3D Home, local name/color/hat
customization, a walkable Game Hub and Chess against a basic bot. Unity Chess
now validates moves independently of rendering, including castling, en passant,
promotion and terminal outcomes. Solo Chess sessions are saved and restored
locally. It is **not** a replacement for the Electron build yet: LAN,
two-player testing, other games and a polished first-person room are still
missing. The existing TypeScript rules, tests and
offline-first/LAN behavior remain the reference during migration.

## Target flow

1. 3D Home: title, Play, Customization, Settings, Quit.
2. Customization: local display name and original character appearance.
3. 3D Game Hub: walkable, compact game-selection area with a readable UI fallback.
4. Chess room: solo bot first, then trusted-LAN host and guest.
5. Port other rules and views incrementally, checking each against the existing
   deterministic tests before enabling it in the hub.

The local profile is available without registration. LAN is optional and uses
the host's machine; no account server is assumed. Game rules and outcomes stay
separate from 3D presentation. The first release gate is a complete Chess
vertical slice, not a nonfunctional shell containing all 38 catalog entries.

## Opening the project

Open this directory in Unity Hub using the Editor version from
`ProjectSettings/ProjectVersion.txt`. On this development machine the Editor is
installed at `D:\Unity\Editor\6000.6.4f1\Editor\Unity.exe`. The Unity CLI is
at `D:\Unity\Unity Hub\resources\unity.exe`; neither needs to be on `PATH`.

The Home objects are authored in `Assets/Scenes/SampleScene.unity` and are
visible in the **Scene** tab without pressing Play. If Unity was already open
while the scene file changed, double-click `SampleScene` in the Project panel
to reload it. Select `Mashup Arena` in Hierarchy and press **F** to frame the
scene. Press **Play**, then choose the **Game** tab to test the buttons and
navigation; Play mode rebuilds Home with the saved local profile.

Commit `Assets`, `Packages`, and `ProjectSettings`, including `.meta` files.
Generated `Library`, `Temp`, `Logs`, `Builds`, and `UserSettings` stay ignored.

From the Unity Editor, use **Mashup Arena → Build Windows x64**. The output is
`Builds/Windows/Mashup Arena.exe` with its adjacent `_Data` folder; distribute
the whole Windows build folder, not the `.exe` alone. The same build can be run
in batch mode with `-executeMethod MashupArena.Editor.ArenaBuild.BuildWindows64`.

The `--smoke-test` Player argument exercises Home, Customization, Hub, a legal
Chess move and the bot's reply, then exits. When `MASHUP_UNITY_SMOKE_MARKER` and
`MASHUP_UNITY_SCREENSHOT` are set, it writes a JSON readiness marker and four
camera-rendered screenshots. `Mashup Arena/Test Chess Rules` in the Editor
checks the main rules against the TypeScript fixture cases.
