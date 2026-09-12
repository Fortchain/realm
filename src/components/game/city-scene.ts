import Phaser from "phaser"

// ── World ────────────────────────────────────────────────────────────────────
const WORLD_SIZE  = 4800
const COLS        = 12
const ROWS        = 12
const CELL        = 400
const ROAD_W      = 80
const SIDEWALK    = 11
const BLOCK       = CELL - ROAD_W          // 320 — non-road area per cell
const BLK_MARGIN  = 6                      // setback from cell edge to block edge
const BLK_W       = BLOCK - BLK_MARGIN * 2 // 308 — usable block footprint
const BLK_H       = BLOCK - BLK_MARGIN * 2

// ── 3-D depth illusion ───────────────────────────────────────────────────────
const WALL_S  = 12    // south wall height (depth)
const WALL_E  = 7     // east wall width
const SHAD_O  = 5     // drop-shadow offset

// ── Player ───────────────────────────────────────────────────────────────────
const PLAYER_SPEED = 190
const PLAYER_R     = 13
const ENTER_RADIUS = 72

// ── Grid ─────────────────────────────────────────────────────────────────────
type Cell = 'water' | 'beach' | 'park' | 'plaza' | 'res' | 'com' | 'dt'

const GRID: Cell[][] = [
//  0        1       2       3       4       5       6       7       8       9       10      11
  ['water', 'water','water','beach','beach','res',  'res',  'res',  'res',  'res',  'res',  'res'],
  ['water', 'water','beach','beach','res',  'res',  'park', 'park', 'res',  'res',  'res',  'res'],
  ['water', 'beach','beach','res',  'res',  'park', 'park', 'park', 'res',  'res',  'res',  'res'],
  ['water', 'beach','res',  'res',  'park', 'park', 'park', 'res',  'res',  'com',  'com',  'res'],
  ['beach', 'beach','res',  'res',  'res',  'res',  'res',  'com',  'com',  'com',  'com',  'res'],
  ['beach', 'beach','com',  'com',  'res',  'res',  'com',  'com',  'com',  'com',  'res',  'res'],
  ['beach', 'beach','com',  'com',  'com',  'dt',   'dt',   'dt',   'com',  'com',  'res',  'res'],
  ['water', 'beach','com',  'com',  'dt',   'dt',   'dt',   'dt',   'com',  'com',  'res',  'res'],
  ['water', 'water','plaza','com',  'dt',   'dt',   'dt',   'com',  'com',  'res',  'res',  'res'],
  ['water', 'water','water','plaza','com',  'com',  'com',  'com',  'res',  'res',  'res',  'res'],
  ['water', 'water','water','water','water','plaza', 'com',  'res',  'res',  'res',  'res',  'res'],
  ['water', 'water','water','water','water','water', 'water','water','water','water','water','water'],
]

// ── Named buildings ──────────────────────────────────────────────────────────
interface BuildingDef {
  id: string; name: string; col: number; row: number
  color: number; available: boolean; href: string; neighborhood: string
  style: 'bank' | 'library' | 'standard' | 'dt'
}

const BUILDINGS: BuildingDef[] = [
  { id: 'bank',       name: 'First Realm Bank',  col: 5,  row: 7, color: 0x10b981, available: true,  href: '/buildings/bank',       style: 'bank',    neighborhood: 'Downtown'      },
  { id: 'library',    name: 'City Library',       col: 7,  row: 3, color: 0x3b82f6, available: true,  href: '/buildings/library',    style: 'library', neighborhood: 'Balboa Park'   },
  { id: 'government', name: 'City Hall',          col: 4,  row: 7, color: 0x64748b, available: false, href: '/buildings/government', style: 'dt',      neighborhood: 'Downtown'      },
  { id: 'office',     name: 'Office Tower',       col: 6,  row: 8, color: 0x0891b2, available: false, href: '/buildings/office',     style: 'dt',      neighborhood: 'Downtown'      },
  { id: 'hospital',   name: 'Realm Medical',      col: 4,  row: 6, color: 0xef4444, available: false, href: '/buildings/hospital',   style: 'standard',neighborhood: 'Hillcrest'     },
  { id: 'university', name: 'Realm University',   col: 8,  row: 1, color: 0x8b5cf6, available: false, href: '/buildings/university', style: 'standard',neighborhood: 'La Jolla'      },
  { id: 'mall',       name: 'The Mall',           col: 10, row: 3, color: 0xec4899, available: false, href: '/buildings/mall',       style: 'standard',neighborhood: 'UTC'           },
  { id: 'gym',        name: 'Iron District Gym',  col: 2,  row: 5, color: 0xf97316, available: false, href: '/buildings/gym',        style: 'standard',neighborhood: 'Pacific Beach' },
  { id: 'home',       name: 'Your Home',          col: 10, row: 0, color: 0xf59e0b, available: false, href: '/buildings/home',       style: 'standard',neighborhood: 'Carmel Valley' },
]
const BUILDING_MAP = new Map(BUILDINGS.map((b) => [`${b.col},${b.row}`, b]))

// ── Seeded RNG ───────────────────────────────────────────────────────────────
function lcg(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000 }
}

// ── Color utils ──────────────────────────────────────────────────────────────
function darken(hex: number, f: number): number {
  return (Math.floor(((hex >> 16) & 0xff) * f) << 16) |
         (Math.floor(((hex >>  8) & 0xff) * f) <<  8) |
          Math.floor( (hex        & 0xff) * f)
}
function lighten(hex: number, f: number): number {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xff) * f))
  const g = Math.min(255, Math.floor(((hex >>  8) & 0xff) * f))
  const b = Math.min(255, Math.floor( (hex        & 0xff) * f))
  return (r << 16) | (g << 8) | b
}

// ── Block subdivision ─────────────────────────────────────────────────────────
interface Parcel { x: number; y: number; w: number; h: number }

function subdivide(
  x: number, y: number, w: number, h: number,
  minSize: number, gap: number, depth: number, rng: () => number
): Parcel[] {
  const canH = w >= minSize * 2 + gap
  const canV = h >= minSize * 2 + gap
  if (depth <= 0 || (!canH && !canV)) return [{ x, y, w, h }]

  const preferH = canH && (!canV || w > h * 1.25 || rng() > 0.45)
  if (preferH) {
    const min = minSize, max = w - minSize - gap
    const split = min + Math.floor(rng() * Math.max(1, max - min))
    return [
      ...subdivide(x,            y, split,         h, minSize, gap, depth - 1, rng),
      ...subdivide(x+split+gap,  y, w-split-gap,   h, minSize, gap, depth - 1, rng),
    ]
  } else {
    const min = minSize, max = h - minSize - gap
    const split = min + Math.floor(rng() * Math.max(1, max - min))
    return [
      ...subdivide(x, y,           w, split,       minSize, gap, depth - 1, rng),
      ...subdivide(x, y+split+gap, w, h-split-gap, minSize, gap, depth - 1, rng),
    ]
  }
}

// ── Roof colour palettes ─────────────────────────────────────────────────────
const RES_ROOFS = [0xc4b494, 0xd2c0a0, 0xb8a880, 0xcec0a4, 0xbcac90, 0xd4c4a8, 0xc0ae8c]
const COM_ROOFS = [0x8898a8, 0x98a8b8, 0x7888a0, 0x8090a4, 0x9098b0, 0x7890a8, 0x8898b0]
const DT_ROOFS  = [0x507090, 0x4a6880, 0x3a5870, 0x405d78, 0x486888, 0x3e5a72, 0x4a6070]

// ── Palettes per type ────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { depth: number; minSize: number; gap: number; roofs: number[] }> = {
  res: { depth: 2, minSize: 52, gap: 8,  roofs: RES_ROOFS },
  com: { depth: 2, minSize: 70, gap: 10, roofs: COM_ROOFS },
  dt:  { depth: 1, minSize: 90, gap: 14, roofs: DT_ROOFS  },
}

// ── Tree palette ─────────────────────────────────────────────────────────────
const TREE_DARK  = 0x1a4e1a
const TREE_MID   = 0x2a6a2a
const TREE_LIGHT = 0x3a8a3a
const BUSH_COL   = 0x2a5e28

// ═════════════════════════════════════════════════════════════════════════════
export class CityScene extends Phaser.Scene {
  private player!:      Phaser.GameObjects.Container
  private playerBody!:  Phaser.Physics.Arcade.Body
  private legL!:        Phaser.GameObjects.Graphics
  private legR!:        Phaser.GameObjects.Graphics
  private bodyGfx!:     Phaser.GameObjects.Graphics
  private walls!:       Phaser.Physics.Arcade.StaticGroup
  private keys!: {
    up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key
    w: Phaser.Input.Keyboard.Key;  s: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key;  d: Phaser.Input.Keyboard.Key
    e: Phaser.Input.Keyboard.Key
  }
  private nearBuilding:  BuildingDef | null = null
  private promptText!:   Phaser.GameObjects.Text
  private displayName  = 'You'
  private walkTick     = 0
  private facingDir: 'n' | 's' | 'e' | 'w' = 's'
  private lastPosEmit  = 0
  private teleportHandler!: EventListener

  constructor() { super({ key: 'CityScene' }) }
  init(data: { displayName?: string }) { this.displayName = data.displayName ?? 'You' }

  create() {
    this.walls = this.physics.add.staticGroup()

    this.drawGround()
    this.drawWater()
    this.drawBeach()
    this.drawParks()
    this.drawPlazas()
    this.drawRoads()
    this.drawStreetTrees()
    this.drawCityBlocks()
    this.drawLabels()
    this.setupPhysics()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()

    this.scale.on('resize', () => {
      this.promptText?.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 50)
    })

    this.teleportHandler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      this.player.x = x
      this.player.y = y
      this.cameras.main.flash(200, 0, 0, 0, false)
    }
    window.addEventListener('realm:teleport', this.teleportHandler)
  }

  // ── Ground fill ─────────────────────────────────────────────────────────────
  private drawGround() {
    const g = this.add.graphics().setDepth(0)
    const BASE: Partial<Record<Cell, number>> = {
      res: 0xcec4b4, com: 0xb8c0c8, dt: 0xaab4c0,
    }
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const c = BASE[GRID[row][col]]
        if (c) { g.fillStyle(c); g.fillRect(col * CELL, row * CELL, CELL, CELL) }
      }
    }
  }

  // ── Water ───────────────────────────────────────────────────────────────────
  private drawWater() {
    const g = this.add.graphics().setDepth(1)
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'water') continue
        const x = col * CELL, y = row * CELL
        g.fillStyle(0x1565a0); g.fillRect(x, y, CELL, CELL)
        for (let wy = y; wy < y + CELL; wy += 18) {
          g.fillStyle(0x3a8fd4, 0.1); g.fillRect(x, wy, CELL, 8)
        }
      }
    const shimmer = this.add.graphics().setDepth(2)
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'water') continue
        const x = col * CELL, y = row * CELL
        shimmer.fillStyle(0x5ab8e4, 0.15)
        for (let i = 0; i < 5; i++) shimmer.fillEllipse(x + 30 + i * 70, y + 20 + (i % 3) * 50, 46, 9)
      }
    this.tweens.add({ targets: shimmer, alpha: { from: 0.35, to: 1 }, duration: 2600, yoyo: true, repeat: -1 })
  }

  // ── Beach ───────────────────────────────────────────────────────────────────
  private drawBeach() {
    const g = this.add.graphics().setDepth(2)
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'beach') continue
        const x = col * CELL, y = row * CELL
        g.fillStyle(0xf0dd90); g.fillRect(x, y, CELL, CELL)
        // Wet sand strip toward water
        if (col > 0 && GRID[row][col - 1] === 'water') {
          g.fillStyle(0xd4c068, 0.55); g.fillRect(x, y, 48, CELL)
          g.lineStyle(2, 0xffffff, 0.45)
          for (let wy = y + 8; wy < y + CELL - 10; wy += 22)
            g.lineBetween(x + 4, wy, x + 40, wy + 5)
        }
        if (row > 0 && GRID[row - 1][col] === 'water') {
          g.fillStyle(0xd4c068, 0.55); g.fillRect(x, y, CELL, 48)
          g.lineStyle(2, 0xffffff, 0.45)
          for (let wx = x + 8; wx < x + CELL - 10; wx += 22)
            g.lineBetween(wx, y + 4, wx + 5, y + 40)
        }
        // Texture
        g.fillStyle(0xc8b050, 0.18)
        for (let i = 0; i < 10; i++)
          g.fillCircle(x + ((col * 71 + i * 37) % (CELL - 20)) + 10, y + ((row * 53 + i * 61) % (CELL - 20)) + 10, 2)
      }
  }

  // ── Parks ───────────────────────────────────────────────────────────────────
  private drawParks() {
    const g = this.add.graphics().setDepth(2)
    const gt = this.add.graphics().setDepth(9)

    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'park') continue
        const x = col * CELL, y = row * CELL
        // Grass
        g.fillStyle(0x2d7a2d); g.fillRect(x, y, CELL, CELL)
        g.fillStyle(0x3a9a3a, 0.3)
        for (let i = 0; i < 4; i++)
          g.fillEllipse(x + 40 + i * 60, y + 40 + (i % 2) * 60, 80, 50)

        // Dirt paths
        g.lineStyle(10, 0xb0983c, 0.6)
        g.lineBetween(x, y + BLOCK / 2, x + BLOCK, y + BLOCK / 2)
        g.lineBetween(x + BLOCK / 2, y, x + BLOCK / 2, y + BLOCK)

        // Trees scattered through park
        const rng = lcg(col * 41 + row * 23 + 7)
        const treePositions = Array.from({ length: 9 }, () => ({
          tx: x + 20 + Math.floor(rng() * (BLOCK - 40)),
          ty: y + 20 + Math.floor(rng() * (BLOCK - 40)),
        }))
        for (const { tx, ty } of treePositions) this.drawTree(gt, tx, ty, 14)
      }
  }

  // ── Plazas ──────────────────────────────────────────────────────────────────
  private drawPlazas() {
    const g = this.add.graphics().setDepth(2)
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'plaza') continue
        const x = col * CELL, y = row * CELL
        g.fillStyle(0x787888); g.fillRect(x, y, CELL, CELL)
        g.lineStyle(1, 0x8a8a9e, 0.4)
        for (let px = x + 40; px < x + BLOCK; px += 40) g.lineBetween(px, y, px, y + BLOCK)
        for (let py = y + 40; py < y + BLOCK; py += 40) g.lineBetween(x, py, x + BLOCK, py)
        g.fillStyle(0x1565a0, 0.65); g.fillCircle(x + BLOCK / 2, y + BLOCK / 2, 28)
        g.lineStyle(2, 0x5ab8e4, 0.7); g.strokeCircle(x + BLOCK / 2, y + BLOCK / 2, 28)
        g.fillStyle(0xffffff, 0.3); g.fillCircle(x + BLOCK / 2, y + BLOCK / 2, 10)
      }
  }

  // ── Roads ───────────────────────────────────────────────────────────────────
  private drawRoads() {
    const g  = this.add.graphics().setDepth(3)
    const gi = this.add.graphics().setDepth(4)

    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] === 'water') continue
        const x = col * CELL, y = row * CELL

        // Vertical road (right edge of cell)
        if (col < COLS - 1 && GRID[row][col + 1] !== 'water') {
          const rx = x + BLOCK
          g.fillStyle(0x212130); g.fillRect(rx, y, ROAD_W, CELL)
          g.fillStyle(0x2c2c40); g.fillRect(rx, y, SIDEWALK, CELL)
          g.fillStyle(0x2c2c40); g.fillRect(rx + ROAD_W - SIDEWALK, y, SIDEWALK, CELL)
          g.lineStyle(1, 0x3a3a52, 0.8)
          g.lineBetween(rx + SIDEWALK, y, rx + SIDEWALK, y + CELL)
          g.lineBetween(rx + ROAD_W - SIDEWALK, y, rx + ROAD_W - SIDEWALK, y + CELL)
          // Lane dash
          const cx2 = rx + ROAD_W / 2
          g.lineStyle(1.5, 0xffffff, 0.18)
          for (let dy = y + 10; dy < y + CELL - 10; dy += 28) g.lineBetween(cx2, dy, cx2, dy + 14)
        }

        // Horizontal road (bottom edge of cell)
        if (row < ROWS - 1 && GRID[row + 1][col] !== 'water') {
          const ry = y + BLOCK
          g.fillStyle(0x212130); g.fillRect(x, ry, CELL, ROAD_W)
          g.fillStyle(0x2c2c40); g.fillRect(x, ry, CELL, SIDEWALK)
          g.fillStyle(0x2c2c40); g.fillRect(x, ry + ROAD_W - SIDEWALK, CELL, SIDEWALK)
          g.lineStyle(1, 0x3a3a52, 0.8)
          g.lineBetween(x, ry + SIDEWALK, x + CELL, ry + SIDEWALK)
          g.lineBetween(x, ry + ROAD_W - SIDEWALK, x + CELL, ry + ROAD_W - SIDEWALK)
          const cy2 = ry + ROAD_W / 2
          g.lineStyle(1.5, 0xffffff, 0.18)
          for (let dx = x + 10; dx < x + CELL - 10; dx += 28) g.lineBetween(dx, cy2, dx + 14, cy2)
        }
      }

    // Intersections + crosswalks
    for (let row = 0; row < ROWS - 1; row++)
      for (let col = 0; col < COLS - 1; col++) {
        const cells = [GRID[row][col], GRID[row][col+1], GRID[row+1][col], GRID[row+1][col+1]]
        if (cells.some((c) => c === 'water')) continue
        const ix = col * CELL + BLOCK, iy = row * CELL + BLOCK
        gi.fillStyle(0x212130); gi.fillRect(ix, iy, ROAD_W, ROAD_W)
        // Crosswalk stripes
        gi.fillStyle(0x484860, 0.5)
        for (let s = 0; s < 4; s++) {
          gi.fillRect(ix + SIDEWALK + s * 13, iy, 8, 10)
          gi.fillRect(ix + SIDEWALK + s * 13, iy + ROAD_W - 10, 8, 10)
          gi.fillRect(ix, iy + SIDEWALK + s * 13, 10, 8)
          gi.fillRect(ix + ROAD_W - 10, iy + SIDEWALK + s * 13, 10, 8)
        }
      }
  }

  // ── Street trees ─────────────────────────────────────────────────────────────
  private drawStreetTrees() {
    const g = this.add.graphics().setDepth(11)

    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] === 'water' || GRID[row][col] === 'beach') continue
        const x = col * CELL, y = row * CELL
        const seed = col * 31 + row * 19

        // Trees along right sidewalk
        if (col < COLS - 1 && GRID[row][col + 1] !== 'water') {
          const tx = x + BLOCK + SIDEWALK / 2 + 1
          for (let i = 0; i < 4; i++) {
            if ((seed + i) % 3 === 0) continue   // occasional gap
            const ty = y + 30 + i * 72
            if (ty > y + BLOCK - 20) continue
            this.drawTree(g, tx, ty, 8)
          }
        }

        // Trees along bottom sidewalk
        if (row < ROWS - 1 && GRID[row + 1][col] !== 'water') {
          const ty = y + BLOCK + SIDEWALK / 2 + 1
          for (let i = 0; i < 4; i++) {
            if ((seed * 3 + i) % 3 === 0) continue
            const tx = x + 30 + i * 72
            if (tx > x + BLOCK - 20) continue
            this.drawTree(g, tx, ty, 8)
          }
        }
      }
  }

  // ── Tree helper ──────────────────────────────────────────────────────────────
  private drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 3, y + 4, r * 2.2, r * 1.4)
    g.fillStyle(TREE_DARK);     g.fillCircle(x, y, r)
    g.fillStyle(TREE_MID, 0.7); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.55)
    g.fillStyle(TREE_LIGHT, 0.4); g.fillCircle(x - r * 0.4, y - r * 0.4, r * 0.3)
  }

  // ── Bush helper ──────────────────────────────────────────────────────────────
  private drawBush(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(x + 2, y + 3, 14, 8)
    g.fillStyle(BUSH_COL); g.fillCircle(x, y, 5)
    g.fillStyle(0x3a7230); g.fillCircle(x - 3, y - 2, 3)
    g.fillStyle(0x4a8240, 0.5); g.fillCircle(x + 2, y - 3, 2)
  }

  // ── 3-D building primitive ───────────────────────────────────────────────────
  private draw3D(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    roofColor: number, wallS = WALL_S, wallE = WALL_E
  ) {
    // Drop shadow
    g.fillStyle(0x000000, 0.2)
    g.fillRect(x + SHAD_O, y + SHAD_O, w + wallE, h + wallS)
    // East wall
    g.fillStyle(darken(roofColor, 0.52))
    g.fillRect(x + w, y, wallE, h + wallS)
    // South wall
    g.fillStyle(darken(roofColor, 0.44))
    g.fillRect(x, y + h, w, wallS)
    // Roof
    g.fillStyle(roofColor)
    g.fillRect(x, y, w, h)
  }

  // ── Window grid on roof ──────────────────────────────────────────────────────
  private drawWindowGrid(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    winColor: number, cols2: number, rows2: number
  ) {
    const ww = Math.floor((w - 14) / cols2) - 2
    const wh = Math.floor((h - 14) / rows2) - 2
    const padX = Math.floor((w - (ww + 2) * cols2 + 2) / 2)
    const padY = Math.floor((h - (wh + 2) * rows2 + 2) / 2)
    for (let r = 0; r < rows2; r++)
      for (let c = 0; c < cols2; c++) {
        g.fillStyle(winColor, 0.55)
        g.fillRect(x + padX + c * (ww + 2), y + padY + r * (wh + 2), ww, wh)
      }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY BLOCKS
  // ═══════════════════════════════════════════════════════════════════════════

  private drawCityBlocks() {
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        const type = GRID[row][col]
        if (type !== 'res' && type !== 'com' && type !== 'dt') continue

        const named = BUILDING_MAP.get(`${col},${row}`)
        if (named) this.drawNamedBlock(named)
        else        this.drawGenericBlock(col, row, type)
      }
  }

  // ── Generic block: subdivide + fill with varied buildings ──────────────────
  private drawGenericBlock(col: number, row: number, type: Cell) {
    const ox = col * CELL + BLK_MARGIN
    const oy = row * CELL + BLK_MARGIN
    const cfg = TYPE_CFG[type]!
    const rng = lcg(col * 37 + row * 19)

    // Use the entire block area minus gap to vegetation border
    const parcels = subdivide(ox + 2, oy + 2, BLK_W - 4, BLK_H - 4, cfg.minSize, cfg.gap, cfg.depth, rng)

    const g  = this.add.graphics().setDepth(8)
    const gv = this.add.graphics().setDepth(9)
    const gt = this.add.graphics().setDepth(11)

    const wallS = type === 'dt' ? 18 : type === 'com' ? 14 : 10
    const wallE = type === 'dt' ? 10 : type === 'com' ? 8  : 6

    for (let i = 0; i < parcels.length; i++) {
      const { x, y, w, h } = parcels[i]
      // Inset slightly to show a gap between buildings
      const inset = 3 + (i % 2) * 2
      const bx = x + inset, by = y + inset
      const bw = w - inset * 2, bh = h - inset * 2

      const roofIdx = (i + Math.floor(rng() * cfg.roofs.length)) % cfg.roofs.length
      const roofCol = cfg.roofs[roofIdx]

      this.draw3D(g, bx, by, bw, bh, roofCol, wallS, wallE)

      // Window grid on roof
      const winCol = lighten(roofCol, 1.35)
      if (type === 'dt') {
        // Glass curtain wall grid
        g.lineStyle(1, darken(roofCol, 0.6), 0.5)
        for (let lx = bx + 12; lx < bx + bw; lx += 12) g.lineBetween(lx, by, lx, by + bh)
        for (let ly = by + 12; ly < by + bh; ly += 12) g.lineBetween(bx, ly, bx + bw, ly)
        // Glass sheen
        g.fillStyle(lighten(roofCol, 1.5), 0.12)
        g.fillRect(bx, by, bw / 2, bh)
      } else if (type === 'com') {
        const nc = Math.max(2, Math.floor(bw / 30))
        const nr = Math.max(2, Math.floor(bh / 30))
        this.drawWindowGrid(g, bx, by, bw, bh, winCol, nc, nr)
      } else {
        const nc = Math.max(2, Math.floor(bw / 36))
        const nr = Math.max(2, Math.floor(bh / 36))
        this.drawWindowGrid(g, bx, by, bw, bh, winCol, nc, nr)
        // Peaked roof line hint
        g.lineStyle(1, darken(roofCol, 0.75), 0.4)
        g.lineBetween(bx, by, bx + bw / 2, by - 5)
        g.lineBetween(bx + bw / 2, by - 5, bx + bw, by)
      }

      // Bushes between parcels and near south wall
      if (rng() > 0.55) {
        this.drawBush(gv, bx + 5, by + bh + wallS + 4)
        this.drawBush(gv, bx + bw - 10, by + bh + wallS + 4)
      }
    }

    // Scatter a couple of trees within the block's open space
    const treeSeed = lcg(col * 71 + row * 43)
    const treePts = [
      [ox + 10, oy + 10], [ox + BLK_W - 15, oy + 10],
      [ox + 10, oy + BLK_H - 15], [ox + BLK_W - 15, oy + BLK_H - 15],
    ] as const
    for (const [tx, ty] of treePts) {
      if (treeSeed() > 0.52) this.drawTree(gt, tx, ty, 9)
    }
  }

  // ── Named building blocks ────────────────────────────────────────────────────
  private drawNamedBlock(b: BuildingDef) {
    if (b.style === 'bank')    this.drawBankBlock(b)
    else if (b.style === 'library') this.drawLibraryBlock(b)
    else if (b.style === 'dt') this.drawDTBlock(b)
    else                       this.drawStandardBlock(b)
  }

  // ── LIBRARY ──────────────────────────────────────────────────────────────────
  private drawLibraryBlock(b: BuildingDef) {
    const ox = b.col * CELL + BLK_MARGIN
    const oy = b.row * CELL + BLK_MARGIN
    const g  = this.add.graphics().setDepth(10)
    const gt = this.add.graphics().setDepth(12)

    // Ground: stone plaza in front
    g.fillStyle(0xb8b0a0)
    g.fillRect(ox, oy, BLK_W, BLK_H)

    // Entry plaza (south)
    g.fillStyle(0xc8c0b0)
    g.fillRect(ox + 20, oy + BLK_H - 70, BLK_W - 40, 60)
    // Plaza paving lines
    g.lineStyle(1, 0xb0a898, 0.5)
    for (let lx = ox + 30; lx < ox + BLK_W - 30; lx += 20) g.lineBetween(lx, oy + BLK_H - 70, lx, oy + BLK_H - 10)
    for (let ly = oy + BLK_H - 60; ly < oy + BLK_H - 10; ly += 15) g.lineBetween(ox + 20, ly, ox + BLK_W - 20, ly)

    // Steps (4 steps from plaza up to building)
    for (let s = 0; s < 4; s++) {
      g.fillStyle(darken(0xd4ccc0, 0.9 - s * 0.04))
      g.fillRect(ox + 35 + s * 5, oy + BLK_H - 74 - s * 4, BLK_W - 70 - s * 10, 4)
    }

    // ── Main building body ────
    const bx = ox + 18, by = oy + 10, bw = BLK_W - 36, bh = BLK_H - 85
    const roofCol = 0xd8d2c8   // warm cream marble

    // Shadow
    g.fillStyle(0x000000, 0.22)
    g.fillRect(bx + SHAD_O, by + SHAD_O, bw + WALL_E, bh + 16)

    // East wall
    g.fillStyle(darken(roofCol, 0.5))
    g.fillRect(bx + bw, by, WALL_E, bh + 16)

    // South wall — shows columned facade
    const southWall = darken(roofCol, 0.58)
    g.fillStyle(southWall)
    g.fillRect(bx, by + bh, bw, 16)
    // Column cuts in south wall
    g.fillStyle(darken(roofCol, 0.7), 0.6)
    for (let i = 0; i < 9; i++) g.fillRect(bx + 12 + i * 30, by + bh, 4, 16)

    // Roof — marble with detailed surface
    g.fillStyle(roofCol)
    g.fillRect(bx, by, bw, bh)

    // Parapet edge (darker border)
    g.lineStyle(2.5, darken(roofCol, 0.7))
    g.strokeRect(bx, by, bw, bh)
    g.lineStyle(1, darken(roofCol, 0.75), 0.6)
    g.strokeRect(bx + 5, by + 5, bw - 10, bh - 10)

    // Central skylight grid
    const slX = bx + 30, slY = by + 20, slW = bw - 60, slH = bh - 40
    g.fillStyle(0x6688bb, 0.18)
    g.fillRect(slX, slY, slW, slH)
    g.lineStyle(1.5, 0x7799cc, 0.45)
    g.strokeRect(slX, slY, slW, slH)
    // Skylight panes
    const pW = Math.floor(slW / 5), pH = Math.floor(slH / 4)
    g.lineStyle(0.8, 0x5577aa, 0.3)
    for (let c = 1; c < 5; c++) g.lineBetween(slX + c * pW, slY, slX + c * pW, slY + slH)
    for (let r = 1; r < 4; r++) g.lineBetween(slX, slY + r * pH, slX + slW, slY + r * pH)
    // Skylight glass fill
    g.fillStyle(0x88aadd, 0.12)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 5; c++) {
        if ((r + c) % 2 === 0) g.fillRect(slX + c * pW + 2, slY + r * pH + 2, pW - 4, pH - 4)
      }

    // Column marks along north edge
    g.fillStyle(0xeae4dc)
    for (let i = 0; i < 9; i++) {
      const cx = bx + 14 + i * 30
      g.fillRect(cx, by + 2, 6, bh - 4)
      g.lineStyle(0.5, darken(roofCol, 0.78), 0.4)
      g.strokeRect(cx, by + 2, 6, bh - 4)
    }

    // Pediment above north edge
    g.fillStyle(0x4a6ab8, 0.85)
    g.fillTriangle(bx + bw * 0.1, by, bx + bw / 2, by - 26, bx + bw * 0.9, by)
    g.lineStyle(2, b.color, 0.9)
    g.strokeTriangle(bx + bw * 0.1, by, bx + bw / 2, by - 26, bx + bw * 0.9, by)

    // HVAC units (top-down boxes on roof)
    g.fillStyle(0xc8c0b8)
    g.fillRect(bx + 15, by + 15, 22, 16)
    g.fillRect(bx + bw - 37, by + 15, 22, 16)
    g.lineStyle(1, darken(0xc8c0b8, 0.7), 0.6)
    g.strokeRect(bx + 15, by + 15, 22, 16)
    g.strokeRect(bx + bw - 37, by + 15, 22, 16)

    // Entrance canopy (south)
    g.fillStyle(darken(b.color, 0.6), 0.85)
    g.fillRect(bx + bw / 2 - 28, by + bh - 4, 56, 10)
    g.lineStyle(1, b.color, 0.7)
    g.strokeRect(bx + bw / 2 - 28, by + bh - 4, 56, 10)

    // Landscape: flanking trees + hedges
    this.drawTree(gt, ox + 10, oy + BLK_H - 50, 11)
    this.drawTree(gt, ox + BLK_W - 12, oy + BLK_H - 50, 11)
    this.drawTree(gt, ox + 10, oy + 40, 10)
    this.drawTree(gt, ox + BLK_W - 12, oy + 40, 10)

    // Hedgerow along entry
    const hg = this.add.graphics().setDepth(11)
    for (let hx = ox + 32; hx < ox + BLK_W - 20; hx += 12)
      this.drawBush(hg, hx, oy + BLK_H - 15)

    this.drawBuildingLabel(b, bx + bw / 2, oy + BLK_H - 85)
  }

  // ── BANK ──────────────────────────────────────────────────────────────────────
  private drawBankBlock(b: BuildingDef) {
    const ox = b.col * CELL + BLK_MARGIN
    const oy = b.row * CELL + BLK_MARGIN
    const g  = this.add.graphics().setDepth(10)
    const gt = this.add.graphics().setDepth(12)

    // Courtyard/plaza ground
    g.fillStyle(0xb0b8a8); g.fillRect(ox, oy, BLK_W, BLK_H)
    g.lineStyle(1, 0xa0a898, 0.4)
    for (let lx = ox + 20; lx < ox + BLK_W; lx += 20) g.lineBetween(lx, oy, lx, oy + BLK_H)
    for (let ly = oy + 20; ly < oy + BLK_H; ly += 20) g.lineBetween(ox, ly, ox + BLK_W, ly)

    // Main building
    const bx = ox + 14, by = oy + 14, bw = BLK_W - 28, bh = BLK_H - 60
    const roofCol = 0xe8f4ee

    this.draw3D(g, bx, by, bw, bh, roofCol, 16, 9)

    // Window rows
    const wc = 5, wr = 4
    this.drawWindowGrid(g, bx + 10, by + 14, bw - 20, bh - 30, b.color, wc, wr)

    // Art deco crown along top edge
    g.fillStyle(darken(b.color, 0.45))
    g.fillRect(bx + 20, by, bw - 40, 8)
    g.fillRect(bx + 35, by - 7, bw - 70, 7)
    g.fillRect(bx + 50, by - 12, bw - 100, 5)

    // Columns at south entrance
    g.fillStyle(0xffffff, 0.85)
    for (let i = 0; i < 6; i++) g.fillRect(bx + 16 + i * (bw - 32) / 5 - 3, by + bh - 35, 6, 35)

    // Revolving door
    g.fillStyle(b.color, 0.35)
    g.fillCircle(bx + bw / 2, by + bh - 12, 14)
    g.lineStyle(1.5, b.color, 0.7)
    g.strokeCircle(bx + bw / 2, by + bh - 12, 14)
    g.lineStyle(1.5, b.color, 0.4)
    g.lineBetween(bx + bw / 2 - 14, by + bh - 12, bx + bw / 2 + 14, by + bh - 12)
    g.lineBetween(bx + bw / 2, by + bh - 26, bx + bw / 2, by + bh + 2)

    // Annex building (smaller, to the side)
    const ax = ox, ay = oy + 10, aw = 40, ah = bh - 20
    this.draw3D(g, ax, ay, aw, ah, darken(roofCol, 0.88), 10, 5)

    // Trees + bushes around building
    this.drawTree(gt, ox + 6, oy + BLK_H - 30, 10)
    this.drawTree(gt, ox + BLK_W - 8, oy + BLK_H - 30, 10)

    this.drawBuildingLabel(b, bx + bw / 2, oy + BLK_H - 50)
  }

  // ── DOWNTOWN TOWER ─────────────────────────────────────────────────────────
  private drawDTBlock(b: BuildingDef) {
    const ox = b.col * CELL + BLK_MARGIN
    const oy = b.row * CELL + BLK_MARGIN
    const g  = this.add.graphics().setDepth(10)
    const gt = this.add.graphics().setDepth(12)
    const rng = lcg(b.col * 53 + b.row * 29)

    g.fillStyle(0x9aabb8); g.fillRect(ox, oy, BLK_W, BLK_H)

    // Main tower
    const bx = ox + 10, by = oy + 10, bw = BLK_W - 30, bh = BLK_H - 40
    const roofCol = b.available ? lighten(b.color, 0.7) : 0x506878

    this.draw3D(g, bx, by, bw, bh, roofCol, 20, 12)

    // Glass curtain wall
    g.lineStyle(1, darken(roofCol, 0.62), 0.55)
    for (let lx = bx + 10; lx < bx + bw; lx += 10) g.lineBetween(lx, by, lx, by + bh)
    for (let ly = by + 10; ly < by + bh; ly += 10) g.lineBetween(bx, ly, bx + bw, ly)
    g.fillStyle(lighten(roofCol, 1.5), 0.1)
    g.fillRect(bx, by, bw * 0.45, bh)

    // Podium base
    const px = ox + 4, py = by + bh - 8, pw = BLK_W - 8, php = 24
    this.draw3D(g, px, py, pw, php, darken(roofCol, 0.8), 8, 5)

    // Small setback building
    const sx = bx + bw + 14, sy = oy + 20, sw = BLK_W - bw - 30, sh = bh * 0.6
    if (sw > 30) this.draw3D(g, sx, sy, sw, sh, darken(roofCol, 0.75), 12, 6)

    // Accent stripe
    if (b.available) {
      g.lineStyle(3, b.color, 0.7)
      g.lineBetween(bx, by, bx + bw, by)
    }

    this.drawTree(gt, ox + 5, oy + BLK_H - 22, 9)
    this.drawTree(gt, ox + BLK_W - 7, oy + BLK_H - 22, 9)

    if (!b.available) {
      g.fillStyle(0x000000, 0.28); g.fillRect(bx, by, bw, bh)
      this.add.text(bx + bw / 2, by + bh / 2, '🔒', { fontSize: '24px' }).setOrigin(0.5).setDepth(12).setAlpha(0.5)
    }
    this.drawBuildingLabel(b, bx + bw / 2, oy + BLK_H - 36)
  }

  // ── STANDARD named building ─────────────────────────────────────────────────
  private drawStandardBlock(b: BuildingDef) {
    const ox = b.col * CELL + BLK_MARGIN
    const oy = b.row * CELL + BLK_MARGIN
    const g  = this.add.graphics().setDepth(10)
    const gt = this.add.graphics().setDepth(12)

    g.fillStyle(0xb8bab0); g.fillRect(ox, oy, BLK_W, BLK_H)

    const bx = ox + 12, by = oy + 12, bw = BLK_W - 24, bh = BLK_H - 50
    const roofCol = b.available ? lighten(b.color, 0.6) : 0xe0dcd8

    this.draw3D(g, bx, by, bw, bh, roofCol, 14, 8)

    const nc = Math.max(2, Math.floor(bw / 32))
    const nr = Math.max(2, Math.floor(bh / 32))
    this.drawWindowGrid(g, bx + 10, by + 12, bw - 20, bh - 24, b.color, nc, nr)

    g.fillStyle(b.color, 0.3)
    g.fillRect(bx + bw / 2 - 12, by + bh - 22, 24, 22)
    g.lineStyle(1, b.color, 0.5)
    g.strokeRect(bx + bw / 2 - 12, by + bh - 22, 24, 22)

    // Side annex
    const ax = ox, ay = oy + 25, aw = 30, ah = bh * 0.5
    this.draw3D(g, ax, ay, aw, ah, darken(roofCol, 0.82), 10, 5)

    if (!b.available) {
      g.fillStyle(0x000000, 0.28); g.fillRect(bx, by, bw, bh)
      this.add.text(bx + bw / 2, by + bh / 2, '🔒', { fontSize: '22px' }).setOrigin(0.5).setDepth(12).setAlpha(0.5)
    }

    this.drawTree(gt, ox + 6, oy + BLK_H - 25, 10)
    this.drawTree(gt, ox + BLK_W - 8, oy + BLK_H - 25, 10)
    this.drawTree(gt, ox + 6, oy + 25, 9)

    this.drawBuildingLabel(b, bx + bw / 2, oy + BLK_H - 44)
  }

  // ── Building label ───────────────────────────────────────────────────────────
  private drawBuildingLabel(b: BuildingDef, cx: number, cy: number) {
    if (b.available) {
      const badge = this.add.text(cx, cy - 14, '● OPEN', {
        fontSize: '8px', color: `#${b.color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold', backgroundColor: '#ffffffcc', padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(14)
      this.tweens.add({ targets: badge, alpha: { from: 1, to: 0.3 }, duration: 1400, yoyo: true, repeat: -1 })
    }
    this.add.text(cx, cy, b.name, {
      fontSize: '10px', color: b.available ? '#ffffff' : '#ffffff99',
      fontStyle: 'bold', align: 'center',
      backgroundColor: '#00000099', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0).setDepth(14)
  }

  // ── Neighbourhood labels ────────────────────────────────────────────────────
  private drawLabels() {
    const labels = [
      { text: 'DOWNTOWN',      col: 5,  row: 7  },
      { text: 'BALBOA PARK',   col: 5,  row: 2  },
      { text: 'PACIFIC BEACH', col: 0,  row: 4  },
      { text: 'HILLCREST',     col: 4,  row: 5  },
      { text: 'LA JOLLA',      col: 8,  row: 0  },
      { text: 'UTC',           col: 10, row: 2  },
      { text: 'NORTH PARK',    col: 9,  row: 5  },
    ]
    for (const l of labels)
      this.add.text(
        l.col * CELL + CELL / 2, l.row * CELL + BLOCK / 2,
        l.text,
        { fontSize: '11px', color: '#ffffff44', fontStyle: 'bold', letterSpacing: 3 }
      ).setOrigin(0.5).setDepth(6)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupPhysics() {
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) {
        const type = GRID[row][col]
        if (type === 'water') {
          const body = this.add.rectangle(col * CELL + CELL / 2, row * CELL + CELL / 2, CELL, CELL).setVisible(false)
          this.physics.add.existing(body, true)
          this.walls.add(body)
        } else if (type === 'res' || type === 'com' || type === 'dt') {
          const body = this.add.rectangle(
            col * CELL + BLK_MARGIN + BLK_W / 2,
            row * CELL + BLK_MARGIN + BLK_H / 2,
            BLK_W, BLK_H
          ).setVisible(false)
          this.physics.add.existing(body, true)
          this.walls.add(body)
        }
      }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER
  // ═══════════════════════════════════════════════════════════════════════════

  private createPlayer() {
    this.legL    = this.add.graphics()
    this.legR    = this.add.graphics()
    this.bodyGfx = this.add.graphics()
    this.drawPlayerSprite('s')

    const nameLabel = this.add.text(0, -38, this.displayName, {
      fontSize: '10px', color: '#ffffffee', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1)

    const spawnX = 5 * CELL + CELL / 2
    const spawnY = 7 * CELL + BLOCK + ROAD_W / 2
    this.player = this.add.container(spawnX, spawnY, [this.legL, this.legR, this.bodyGfx, nameLabel])
    this.player.setDepth(20)
    this.physics.world.enable(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setCircle(PLAYER_R, -PLAYER_R, -PLAYER_R)
  }

  private drawPlayerSprite(dir: 'n' | 's' | 'e' | 'w') {
    this.legL.clear(); this.legR.clear(); this.bodyGfx.clear()
    this.legL.fillStyle(0x000000, 0.2); this.legL.fillEllipse(0, 22, 26, 9)
    this.legL.fillStyle(0x1a2460); this.legL.fillRoundedRect(-8, 4, 7, 13, 3)
    this.legR.fillStyle(0x1a2460); this.legR.fillRoundedRect(1, 4, 7, 13, 3)
    this.bodyGfx.fillStyle(0x4f46e5); this.bodyGfx.fillRoundedRect(-9, -10, 18, 15, 4)
    this.bodyGfx.fillStyle(0x4f46e5, 0.85)
    this.bodyGfx.fillRoundedRect(-14, -9, 5, 12, 2)
    this.bodyGfx.fillRoundedRect(9, -9, 5, 12, 2)
    this.bodyGfx.fillStyle(0xfbbf24); this.bodyGfx.fillCircle(0, -22, 10)
    this.bodyGfx.fillStyle(0x92400e); this.bodyGfx.fillEllipse(0, -30, 16, 8)
    this.bodyGfx.fillStyle(0x1f2937)
    if      (dir === 's') { this.bodyGfx.fillCircle(-3, -22, 2); this.bodyGfx.fillCircle(3, -22, 2) }
    else if (dir === 'e') { this.bodyGfx.fillCircle(4, -23, 2) }
    else if (dir === 'w') { this.bodyGfx.fillCircle(-4, -23, 2) }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP & UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.setZoom(0.65)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
  }

  private setupKeys() {
    const kb = this.input.keyboard!
    this.keys = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      e:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    }
    this.keys.e.on('down', () => { if (this.nearBuilding?.available) this.enterBuilding(this.nearBuilding) })
  }

  private createPrompt() {
    this.promptText = this.add.text(
      this.cameras.main.width / 2, this.cameras.main.height - 50, '',
      { fontSize: '13px', color: '#1a1a3e', backgroundColor: '#ffffffee', padding: { x: 14, y: 8 } }
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(30).setAlpha(0)
  }

  private enterBuilding(b: BuildingDef) {
    this.cameras.main.flash(280, 255, 255, 255, false)
    this.time.delayedCall(300, () => {
      window.dispatchEvent(new CustomEvent('realm:enter-building', { detail: { href: b.href, id: b.id } }))
    })
  }

  update() {
    if (!this.playerBody) return
    const { up, down, left, right, w, s, a, d } = this.keys
    let vx = 0, vy = 0, newDir = this.facingDir

    if (left.isDown  || a.isDown) { vx = -PLAYER_SPEED; newDir = 'w' }
    if (right.isDown || d.isDown) { vx =  PLAYER_SPEED; newDir = 'e' }
    if (up.isDown    || w.isDown) { vy = -PLAYER_SPEED; if (vx === 0) newDir = 'n' }
    if (down.isDown  || s.isDown) { vy =  PLAYER_SPEED; if (vx === 0) newDir = 's' }
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    this.playerBody.setVelocity(vx, vy)
    if (newDir !== this.facingDir) { this.facingDir = newDir; this.drawPlayerSprite(newDir) }

    const isMoving = vx !== 0 || vy !== 0
    if (isMoving) {
      this.walkTick++
      const swing = Math.sin(this.walkTick * 0.22) * 10
      this.legL.rotation =  swing * 0.06
      this.legR.rotation = -swing * 0.06
      this.bodyGfx.rotation = swing * 0.01
    } else {
      this.walkTick = 0
      this.legL.rotation = this.legR.rotation = this.bodyGfx.rotation = 0
    }

    // Proximity — detect building entrance
    const px = this.player.x, py = this.player.y
    let closest: BuildingDef | null = null, closestDist = Infinity
    for (const b of BUILDINGS) {
      const doorX = b.col * CELL + BLOCK / 2
      const doorY = b.row * CELL + BLOCK + SIDEWALK
      const dist  = Phaser.Math.Distance.Between(px, py, doorX, doorY)
      if (dist < ENTER_RADIUS && dist < closestDist) { closestDist = dist; closest = b }
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

    if (this.time.now - this.lastPosEmit > 80) {
      this.lastPosEmit = this.time.now
      window.dispatchEvent(new CustomEvent('realm:player-position', { detail: { x: px, y: py } }))
    }
  }

  shutdown() {
    if (this.teleportHandler) window.removeEventListener('realm:teleport', this.teleportHandler)
  }
}
