# Mashup Arena — Unity migration

This is the new Unity client project. It targets Windows x64 and was created
with Unity 6000.6.4f1's 3D template. Unity CLI's Pipeline package is included
for editor automation. No Unity Cloud project or hosted backend is required.

## Current status

The first interactive shell is implemented: 3D Home, local name/color/hat
customization, a walkable Game Hub and a visual-only Chess room. It is **not**
a replacement for the playable Electron build yet. Chess moves, bots and LAN
are not ported. The existing TypeScript rules, tests, and offline-first/LAN
behavior remain the reference during migration; do not remove them until each
Unity replacement is playable and validated.

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

Commit `Assets`, `Packages`, and `ProjectSettings`, including `.meta` files.
Generated `Library`, `Temp`, `Logs`, `Builds`, and `UserSettings` stay ignored.

From the Unity Editor, use **Mashup Arena → Build Windows x64**. The output is
`Builds/Windows/Mashup Arena.exe` with its adjacent `_Data` folder; distribute
the whole Windows build folder, not the `.exe` alone. The same build can be run
in batch mode with `-executeMethod MashupArena.Editor.ArenaBuild.BuildWindows64`.

The `--smoke-test` Player argument exercises Home, Customization, Hub and Chess
preview, then exits. When `MASHUP_UNITY_SMOKE_MARKER` and
`MASHUP_UNITY_SCREENSHOT` are set, it writes a JSON readiness marker and four
camera-rendered screenshots. This is a boot/render check, not a gameplay test.
