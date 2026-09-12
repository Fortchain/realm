import Phaser from "phaser"

const W = 1000
const H = 820
const PLAYER_SPEED = 185
const ZONE_RADIUS = 90

export type LibraryZone = "professor" | "tables" | "books" | "exit" | null

interface ZoneDef {
  id: LibraryZone
  cx: number
  cy: number
  label: string
  prompt: string
}

const ZONES: ZoneDef[] = [
  { id: "professor", cx: 175,  cy: 210, label: "Professor's Corner", prompt: "[E]  Talk to Prof. Elena Vasquez" },
  { id: "books",     cx: 820,  cy: 240, label: "Book Stacks",        prompt: "[E]  Browse & Research Books"    },
  { id: "tables",    cx: 500,  cy: 470, label: "Study Tables",       prompt: "[E]  Study or Collaborate"      },
  { id: "exit",      cx: 500,  cy: 760, label: "Exit",               prompt: "[E]  Leave the Library"         },
]

export class LibraryInteriorScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.Physics.Arcade.Body
  private leftLegGfx!: Phaser.GameObjects.Graphics
  private rightLegGfx!: Phaser.GameObjects.Graphics
  private bodyGfx!: Phaser.GameObjects.Graphics
  private keys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; e: Phaser.Input.Keyboard.Key }
  private nearZone: ZoneDef | null = null
  private promptText!: Phaser.GameObjects.Text
  private displayName = "You"
  private walkTick = 0
  private zoneHighlights: Map<string, Phaser.GameObjects.Graphics> = new Map()

  constructor() {
    super({ key: "LibraryInteriorScene" })
  }

  init(data: { displayName?: string }) {
    this.displayName = data.displayName ?? "You"
  }

  create() {
    this.cameras.main.setBackgroundColor("#0e0c14")
    this.drawInterior()
    this.createZoneHighlights()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()
  }

  // ── Interior Drawing ─────────────────────────────────────────────────

  private drawInterior() {
    this.drawFloor()
    this.drawWalls()
    this.drawProfessorsCorner()
    this.drawBookStacks()
    this.drawStudyTables()
    this.drawEntranceArea()
    this.drawCeiling()
  }

  private drawFloor() {
    const g = this.add.graphics().setDepth(0)

    // Base floor (dark wood)
    g.fillStyle(0x1a1008)
    g.fillRect(30, 0, W - 60, H - 30)

    // Wood planks (horizontal)
    for (let y = 40; y < H - 30; y += 22) {
      const shade = (Math.floor(y / 22) % 3 === 0) ? 0x221408 : (Math.floor(y / 22) % 3 === 1) ? 0x1e1208 : 0x181008
      g.fillStyle(shade)
      g.fillRect(30, y, W - 60, 21)
    }
    g.lineStyle(1, 0x000000, 0.25)
    for (let y = 40; y < H - 30; y += 22) {
      g.lineBetween(30, y, W - 30, y)
    }
    // Cross planks every 200px
    g.lineStyle(1, 0x000000, 0.15)
    for (let x = 230; x < W - 30; x += 200) {
      g.lineBetween(x, 40, x, H - 30)
    }

    // Rugs
    g.fillStyle(0x1a1a40, 0.6)
    g.fillRoundedRect(60, 120, 230, 200, 8)   // professor rug
    g.fillStyle(0x2a0a1a, 0.5)
    g.fillRoundedRect(360, 340, 280, 200, 8)  // study rug
    g.fillStyle(0x0a1a10, 0.5)
    g.fillRoundedRect(660, 80, 270, 320, 8)   // books rug

    // Rug borders
    g.lineStyle(1, 0x3a3a60, 0.5)
    g.strokeRoundedRect(60, 120, 230, 200, 8)
    g.lineStyle(1, 0x5a1a2a, 0.4)
    g.strokeRoundedRect(360, 340, 280, 200, 8)
    g.lineStyle(1, 0x1a4a2a, 0.4)
    g.strokeRoundedRect(660, 80, 270, 320, 8)
  }

  private drawWalls() {
    const g = this.add.graphics().setDepth(0)

    // North wall
    g.fillStyle(0x1e1a2e)
    g.fillRect(30, 0, W - 60, 42)

    // South wall (entry wall)
    g.fillStyle(0x1e1a2e)
    g.fillRect(30, H - 32, W - 60, 32)

    // West wall
    g.fillStyle(0x1e1a2e)
    g.fillRect(0, 0, 32, H)

    // East wall
    g.fillStyle(0x1e1a2e)
    g.fillRect(W - 32, 0, 32, H)

    // Wall trim
    g.lineStyle(2, 0x3b82f6, 0.3)
    g.strokeRect(32, 0, W - 64, H - 30)

    // Wall sconces (light fixtures)
    for (const sx of [120, 420, 720]) {
      this.drawSconce(g, sx, 30)
    }
    for (const sx of [230, 530, 830]) {
      this.drawSconce(g, sx, H - 28)
    }

    // Tall windows on north wall
    for (const wx of [180, 380, 580, 780]) {
      g.fillStyle(0x1a2040, 0.5)
      g.fillRoundedRect(wx - 18, 2, 36, 32, 4)
      g.lineStyle(1, 0x4466aa, 0.4)
      g.strokeRoundedRect(wx - 18, 2, 36, 32, 4)
      // Window reflection
      g.fillStyle(0x6688bb, 0.15)
      g.fillRect(wx - 14, 4, 10, 26)
    }
  }

  private drawSconce(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0xffa040, 0.25)
    g.fillCircle(x, y, 14)
    g.fillStyle(0xffcc80, 0.6)
    g.fillCircle(x, y, 6)
    g.lineStyle(1, 0xffa040, 0.3)
    g.strokeCircle(x, y, 14)
  }

  private drawProfessorsCorner() {
    const g = this.add.graphics().setDepth(2)

    // Bookshelf wall (west side, north)
    for (let row = 0; row < 3; row++) {
      const shelfY = 50 + row * 58
      for (let shelf = 0; shelf < 3; shelf++) {
        const shelfX = 35 + shelf * 70
        // Shelf board
        g.fillStyle(0x5a3a18, 0.9)
        g.fillRect(shelfX, shelfY + 46, 65, 5)
        // Books on shelf
        const bookColors = [0x8844aa, 0x2244cc, 0xcc4422, 0x22aa44, 0xaaaa22, 0x224488, 0x884422, 0x448844]
        for (let b = 0; b < 8; b++) {
          const bW = 6 + (b % 2) * 2
          const bH = 26 + (b % 3) * 5
          g.fillStyle(bookColors[(row * 8 + b) % bookColors.length], 0.85)
          g.fillRect(shelfX + 3 + b * 7, shelfY + 46 - bH, bW, bH)
          g.lineStyle(0.5, 0x000000, 0.4)
          g.strokeRect(shelfX + 3 + b * 7, shelfY + 46 - bH, bW, bH)
        }
      }
    }

    // Professor's desk (large wooden desk)
    const deskX = 55, deskY = 210, deskW = 150, deskH = 70
    g.fillStyle(0x4a2a0a, 0.95)
    g.fillRoundedRect(deskX, deskY, deskW, deskH, 6)
    g.lineStyle(2, 0x7a5a2a, 0.7)
    g.strokeRoundedRect(deskX, deskY, deskW, deskH, 6)

    // Desk surface items
    // Open book
    g.fillStyle(0xe8dfc0, 0.85)
    g.fillRect(deskX + 20, deskY + 15, 50, 35)
    g.lineStyle(1, 0x8a7a5a, 0.5)
    g.lineBetween(deskX + 45, deskY + 15, deskX + 45, deskY + 50) // book spine
    // Pencil
    g.lineStyle(2, 0xffd040, 0.8)
    g.lineBetween(deskX + 90, deskY + 20, deskX + 110, deskY + 45)
    // Coffee mug
    g.fillStyle(0x604030, 0.8)
    g.fillCircle(deskX + 125, deskY + 25, 9)
    g.fillStyle(0x4a2a10, 0.7)
    g.fillCircle(deskX + 125, deskY + 25, 6)

    // Desk chair
    g.fillStyle(0x2a1a06, 0.9)
    g.fillRoundedRect(deskX + 40, deskY + deskH + 4, 60, 40, 5)
    g.fillStyle(0x3a2810, 0.7)
    g.fillRoundedRect(deskX + 45, deskY + deskH + 4, 50, 10, 4)

    // Desk lamp
    g.fillStyle(0xf0d050, 0.5)
    g.fillCircle(deskX + 8, deskY + 8, 18)
    g.lineStyle(2, 0xc0a020, 0.7)
    g.lineBetween(deskX + 8, deskY + 22, deskX + 8, deskY + 50)
    g.fillStyle(0xffe080, 0.8)
    g.fillCircle(deskX + 8, deskY + 8, 9)

    // Professor nameplate
    this.add.text(deskX + deskW / 2, deskY - 18, "PROF. ELENA VASQUEZ", {
      fontSize: "8px", color: "#3b82f688", fontStyle: "bold", align: "center",
    }).setOrigin(0.5).setDepth(3)

    // Zone label
    this.add.text(175, 95, "Professor's Corner", {
      fontSize: "10px", color: "#3b82f666", fontStyle: "bold", align: "center",
    }).setOrigin(0.5).setDepth(3)
  }

  private drawBookStacks() {
    const g = this.add.graphics().setDepth(2)

    // 4 rows of bookshelves (east side)
    const shelfStartX = 660
    const bookColors = [0x8844aa, 0x2244cc, 0xcc4422, 0x22aa44, 0xaaaa22, 0x224488, 0x884422, 0x448844, 0xcc8822, 0x2288cc, 0x884488, 0x228844]

    for (let row = 0; row < 4; row++) {
      const ry = 90 + row * 72
      // Shelf unit back panel
      g.fillStyle(0x4a2e10, 0.6)
      g.fillRect(shelfStartX, ry, 250, 60)
      g.lineStyle(1, 0x6a4e20, 0.5)
      g.strokeRect(shelfStartX, ry, 250, 60)
      // Shelf board
      g.fillStyle(0x7a5a2a, 0.9)
      g.fillRect(shelfStartX - 2, ry + 56, 254, 6)
      g.fillRect(shelfStartX - 2, ry, 254, 5)

      // Books
      let bx = shelfStartX + 4
      let bookIdx = row * 12
      while (bx < shelfStartX + 240) {
        const bW = 8 + ((bookIdx * 7) % 9)
        const bH = 30 + ((bookIdx * 3) % 20)
        g.fillStyle(bookColors[bookIdx % bookColors.length], 0.85)
        g.fillRect(bx, ry + 56 - bH, bW, bH)
        g.lineStyle(0.5, 0x000000, 0.3)
        g.strokeRect(bx, ry + 56 - bH, bW, bH)
        bx += bW + 1
        bookIdx++
      }

      // Shelf dividers
      for (let d = 80; d < 250; d += 80) {
        g.fillStyle(0x7a5a2a, 0.4)
        g.fillRect(shelfStartX + d - 2, ry, 4, 60)
      }
    }

    // Aisle label
    this.add.text(820, 60, "Book Stacks", {
      fontSize: "10px", color: "#3b82f666", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3)

    // Research terminal (small desk)
    const tx = 670, ty = 385
    g.fillStyle(0x1a1a30, 0.9)
    g.fillRoundedRect(tx, ty, 80, 55, 5)
    g.fillStyle(0x3355aa, 0.4)
    g.fillRoundedRect(tx + 5, ty + 5, 60, 35, 4)  // screen
    g.lineStyle(1, 0x3b82f6, 0.4)
    g.strokeRoundedRect(tx, ty, 80, 55, 5)

    // Screen glow
    const screenGlow = this.add.graphics().setDepth(2)
    screenGlow.fillStyle(0x3b82f6, 0.06)
    screenGlow.fillRoundedRect(tx + 5, ty + 5, 60, 35, 4)
    this.tweens.add({ targets: screenGlow, alpha: { from: 0.5, to: 1 }, duration: 1800, yoyo: true, repeat: -1 })
  }

  private drawStudyTables() {
    const g = this.add.graphics().setDepth(2)

    // 4 round study tables in center
    const tables = [
      { x: 380, y: 360 }, { x: 560, y: 360 },
      { x: 380, y: 500 }, { x: 560, y: 500 },
    ]

    for (const t of tables) {
      // Table shadow
      g.fillStyle(0x000000, 0.35)
      g.fillEllipse(t.x + 6, t.y + 6, 90, 80)

      // Table surface
      g.fillStyle(0x4a2e10, 0.9)
      g.fillEllipse(t.x, t.y, 88, 76)
      g.lineStyle(2, 0x7a5a2a, 0.7)
      g.strokeEllipse(t.x, t.y, 88, 76)

      // Table items (lamp, papers)
      g.fillStyle(0xe8dfc0, 0.6)
      g.fillRect(t.x - 14, t.y - 10, 28, 20)   // papers
      g.fillStyle(0xffe080, 0.5)
      g.fillCircle(t.x + 22, t.y - 15, 8)       // lamp
      g.lineStyle(1, 0xffd060, 0.4)
      g.lineBetween(t.x + 22, t.y - 7, t.x + 22, t.y + 5)

      // 4 chairs around table
      const chairAngles = [0, 90, 180, 270]
      for (const angle of chairAngles) {
        const rad = (angle * Math.PI) / 180
        const cx = t.x + Math.cos(rad) * 52
        const cy = t.y + Math.sin(rad) * 46
        g.fillStyle(0x2a1a06, 0.85)
        g.fillRoundedRect(cx - 14, cy - 14, 28, 28, 5)
        g.fillStyle(0x3a2810, 0.6)
        g.fillRoundedRect(cx - 11, cy - 11, 22, 10, 3)  // seat cushion
      }
    }

    // Section label
    this.add.text(500, 320, "Study Tables", {
      fontSize: "10px", color: "#3b82f666", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3)
  }

  private drawEntranceArea() {
    const g = this.add.graphics().setDepth(2)

    // Floor mat at entry
    g.fillStyle(0x1a1a3a, 0.8)
    g.fillRoundedRect(380, H - 95, 240, 55, 6)
    g.lineStyle(2, 0x3b82f6, 0.35)
    g.strokeRoundedRect(380, H - 95, 240, 55, 6)

    // Entry text
    this.add.text(500, H - 115, "REALM CITY", {
      fontSize: "8px", color: "#3b82f655", fontStyle: "bold", letterSpacing: 4,
    }).setOrigin(0.5).setDepth(3)

    // Double doors
    const doorY = H - 36
    g.fillStyle(0x2a1a06, 0.9)
    g.fillRoundedRect(408, doorY, 80, 30, 4)   // left door
    g.fillRoundedRect(512, doorY, 80, 30, 4)   // right door
    g.lineStyle(1.5, 0x7a5a2a, 0.7)
    g.strokeRoundedRect(408, doorY, 80, 30, 4)
    g.strokeRoundedRect(512, doorY, 80, 30, 4)
    // Door handles
    g.fillStyle(0xc0a040, 0.8)
    g.fillCircle(490, doorY + 15, 5)
    g.fillCircle(510, doorY + 15, 5)

    // Column accents flanking entry
    for (const cx of [320, 680]) {
      g.fillStyle(0x2a3560, 0.8)
      g.fillRect(cx - 12, H - 100, 24, 100)
      g.lineStyle(1, 0x3b82f6, 0.3)
      g.strokeRect(cx - 12, H - 100, 24, 100)
    }

    // Overhead "CITY LIBRARY" sign
    this.add.text(500, H - 148, "📚  CITY LIBRARY", {
      fontSize: "12px", color: "#3b82f699", fontStyle: "bold",
      backgroundColor: "#0d0c14cc", padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(3)
  }

  private drawCeiling() {
    const g = this.add.graphics().setDepth(6)

    // Overhead lighting (ambient glow orbs)
    const lights = [
      { x: 175, y: 210, color: 0x3b82f6, r: 60 },   // professor corner
      { x: 820, y: 240, color: 0x3b82f6, r: 55 },   // book stacks
      { x: 500, y: 470, color: 0x4466aa, r: 70 },   // study area
      { x: 500, y: 750, color: 0x2244aa, r: 45 },   // entry
    ]
    for (const l of lights) {
      g.fillStyle(l.color, 0.04)
      g.fillCircle(l.x, l.y, l.r)
    }

    // Chandeliers (ceiling fixtures)
    for (const { x, y } of [{ x: 200, y: 40 }, { x: 500, y: 40 }, { x: 800, y: 40 }]) {
      const cg = this.add.graphics().setDepth(3)
      cg.fillStyle(0xd4a830, 0.6)
      cg.fillCircle(x, y, 10)
      cg.fillStyle(0xffe090, 0.3)
      for (let arm = 0; arm < 6; arm++) {
        const ang = (arm * Math.PI) / 3
        cg.fillEllipse(x + Math.cos(ang) * 14, y + Math.sin(ang) * 14, 8, 8)
      }
      this.tweens.add({ targets: cg, alpha: { from: 0.7, to: 1 }, duration: 2200, yoyo: true, repeat: -1 })
    }
  }

  // ── Zone Highlights ──────────────────────────────────────────────────

  private createZoneHighlights() {
    for (const zone of ZONES) {
      if (zone.id === "exit") continue
      const g = this.add.graphics().setDepth(1).setAlpha(0)
      g.fillStyle(0x3b82f6, 0.08)
      g.fillCircle(zone.cx, zone.cy, ZONE_RADIUS - 10)
      g.lineStyle(1.5, 0x3b82f6, 0.25)
      g.strokeCircle(zone.cx, zone.cy, ZONE_RADIUS - 10)
      this.zoneHighlights.set(zone.id!, g)
    }
  }

  // ── Player ───────────────────────────────────────────────────────────

  private createPlayer() {
    this.leftLegGfx  = this.add.graphics()
    this.rightLegGfx = this.add.graphics()
    this.bodyGfx     = this.add.graphics()

    this.drawPlayerBody()

    const nameLabel = this.add.text(0, -34, this.displayName, {
      fontSize: "10px", color: "#ffffffcc", fontStyle: "bold",
      backgroundColor: "#00000077", padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1)

    this.player = this.add.container(500, H - 120, [
      this.leftLegGfx, this.rightLegGfx, this.bodyGfx, nameLabel,
    ])
    this.player.setDepth(10)

    this.physics.world.enable(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setCircle(12, -12, -12)
  }

  private drawPlayerBody() {
    this.bodyGfx.clear()
    this.leftLegGfx.clear()
    this.rightLegGfx.clear()

    // Shadow
    this.leftLegGfx.fillStyle(0x000000, 0.3)
    this.leftLegGfx.fillEllipse(0, 18, 26, 9)

    // Legs
    this.leftLegGfx.fillStyle(0x1a2460)
    this.leftLegGfx.fillRoundedRect(-8, 4, 7, 13, 3)
    this.rightLegGfx.fillStyle(0x1a2460)
    this.rightLegGfx.fillRoundedRect(1, 4, 7, 13, 3)

    // Body
    this.bodyGfx.fillStyle(0x4f46e5)
    this.bodyGfx.fillRoundedRect(-9, -10, 18, 16, 4)

    // Arms
    this.bodyGfx.fillStyle(0x4f46e5, 0.9)
    this.bodyGfx.fillRoundedRect(-14, -8, 5, 11, 2)
    this.bodyGfx.fillRoundedRect(9, -8, 5, 11, 2)

    // Head + hair + eyes
    this.bodyGfx.fillStyle(0xfbbf24)
    this.bodyGfx.fillCircle(0, -20, 10)
    this.bodyGfx.fillStyle(0x92400e)
    this.bodyGfx.fillEllipse(0, -28, 16, 8)
    this.bodyGfx.fillStyle(0x1f2937)
    this.bodyGfx.fillCircle(-3, -20, 2)
    this.bodyGfx.fillCircle(3, -20, 2)
  }

  // ── Camera / Keys / Prompt ────────────────────────────────────────────

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, W, H)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.physics.world.setBounds(0, 0, W, H)
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
      if (!this.nearZone) return
      if (this.nearZone.id === "exit") {
        this.cameras.main.flash(280, 255, 255, 255, false)
        this.time.delayedCall(300, () => {
          window.dispatchEvent(new CustomEvent("realm:exit-building"))
        })
      } else {
        window.dispatchEvent(new CustomEvent("realm:library-zone", { detail: { zone: this.nearZone.id } }))
      }
    })
  }

  private createPrompt() {
    this.promptText = this.add.text(W / 2, H - 10, "", {
      fontSize: "13px", color: "#ffffff", backgroundColor: "#1a1a2ecc", padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20).setAlpha(0)
  }

  // ── Update Loop ───────────────────────────────────────────────────────

  update() {
    if (!this.playerBody) return

    const { up, down, left, right, w, s, a, d } = this.keys
    let vx = 0, vy = 0

    if (left.isDown || a.isDown)  vx = -PLAYER_SPEED
    if (right.isDown || d.isDown) vx =  PLAYER_SPEED
    if (up.isDown || w.isDown)    vy = -PLAYER_SPEED
    if (down.isDown || s.isDown)  vy =  PLAYER_SPEED
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    this.playerBody.setVelocity(vx, vy)

    if (vx !== 0 || vy !== 0) {
      this.walkTick++
      const swing = Math.sin(this.walkTick * 0.25) * 10
      this.leftLegGfx.rotation  =  swing * 0.06
      this.rightLegGfx.rotation = -swing * 0.06
    } else {
      this.walkTick = 0
      this.leftLegGfx.rotation = 0
      this.rightLegGfx.rotation = 0
    }

    // Zone proximity
    const px = this.player.x
    const py = this.player.y
    let closest: ZoneDef | null = null
    let closestDist = Infinity

    for (const zone of ZONES) {
      const dist = Phaser.Math.Distance.Between(px, py, zone.cx, zone.cy)
      if (dist < ZONE_RADIUS && dist < closestDist) {
        closestDist = dist
        closest = zone
      }
    }

    if (closest !== this.nearZone) {
      // Fade out old highlight
      if (this.nearZone?.id && this.nearZone.id !== "exit") {
        const old = this.zoneHighlights.get(this.nearZone.id)
        if (old) this.tweens.add({ targets: old, alpha: 0, duration: 200 })
      }
      this.nearZone = closest

      // Fade in new highlight
      if (closest?.id && closest.id !== "exit") {
        const next = this.zoneHighlights.get(closest.id)
        if (next) this.tweens.add({ targets: next, alpha: 1, duration: 200 })
        window.dispatchEvent(new CustomEvent("realm:library-zone-hover", { detail: { zone: closest.id } }))
      } else if (!closest) {
        window.dispatchEvent(new CustomEvent("realm:library-zone-hover", { detail: { zone: null } }))
      }

      if (closest) {
        this.promptText.setText(closest.prompt)
        this.tweens.add({ targets: this.promptText, alpha: 1, duration: 180 })
      } else {
        this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200 })
      }
    }
  }
}
