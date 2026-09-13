import Phaser from "phaser"

// ── Constants ─────────────────────────────────────────────────────────────────
const GC      = 24          // grid cols
const GR      = 24          // grid rows
const HW      = 48          // half tile width  (tile = 96 wide)
const HH      = 24          // half tile height (tile = 48 tall, 2:1 ratio)
const FH      = 18          // pixels per building floor
const OX      = 1250        // world-space origin x for tile (0,0)
const OY      = 160         // world-space origin y
const WORLD_W = 2500
const WORLD_H = 1420
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
type T = 'water'|'beach'|'park'|'plaza'|'road'|'inter'|'res'|'com'|'dt'

// Roads at cols 6,12,18  and rows 6,12,18
const RAW: string[][] = [
//  0    1    2    3    4    5   [6]   7    8    9   10   11  [12]  13   14   15   16   17  [18]  19   20   21   22   23
  ['W', 'W', 'W', 'W', 'B', 'K', 'R', 'K', 'K', 'K', 'K', 'K', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], // 0
  ['W', 'W', 'W', 'B', 'B', 'K', 'R', 'K', 'K', 'K', 'K', 'K', 'R', 'K', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], // 1
  ['W', 'W', 'B', 'B', 'K', 'K', 'R', 'K', 'K', 'K', 'K', 'K', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], // 2
  ['W', 'B', 'B', 'K', 'K', 'K', 'R', 'K', 'K', 'K', 'K', 'K', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], // 3
  ['W', 'B', 'K', 'K', 'K', 'K', 'R', 'K', 'K', 'K', 'K', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], // 4
  ['B', 'B', 'K', 'K', 'K', 'K', 'R', 'K', 'K', 'K', 's', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], // 5
  ['R', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R'], // 6 EW
  ['W', 'B', 's', 's', 's', 's', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 's', 's', 's', 's', 's'], // 7
  ['W', 'B', 's', 's', 's', 's', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 's', 's', 's', 's', 's'], // 8
  ['W', 'W', 's', 's', 's', 's', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 's', 's', 's', 's', 's'], // 9
  ['W', 'W', 's', 's', 's', 's', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 's', 's', 's', 's', 's'], //10
  ['W', 'W', 'P', 'P', 's', 's', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 'c', 'c', 'c', 'c', 'c', 'R', 's', 's', 's', 's', 's'], //11
  ['R', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R'], //12 EW
  ['W', 'W', 'W', 'P', 's', 's', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'c', 'c', 'c', 'c', 's'], //13
  ['W', 'W', 'W', 's', 's', 's', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'c', 'c', 'c', 'c', 's'], //14
  ['W', 'W', 'W', 's', 's', 's', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'c', 'c', 'c', 'c', 's'], //15
  ['W', 'W', 'W', 's', 's', 's', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'c', 'c', 'c', 'c', 's'], //16
  ['W', 'W', 'W', 's', 's', 's', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'c', 'c', 'c', 'c', 's'], //17
  ['R', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R', 'X', 'R', 'R', 'R', 'R', 'R'], //18 EW
  ['W', 'W', 'W', 'W', 'W', 'W', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], //19
  ['W', 'W', 'W', 'W', 'W', 'W', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], //20
  ['W', 'W', 'W', 'W', 'W', 'W', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], //21
  ['W', 'W', 'W', 'W', 'W', 'W', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], //22
  ['W', 'W', 'W', 'W', 'W', 'W', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's', 'R', 's', 's', 's', 's', 's'], //23
]
const KEY: Record<string, T> = { W:'water',B:'beach',K:'park',P:'plaza',R:'road',X:'inter',s:'res',c:'com',D:'dt' }
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
interface Bldg { id:string; name:string; col:number; row:number; color:number; available:boolean; href:string; floors:number }
const BUILDINGS: Bldg[] = [
  { id:'bank',       name:'First Realm Bank',  col: 8, row:13, floors:4, color:0x10b981, available:true,  href:'/buildings/bank'       },
  { id:'library',    name:'City Library',       col:14, row: 2, floors:3, color:0x3b82f6, available:true,  href:'/buildings/library'    },
  { id:'gym',        name:'Iron District Gym',  col: 3, row: 8, floors:2, color:0xf97316, available:false, href:'/buildings/gym'        },
  { id:'hospital',   name:'Realm Medical',      col:15, row: 9, floors:3, color:0xef4444, available:false, href:'/buildings/hospital'   },
  { id:'university', name:'Realm University',   col:20, row: 2, floors:3, color:0x8b5cf6, available:false, href:'/buildings/university' },
  { id:'mall',       name:'The Mall',           col:20, row:14, floors:2, color:0xec4899, available:false, href:'/buildings/mall'       },
  { id:'government', name:'City Hall',          col: 8, row:16, floors:5, color:0x64748b, available:false, href:'/buildings/government' },
  { id:'home',       name:'Your Home',          col:21, row: 1, floors:2, color:0xf59e0b, available:false, href:'/buildings/home'       },
  { id:'office',     name:'Office Tower',       col: 9, row:14, floors:8, color:0x0891b2, available:false, href:'/buildings/office'     },
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

// ── Draw: iso tree ─────────────────────────────────────────────────────────────
function isoTree(g: Phaser.GameObjects.Graphics, sx: number, sy: number, scale = 1) {
  g.fillStyle(0x000000, 0.15)
  g.fillEllipse(sx + 3, sy + 5, 14 * scale, 6 * scale)
  g.fillStyle(0x3c2010)
  g.fillRect(sx - 1.5, sy - 1, 3, 9 * scale)
  g.fillStyle(0x1a4c1a)
  g.fillCircle(sx - 1, sy - 8 * scale, 9 * scale)
  g.fillStyle(0x256a25)
  g.fillCircle(sx - 2, sy - 13 * scale, 6 * scale)
  g.fillStyle(0x38a038, 0.6)
  g.fillCircle(sx - 3, sy - 16 * scale, 4 * scale)
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
      const gG = this.add.graphics().setDepth(d * 4)      // ground
      const gB = this.add.graphics().setDepth(d * 4 + 1)  // buildings
      const gW = this.add.graphics().setDepth(d * 4 + 2)  // windows / decor

      for (let col = Math.max(0, d - GR + 1); col <= Math.min(d, GC - 1); col++) {
        const row = d - col
        const { sx, sy } = ts(col, row)
        const type = GRID[row]?.[col]
        if (!type) continue
        this.renderGround(gG, sx, sy, type)
        this.renderBuilding(gB, gW, sx, sy, col, row, type)
      }
    }
    this.addNeighbourhoodLabels()
  }

  // ── Ground ────────────────────────────────────────────────────────────────
  private renderGround(g: Phaser.GameObjects.Graphics, sx: number, sy: number, type: T) {
    switch (type) {
      case 'water':
        diamond(g, sx, sy, 0x0a3d6b)
        // wave highlight strip
        g.fillStyle(0x1a6aaa, 0.18)
        g.fillPoints(fp([{ x:sx, y:sy-HH }, { x:sx+HW*0.55, y:sy-HH*0.3 }, { x:sx, y:sy-HH*0.1 }]), true)
        break
      case 'beach':
        diamond(g, sx, sy, 0xc8a830)
        diamond(g, sx, sy, 0xe0c060, 0.22)
        break
      case 'park':
        diamond(g, sx, sy, 0x1e4e1e)
        g.fillStyle(0x2a6e2a, 0.35)
        g.fillPoints(fp([{ x:sx, y:sy-HH }, { x:sx+HW*0.55, y:sy-HH*0.2 }, { x:sx, y:sy-HH*0.3 }]), true)
        break
      case 'plaza':
        diamond(g, sx, sy, 0x6060a0)
        g.lineStyle(0.8, 0x8080c0, 0.3)
        g.lineBetween(sx, sy-HH, sx, sy+HH)
        g.lineBetween(sx-HW, sy, sx+HW, sy)
        break
      case 'road':
        diamond(g, sx, sy, 0x1e1e30)
        g.lineStyle(1.2, 0xffffff, 0.10)
        g.lineBetween(sx - HW * 0.6, sy, sx + HW * 0.6, sy)
        break
      case 'inter':
        diamond(g, sx, sy, 0x181828)
        // crosswalk marks
        g.fillStyle(0x303048, 0.5)
        for (let i = -1; i <= 1; i++) {
          const off = i * HW * 0.3
          g.fillPoints(fp([
            { x:sx+off-5, y:sy-HH*0.35 }, { x:sx+off+5, y:sy-HH*0.35 },
            { x:sx+off+5, y:sy+HH*0.35 }, { x:sx+off-5, y:sy+HH*0.35 },
          ]), true)
        }
        break
      case 'res':
        diamond(g, sx, sy, 0x302820)
        break
      case 'com':
        diamond(g, sx, sy, 0x202838)
        break
      case 'dt':
        diamond(g, sx, sy, 0x161e30)
        break
    }
  }

  // ── Buildings ─────────────────────────────────────────────────────────────
  private renderBuilding(
    gB: Phaser.GameObjects.Graphics, gW: Phaser.GameObjects.Graphics,
    sx: number, sy: number, col: number, row: number, type: T
  ) {
    const named = BMAP.get(`${col},${row}`)
    if (named) { this.drawNamedBuilding(gB, gW, sx, sy, named); return }

    if (type === 'park') {
      const rng = lcg(col * 37 + row * 23)
      if (rng() > 0.35) isoTree(gW, sx + (rng() - 0.5) * HW * 0.5, sy + (rng() - 0.5) * HH * 0.5)
      if (rng() > 0.6)  isoTree(gW, sx + (rng() - 0.5) * HW * 0.5, sy + (rng() - 0.5) * HH * 0.5, 0.75)
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

  // ── Named building ─────────────────────────────────────────────────────────
  private drawNamedBuilding(
    gB: Phaser.GameObjects.Graphics, gW: Phaser.GameObjects.Graphics,
    sx: number, sy: number, b: Bldg
  ) {
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

    // Flanking trees
    isoTree(gW, sx + HW * 0.65, sy + HH * 0.3, 0.85)
    isoTree(gW, sx - HW * 0.7,  sy + HH * 0.3, 0.85)
  }

  // ── Neighbourhood labels ──────────────────────────────────────────────────
  private addNeighbourhoodLabels() {
    const L = [
      { t:'DOWNTOWN',      col: 9, row:14 },
      { t:'BALBOA PARK',   col: 9, row: 2 },
      { t:'PACIFIC BEACH', col: 1, row: 8 },
      { t:'HILLCREST',     col: 9, row: 8 },
      { t:'LA JOLLA',      col:14, row: 1 },
      { t:'UTC',           col:20, row: 8 },
      { t:'NORTH PARK',    col:20, row:14 },
    ]
    for (const l of L) {
      const { sx, sy } = ts(l.col, l.row)
      this.add.text(sx, sy - HH, l.t, {
        fontSize: '9px', color: '#ffffff22', fontStyle: 'bold', letterSpacing: 3,
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

    const spawn = ts(8, 12)   // on EW road near downtown
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
    this.cameras.main.setZoom(0.9)
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
