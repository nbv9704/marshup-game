# Mashup Arena — Glossy Cartoon Party visual system

This document supersedes the earlier Neon Arcade × Luxury Casino visual direction. It is the visual source of truth for all shipping screens. The current implementation applies it to the live lobby, library, profile, settings and seven playable tables. Fusion Lab remains a visual prototype until its rules ship in Phase 4.

## Moodboard in words

Imagine a family party game photographed under carnival lights: a warm red sunburst behind a thick golden oval table, candy colored pieces with white rims and beveled edges, friendly round mascots, oversized actions, and readable white lettering. Board games shift the same composition toward teal and warm wood. Casino games shift toward purple felt and gold. Fusion combines palettes in a rotating radial stage.

The reference screenshot mentioned in the art direction was not present in the supplied text attachment when this guide was created. The palette and composition follow the detailed written direction; image-based adjustment remains part of visual review before this look is approved.

## Tokens

The canonical machine readable values are in `src/styles/tokens.css`. The party components use these values through `src/styles/party.css`.

| Group | Values |
| --- | --- |
| Brand | red `#E8262B`, crimson `#83172B`, warm white `#FFFAF1`, outline `#392437` |
| Accents | yellow `#FFCF3A`, green `#4FD967`, blue `#38B9F7`, purple `#A75AFF`, orange `#FF873B`, cyan `#44D5ED` |
| Radius | 14, 23, 34 and pill 999 px |
| Spacing | 4, 8, 12, 16, 24, 32 and 48 px |
| Motion | fast 140 ms, normal 260 ms, slow 540 ms; playful overshoot easing |
| Layers | table 0, seats 2, HUD 5, modal 30 |
| Font | Fredoka display and interface; Inter and Space Grotesk kept for compatible fallback |

The category classes `.theme-card`, `.theme-board`, `.theme-casino` and `.theme-fusion` set the themed radial colors while preserving the shared depth, outline and typography rules.

## Component library

Implemented now: original SVG `MascotAvatar`, `PartyLogo`, `GlossyButton`, `PartyBadge`, `PartyProgress`, `PlayerSeat`, `TableScene`, color cards, deck, discard, card fan, chess and Xiangqi boards, Ludo tray, blackjack hands, slot reels, match result and rules modal.

Planned shared controls as future screens become active: `IconButton`, `Tooltip`, `Tabs`, `Toggle`, `Slider`, `ChipCounter`, `Timer`, `TurnIndicator`, `DirectionArrows`, `DiceTray`, `ScoreBoard`, `MoveHistory` and `EmoteWheel`. Their dimensions, colors and surface rules are governed by the same token sheet; the developer Style Guide is the review surface before adding each one.

## Wireframes

### Main menu

```text
┌───────────┬───────────────────────────────────────────────────────────────────┐
│ Logo      │ Party logo                     chips              player avatar  │
│ Home      ├───────────────────────────────────────────────────────────────────┤
│ Library   │ [ SUNBURST HERO  mascot + floating game pieces ]                │
│ Trainer   │ [ PLAY ] [ LIBRARY ]                                               │
│ Profile   ├───────────────────────────────────────────────────────────────────┤
│ Settings  │ Featured playable game         Category discovery                │
└───────────┴───────────────────────────────────────────────────────────────────┘
```

### Lobby

```text
┌───────────┬───────────────────────────────────────────────────────────────────┐
│ Navigation│ Search                [ Board ] [ Card ] [ Casino ] [ Favorites ]│
│           │ [ glossy card ][ glossy card ][ glossy card ][ glossy card ]     │
│           │ [ READY badge / player count / icon / game name ]                 │
└───────────┴───────────────────────────────────────────────────────────────────┘
```

### Color Clash gameplay

```text
┌──────────────────────────────────────────────────────┬──────────────────────┐
│   HUD: logo / active turn                            │ Rules / Back         │
│                opponent avatar + face-down fan       │                      │
│    ╭────────── oval glowing table ───────────────╮   │ Action prompt        │
│    │ deck      color wheel       discard          │   │ Draw / Pass          │
│    ╰──────────────────────────────────────────────╯   │ New match            │
│               local face-up card fan                 │                      │
│                 avatar + name + count                │                      │
└──────────────────────────────────────────────────────┴──────────────────────┘
```

### Fusion Lab visual prototype

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FUSION LAB / energy rays                           │
│        ╭ Game A pod ╮     ◉ FUSE reactor ◉     ╭ Game B pod ╮              │
│        │ Chess card │                          │ Color card │              │
│        ╰────────────╯    [ EPIC reveal card ]  ╰────────────╯              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## High-fidelity HTML/SVG prototypes

The file design/VISUAL_MOCKUPS.svg contains four 1280×720 static review frames—Main Menu, Lobby, Color Clash gameplay, and Fusion Lab—in one vertical SVG. The vector frames are concept views; the running app below is the interactive proof of the shared components.

Run `npm run dev` and use these review surfaces:

1. Main Menu is the default route.
2. Lobby opens from **Thư viện / Library**.
3. Color Clash gameplay opens from its ready card. In development, the Style Guide's **TABLE** tab contains a predictable full scene with original cards and avatars.
4. Fusion Lab visual prototype is in the development Style Guide's **FUSION** tab. The FUSE button previews a reveal card; it does not activate Fusion rules.

The footer **STYLE GUIDE ↗** entry exists only in Vite development mode. It shows the design tokens, states and all eight original avatars; it is hidden in packaged releases.

This package is a visual-review checkpoint, not a claim that the future Shop, Roguelike, Daily Challenge, online mode, or fully playable Fusion features exist. No new Fusion game logic should be treated as approved until the visual direction has been compared with the promised reference image.

## Phase 3 style checklist

Every playable game must use `TableScene`, retain legible white outlines and category palette, expose legal actions, show active seat, provide a persistent Rules button, persist reduced motion and color symbol preferences, and play a contextual SFX on actions. The existing game logic is kept independent of the visual layer.

All screens should remain usable at a 1024×600 Windows window, with vertical scrolling when the whole table cannot fit; review at 1280×720, 1920×1080, 4K and ultrawide before a final release claim. Motion uses CSS transforms and opacity, and reduced motion disables animations.
