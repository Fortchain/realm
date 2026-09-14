import Phaser from "phaser"

// ── Constants ──────────────────────────────────────────────────────────────────
const TW      = 48          // tile size (square, px)
const GC      = 48          // grid columns
const GR      = 48          // grid rows
const WORLD_W = GC * TW     // 2304
const WORLD_H = GR * TW     // 2304
const SPEED   = 220         // player px / sec
const ENT_R   = 68          // entry detection radius px
const P_R     = 13          // player collision radius px

// ── Tile type indices (match tileset canvas column order) ──────────────────────
const TI = {
  GRASS: 0, ROAD_H: 1, ROAD_V: 2, INTER: 3, WATER: 4,
  BEACH: 5, PLAZA: 6, COM: 7, DT: 8, DOCK: 9, LAKE: 10, PARK: 11,
} as const
type TiVal = typeof TI[keyof typeof TI]
const NT = 12  // number of tile types

// ── 48×48 grid (roads at cols/rows 8,16,24,32,40) ─────────────────────────────
const COL_ROADS = new Set([8, 16, 24, 32, 40])
const ROW_ROADS = new Set([8, 16, 24, 32, 40])

const RAW: string[][] = [
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','s','s','s','K','s','s','R','K','s','s','s','K','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','s','s','s','K','s','s','R','K','s','s','s','K','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','K','s','s','K','K','s','R','K','K','s','s','K','K','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','K','s','s','K','K','s','R','K','K','s','s','K','K','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','K','s','s','K','K','s','R','K','K','s','s','K','K','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'],
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','P','P','P','P','D','D','R','P','P','P','D','D','P','P','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','P','P','P','P','D','D','R','P','P','P','D','D','P','P','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'],
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'],
  ['W','W','W','W','W','W','W','W','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','P','P','P','P','P','P','P','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','P','P','P','P','P','P','P','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'],
  ['W','W','W','W','W','W','W','W','R','K','K','s','s','s','K','K','R','s','s','K','K','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','s','s','s','K','s','s','s','R','K','s','s','s','s','K','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','s','s','s','K','K','R','s','s','K','K','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','s','s','s','K','s','s','s','R','K','s','s','s','s','K','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['W','W','W','W','W','W','W','W','R','K','K','s','s','s','K','K','R','s','s','K','K','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'],
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'],
]

const KEY_MAP: Record<string, TiVal> = {
  W: TI.WATER, B: TI.BEACH, K: TI.PARK, P: TI.PLAZA,
  s: TI.GRASS, c: TI.COM,   D: TI.DT,   d: TI.DOCK, L: TI.LAKE,
}

const GRID_DATA: TiVal[][] = RAW.map((row, r) =>
  row.map((ch, c) => {
    if (COL_ROADS.has(c) && ROW_ROADS.has(r)) return TI.INTER
    if (COL_ROADS.has(c)) return TI.ROAD_V
    if (ROW_ROADS.has(r)) return TI.ROAD_H
    return KEY_MAP[ch] ?? TI.GRASS
  })
)

// ── Buildings ──────────────────────────────────────────────────────────────────
interface Bldg {
  id: string; name: string; col: number; row: number
  color: number; available: boolean; href: string
  w?: number; h?: number; kind?: string; seats?: number
}

const BUILDINGS: Bldg[] = [
  // Financial District
  { id:'bank',    name:'First Realm Bank',    col:19, row:11, color:0x10b981, available:true,  href:'/buildings/bank',       w:3, h:2 },
  { id:'office',  name:'Realm Tower',         col:22, row:10, color:0x0891b2, available:false, href:'/buildings/office',     w:2, h:2 },
  { id:'office2', name:'Exchange Building',   col:27, row:10, color:0x3730a3, available:false, href:'/buildings/office',     w:2, h:2 },
  { id:'office3', name:'Financial HQ',        col:29, row:14, color:0x1d4ed8, available:false, href:'/buildings/office',     w:2, h:2 },
  { id:'office4', name:'Commerce Plaza',      col:20, row:15, color:0x0f766e, available:false, href:'/buildings/office',     w:2, h:1 },
  { id:'fin_t1',  name:'Plaza Café ☕',        col:19, row:12, color:0xf59e0b, available:false, href:'/zone/plaza-1', kind:'table', seats:8 },
  { id:'fin_t2',  name:'Terrace Lounge',      col:21, row:13, color:0xf59e0b, available:false, href:'/zone/plaza-2', kind:'table', seats:8 },
  { id:'fin_t3',  name:'Garden Seating',      col:25, row:12, color:0xf59e0b, available:false, href:'/zone/plaza-3', kind:'table', seats:8 },
  { id:'fin_t4',  name:'Sky Deck Table',      col:27, row:13, color:0xf59e0b, available:false, href:'/zone/plaza-4', kind:'table', seats:8 },
  { id:'fin_t5',  name:'Courtyard Table',     col:30, row:12, color:0xf59e0b, available:false, href:'/zone/plaza-5', kind:'table', seats:8 },
  // Marina
  { id:'marina',  name:'Realm Marina',        col:12, row: 5, color:0x0ea5e9, available:false, href:'/buildings/marina',     w:2, h:2 },
  { id:'yacht',   name:'Yacht Club',          col:13, row:11, color:0x0369a1, available:false, href:'/buildings/marina',     w:2, h:2 },
  { id:'boat1',   name:'The Pelican',         col: 3, row: 2, color:0xf97316, available:false, href:'/zone/boat-1', kind:'boat', seats:50 },
  { id:'boat2',   name:'The Albatross',       col: 2, row: 5, color:0xec4899, available:false, href:'/zone/boat-2', kind:'boat', seats:50 },
  { id:'boat3',   name:'Marina Star',         col: 4, row:11, color:0x8b5cf6, available:false, href:'/zone/boat-3', kind:'boat', seats:50 },
  { id:'boat4',   name:'The Compass',         col: 1, row:14, color:0x10b981, available:false, href:'/zone/boat-4', kind:'boat', seats:50 },
  // Hospital
  { id:'hospital',  name:'Realm Medical',     col:36, row:10, color:0xef4444, available:false, href:'/buildings/hospital',   w:3, h:3 },
  { id:'hosp_conf', name:'Med. Conf. Hall',   col:35, row:13, color:0xfca5a5, available:false, href:'/buildings/hospital',   w:2, h:1 },
  // Libraries
  { id:'library',   name:'City Library',      col:42, row:10, color:0x3b82f6, available:true,  href:'/buildings/library',    w:4, h:3 },
  { id:'library2',  name:'South Branch Lib.', col:35, row:18, color:0x6366f1, available:false, href:'/buildings/library',    w:3, h:2 },
  // Park benches
  { id:'bench1', name:'Lakeside Bench A', col: 9, row:18, color:0x84cc16, available:false, href:'/zone/bench-1', kind:'bench', seats:8 },
  { id:'bench2', name:'Lakeside Bench B', col: 9, row:21, color:0x84cc16, available:false, href:'/zone/bench-2', kind:'bench', seats:8 },
  { id:'bench3', name:'Lakeside Bench C', col:14, row:18, color:0x84cc16, available:false, href:'/zone/bench-3', kind:'bench', seats:8 },
  { id:'bench4', name:'Lakeside Bench D', col:14, row:21, color:0x84cc16, available:false, href:'/zone/bench-4', kind:'bench', seats:8 },
  { id:'bench5', name:'Meadow Table A',   col:17, row:18, color:0x84cc16, available:false, href:'/zone/bench-5', kind:'bench', seats:8 },
  { id:'bench6', name:'Meadow Table B',   col:20, row:19, color:0x84cc16, available:false, href:'/zone/bench-6', kind:'bench', seats:8 },
  { id:'bench7', name:'Meadow Table C',   col:23, row:18, color:0x84cc16, available:false, href:'/zone/bench-7', kind:'bench', seats:8 },
  { id:'bench8', name:'Meadow Table D',   col:18, row:22, color:0x84cc16, available:false, href:'/zone/bench-8', kind:'bench', seats:8 },
  { id:'bench9', name:'Meadow Table E',   col:21, row:22, color:0x84cc16, available:false, href:'/zone/bench-9', kind:'bench', seats:8 },
  // Ranch Houses
  { id:'home',   name:'Your Home',        col:20, row: 3, color:0xf59e0b, available:false, href:'/buildings/home',       w:2, h:2 },
  { id:'ranch1', name:'Oak Ranch',        col:25, row: 4, color:0xd97706, available:false, href:'/buildings/home',       w:2, h:1 },
  { id:'ranch2', name:'Sunset Ranch',     col:28, row: 2, color:0xb45309, available:false, href:'/buildings/home',       w:2, h:1 },
  { id:'ranch3', name:'Cedar House',      col:11, row:26, color:0x92400e, available:false, href:'/buildings/home',       w:2, h:1 },
  { id:'ranch4', name:'Meadow House',     col:18, row:28, color:0xa16207, available:false, href:'/buildings/home',       w:2, h:1 },
  { id:'ranch5', name:'Creekside Home',   col:21, row:25, color:0xca8a04, available:false, href:'/buildings/home',       w:2, h:2 },
  { id:'ranch_t1', name:'Ranch Patio',    col:22, row: 4, color:0xfbbf24, available:false, href:'/zone/ranch-1', kind:'table', seats:8 },
  { id:'ranch_t2', name:'Garden Hangout', col:13, row:27, color:0xfbbf24, available:false, href:'/zone/ranch-2', kind:'table', seats:8 },
  // Other districts
  { id:'university', name:'Realm University', col:43, row:19, color:0x8b5cf6, available:false, href:'/buildings/university', w:3, h:3 },
  { id:'mall',       name:'The Mall',          col:27, row:26, color:0xec4899, available:false, href:'/buildings/mall',       w:4, h:3 },
  { id:'government', name:'City Hall',         col:35, row:26, color:0x64748b, available:false, href:'/buildings/government', w:3, h:3 },
  { id:'gym',        name:'Iron District Gym', col:42, row:26, color:0xf97316, available:false, href:'/buildings/gym',        w:3, h:2 },
]

// Blocked tiles (building footprints, non-collidable kinds excluded)
const BLOCKED = new Set<string>()
for (const b of BUILDINGS) {
  if (b.kind) continue
  const w = b.w ?? 2, h = b.h ?? 2
  for (let dc = 0; dc < w; dc++)
    for (let dr = 0; dr < h; dr++)
      BLOCKED.add(`${b.col + dc},${b.row + dr}`)
}

function canWalk(px: number, py: number): boolean {
  const c = Math.floor(px / TW), r = Math.floor(py / TW)
  if (c < 0 || c >= GC || r < 0 || r >= GR) return false
  const ti = GRID_DATA[r]?.[c]
  if (ti === TI.WATER || ti === TI.LAKE) return false
  return !BLOCKED.has(`${c},${r}`)
}

// Color helpers (same as before, used for building drawing)
function dk(c: number, f: number): number {
  return (Math.floor(((c >> 16) & 0xff) * f) << 16) |
         (Math.floor(((c >>  8) & 0xff) * f) <<  8) |
          Math.floor( (c        & 0xff) * f)
}
function lk(c: number, f: number): number {
  return (Math.min(255, Math.floor(((c >> 16) & 0xff) * f)) << 16) |
         (Math.min(255, Math.floor(((c >>  8) & 0xff) * f)) <<  8) |
          Math.min(255, Math.floor( (c        & 0xff) * f))
}

// ══════════════════════════════════════════════════════════════════════════════
export class CityScene extends Phaser.Scene {
  private pX = 21.5 * TW
  private pY = 12.5 * TW
  private pDir: 'down' | 'up' | 'left' | 'right' = 'down'
  private isMoving = false
  private walkFrame = 0
  private walkTimer = 0

  private playerSprite!: Phaser.GameObjects.Image
  private nameText!:     Phaser.GameObjects.Text
  private entryGfx!:     Phaser.GameObjects.Graphics
  private promptBg!:     Phaser.GameObjects.Graphics
  private promptText!:   Phaser.GameObjects.Text

  private keys!: {
    W: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key
    E: Phaser.Input.Keyboard.Key
  }
  private displayName  = 'You'
  private nearBuilding: Bldg | null = null
  private lastPosEmit  = 0
  private teleportHandler!: EventListener

  constructor() { super({ key: 'CityScene' }) }
  init(data: { displayName?: string }) { this.displayName = data?.displayName ?? 'You' }

  preload() {}

  create() {
    this.cameras.main.setBackgroundColor(0x0a1628)
    this.buildTilesetTexture()
    this.createTilemap()
    this.bakeStaticLayer()
    this.generatePlayerTextures()
    this.createPlayer()
    this.createEntryGfx()
    this.createPrompt()
    this.setupCamera()
    this.setupKeys()

    this.teleportHandler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      this.pX = x; this.pY = y
      this.cameras.main.flash(200, 0, 0, 0, false)
    }
    window.addEventListener('realm:teleport', this.teleportHandler)
  }

  // ── Tileset texture (12 tiles × 48px on a canvas) ─────────────────────────
  private buildTilesetTexture() {
    const canvas = document.createElement('canvas')
    canvas.width  = NT * TW
    canvas.height = TW
    const ctx = canvas.getContext('2d')!

    const tiles: Array<{ color: string; fn?: (ox: number) => void }> = [
      {  // 0 GRASS
        color: '#3d7a4a',
        fn: ox => {
          ctx.fillStyle = 'rgba(0,0,0,0.1)'
          ;[[ox+10,8],[ox+28,18],[ox+18,32],[ox+38,24],[ox+6,38]].forEach(([x,y]) => ctx.fillRect(x,y,3,3))
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          ;[[ox+20,10],[ox+36,30]].forEach(([x,y]) => ctx.fillRect(x,y,4,2))
        },
      },
      {  // 1 ROAD_H
        color: '#252525',
        fn: ox => {
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(ox, 0, TW, 2)
          ctx.fillRect(ox, TW - 2, TW, 2)
          ctx.fillStyle = 'rgba(245,200,24,0.75)'
          ctx.fillRect(ox + 4, TW / 2 - 1, TW - 8, 2)
        },
      },
      {  // 2 ROAD_V
        color: '#252525',
        fn: ox => {
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(ox, 0, 2, TW)
          ctx.fillRect(ox + TW - 2, 0, 2, TW)
          ctx.fillStyle = 'rgba(245,200,24,0.75)'
          ctx.fillRect(ox + TW / 2 - 1, 4, 2, TW - 8)
        },
      },
      {  // 3 INTER
        color: '#1e1e1e',
        fn: ox => {
          ctx.fillStyle = 'rgba(255,255,255,0.1)'
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(ox + 4 + i * 6, 2,       3, 7)
            ctx.fillRect(ox + 4 + i * 6, TW - 9,  3, 7)
            ctx.fillRect(ox + 2,          4 + i*6, 7, 3)
            ctx.fillRect(ox + TW - 9,     4 + i*6, 7, 3)
          }
        },
      },
      {  // 4 WATER
        color: '#1a5fa0',
        fn: ox => {
          ctx.fillStyle = 'rgba(80,160,220,0.35)'
          ctx.fillRect(ox + 4, 10, TW - 8, 2)
          ctx.fillRect(ox + 8, 26, TW - 16, 2)
          ctx.fillRect(ox + 4, 38, TW - 8, 2)
        },
      },
      {  // 5 BEACH
        color: '#c8a43a',
        fn: ox => {
          ctx.fillStyle = 'rgba(220,180,60,0.4)'
          ;[[ox+8,10],[ox+22,20],[ox+36,8],[ox+14,34],[ox+32,38],[ox+6,26]].forEach(([x,y]) => {
            ctx.beginPath()
            ctx.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2)
            ctx.fill()
          })
        },
      },
      {  // 6 PLAZA
        color: '#7a7a8a',
        fn: ox => {
          ctx.fillStyle = 'rgba(80,80,100,0.5)'
          ctx.fillRect(ox, TW / 2, TW, 1)
          ctx.fillRect(ox + TW / 2, 0, 1, TW)
          ctx.fillStyle = 'rgba(140,140,160,0.2)'
          ctx.fillRect(ox, 0, TW, 1)
          ctx.fillRect(ox, 0, 1, TW)
        },
      },
      { color: '#455060' },  // 7 COM
      { color: '#1c2740' },  // 8 DT
      {  // 9 DOCK
        color: '#5c3a1e',
        fn: ox => {
          ctx.fillStyle = 'rgba(40,24,10,0.5)'
          for (let y = 8; y < TW; y += 10) ctx.fillRect(ox, y, TW, 1)
          ctx.fillStyle = 'rgba(120,80,40,0.25)'
          ctx.fillRect(ox + TW / 2, 0, 1, TW)
        },
      },
      { color: '#0d3d7a' },  // 10 LAKE
      {  // 11 PARK
        color: '#2d6e3e',
        fn: ox => {
          ctx.fillStyle = 'rgba(0,0,0,0.12)'
          ;[[ox+12,6],[ox+30,16],[ox+8,28],[ox+36,32]].forEach(([x,y]) => ctx.fillRect(x,y,3,3))
        },
      },
    ]

    tiles.forEach((t, i) => {
      const ox = i * TW
      ctx.fillStyle = t.color
      ctx.fillRect(ox, 0, TW, TW)
      t.fn?.(ox)
    })

    this.textures.addCanvas('tileset', canvas)
  }

  // ── Tilemap ────────────────────────────────────────────────────────────────
  private createTilemap() {
    const map = this.make.tilemap({ data: GRID_DATA, tileWidth: TW, tileHeight: TW })
    const ts  = map.addTilesetImage('tileset', 'tileset', TW, TW, 0, 0)
    if (!ts) return
    map.createLayer(0, ts, 0, 0)
  }

  // ── Static buildings + trees baked into one RenderTexture ─────────────────
  private bakeStaticLayer() {
    const g = this.make.graphics({}, false)

    // Seeded RNG for tree placement
    let seed = 0xdeadbeef
    const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000 }

    // Trees on park/grass tiles
    for (let r = 0; r < GR; r++) {
      for (let c = 0; c < GC; c++) {
        const ti = GRID_DATA[r][c]
        if (ti !== TI.PARK && ti !== TI.GRASS) continue
        if (BLOCKED.has(`${c},${r}`)) continue
        if (rng() > 0.16) continue
        const tx = c * TW + TW / 2, ty = r * TW + TW / 2
        g.fillStyle(0x000000, 0.18)
        g.fillEllipse(tx + 3, ty + 7, 24, 10)
        g.fillStyle(ti === TI.PARK ? 0x1e5c2a : 0x277040)
        g.fillCircle(tx, ty, 13)
        g.fillStyle(ti === TI.PARK ? 0x267a35 : 0x30944a)
        g.fillCircle(tx - 2, ty - 2, 9)
        g.fillStyle(0x3aaa58, 0.55)
        g.fillCircle(tx - 3, ty - 4, 5)
        g.fillStyle(0x4a2e14)
        g.fillRect(tx - 2, ty + 9, 4, 6)
      }
    }

    // Buildings
    for (const b of BUILDINGS) {
      if (b.kind) {
        this.drawSeatZone(g, b)
      } else {
        this.drawBuilding(g, b)
      }
    }

    const rt = this.add.renderTexture(0, 0, WORLD_W, WORLD_H)
    rt.draw(g, 0, 0)
    rt.setDepth(2)
    g.destroy()
  }

  private drawBuilding(g: Phaser.GameObjects.Graphics, b: Bldg) {
    const bw = (b.w ?? 2) * TW - 6
    const bh = (b.h ?? 2) * TW - 6
    const bx = b.col * TW + 3
    const by = b.row * TW + 3
    const c  = b.color

    // Shadow
    g.fillStyle(0x000000, 0.3)
    g.fillRoundedRect(bx + 5, by + 5, bw, bh, 5)
    // Body
    g.fillStyle(dk(c, 0.65))
    g.fillRoundedRect(bx, by, bw, bh, 5)
    // Roof face
    g.fillStyle(c)
    g.fillRoundedRect(bx, by, bw, bh - 5, 5)
    // Roof highlight
    g.fillStyle(lk(c, 1.5), 0.7)
    g.fillRoundedRect(bx + 3, by + 3, bw - 6, 5, 2)

    // Windows
    if (bw >= 44 && bh >= 32) {
      const cols = Math.max(1, Math.floor((bw - 12) / 20))
      const rows = Math.max(1, Math.floor((bh - 18) / 18))
      for (let wc = 0; wc < cols; wc++) {
        for (let wr = 0; wr < rows; wr++) {
          const wx = bx + 8 + wc * 20
          const wy = by + 12 + wr * 18
          if (wx + 10 > bx + bw - 4 || wy + 8 > by + bh - 6) continue
          g.fillStyle(0x000000, 0.25)
          g.fillRoundedRect(wx, wy, 12, 8, 1)
          g.fillStyle(0xb8deff, 0.75)
          g.fillRoundedRect(wx + 1, wy + 1, 10, 6, 1)
        }
      }
    }

    // Name label
    if (b.name.length < 18) {
      // (text added as proper game object below in scene, not in RT)
    }
  }

  private drawSeatZone(g: Phaser.GameObjects.Graphics, b: Bldg) {
    const cx = b.col * TW + TW / 2
    const cy = b.row * TW + TW / 2

    if (b.kind === 'bench') {
      g.lineStyle(1, b.color, 0.22)
      g.strokeCircle(cx, cy, ENT_R * 0.55)
      g.fillStyle(0x7a5010)
      g.fillRoundedRect(cx - 16, cy - 5, 32, 10, 3)
      g.fillStyle(b.color, 0.5)
      g.fillRoundedRect(cx - 16, cy - 6, 32, 4, 2)
    } else if (b.kind === 'table') {
      g.lineStyle(1, b.color, 0.22)
      g.strokeCircle(cx, cy, ENT_R * 0.55)
      g.fillStyle(0xb89450)
      g.fillEllipse(cx, cy, 26, 18)
      g.fillStyle(0x9a7838)
      g.fillEllipse(cx, cy, 20, 14)
    } else if (b.kind === 'boat') {
      g.lineStyle(2, 0x3080c0, 0.25)
      g.strokeEllipse(cx, cy, 76, 44)
      g.fillStyle(b.color)
      g.fillEllipse(cx, cy, 48, 24)
      g.fillStyle(0xffffff, 0.45)
      g.fillEllipse(cx - 4, cy - 3, 24, 12)
      // Mast
      g.fillStyle(0x8a6040)
      g.fillRect(cx - 1, cy - 24, 2, 24)
    }
  }

  // ── Player textures (generated once, 4 dir × 2 walk frames) ───────────────
  private generatePlayerTextures() {
    const dirs = ['down', 'up', 'left', 'right'] as const
    for (const dir of dirs) {
      for (const frame of [0, 1] as const) {
        const g = this.make.graphics({}, false)
        this.drawCharacter(g, dir, frame)
        g.generateTexture(`player-${dir}-${frame}`, 28, 40)
        g.destroy()
      }
    }
  }

  private drawCharacter(
    g: Phaser.GameObjects.Graphics,
    dir: 'down' | 'up' | 'left' | 'right',
    frame: 0 | 1
  ) {
    const cx = 14, cy = 28  // center of the 28×40 canvas (waist level)

    // Ground shadow
    g.fillStyle(0x000000, 0.2)
    g.fillEllipse(cx + 2, cy + 10, 22, 8)

    // Legs
    const legShift = frame === 1 ? 4 : -4
    const isLR = dir === 'left' || dir === 'right'
    g.fillStyle(0x2a4a8a)
    if (!isLR) {
      g.fillRect(cx - 7, cy, 6, 10 + legShift)
      g.fillRect(cx + 1, cy, 6, 10 - legShift)
      g.fillStyle(0x1a1a2e)
      g.fillRoundedRect(cx - 8, cy + 8 + legShift, 7, 4, 2)
      g.fillRoundedRect(cx + 1, cy + 8 - legShift, 7, 4, 2)
    } else {
      g.fillRect(cx - 3, cy, 7, 10)
      g.fillStyle(0x1a1a2e)
      g.fillRoundedRect(dir === 'right' ? cx : cx - 4, cy + 8, 8, 4, 2)
    }

    // Body (shirt)
    g.fillStyle(0x4f8ef7)
    g.fillRoundedRect(cx - 9, cy - 14, 18, 16, 4)
    // Shirt detail
    g.fillStyle(0x3a70d4, 0.6)
    g.fillRoundedRect(cx - 9, cy - 14, 18, 4, 4)

    // Head (skin)
    g.fillStyle(0xf5c07a)
    g.fillCircle(cx, cy - 22, 9)

    // Hair
    g.fillStyle(0x3a2208)
    if (dir === 'up') {
      g.fillCircle(cx, cy - 22, 9)
    } else {
      g.fillRect(cx - 9, cy - 31, 18, 10)
      g.fillCircle(cx, cy - 31, 5)
      g.fillRect(cx - 9, cy - 26, 4, 6)
      g.fillRect(cx + 5, cy - 26, 4, 6)
    }

    // Eyes (visible for down/left/right)
    if (dir !== 'up') {
      g.fillStyle(0x1a0a00)
      const eyeY = cy - 22
      if (dir === 'down') {
        g.fillCircle(cx - 3, eyeY, 1.5)
        g.fillCircle(cx + 3, eyeY, 1.5)
        // Eye whites (blink on frame 1)
        if (frame === 0) {
          g.fillStyle(0xffffff)
          g.fillCircle(cx - 3, eyeY - 0.5, 0.8)
          g.fillCircle(cx + 3, eyeY - 0.5, 0.8)
        }
      } else if (dir === 'left') {
        g.fillCircle(cx - 4, eyeY, 1.5)
      } else {
        g.fillCircle(cx + 4, eyeY, 1.5)
      }
    }
  }

  // ── Player object ─────────────────────────────────────────────────────────
  private createPlayer() {
    this.playerSprite = this.add.image(this.pX, this.pY, 'player-down-0')
      .setOrigin(0.5, 0.72)
      .setDepth(10)

    this.nameText = this.add.text(this.pX, this.pY + 12, this.displayName, {
      fontSize: '11px', color: '#ffffff',
      backgroundColor: '#00000055',
      padding: { x: 4, y: 2 },
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(11)
  }

  // ── Entry glow (animated, redrawn every frame — very minimal) ─────────────
  private createEntryGfx() {
    this.entryGfx = this.add.graphics().setDepth(3)
  }

  // ── HUD prompt ─────────────────────────────────────────────────────────────
  private createPrompt() {
    this.promptBg   = this.add.graphics().setScrollFactor(0).setDepth(20).setVisible(false)
    this.promptText = this.add.text(0, 0, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(21).setVisible(false)
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  private setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.setZoom(2.2)
    this.cameras.main.startFollow(this.playerSprite, true, 0.08, 0.08)
  }

  // ── Keys ──────────────────────────────────────────────────────────────────
  private setupKeys() {
    const kb = this.input.keyboard!
    this.keys = {
      W:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      S:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      A:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right:kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      E:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    this.handleMovement(delta)
    this.animateEntryGlow(_time)
    this.checkProximity()
    this.broadcastPosition(_time)
  }

  private handleMovement(delta: number) {
    const dt = delta / 1000
    let dx = 0, dy = 0

    if (this.keys.W.isDown || this.keys.up.isDown)    { dy -= 1; this.pDir = 'up' }
    if (this.keys.S.isDown || this.keys.down.isDown)  { dy += 1; this.pDir = 'down' }
    if (this.keys.A.isDown || this.keys.left.isDown)  { dx -= 1; this.pDir = 'left' }
    if (this.keys.D.isDown || this.keys.right.isDown) { dx += 1; this.pDir = 'right' }

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707 }
    this.isMoving = dx !== 0 || dy !== 0

    if (this.isMoving) {
      const nx = this.pX + dx * SPEED * dt
      const ny = this.pY + dy * SPEED * dt
      if (canWalk(nx, this.pY - P_R) && canWalk(nx, this.pY + P_R))
        this.pX = Phaser.Math.Clamp(nx, P_R, WORLD_W - P_R)
      if (canWalk(this.pX - P_R, ny) && canWalk(this.pX + P_R, ny))
        this.pY = Phaser.Math.Clamp(ny, P_R, WORLD_H - P_R)

      this.walkTimer += delta
      if (this.walkTimer > 160) { this.walkTimer = 0; this.walkFrame ^= 1 }
    }

    this.playerSprite.x = this.pX
    this.playerSprite.y = this.pY
    this.nameText.x     = this.pX
    this.nameText.y     = this.pY + 14

    const texKey = `player-${this.pDir}-${this.isMoving ? this.walkFrame : 0}`
    if (this.playerSprite.texture.key !== texKey) this.playerSprite.setTexture(texKey)
  }

  private animateEntryGlow(time: number) {
    this.entryGfx.clear()
    const pulse = 0.35 + 0.25 * Math.sin(time / 450)
    for (const b of BUILDINGS) {
      if (!b.available || b.kind) continue
      const cx = b.col * TW + (b.w ?? 2) * TW / 2
      const cy = b.row * TW + (b.h ?? 2) * TW / 2
      this.entryGfx.lineStyle(2, b.color, pulse)
      this.entryGfx.strokeCircle(cx, cy, ENT_R)
      this.entryGfx.fillStyle(b.color, pulse * 0.12)
      this.entryGfx.fillCircle(cx, cy, ENT_R)
    }
  }

  private checkProximity() {
    const prev = this.nearBuilding
    let found: Bldg | null = null

    for (const b of BUILDINGS) {
      const cx = b.col * TW + (b.w ?? 2) * TW / 2
      const cy = b.row * TW + (b.h ?? 2) * TW / 2
      if (Phaser.Math.Distance.Between(this.pX, this.pY, cx, cy) < ENT_R) {
        found = b; break
      }
    }

    this.nearBuilding = found
    if (found !== prev) found ? this.showPrompt(found) : this.hidePrompt()

    if (found?.available && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      window.dispatchEvent(new CustomEvent('realm:enter-building', {
        detail: { href: found.href, id: found.id },
      }))
    }
  }

  private showPrompt(b: Bldg) {
    const label = b.available ? `[E] Enter  ${b.name}` : `🔒  ${b.name}`
    this.promptText.setText(label).setVisible(true)
    const { width: sw, height: sh } = this.cameras.main
    const px = sw / 2 - this.promptText.width / 2
    const py = sh - 56 - this.promptText.height / 2
    this.promptText.setPosition(px, py)
    this.promptBg.clear().setVisible(true)
    this.promptBg.fillStyle(0x000000, 0.72)
    this.promptBg.fillRoundedRect(px - 5, py - 3, this.promptText.width + 10, this.promptText.height + 6, 6)
    this.promptBg.lineStyle(1, b.available ? b.color : 0x444455, 0.6)
    this.promptBg.strokeRoundedRect(px - 5, py - 3, this.promptText.width + 10, this.promptText.height + 6, 6)
  }

  private hidePrompt() {
    this.promptText.setVisible(false)
    this.promptBg.clear().setVisible(false)
  }

  private broadcastPosition(time: number) {
    if (time - this.lastPosEmit < 80) return
    this.lastPosEmit = time
    window.dispatchEvent(new CustomEvent('realm:player-position', { detail: { x: this.pX, y: this.pY } }))
  }

  shutdown() {
    window.removeEventListener('realm:teleport', this.teleportHandler)
  }
}
