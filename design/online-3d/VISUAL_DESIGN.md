# 3D visual and interaction direction

Phase 1 concept art is described here and represented by original CSS/SVG shapes in `prototype.html`. No production GLB models are claimed. This extends the existing [Glossy Cartoon Party style guide](../GLOSSY_PARTY_STYLE_GUIDE.md), not the appearance or layout of Gamble With Your Friends. Its first-person social presence is the feeling reference only.

## Visual grammar carried into 3D

Hot red `#E8262B`, warm white rims, cyan ribbons, gold table bevels, rounded sans-serif display type, large symbols and saturated category accents remain canonical. 3D props use chunky rounded silhouettes, glossy **material cues** (wide soft highlights, beveled edges) rather than mirror reflections. Shadows are soft; bloom is restricted to active-turn rings, legal destinations, and celebrations. The 2D HUD stays legible against changing 3D backgrounds with a dark outline and translucent backing. Virtual chips are visibly labeled entertainment-only.

Four room palettes:

| Space | Palette/materials | Silhouette and focal point | Sound/light |
| --- | --- | --- | --- |
| Card Lounge | coral/red/orange, cream leather, honey-gold | round low table, fan of oversized cards, circular color-wheel light | warm upbeat motif, soft card flutter, center sunburst |
| Board Hall | deep teal/blue, glossy wood and gold | square board on an oval table between two seats, captured-piece trays | gentle jazzy motif, cool window shafts, warm rim lights |
| Casino Floor | plum/magenta, purple felt, restrained gold neon | distinct table/machine islands with clear approach paths | groovy motif, machine glow, no real-currency iconography |
| Fusion Lab Arena | blended source palettes, energy ring | two reactor pods around a central transform table | electronic motif, colored arcs; camera shake optional/reduced |

The first shipped 3D room is **Board Hall** only. Other rooms are concept targets; their buttons stay hidden until their game views work.

## Chess room concept frame

A compact roughly 9 m × 8 m chamber with a 2.4 m oval table centered at world origin. Chess board center is at comfortable standing eye-line below the camera, not at floor level. Two chairs mark seats on opposite sides; players spawn near their own side, with a continuous 1.2 m walking loop around table/chairs. Low curved walls and tall teal window panels give depth without visual noise. Gold arcs on the floor guide players toward the table. A subtle radial pattern on the ceiling echoes the 2D sunburst; no flashing strobe.

Standing FPS composition: table occupies the middle third, own hands/near rim lower frame, opposite player visible beyond board, side trays and timer near board edges. Focus Board composition: elevated angled camera sees all 64 squares without major perspective distortion, both nameplates/timers at top corners, captured trays and last move visible, opponent avatar still present at edge of scene. Result overlay pauses game input, dimming the room but preserving the final board as context.

Materials: board squares are warm cream and saturated teal with bevels; white/black armies use two distinct shapes/material tones, with colorblind-safe light/dark labels and highlighted bases. Pieces have broad readable silhouettes at both free and focused distance. Legal move markers are filled rings and destination symbols, not color alone. Captures animate a short slide-and-pop into a side tray, then settle; reduced motion changes this to a short fade.

## Camera and input state machine

```text
free FPS --F/board interact--> focus board --F/Esc--> free FPS
   │                                   │
   └--chair E--> seated --stand E------┘
   any gameplay view --Esc--> menu (cursor free; match/server continues)
   result event --> result overlay (gameplay input disabled)
```

- Free: WASD movement, mouse pointer lock look, E/left click interact, optional Shift run. Default walking speed and collision tuned so one circuit of the room is comfortable, not frantic.
- Focus: 300–450 ms eased translation/rotation to a stable elevated board angle; cursor unlocks for accurate piece picking. F toggles back. No teleport through geometry visible to other players: only the local camera changes.
- Seated: camera anchors to one chair for longer games; player can stand at any time. Seating does not grant move permission.
- Menu: Esc releases pointer lock and opens Pause, Settings, Rules, Leave. Closing returns to prior camera mode only after an explicit user click to re-lock pointer.
- Settings: key rebinds, sensitivity, FOV slider, invert-Y, head-bob toggle, Low/Medium/High presets, resolution scale, shadows, antialiasing, FPS counter, color symbols, text scale and reduced-motion/motion-sickness modes.
- Comfort: horizon remains stable by default; head-bob off by default on Low/reduced-motion; no mandatory forced camera shake; focus can switch instantly for motion-sensitive users.

Raycast interaction: near-table crosshair becomes an E prompt; hover piece gives a white outline/name; select own piece gives yellow legal destinations; hover destination shows a ghost; click sends an intent and displays a pending shimmer. Server acceptance triggers move animation and turn pulse; rejection returns piece to origin with a quiet “not allowed” cue. Chat input and menu never capture movement keys. Keyboard-only piece navigation is required before release.

## Original mascot-to-3D character concepts

All eight start from the existing original 2D avatar names; the 3D model sheet should have shared body rig proportions for affordable animation and cosmetics, while heads/ears/silhouettes remain instantly distinct. Target height around 1.5 m; no recognizable reference-game anatomy or outfits.

| Character | Silhouette and materials | Signature idle / celebration |
| --- | --- | --- |
| Comet | round amber head, two small comet-tail fins, coral varsity jacket, oversized mitt hands | tilts toward board, spins a tiny star orbit |
| Crown | lilac crown-shaped brow, deep-blue short coat, gold piping | straightens crown, gold spark fan |
| Spark | spiky sunflower-like soft points, orange vest, bright cyan trim | quick electric shoulder bounce |
| Pip | heart-shaped cheek markings, raspberry hoodie, small rounded ears | double hand-wave, heart confetti |
| Mochi | moon-cream oval head, mint scarf, sleepy eyes | slow sway, crescent trail |
| Gem | faceted-but-rounded teal hair cap, magenta boots, white gloves | prism twirl, colored glints |
| Bolt | zigzag tuft, cobalt jumpsuit, gold zipper | heel tap and snap, bolt ribbon |
| Nova | starfish-like rounded five-point head, violet jacket, orange cuffs | open-arm starburst, tiny orbiting dots |

Customization layers are color/skin tone, hat, face decal, outfit, and later emotes. Heads and hands follow look direction within safe angles; body root follows server-interpolated pose. Idle/walk/turn/point/celebrate/lose are the first animation set. Shop cosmetics are future-only and virtual-chip-priced.

## UI screen concepts

- **Login/Register:** deep crimson radial background, large original logo, one cream rounded card, clear email/password fields, show-password, strength meter, terms/age notice, “Play vs Bot (Offline)” separated from online action. Never simulate a successful credential check in shipping UI.
- **Home:** mascot spotlight and sunburst, Play as primary action, active account/rank/chips, Settings/Quit. Fusion/Shop/Friends buttons appear only in a release that implements them.
- **Game Select:** searchable glossy card grid, Board/Card/Casino/Fusion/Favorites tabs, count/difficulty tags, ready-only Play. Planned catalog entries may appear as informational cards only in a separate roadmap view, not deceptive Play buttons.
- **Room Lobby:** invite code front and center, two Chess seats with avatars and ready lights, rules/version summary, chat, host Start. Empty future seats are not actionable in v1 Chess.
- **3D Room/HUD:** small top-right timer/turn/status, top-left room and ping, bottom-left chat/emote, bottom-right F Focus / ? Rules / Esc menu; all text has a dark backing. The board is the visual hero.
- **Result:** large but brief banner, final board visible behind, XP and virtual chips with reduced-motion alternative, three equal-clear actions: rematch request, Game Select, Home. If rematch requires both players, button enters a waiting state with cancel.

## Asset and performance production rules

Model pipeline: Blender-friendly GLB with named pivots for head/hands/pieces, compact atlas materials, glTF validation in CI, texture/mesh compression where useful, and a `CREDITS.md` entry for every non-original asset/license (CC0 or equivalent only). Procedural room geometry is preferred for repeating walls, trim, rays, rings and confetti. Load Board Hall/Chess only when joining Chess; dispose on exit.

The 60 FPS target on mid-range integrated graphics is a **measurement gate, not a guarantee**. Profile at 1280×720 and 1920×1080 on an agreed low-end test laptop; record frame-time percentiles, GPU memory and room load time. Low preset uses baked light, reduced shadows/particles and resolution scale; Medium/High add detail only if budget permits. Avoid expensive real-time reflections. UI remains usable at 1024×600.

Audio: per-category original loop, footstep/interact/card/piece/chip cues, separate music/SFX sliders. Sound cue subtitles are shown for important gameplay events. No voice chat in v1; avatar/emote components reserve a future voice-indicator anchor without implementing capture.
