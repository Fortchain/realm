import Phaser from "phaser"

interface BuildingDef {
  id: string
  name: string
  icon: string
  x: number
  y: number
  w: number
  h: number
  color: number
  available: boolean
  href: string
}

const BUILDINGS: BuildingDef[] = [
  { id: "bank",       name: "First Realm Bank",    icon: "🏦", x: 120,  y: 120,  w: 200, h: 160, color: 0x10b981, available: true,  href: "/buildings/bank" },
  { id: "library",    name: "City Library",         icon: "📚", x: 380,  y: 120,  w: 200, h: 160, color: 0x3b82f6, available: true,  href: "/buildings/library" },
  { id: "university", name: "Realm University",     icon: "🎓", x: 640,  y: 120,  w: 200, h: 160, color: 0x8b5cf6, available: false, href: "/buildings/university" },
  { id: "gym",        name: "Iron District Gym",    icon: "🏋️", x: 120,  y: 360,  w: 200, h: 160, color: 0xf97316, available: false, href: "/buildings/gym" },
  { id: "home",       name: "Your Home",            icon: "🏠", x: 380,  y: 360,  w: 200, h: 160, color: 0xf59e0b, available: false, href: "/buildings/home" },
  { id: "hospital",   name: "Realm Medical",        icon: "🏥", x: 640,  y: 360,  w: 200, h: 160, color: 0xef4444, available: false, href: "/buildings/hospital" },
  { id: "mall",       name: "The Mall",             icon: "🛍️", x: 120,  y: 600,  w: 200, h: 160, color: 0xec4899, available: false, href: "/buildings/mall" },
  { id: "government", name: "City Hall",            icon: "🏛️", x: 380,  y: 600,  w: 200, h: 160, color: 0x64748b, available: false, href: "/buildings/government" },
  { id: "office",     name: "The Office Tower",     icon: "💼", x: 640,  y: 600,  w: 200, h: 160, color: 0x06b6d4, available: false, href: "/buildings/office" },
]

const WORLD_W = 900
const WORLD_H = 840
const PLAYER_SPEED = 180
const ENTER_RADIUS = 90

export class CityScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private playerBody!: Phaser.Physics.Arcade.Body
  private keys!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    w: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
    e: Phaser.Input.Keyboard.Key
  }
  private nearBuilding: BuildingDef | null = null
  private promptText!: Phaser.GameObjects.Text
  private displayName: string = "You"
  private buildingContainers: Map<string, Phaser.GameObjects.Container> = new Map()

  constructor() {
    super({ key: "CityScene" })
  }

  init(data: { displayName?: string }) {
    this.displayName = data.displayName ?? "You"
  }

  create() {
    this.cameras.main.setBackgroundColor("#080810")

    this.drawCity()
    this.createPlayer()
    this.setupCamera()
    this.setupKeys()
    this.createPrompt()
  }

  private drawCity() {
    const g = this.add.graphics()

    // Ground / road grid
    g.fillStyle(0x0d0d1a)
    g.fillRect(0, 0, WORLD_W, WORLD_H)

    // Road lines
    g.lineStyle(1, 0xffffff, 0.04)
    for (let x = 0; x < WORLD_W; x += 60) {
      g.lineBetween(x, 0, x, WORLD_H)
    }
    for (let y = 0; y < WORLD_H; y += 60) {
      g.lineBetween(0, y, WORLD_W, y)
    }

    // Road lanes (horizontal streets between rows)
    const roadY = [280, 520]
    for (const ry of roadY) {
      g.fillStyle(0x13131f)
      g.fillRect(0, ry, WORLD_W, 60)
      // dashed center line
      g.lineStyle(2, 0xffffff, 0.06)
      for (let x = 0; x < WORLD_W; x += 40) {
        g.lineBetween(x, ry + 30, x + 20, ry + 30)
      }
    }

    // Road lanes (vertical streets between columns)
    const roadX = [340, 600]
    for (const rx of roadX) {
      g.fillStyle(0x13131f)
      g.fillRect(rx, 0, 20, WORLD_H)
    }

    // Buildings
    for (const b of BUILDINGS) {
      this.drawBuilding(b)
    }
  }

  private drawBuilding(b: BuildingDef) {
    const container = this.add.container(b.x, b.y)
    this.buildingContainers.set(b.id, container)

    const g = this.add.graphics()
    container.add(g)

    const alpha = b.available ? 1 : 0.35

    if (b.available) {
      // Glow behind building
      g.fillStyle(b.color, 0.12)
      g.fillRoundedRect(-8, -8, b.w + 16, b.h + 16, 16)

      // Border glow (outer)
      g.lineStyle(2, b.color, 0.4)
      g.strokeRoundedRect(-4, -4, b.w + 8, b.h + 8, 14)
    }

    // Main building body
    g.fillStyle(b.available ? 0x0f1628 : 0x0a0a14, alpha)
    g.fillRoundedRect(0, 0, b.w, b.h, 12)

    // Inner border
    g.lineStyle(1.5, b.color, b.available ? 0.5 : 0.15)
    g.strokeRoundedRect(0, 0, b.w, b.h, 12)

    // Roof gradient strip
    g.fillStyle(b.color, b.available ? 0.15 : 0.05)
    g.fillRoundedRect(0, 0, b.w, 40, { tl: 12, tr: 12, bl: 0, br: 0 })

    // Icon text
    const iconTxt = this.add.text(b.w / 2, 24, b.icon, {
      fontSize: "28px",
      align: "center",
    }).setOrigin(0.5, 0.5).setAlpha(b.available ? 1 : 0.3)
    container.add(iconTxt)

    // Building name
    const nameTxt = this.add.text(b.w / 2, 62, b.name, {
      fontSize: "11px",
      color: b.available ? "#ffffff" : "#ffffff44",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: b.w - 16 },
    }).setOrigin(0.5, 0)
    container.add(nameTxt)

    if (b.available) {
      // Pulsing "OPEN" badge
      const badgeBg = this.add.graphics()
      badgeBg.fillStyle(b.color, 0.2)
      badgeBg.fillRoundedRect(b.w / 2 - 22, b.h - 32, 44, 18, 9)
      badgeBg.lineStyle(1, b.color, 0.4)
      badgeBg.strokeRoundedRect(b.w / 2 - 22, b.h - 32, 44, 18, 9)
      container.add(badgeBg)

      const openTxt = this.add.text(b.w / 2, b.h - 23, "● OPEN", {
        fontSize: "8px",
        color: `#${b.color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5, 0.5)
      container.add(openTxt)

      // Pulse the dot
      this.tweens.add({
        targets: openTxt,
        alpha: { from: 1, to: 0.3 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      })

      // Idle glow pulse on available buildings
      this.tweens.add({
        targets: g,
        alpha: { from: 1, to: 0.85 },
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      })
    } else {
      // Lock icon
      const lockTxt = this.add.text(b.w / 2, b.h - 24, "🔒", {
        fontSize: "14px",
        align: "center",
      }).setOrigin(0.5, 0.5).setAlpha(0.3)
      container.add(lockTxt)

      // "Coming soon" label
      const soonTxt = this.add.text(b.w / 2, b.h - 10, "Coming soon", {
        fontSize: "8px",
        color: "#ffffff20",
        align: "center",
      }).setOrigin(0.5, 0.5)
      container.add(soonTxt)
    }
  }

  private createPlayer() {
    const g = this.add.graphics()

    // Outer glow ring
    g.fillStyle(0x6366f1, 0.15)
    g.fillCircle(0, 0, 22)

    // Main circle
    g.fillStyle(0x6366f1, 0.9)
    g.fillCircle(0, 0, 14)

    // Highlight
    g.fillStyle(0xffffff, 0.3)
    g.fillCircle(-4, -5, 5)

    const nameLabel = this.add.text(0, -28, this.displayName, {
      fontSize: "10px",
      color: "#ffffffcc",
      fontStyle: "bold",
      backgroundColor: "#00000066",
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5, 1)

    this.player = this.add.container(WORLD_W / 2, WORLD_H / 2, [g, nameLabel])
    this.physics.world.enable(this.player)

    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    this.playerBody.setCircle(14, -14, -14)
    this.player.setDepth(10)
  }

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
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
      if (this.nearBuilding?.available) {
        this.enterBuilding(this.nearBuilding)
      }
    })
  }

  private createPrompt() {
    this.promptText = this.add.text(WORLD_W / 2, WORLD_H - 40, "", {
      fontSize: "13px",
      color: "#ffffff",
      backgroundColor: "#1a1a2ecc",
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20).setAlpha(0)
  }

  private enterBuilding(b: BuildingDef) {
    // Flash camera white then navigate
    this.cameras.main.flash(300, 255, 255, 255, false)
    this.time.delayedCall(320, () => {
      window.dispatchEvent(new CustomEvent("realm:enter-building", { detail: { href: b.href } }))
    })
  }

  update() {
    if (!this.playerBody) return

    const { up, down, left, right, w, s, a, d } = this.keys
    let vx = 0
    let vy = 0

    if (left.isDown || a.isDown)  vx = -PLAYER_SPEED
    if (right.isDown || d.isDown) vx =  PLAYER_SPEED
    if (up.isDown || w.isDown)    vy = -PLAYER_SPEED
    if (down.isDown || s.isDown)  vy =  PLAYER_SPEED

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707
      vy *= 0.707
    }

    this.playerBody.setVelocity(vx, vy)

    // Building proximity check
    const px = this.player.x
    const py = this.player.y
    let closest: BuildingDef | null = null
    let closestDist = Infinity

    for (const b of BUILDINGS) {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      const dist = Phaser.Math.Distance.Between(px, py, cx, cy)
      if (dist < ENTER_RADIUS && dist < closestDist) {
        closestDist = dist
        closest = b
      }
    }

    if (closest !== this.nearBuilding) {
      this.nearBuilding = closest
      if (closest?.available) {
        this.promptText.setText(`[E]  Enter ${closest.name}`)
        this.tweens.add({ targets: this.promptText, alpha: 1, duration: 200, ease: "Sine.easeOut" })
      } else if (closest && !closest.available) {
        this.promptText.setText(`🔒  ${closest.name} — Coming Soon`)
        this.tweens.add({ targets: this.promptText, alpha: 0.5, duration: 200 })
      } else {
        this.tweens.add({ targets: this.promptText, alpha: 0, duration: 200, ease: "Sine.easeIn" })
      }
    }

    // Subtle player bob when moving
    if (vx !== 0 || vy !== 0) {
      const t = this.time.now / 200
      this.player.y += Math.sin(t) * 0.3
    }
  }
}
