# Mashup Arena — Unity migration

This is the new Unity client project. It targets Windows x64 and was created
with Unity 6000.6.4f1's 3D template. Unity CLI's Pipeline package is included
for editor automation. No Unity Cloud project or hosted backend is required.

## Current status

The project currently contains the stock 3D template only. It is **not** a
replacement for the playable Electron build yet. The existing TypeScript rules,
tests, and offline-first/LAN behavior remain the reference during migration;
do not remove them until each Unity replacement is playable and validated.

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
