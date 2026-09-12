import Phaser from "phaser"

// ── World ─────────────────────────────────────────────────────────────────
// Stylized San Diego: Pacific coast runs left edge, bay cuts in from south,
// downtown is center-south, Balboa Park north of downtown, Mission Bay
// northwest, La Jolla coast north, North County suburban sprawl upper half.
const WORLD_W = 3600
const WORLD_H = 3000
const PLAYER_SPEED = 220
const ENTER_RADIUS = 110

// ── Building definitions ──────────────────────────────────────────────────
interface BuildingDef {
  id: string
  name: string
  x: number; y: number; w: number; h: number
  color: number
  available: boolean
  href: string
  style?: "library" | "bank" | "standard"
  neighborhood: string
}

const FACADE = 30

const BUILDINGS: BuildingDef[] = [
  // ── Downtown Financial District ──
  { id: "bank",       name: "First Realm Bank",   x: 900,  y: 1830, w: 200, h: 150, color: 0x10b981, available: true,  href: "/buildings/bank",       style: "bank",     neighborhood: "Downtown" },
  { id: "government", name: "City Hall",           x: 760,  y: 1840, w: 160, h: 140, color: 0x64748b, available: false, href: "/buildings/government", style: "standard", neighborhood: "Downtown" },
  { id: "office",     name: "Police Department",   x: 1060, y: 1840, w: 160, h: 130, color: 0x334155, available: false, href: "/buildings/office",     style: "standard", neighborhood: "Downtown" },
  // ── Near Balboa Park ──
  { id: "library",    name: "City Library",        x: 900,  y: 1420, w: 210, h: 160, color: 0x3b82f6, available: true,  href: "/buildings/library",    style: "library",  neighborhood: "Balboa Park" },
  { id: "hospital",   name: "Realm Medical",       x: 720,  y: 1380, w: 175, h: 140, color: 0xef4444, available: false, href: "/buildings/hospital",   style: "standard", neighborhood: "Hillcrest" },
  // ── La Jolla / UCSD area ──
  { id: "university", name: "Realm University",    x: 565,  y: 490,  w: 210, h: 160, color: 0x8b5cf6, available: false, href: "/buildings/university", style: "standard", neighborhood: "La Jolla" },
  { id: "mall",       name: "The Mall (UTC)",      x: 700,  y: 390,  w: 190, h: 150, color: 0xec4899, available: false, href: "/buildings/mall",       style: "standard", neighborhood: "UTC" },
  // ── Pacific Beach ──
  { id: "gym",        name: "Iron District Gym",   x: 395,  y: 800,  w: 180, h: 140, color: 0xf97316, available: false, href: "/buildings/gym",        style: "standard", neighborhood: "Pacific Beach" },
  // ── North County ──
  { id: "home",       name: "Your Home",           x: 920,  y: 290,  w: 180, h: 140, color: 0xf59e0b, available: false, href: "/buildings/home",       style: "standard", neighborhood: "Carmel Valley" },
]

export class CityScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.Physics.Arcade.Body
  private legL!: Phaser.GameObjects.Graphics
  private legR!: Phaser.GameObjects.Graphics
  private body!: Phaser.GameObjects.Graphics
  private keys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; e: Phaser.Input.Keyboard.Key }
  private nearBuilding: BuildingDef | null = null
  private promptText!: Phaser.GameObjects.Text
  private displayName = "You"
  private walkTick = 0
  private facingDir: "n" | "s" | "e" | "w" = "s"
  private lastPosEmit = 0
  private teleportHandler!: EventListener

  constructor() { super({ key: "CityScene" }) }

  init(data: { displayName?: string }) {
    this.displayName = data.displayName ?? "You"
  }

  create() {
    this.drawMap()
    this.drawBuildings()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()

    // Reposition prompt on window resize
    this.scale.on("resize", () => {
      this.promptText?.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 50)
    })

    // Teleport listener — fired by MapHUD when user clicks a location
    this.teleportHandler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      this.player.x = x
      this.player.y = y
      this.cameras.main.flash(200, 0, 0, 0, false)
    }
    window.addEventListener("realm:teleport", this.teleportHandler)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAP LAYERS
  // ═══════════════════════════════════════════════════════════════════════

  private drawMap() {
    this.drawOcean()
    this.drawLand()
    this.drawSanDiegoBay()
    this.drawCoronado()
    this.drawMissionBay()
    this.drawParks()
    this.drawMountains()
    this.drawBeachEdge()
    this.drawFreeways()
    this.drawMajorRoads()
    this.drawDowntownGrid()
    this.drawResidentialRoads()
    this.drawMarina()
    this.drawCoronadoBridge()
    this.drawNeighborhoodLabels()
    this.drawBackgroundBuildings()
  }

  private drawOcean() {
    const g = this.add.graphics().setDepth(0)
    // Bright Pacific daylight ocean
    g.fillStyle(0x4db8e8)
    g.fillRect(0, 0, WORLD_W, WORLD_H)
    // Subtle wave shimmer (horizontal bands)
    for (let y = 0; y < WORLD_H; y += 24) {
      g.fillStyle(0x7ccef0, (y % 48 === 0) ? 0.3 : 0.12)
      g.fillRect(0, y, WORLD_W, 12)
    }
    // Animated sun sparkle overlay
    const shimmer = this.add.graphics().setDepth(1)
    shimmer.fillStyle(0xaae8ff, 0.18)
    for (let x = 20; x < 450; x += 40) {
      for (let y = 200; y < WORLD_H; y += 50) {
        shimmer.fillEllipse(x, y, 28, 7)
      }
    }
    this.tweens.add({ targets: shimmer, alpha: { from: 0.5, to: 1 }, duration: 2200, yoyo: true, repeat: -1 })
  }

  private drawLand() {
    const g = this.add.graphics().setDepth(2)

    // ── Main land polygon (San Diego coastal peninsula + inland) ──
    // Coastal points going N→S along the west edge, then east, then back
    const coastline = [
      // Northern edge (Del Mar / Torrey Pines)
      390, 200,
      // Torrey Pines cliffs
      340, 320,
      // La Jolla Shores
      295, 460,
      // La Jolla Cove
      278, 580,
      // Bird Rock / PB
      315, 700,
      // Pacific Beach
      370, 820,
      // Mission Beach (narrows)
      345, 940,
      // Ocean Beach
      330, 1050,
      // Point Loma shoulder
      295, 1180,
      // Point Loma tip
      255, 1360,
      // Shelter Island / harbor entrance
      360, 1560,
      // Embarcadero starts
      520, 1720,
      // Seaport Village / Convention Ctr
      680, 1810,
      // SE downtown waterfront
      820, 1900,
      // Bay curves south — now bay takes over, land goes east
      840, 2050,
      880, 2200,
      840, 2450,
      790, 2650,
      // Southeast (Chula Vista / border area)
      760, 3000,
      // Eastern border (mountains)
      3600, 3000,
      3600, 200,
    ]

    g.fillStyle(0xd4e8cc)
    g.fillPoints(this.numArrayToVec2(coastline), true)

    // Greener tint for residential / north county
    g.fillStyle(0xc2dba8, 0.5)
    g.fillRect(500, 200, 3000, 700)

    // Downtown slightly more urban/gray
    g.fillStyle(0xbcc4cc, 0.4)
    g.fillRect(680, 1750, 600, 350)
  }

  private drawSanDiegoBay() {
    const g = this.add.graphics().setDepth(3)

    // San Diego Bay — large enclosed bay east of Coronado, south of downtown
    const bay = [
      // Harbor entrance (north)
      360, 1560,
      500, 1640,
      // Embarcadero (downtown waterfront)
      540, 1720,
      630, 1790,
      730, 1850,
      820, 1900,
      840, 2050,
      880, 2200,
      840, 2450,
      790, 2650,
      // South bay
      760, 2820,
      680, 2900,
      // Coronado / Sweetwater area
      570, 2880,
      490, 2800,
      460, 2680,
      // Coronado NAS back
      420, 2500,
      395, 2380,
      380, 2200,
      // North Island tip
      370, 1980,
      355, 1760,
      // Back to harbor entrance
      360, 1560,
    ]

    // Bay base — bright bay blue
    g.fillStyle(0x3aaed8)
    g.fillPoints(this.numArrayToVec2(bay), true)

    // Bay shimmer ripples
    g.lineStyle(1, 0x7ccef0, 0.25)
    for (let y = 1600; y < 2900; y += 30) {
      g.lineBetween(380, y, 820, y)
    }

    // Bay shoreline
    g.lineStyle(2, 0x2a88cc, 0.45)
    g.strokePoints(this.numArrayToVec2(bay), true)
  }

  private drawCoronado() {
    const g = this.add.graphics().setDepth(4)

    // Coronado island + Silver Strand peninsula
    const coronado = [
      390, 2100,
      460, 2040,
      540, 2080,
      580, 2180,
      570, 2320,
      540, 2460,
      500, 2580,
      460, 2650,
      430, 2600,
      400, 2480,
      375, 2320,
      370, 2180,
    ]

    g.fillStyle(0xcedec8)
    g.fillPoints(this.numArrayToVec2(coronado), true)

    // Coronado streets (simple grid)
    g.lineStyle(4, 0xa8b4c0, 0.7)
    for (let gy = 2080; gy < 2600; gy += 45) {
      g.lineBetween(390, gy, 555, gy)
    }
    for (let gx = 400; gx < 560; gx += 50) {
      g.lineBetween(gx, 2060, gx, 2620)
    }

    // "CORONADO" label
    this.add.text(475, 2300, "CORONADO", {
      fontSize: "11px", color: "#2a6a5a99", fontStyle: "bold", letterSpacing: 2,
    }).setOrigin(0.5).setDepth(6).setAngle(-8)
  }

  private drawMissionBay() {
    const g = this.add.graphics().setDepth(3)

    // Mission Bay — oval-ish enclosed water body
    const bay = [
      355, 920,
      410, 870,
      490, 855,
      570, 880,
      620, 940,
      640, 1040,
      620, 1150,
      560, 1230,
      470, 1260,
      390, 1230,
      345, 1150,
      330, 1050,
      335, 970,
    ]

    g.fillStyle(0x3aaed8)
    g.fillPoints(this.numArrayToVec2(bay), true)

    // Mission Bay shimmer
    g.lineStyle(1, 0x7ccef0, 0.22)
    for (let y = 900; y < 1250; y += 25) {
      g.lineBetween(345, y, 620, y)
    }
    g.lineStyle(1.5, 0x2a88cc, 0.4)
    g.strokePoints(this.numArrayToVec2(bay), true)

    this.add.text(490, 1060, "MISSION\nBAY", {
      fontSize: "9px", color: "#1a5a8eaa", fontStyle: "bold", align: "center", letterSpacing: 1,
    }).setOrigin(0.5).setDepth(6)
  }

  private drawParks() {
    const g = this.add.graphics().setDepth(3)

    // ── Balboa Park (large, distinctive) ──
    g.fillStyle(0x4aad4a)
    // Irregular park shape
    const bpPoints = [
      840, 1290,  1000, 1270,  1150, 1290,
      1170, 1460, 1150, 1640,  1120, 1720,
      980, 1740,  850, 1720,   830, 1620,
      820, 1460,  830, 1360,
    ]
    g.fillPoints(this.numArrayToVec2(bpPoints), true)
    // Park roads (2 main roads through park)
    g.lineStyle(8, 0x9aaa90, 0.8)
    g.lineBetween(995, 1270, 985, 1740)   // Park Blvd
    g.lineBetween(840, 1510, 1150, 1490)  // El Prado
    // Park texture dots (darker trees)
    g.fillStyle(0x2d7a2d, 0.7)
    const treePositions = [
      870, 1340, 920, 1380, 970, 1320, 1040, 1360, 1100, 1310,
      860, 1480, 1060, 1490, 1130, 1450, 880, 1580, 950, 1620,
      1080, 1600, 880, 1680, 970, 1670, 1080, 1660,
    ]
    for (let i = 0; i < treePositions.length; i += 2) {
      g.fillCircle(treePositions[i], treePositions[i + 1], 18)
    }
    this.add.text(990, 1510, "BALBOA\nPARK", {
      fontSize: "13px", color: "#1a6a1acc", fontStyle: "bold", align: "center", letterSpacing: 2,
    }).setOrigin(0.5).setDepth(6)

    // ── Mission Bay Park (surrounding the bay) ──
    g.fillStyle(0x5ab85a, 0.7)
    g.fillRect(350, 860, 290, 60)
    g.fillRect(350, 1195, 280, 50)
    g.fillRect(350, 920, 40, 280)
    g.fillRect(600, 890, 50, 330)

    // ── Presidio Park ──
    g.fillStyle(0x4aad4a, 0.85)
    g.fillEllipse(660, 1180, 90, 70)

    // ── Small neighborhood parks ──
    for (const p of [
      { x: 440, y: 730, w: 55, h: 45 },
      { x: 830, y: 1090, w: 70, h: 55 },
      { x: 1200, y: 540, w: 60, h: 50 },
      { x: 950, y: 540, w: 65, h: 50 },
      { x: 1300, y: 800, w: 80, h: 60 },
    ]) {
      g.fillStyle(0x5ab85a, 0.8)
      g.fillRoundedRect(p.x, p.y, p.w, p.h, 6)
      g.lineStyle(1, 0x2a8a2a, 0.5)
      g.strokeRoundedRect(p.x, p.y, p.w, p.h, 6)
    }
  }

  private drawMountains() {
    const g = this.add.graphics().setDepth(2).setScrollFactor(0.2)

    // East mountains (visible when camera scrolls east)
    const peaks = [
      { x: 1900, h: 160, w: 280 }, { x: 2150, h: 210, w: 320 }, { x: 2430, h: 180, w: 260 },
      { x: 2660, h: 220, w: 300 }, { x: 2920, h: 190, w: 280 }, { x: 3180, h: 240, w: 320 },
    ]
    const BY = WORLD_H

    // Far range (hazy blue-gray)
    for (const p of peaks) {
      g.fillStyle(0xb8c8d8, 0.55)
      g.fillTriangle(p.x, BY, p.x + p.w / 2, BY - p.h * 1.3, p.x + p.w, BY)
    }
    // Near range (warmer brown-gray)
    for (const p of peaks) {
      g.fillStyle(0x9aaa9a, 0.8)
      g.fillTriangle(p.x + 30, BY, p.x + p.w / 2, BY - p.h, p.x + p.w - 30, BY)
      // Snow cap
      g.fillStyle(0xffffff, 0.7)
      g.fillTriangle(p.x + p.w * 0.3, BY - p.h * 0.72, p.x + p.w / 2, BY - p.h, p.x + p.w * 0.7, BY - p.h * 0.72)
    }
  }

  private drawBeachEdge() {
    const g = this.add.graphics().setDepth(4)

    // Sandy beach strip along the entire coastline
    const beachPoints = [
      390, 200, 345, 310, 300, 450, 283, 570, 318, 692, 375, 815,
      350, 938, 335, 1045, 300, 1175, 260, 1355, 368, 1555,
    ]
    // Sandy beach — bright golden
    g.lineStyle(22, 0xf0d060, 0.65)
    g.strokePoints(this.numArrayToVec2(beachPoints))

    g.lineStyle(10, 0xfae890, 0.5)
    g.strokePoints(this.numArrayToVec2(beachPoints))

    // Foam edge (white surf)
    g.lineStyle(3, 0xffffff, 0.6)
    g.strokePoints(this.numArrayToVec2(beachPoints))

    // Beach palm trees (north coast) — bright green fronds
    const bTrees = this.add.graphics().setDepth(5)
    for (const [bx, by] of [[420, 250], [410, 350], [400, 500], [380, 640], [420, 750], [400, 860]]) {
      bTrees.lineStyle(2, 0x8a6a30, 0.9)
      bTrees.lineBetween(bx, by + 14, bx - 3, by - 18)
      bTrees.fillStyle(0x3a8a3a, 0.85)
      for (const [fx, fy] of [[-18, -26], [-6, -34], [6, -32], [18, -26], [-6, -24], [12, -22]]) {
        bTrees.lineBetween(bx - 3, by - 18, bx - 3 + fx, by - 18 + fy)
      }
    }
  }

  private drawFreeways() {
    const g = this.add.graphics().setDepth(5)

    // I-5 (north-south backbone)
    // Runs parallel to coast, curves into downtown
    const i5 = new Phaser.Curves.Spline([
      845, 200,  848, 400,  851, 600,  855, 800,
      860, 1000, 865, 1200, 868, 1380,
      875, 1560, 870, 1700, 855, 1820,
      845, 1870, 830, 1920,
    ])
    // Freeway shadow
    g.lineStyle(26, 0x808898, 0.6)
    i5.draw(g, 128)
    // Main freeway lanes
    g.lineStyle(20, 0x9898b0, 0.95)
    i5.draw(g, 128)
    // Center stripe (white dashes implied)
    g.lineStyle(2, 0xffffff, 0.5)
    i5.draw(g, 128)
    // Freeway label
    this.add.text(862, 1100, "I-5", { fontSize: "9px", color: "#3a3a5599", fontStyle: "bold" }).setOrigin(0.5).setDepth(6)

    // I-8 (east-west through Mission Valley)
    const i8 = new Phaser.Curves.Spline([
      570, 1340,  700, 1330,  900, 1320,
      1100, 1320, 1400, 1325, 1700, 1330,
      2000, 1340, 2400, 1350,
    ])
    g.lineStyle(22, 0x808898, 0.55)
    i8.draw(g, 128)
    g.lineStyle(16, 0x9898b0, 0.9)
    i8.draw(g, 128)
    g.lineStyle(2, 0xffffff, 0.45)
    i8.draw(g, 128)
    this.add.text(1200, 1316, "I-8", { fontSize: "9px", color: "#3a3a5599", fontStyle: "bold" }).setOrigin(0.5).setDepth(6)

    // I-15 (inland freeway)
    const i15 = new Phaser.Curves.Spline([
      1450, 200,  1448, 500,  1445, 800,
      1445, 1100, 1445, 1400, 1450, 1700,
      1440, 2000,
    ])
    g.lineStyle(18, 0x808898, 0.5)
    i15.draw(g, 128)
    g.lineStyle(13, 0x9898b0, 0.85)
    i15.draw(g, 128)
    this.add.text(1453, 900, "I-15", { fontSize: "8px", color: "#3a3a5588", fontStyle: "bold" }).setOrigin(0.5).setDepth(6)

    // SR-163 (through Balboa Park — Cabrillo Freeway)
    const sr163 = new Phaser.Curves.Spline([
      960, 1060,  962, 1200,  964, 1350,
      966, 1500,  966, 1650,  958, 1760,
    ])
    g.lineStyle(14, 0x808898, 0.5)
    sr163.draw(g, 64)
    g.lineStyle(10, 0x9898b0, 0.85)
    sr163.draw(g, 64)

    // SR-56 (east-west north county)
    const sr56 = new Phaser.Curves.Spline([
      890, 490,  1000, 485,  1200, 488,  1500, 492,  1800, 498,
    ])
    g.lineStyle(12, 0x808898, 0.45)
    sr56.draw(g, 64)
    g.lineStyle(8, 0x9898b0, 0.8)
    sr56.draw(g, 64)
  }

  private drawMajorRoads() {
    const g = this.add.graphics().setDepth(6)

    // Pacific Coast Hwy (coastal road, curves with coastline)
    const pch = new Phaser.Curves.Spline([
      430, 200,  415, 340,  390, 480,  388, 620,
      420, 760,  440, 900,  410, 1020, 390, 1160,
    ])
    g.lineStyle(12, 0xa0a8b8, 0.9)
    pch.draw(g, 64)
    g.lineStyle(1.5, 0xffffff, 0.35)
    pch.draw(g, 64)

    // Harbor Drive (waterfront road)
    const harbor = new Phaser.Curves.Spline([
      375, 1580,  440, 1640,  530, 1710,
      640, 1770,  740, 1830,  800, 1880,
    ])
    g.lineStyle(14, 0xa0a8b8, 0.9)
    harbor.draw(g, 64)

    // Balboa Ave (east-west major)
    const balboa = new Phaser.Curves.Spline([
      390, 1040,  500, 1038,  640, 1045,
      780, 1055,  950, 1060,  1200, 1065,
      1500, 1070,
    ])
    g.lineStyle(10, 0xa0a8b8, 0.85)
    balboa.draw(g, 64)

    // Garnet Ave (Pacific Beach main street)
    const garnet = new Phaser.Curves.Spline([
      360, 820,  430, 818,  530, 822,  640, 820,  750, 820,
    ])
    g.lineStyle(9, 0xa0a8b8, 0.8)
    garnet.draw(g, 64)

    // Rosecrans St (Point Loma)
    const rosecrans = new Phaser.Curves.Spline([
      320, 1100,  380, 1140,  440, 1200,  500, 1280,  560, 1340,
    ])
    g.lineStyle(9, 0xa0a8b8, 0.8)
    rosecrans.draw(g, 64)

    // El Cajon Blvd (east from downtown)
    g.lineStyle(8, 0xa0a8b8, 0.75)
    g.lineBetween(900, 1760, 1600, 1760)

    // Washington St / University Ave
    const univAve = new Phaser.Curves.Spline([
      720, 1380,  820, 1375,  960, 1370,
      1100, 1370, 1300, 1375,
    ])
    g.lineStyle(8, 0xa0a8b8, 0.75)
    univAve.draw(g, 64)

    // Genesee Ave (UTC to La Jolla)
    const genesee = new Phaser.Curves.Spline([
      700, 380,  695, 480,  688, 580,
      680, 700,  670, 840,  665, 960,
      660, 1080, 660, 1200, 660, 1380,
    ])
    g.lineStyle(9, 0xa0a8b8, 0.8)
    genesee.draw(g, 64)

    // Miramar Rd
    g.lineStyle(8, 0xa0a8b8, 0.7)
    g.lineBetween(840, 680, 1600, 685)

    // Torrey Pines Rd (La Jolla)
    const tpRd = new Phaser.Curves.Spline([
      380, 440,  420, 500,  490, 560,
      560, 620,  620, 700,  640, 800,
    ])
    g.lineStyle(8, 0xa0a8b8, 0.7)
    tpRd.draw(g, 64)
  }

  private drawDowntownGrid() {
    const g = this.add.graphics().setDepth(7)

    // Downtown San Diego has a slightly angled grid
    // Runs roughly NW to SE
    const dtOriginX = 720
    const dtOriginY = 1760
    const dtW = 480
    const dtH = 320

    // Main cross streets (horizontal, slightly diagonal)
    const streets = ["A St", "B St", "C St", "Broadway", "E St", "F St", "Market"]
    for (let i = 0; i < 7; i++) {
      const y = dtOriginY + i * 44
      const offset = i * 3
      g.lineStyle(9, 0x9090a8, 0.9)
      g.lineBetween(dtOriginX - offset, y, dtOriginX + dtW - offset, y)
      g.lineStyle(1, 0xffffff, 0.3)
      g.lineBetween(dtOriginX - offset, y, dtOriginX + dtW - offset, y)
    }

    // Numbered/lettered avenues (vertical in downtown)
    for (let i = 0; i < 8; i++) {
      const x = dtOriginX + i * 58
      g.lineStyle(9, 0x9090a8, 0.9)
      g.lineBetween(x, dtOriginY - 20, x, dtOriginY + dtH + 20)
      g.lineStyle(1, 0xffffff, 0.28)
      g.lineBetween(x, dtOriginY - 20, x, dtOriginY + dtH + 20)
    }

    // Sidewalk texture
    g.lineStyle(1, 0xb8b8cc, 0.35)
    for (let i = 0; i < 7; i++) {
      g.lineBetween(dtOriginX, dtOriginY + i * 44 + 5, dtOriginX + dtW, dtOriginY + i * 44 + 5)
    }

    // Gaslamp district (south downtown — slightly denser)
    g.lineStyle(7, 0x9090a8, 0.85)
    for (let i = 0; i < 4; i++) {
      const y = dtOriginY + 180 + i * 32
      g.lineBetween(dtOriginX + 60, y, dtOriginX + 340, y)
    }

    // Broadway label
    this.add.text(910, 1880, "Broadway", { fontSize: "8px", color: "#3a3a55aa", fontStyle: "italic" }).setOrigin(0.5).setDepth(8).setAngle(-1)
  }

  private drawResidentialRoads() {
    const g = this.add.graphics().setDepth(5)

    // ── North County subdivision roads (curving, organic) ──
    const ncRoads = [
      // Carmel Valley curves
      [720, 280,  800, 295,  890, 290,  970, 285,  1060, 290,  1140, 302],
      [720, 340,  810, 350,  920, 348,  1010, 342,  1100, 348,  1200, 355],
      [720, 400,  820, 406,  930, 402,  1040, 398,  1150, 404,  1280, 415],
      [730, 460,  840, 458,  960, 452,  1080, 455,  1200, 460,  1350, 470],
      // Del Mar / Solana Beach
      [360, 240,  420, 248,  490, 245,  550, 250],
      [360, 290,  440, 295,  520, 290,  590, 298],
      // La Jolla residential
      [295, 520,  360, 528,  440, 535,  510, 528,  570, 540],
      [295, 590,  370, 594,  450, 590,  530, 598,  600, 602],
      [300, 650,  390, 655,  480, 651,  560, 660,  640, 668],
      // Pacific Beach grid
      [360, 710,  440, 712,  530, 714,  630, 712,  730, 710],
      [360, 760,  440, 762,  530, 762,  640, 760],
      [410, 710,  412, 760,  414, 820,  416, 880,  416, 950],
      [470, 710,  472, 760,  474, 820,  476, 920],
      [530, 714,  532, 762,  534, 820],
      // Hillcrest / North Park
      [730, 1140,  820, 1138,  910, 1136,  1010, 1138,  1100, 1140],
      [730, 1190,  840, 1188,  940, 1186,  1040, 1190],
      [730, 1240,  840, 1238,  940, 1238],
      [740, 1140,  742, 1200,  744, 1250],
      [800, 1140,  802, 1200,  802, 1250],
      [870, 1140,  868, 1200,  868, 1250],
      [940, 1140,  938, 1200,  938, 1250],
    ]

    g.lineStyle(6, 0xb0b8c8, 0.8)
    for (const road of ncRoads) {
      const spline = new Phaser.Curves.Spline(road)
      spline.draw(g, 32)
    }

    // North County inland grid (less organic, larger blocks)
    g.lineStyle(6, 0xb0b8c8, 0.65)
    for (let rx = 1200; rx < 2400; rx += 120) {
      g.lineBetween(rx, 200, rx, 780)
    }
    for (let ry = 250; ry < 780; ry += 90) {
      g.lineBetween(1200, ry, 2400, ry)
    }
  }

  private drawMarina() {
    const g = this.add.graphics().setDepth(5)

    // Embarcadero marina (downtown waterfront)
    const mx = 590, my = 1740
    g.fillStyle(0x3aaed8, 0.85)
    g.fillRect(mx, my, 180, 90)

    // Boat slips
    g.lineStyle(2, 0x1a78aa, 0.6)
    for (let i = 0; i < 8; i++) {
      g.lineBetween(mx + 10 + i * 20, my, mx + 10 + i * 20, my + 80)
    }
    g.lineBetween(mx, my + 40, mx + 180, my + 40)

    // Boats (bright white hulls)
    g.fillStyle(0xfff8e8, 0.85)
    for (let i = 0; i < 7; i++) {
      g.fillRect(mx + 13 + i * 20, my + 44, 8, 28)
    }

    this.add.text(mx + 90, my - 14, "EMBARCADERO", { fontSize: "8px", color: "#1a5a8eaa", fontStyle: "bold", letterSpacing: 1 }).setOrigin(0.5).setDepth(7)
  }

  private drawCoronadoBridge() {
    const g = this.add.graphics().setDepth(6)

    // Coronado Bridge — iconic arch bridge
    // Connects downtown (x≈780, y≈2050) to Coronado (x≈470, y≈2200)
    const bridgePoints = [
      { x: 790, y: 2060 }, { x: 750, y: 2080 }, { x: 700, y: 2110 },
      { x: 650, y: 2140 }, { x: 600, y: 2160 }, { x: 550, y: 2175 },
      { x: 500, y: 2185 }, { x: 470, y: 2200 },
    ]

    const bvec = bridgePoints.map((p) => new Phaser.Math.Vector2(p.x, p.y))
    // Bridge shadow
    g.lineStyle(14, 0x7080a0, 0.35)
    g.strokePoints(bvec)
    // Bridge deck (steel gray-blue)
    g.lineStyle(10, 0x8898bc, 0.95)
    g.strokePoints(bvec)
    // Bridge railing
    g.lineStyle(2, 0xb0bcd8, 0.6)
    g.strokePoints(bvec)
    // Tower supports
    for (const { x, y } of [{ x: 700, y: 2110 }, { x: 580, y: 2165 }]) {
      g.lineStyle(3, 0x8898bc, 0.75)
      g.lineBetween(x, y - 30, x, y + 30)
      // Cables
      for (let i = -5; i <= 5; i++) {
        g.lineStyle(1, 0x8898bc, 0.35)
        g.lineBetween(x, y - 28, x + i * 20, y + 12)
      }
    }

    this.add.text(635, 2140, "Coronado Bridge", { fontSize: "8px", color: "#4a5a8acc", fontStyle: "italic" }).setOrigin(0.5).setDepth(7).setAngle(-14)
  }

  private drawNeighborhoodLabels() {
    const labels = [
      { text: "DOWNTOWN",       x: 910,  y: 1990, size: "14px", color: "#2a4a6acc", angle: 0 },
      { text: "GASLAMP",        x: 880,  y: 2070, size: "9px",  color: "#2a4a6aaa", angle: 0 },
      { text: "HILLCREST",      x: 820,  y: 1280, size: "10px", color: "#2a5a2acc", angle: 0 },
      { text: "NORTH PARK",     x: 1060, y: 1300, size: "9px",  color: "#2a5a2aaa", angle: 0 },
      { text: "MISSION VALLEY", x: 1100, y: 1340, size: "9px",  color: "#3a3a6aaa", angle: 0 },
      { text: "PACIFIC BEACH",  x: 450,  y: 750,  size: "10px", color: "#1a5a6acc", angle: 0 },
      { text: "OCEAN BEACH",    x: 400,  y: 1050, size: "9px",  color: "#1a5a6aaa", angle: 0 },
      { text: "POINT LOMA",     x: 320,  y: 1260, size: "9px",  color: "#1a5a6aaa", angle: -15 },
      { text: "LA JOLLA",       x: 380,  y: 550,  size: "11px", color: "#2a5a4acc", angle: 0 },
      { text: "UTC",            x: 750,  y: 350,  size: "9px",  color: "#3a3a6aaa", angle: 0 },
      { text: "CARMEL VALLEY",  x: 1000, y: 250,  size: "9px",  color: "#3a5a2aaa", angle: 0 },
      { text: "DEL MAR",        x: 430,  y: 280,  size: "9px",  color: "#2a5a3aaa", angle: 0 },
      { text: "MIRAMAR",        x: 1200, y: 660,  size: "9px",  color: "#3a3a4aaa", angle: 0 },
      { text: "NORTH COUNTY",   x: 1700, y: 420,  size: "12px", color: "#3a4a2acc", angle: 0 },
      { text: "EAST COUNTY",    x: 2400, y: 1200, size: "12px", color: "#3a3a2aaa", angle: 0 },
      { text: "NATIONAL CITY",  x: 870,  y: 2500, size: "9px",  color: "#3a3a4aaa", angle: 0 },
    ]

    for (const l of labels) {
      this.add.text(l.x, l.y, l.text, {
        fontSize: l.size, color: l.color, fontStyle: "bold", letterSpacing: 2,
      }).setOrigin(0.5).setDepth(7).setAngle(l.angle)
    }
  }

  private drawBackgroundBuildings() {
    const g = this.add.graphics().setDepth(4)

    // Downtown blocks (dense urban fabric)
    const dtBlocks = [
      [730, 1775, 50, 60], [790, 1775, 60, 60], [860, 1775, 50, 60],
      [730, 1900, 55, 55], [840, 1930, 50, 45],
      [1030, 1775, 60, 65], [1100, 1775, 55, 55], [1160, 1775, 50, 55],
      [1030, 1870, 60, 50], [1100, 1870, 70, 50],
      [730, 2000, 55, 50], [800, 2020, 50, 45], [1060, 2010, 60, 50],
      [730, 2080, 55, 45], [1060, 2080, 60, 45],
    ]
    for (const [x, y, w, h] of dtBlocks) {
      g.fillStyle(0xdce0e8, 0.9)
      g.fillRect(x, y, w, h)
      g.lineStyle(0.5, 0xa8b0bc, 0.5)
      g.strokeRect(x, y, w, h)
    }

    // Hillcrest / residential blocks
    for (let bx = 740; bx < 1200; bx += 70) {
      for (let by = 1130; by < 1400; by += 65) {
        if (Math.random() > 0.35) {
          const bw = 35 + Math.floor(Math.sin(bx * by) * 8 + 8)
          const bh = 30 + Math.floor(Math.cos(bx + by) * 6 + 6)
          g.fillStyle(0xe0e8d8, 0.7)
          g.fillRect(bx, by, bw, bh)
        }
      }
    }

    // North County sparse residential (houses)
    for (let bx = 750; bx < 1400; bx += 85) {
      for (let by = 230; by < 550; by += 75) {
        if (Math.random() > 0.4) {
          g.fillStyle(0xf0f4ec, 0.8)
          g.fillRect(bx, by, 28, 24)
          // Roof peak (warm terracotta/red)
          g.lineStyle(1, 0xc06040, 0.6)
          g.lineBetween(bx, by, bx + 14, by - 8)
          g.lineBetween(bx + 14, by - 8, bx + 28, by)
        }
      }
    }

    // La Jolla / Pacific Beach medium density
    for (let bx = 400; bx < 760; bx += 65) {
      for (let by = 480; by < 950; by += 60) {
        if (Math.random() > 0.45) {
          g.fillStyle(0xe8f0e8, 0.65)
          g.fillRect(bx, by, 30, 26)
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LANDMARK BUILDINGS
  // ═══════════════════════════════════════════════════════════════════════

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
    const g = this.add.graphics().setDepth(9)
    const { x, y, w, h, color } = b

    // Shadow (soft daylight shadow)
    g.fillStyle(0x000000, 0.18)
    g.fillRect(x + 8, y + 8, w, h + FACADE)

    if (b.style === "library") {
      this.drawLibraryExterior(g, x, y, w, h, color)
    } else if (b.style === "bank") {
      this.drawBankExterior(g, x, y, w, h, color)
    } else {
      this.drawStandardExterior(g, x, y, w, h, color)
    }

    // Outer glow
    g.lineStyle(2, color, 0.5)
    g.strokeRect(x - 4, y - 4, w + 8, h + FACADE + 8)

    // OPEN badge
    const badge = this.add.text(x + w / 2, y - 12, "● OPEN", {
      fontSize: "8px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold",
      backgroundColor: "#ffffffcc", padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(10)
    this.tweens.add({ targets: badge, alpha: { from: 1, to: 0.3 }, duration: 1400, yoyo: true, repeat: -1 })

    this.add.text(x + w / 2, y + h + FACADE + 6, b.name, {
      fontSize: "10px", color: "#1a2a3acc", align: "center", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(10)

    this.add.text(x + w / 2, y + h + FACADE + 18, b.neighborhood, {
      fontSize: "8px", color: "#3a4a5a88", align: "center",
    }).setOrigin(0.5, 0).setDepth(10)
  }

  private drawLibraryExterior(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    // Marble body — bright cream white
    g.fillStyle(0xf4f0e8, 1)
    g.fillRect(x, y, w, h)
    g.lineStyle(1, 0xd8cfc0, 0.5)
    for (let lx = x + 20; lx < x + w; lx += 20) g.lineBetween(lx, y, lx, y + h)
    for (let ly = y + 20; ly < y + h; ly += 20) g.lineBetween(x, ly, x + w, ly)
    // Pediment (blue)
    g.fillStyle(0x4a6ab8, 0.85)
    g.fillTriangle(x + w * 0.15, y, x + w / 2, y - 28, x + w * 0.85, y)
    g.lineStyle(2, color, 0.9)
    g.strokeTriangle(x + w * 0.15, y, x + w / 2, y - 28, x + w * 0.85, y)
    // Columns (bright white with shadow)
    for (let i = 0; i <= 7; i++) {
      const cx = x + 12 + (i * (w - 24)) / 7
      g.fillStyle(0xffffff, 1)
      g.fillRect(cx - 4, y + h - 16, 8, 16)
      g.lineStyle(1, 0xc8d0e0, 0.6)
      g.strokeRect(cx - 4, y + h - 16, 8, 16)
    }
    // South facade
    g.fillStyle(0xeceaf4, 1)
    g.fillRect(x, y + h, w, FACADE + 12)
    g.lineStyle(2, color, 0.75)
    g.strokeRect(x, y + h, w, FACADE + 12)
    for (let i = 0; i <= 7; i++) {
      const cx = x + 12 + (i * (w - 24)) / 7
      g.lineStyle(1.5, 0x8899cc, 0.5)
      g.lineBetween(cx, y + h, cx, y + h + FACADE + 12)
    }
    // Steps
    g.fillStyle(0xd8d4e8, 0.9)
    g.fillRect(x + 8, y + h + FACADE + 12, w - 16, 7)
    // Doors (blue glass)
    const dX = x + w / 2 - 13
    g.fillStyle(0x6688dd, 0.7)
    g.fillRect(dX, y + h + 3, 12, FACADE + 4)
    g.fillRect(dX + 14, y + h + 3, 12, FACADE + 4)
    g.lineStyle(1, color, 0.8)
    g.strokeRect(dX, y + h + 3, 26, FACADE + 4)
    this.add.text(x + w / 2, y + h / 2, "CITY\nLIBRARY", {
      fontSize: "9px", color: "#3a5a9acc", align: "center", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(10)
  }

  private drawBankExterior(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    // Light mint-white building
    g.fillStyle(0xedfff6, 1)
    g.fillRect(x, y, w, h)
    g.lineStyle(1, 0xb8e8cc, 0.5)
    for (let lx = x + 16; lx < x + w; lx += 16) g.lineBetween(lx, y, lx, y + h)
    for (let ly = y + 16; ly < y + h; ly += 16) g.lineBetween(x, ly, x + w, ly)
    // Art deco crown (green)
    g.fillStyle(color, 0.6)
    g.fillRect(x + 20, y - 10, w - 40, 10)
    g.fillRect(x + 38, y - 18, w - 76, 8)
    g.fillRect(x + 56, y - 24, w - 112, 6)
    // Facade
    g.fillStyle(0xe0f8ec, 1)
    g.fillRect(x, y + h, w, FACADE)
    g.lineStyle(2, color, 0.8)
    g.strokeRect(x, y + h, w, FACADE)
    // Revolving door
    g.fillStyle(0x88ddaa, 0.45)
    g.fillCircle(x + w / 2, y + h + FACADE / 2 + 2, 13)
    g.lineStyle(1, color, 0.7)
    g.strokeCircle(x + w / 2, y + h + FACADE / 2 + 2, 13)
    g.lineStyle(1, color, 0.5)
    g.lineBetween(x + w / 2 - 13, y + h + FACADE / 2 + 2, x + w / 2 + 13, y + h + FACADE / 2 + 2)
    g.lineBetween(x + w / 2, y + h + 2, x + w / 2, y + h + FACADE + 2)
    // Windows
    for (const wx of [-50, -22, 22, 50]) {
      g.fillStyle(color, 0.25)
      g.fillRect(x + w / 2 + wx - 9, y + h + 4, 18, 18)
      g.lineStyle(1, color, 0.6)
      g.strokeRect(x + w / 2 + wx - 9, y + h + 4, 18, 18)
    }
    this.add.text(x + w / 2, y + h / 2, "FIRST REALM\nBANK", {
      fontSize: "9px", color: "#0d7a4acc", align: "center", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(10)
  }

  private drawStandardExterior(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    // Light warm-white building
    g.fillStyle(0xf4f4f0, 1)
    g.fillRect(x, y, w, h)
    g.lineStyle(1.5, color, 0.5)
    g.strokeRect(x, y, w, h)
    g.lineStyle(1, color, 0.12)
    for (let lx = x + 18; lx < x + w; lx += 18) g.lineBetween(lx, y, lx, y + h)
    g.fillStyle(0xeeeef0, 1)
    g.fillRect(x, y + h, w, FACADE)
    g.lineStyle(1, color, 0.45)
    g.strokeRect(x, y + h, w, FACADE)
    const numW = Math.floor(w / 50)
    const gap = (w - numW * 16) / (numW + 1)
    for (let i = 0; i < numW; i++) {
      const wx = x + gap + i * (16 + gap)
      g.fillStyle(color, 0.3)
      g.fillRect(wx, y + h + 5, 16, 16)
      g.lineStyle(1, color, 0.55)
      g.strokeRect(wx, y + h + 5, 16, 16)
    }
    g.fillStyle(color, 0.25)
    g.fillRect(x + w / 2 - 9, y + h + 3, 18, FACADE - 3)
    g.lineStyle(1, color, 0.5)
    g.strokeRect(x + w / 2 - 9, y + h + 3, 18, FACADE - 3)
  }

  private drawLockedBuilding(b: BuildingDef) {
    const g = this.add.graphics().setDepth(8)
    const { x, y, w, h, color } = b
    g.fillStyle(0xe8e8ee, 0.85)
    g.fillRect(x, y, w, h + FACADE)
    g.lineStyle(1, color, 0.2)
    g.strokeRect(x, y, w, h + FACADE)
    g.lineStyle(1, color, 0.07)
    for (let d = -(h + FACADE); d < w; d += 30) {
      const sx = x + Math.max(0, d)
      const sy = y + Math.max(0, -d)
      const ex = x + Math.min(w, d + h + FACADE)
      const ey = y + Math.max(0, -d) + (ex - sx)
      g.lineBetween(sx, sy, ex, ey)
    }
    this.add.text(x + w / 2, y + h / 2 - 5, "🔒", { fontSize: "18px" }).setOrigin(0.5).setDepth(9).setAlpha(0.35)
    this.add.text(x + w / 2, y + h + FACADE + 6, b.name, {
      fontSize: "9px", color: "#3a3a5a66", align: "center",
    }).setOrigin(0.5, 0).setDepth(9)
    this.add.text(x + w / 2, y + h + FACADE + 17, b.neighborhood, {
      fontSize: "8px", color: "#3a3a5a44", align: "center",
    }).setOrigin(0.5, 0).setDepth(9)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYER
  // ═══════════════════════════════════════════════════════════════════════

  private createPlayer() {
    this.legL  = this.add.graphics()
    this.legR  = this.add.graphics()
    this.body  = this.add.graphics()

    this.drawPlayerSprite("s")

    const nameLabel = this.add.text(0, -36, this.displayName, {
      fontSize: "10px", color: "#ffffffcc", fontStyle: "bold",
      backgroundColor: "#00000077", padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1)

    this.player = this.add.container(920, 1870, [this.legL, this.legR, this.body, nameLabel])
    this.player.setDepth(20)

    this.physics.world.enable(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setCircle(12, -12, -12)
  }

  private drawPlayerSprite(dir: "n" | "s" | "e" | "w") {
    this.legL.clear()
    this.legR.clear()
    this.body.clear()

    // Shadow
    this.legL.fillStyle(0x000000, 0.3)
    this.legL.fillEllipse(0, 20, 28, 10)

    // Legs
    this.legL.fillStyle(0x1a2460)
    this.legL.fillRoundedRect(-8, 4, 7, 14, 3)
    this.legR.fillStyle(0x1a2460)
    this.legR.fillRoundedRect(1, 4, 7, 14, 3)

    // Body
    this.body.fillStyle(0x4f46e5)
    this.body.fillRoundedRect(-9, -10, 18, 16, 4)
    // Arms
    this.body.fillStyle(0x4f46e5, 0.9)
    this.body.fillRoundedRect(-14, -8, 5, 12, 2)
    this.body.fillRoundedRect(9, -8, 5, 12, 2)

    // Head
    this.body.fillStyle(0xfbbf24)
    this.body.fillCircle(0, -22, 10)
    // Hair
    this.body.fillStyle(0x92400e)
    this.body.fillEllipse(0, -30, 16, 8)

    // Eyes (direction-aware)
    this.body.fillStyle(0x1f2937)
    if (dir === "s") { this.body.fillCircle(-3, -22, 2); this.body.fillCircle(3, -22, 2) }
    else if (dir === "n") { /* facing away */ }
    else if (dir === "e") { this.body.fillCircle(4, -23, 2) }
    else                  { this.body.fillCircle(-4, -23, 2) }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════════════

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
      { fontSize: "13px", color: "#1a1a3e", backgroundColor: "#ffffffee", padding: { x: 14, y: 8 } }
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(30).setAlpha(0)
  }

  private enterBuilding(b: BuildingDef) {
    this.cameras.main.flash(280, 255, 255, 255, false)
    this.time.delayedCall(300, () => {
      window.dispatchEvent(new CustomEvent("realm:enter-building", { detail: { href: b.href, id: b.id } }))
    })
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════════════════════════════

  private numArrayToVec2(arr: number[]): Phaser.Math.Vector2[] {
    const out: Phaser.Math.Vector2[] = []
    for (let i = 0; i < arr.length; i += 2) {
      out.push(new Phaser.Math.Vector2(arr[i], arr[i + 1]))
    }
    return out
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UPDATE LOOP
  // ═══════════════════════════════════════════════════════════════════════

  update() {
    if (!this.playerBody) return

    const { up, down, left, right, w, s, a, d } = this.keys
    let vx = 0, vy = 0
    let newDir = this.facingDir

    if (left.isDown || a.isDown)  { vx = -PLAYER_SPEED; newDir = "w" }
    if (right.isDown || d.isDown) { vx =  PLAYER_SPEED; newDir = "e" }
    if (up.isDown || w.isDown)    { vy = -PLAYER_SPEED; if (vx === 0) newDir = "n" }
    if (down.isDown || s.isDown)  { vy =  PLAYER_SPEED; if (vx === 0) newDir = "s" }
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
      this.body.rotation =  swing * 0.01
    } else {
      this.walkTick = 0
      this.legL.rotation = 0
      this.legR.rotation = 0
      this.body.rotation = 0
    }

    // Proximity check — detect closest building door
    const px = this.player.x
    const py = this.player.y
    let closest: BuildingDef | null = null
    let closestDist = Infinity

    for (const b of BUILDINGS) {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h + FACADE
      const dist = Phaser.Math.Distance.Between(px, py, cx, cy)
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

    // Emit player position to MapHUD (throttled to ~80 ms)
    if (this.time.now - this.lastPosEmit > 80) {
      this.lastPosEmit = this.time.now
      window.dispatchEvent(new CustomEvent("realm:player-position", {
        detail: { x: this.player.x, y: this.player.y },
      }))
    }
  }

  // Clean up global listener when scene shuts down
  shutdown() {
    if (this.teleportHandler) window.removeEventListener("realm:teleport", this.teleportHandler)
  }
}
