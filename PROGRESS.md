# Realm — Progress & Ideas

## Current Status
**Deployed:** github.com/Fortchain/realm.git → Vercel

---

## Live Features
- [x] Phaser 2D San Diego city (3600×3000, WASD movement, E to enter)
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

---

## Deployment Log
| Date | Commit | What Shipped |
|---|---|---|
| 2026-09-12 | 56c30cc | Full city map revamp: 4800×4800 square sandbox, 12×12 grid, physics collision (player walks streets/parks/beach only), 0.65 zoom (100-story view), crosswalks, lane markings, beach waves, tree canopies, fountain plazas, updated MapHUD to match new world |
| 2026-09-12 | (pending) | GTA-style city revamp: block subdivision (2-6 varied buildings per block), 3D depth illusion (south/east walls + drop shadows), street trees along every sidewalk, in-block vegetation, library gets detailed skylight grid + columns + pediment + hedgerow |
| 2026-09-12 | 7d14592 | GTA-style map HUD with minimap, full map overlay, teleport |
| 2026-09-12 | f630a3f | San Diego city map, fullscreen canvas, corner phone widget |
| 2026-09-12 | 76d0100 | Library interior with Phaser zones |
| 2026-09-12 | cfad8f5 | Phaser.js game world, WASD movement, building zones |
| 2026-09-12 | 400d617 | Neon atmosphere city, animated buildings, HUD nav |
| 2026-09-12 | 6feb0f5 | Force /city redirect after auth |
| 2026-09-12 | 2fd0942 | Prisma generate before Vercel build |
