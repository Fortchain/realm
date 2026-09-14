import Phaser from "phaser"

// ── Constants ─────────────────────────────────────────────────────────────────
const GC      = 48          // grid cols
const GR      = 48          // grid rows
const HW      = 50          // half tile width  (tile = 100 wide — matches Kenney sprites)
const HH      = 25          // half tile height (tile = 50 tall, 2:1 ratio)
const FH      = 18          // pixels per building floor
const OX      = 2500        // world-space origin x for tile (0,0)
const OY      = 300         // world-space origin y
const WORLD_W = 5400
const WORLD_H = 3000
const SPEED   = 250
const ENT_R   = 90

// ── Coordinate helpers ────────────────────────────────────────────────────────
function ts(col: number, row: number) {
  return { sx: OX + (col - row) * HW, sy: OY + (col + row) * HH }
}
function st(sx: number, sy: number) {
  const dx = sx - OX, dy = sy - OY
  return { col: (dx / HW + dy / HH) / 2, row: (dy / HH - dx / HW) / 2 }
}

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function lcg(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000 }
}

// ── Color helpers ─────────────────────────────────────────────────────────────
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

// ── Grid (24×24) ───────────────────────────────────────────────────────────────
type T = 'water'|'beach'|'park'|'plaza'|'road'|'inter'|'res'|'com'|'dt'|'dock'|'lake'

// Roads at cols/rows 8,16,24,32,40  —  48×48 full city grid
const RAW: string[][] = [
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  0
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  1
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  2
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','s','s','s','K','s','s','R','K','s','s','s','K','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  3
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','s','s','s','K','s','s','R','K','s','s','s','K','s','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  4
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','K','s','s','K','K','s','R','K','K','s','s','K','K','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  5
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','K','s','s','K','K','s','R','K','K','s','s','K','K','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  6
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','K','K','s','s','K','K','s','R','K','K','s','s','K','K','s','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K'], //  7
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'], //  8 EW
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], //  9
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], // 10
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], // 11
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','P','P','P','P','D','D','R','P','P','P','D','D','P','P','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], // 12
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','P','P','P','P','D','D','R','P','P','P','D','D','P','P','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], // 13
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], // 14
  ['W','W','W','W','W','W','W','W','R','d','d','c','c','c','c','c','R','D','D','D','D','D','D','D','R','D','D','D','D','D','D','D','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c'], // 15
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'], // 16 EW
  ['W','W','W','W','W','W','W','W','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 17
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 18
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','P','P','P','P','P','P','P','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 19
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','P','P','P','P','P','P','P','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 20
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 21
  ['W','W','W','W','W','W','W','W','R','K','K','L','L','L','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 22
  ['W','W','W','W','W','W','W','W','R','K','K','K','K','K','K','K','R','K','K','K','K','K','K','K','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 23
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'], // 24 EW
  ['W','W','W','W','W','W','W','W','R','K','K','s','s','s','K','K','R','s','s','K','K','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 25
  ['W','W','W','W','W','W','W','W','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 26
  ['W','W','W','W','W','W','W','W','R','s','s','s','K','s','s','s','R','K','s','s','s','s','K','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 27
  ['W','W','W','W','W','W','W','W','R','K','K','s','s','s','K','K','R','s','s','K','K','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 28
  ['W','W','W','W','W','W','W','W','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 29
  ['W','W','W','W','W','W','W','W','R','s','s','s','K','s','s','s','R','K','s','s','s','s','K','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 30
  ['W','W','W','W','W','W','W','W','R','K','K','s','s','s','K','K','R','s','s','K','K','s','s','s','R','c','c','c','c','c','c','c','R','c','c','c','c','c','c','c','R','s','s','s','s','s','s','s'], // 31
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'], // 32 EW
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 33
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 34
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 35
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 36
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 37
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 38
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 39
  ['R','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R','X','R','R','R','R','R','R','R'], // 40 EW
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 41
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 42
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 43
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 44
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 45
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 46
  ['B','B','B','B','B','B','B','B','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s','R','s','s','s','s','s','s','s'], // 47
]
const KEY: Record<string, T> = { W:'water',B:'beach',K:'park',P:'plaza',R:'road',X:'inter',s:'res',c:'com',D:'dt',d:'dock',L:'lake' }
const GRID: T[][] = RAW.map(r => r.map(c => KEY[c]))

// Walk everywhere except water
function walkable(col: number, row: number): boolean {
  const c = Math.floor(col), r = Math.floor(row)
  if (c < 0 || c >= GC || r < 0 || r >= GR) return false
  return GRID[r]?.[c] !== 'water'
}

function canOccupy(sx: number, sy: number): boolean {
  const center = st(sx, sy)
  return walkable(center.col, center.row)
}

// ── Named buildings ────────────────────────────────────────────────────────────
interface Bldg { id:string; name:string; col:number; row:number; color:number; available:boolean; href:string; floors:number; kind?:string; seats?:number }
const BUILDINGS: Bldg[] = [
  // ── Financial District (cols 17-31, rows 9-15) ──────────────────────────
  { id:'bank',    name:'First Realm Bank',    col:19, row:11, floors:6,  color:0x10b981, available:true,  href:'/buildings/bank'    },
  { id:'office',  name:'Realm Tower',         col:22, row:10, floors:11, color:0x0891b2, available:false, href:'/buildings/office'  },
  { id:'office2', name:'Exchange Building',   col:27, row:10, floors:8,  color:0x3730a3, available:false, href:'/buildings/office'  },
  { id:'office3', name:'Financial HQ',        col:29, row:14, floors:12, color:0x1d4ed8, available:false, href:'/buildings/office'  },
  { id:'office4', name:'Commerce Plaza',      col:20, row:15, floors:7,  color:0x0f766e, available:false, href:'/buildings/office'  },
  // Financial outdoor tables (spatial audio zones)
  { id:'fin_t1',  name:'Plaza Café ☕',        col:19, row:12, floors:0, color:0xf59e0b, available:false, href:'/zone/plaza-1', kind:'table', seats:8 },
  { id:'fin_t2',  name:'Terrace Lounge',      col:21, row:13, floors:0, color:0xf59e0b, available:false, href:'/zone/plaza-2', kind:'table', seats:8 },
  { id:'fin_t3',  name:'Garden Seating',      col:25, row:12, floors:0, color:0xf59e0b, available:false, href:'/zone/plaza-3', kind:'table', seats:8 },
  { id:'fin_t4',  name:'Sky Deck Table',      col:27, row:13, floors:0, color:0xf59e0b, available:false, href:'/zone/plaza-4', kind:'table', seats:8 },
  { id:'fin_t5',  name:'Courtyard Table',     col:30, row:12, floors:0, color:0xf59e0b, available:false, href:'/zone/plaza-5', kind:'table', seats:8 },
  // ── Marina / Docks (cols 9-15, rows 0-15) ───────────────────────────────
  { id:'marina',  name:'Realm Marina',        col:12, row: 5, floors:2, color:0x0ea5e9, available:false, href:'/buildings/marina'  },
  { id:'yacht_club', name:'Yacht Club',       col:13, row:11, floors:2, color:0x0369a1, available:false, href:'/buildings/marina'  },
  // Boats (on water tiles, col 0-7)
  { id:'boat1',   name:'The Pelican',         col: 4, row: 2, floors:0, color:0xf97316, available:false, href:'/zone/boat-1', kind:'boat', seats:50 },
  { id:'boat2',   name:'The Albatross',       col: 3, row: 5, floors:0, color:0xec4899, available:false, href:'/zone/boat-2', kind:'boat', seats:50 },
  { id:'boat3',   name:'Marina Star',         col: 5, row:11, floors:0, color:0x8b5cf6, available:false, href:'/zone/boat-3', kind:'boat', seats:50 },
  { id:'boat4',   name:'The Compass',         col: 2, row:14, floors:0, color:0x10b981, available:false, href:'/zone/boat-4', kind:'boat', seats:50 },
  // ── Hospital (cols 33-39, rows 9-15) ────────────────────────────────────
  { id:'hospital',  name:'Realm Medical Ctr', col:36, row:11, floors:5, color:0xef4444, available:false, href:'/buildings/hospital'  },
  { id:'hosp_conf', name:'Medical Conf. Hall', col:35, row:13, floors:2, color:0xfca5a5, available:false, href:'/buildings/hospital'  },
  // ── Libraries ────────────────────────────────────────────────────────────
  { id:'library',   name:'City Library',      col:43, row:11, floors:3, color:0x3b82f6, available:true,  href:'/buildings/library'   },
  { id:'library2',  name:'South Branch Lib.', col:36, row:19, floors:2, color:0x6366f1, available:false, href:'/buildings/library'   },
  // ── Park with Lake (cols 9-23, rows 17-23) ──────────────────────────────
  // Benches around the lake (block 1: cols 9-15) — 8-person spatial zones
  { id:'bench1', name:'Lakeside Bench A', col: 9, row:18, floors:0, color:0x84cc16, available:false, href:'/zone/bench-1', kind:'bench', seats:8 },
  { id:'bench2', name:'Lakeside Bench B', col: 9, row:21, floors:0, color:0x84cc16, available:false, href:'/zone/bench-2', kind:'bench', seats:8 },
  { id:'bench3', name:'Lakeside Bench C', col:14, row:18, floors:0, color:0x84cc16, available:false, href:'/zone/bench-3', kind:'bench', seats:8 },
  { id:'bench4', name:'Lakeside Bench D', col:14, row:21, floors:0, color:0x84cc16, available:false, href:'/zone/bench-4', kind:'bench', seats:8 },
  // Meadow tables (block 2: cols 17-23) — separated so zones don't overlap
  { id:'bench5', name:'Meadow Table A',   col:17, row:18, floors:0, color:0x84cc16, available:false, href:'/zone/bench-5', kind:'bench', seats:8 },
  { id:'bench6', name:'Meadow Table B',   col:20, row:19, floors:0, color:0x84cc16, available:false, href:'/zone/bench-6', kind:'bench', seats:8 },
  { id:'bench7', name:'Meadow Table C',   col:23, row:18, floors:0, color:0x84cc16, available:false, href:'/zone/bench-7', kind:'bench', seats:8 },
  { id:'bench8', name:'Meadow Table D',   col:18, row:22, floors:0, color:0x84cc16, available:false, href:'/zone/bench-8', kind:'bench', seats:8 },
  { id:'bench9', name:'Meadow Table E',   col:21, row:22, floors:0, color:0x84cc16, available:false, href:'/zone/bench-9', kind:'bench', seats:8 },
  // ── Ranch Houses ─────────────────────────────────────────────────────────
  { id:'home',    name:'Your Home',           col:20, row: 3, floors:2, color:0xf59e0b, available:false, href:'/buildings/home'     },
  { id:'ranch1',  name:'Oak Ranch',           col:25, row: 4, floors:1, color:0xd97706, available:false, href:'/buildings/home'     },
  { id:'ranch2',  name:'Sunset Ranch',        col:28, row: 2, floors:1, color:0xb45309, available:false, href:'/buildings/home'     },
  { id:'ranch3',  name:'Cedar House',         col:11, row:26, floors:1, color:0x92400e, available:false, href:'/buildings/home'     },
  { id:'ranch4',  name:'Meadow House',        col:18, row:28, floors:1, color:0xa16207, available:false, href:'/buildings/home'     },
  { id:'ranch5',  name:'Creekside Home',      col:21, row:25, floors:2, color:0xca8a04, available:false, href:'/buildings/home'     },
  // Ranch outdoor hangout tables
  { id:'ranch_t1', name:'Ranch Patio',        col:22, row: 4, floors:0, color:0xfbbf24, available:false, href:'/zone/ranch-1', kind:'table', seats:8 },
  { id:'ranch_t2', name:'Garden Hangout',     col:13, row:27, floors:0, color:0xfbbf24, available:false, href:'/zone/ranch-2', kind:'table', seats:8 },
  // ── University ──────────────────────────────────────────────────────────
  { id:'university', name:'Realm University', col:44, row:20, floors:4, color:0x8b5cf6, available:false, href:'/buildings/university' },
  // ── Mall ────────────────────────────────────────────────────────────────
  { id:'mall',       name:'The Mall',         col:28, row:27, floors:3, color:0xec4899, available:false, href:'/buildings/mall'      },
  // ── Government ──────────────────────────────────────────────────────────
  { id:'government', name:'City Hall',        col:36, row:27, floors:5, color:0x64748b, available:false, href:'/buildings/government'},
  { id:'gym',        name:'Iron District Gym',col:43, row:27, floors:2, color:0xf97316, available:false, href:'/buildings/gym'       },
]
const BMAP = new Map(BUILDINGS.map(b => [`${b.col},${b.row}`, b]))

// ── V2 cast helper for fillPoints ─────────────────────────────────────────────
type V2 = { x:number; y:number }
function fp(pts: V2[]): Phaser.Math.Vector2[] { return pts as unknown as Phaser.Math.Vector2[] }

// ── Draw: flat iso diamond ────────────────────────────────────────────────────
function diamond(g: Phaser.GameObjects.Graphics, sx: number, sy: number, col: number, alpha = 1) {
  g.fillStyle(col, alpha)
  g.fillPoints(fp([{ x:sx, y:sy-HH }, { x:sx+HW, y:sy }, { x:sx, y:sy+HH }, { x:sx-HW, y:sy }]), true)
}

// ── Draw: iso cube (three visible faces) ──────────────────────────────────────
function cube(g: Phaser.GameObjects.Graphics, sx: number, sy: number, H: number,
              topCol: number, rightCol: number, leftCol: number) {
  // SE face
  g.fillStyle(rightCol)
  g.fillPoints(fp([{ x:sx+HW, y:sy-H }, { x:sx, y:sy+HH-H }, { x:sx, y:sy+HH }, { x:sx+HW, y:sy }]), true)
  // SW face
  g.fillStyle(leftCol)
  g.fillPoints(fp([{ x:sx-HW, y:sy-H }, { x:sx, y:sy+HH-H }, { x:sx, y:sy+HH }, { x:sx-HW, y:sy }]), true)
  // Top face
  g.fillStyle(topCol)
  g.fillPoints(fp([{ x:sx, y:sy-HH-H }, { x:sx+HW, y:sy-H }, { x:sx, y:sy+HH-H }, { x:sx-HW, y:sy-H }]), true)
}

// ── Draw: windows on SE parallelogram face ────────────────────────────────────
// Point on SE face at param (u ∈ [0,1] horiz, v ∈ [0,1] vert-from-bottom):
//   wx = sx + u*HW,  wy = sy + HH*(1-u) - v*H
function winSE(g: Phaser.GameObjects.Graphics, sx: number, sy: number, H: number, col: number) {
  const nC = Math.max(2, Math.floor(HW / 16))
  const nR = Math.max(1, Math.floor(H / 16))
  g.fillStyle(col, 0.72)
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const u = (c + 0.5) / nC
      const v = (r + 0.7) / nR
      const wx = sx + u * HW
      const wy = sy + HH * (1 - u) - v * H
      g.fillRect(wx - 2, wy - 3, 4, 5)
    }
  }
}

// ── Draw: windows on SW parallelogram face ────────────────────────────────────
// wx = sx - HW*(1-u),  wy = sy - v*H + u*HH
function winSW(g: Phaser.GameObjects.Graphics, sx: number, sy: number, H: number, col: number) {
  const nC = Math.max(2, Math.floor(HW / 16))
  const nR = Math.max(1, Math.floor(H / 16))
  g.fillStyle(col, 0.65)
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const u = (c + 0.5) / nC
      const v = (r + 0.7) / nR
      const wx = sx - HW * (1 - u)
      const wy = sy - v * H + u * HH
      g.fillRect(wx - 2, wy - 3, 4, 5)
    }
  }
}


// ── Draw: street lamp ─────────────────────────────────────────────────────────
function streetLamp(g: Phaser.GameObjects.Graphics, sx: number, sy: number) {
  // Ground halo
  g.fillStyle(0xffcc44, 0.07)
  g.fillEllipse(sx, sy + 4, 28, 12)
  // Pole
  g.fillStyle(0x8888aa)
  g.fillRect(sx - 1, sy - 22, 2, 22)
  // Arm extending toward viewer (SE direction)
  g.fillStyle(0x8888aa)
  g.fillRect(sx, sy - 22, 6, 2)
  // Lamp head
  g.fillStyle(0x555577)
  g.fillRect(sx + 3, sy - 24, 8, 4)
  // Warm glow
  g.fillStyle(0xffdd88, 0.65)
  g.fillEllipse(sx + 7, sy - 22, 6, 4)
  // Glow bloom
  g.fillStyle(0xffdd88, 0.12)
  g.fillEllipse(sx + 7, sy - 20, 18, 14)
}

// ═════════════════════════════════════════════════════════════════════════════
export class CityScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container
  private playerGfx!:       Phaser.GameObjects.Graphics
  private shadowGfx!:       Phaser.GameObjects.Graphics
  private playerSx = 0
  private playerSy = 0
  private keys!: {
    w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key
    e: Phaser.Input.Keyboard.Key
  }
  private displayName   = 'You'
  private nearBuilding: Bldg | null = null
  private promptText!:  Phaser.GameObjects.Text
  private walkTick      = 0
  private lastPosEmit   = 0
  private facingRight   = true
  private teleportHandler!: EventListener

  constructor() { super({ key: 'CityScene' }) }
  init(data: { displayName?: string }) { this.displayName = data.displayName ?? 'You' }

  // ── Preload ───────────────────────────────────────────────────────────────
  preload() {
    const p = '/sprites/city/'
    this.load.image('tile-grass',          p + 'grass.png')
    this.load.image('tile-water',          p + 'water.png')
    this.load.image('tile-beach',          p + 'beach.png')
    this.load.image('tile-road',           p + 'road.png')
    this.load.image('tile-road-ns',        p + 'road-ns.png')
    this.load.image('tile-road-ew',        p + 'road-ew.png')
    this.load.image('tile-inter',          p + 'crossroad.png')
    this.load.image('tile-dirt',           p + 'dirt.png')
    this.load.image('tile-lot',            p + 'lot.png')
    this.load.image('tree-tall',           p + 'tree-tall.png')
    this.load.image('tree-short',          p + 'tree-short.png')
    this.load.image('tree-conifer',        p + 'tree-conifer.png')
    this.load.image('tree-conifer-short',  p + 'tree-conifer-short.png')
  }

  // ── Create ────────────────────────────────────────────────────────────────
  create() {
    this.cameras.main.setBackgroundColor(0x0d1520)
    this.drawCity()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()

    this.teleportHandler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{x:number;y:number}>).detail
      this.playerSx = x; this.playerSy = y
      this.playerContainer.x = x; this.playerContainer.y = y
      this.cameras.main.flash(200, 0, 0, 0, false)
    }
    window.addEventListener('realm:teleport', this.teleportHandler)
  }

  // ── Draw city (painter's algo) ─────────────────────────────────────────────
  private drawCity() {
    for (let d = 0; d <= GC + GR - 2; d++) {
      const gB = this.add.graphics().setDepth(d * 4 + 1)  // buildings
      const gW = this.add.graphics().setDepth(d * 4 + 2)  // windows / decor / lamps

      for (let col = Math.max(0, d - GR + 1); col <= Math.min(d, GC - 1); col++) {
        const row = d - col
        const { sx, sy } = ts(col, row)
        const type = GRID[row]?.[col]
        if (!type) continue
        this.renderGround(sx, sy, col, row, type, d * 4)
        this.renderBuilding(gB, gW, sx, sy, col, row, type)
      }
    }
    this.addNeighbourhoodLabels()
  }

  // ── Ground (sprite-based) ─────────────────────────────────────────────────
  // Tiles are 100×65 RGBA PNGs (Kenney Isometric Roads pack).
  // Diamond top apex = sprite pixel (50,0). We place at (sx, sy-HH) with
  // origin(0.5,0) so the apex lands exactly on the iso top-of-tile point.
  private renderGround(sx: number, sy: number, col: number, row: number, type: T, depth: number) {
    let key: string
    switch (type) {
      case 'water': key = 'tile-water'; break
      case 'beach': key = 'tile-beach'; break
      case 'park':  key = 'tile-grass'; break
      case 'plaza': key = 'tile-lot';   break
      case 'road': {
        // col=8/16/24/32/40 run SW → EW sprite; row roads run SE → NS sprite
        const isColRoad = col === 8 || col === 16 || col === 24 || col === 32 || col === 40
        key = isColRoad ? 'tile-road-ew' : 'tile-road-ns'
        break
      }
      case 'inter': key = 'tile-inter'; break
      case 'res':   key = 'tile-grass'; break
      case 'com':   key = 'tile-grass'; break
      case 'dt':    key = 'tile-road';  break
      case 'dock':  key = 'tile-dirt';  break
      case 'lake':  key = 'tile-water'; break
      default:      key = 'tile-grass'
    }
    this.add.image(sx, sy - HH, key).setOrigin(0.5, 0).setDepth(depth)
  }

  // ── Buildings ─────────────────────────────────────────────────────────────
  private renderBuilding(
    gB: Phaser.GameObjects.Graphics, gW: Phaser.GameObjects.Graphics,
    sx: number, sy: number, col: number, row: number, type: T
  ) {
    const named = BMAP.get(`${col},${row}`)
    if (named) { this.drawNamedBuilding(gB, gW, sx, sy, named); return }

    if (type === 'park') {
      const rng  = lcg(col * 37 + row * 23)
      const d    = (col + row) * 4 + 0.5
      const keys = ['tree-tall', 'tree-conifer', 'tree-conifer-short', 'tree-short']
      if (rng() > 0.35) {
        const key = keys[Math.floor(rng() * keys.length)]
        const ox  = (rng() - 0.5) * HW * 0.6
        const oy  = (rng() - 0.5) * HH * 0.6
        this.add.image(sx + ox, sy + oy, key).setOrigin(0.5, 1).setScale(3.5).setDepth(d)
      }
      if (rng() > 0.55) {
        const key = keys[Math.floor(rng() * keys.length)]
        const ox  = (rng() - 0.5) * HW * 0.5
        const oy  = (rng() - 0.5) * HH * 0.5
        this.add.image(sx + ox, sy + oy, key).setOrigin(0.5, 1).setScale(2.8).setDepth(d)
      }
      return
    }

    // Street lamps every 3rd tile along roads
    if (type === 'road' || type === 'dock') {
      if (type === 'road') {
        const nsRoad = col === 8 || col === 16 || col === 24 || col === 32 || col === 40
        if (nsRoad && row % 3 === 1) {
          streetLamp(gW, sx + HW * 0.55, sy + HH * 0.3)
        } else if (!nsRoad && col % 3 === 1) {
          streetLamp(gW, sx - HW * 0.15, sy - HH * 0.7)
        }
      }
      return
    }

    if (type !== 'res' && type !== 'com' && type !== 'dt') return

    const rng = lcg(col * 37 + row * 19)

    let floors: number, roofCol: number, winCol: number
    if (type === 'res') {
      floors = 1 + Math.floor(rng() * 2)         // 1–2 floors
      roofCol = [0x2a2018, 0x241e18, 0x2e2820, 0x261e20][Math.floor(rng() * 4)]
      winCol  = 0xffcc66
    } else if (type === 'com') {
      floors = 2 + Math.floor(rng() * 3)         // 2–4 floors
      roofCol = [0x1a2434, 0x1c2838, 0x162030, 0x202a3c][Math.floor(rng() * 4)]
      winCol  = 0x88ccff
    } else {
      floors = 4 + Math.floor(rng() * 6)         // 4–9 floors
      roofCol = [0x0e1828, 0x0c1622, 0x101a2c, 0x0a1420][Math.floor(rng() * 4)]
      winCol  = 0xaaddff
    }

    const H = floors * FH
    cube(gB, sx, sy, H, roofCol, dk(roofCol, 0.55), dk(roofCol, 0.38))
    winSE(gW, sx, sy, H, winCol)
    winSW(gW, sx, sy, H, winCol)

    // Roof accent (thin lighter stripe)
    gB.lineStyle(1, lk(roofCol, 1.8), 0.5)
    gB.lineBetween(sx - HW, sy - H, sx, sy - HH - H)
    gB.lineBetween(sx, sy - HH - H, sx + HW, sy - H)
  }

  // ── Bench (8-person spatial audio zone) ───────────────────────────────────
  private drawBench(gB: Phaser.GameObjects.Graphics, sx: number, sy: number, b: Bldg) {
    const dep = (b.col + b.row) * 4 + 2
    // Soft zone ring
    gB.lineStyle(1.5, b.color, 0.28)
    gB.strokeEllipse(sx, sy + HH * 0.4, HW * 1.2, HH * 1.2)
    // Shadow
    gB.fillStyle(0x000000, 0.15)
    gB.fillEllipse(sx + 3, sy + 8, 30, 10)
    // Bench seat
    gB.fillStyle(0x8B5E3C)
    gB.fillPoints(fp([{ x:sx-13, y:sy-2 }, { x:sx+14, y:sy-7 }, { x:sx+14, y:sy-3 }, { x:sx-13, y:sy+2 }]), true)
    // Bench back
    gB.fillPoints(fp([{ x:sx-13, y:sy-8 }, { x:sx+14, y:sy-13 }, { x:sx+14, y:sy-10 }, { x:sx-13, y:sy-5 }]), true)
    // Legs
    gB.fillStyle(0x6b3d1e)
    gB.fillRect(sx - 11, sy + 2, 3, 5)
    gB.fillRect(sx + 10, sy - 3, 3, 5)
    // Seat-count dots
    gB.fillStyle(0xffffff, 0.35)
    for (let i = 0; i < 4; i++) gB.fillCircle(sx - 9 + i * 7, sy - 14, 1.8)
    for (let i = 0; i < 4; i++) gB.fillCircle(sx - 9 + i * 7, sy - 5, 1.8)
    this.add.text(sx, sy - 18, b.name, {
      fontSize: '6px', color: `#${b.color.toString(16).padStart(6,'0')}`,
      backgroundColor: '#00000099', padding: { x:3, y:1 },
    }).setOrigin(0.5, 1).setDepth(dep)
  }

  // ── Boat (50-person zone floating on water) ───────────────────────────────
  private drawBoat(gB: Phaser.GameObjects.Graphics, sx: number, sy: number, b: Bldg) {
    const dep = (b.col + b.row) * 4 + 2
    // Water ripple
    gB.lineStyle(1, 0x4fc3f7, 0.25)
    gB.strokeEllipse(sx, sy + 8, HW * 2.0, HH * 1.2)
    // Hull (dark) – iso parallelogram
    gB.fillStyle(dk(b.color, 0.45))
    gB.fillPoints(fp([
      { x:sx-HW*0.80, y:sy+HH*0.20 }, { x:sx+HW*0.80, y:sy-HH*0.20 },
      { x:sx+HW*0.65, y:sy+HH*0.65 }, { x:sx-HW*0.65, y:sy+HH*0.65 },
    ]), true)
    // Deck (lighter)
    gB.fillStyle(lk(b.color, 0.75))
    gB.fillPoints(fp([
      { x:sx, y:sy-HH*0.90 }, { x:sx+HW*0.80, y:sy-HH*0.20 },
      { x:sx, y:sy+HH*0.40 }, { x:sx-HW*0.80, y:sy-HH*0.20 },
    ]), true)
    // Cabin
    gB.fillStyle(lk(b.color, 0.55))
    gB.fillRect(sx - 11, sy - 28, 22, 14)
    gB.lineStyle(0.5, 0xffffff, 0.25)
    gB.strokeRect(sx - 11, sy - 28, 22, 14)
    // Mast
    gB.fillStyle(0x8B4513)
    gB.fillRect(sx - 1, sy - 54, 2, 27)
    // Flag
    gB.fillStyle(b.color, 0.9)
    gB.fillTriangle(sx + 1, sy - 54, sx + 13, sy - 47, sx + 1, sy - 40)
    this.add.text(sx, sy - 60, `⚓ ${b.name}`, {
      fontSize: '7px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x:4, y:2 }, align: 'center',
    }).setOrigin(0.5, 1).setDepth(dep)
  }

  // ── Outdoor table (8-person plaza zone) ───────────────────────────────────
  private drawTable(gB: Phaser.GameObjects.Graphics, sx: number, sy: number, b: Bldg) {
    const dep = (b.col + b.row) * 4 + 2
    // Zone shadow
    gB.fillStyle(0x000000, 0.12)
    gB.fillEllipse(sx + 3, sy + 5, 34, 14)
    // Zone ring
    gB.lineStyle(1, b.color, 0.28)
    gB.strokeEllipse(sx, sy, HW * 0.9, HH * 0.9)
    // Table top
    gB.fillStyle(0xdeb887, 0.9)
    gB.fillEllipse(sx, sy - 7, 18, 9)
    gB.fillStyle(0x8B6914, 0.7)
    gB.fillEllipse(sx + 1, sy - 5, 18, 9)
    // Chairs (8 evenly around table)
    gB.fillStyle(0xb5835a)
    const chairR = 14, chairH = 6
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2
      gB.fillRect(sx + Math.cos(ang) * chairR - 2, sy + Math.sin(ang) * chairH - 2 - 6, 4, 4)
    }
    this.add.text(sx, sy - 16, b.name, {
      fontSize: '6px', color: `#${b.color.toString(16).padStart(6,'0')}`,
      backgroundColor: '#00000088', padding: { x:3, y:1 },
    }).setOrigin(0.5, 1).setDepth(dep)
  }

  // ── Named building ─────────────────────────────────────────────────────────
  private drawNamedBuilding(
    gB: Phaser.GameObjects.Graphics, gW: Phaser.GameObjects.Graphics,
    sx: number, sy: number, b: Bldg
  ) {
    // Dispatch special kinds
    if (b.kind === 'bench') { this.drawBench(gB, sx, sy, b); return }
    if (b.kind === 'boat')  { this.drawBoat(gB, sx, sy, b); return }
    if (b.kind === 'table') { this.drawTable(gB, sx, sy, b); return }

    const H = b.floors * FH
    const topCol   = b.available ? lk(b.color, 0.55) : 0x2a3040
    const rightCol = dk(topCol, 0.55)
    const leftCol  = dk(topCol, 0.38)

    // Drop shadow under building
    gB.fillStyle(0x000000, 0.35)
    gB.fillPoints(fp([
      { x:sx, y:sy+HH+4 }, { x:sx+HW+4, y:sy+4 },
      { x:sx+4, y:sy-HH+4+H*0.1 }, { x:sx-HW+4, y:sy+4 },
    ]), true)

    cube(gB, sx, sy, H, topCol, rightCol, leftCol)

    // Window lights on both faces
    const winBright = b.available ? lk(b.color, 2.2) : 0x9999bb
    winSE(gW, sx, sy, H, winBright)
    winSW(gW, sx, sy, H, winBright)

    // Glowing top edge stripe
    if (b.available) {
      gB.lineStyle(2, b.color, 0.85)
      gB.lineBetween(sx - HW, sy - H, sx, sy - HH - H)
      gB.lineBetween(sx, sy - HH - H, sx + HW, sy - H)
      // Small roof glow
      gB.fillStyle(b.color, 0.15)
      gB.fillPoints(fp([
        { x:sx, y:sy-HH-H }, { x:sx+HW, y:sy-H }, { x:sx, y:sy+HH-H }, { x:sx-HW, y:sy-H },
      ]), true)
    }

    // Entrance door (SE face, center-bottom)
    const doorU = 0.5
    const doorSx = sx + doorU * HW
    const doorSy = sy + HH * (1 - doorU)
    gB.fillStyle(b.available ? b.color : 0x404060, 0.9)
    gB.fillRect(doorSx - 3, doorSy - 10, 6, 10)
    gB.lineStyle(0.5, 0xffffff, 0.3)
    gB.strokeRect(doorSx - 3, doorSy - 10, 6, 10)

    const depth = (b.col + b.row) * 4 + 3
    if (b.available) {
      const badge = this.add.text(sx, sy - HH - H - 18, '● OPEN', {
        fontSize: '7px', color: `#${b.color.toString(16).padStart(6,'0')}`,
        fontStyle: 'bold', backgroundColor: '#ffffffdd', padding: { x:5, y:2 },
      }).setOrigin(0.5, 1).setDepth(depth + 0.2)
      this.tweens.add({ targets: badge, alpha: { from:1, to:0.25 }, duration:1600, yoyo:true, repeat:-1 })
    }
    this.add.text(sx, sy - HH - H - 3, b.name, {
      fontSize: '8px', color: b.available ? '#ffffff' : '#888899',
      fontStyle: 'bold', backgroundColor: '#00000099', padding: { x:4, y:2 },
    }).setOrigin(0.5, 1).setDepth(depth + 0.1)

    // Flanking trees (sprite-based)
    const td = (b.col + b.row) * 4 + 0.5
    this.add.image(sx + HW * 0.65, sy + HH * 0.3, 'tree-conifer').setOrigin(0.5, 1).setScale(3.2).setDepth(td)
    this.add.image(sx - HW * 0.7,  sy + HH * 0.3, 'tree-tall').setOrigin(0.5, 1).setScale(3.2).setDepth(td)
  }

  // ── Neighbourhood labels ──────────────────────────────────────────────────
  private addNeighbourhoodLabels() {
    const L = [
      { t:'FINANCIAL DISTRICT', col:23, row:11 },
      { t:'MARINA & DOCKS',     col:11, row: 7 },
      { t:'CENTRAL PARK',       col:13, row:20 },
      { t:'PARK MEADOW',        col:19, row:20 },
      { t:'HOSPITAL ROW',       col:36, row:12 },
      { t:'LIBRARY DISTRICT',   col:43, row:12 },
      { t:'RANCH ESTATES NORTH',col:23, row: 3 },
      { t:'RANCH ESTATES SOUTH',col:14, row:28 },
      { t:'THE MALL',           col:27, row:28 },
      { t:'CITY GOVERNMENT',    col:36, row:28 },
      { t:'UNIVERSITY QUARTER', col:44, row:21 },
      { t:'PACIFIC OCEAN',      col: 3, row:14 },
      { t:'NORTH BEACH',        col: 3, row:36 },
    ]
    for (const l of L) {
      const { sx, sy } = ts(l.col, l.row)
      this.add.text(sx, sy - HH, l.t, {
        fontSize: '8px', color: '#ffffff1a', fontStyle: 'bold', letterSpacing: 3,
      }).setOrigin(0.5).setDepth((l.col + l.row) * 4 + 0.5)
    }
  }

  // ── Player ────────────────────────────────────────────────────────────────
  private createPlayer() {
    this.shadowGfx = this.add.graphics()
    this.playerGfx = this.add.graphics()
    this.drawPlayerSprite()

    const nameLabel = this.add.text(0, -52, this.displayName, {
      fontSize: '8px', color: '#ffffffcc', fontStyle: 'bold',
      backgroundColor: '#000000aa', padding: { x:4, y:2 },
    }).setOrigin(0.5, 1)

    const spawn = ts(21, 12)  // financial district
    this.playerSx = spawn.sx
    this.playerSy = spawn.sy
    this.playerContainer = this.add.container(this.playerSx, this.playerSy, [this.shadowGfx, this.playerGfx, nameLabel])
    this.playerContainer.setDepth(9999)
  }

  private drawPlayerSprite() {
    const g = this.playerGfx
    const s = this.shadowGfx
    const fr = this.facingRight

    s.clear()
    g.clear()

    // Ground shadow (isometric ellipse)
    s.fillStyle(0x000000, 0.28)
    s.fillEllipse(fr ? 2 : -2, 12, 26, 10)

    // ── Legs ──
    g.fillStyle(0x1c2a60)   // dark navy jeans
    // left leg
    g.fillRoundedRect(fr ? -8 : 1,  3, 6, 12, 2)
    // right leg
    g.fillRoundedRect(fr ?  1 : -7, 3, 6, 12, 2)
    // shoes
    g.fillStyle(0xeeeeee)
    g.fillRoundedRect(fr ? -9 : 2,  13, 7, 4, 1)
    g.fillRoundedRect(fr ?  0 : -8, 13, 7, 4, 1)

    // ── Body / jacket ──
    const bodyCol = 0x4338ca   // indigo jacket
    g.fillStyle(bodyCol)
    g.fillRoundedRect(-9, -13, 18, 17, 3)
    // collar / lapel
    g.fillStyle(lk(bodyCol, 0.7))
    g.fillTriangle(fr ? -2 : 0, -13, fr ? 2 : -2, -13, 0, -7)

    // ── Arms ──
    g.fillStyle(bodyCol)
    if (fr) {
      g.fillRoundedRect(-14, -12, 5, 13, 2)   // left arm (back)
      g.fillRoundedRect(  9, -12, 5, 13, 2)   // right arm (front)
    } else {
      g.fillRoundedRect(-14, -12, 5, 13, 2)
      g.fillRoundedRect(  9, -12, 5, 13, 2)
    }
    // hands
    g.fillStyle(0xf5c07a)
    g.fillCircle(fr ? 11 : -12, 1, 3)
    g.fillCircle(fr ? -12 : 11, 1, 3)

    // ── Head ──
    g.fillStyle(0xf5c07a)    // skin
    g.fillCircle(fr ? 2 : -2, -24, 10)
    // ear
    g.fillCircle(fr ? 11 : -11, -24, 3)

    // ── Hair ──
    g.fillStyle(0x3c2010)    // dark brown
    g.fillEllipse(fr ? 1 : -1, -31, 17, 8)
    g.fillRect((fr ? -7 : -8), -34, 15, 6)

    // ── Eyes ──
    g.fillStyle(0x1a1a2e)
    if (fr) {
      g.fillCircle(5,  -25, 2)
      g.fillCircle(0,  -25, 1.5)
    } else {
      g.fillCircle(-5, -25, 2)
      g.fillCircle( 0, -25, 1.5)
    }
    // eye highlight
    g.fillStyle(0xffffff, 0.8)
    if (fr) { g.fillCircle(6, -26, 0.8) } else { g.fillCircle(-6, -26, 0.8) }

    // ── Nose ──
    g.fillStyle(0xe0a060, 0.7)
    g.fillCircle(fr ? 3 : -3, -23, 1.5)
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  private setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.setZoom(0.7)
    this.cameras.main.startFollow(this.playerContainer, true, 0.09, 0.09)
  }

  // ── Keys ──────────────────────────────────────────────────────────────────
  private setupKeys() {
    const kb = this.input.keyboard!
    this.keys = {
      w:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }
    this.keys.e.on('down', () => {
      if (this.nearBuilding?.available) this.enterBuilding(this.nearBuilding)
    })
  }

  // ── Prompt ────────────────────────────────────────────────────────────────
  private createPrompt() {
    this.promptText = this.add.text(
      this.cameras.main.width / 2, this.cameras.main.height - 50, '',
      { fontSize: '13px', color: '#1a1a3e', backgroundColor: '#ffffffee', padding: { x:14, y:8 } }
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9999).setAlpha(0)

    this.scale.on('resize', () => {
      this.promptText?.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 50)
    })
  }

  private enterBuilding(b: Bldg) {
    this.cameras.main.flash(280, 255, 255, 255, false)
    this.time.delayedCall(300, () => {
      window.dispatchEvent(new CustomEvent('realm:enter-building', { detail: { href:b.href, id:b.id } }))
    })
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    const dt = delta / 1000
    const { w, s, a, d, up, down, left, right } = this.keys

    let vx = 0, vy = 0
    // GTA-style: W=up, S=down, A=left, D=right (composes naturally to iso diagonals)
    if (w.isDown  || up.isDown)    vy -= SPEED
    if (s.isDown  || down.isDown)  vy += SPEED
    if (a.isDown  || left.isDown)  vx -= SPEED
    if (d.isDown  || right.isDown) vx += SPEED
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    const isMoving = vx !== 0 || vy !== 0

    if (isMoving) {
      if (vx > 5)       this.facingRight = true
      else if (vx < -5) this.facingRight = false

      const dx = vx * dt, dy = vy * dt
      if (canOccupy(this.playerSx + dx, this.playerSy))      this.playerSx += dx
      if (canOccupy(this.playerSx,      this.playerSy + dy)) this.playerSy += dy

      this.playerContainer.x = this.playerSx
      this.playerContainer.y = this.playerSy

      this.walkTick++
      // Walk bob
      const bob = Math.sin(this.walkTick * 0.28) * 2
      this.playerContainer.y = this.playerSy + bob
      // Redraw sprite every 5 ticks for animation
      if (this.walkTick % 5 === 0) this.drawPlayerSprite()
    } else {
      if (this.walkTick !== 0) {
        this.walkTick = 0
        this.playerContainer.y = this.playerSy
        this.drawPlayerSprite()
      }
    }

    // Update depth each frame for correct painter ordering
    const tile = st(this.playerSx, this.playerSy)
    this.playerContainer.setDepth((tile.col + tile.row) * 4 + 2.5)

    // Proximity check for buildings
    let closest: Bldg | null = null, closestDist = Infinity
    for (const b of BUILDINGS) {
      const { sx, sy } = ts(b.col, b.row)
      const dist = Phaser.Math.Distance.Between(this.playerSx, this.playerSy, sx, sy)
      if (dist < ENT_R && dist < closestDist) { closestDist = dist; closest = b }
    }

    if (closest !== this.nearBuilding) {
      this.nearBuilding = closest
      if (closest?.available) {
        this.promptText.setText(`[E]  Enter  ${closest.name}`)
        this.tweens.add({ targets: this.promptText, alpha: 1, duration: 180 })
      } else if (closest) {
        this.promptText.setText(`🔒  ${closest.name}  —  Coming Soon`)
        this.tweens.add({ targets: this.promptText, alpha: 0.45, duration: 180 })
      } else {
        this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200 })
      }
    }

    // Emit position for minimap
    if (_time - this.lastPosEmit > 80) {
      this.lastPosEmit = _time
      window.dispatchEvent(new CustomEvent('realm:player-position', {
        detail: { x: this.playerSx, y: this.playerSy },
      }))
    }
  }

  shutdown() {
    if (this.teleportHandler) window.removeEventListener('realm:teleport', this.teleportHandler)
  }
}
