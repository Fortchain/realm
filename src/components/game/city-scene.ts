import Phaser from "phaser"

// World layout: ocean borders city on west/south, mountains to north/east
const WORLD_W = 1600
const WORLD_H = 1300
const OCEAN_W = 155   // west/south ocean strip width
const MOUNTAIN_H = 160 // north mountain strip height

const PLAYER_SPEED = 210
const ENTER_RADIUS = 105

interface BuildingDef {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  color: number
  available: boolean
  href: string
  style?: "library" | "bank" | "standard"
}

// Building roof (h) + south facade (FACADE = 32) drawn in 3/4 RPG view
const FACADE = 32
const BUILDINGS: BuildingDef[] = [
  { id: "bank",       name: "First Realm Bank",   x: 285,  y: 270,  w: 215, h: 165, color: 0x10b981, available: true,  href: "/buildings/bank",       style: "bank"     },
  { id: "library",    name: "City Library",        x: 590,  y: 270,  w: 220, h: 175, color: 0x3b82f6, available: true,  href: "/buildings/library",    style: "library"  },
  { id: "university", name: "Realm University",    x: 900,  y: 270,  w: 215, h: 165, color: 0x8b5cf6, available: false, href: "/buildings/university", style: "standard" },
  { id: "gym",        name: "Iron District Gym",   x: 285,  y: 545,  w: 215, h: 165, color: 0xf97316, available: false, href: "/buildings/gym",        style: "standard" },
  { id: "home",       name: "Your Home",           x: 590,  y: 545,  w: 215, h: 165, color: 0xf59e0b, available: false, href: "/buildings/home",       style: "standard" },
  { id: "hospital",   name: "Realm Medical",       x: 900,  y: 545,  w: 215, h: 165, color: 0xef4444, available: false, href: "/buildings/hospital",   style: "standard" },
  { id: "mall",       name: "The Mall",            x: 285,  y: 820,  w: 215, h: 165, color: 0xec4899, available: false, href: "/buildings/mall",       style: "standard" },
  { id: "government", name: "City Hall",           x: 590,  y: 820,  w: 215, h: 165, color: 0x64748b, available: false, href: "/buildings/government", style: "standard" },
  { id: "office",     name: "The Office Tower",    x: 900,  y: 820,  w: 215, h: 165, color: 0x06b6d4, available: false, href: "/buildings/office",     style: "standard" },
]

export class CityScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.Physics.Arcade.Body
  private playerGfx!: Phaser.GameObjects.Graphics
  private leftLegGfx!: Phaser.GameObjects.Graphics
  private rightLegGfx!: Phaser.GameObjects.Graphics
  private leftArmGfx!: Phaser.GameObjects.Graphics
  private rightArmGfx!: Phaser.GameObjects.Graphics
  private keys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; e: Phaser.Input.Keyboard.Key }
  private nearBuilding: BuildingDef | null = null
  private promptText!: Phaser.GameObjects.Text
  private displayName = "You"
  private walkTick = 0
  private isMoving = false
  private facingDir: "n" | "s" | "e" | "w" = "s"

  constructor() {
    super({ key: "CityScene" })
  }

  init(data: { displayName?: string }) {
    this.displayName = data.displayName ?? "You"
  }

  create() {
    this.drawWorld()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()
  }

  // ── World drawing ───────────────────────────────────────────────────

  private drawWorld() {
    this.drawOcean()
    this.drawMountains()
    this.drawLand()
    this.drawRoads()
    this.drawBuildings()
    this.drawTrees()
  }

  private drawOcean() {
    const g = this.add.graphics().setDepth(0)

    // Deep ocean base
    g.fillStyle(0x061420)
    g.fillRect(0, 0, WORLD_W, WORLD_H)

    // Ocean shimmer stripes (west + south)
    const shimmerAlphas = [0.04, 0.07, 0.04, 0.06, 0.03, 0.05]
    // West ocean
    for (let y = 0; y < WORLD_H; y += 18) {
      g.fillStyle(0x1a6a9e, shimmerAlphas[Math.floor(y / 18) % shimmerAlphas.length])
      g.fillRect(0, y, OCEAN_W - 10, 10)
    }
    // South ocean
    for (let x = 0; x < WORLD_W; x += 18) {
      g.fillStyle(0x1a6a9e, shimmerAlphas[Math.floor(x / 18) % shimmerAlphas.length])
      g.fillRect(x, WORLD_H - OCEAN_W + 10, 10, OCEAN_W - 10)
    }

    // Foam / shoreline glow
    g.fillStyle(0x4aabdd, 0.12)
    g.fillRect(OCEAN_W - 25, 0, 25, WORLD_H - OCEAN_W)       // west shore
    g.fillRect(0, WORLD_H - OCEAN_W - 5, WORLD_W, 25)         // south shore

    // Dock / pier sticking into west ocean
    g.fillStyle(0x8a6a40, 0.7)
    g.fillRect(OCEAN_W - 60, 520, 65, 14)
    g.fillRect(OCEAN_W - 60, 534, 14, 80)
    g.fillStyle(0x6a4a20, 0.5)
    for (let py = 540; py < 610; py += 20) {
      g.fillRect(OCEAN_W - 62, py, 3, 12)
      g.fillRect(OCEAN_W - 48, py, 3, 12)
    }

    // Animate ocean shimmer via tweens on a separate overlay
    const waveOverlay = this.add.graphics().setDepth(1).setAlpha(0)
    g.fillStyle(0x60c8ee, 0.08)
    for (let x = 20; x < OCEAN_W - 30; x += 28) {
      for (let y = 40; y < WORLD_H - OCEAN_W; y += 45) {
        waveOverlay.fillEllipse(x, y, 22, 5)
      }
    }
    this.tweens.add({
      targets: waveOverlay,
      alpha: { from: 0, to: 0.6 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 500,
    })
  }

  private drawMountains() {
    const g = this.add.graphics().setDepth(0).setScrollFactor(0.25)

    // Sky strip behind north mountains
    g.fillStyle(0x0e1428)
    g.fillRect(0, 0, WORLD_W, MOUNTAIN_H + 20)

    // Far mountains (east horizon line)
    const peaks = [
      { x: 0,    h: 110, w: 280 },
      { x: 220,  h: 155, w: 260 },
      { x: 440,  h: 125, w: 300 },
      { x: 700,  h: 170, w: 250 },
      { x: 910,  h: 135, w: 280 },
      { x: 1140, h: 160, w: 260 },
      { x: 1360, h: 120, w: 280 },
    ]
    const BY = MOUNTAIN_H + 20

    // Furthest range (lightest, most desaturated)
    for (const p of peaks) {
      g.fillStyle(0x1e2d4a, 0.5)
      g.fillTriangle(p.x - 40, BY, p.x + p.w / 2, BY - p.h * 0.5, p.x + p.w + 40, BY)
    }

    // Mid range (darker blue-gray)
    for (const p of peaks) {
      g.fillStyle(0x253550, 0.85)
      g.fillTriangle(p.x, BY, p.x + p.w / 2, BY - p.h, p.x + p.w, BY)
      // Snow cap
      g.fillStyle(0xccdaee, 0.5)
      g.fillTriangle(
        p.x + p.w * 0.28, BY - p.h * 0.72,
        p.x + p.w / 2,    BY - p.h,
        p.x + p.w * 0.72, BY - p.h * 0.72,
      )
    }

    // Close ridge (darkest)
    for (let rx = -60; rx < WORLD_W + 60; rx += 160) {
      const rh = 55 + Math.sin(rx * 0.02) * 20
      g.fillStyle(0x131c30, 0.9)
      g.fillTriangle(rx, BY + 5, rx + 80, BY - rh, rx + 160, BY + 5)
    }

    // East mountains (visible when camera near east edge)
    for (let i = 0; i < 5; i++) {
      const mx = WORLD_W - OCEAN_W + 20
      const mh = 80 + i * 30
      g.fillStyle(0x1e2d4a, 0.6)
      g.fillTriangle(mx - 40, 300 + i * 180, mx + 80, 300 + i * 180 - mh, mx + 160, 300 + i * 180)
    }
  }

  private drawLand() {
    const g = this.add.graphics().setDepth(1)

    // Main land mass (green-gray city ground)
    g.fillStyle(0x0d1120)
    g.fillRect(OCEAN_W, 0, WORLD_W - OCEAN_W, WORLD_H - OCEAN_W)

    // Beach strip (west)
    for (let y = 0; y < WORLD_H - OCEAN_W; y += 6) {
      const shade = (y % 12 === 0) ? 0.18 : 0.12
      g.fillStyle(0xd4a96a, shade)
      g.fillRect(OCEAN_W - 2, y, 22, 5)
    }
    // Beach strip (south)
    for (let x = OCEAN_W; x < WORLD_W; x += 6) {
      const shade = (x % 12 === 0) ? 0.18 : 0.12
      g.fillStyle(0xd4a96a, shade)
      g.fillRect(x, WORLD_H - OCEAN_W - 2, 5, 22)
    }

    // City ground subtle texture
    g.fillStyle(0xffffff, 0.012)
    for (let x = OCEAN_W; x < WORLD_W; x += 40) {
      for (let y = MOUNTAIN_H; y < WORLD_H - OCEAN_W; y += 40) {
        g.fillRect(x, y, 38, 38)
      }
    }

    // Parks / green spaces between building blocks
    const parks = [
      { x: 525, y: 270, w: 55,  h: 165 },   // between bank and library
      { x: 820, y: 270, w: 70,  h: 165 },   // between lib and university
      { x: 215, y: 450, w: 810, h: 85  },   // main east-west road
      { x: 525, y: 545, w: 55,  h: 165 },
      { x: 820, y: 545, w: 70,  h: 165 },
      { x: 215, y: 725, w: 810, h: 85  },
      { x: 525, y: 820, w: 55,  h: 165 },
      { x: 820, y: 820, w: 70,  h: 165 },
    ]
    for (const p of parks) {
      g.fillStyle(0x0e1f14, 0.7)
      g.fillRect(p.x, p.y, p.w, p.h)
    }
  }

  private drawRoads() {
    const g = this.add.graphics().setDepth(2)

    // Main vertical avenues
    const vRoads = [215, 520, 825, 1130]
    for (const rx of vRoads) {
      g.fillStyle(0x181824)
      g.fillRect(rx, MOUNTAIN_H, 55, WORLD_H - MOUNTAIN_H - OCEAN_W)
      // Lane dashes
      g.lineStyle(1, 0xffffff, 0.04)
      for (let y = MOUNTAIN_H + 20; y < WORLD_H - OCEAN_W; y += 36) {
        g.lineBetween(rx + 27, y, rx + 27, y + 18)
      }
    }

    // Main horizontal streets
    const hRoads = [230, 450, 640, 730, 1000, 1000]
    const hRoadsActual = [230, 450, 730, 1000]
    for (const ry of hRoadsActual) {
      g.fillStyle(0x181824)
      g.fillRect(OCEAN_W, ry, WORLD_W - OCEAN_W, 50)
      g.lineStyle(1, 0xffffff, 0.04)
      for (let x = OCEAN_W + 20; x < WORLD_W; x += 36) {
        g.lineBetween(x, ry + 25, x + 18, ry + 25)
      }
    }

    // Sidewalks (lighter strips along road edges)
    g.lineStyle(1, 0x2a2a40, 1)
    for (const rx of vRoads) {
      g.strokeRect(rx, MOUNTAIN_H, 55, WORLD_H - MOUNTAIN_H - OCEAN_W)
    }
  }

  private drawBuildings() {
    for (const b of BUILDINGS) {
      if (b.available) {
        this.drawAvailableBuilding(b)
      } else {
        this.drawLockedBuilding(b)
      }
    }
  }

  private drawAvailableBuilding(b: BuildingDef) {
    const g = this.add.graphics().setDepth(4)
    const { x, y, w, h, color } = b

    // Drop shadow
    g.fillStyle(0x000000, 0.5)
    g.fillRect(x + 10, y + 10, w, h + FACADE)

    if (b.style === "library") {
      this.drawLibraryExterior(g, x, y, w, h, color)
    } else if (b.style === "bank") {
      this.drawBankExterior(g, x, y, w, h, color)
    } else {
      this.drawStandardExterior(g, x, y, w, h, color)
    }

    // Glow outline
    g.lineStyle(2, color, 0.5)
    g.strokeRect(x - 4, y - 4, w + 8, h + FACADE + 8)

    // OPEN badge (as text object)
    const badge = this.add.text(x + w / 2, y - 10, "● OPEN", {
      fontSize: "8px",
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
      backgroundColor: "#0d1120cc",
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(5)
    this.tweens.add({ targets: badge, alpha: { from: 1, to: 0.3 }, duration: 1400, yoyo: true, repeat: -1 })

    // Building name
    this.add.text(x + w / 2, y + h + FACADE + 6, b.name, {
      fontSize: "10px",
      color: "#ffffff88",
      align: "center",
      fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(5)
  }

  private drawLibraryExterior(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    // Marble roof (classical library)
    g.fillStyle(0x2a3560, 0.95)
    g.fillRect(x, y, w, h)

    // Roof grid lines (marble texture hint)
    g.lineStyle(1, 0x3a4870, 0.35)
    for (let lx = x + 20; lx < x + w; lx += 20) g.lineBetween(lx, y, lx, y + h)
    for (let ly = y + 20; ly < y + h; ly += 20) g.lineBetween(x, ly, x + w, ly)

    // Pediment on roof (triangle shape visible from above)
    g.fillStyle(0x3a5090, 0.7)
    g.fillTriangle(x + w * 0.15, y, x + w / 2, y - 28, x + w * 0.85, y)
    g.lineStyle(2, color, 0.8)
    g.strokeTriangle(x + w * 0.15, y, x + w / 2, y - 28, x + w * 0.85, y)

    // Columns row along south edge of roof
    const numCols = 7
    for (let i = 0; i <= numCols; i++) {
      const cx = x + 15 + (i * (w - 30)) / numCols
      g.fillStyle(0x8899cc, 0.85)
      g.fillRect(cx - 4, y + h - 18, 8, 18)
    }

    // South facade (classical facade with columns)
    g.fillStyle(0x1e2848, 1)
    g.fillRect(x, y + h, w, FACADE + 10)
    g.lineStyle(2, color, 0.7)
    g.strokeRect(x, y + h, w, FACADE + 10)

    // Column lines on facade
    for (let i = 0; i <= numCols; i++) {
      const cx = x + 15 + (i * (w - 30)) / numCols
      g.lineStyle(1.5, 0x8899cc, 0.7)
      g.lineBetween(cx, y + h, cx, y + h + FACADE + 10)
    }

    // Steps
    g.fillStyle(0x3a4870, 0.8)
    g.fillRect(x + 10, y + h + FACADE + 10, w - 20, 7)
    g.fillRect(x + 20, y + h + FACADE + 17, w - 40, 6)

    // Entrance doors (double)
    const dW = 28, dH = FACADE + 2
    const dX = x + w / 2 - dW / 2
    g.fillStyle(0x5577bb, 0.85)
    g.fillRect(dX, y + h + 2, dW / 2 - 1, dH)
    g.fillRect(dX + dW / 2 + 1, y + h + 2, dW / 2 - 1, dH)
    g.lineStyle(1, color, 0.7)
    g.strokeRect(dX, y + h + 2, dW, dH)
    // Door arch
    g.fillStyle(0x6688cc, 0.4)
    g.fillEllipse(dX + dW / 2, y + h + 2, dW, 12)

    // Arched windows on facade (flanking door)
    for (const wOff of [-68, -40, 40, 68]) {
      const winX = x + w / 2 + wOff - 10
      const winY = y + h + 4
      g.fillStyle(0x3355aa, 0.55)
      g.fillRect(winX, winY, 18, 20)
      g.lineStyle(1, color, 0.5)
      g.strokeRect(winX, winY, 18, 20)
    }

    // Label "CITY LIBRARY" on roof
    this.add.text(x + w / 2, y + h / 2 - 4, "CITY\nLIBRARY", {
      fontSize: "10px",
      color: "#8899cccc",
      align: "center",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5)
  }

  private drawBankExterior(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    // Art deco green marble roof
    g.fillStyle(0x0d2a20, 0.95)
    g.fillRect(x, y, w, h)

    // Art deco grid
    g.lineStyle(1, 0x1a4a30, 0.4)
    for (let lx = x + 16; lx < x + w; lx += 16) g.lineBetween(lx, y, lx, y + h)
    for (let ly = y + 16; ly < y + h; ly += 16) g.lineBetween(x, ly, x + w, ly)

    // Art deco stepped crown (rooftop detail)
    g.fillStyle(color, 0.2)
    g.fillRect(x + 20, y - 10, w - 40, 10)
    g.fillRect(x + 40, y - 18, w - 80, 8)
    g.fillRect(x + 60, y - 24, w - 120, 6)

    // South facade
    g.fillStyle(0x081a12, 0.95)
    g.fillRect(x, y + h, w, FACADE)
    g.lineStyle(2, color, 0.7)
    g.strokeRect(x, y + h, w, FACADE)

    // Bank revolving door
    const dCX = x + w / 2
    g.fillStyle(0x66aa88, 0.3)
    g.fillCircle(dCX, y + h + FACADE / 2 + 2, 14)
    g.lineStyle(1, color, 0.5)
    g.strokeCircle(dCX, y + h + FACADE / 2 + 2, 14)
    g.lineStyle(1, color, 0.4)
    g.lineBetween(dCX - 14, y + h + FACADE / 2 + 2, dCX + 14, y + h + FACADE / 2 + 2)
    g.lineBetween(dCX, y + h + 2, dCX, y + h + FACADE + 2)

    // Windows on facade
    for (const wx of [-55, -25, 25, 55]) {
      g.fillStyle(color, 0.3)
      g.fillRect(x + w / 2 + wx - 9, y + h + 4, 18, 20)
      g.lineStyle(1, color, 0.6)
      g.strokeRect(x + w / 2 + wx - 9, y + h + 4, 18, 20)
    }

    this.add.text(x + w / 2, y + h / 2 - 4, "FIRST REALM\nBANK", {
      fontSize: "9px", color: "#10b98199", align: "center", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5)
  }

  private drawStandardExterior(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    g.fillStyle(color, 0.12)
    g.fillRect(x, y, w, h)
    g.lineStyle(1.5, color, 0.4)
    g.strokeRect(x, y, w, h)

    // Roof lines
    g.lineStyle(1, color, 0.08)
    for (let lx = x + 20; lx < x + w; lx += 20) g.lineBetween(lx, y, lx, y + h)
    for (let ly = y + 20; ly < y + h; ly += 20) g.lineBetween(x, ly, x + w, ly)

    // South facade
    g.fillStyle(color, 0.08)
    g.fillRect(x, y + h, w, FACADE)
    g.lineStyle(1, color, 0.3)
    g.strokeRect(x, y + h, w, FACADE)

    // Windows
    const numW = Math.floor(w / 52)
    const gap = (w - numW * 18) / (numW + 1)
    for (let i = 0; i < numW; i++) {
      const wx = x + gap + i * (18 + gap)
      g.fillStyle(color, 0.25)
      g.fillRect(wx, y + h + 5, 18, 18)
      g.lineStyle(1, color, 0.5)
      g.strokeRect(wx, y + h + 5, 18, 18)
    }

    // Center door
    g.fillStyle(color, 0.2)
    g.fillRect(x + w / 2 - 10, y + h + 2, 20, FACADE - 2)
    g.lineStyle(1, color, 0.4)
    g.strokeRect(x + w / 2 - 10, y + h + 2, 20, FACADE - 2)
  }

  private drawLockedBuilding(b: BuildingDef) {
    const g = this.add.graphics().setDepth(4)
    const { x, y, w, h, color } = b

    g.fillStyle(color, 0.04)
    g.fillRect(x, y, w, h + FACADE)
    g.lineStyle(1, color, 0.1)
    g.strokeRect(x, y, w, h + FACADE)

    // X-hatch (coming soon indicator)
    g.lineStyle(1, color, 0.04)
    for (let d = -h; d < w; d += 28) {
      g.lineBetween(x + Math.max(0, d), y, x + Math.min(w, d + h), y + Math.min(h, w - d))
    }

    this.add.text(x + w / 2, y + h / 2, "🔒", {
      fontSize: "24px",
    }).setOrigin(0.5).setDepth(5).setAlpha(0.2)

    this.add.text(x + w / 2, y + h + FACADE + 6, b.name, {
      fontSize: "10px", color: "#ffffff22", align: "center",
    }).setOrigin(0.5, 0).setDepth(5)

    this.add.text(x + w / 2, y + h / 2 + 20, "🔒", {
      fontSize: "14px",
    }).setOrigin(0.5).setDepth(5).setAlpha(0.2)
  }

  private drawTrees() {
    const g = this.add.graphics().setDepth(3)

    // Beach palm trees (west side)
    const beachPalms = [160, 280, 400, 620, 780, 900, 1050]
    for (const ty of beachPalms) {
      this.drawPalmTree(g, OCEAN_W + 30, ty)
    }

    // Park trees between building rows
    const parkTrees = [
      { x: 215, y: 490 }, { x: 240, y: 560 }, { x: 230, y: 640 },
      { x: 215, y: 760 }, { x: 240, y: 830 }, { x: 1140, y: 490 },
      { x: 1160, y: 580 }, { x: 1145, y: 760 }, { x: 1165, y: 840 },
      { x: 450, y: 480 }, { x: 700, y: 480 }, { x: 960, y: 480 },
      { x: 450, y: 760 }, { x: 700, y: 760 }, { x: 960, y: 760 },
    ]
    for (const t of parkTrees) {
      this.drawTree(g, t.x, t.y)
    }
  }

  private drawPalmTree(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Trunk (slightly tilted)
    g.lineStyle(3, 0x7a5a30, 0.8)
    g.lineBetween(x, y + 20, x - 4, y - 22)
    // Fronds
    g.lineStyle(2, 0x2d5e2d, 0.7)
    const fronds = [[-20, -30], [-10, -36], [2, -38], [14, -34], [20, -28], [-8, -28], [10, -26]]
    for (const [fx, fy] of fronds) {
      g.lineBetween(x - 4, y - 22, x - 4 + fx, y - 22 + fy)
    }
    g.fillStyle(0x5a3a10, 0.6)
    g.fillCircle(x - 4, y - 22, 4)
  }

  private drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.lineStyle(2, 0x5a3a20, 0.7)
    g.lineBetween(x, y + 14, x, y - 10)
    g.fillStyle(0x1a4a1a, 0.75)
    g.fillCircle(x, y - 14, 14)
    g.fillStyle(0x1e5a1e, 0.4)
    g.fillCircle(x - 6, y - 18, 9)
    g.fillCircle(x + 6, y - 18, 9)
  }

  // ── Player ───────────────────────────────────────────────────────────

  private createPlayer() {
    // Separate graphics for animated body parts
    this.leftLegGfx  = this.add.graphics()
    this.rightLegGfx = this.add.graphics()
    this.leftArmGfx  = this.add.graphics()
    this.rightArmGfx = this.add.graphics()
    const bodyGfx    = this.add.graphics()
    const nameLabel  = this.add.text(0, -34, this.displayName, {
      fontSize: "10px",
      color: "#ffffffcc",
      fontStyle: "bold",
      backgroundColor: "#00000077",
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1)

    this.redrawPlayer("s")

    this.player = this.add.container(800, 650, [
      this.leftLegGfx, this.rightLegGfx, this.leftArmGfx, this.rightArmGfx, bodyGfx, nameLabel,
    ])
    bodyGfx.setDepth(8)
    this.player.setDepth(10)

    this.physics.world.enable(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setCircle(12, -12, -12)
  }

  private redrawPlayer(dir: "n" | "s" | "e" | "w") {
    const lg = this.leftLegGfx
    const rg = this.rightLegGfx
    const la = this.leftArmGfx
    const ra = this.rightArmGfx

    lg.clear(); rg.clear(); la.clear(); ra.clear()

    // Shadow
    lg.fillStyle(0x000000, 0.3)
    lg.fillEllipse(0, 18, 28, 9)

    // Legs
    lg.fillStyle(0x1a2460)
    lg.fillRoundedRect(-8, 4, 7, 14, 3)   // left leg
    rg.fillStyle(0x1a2460)
    rg.fillRoundedRect(1, 4, 7, 14, 3)    // right leg

    // Arms
    la.fillStyle(0x4f46e5, 0.9)
    la.fillRoundedRect(-14, -8, 5, 12, 2)  // left arm
    ra.fillStyle(0x4f46e5, 0.9)
    ra.fillRoundedRect(9, -8, 5, 12, 2)   // right arm

    // Body
    la.fillStyle(0x4f46e5)
    la.fillRoundedRect(-9, -10, 18, 16, 4)

    // Head
    la.fillStyle(0xfbbf24)
    la.fillCircle(0, -20, 10)

    // Eyes based on direction
    la.fillStyle(0x1f2937)
    if (dir === "s") {
      la.fillCircle(-3, -20, 2)
      la.fillCircle(3, -20, 2)
    } else if (dir === "n") {
      // No eyes (facing away)
    } else if (dir === "e") {
      la.fillCircle(3, -21, 2)
    } else {
      la.fillCircle(-3, -21, 2)
    }

    // Hair
    la.fillStyle(0x92400e)
    la.fillEllipse(0, -28, 16, 8)
  }

  // ── Camera / Keys ────────────────────────────────────────────────────

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H)
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
    this.keys.e.on("down", () => {
      if (this.nearBuilding?.available) this.enterBuilding(this.nearBuilding)
    })
  }

  private createPrompt() {
    this.promptText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 50,
      "",
      { fontSize: "13px", color: "#ffffff", backgroundColor: "#1a1a2ecc", padding: { x: 14, y: 8 } }
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20).setAlpha(0)
  }

  private enterBuilding(b: BuildingDef) {
    this.cameras.main.flash(280, 255, 255, 255, false)
    this.time.delayedCall(300, () => {
      window.dispatchEvent(new CustomEvent("realm:enter-building", { detail: { href: b.href, id: b.id } }))
    })
  }

  // ── Update loop ──────────────────────────────────────────────────────

  update() {
    if (!this.playerBody) return

    const { up, down, left, right, w, s, a, d } = this.keys
    let vx = 0
    let vy = 0

    if (left.isDown || a.isDown)  { vx = -PLAYER_SPEED; this.facingDir = "w" }
    if (right.isDown || d.isDown) { vx =  PLAYER_SPEED; this.facingDir = "e" }
    if (up.isDown || w.isDown)    { vy = -PLAYER_SPEED; if (vx === 0) this.facingDir = "n" }
    if (down.isDown || s.isDown)  { vy =  PLAYER_SPEED; if (vx === 0) this.facingDir = "s" }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    const wasMoving = this.isMoving
    this.isMoving = vx !== 0 || vy !== 0

    this.playerBody.setVelocity(vx, vy)

    if (this.isMoving) {
      this.walkTick++
      const swing = Math.sin(this.walkTick * 0.25) * 10

      this.leftLegGfx.rotation  = swing * 0.06
      this.rightLegGfx.rotation = -swing * 0.06
      this.leftArmGfx.rotation  = -swing * 0.05
      this.rightArmGfx.rotation = swing * 0.05

      // Vertical bob
      const bob = Math.abs(Math.sin(this.walkTick * 0.25)) * 1.5
      this.player.y -= bob * 0.1

      if (!wasMoving) this.redrawPlayer(this.facingDir)
    } else {
      this.walkTick = 0
      this.leftLegGfx.rotation  = 0
      this.rightLegGfx.rotation = 0
      this.leftArmGfx.rotation  = 0
      this.rightArmGfx.rotation = 0
    }

    // Proximity check
    const px = this.player.x
    const py = this.player.y
    let closest: BuildingDef | null = null
    let closestDist = Infinity

    for (const b of BUILDINGS) {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h + FACADE   // proximity to door
      const dist = Phaser.Math.Distance.Between(px, py, cx, cy)
      if (dist < ENTER_RADIUS && dist < closestDist) {
        closestDist = dist
        closest = b
      }
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
  }
}
