import Phaser from "phaser"

// ── World constants ──────────────────────────────────────────────────────────
const WORLD_SIZE = 4800
const COLS       = 12
const ROWS       = 12
const CELL       = 400         // WORLD_SIZE / COLS
const ROAD_W     = 80          // road strip (right + bottom edge of each cell)
const SIDEWALK   = 12          // sidewalk width inside road strip
const BLOCK      = CELL - ROAD_W  // 320 — non-road area per cell
const INSET      = 10          // gap between cell edge and building wall
const BLDG_W     = BLOCK - INSET * 2   // 300 — building footprint width
const BLDG_H     = BLOCK - INSET * 2   // 300 — building footprint height
const PLAYER_SPEED = 190
const PLAYER_R     = 13
const ENTER_RADIUS = 75

// ── Grid cell types ──────────────────────────────────────────────────────────
type Cell = 'water' | 'beach' | 'park' | 'plaza' | 'res' | 'com' | 'dt'

// Reading: row first (top=north), col second (left=west)
// Beach/ocean on west edge, bay curves in from south-west, downtown center-south,
// Balboa Park north of downtown, commercial rings downtown, residential fills the rest.
const GRID: Cell[][] = [
//  0        1       2       3       4       5       6       7       8       9       10      11
  ['water', 'water','water','beach','beach','res',  'res',  'res',  'res',  'res',  'res',  'res'],  // row 0
  ['water', 'water','beach','beach','res',  'res',  'park', 'park', 'res',  'res',  'res',  'res'],  // row 1
  ['water', 'beach','beach','res',  'res',  'park', 'park', 'park', 'res',  'res',  'res',  'res'],  // row 2
  ['water', 'beach','res',  'res',  'park', 'park', 'park', 'res',  'res',  'com',  'com',  'res'],  // row 3
  ['beach', 'beach','res',  'res',  'res',  'res',  'res',  'com',  'com',  'com',  'com',  'res'],  // row 4
  ['beach', 'beach','com',  'com',  'res',  'res',  'com',  'com',  'com',  'com',  'res',  'res'],  // row 5
  ['beach', 'beach','com',  'com',  'com',  'dt',   'dt',   'dt',   'com',  'com',  'res',  'res'],  // row 6
  ['water', 'beach','com',  'com',  'dt',   'dt',   'dt',   'dt',   'com',  'com',  'res',  'res'],  // row 7
  ['water', 'water','plaza','com',  'dt',   'dt',   'dt',   'com',  'com',  'res',  'res',  'res'],  // row 8
  ['water', 'water','water','plaza','com',  'com',  'com',  'com',  'res',  'res',  'res',  'res'],  // row 9
  ['water', 'water','water','water','water','plaza', 'com',  'res',  'res',  'res',  'res',  'res'],  // row 10
  ['water', 'water','water','water','water','water', 'water','water','water','water','water','water'],// row 11
]

// ── Named building definitions ───────────────────────────────────────────────
interface BuildingDef {
  id: string
  name: string
  col: number
  row: number
  color: number
  available: boolean
  href: string
  style: 'bank' | 'library' | 'standard' | 'dt' | 'park'
  neighborhood: string
}

const BUILDINGS: BuildingDef[] = [
  { id: 'bank',       name: 'First Realm Bank',  col: 5,  row: 7, color: 0x10b981, available: true,  href: '/buildings/bank',       style: 'bank',     neighborhood: 'Downtown'       },
  { id: 'library',    name: 'City Library',       col: 7,  row: 3, color: 0x3b82f6, available: true,  href: '/buildings/library',    style: 'library',  neighborhood: 'Balboa Park'    },
  { id: 'government', name: 'City Hall',          col: 4,  row: 7, color: 0x64748b, available: false, href: '/buildings/government', style: 'dt',       neighborhood: 'Downtown'       },
  { id: 'office',     name: 'Office Tower',       col: 6,  row: 8, color: 0x0891b2, available: false, href: '/buildings/office',     style: 'dt',       neighborhood: 'Downtown'       },
  { id: 'hospital',   name: 'Realm Medical',      col: 4,  row: 6, color: 0xef4444, available: false, href: '/buildings/hospital',   style: 'standard', neighborhood: 'Hillcrest'      },
  { id: 'university', name: 'Realm University',   col: 8,  row: 1, color: 0x8b5cf6, available: false, href: '/buildings/university', style: 'standard', neighborhood: 'La Jolla'       },
  { id: 'mall',       name: 'The Mall',           col: 10, row: 3, color: 0xec4899, available: false, href: '/buildings/mall',       style: 'standard', neighborhood: 'UTC'            },
  { id: 'gym',        name: 'Iron District Gym',  col: 2,  row: 5, color: 0xf97316, available: false, href: '/buildings/gym',        style: 'standard', neighborhood: 'Pacific Beach'  },
  { id: 'home',       name: 'Your Home',          col: 10, row: 0, color: 0xf59e0b, available: false, href: '/buildings/home',       style: 'standard', neighborhood: 'Carmel Valley'  },
]

// Build a lookup: "col,row" → BuildingDef
const BUILDING_MAP = new Map<string, BuildingDef>()
for (const b of BUILDINGS) BUILDING_MAP.set(`${b.col},${b.row}`, b)

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  road:      0x22222e,
  sidewalk:  0x2e2e3e,
  curb:      0x3a3a4e,
  lanemark:  0xffffff,
  crosswalk: 0x888899,
  water:     0x1565a0,
  waterShim: 0x3a8fd4,
  beach:     0xf0dd90,
  beachWet:  0xd4c070,
  park:      0x2d7a2d,
  parkLight: 0x3a9a3a,
  parkTree:  0x1a4e1a,
  plaza:     0x787888,
  plazaLine: 0x8888a0,
  resBldg:   0xb8a898,
  comBldg:   0x8898a8,
  dtBldg:    0x607080,
  dtGlass:   0x4a6a88,
  roofLight: 0xddddee,
  shadow:    0x000000,
}

// ── Helper: cell world origin ─────────────────────────────────────────────────
function cx(col: number) { return col * CELL }
function cy(row: number) { return row * CELL }

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
    w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key
    e: Phaser.Input.Keyboard.Key
  }
  private nearBuilding:   BuildingDef | null = null
  private promptText!:    Phaser.GameObjects.Text
  private displayName  = 'You'
  private walkTick     = 0
  private facingDir: 'n' | 's' | 'e' | 'w' = 's'
  private lastPosEmit  = 0
  private teleportHandler!: EventListener

  constructor() { super({ key: 'CityScene' }) }

  init(data: { displayName?: string }) {
    this.displayName = data.displayName ?? 'You'
  }

  create() {
    this.walls = this.physics.add.staticGroup()

    this.drawGround()
    this.drawRoads()
    this.drawWater()
    this.drawBeach()
    this.drawParks()
    this.drawPlazas()
    this.drawBuildings()
    this.drawNeighborhoodLabels()
    this.createPlayer()
    this.setupPhysics()
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TERRAIN LAYERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Fill the entire world with a base ground color per cell type */
  private drawGround() {
    const g = this.add.graphics().setDepth(0)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const type = GRID[row][col]
        const x = cx(col), y = cy(row)

        switch (type) {
          case 'water': break  // handled by drawWater
          case 'beach': break  // handled by drawBeach
          case 'park':
            g.fillStyle(C.park)
            g.fillRect(x, y, CELL, CELL)
            break
          case 'plaza':
            g.fillStyle(C.plaza)
            g.fillRect(x, y, CELL, CELL)
            break
          case 'res':
            g.fillStyle(0xd4ccbc)
            g.fillRect(x, y, CELL, CELL)
            break
          case 'com':
            g.fillStyle(0xbcc4cc)
            g.fillRect(x, y, CELL, CELL)
            break
          case 'dt':
            g.fillStyle(0xaab4c0)
            g.fillRect(x, y, CELL, CELL)
            break
        }
      }
    }
  }

  /** Road grid — draws every road strip between cells */
  private drawRoads() {
    const g = this.add.graphics().setDepth(3)

    // Draw road for every non-water column edge (vertical roads) and row edge (horizontal roads)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const type = GRID[row][col]
        if (type === 'water') continue

        const x = cx(col), y = cy(row)

        // Road strip on right edge of cell (vertical road between col and col+1)
        if (col < COLS - 1 && GRID[row][col + 1] !== 'water') {
          const rx = x + BLOCK
          // Asphalt
          g.fillStyle(C.road)
          g.fillRect(rx, y, ROAD_W, CELL)
          // Sidewalks
          g.fillStyle(C.sidewalk)
          g.fillRect(rx, y, SIDEWALK, CELL)
          g.fillRect(rx + ROAD_W - SIDEWALK, y, SIDEWALK, CELL)
          // Curb lines
          g.lineStyle(1, C.curb, 0.9)
          g.lineBetween(rx + SIDEWALK, y, rx + SIDEWALK, y + CELL)
          g.lineBetween(rx + ROAD_W - SIDEWALK, y, rx + ROAD_W - SIDEWALK, y + CELL)
          // Dashed center lane marking
          g.lineStyle(1.5, C.lanemark, 0.25)
          const roadCenter = rx + ROAD_W / 2
          for (let dy = y + 10; dy < y + CELL - 10; dy += 28) {
            g.lineBetween(roadCenter, dy, roadCenter, dy + 14)
          }
        }

        // Road strip on bottom edge of cell (horizontal road between row and row+1)
        if (row < ROWS - 1 && GRID[row + 1][col] !== 'water') {
          const ry = y + BLOCK
          // Asphalt
          g.fillStyle(C.road)
          g.fillRect(x, ry, CELL, ROAD_W)
          // Sidewalks
          g.fillStyle(C.sidewalk)
          g.fillRect(x, ry, CELL, SIDEWALK)
          g.fillRect(x, ry + ROAD_W - SIDEWALK, CELL, SIDEWALK)
          // Curb lines
          g.lineStyle(1, C.curb, 0.9)
          g.lineBetween(x, ry + SIDEWALK, x + CELL, ry + SIDEWALK)
          g.lineBetween(x, ry + ROAD_W - SIDEWALK, x + CELL, ry + ROAD_W - SIDEWALK)
          // Dashed center lane marking
          g.lineStyle(1.5, C.lanemark, 0.25)
          const roadCenter = ry + ROAD_W / 2
          for (let dx = x + 10; dx < x + CELL - 10; dx += 28) {
            g.lineBetween(dx, roadCenter, dx + 14, roadCenter)
          }
        }
      }
    }

    // Intersection squares (where road strips meet — fill with road color, add crosswalks)
    const gx = this.add.graphics().setDepth(4)
    for (let row = 0; row < ROWS - 1; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const a = GRID[row][col], b = GRID[row][col + 1]
        const c2 = GRID[row + 1][col], d = GRID[row + 1][col + 1]
        const allLand = a !== 'water' && b !== 'water' && c2 !== 'water' && d !== 'water'
        if (!allLand) continue

        const ix = col * CELL + BLOCK
        const iy = row * CELL + BLOCK

        // Fill intersection
        gx.fillStyle(C.road)
        gx.fillRect(ix, iy, ROAD_W, ROAD_W)

        // Crosswalk stripes (south side)
        gx.fillStyle(C.crosswalk, 0.4)
        for (let s = 0; s < 5; s++) {
          gx.fillRect(ix + SIDEWALK + s * 11, iy + ROAD_W - SIDEWALK - 10, 7, 10)
          gx.fillRect(ix + SIDEWALK + s * 11, iy, 7, 10)
          gx.fillRect(ix, iy + SIDEWALK + s * 11, 10, 7)
          gx.fillRect(ix + ROAD_W - SIDEWALK - 10, iy + SIDEWALK + s * 11, 10, 7)
        }
      }
    }
  }

  /** Ocean/bay water cells */
  private drawWater() {
    const g = this.add.graphics().setDepth(1)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'water') continue
        const x = cx(col), y = cy(row)

        // Deep water base
        g.fillStyle(C.water)
        g.fillRect(x, y, CELL, CELL)

        // Wave shimmer bands
        g.fillStyle(C.waterShim, 0.12)
        for (let wy = y; wy < y + CELL; wy += 20) {
          g.fillRect(x, wy, CELL, 8)
        }
      }
    }

    // Animated shimmer overlay
    const shimmer = this.add.graphics().setDepth(2)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'water') continue
        const x = cx(col), y = cy(row)
        shimmer.fillStyle(C.waterShim, 0.18)
        for (let i = 0; i < 6; i++) {
          shimmer.fillEllipse(x + 30 + i * 60, y + 20 + (i % 3) * 40, 40, 8)
        }
      }
    }
    this.tweens.add({ targets: shimmer, alpha: { from: 0.4, to: 1 }, duration: 2400, yoyo: true, repeat: -1 })

    // Shore edge lines where water meets land
    const edge = this.add.graphics().setDepth(5)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'water') continue
        const x = cx(col), y = cy(row)

        // Right neighbor is land → draw shore on right
        if (col + 1 < COLS && GRID[row][col + 1] !== 'water') {
          edge.lineStyle(3, 0x7ab8e0, 0.5)
          edge.lineBetween(x + CELL, y, x + CELL, y + CELL)
        }
        // Bottom neighbor is land
        if (row + 1 < ROWS && GRID[row + 1][col] !== 'water') {
          edge.lineStyle(3, 0x7ab8e0, 0.5)
          edge.lineBetween(x, y + CELL, x + CELL, y + CELL)
        }
      }
    }
  }

  /** Sandy beach cells */
  private drawBeach() {
    const g = this.add.graphics().setDepth(2)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'beach') continue
        const x = cx(col), y = cy(row)

        // Dry sand
        g.fillStyle(C.beach)
        g.fillRect(x, y, CELL, CELL)

        // Wet sand strip toward water side
        g.fillStyle(C.beachWet, 0.5)
        if (col > 0 && GRID[row][col - 1] === 'water') {
          g.fillRect(x, y, 40, CELL)
          // Wave foam line
          g.lineStyle(2, 0xffffff, 0.5)
          for (let wy = y + 8; wy < y + CELL; wy += 24) {
            g.lineBetween(x + 4, wy, x + 36, wy + 6)
          }
        }
        if (row > 0 && GRID[row - 1][col] === 'water') {
          g.fillRect(x, y, CELL, 40)
          g.lineStyle(2, 0xffffff, 0.5)
          for (let wx = x + 8; wx < x + CELL; wx += 24) {
            g.lineBetween(wx, y + 4, wx + 6, y + 36)
          }
        }

        // Beach texture dots
        g.fillStyle(0xd8c860, 0.2)
        for (let i = 0; i < 12; i++) {
          const tx = x + ((col * 71 + i * 37) % (CELL - 20)) + 10
          const ty = y + ((row * 53 + i * 61) % (CELL - 20)) + 10
          g.fillCircle(tx, ty, 2)
        }
      }
    }
  }

  /** Park cells — grass + trees + paths */
  private drawParks() {
    const g = this.add.graphics().setDepth(2)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'park') continue
        const x = cx(col), y = cy(row)

        // Grass base
        g.fillStyle(C.park)
        g.fillRect(x, y, CELL, CELL)

        // Lighter grass patches
        g.fillStyle(C.parkLight, 0.35)
        for (let i = 0; i < 5; i++) {
          const px2 = x + ((col * 91 + i * 47) % (BLOCK - 40)) + 20
          const py2 = y + ((row * 67 + i * 83) % (BLOCK - 40)) + 20
          g.fillEllipse(px2, py2, 60, 40)
        }

        // Tree canopies (top-down circles)
        const treeSeeds = [
          [x + 40,  y + 40],  [x + 140, y + 60],  [x + 250, y + 35],
          [x + 60,  y + 180], [x + 180, y + 160],  [x + 270, y + 190],
          [x + 30,  y + 270], [x + 150, y + 280],  [x + 240, y + 260],
        ]
        for (const [tx, ty] of treeSeeds) {
          // Shadow
          g.fillStyle(0x000000, 0.12)
          g.fillCircle(tx + 6, ty + 6, 18)
          // Outer canopy
          g.fillStyle(C.parkTree, 0.9)
          g.fillCircle(tx, ty, 18)
          // Inner highlight
          g.fillStyle(C.parkLight, 0.4)
          g.fillCircle(tx - 4, ty - 4, 8)
        }

        // Park path (diagonal through each cell)
        g.lineStyle(8, 0xc8b870, 0.55)
        g.lineBetween(x + SIDEWALK, y + BLOCK / 2, x + BLOCK - SIDEWALK, y + BLOCK / 2)
        g.lineStyle(8, 0xc8b870, 0.55)
        g.lineBetween(x + BLOCK / 2, y + SIDEWALK, x + BLOCK / 2, y + BLOCK - SIDEWALK)
      }
    }
  }

  /** Plaza cells — paved open space */
  private drawPlazas() {
    const g = this.add.graphics().setDepth(2)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (GRID[row][col] !== 'plaza') continue
        const x = cx(col), y = cy(row)

        g.fillStyle(C.plaza)
        g.fillRect(x, y, CELL, CELL)

        // Grid paving lines
        g.lineStyle(1, C.plazaLine, 0.35)
        for (let px2 = x + 40; px2 < x + BLOCK; px2 += 40) g.lineBetween(px2, y, px2, y + BLOCK)
        for (let py2 = y + 40; py2 < y + BLOCK; py2 += 40) g.lineBetween(x, py2, x + BLOCK, py2)

        // Center fountain circle
        g.fillStyle(C.water, 0.6)
        g.fillCircle(x + BLOCK / 2, y + BLOCK / 2, 30)
        g.lineStyle(2, C.waterShim, 0.6)
        g.strokeCircle(x + BLOCK / 2, y + BLOCK / 2, 30)
        g.fillStyle(0xffffff, 0.3)
        g.fillCircle(x + BLOCK / 2, y + BLOCK / 2, 10)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILDINGS
  // ═══════════════════════════════════════════════════════════════════════════

  private drawBuildings() {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const type = GRID[row][col]
        if (type !== 'res' && type !== 'com' && type !== 'dt') continue

        const named = BUILDING_MAP.get(`${col},${row}`)
        if (named) {
          this.drawNamedBuilding(named)
        } else {
          this.drawGenericBuilding(col, row, type)
        }
      }
    }
  }

  private drawNamedBuilding(b: BuildingDef) {
    const g = this.add.graphics().setDepth(10)
    const x = cx(b.col) + INSET
    const y = cy(b.row) + INSET

    // Drop shadow
    g.fillStyle(C.shadow, 0.22)
    g.fillRect(x + 6, y + 6, BLDG_W, BLDG_H)

    if (b.style === 'bank')    this.drawBank(g, x, y, b.color)
    else if (b.style === 'library') this.drawLibrary(g, x, y, b.color)
    else if (b.style === 'dt') this.drawDowntownTower(g, x, y, b.color)
    else                       this.drawStandard(g, x, y, b.color)

    if (b.available) {
      // Glow outline
      g.lineStyle(2.5, b.color, 0.6)
      g.strokeRect(x - 3, y - 3, BLDG_W + 6, BLDG_H + 6)

      // OPEN badge
      const badge = this.add.text(x + BLDG_W / 2, y - 6, '● OPEN', {
        fontSize: '8px', color: `#${b.color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold', backgroundColor: '#ffffffcc', padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 1).setDepth(12)
      this.tweens.add({ targets: badge, alpha: { from: 1, to: 0.3 }, duration: 1400, yoyo: true, repeat: -1 })

      this.add.text(x + BLDG_W / 2, y + BLDG_H + 6, b.name, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold', align: 'center',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 0).setDepth(12)
    } else {
      // Locked overlay
      g.fillStyle(0x000000, 0.3)
      g.fillRect(x, y, BLDG_W, BLDG_H)
      this.add.text(x + BLDG_W / 2, y + BLDG_H / 2, '🔒', { fontSize: '22px' })
        .setOrigin(0.5).setDepth(12).setAlpha(0.5)
      this.add.text(x + BLDG_W / 2, y + BLDG_H + 4, b.name, {
        fontSize: '9px', color: '#ffffff88', align: 'center',
        backgroundColor: '#00000066', padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 0).setDepth(11)
    }
  }

  private drawBank(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number) {
    // Marble-white body
    g.fillStyle(0xedfff6)
    g.fillRect(x, y, BLDG_W, BLDG_H)
    // Window grid
    g.fillStyle(col, 0.15)
    for (let wy = y + 20; wy < y + BLDG_H - 20; wy += 36) {
      for (let wx = x + 20; wx < x + BLDG_W - 20; wx += 36) {
        g.fillRect(wx, wy, 22, 26)
        g.lineStyle(0.5, col, 0.5)
        g.strokeRect(wx, wy, 22, 26)
      }
    }
    // Art deco crown
    g.fillStyle(col, 0.7)
    g.fillRect(x + 30, y, BLDG_W - 60, 8)
    g.fillRect(x + 50, y - 8, BLDG_W - 100, 8)
    g.fillRect(x + 70, y - 14, BLDG_W - 140, 6)
    // Columns at south entrance
    g.fillStyle(0xffffff, 0.9)
    for (let i = 0; i < 6; i++) {
      g.fillRect(x + 20 + i * 44, y + BLDG_H - 40, 10, 40)
    }
    // Revolving door
    g.fillStyle(col, 0.4)
    g.fillCircle(x + BLDG_W / 2, y + BLDG_H - 16, 16)
    g.lineStyle(1.5, col, 0.7)
    g.strokeCircle(x + BLDG_W / 2, y + BLDG_H - 16, 16)
    g.lineStyle(1.5, col, 0.5)
    g.lineBetween(x + BLDG_W / 2 - 16, y + BLDG_H - 16, x + BLDG_W / 2 + 16, y + BLDG_H - 16)
    g.lineBetween(x + BLDG_W / 2, y + BLDG_H - 32, x + BLDG_W / 2, y + BLDG_H)
    // Label
    this.add.text(x + BLDG_W / 2, y + BLDG_H / 3, 'FIRST REALM\nBANK', {
      fontSize: '11px', color: '#0d7a4acc', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setDepth(11)
  }

  private drawLibrary(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number) {
    // Cream marble
    g.fillStyle(0xf4f0e8)
    g.fillRect(x, y, BLDG_W, BLDG_H)
    // Column grid texture
    g.lineStyle(0.8, 0xd8cfc0, 0.4)
    for (let lx = x + 25; lx < x + BLDG_W; lx += 25) g.lineBetween(lx, y, lx, y + BLDG_H)
    // Pediment
    g.fillStyle(0x4a6ab8, 0.9)
    g.fillTriangle(x + BLDG_W * 0.12, y, x + BLDG_W / 2, y - 30, x + BLDG_W * 0.88, y)
    g.lineStyle(2, col, 0.9)
    g.strokeTriangle(x + BLDG_W * 0.12, y, x + BLDG_W / 2, y - 30, x + BLDG_W * 0.88, y)
    // Window panes
    for (let wy = y + 30; wy < y + BLDG_H - 50; wy += 48) {
      for (let wx = x + 18; wx < x + BLDG_W - 18; wx += 40) {
        g.fillStyle(col, 0.18)
        g.fillRect(wx, wy, 24, 36)
        g.lineStyle(0.8, col, 0.5)
        g.strokeRect(wx, wy, 24, 36)
      }
    }
    // Columns at base
    g.fillStyle(0xffffff, 0.85)
    for (let i = 0; i < 8; i++) {
      const lcx = x + 14 + i * 37
      g.fillRect(lcx - 4, y + BLDG_H - 45, 8, 45)
      g.lineStyle(0.8, 0xb8c0d4, 0.5)
      g.strokeRect(lcx - 4, y + BLDG_H - 45, 8, 45)
    }
    // Double doors
    g.fillStyle(0x6688dd, 0.6)
    g.fillRect(x + BLDG_W / 2 - 18, y + BLDG_H - 35, 14, 35)
    g.fillRect(x + BLDG_W / 2 + 4, y + BLDG_H - 35, 14, 35)
    g.lineStyle(1, col, 0.8)
    g.strokeRect(x + BLDG_W / 2 - 18, y + BLDG_H - 35, 32, 35)
    this.add.text(x + BLDG_W / 2, y + BLDG_H / 3, 'CITY\nLIBRARY', {
      fontSize: '11px', color: '#3a5a9acc', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setDepth(11)
  }

  private drawDowntownTower(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number) {
    // Glass tower — top-down shows the rooftop
    g.fillStyle(C.dtBldg)
    g.fillRect(x, y, BLDG_W, BLDG_H)
    // Glass curtain-wall grid
    g.lineStyle(1, C.dtGlass, 0.6)
    for (let lx = x + 20; lx < x + BLDG_W; lx += 20) g.lineBetween(lx, y, lx, y + BLDG_H)
    for (let ly = y + 20; ly < y + BLDG_H; ly += 20) g.lineBetween(x, ly, x + BLDG_W, ly)
    // Rooftop highlight
    g.fillStyle(C.roofLight, 0.12)
    g.fillRect(x + 10, y + 10, BLDG_W - 20, BLDG_H - 20)
    // Accent color band
    g.fillStyle(col, 0.35)
    g.fillRect(x, y, BLDG_W, 14)
    g.fillRect(x, y + BLDG_H - 14, BLDG_W, 14)
  }

  private drawStandard(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number) {
    g.fillStyle(0xf0f0ec)
    g.fillRect(x, y, BLDG_W, BLDG_H)
    g.lineStyle(1.5, col, 0.45)
    g.strokeRect(x, y, BLDG_W, BLDG_H)
    // Window rows
    for (let wy = y + 25; wy < y + BLDG_H - 30; wy += 38) {
      for (let wx = x + 20; wx < x + BLDG_W - 20; wx += 34) {
        g.fillStyle(col, 0.22)
        g.fillRect(wx, wy, 20, 26)
        g.lineStyle(0.8, col, 0.5)
        g.strokeRect(wx, wy, 20, 26)
      }
    }
    // Door
    g.fillStyle(col, 0.3)
    g.fillRect(x + BLDG_W / 2 - 10, y + BLDG_H - 28, 20, 28)
    g.lineStyle(1, col, 0.5)
    g.strokeRect(x + BLDG_W / 2 - 10, y + BLDG_H - 28, 20, 28)
  }

  /** Background buildings for unnamed cells */
  private drawGenericBuilding(col: number, row: number, type: Cell) {
    const g  = this.add.graphics().setDepth(8)
    const x  = cx(col) + INSET
    const y  = cy(row)  + INSET
    const w  = BLDG_W
    const h  = BLDG_H
    const seed = col * 13 + row * 7

    let baseColor: number
    let winColor: number
    if (type === 'dt') {
      baseColor = [0x607080, 0x506878, 0x708090][seed % 3]
      winColor  = 0x8ab0cc
    } else if (type === 'com') {
      baseColor = [0x909aa8, 0x8090a0, 0xa0a8b0][seed % 3]
      winColor  = 0x6688aa
    } else {
      baseColor = [0xb8b0a0, 0xc4baaa, 0xaaa090][seed % 3]
      winColor  = 0x8090a0
    }

    g.fillStyle(C.shadow, 0.15)
    g.fillRect(x + 5, y + 5, w, h)

    g.fillStyle(baseColor)
    g.fillRect(x, y, w, h)

    // Simple window grid
    const cols2 = 3 + (seed % 3)
    const rows2 = 3 + (seed % 4)
    const ww = Math.floor((w - 30) / cols2)
    const wh = Math.floor((h - 30) / rows2)
    for (let r = 0; r < rows2; r++) {
      for (let c = 0; c < cols2; c++) {
        g.fillStyle(winColor, 0.2)
        g.fillRect(x + 15 + c * ww, y + 15 + r * wh, ww - 6, wh - 6)
      }
    }
  }

  /** Neighbourhood text labels */
  private drawNeighborhoodLabels() {
    const labels = [
      { text: 'DOWNTOWN',      col: 5,  row: 7,  y: -30 },
      { text: 'BALBOA PARK',   col: 5,  row: 2,  y: 0   },
      { text: 'PACIFIC BEACH', col: 1,  row: 4,  y: 0   },
      { text: 'HILLCREST',     col: 4,  row: 5,  y: 0   },
      { text: 'LA JOLLA',      col: 8,  row: 0,  y: 0   },
      { text: 'UTC',           col: 10, row: 2,  y: 0   },
      { text: 'CARMEL VALLEY', col: 9,  row: 0,  y: 0   },
      { text: 'EMBARCADERO',   col: 3,  row: 9,  y: 0   },
      { text: 'NORTH PARK',    col: 9,  row: 5,  y: 0   },
    ]

    for (const l of labels) {
      this.add.text(
        cx(l.col) + CELL / 2,
        cy(l.row) + BLOCK / 2 + l.y,
        l.text,
        { fontSize: '12px', color: '#ffffff55', fontStyle: 'bold', letterSpacing: 3 }
      ).setOrigin(0.5).setDepth(6)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupPhysics() {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const type = GRID[row][col]

        if (type === 'water') {
          // Full cell is impassable
          const body = this.add.rectangle(
            cx(col) + CELL / 2, cy(row) + CELL / 2, CELL, CELL
          ).setVisible(false)
          this.physics.add.existing(body, true)
          this.walls.add(body)
          continue
        }

        if (type === 'res' || type === 'com' || type === 'dt') {
          // Building footprint is impassable
          const bx = cx(col) + INSET + BLDG_W / 2
          const by = cy(row) + INSET + BLDG_H / 2
          const body = this.add.rectangle(bx, by, BLDG_W, BLDG_H).setVisible(false)
          this.physics.add.existing(body, true)
          this.walls.add(body)
        }
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

    // Spawn on the road south of the bank
    const spawnX = cx(5) + CELL / 2
    const spawnY = cy(7) + BLOCK + ROAD_W / 2

    this.player = this.add.container(spawnX, spawnY, [this.legL, this.legR, this.bodyGfx, nameLabel])
    this.player.setDepth(20)

    this.physics.world.enable(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setCircle(PLAYER_R, -PLAYER_R, -PLAYER_R)
  }

  private drawPlayerSprite(dir: 'n' | 's' | 'e' | 'w') {
    this.legL.clear()
    this.legR.clear()
    this.bodyGfx.clear()

    // Ground shadow
    this.legL.fillStyle(0x000000, 0.25)
    this.legL.fillEllipse(0, 22, 26, 9)

    // Legs
    this.legL.fillStyle(0x1a2460)
    this.legL.fillRoundedRect(-8, 4, 7, 13, 3)
    this.legR.fillStyle(0x1a2460)
    this.legR.fillRoundedRect(1, 4, 7, 13, 3)

    // Body
    this.bodyGfx.fillStyle(0x4f46e5)
    this.bodyGfx.fillRoundedRect(-9, -10, 18, 15, 4)
    // Arms
    this.bodyGfx.fillStyle(0x4f46e5, 0.85)
    this.bodyGfx.fillRoundedRect(-14, -9, 5, 12, 2)
    this.bodyGfx.fillRoundedRect(9, -9, 5, 12, 2)

    // Head
    this.bodyGfx.fillStyle(0xfbbf24)
    this.bodyGfx.fillCircle(0, -22, 10)
    // Hair
    this.bodyGfx.fillStyle(0x92400e)
    this.bodyGfx.fillEllipse(0, -30, 16, 8)

    // Direction-aware eyes
    this.bodyGfx.fillStyle(0x1f2937)
    if      (dir === 's') { this.bodyGfx.fillCircle(-3, -22, 2); this.bodyGfx.fillCircle(3, -22, 2) }
    else if (dir === 'e') { this.bodyGfx.fillCircle(4, -23, 2) }
    else if (dir === 'w') { this.bodyGfx.fillCircle(-4, -23, 2) }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP
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
    this.keys.e.on('down', () => {
      if (this.nearBuilding?.available) this.enterBuilding(this.nearBuilding)
    })
  }

  private createPrompt() {
    this.promptText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 50,
      '',
      { fontSize: '13px', color: '#1a1a3e', backgroundColor: '#ffffffee', padding: { x: 14, y: 8 } }
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(30).setAlpha(0)
  }

  private enterBuilding(b: BuildingDef) {
    this.cameras.main.flash(280, 255, 255, 255, false)
    this.time.delayedCall(300, () => {
      window.dispatchEvent(new CustomEvent('realm:enter-building', { detail: { href: b.href, id: b.id } }))
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  update() {
    if (!this.playerBody) return

    const { up, down, left, right, w, s, a, d } = this.keys
    let vx = 0, vy = 0
    let newDir = this.facingDir

    if (left.isDown  || a.isDown) { vx = -PLAYER_SPEED; newDir = 'w' }
    if (right.isDown || d.isDown) { vx =  PLAYER_SPEED; newDir = 'e' }
    if (up.isDown    || w.isDown) { vy = -PLAYER_SPEED; if (vx === 0) newDir = 'n' }
    if (down.isDown  || s.isDown) { vy =  PLAYER_SPEED; if (vx === 0) newDir = 's' }
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    this.playerBody.setVelocity(vx, vy)

    if (newDir !== this.facingDir) {
      this.facingDir = newDir
      this.drawPlayerSprite(newDir)
    }

    const isMoving = vx !== 0 || vy !== 0
    if (isMoving) {
      this.walkTick++
      const swing = Math.sin(this.walkTick * 0.22) * 10
      this.legL.rotation =  swing * 0.06
      this.legR.rotation = -swing * 0.06
      this.bodyGfx.rotation = swing * 0.01
    } else {
      this.walkTick = 0
      this.legL.rotation = 0
      this.legR.rotation = 0
      this.bodyGfx.rotation = 0
    }

    // Proximity check — detect building entrance
    const px = this.player.x
    const py = this.player.y
    let closest: BuildingDef | null = null
    let closestDist = Infinity

    for (const b of BUILDINGS) {
      const doorX = cx(b.col) + BLOCK / 2
      const doorY = cy(b.row) + BLOCK + SIDEWALK
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

    // Emit position to MapHUD (~80 ms throttle)
    if (this.time.now - this.lastPosEmit > 80) {
      this.lastPosEmit = this.time.now
      window.dispatchEvent(new CustomEvent('realm:player-position', {
        detail: { x: this.player.x, y: this.player.y },
      }))
    }
  }

  shutdown() {
    if (this.teleportHandler) window.removeEventListener('realm:teleport', this.teleportHandler)
  }
}
