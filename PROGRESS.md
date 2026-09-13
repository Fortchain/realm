# Realm — Progress & Ideas

## Current Status
**Deployed:** github.com/Fortchain/realm.git → Vercel

---

## Live Features
- [x] Phaser 2D San Diego city (4800×4800, WASD movement, E to enter)
- [x] Daytime visual theme (ocean, beach, parks, white buildings)
- [x] Map HUD — minimap bottom-left + full-map overlay with teleport
- [x] GTA-style phone widget (FAB → 340×580 panel)
  - [x] Todo list (add, complete, delete, categories, priority)
  - [ ] Messages
  - [ ] Contacts
  - [ ] Gleam Feed
- [x] Auth (Clerk) + user sync
- [x] **Bank** (`/buildings/bank`)
  - [x] Plaid link + token exchange
  - [x] Real account balances + 30-day transactions
  - [x] AI banker: Morgan Wells (claude-sonnet-4-6)
- [x] **Library** (`/buildings/library`)
  - [x] Phaser interior with 3 zones (professor, books, study tables)
  - [x] File upload/download/delete (UploadThing)
  - [x] 7-subject selector
  - [x] AI professor: Elena Vasquez (claude-sonnet-4-6)
- [x] AI conversations persisted per user per location (Postgres)

---

## Buildings — Roadmap
| Building | Status | AI Persona | Core Feature |
|---|---|---|---|
| Bank | ✅ Live | Morgan Wells | Plaid + financial advice |
| Library | ✅ Live | Prof. Elena Vasquez | File storage + tutoring |
| Gym | 🔲 Next | Coach Tyler Brooks | Workout plans + nutrition |
| Your Home | 🔲 Planned | ARIA | Todos, reminders, schedule |
| University | 🔲 Planned | — | Campus life + clubs |
| The Mall | 🔲 Planned | — | Shopping + price tracking |
| City Hall | 🔲 Planned | — | — |
| Realm Medical | 🔲 Planned | Dr. Patel | Health info + med tracking |

---

## Ideas Backlog
- [ ] Real-time presence: show other users in same building (Pusher already wired)
- [ ] Phone → Messages tab: DM other Realm users
- [ ] Phone → Gleam Feed: in-city social feed (posts, reactions)
- [ ] Building unlock system: complete tasks to unlock new buildings
- [ ] Avatar customization
- [ ] Notifications: AI nudges (e.g. Morgan flags unusual spending)
- [ ] Mobile app (Expo)
- [ ] Gym: log workouts, track streaks, AI generates weekly plan
- [ ] Home: ARIA connects to Google Calendar / reminders
- [ ] Monetization: Realm Premium (unlimited AI messages, more buildings)
- [ ] Builder: use your custom map as the playable /city world
- [ ] Builder: undo/redo stack

---

## Deployment Log
| Date | Commit | What Shipped |
|---|---|---|
| 2026-09-12 | — | Kenney sprite city: imported Kenney Isometric Roads pack (CC0) — grass, water, beach, road-NS, road-EW, crossroad, dirt, lot, tree-tall/short/conifer sprites. All ground tiles now rendered as sprites (100×65px) replacing programmatic Graphics. Trees on park tiles + named building flankers are now sprites (scale 3.5×). HW=50 HH=25 to match sprite dims. |
| 2026-09-12 | — | Road fix + street lamps: visible asphalt (0x2c2c42), curb edge highlights, direction-aware centre dashes (NS roads SW-direction, EW roads SE-direction), improved intersection crosswalks, street lamp sprites (pole+arm+warm glow) on NS roads every 3rd tile + EW roads every 3rd tile |
| 2026-09-12 | 450c4ff | Iso v2: 24×24 grid, free movement (walk anywhere except water), smaller buildings + floor height, window sprites on SE/SW faces (night-city lit windows), improved player sprite (detailed face, hair, jacket, shoes), road dashes, park trees, beach/water tiles, 4-direction walk animation |
| 2026-09-12 | b9bc059 | Isometric city rewrite: 2.5D GTA-style projection, 20×20 tile grid, painter's algo depth ordering, diagonal (W=up/S=down/A=left/D=right) movement, isometric cubes for all buildings (generic + named), park trees, road dashes, beach/water tiles, manual slide collision, MapHUD converted to top-down minimap with iso↔tile coordinate bridge |
| 2026-09-12 | 2243877 | Builder v2: click-drag to draw any size, multi-select (Shift+click), group drag-move, Ctrl+C/Ctrl+V chain paste with directional repeat (E/S/W/N), WASD disabled while typing in input fields |
| 2026-09-12 | 15d8fa7 | City Builder at /builder: blank 6000×6000 Phaser canvas, 20-type object palette (terrain/roads/buildings/nature/props), select/place/erase tools, drag-to-move, 8-handle resize, right-click pan, scroll zoom, WASD pan, grid snap (G toggle), color picker, object labels, save/load per user via Postgres CityMap model |
| 2026-09-12 | 56c30cc | Full city map revamp: 4800×4800 square sandbox, 12×12 grid, physics collision (player walks streets/parks/beach only), 0.65 zoom (100-story view), crosswalks, lane markings, beach waves, tree canopies, fountain plazas, updated MapHUD to match new world |
| 2026-09-12 | f6580d1 | GTA-style city revamp: block subdivision (2-6 varied buildings per block), 3D depth illusion (south/east walls + drop shadows), street trees along every sidewalk, in-block vegetation, library gets detailed skylight grid + columns + pediment + hedgerow |
| 2026-09-12 | 7d14592 | GTA-style map HUD with minimap, full map overlay, teleport |
| 2026-09-12 | f630a3f | San Diego city map, fullscreen canvas, corner phone widget |
| 2026-09-12 | 76d0100 | Library interior with Phaser zones |
| 2026-09-12 | cfad8f5 | Phaser.js game world, WASD movement, building zones |
| 2026-09-12 | 400d617 | Neon atmosphere city, animated buildings, HUD nav |
| 2026-09-12 | 6feb0f5 | Force /city redirect after auth |
| 2026-09-12 | 2fd0942 | Prisma generate before Vercel build |
