import Phaser from "phaser"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ObjectType =
  | "park" | "water" | "beach" | "plaza"
  | "road-h" | "road-v" | "intersection"
  | "building" | "house" | "ranch" | "library" | "bank" | "church" | "warehouse" | "tower"
  | "tree-large" | "tree-small" | "bush" | "mountain" | "rocks"
  | "lamp" | "bench" | "table"

export type Tool = "select" | "place" | "erase"

export interface MapObject {
  id: string
  type: ObjectType
  x: number
  y: number
  w: number
  h: number
  color: string
  label?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WORLD = 6000
const SNAP = 40
const HANDLE_SCREEN_R = 7  // handle radius in screen pixels

const DEFAULT_SIZE: Record<ObjectType, [number, number]> = {
  park: [200, 200], water: [200, 150], beach: [300, 80], plaza: [160, 160],
  "road-h": [200, 60], "road-v": [60, 200], intersection: [60, 60],
  building: [80, 80], house: [60, 60], ranch: [100, 60],
  library: [120, 100], bank: [100, 80], church: [70, 100],
  warehouse: [140, 90], tower: [60, 120],
  "tree-large": [40, 40], "tree-small": [24, 24], bush: [20, 20],
  mountain: [100, 80], rocks: [40, 30],
  lamp: [12, 32], bench: [32, 14], table: [28, 20],
}

const DEFAULT_COLOR: Record<ObjectType, number> = {
  park: 0x4ade80, water: 0x38bdf8, beach: 0xfde68a, plaza: 0xcbd5e1,
  "road-h": 0x475569, "road-v": 0x475569, intersection: 0x475569,
  building: 0xe2e8f0, house: 0xfef3c7, ranch: 0xfde68a,
  library: 0xbfdbfe, bank: 0xbbf7d0, church: 0xede9fe,
  warehouse: 0xd1d5db, tower: 0xc7d2fe,
  "tree-large": 0x16a34a, "tree-small": 0x22c55e, bush: 0x4ade80,
  mountain: 0x9ca3af, rocks: 0x6b7280,
  lamp: 0xfef08a, bench: 0xd97706, table: 0x92400e,
}

const DEPTH_MAP: Record<ObjectType, number> = {
  park: 1, water: 1, beach: 1, plaza: 1,
  "road-h": 2, "road-v": 2, intersection: 2,
  building: 3, house: 3, ranch: 3, library: 3, bank: 3, church: 3, warehouse: 3, tower: 3,
  "tree-large": 4, "tree-small": 4, bush: 4, mountain: 4, rocks: 4,
  lamp: 5, bench: 5, table: 5,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16)
}

function numToHex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0")
}

function darken(c: number, f: number): number {
  return (Math.floor(((c >> 16) & 0xff) * f) << 16) |
         (Math.floor(((c >> 8)  & 0xff) * f) << 8)  |
          Math.floor((c & 0xff) * f)
}

function lighten(c: number, f: number): number {
  return (Math.min(255, Math.floor(((c >> 16) & 0xff) * f)) << 16) |
         (Math.min(255, Math.floor(((c >> 8)  & 0xff) * f)) << 8)  |
          Math.min(255, Math.floor((c & 0xff) * f))
}

function snapTo(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

let _idSeq = 0
function genId(): string {
  return `o_${Date.now()}_${_idSeq++}`
}

// ── EditorScene ───────────────────────────────────────────────────────────────

export class EditorScene extends Phaser.Scene {
  // State
  objects: MapObject[] = []
  tool: Tool = "select"
  activeType: ObjectType = "building"
  selectedId: string | null = null
  snapEnabled = true

  // Graphics
  private bgGfx!: Phaser.GameObjects.Graphics
  private selGfx!: Phaser.GameObjects.Graphics
  private objGfxMap = new Map<string, Phaser.GameObjects.Graphics>()

  // Drag state
  private dragging = false
  private dragMode: "move" | "resize" | null = null
  private dragHandleIdx = -1
  private dragStartWorld = { x: 0, y: 0 }
  private dragObjSnap = { x: 0, y: 0, w: 0, h: 0 }

  // Pan state
  private panning = false
  private panStart = { sx: 0, sy: 0, scrollX: 0, scrollY: 0 }

  // Last pointer world position (for place preview)
  private lastWorld = { x: WORLD / 2, y: WORLD / 2 }

  private wasd!: {
    w: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
  }

  private _cleanup?: () => void

  constructor() {
    super({ key: "EditorScene" })
  }

  create() {
    // Background + grid
    this.bgGfx = this.add.graphics().setDepth(0)
    this.bgGfx.fillStyle(0xffffff)
    this.bgGfx.fillRect(0, 0, WORLD, WORLD)
    this.drawGrid()
    this.bgGfx.lineStyle(2, 0x94a3b8, 1)
    this.bgGfx.strokeRect(0, 0, WORLD, WORLD)

    // Selection / preview overlay (always on top)
    this.selGfx = this.add.graphics().setDepth(100)

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD, WORLD)
    this.cameras.main.setZoom(0.8)
    this.cameras.main.centerOn(WORLD / 2, WORLD / 2)

    // Pointer events
    this.input.on("pointerdown",  this.onPointerDown,  this)
    this.input.on("pointermove",  this.onPointerMove,  this)
    this.input.on("pointerup",    this.onPointerUp,    this)
    this.input.on("wheel", (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.15, 3))
    }, this)

    // Keyboard
    const kb = this.input.keyboard!
    this.wasd = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    kb.on("keydown-DELETE",    this.deleteSelected, this)
    kb.on("keydown-BACKSPACE", this.deleteSelected, this)
    kb.on("keydown-G", () => {
      this.snapEnabled = !this.snapEnabled
      window.dispatchEvent(new CustomEvent("builder:snap-changed", { detail: { snap: this.snapEnabled } }))
    }, this)
    kb.on("keydown-ESC", () => {
      this.selectedId = null
      window.dispatchEvent(new CustomEvent("builder:selection-changed", { detail: { id: null } }))
    }, this)

    // Window events from React
    const onSetTool = (e: Event) => {
      this.tool = (e as CustomEvent<{ tool: Tool }>).detail.tool
      this.selectedId = null
      this.selGfx.clear()
    }
    const onSetType = (e: Event) => {
      this.activeType = (e as CustomEvent<{ objectType: ObjectType }>).detail.objectType
    }
    const onLoadObjects = (e: Event) => {
      const { objects } = (e as CustomEvent<{ objects: MapObject[] }>).detail
      this.objGfxMap.forEach(g => g.destroy())
      this.objGfxMap.clear()
      this.objects = objects
      objects.forEach(obj => this.createObjGfx(obj))
    }
    const onClear = () => {
      this.objGfxMap.forEach(g => g.destroy())
      this.objGfxMap.clear()
      this.objects = []
      this.selectedId = null
      this.selGfx.clear()
      this.emitObjects()
    }

    window.addEventListener("builder:set-tool",      onSetTool)
    window.addEventListener("builder:set-type",      onSetType)
    window.addEventListener("builder:load-objects",  onLoadObjects)
    window.addEventListener("builder:clear",         onClear)

    this._cleanup = () => {
      window.removeEventListener("builder:set-tool",     onSetTool)
      window.removeEventListener("builder:set-type",     onSetType)
      window.removeEventListener("builder:load-objects", onLoadObjects)
      window.removeEventListener("builder:clear",        onClear)
    }
  }

  shutdown() {
    this._cleanup?.()
    this.game.canvas.style.cursor = "default"
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  private drawGrid() {
    this.bgGfx.lineStyle(1, 0xe2e8f0, 1)
    for (let x = 0; x <= WORLD; x += SNAP) this.bgGfx.lineBetween(x, 0, x, WORLD)
    for (let y = 0; y <= WORLD; y += SNAP) this.bgGfx.lineBetween(0, y, WORLD, y)
    // Major lines every 200px
    this.bgGfx.lineStyle(1, 0xd1d5db, 1)
    for (let x = 0; x <= WORLD; x += 200) this.bgGfx.lineBetween(x, 0, x, WORLD)
    for (let y = 0; y <= WORLD; y += 200) this.bgGfx.lineBetween(0, y, WORLD, y)
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(_t: number, d: number) {
    const cam = this.cameras.main
    const speed = 500 / cam.zoom
    const dt = d / 1000
    if (this.wasd.w.isDown) cam.scrollY -= speed * dt
    if (this.wasd.s.isDown) cam.scrollY += speed * dt
    if (this.wasd.a.isDown) cam.scrollX -= speed * dt
    if (this.wasd.d.isDown) cam.scrollX += speed * dt

    this.renderOverlay()
  }

  // ── Hit testing ─────────────────────────────────────────────────────────────

  private handles(obj: MapObject) {
    const { x, y, w, h } = obj
    return [
      { x,       y       },  // 0 TL
      { x: x+w/2, y      },  // 1 TM
      { x: x+w,  y       },  // 2 TR
      { x,       y: y+h/2 }, // 3 ML
      { x: x+w,  y: y+h/2 }, // 4 MR
      { x,       y: y+h  },  // 5 BL
      { x: x+w/2, y: y+h },  // 6 BM
      { x: x+w,  y: y+h  },  // 7 BR
    ]
  }

  private hitHandles(wx: number, wy: number): number {
    if (!this.selectedId) return -1
    const obj = this.objects.find(o => o.id === this.selectedId)
    if (!obj) return -1
    const r = HANDLE_SCREEN_R / this.cameras.main.zoom
    for (let i = 0; i < 8; i++) {
      const h = this.handles(obj)[i]
      const dx = wx - h.x, dy = wy - h.y
      if (dx*dx + dy*dy <= r*r) return i
    }
    return -1
  }

  private hitObjects(wx: number, wy: number): string | null {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i]
      if (wx >= o.x && wx <= o.x+o.w && wy >= o.y && wy <= o.y+o.h) return o.id
    }
    return null
  }

  // ── Pointer events ──────────────────────────────────────────────────────────

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonDown()) {
      this.panning = true
      this.panStart = { sx: pointer.x, sy: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY }
      return
    }

    const wx = pointer.worldX, wy = pointer.worldY

    if (this.tool === "select") {
      const hIdx = this.hitHandles(wx, wy)
      if (hIdx >= 0 && this.selectedId) {
        const obj = this.objects.find(o => o.id === this.selectedId)!
        this.dragging = true; this.dragMode = "resize"; this.dragHandleIdx = hIdx
        this.dragStartWorld = { x: wx, y: wy }
        this.dragObjSnap = { x: obj.x, y: obj.y, w: obj.w, h: obj.h }
        return
      }
      const hitId = this.hitObjects(wx, wy)
      if (hitId) {
        const obj = this.objects.find(o => o.id === hitId)!
        this.selectedId = hitId
        this.dragging = true; this.dragMode = "move"
        this.dragStartWorld = { x: wx, y: wy }
        this.dragObjSnap = { x: obj.x, y: obj.y, w: obj.w, h: obj.h }
        this.emitSelection(hitId, obj)
        return
      }
      this.selectedId = null
      this.emitSelection(null)

    } else if (this.tool === "place") {
      this.placeObject(wx, wy)

    } else if (this.tool === "erase") {
      const hitId = this.hitObjects(wx, wy)
      if (hitId) this.deleteObject(hitId)
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    const wx = pointer.worldX, wy = pointer.worldY
    this.lastWorld = { x: wx, y: wy }

    if (this.panning) {
      const cam = this.cameras.main
      const dx = (pointer.x - this.panStart.sx) / cam.zoom
      const dy = (pointer.y - this.panStart.sy) / cam.zoom
      cam.scrollX = this.panStart.scrollX - dx
      cam.scrollY = this.panStart.scrollY - dy
      return
    }

    if (this.dragging && this.dragMode === "move" && this.selectedId) {
      const obj = this.objects.find(o => o.id === this.selectedId)
      if (!obj) return
      const dx = wx - this.dragStartWorld.x, dy = wy - this.dragStartWorld.y
      let nx = this.dragObjSnap.x + dx, ny = this.dragObjSnap.y + dy
      if (this.snapEnabled) { nx = snapTo(nx); ny = snapTo(ny) }
      obj.x = Phaser.Math.Clamp(nx, 0, WORLD - obj.w)
      obj.y = Phaser.Math.Clamp(ny, 0, WORLD - obj.h)
      this.redrawObj(obj)
      this.emitSelection(obj.id, obj)
      return
    }

    if (this.dragging && this.dragMode === "resize" && this.selectedId) {
      const obj = this.objects.find(o => o.id === this.selectedId)
      if (!obj) return
      const dx = wx - this.dragStartWorld.x, dy = wy - this.dragStartWorld.y
      const { x: ox, y: oy, w: ow, h: oh } = this.dragObjSnap
      const MIN = SNAP
      let nx = ox, ny = oy, nw = ow, nh = oh

      switch (this.dragHandleIdx) {
        case 0: nx = ox+dx; ny = oy+dy; nw = ow-dx; nh = oh-dy; break
        case 1: ny = oy+dy; nh = oh-dy; break
        case 2: ny = oy+dy; nw = ow+dx; nh = oh-dy; break
        case 3: nx = ox+dx; nw = ow-dx; break
        case 4: nw = ow+dx; break
        case 5: nx = ox+dx; nw = ow-dx; nh = oh+dy; break
        case 6: nh = oh+dy; break
        case 7: nw = ow+dx; nh = oh+dy; break
      }

      if (nw < MIN) { if ([0,3,5].includes(this.dragHandleIdx)) nx = ox+ow-MIN; nw = MIN }
      if (nh < MIN) { if ([0,1,2].includes(this.dragHandleIdx)) ny = oy+oh-MIN; nh = MIN }
      if (this.snapEnabled) { nx = snapTo(nx); ny = snapTo(ny); nw = Math.max(MIN, snapTo(nw)); nh = Math.max(MIN, snapTo(nh)) }

      obj.x = nx; obj.y = ny; obj.w = nw; obj.h = nh
      this.redrawObj(obj)
      this.emitSelection(obj.id, obj)
      return
    }

    // Cursor
    const hIdx = this.hitHandles(wx, wy)
    if (hIdx >= 0) {
      const cursors = ["nw-resize","n-resize","ne-resize","w-resize","e-resize","sw-resize","s-resize","se-resize"]
      this.game.canvas.style.cursor = cursors[hIdx]
    } else if (this.tool === "select" && this.hitObjects(wx, wy)) {
      this.game.canvas.style.cursor = "grab"
    } else if (this.tool === "place") {
      this.game.canvas.style.cursor = "crosshair"
    } else if (this.tool === "erase") {
      this.game.canvas.style.cursor = this.hitObjects(wx, wy) ? "pointer" : "crosshair"
    } else {
      this.game.canvas.style.cursor = "default"
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonReleased()) { this.panning = false; return }
    if (this.dragging) {
      this.dragging = false; this.dragMode = null; this.dragHandleIdx = -1
      this.emitObjects()
    }
  }

  // ── Object lifecycle ────────────────────────────────────────────────────────

  placeObject(wx: number, wy: number) {
    const [dw, dh] = DEFAULT_SIZE[this.activeType]
    let x = wx - dw/2, y = wy - dh/2
    if (this.snapEnabled) { x = snapTo(x); y = snapTo(y) }
    x = Phaser.Math.Clamp(x, 0, WORLD - dw)
    y = Phaser.Math.Clamp(y, 0, WORLD - dh)

    const obj: MapObject = {
      id: genId(), type: this.activeType, x, y, w: dw, h: dh,
      color: numToHex(DEFAULT_COLOR[this.activeType]),
    }
    this.objects.push(obj)
    this.createObjGfx(obj)
    this.selectedId = obj.id
    this.emitSelection(obj.id, obj)
    this.emitObjects()
  }

  deleteObject(id: string) {
    this.objects = this.objects.filter(o => o.id !== id)
    this.objGfxMap.get(id)?.destroy()
    this.objGfxMap.delete(id)
    if (this.selectedId === id) {
      this.selectedId = null
      window.dispatchEvent(new CustomEvent("builder:selection-changed", { detail: { id: null } }))
    }
    this.emitObjects()
  }

  deleteSelected() {
    if (this.selectedId) this.deleteObject(this.selectedId)
  }

  updateColor(id: string, color: string) {
    const obj = this.objects.find(o => o.id === id)
    if (!obj) return
    obj.color = color
    this.redrawObj(obj)
    this.emitObjects()
  }

  updateLabel(id: string, label: string) {
    const obj = this.objects.find(o => o.id === id)
    if (!obj) return
    obj.label = label
    this.emitObjects()
  }

  getObjects(): MapObject[] { return [...this.objects] }

  // ── Graphics ────────────────────────────────────────────────────────────────

  private createObjGfx(obj: MapObject) {
    const gfx = this.add.graphics().setDepth(DEPTH_MAP[obj.type] ?? 3)
    this.drawObject(gfx, obj)
    this.objGfxMap.set(obj.id, gfx)
  }

  private redrawObj(obj: MapObject) {
    const gfx = this.objGfxMap.get(obj.id)
    if (!gfx) return
    gfx.clear()
    this.drawObject(gfx, obj)
  }

  private renderOverlay() {
    const g = this.selGfx
    g.clear()
    const cam = this.cameras.main
    const iz = 1 / cam.zoom

    // Place preview ghost
    if (this.tool === "place") {
      const [dw, dh] = DEFAULT_SIZE[this.activeType]
      let px = this.lastWorld.x - dw/2, py = this.lastWorld.y - dh/2
      if (this.snapEnabled) { px = snapTo(px); py = snapTo(py) }
      px = Phaser.Math.Clamp(px, 0, WORLD - dw)
      py = Phaser.Math.Clamp(py, 0, WORLD - dh)
      const c = DEFAULT_COLOR[this.activeType]
      g.fillStyle(c, 0.35)
      g.fillRect(px, py, dw, dh)
      g.lineStyle(2 * iz, c, 0.9)
      g.strokeRect(px, py, dw, dh)
    }

    // Selection box + handles
    if (!this.selectedId) return
    const obj = this.objects.find(o => o.id === this.selectedId)
    if (!obj) return

    const hr = HANDLE_SCREEN_R * iz

    // Border
    g.lineStyle(2 * iz, 0x6366f1, 1)
    g.strokeRect(obj.x - iz, obj.y - iz, obj.w + 2*iz, obj.h + 2*iz)

    // Handles
    const hs = this.handles(obj)
    hs.forEach((h) => {
      g.fillStyle(0xffffff, 1)
      g.fillCircle(h.x, h.y, hr)
      g.lineStyle(2 * iz, 0x6366f1, 1)
      g.strokeCircle(h.x, h.y, hr)
    })
  }

  // ── Draw each object type ────────────────────────────────────────────────────

  private drawObject(g: Phaser.GameObjects.Graphics, obj: MapObject) {
    const c = hexToNum(obj.color)
    const { x, y, w, h, type } = obj

    switch (type) {
      case "park":
        g.fillStyle(c, 1); g.fillRect(x, y, w, h)
        g.fillStyle(darken(c, 0.7), 0.35)
        for (let dx = 12; dx < w; dx += 22) for (let dy = 12; dy < h; dy += 22) g.fillCircle(x+dx, y+dy, 2.5)
        break

      case "water":
        g.fillStyle(c, 1); g.fillRect(x, y, w, h)
        g.lineStyle(1, lighten(c, 1.4), 0.5)
        for (let dy = 10; dy < h; dy += 15) g.lineBetween(x+5, y+dy, x+w-5, y+dy)
        break

      case "beach":
        g.fillStyle(c, 1); g.fillRect(x, y, w, h)
        g.fillStyle(darken(c, 0.88), 0.3)
        for (let dx = 10; dx < w; dx += 22) g.fillCircle(x+dx, y+h*0.5, 3)
        break

      case "plaza":
        g.fillStyle(c, 1); g.fillRect(x, y, w, h)
        g.lineStyle(1, darken(c, 0.8), 0.45)
        for (let dx = 20; dx < w; dx += 20) g.lineBetween(x+dx, y, x+dx, y+h)
        for (let dy = 20; dy < h; dy += 20) g.lineBetween(x, y+dy, x+w, y+dy)
        break

      case "road-h":
        g.fillStyle(0x374151, 1); g.fillRect(x, y, w, h)
        g.fillStyle(0xfbbf24, 0.9); g.fillRect(x, y+1, w, 3); g.fillRect(x, y+h-4, w, 3)
        g.fillStyle(0xffffff, 0.75)
        for (let dx = 12; dx < w-12; dx += 32) g.fillRect(x+dx, y+h/2-2.5, 18, 5)
        break

      case "road-v":
        g.fillStyle(0x374151, 1); g.fillRect(x, y, w, h)
        g.fillStyle(0xfbbf24, 0.9); g.fillRect(x+1, y, 3, h); g.fillRect(x+w-4, y, 3, h)
        g.fillStyle(0xffffff, 0.75)
        for (let dy = 12; dy < h-12; dy += 32) g.fillRect(x+w/2-2.5, y+dy, 5, 18)
        break

      case "intersection":
        g.fillStyle(0x374151, 1); g.fillRect(x, y, w, h)
        g.lineStyle(1, 0x64748b, 0.7)
        g.lineBetween(x, y, x+w, y+h); g.lineBetween(x+w, y, x, y+h)
        break

      case "tree-large":
        g.fillStyle(0x000000, 0.15); g.fillEllipse(x+w/2+4, y+h/2+4, w*0.9, h*0.9)
        g.fillStyle(darken(c, 0.75), 1); g.fillEllipse(x+w/2, y+h/2, w, h)
        g.fillStyle(c, 1); g.fillEllipse(x+w/2, y+h/2, w*0.72, h*0.72)
        g.fillStyle(lighten(c, 1.35), 0.55); g.fillCircle(x+w/2-w*0.13, y+h/2-h*0.13, w*0.18)
        break

      case "tree-small":
        g.fillStyle(darken(c, 0.8), 1); g.fillCircle(x+w/2, y+h/2, Math.min(w,h)/2)
        g.fillStyle(c, 1); g.fillCircle(x+w/2, y+h/2, Math.min(w,h)/2*0.7)
        break

      case "bush":
        g.fillStyle(c, 1); g.fillCircle(x+w/2, y+h/2, Math.min(w,h)/2)
        g.fillStyle(lighten(c, 1.25), 0.45); g.fillCircle(x+w/2, y+h/2, Math.min(w,h)/4)
        break

      case "mountain": {
        const mx = x+w/2
        g.fillStyle(0x000000, 0.12); g.fillTriangle(mx+4, y+h+4, x-4, y+h+4, mx+w/3+4, y+4)
        g.fillStyle(c, 1); g.fillTriangle(mx, y, x, y+h, x+w, y+h)
        g.fillStyle(0xffffff, 0.85); g.fillTriangle(mx, y+2, mx-w*0.1, y+h*0.28, mx+w*0.1, y+h*0.28)
        break
      }

      case "rocks":
        for (let i = 0; i < 4; i++) {
          const rx = x + (i%2)*w*0.42 + w*0.08
          const ry = y + Math.floor(i/2)*h*0.42 + h*0.08
          g.fillStyle(i%2===0 ? c : darken(c, 0.82), 1)
          g.fillEllipse(rx, ry, w*0.38, h*0.38)
        }
        break

      case "lamp": {
        const lx = x+w/2
        g.fillStyle(0x64748b, 1); g.fillRect(lx-2, y+h*0.22, 4, h*0.72)
        g.fillStyle(0xfef08a, 0.35); g.fillCircle(lx, y+h*0.16, w*1.2)
        g.fillStyle(c, 1); g.fillCircle(lx, y+h*0.16, w*0.55)
        g.fillStyle(0xffffff, 0.9); g.fillCircle(lx, y+h*0.14, w*0.22)
        break
      }

      case "bench":
        g.fillStyle(darken(c, 0.65), 1); g.fillRect(x, y, w, h*0.45)
        g.fillStyle(c, 1); g.fillRect(x+2, y+1, w-4, h*0.38)
        g.fillStyle(darken(c, 0.7), 1)
        g.fillRect(x+w*0.1, y+h*0.42, w*0.12, h*0.58)
        g.fillRect(x+w*0.78, y+h*0.42, w*0.12, h*0.58)
        break

      case "table":
        g.fillStyle(darken(c, 0.65), 1); g.fillRect(x, y, w, h)
        g.fillStyle(c, 1); g.fillRect(x+2, y+2, w-4, h-4)
        g.fillStyle(darken(c, 0.75), 0.5); g.lineBetween(x+2, y+2, x+w-2, y+h-2); g.lineBetween(x+w-2, y+2, x+2, y+h-2)
        break

      default: {
        // Buildings with 3D depth
        const wallS = type==="tower" ? 18 : (type==="library"||type==="warehouse"||type==="bank") ? 14 : 10
        const wallE = Math.round(wallS * 0.6)
        const shadow = 5

        g.fillStyle(0x000000, 0.1); g.fillRect(x+shadow, y+shadow, w, h)
        g.fillStyle(darken(c, 0.5), 1); g.fillRect(x, y+h, w, wallS)
        g.fillStyle(darken(c, 0.72), 1); g.fillRect(x+w, y+wallE, wallE, h)
        g.fillStyle(c, 1); g.fillRect(x, y, w, h)

        // Library: skylight grid
        if (type==="library" && w>=50 && h>=40) {
          const cols = Math.max(2, Math.floor(w/22)), rows = Math.max(2, Math.floor(h/18))
          const pw = (w-8)/cols, ph = (h-8)/rows
          g.fillStyle(lighten(c, 1.7), 0.65)
          for (let ci=0; ci<cols; ci++) for (let ri=0; ri<rows; ri++)
            g.fillRect(x+4+ci*pw+1, y+4+ri*ph+1, pw-2, ph-2)
          g.lineStyle(1, darken(c, 0.78), 0.7)
          for (let ci=1; ci<cols; ci++) g.lineBetween(x+4+ci*pw, y+2, x+4+ci*pw, y+h-2)
        }

        // Church: cross on roof
        if (type==="church" && w>=30 && h>=40) {
          const cx=x+w/2, cy=y+h*0.4, cw=Math.min(8,w*0.15), ch=Math.min(16,h*0.35)
          g.fillStyle(darken(c, 0.6), 1)
          g.fillRect(cx-cw/2, cy-ch/2, cw, ch)
          g.fillRect(cx-ch*0.35, cy-ch*0.22, ch*0.7, cw)
        }

        // Windows
        if (type!=="library" && w>=40 && h>=36) {
          const ww=Math.max(6,w/5.5), wh=Math.max(4,h/4.5)
          const wc=Math.max(1,Math.floor((w-12)/(ww+6))), wr=Math.max(1,Math.floor((h-12)/(wh+6)))
          const osx=(w-wc*(ww+6)+6)/2, osy=(h-wr*(wh+6)+6)/2
          g.fillStyle(lighten(c, 1.6), 0.8)
          for (let ci=0; ci<wc; ci++) for (let ri=0; ri<wr; ri++)
            g.fillRect(x+osx+ci*(ww+6), y+osy+ri*(wh+6), ww, wh)
        }

        // Border
        g.lineStyle(1, darken(c, 0.62), 0.75)
        g.strokeRect(x, y, w, h)
        break
      }
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  private emitObjects() {
    window.dispatchEvent(new CustomEvent("builder:objects-changed", { detail: { objects: [...this.objects] } }))
  }

  private emitSelection(id: string | null, obj?: MapObject) {
    window.dispatchEvent(new CustomEvent("builder:selection-changed", { detail: { id, obj } }))
  }
}
