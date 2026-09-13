import Phaser from "phaser"

// ── Iso constants ─────────────────────────────────────────────────────────────
const GC     = 20           // grid cols
const GR     = 20           // grid rows
const HW     = 64           // half tile width
const HH     = 32           // half tile height
const FH     = 28           // pixels per floor
const OX     = 1280         // world origin x (screen x for tile 0,0)
const OY     = 160          // world origin y
const WORLD_W = 2600
const WORLD_H = 1560
const SPEED   = 200
const ENT_R   = 110         // enter-building proximity (screen px)
const FOOT    = 18          // player collision footprint (screen px)

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

// ── Grid ──────────────────────────────────────────────────────────────────────
type T = 'water' | 'beach' | 'park' | 'plaza' | 'road' | 'inter' | 'res' | 'com' | 'dt'

const RAW: string[][] = [
  ['W','W','W','B','K','R','K','K','K','K','R','K','K','K','K','R','s','s','s','s'],
  ['W','W','B','B','K','R','K','K','K','K','R','K','K','K','s','R','s','s','s','s'],
  ['W','W','B','K','K','R','K','K','K','K','R','s','s','s','s','R','s','s','s','s'],
  ['W','B','B','K','K','R','K','K','K','s','R','s','s','s','s','R','s','s','s','s'],
  ['W','B','K','K','K','R','K','K','s','s','R','s','s','s','s','R','s','s','s','s'],
  ['R','R','R','R','R','X','R','R','R','R','X','R','R','R','R','X','R','R','R','R'],
  ['B','B','s','s','s','R','c','c','c','c','R','c','c','c','c','R','s','s','s','s'],
  ['W','B','s','s','s','R','c','c','c','c','R','c','c','c','c','R','s','s','s','s'],
  ['W','B','s','s','s','R','c','c','c','c','R','c','c','c','c','R','s','s','s','s'],
  ['W','W','s','s','s','R','c','c','c','c','R','c','c','c','c','R','s','s','s','s'],
  ['W','W','P','P','P','X','R','R','R','R','X','R','R','R','R','X','R','R','R','R'],
  ['W','W','W','P','s','R','D','D','D','D','R','D','D','D','D','R','c','c','c','s'],
  ['W','W','W','s','s','R','D','D','D','D','R','D','D','D','D','R','c','c','c','s'],
  ['W','W','W','s','s','R','D','D','D','D','R','D','D','D','D','R','c','c','c','s'],
  ['W','W','W','s','s','R','D','D','D','D','R','D','D','D','D','R','c','c','c','s'],
  ['W','W','W','W','W','X','R','R','R','R','X','R','R','R','R','X','R','R','R','R'],
  ['W','W','W','W','W','R','s','s','s','s','R','s','s','s','s','R','s','s','s','s'],
  ['W','W','W','W','W','R','s','s','s','s','R','s','s','s','s','R','s','s','s','s'],
  ['W','W','W','W','W','R','s','s','s','s','R','s','s','s','s','R','s','s','s','s'],
  ['W','W','W','W','W','R','s','s','s','s','R','s','s','s','s','R','s','s','s','s'],
]
const KEY: Record<string, T> = { W:'water',B:'beach',K:'park',P:'plaza',R:'road',X:'inter',s:'res',c:'com',D:'dt' }
const GRID: T[][] = RAW.map(r => r.map(c => KEY[c]))

function walkable(col: number, row: number): boolean {
  const c = Math.floor(col), r = Math.floor(row)
  if (c < 0 || c >= GC || r < 0 || r >= GR) return false
  const t = GRID[r]?.[c]
  return t === 'road' || t === 'inter' || t === 'park' || t === 'beach' || t === 'plaza'
}

function canOccupy(sx: number, sy: number): boolean {
  const checks = [
    st(sx, sy),
    st(sx + FOOT, sy + FOOT * 0.5),
    st(sx - FOOT, sy + FOOT * 0.5),
    st(sx + FOOT, sy - FOOT * 0.5),
    st(sx - FOOT, sy - FOOT * 0.5),
  ]
  return checks.every(p => walkable(p.col, p.row))
}

// ── Named buildings ────────────────────────────────────────────────────────────
interface Bldg {
  id: string; name: string; col: number; row: number
  color: number; available: boolean; href: string; floors: number
}
const BUILDINGS: Bldg[] = [
  { id:'bank',       name:'First Realm Bank',  col:7,  row:11, floors:5, color:0x10b981, available:true,  href:'/buildings/bank'       },
  { id:'library',    name:'City Library',       col:12, row:2,  floors:3, color:0x3b82f6, available:true,  href:'/buildings/library'    },
  { id:'gym',        name:'Iron District Gym',  col:2,  row:7,  floors:2, color:0xf97316, available:false, href:'/buildings/gym'        },
  { id:'hospital',   name:'Realm Medical',      col:12, row:8,  floors:4, color:0xef4444, available:false, href:'/buildings/hospital'   },
  { id:'university', name:'Realm University',   col:16, row:2,  floors:3, color:0x8b5cf6, available:false, href:'/buildings/university' },
  { id:'mall',       name:'The Mall',           col:16, row:11, floors:2, color:0xec4899, available:false, href:'/buildings/mall'       },
  { id:'government', name:'City Hall',          col:7,  row:13, floors:6, color:0x64748b, available:false, href:'/buildings/government' },
  { id:'home',       name:'Your Home',          col:17, row:1,  floors:2, color:0xf59e0b, available:false, href:'/buildings/home'       },
  { id:'office',     name:'Office Tower',       col:8,  row:12, floors:9, color:0x0891b2, available:false, href:'/buildings/office'     },
]
const BMAP = new Map(BUILDINGS.map(b => [`${b.col},${b.row}`, b]))

// ── Low-level draw primitives ──────────────────────────────────────────────────

// Phaser's fillPoints expects Vector2[] but plain {x,y} objects work at runtime.
// This cast satisfies the type checker without runtime cost.
type V2 = { x: number; y: number }
function fp(pts: V2[]): Phaser.Math.Vector2[] { return pts as unknown as Phaser.Math.Vector2[] }

function diamond(g: Phaser.GameObjects.Graphics, sx: number, sy: number, color: number, alpha = 1) {
  g.fillStyle(color, alpha)
  g.fillPoints(fp([
    { x: sx,      y: sy - HH },
    { x: sx + HW, y: sy      },
    { x: sx,      y: sy + HH },
    { x: sx - HW, y: sy      },
  ]), true)
}

function cube(
  g: Phaser.GameObjects.Graphics,
  sx: number, sy: number,
  H: number,
  topCol: number, rightCol: number, leftCol: number
) {
  // Right face (SE wall)
  g.fillStyle(rightCol)
  g.fillPoints(fp([
    { x: sx + HW, y: sy - H      },
    { x: sx,      y: sy + HH - H },
    { x: sx,      y: sy + HH     },
    { x: sx + HW, y: sy          },
  ]), true)
  // Left face (SW wall)
  g.fillStyle(leftCol)
  g.fillPoints(fp([
    { x: sx - HW, y: sy - H      },
    { x: sx,      y: sy + HH - H },
    { x: sx,      y: sy + HH     },
    { x: sx - HW, y: sy          },
  ]), true)
  // Top face (roof)
  g.fillStyle(topCol)
  g.fillPoints(fp([
    { x: sx,      y: sy - HH - H },
    { x: sx + HW, y: sy - H      },
    { x: sx,      y: sy + HH - H },
    { x: sx - HW, y: sy - H      },
  ]), true)
}

function isoTree(g: Phaser.GameObjects.Graphics, sx: number, sy: number) {
  // Shadow
  g.fillStyle(0x000000, 0.18)
  g.fillEllipse(sx + 4, sy + 6, 20, 8)
  // Trunk
  g.fillStyle(0x5c3d1e)
  g.fillRect(sx - 2, sy - 2, 4, 10)
  // Canopy
  g.fillStyle(0x1e5c1e)
  g.fillCircle(sx - 2, sy - 10, 13)
  g.fillStyle(0x2d7a2d)
  g.fillCircle(sx - 4, sy - 16, 9)
  g.fillStyle(0x3a9a3a, 0.7)
  g.fillCircle(sx - 5, sy - 20, 6)
}

// ═════════════════════════════════════════════════════════════════════════════
export class CityScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container
  private playerGfx!:       Phaser.GameObjects.Graphics
  private playerSx = 0
  private playerSy = 0
  private keys!: {
    w: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    e: Phaser.Input.Keyboard.Key
  }
  private displayName  = 'You'
  private nearBuilding: Bldg | null = null
  private promptText!:  Phaser.GameObjects.Text
  private walkTick     = 0
  private lastPosEmit  = 0
  private teleportHandler!: EventListener
  private facingRight  = true

  constructor() { super({ key: 'CityScene' }) }
  init(data: { displayName?: string }) { this.displayName = data.displayName ?? 'You' }

  // ── Create ────────────────────────────────────────────────────────────────
  create() {
    this.cameras.main.setBackgroundColor(0x1a2438)
    this.drawCity()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()

    this.teleportHandler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      this.playerSx = x; this.playerSy = y
      this.playerContainer.x = x; this.playerContainer.y = y
      this.cameras.main.flash(200, 0, 0, 0, false)
    }
    window.addEventListener('realm:teleport', this.teleportHandler)
  }

  // ── Draw city (painter's algo: back → front) ──────────────────────────────
  private drawCity() {
    for (let d = 0; d <= GC + GR - 2; d++) {
      const gGround = this.add.graphics().setDepth(d * 4)
      const gBuilds = this.add.graphics().setDepth(d * 4 + 1)
      const gDecor  = this.add.graphics().setDepth(d * 4 + 2)

      for (let col = Math.max(0, d - GR + 1); col <= Math.min(d, GC - 1); col++) {
        const row = d - col
        const { sx, sy } = ts(col, row)
        const type = GRID[row]?.[col]
        if (!type) continue

        this.renderGround(gGround, sx, sy, type)
        this.renderBuilding(gBuilds, gDecor, sx, sy, col, row, type)
      }
    }

    // Neighbourhood labels (fixed text objects)
    this.addNeighbourhoodLabels()
  }

  // ── Ground tile ───────────────────────────────────────────────────────────
  private renderGround(g: Phaser.GameObjects.Graphics, sx: number, sy: number, type: T) {
    switch (type) {
      case 'water':
        diamond(g, sx, sy, 0x0d5a9e)
        // small highlight
        g.fillStyle(0x3a8fd4, 0.12)
        g.fillPoints(fp([{ x: sx, y: sy - HH }, { x: sx + HW * 0.5, y: sy - HH * 0.5 }, { x: sx, y: sy }]), true)
        break
      case 'beach':
        diamond(g, sx, sy, 0xd4b848)
        diamond(g, sx, sy, 0xc8a820, 0.2)
        break
      case 'park':
        diamond(g, sx, sy, 0x2d6e2d)
        g.fillStyle(0x3a8a3a, 0.3)
        g.fillPoints(fp([{ x: sx, y: sy - HH }, { x: sx + HW * 0.6, y: sy - HH * 0.2 }, { x: sx, y: sy - HH * 0.3 }]), true)
        break
      case 'plaza':
        diamond(g, sx, sy, 0x787890)
        g.lineStyle(1, 0x9090aa, 0.35)
        g.lineBetween(sx, sy - HH, sx, sy + HH)
        g.lineBetween(sx - HW, sy, sx + HW, sy)
        break
      case 'road':
        diamond(g, sx, sy, 0x252535)
        // centre dashes
        g.lineStyle(1.5, 0xffffff, 0.14)
        g.lineBetween(sx - HW * 0.7, sy, sx + HW * 0.7, sy)
        break
      case 'inter':
        diamond(g, sx, sy, 0x202030)
        // crosswalk strips
        g.fillStyle(0x383850, 0.45)
        for (let i = -1; i <= 1; i++) {
          const off = i * HW * 0.35
          g.fillPoints(fp([
            { x: sx + off - 6, y: sy - HH * 0.4 },
            { x: sx + off + 6, y: sy - HH * 0.4 },
            { x: sx + off + 6, y: sy + HH * 0.4 },
            { x: sx + off - 6, y: sy + HH * 0.4 },
          ]), true)
        }
        break
      case 'res':
        diamond(g, sx, sy, 0x484038)
        break
      case 'com':
        diamond(g, sx, sy, 0x384048)
        break
      case 'dt':
        diamond(g, sx, sy, 0x283040)
        break
    }
  }

  // ── Buildings ─────────────────────────────────────────────────────────────
  private renderBuilding(
    g: Phaser.GameObjects.Graphics, gd: Phaser.GameObjects.Graphics,
    sx: number, sy: number, col: number, row: number, type: T
  ) {
    const named = BMAP.get(`${col},${row}`)

    if (named) {
      this.drawNamedBuilding(g, gd, sx, sy, named)
      return
    }

    if (type === 'park') {
      // Scatter trees on park tiles
      const rng = lcg(col * 41 + row * 23)
      const count = 2 + Math.floor(rng() * 2)
      for (let i = 0; i < count; i++) {
        const ox = (rng() - 0.5) * HW * 0.7
        const oy = (rng() - 0.5) * HH * 0.7
        isoTree(gd, sx + ox, sy + oy)
      }
      return
    }

    if (type !== 'res' && type !== 'com' && type !== 'dt') return

    const rng = lcg(col * 37 + row * 19)
    let floors: number, roofCol: number

    if (type === 'res') {
      floors = 1 + Math.floor(rng() * 3)
      const palette = [0xc4b494, 0xd2c0a0, 0xb8a880, 0xcec0a4, 0xd4c4a8]
      roofCol = palette[Math.floor(rng() * palette.length)]
    } else if (type === 'com') {
      floors = 2 + Math.floor(rng() * 4)
      const palette = [0x8898a8, 0x98a8b8, 0x7888a0, 0x8090a4, 0x9098b0]
      roofCol = palette[Math.floor(rng() * palette.length)]
    } else {
      floors = 5 + Math.floor(rng() * 8)
      const palette = [0x507090, 0x4a6880, 0x3a5870, 0x486888, 0x405d78]
      roofCol = palette[Math.floor(rng() * palette.length)]
    }

    const H = floors * FH
    cube(g, sx, sy, H, roofCol, dk(roofCol, 0.6), dk(roofCol, 0.45))

    // Windows on roof top face (DT only: grid lines)
    if (type === 'dt') {
      const winStep = 10
      g.lineStyle(0.7, dk(roofCol, 0.65), 0.5)
      for (let wx = -HW + winStep; wx < HW; wx += winStep) {
        const t = wx / HW
        g.lineBetween(sx + wx, sy - HH - H, sx + wx + HH, sy - H)
      }
    }
  }

  // ── Named building ─────────────────────────────────────────────────────────
  private drawNamedBuilding(
    g: Phaser.GameObjects.Graphics, gd: Phaser.GameObjects.Graphics,
    sx: number, sy: number, b: Bldg
  ) {
    const H = b.floors * FH
    const topCol   = b.available ? lk(b.color, 0.8) : 0x5a6870
    const rightCol = dk(topCol, 0.58)
    const leftCol  = dk(topCol, 0.42)

    // Draw main cube
    cube(g, sx, sy, H, topCol, rightCol, leftCol)

    // Accent stripe on top edge
    if (b.available) {
      g.lineStyle(2.5, b.color, 0.9)
      g.beginPath()
      g.moveTo(sx - HW, sy - H)
      g.lineTo(sx, sy - HH - H)
      g.lineTo(sx + HW, sy - H)
      g.strokePath()
    }

    // Entry door on front-right face
    const doorX = sx + HW * 0.5
    const doorY = sy + HH * 0.5 - H * 0.5
    g.fillStyle(b.available ? b.color : 0x333344, 0.7)
    g.fillRect(doorX - 5, doorY - 10, 10, 12)

    if (!b.available) {
      g.fillStyle(0x000000, 0.32)
      // shade all faces
      g.fillPoints(fp([{ x: sx + HW, y: sy - H }, { x: sx, y: sy + HH - H }, { x: sx, y: sy + HH }, { x: sx + HW, y: sy }]), true)
      g.fillPoints(fp([{ x: sx - HW, y: sy - H }, { x: sx, y: sy + HH - H }, { x: sx, y: sy + HH }, { x: sx - HW, y: sy }]), true)
      g.fillPoints(fp([{ x: sx, y: sy - HH - H }, { x: sx + HW, y: sy - H }, { x: sx, y: sy + HH - H }, { x: sx - HW, y: sy - H }]), true)
    }

    // Label + open badge (Text objects – drawn on top of everything in scene)
    const depth = (b.col + b.row) * 4 + 3
    if (b.available) {
      const badge = this.add.text(sx, sy - HH - H - 16, '● OPEN', {
        fontSize: '8px',
        color: `#${b.color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
        backgroundColor: '#ffffffcc',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(depth + 0.2)
      this.tweens.add({ targets: badge, alpha: { from: 1, to: 0.3 }, duration: 1400, yoyo: true, repeat: -1 })
    }
    this.add.text(sx, sy - HH - H - 2, b.name, {
      fontSize: '9px',
      color: b.available ? '#ffffff' : '#ffffff88',
      fontStyle: 'bold',
      backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(depth + 0.1)

    // Trees flanking entrance
    isoTree(gd, sx + HW * 0.6, sy + HH * 0.3)
    isoTree(gd, sx - HW * 0.7, sy + HH * 0.3)
  }

  // ── Neighbourhood labels ──────────────────────────────────────────────────
  private addNeighbourhoodLabels() {
    const labels = [
      { text: 'DOWNTOWN',      col:  8, row: 12 },
      { text: 'BALBOA PARK',   col:  8, row:  2 },
      { text: 'PACIFIC BEACH', col:  1, row:  7 },
      { text: 'HILLCREST',     col:  8, row:  7 },
      { text: 'LA JOLLA',      col: 12, row:  1 },
      { text: 'UTC',           col: 16, row:  7 },
      { text: 'NORTH PARK',    col: 16, row: 12 },
    ]
    for (const l of labels) {
      const { sx, sy } = ts(l.col, l.row)
      this.add.text(sx, sy - HH * 0.5, l.text, {
        fontSize: '10px', color: '#ffffff33', fontStyle: 'bold', letterSpacing: 3,
      }).setOrigin(0.5).setDepth((l.col + l.row) * 4 + 0.5)
    }
  }

  // ── Player ────────────────────────────────────────────────────────────────
  private createPlayer() {
    this.playerGfx = this.add.graphics()
    this.drawPlayerSprite()

    const nameLabel = this.add.text(0, -46, this.displayName, {
      fontSize: '9px', color: '#ffffffee', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1)

    // Spawn at road near bank
    const spawnTile = ts(7, 10)
    this.playerSx = spawnTile.sx
    this.playerSy = spawnTile.sy

    this.playerContainer = this.add.container(this.playerSx, this.playerSy, [this.playerGfx, nameLabel])
    this.playerContainer.setDepth(999)
  }

  private drawPlayerSprite() {
    const g = this.playerGfx
    g.clear()
    // Shadow
    g.fillStyle(0x000000, 0.2)
    g.fillEllipse(this.facingRight ? 3 : -3, 14, 22, 8)
    // Legs
    g.fillStyle(0x1a2460)
    g.fillRoundedRect(-8, 2, 6, 12, 2)
    g.fillRoundedRect(2, 2, 6, 12, 2)
    // Body
    g.fillStyle(0x4f46e5)
    g.fillRoundedRect(-9, -12, 18, 15, 3)
    // Arms
    g.fillStyle(0x4f46e5, 0.85)
    g.fillRoundedRect(this.facingRight ? -15 : 9, -11, 5, 11, 2)
    g.fillRoundedRect(this.facingRight ? 10 : -14, -11, 5, 11, 2)
    // Head
    g.fillStyle(0xfbbf24)
    g.fillCircle(0, -24, 10)
    // Hair
    g.fillStyle(0x92400e)
    g.fillEllipse(0, -31, 16, 8)
    // Eyes
    g.fillStyle(0x1f2937)
    if (this.facingRight) {
      g.fillCircle(4, -25, 2)
    } else {
      g.fillCircle(-4, -25, 2)
    }
    // Isometric highlight
    g.lineStyle(1, 0xffffff, 0.12)
    g.strokeRoundedRect(-9, -12, 18, 15, 3)
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  private setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.setZoom(0.85)
    this.cameras.main.startFollow(this.playerContainer, true, 0.08, 0.08)
  }

  // ── Keys ──────────────────────────────────────────────────────────────────
  private setupKeys() {
    const kb = this.input.keyboard!
    this.keys = {
      w:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      e:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }
    this.keys.e.on('down', () => {
      if (this.nearBuilding?.available) this.enterBuilding(this.nearBuilding)
    })
  }

  // ── Prompt ────────────────────────────────────────────────────────────────
  private createPrompt() {
    this.promptText = this.add.text(
      this.cameras.main.width / 2, this.cameras.main.height - 50, '',
      { fontSize: '13px', color: '#1a1a3e', backgroundColor: '#ffffffee', padding: { x: 14, y: 8 } }
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9999).setAlpha(0)

    this.scale.on('resize', () => {
      this.promptText?.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 50)
    })
  }

  private enterBuilding(b: Bldg) {
    this.cameras.main.flash(280, 255, 255, 255, false)
    this.time.delayedCall(300, () => {
      window.dispatchEvent(new CustomEvent('realm:enter-building', { detail: { href: b.href, id: b.id } }))
    })
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(_time: number, delta: number) {
    const dt = delta / 1000
    const { w, s, a, d, up, down, left, right } = this.keys

    let vx = 0, vy = 0

    // GTA-style: W/S = screen up/down, A/D = screen left/right
    // In isometric: this maps to NW/SE and SW/NE world directions naturally
    if (w.isDown  || up.isDown)    vy -= SPEED
    if (s.isDown  || down.isDown)  vy += SPEED
    if (a.isDown  || left.isDown)  vx -= SPEED
    if (d.isDown  || right.isDown) vx += SPEED

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    const isMoving = vx !== 0 || vy !== 0

    if (isMoving) {
      if (vx > 0) this.facingRight = true
      else if (vx < 0) this.facingRight = false

      const dx = vx * dt, dy = vy * dt
      const nx = this.playerSx + dx
      const ny = this.playerSy + dy

      // Slide collision: try X then Y independently
      if (canOccupy(nx, this.playerSy)) this.playerSx = nx
      if (canOccupy(this.playerSx, ny)) this.playerSy = ny

      this.playerContainer.x = this.playerSx
      this.playerContainer.y = this.playerSy

      // Walk animation
      this.walkTick++
      const swing = Math.sin(this.walkTick * 0.25) * 8
      this.playerGfx.rotation = swing * 0.012
      if (this.walkTick % 6 === 0) this.drawPlayerSprite()
    } else {
      if (this.walkTick !== 0) {
        this.walkTick = 0
        this.playerGfx.rotation = 0
        this.drawPlayerSprite()
      }
    }

    // Update player depth for painter's algo
    const { col, row } = st(this.playerSx, this.playerSy)
    this.playerContainer.setDepth((col + row) * 4 + 2.5)

    // Building proximity
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
        this.promptText.setText(`🔒  ${closest.name} — Coming Soon`)
        this.tweens.add({ targets: this.promptText, alpha: 0.45, duration: 180 })
      } else {
        this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200 })
      }
    }

    // Emit position for MapHUD
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
