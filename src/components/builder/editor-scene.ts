import Phaser from "phaser"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ObjectType =
  | "park" | "water" | "beach" | "plaza"
  | "road-h" | "road-v" | "intersection"
  | "building" | "house" | "ranch" | "library" | "bank" | "church" | "warehouse" | "tower"
  | "tree-large" | "tree-small" | "bush" | "mountain" | "rocks"
  | "lamp" | "bench" | "table"

export type Tool = "select" | "place" | "erase"

export type PasteDir = "east" | "south" | "west" | "north"

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
const HANDLE_SCREEN_R = 7

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
  // Public state (read by React via direct ref)
  objects: MapObject[] = []
  tool: Tool = "select"
  activeType: ObjectType = "building"
  selectedIds = new Set<string>()
  snapEnabled = true
  pasteDir: PasteDir = "east"

  // Graphics
  private bgGfx!: Phaser.GameObjects.Graphics
  private selGfx!: Phaser.GameObjects.Graphics
  private objGfxMap = new Map<string, Phaser.GameObjects.Graphics>()

  // Select drag (move / resize)
  private dragging = false
  private dragMode: "move" | "resize" | null = null
  private dragHandleIdx = -1
  private dragStartWorld = { x: 0, y: 0 }
  private dragObjSnaps = new Map<string, { x: number; y: number }>()  // group move
  private dragSingleSnap = { x: 0, y: 0, w: 0, h: 0 }                // resize only

  // Place drag (draw to place)
  private placeDragActive = false
  private placeDragStart = { x: 0, y: 0 }

  // Camera pan
  private panning = false
  private panStart = { sx: 0, sy: 0, scrollX: 0, scrollY: 0 }

  // Last pointer world position (used for place preview ghost)
  private lastWorld = { x: WORLD / 2, y: WORLD / 2 }

  // Clipboard
  private clipPattern: Array<{
    type: ObjectType; relX: number; relY: number
    w: number; h: number; color: string; label?: string
  }> = []
  private clipBounds = { w: 0, h: 0 }
  private pasteAnchor: { x: number; y: number } | null = null

  private wasd!: {
    w: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
  }
  private shiftKey!: Phaser.Input.Keyboard.Key
  private _cleanup?: () => void

  constructor() {
    super({ key: "EditorScene" })
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  create() {
    this.bgGfx = this.add.graphics().setDepth(0)
    this.bgGfx.fillStyle(0xffffff)
    this.bgGfx.fillRect(0, 0, WORLD, WORLD)
    this.drawGrid()
    this.bgGfx.lineStyle(2, 0x94a3b8, 1)
    this.bgGfx.strokeRect(0, 0, WORLD, WORLD)

    this.selGfx = this.add.graphics().setDepth(100)

    this.cameras.main.setBounds(0, 0, WORLD, WORLD)
    this.cameras.main.setZoom(0.8)
    this.cameras.main.centerOn(WORLD / 2, WORLD / 2)

    this.input.on("pointerdown", this.onPointerDown, this)
    this.input.on("pointermove", this.onPointerMove, this)
    this.input.on("pointerup",   this.onPointerUp,   this)
    this.input.on("wheel", (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.15, 3))
    }, this)

    const kb = this.input.keyboard!
    this.wasd = {
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.shiftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    // Global keyboard (handles Ctrl+C/V, Delete, G, ESC without eating input field keystrokes)
    const onKeydown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); this.copySelected() }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); this.pasteClipboard() }
      if (e.key === "Delete" || e.key === "Backspace") this.deleteSelected()
      if (e.key === "Escape") { this.selectedIds.clear(); this.emitSelection() }
      if (e.key === "g" || e.key === "G") {
        this.snapEnabled = !this.snapEnabled
        window.dispatchEvent(new CustomEvent("builder:snap-changed", { detail: { snap: this.snapEnabled } }))
      }
    }
    document.addEventListener("keydown", onKeydown)

    // Window events from React toolbar
    const onSetTool = (e: Event) => {
      this.tool = (e as CustomEvent<{ tool: Tool }>).detail.tool
      this.selectedIds.clear()
      this.placeDragActive = false
      this.selGfx.clear()
    }
    const onSetType = (e: Event) => {
      this.activeType = (e as CustomEvent<{ objectType: ObjectType }>).detail.objectType
    }
    const onSetPasteDir = (e: Event) => {
      this.pasteDir = (e as CustomEvent<{ dir: PasteDir }>).detail.dir
    }
    const onLoadObjects = (e: Event) => {
      const { objects } = (e as CustomEvent<{ objects: MapObject[] }>).detail
      this.objGfxMap.forEach(g => g.destroy())
      this.objGfxMap.clear()
      this.objects = objects
      objects.forEach(o => this.createObjGfx(o))
    }
    const onClear = () => {
      this.objGfxMap.forEach(g => g.destroy())
      this.objGfxMap.clear()
      this.objects = []
      this.selectedIds.clear()
      this.selGfx.clear()
      this.emitObjects()
    }

    window.addEventListener("builder:set-tool",      onSetTool)
    window.addEventListener("builder:set-type",      onSetType)
    window.addEventListener("builder:set-paste-dir", onSetPasteDir)
    window.addEventListener("builder:load-objects",  onLoadObjects)
    window.addEventListener("builder:clear",         onClear)

    this._cleanup = () => {
      document.removeEventListener("keydown", onKeydown)
      window.removeEventListener("builder:set-tool",      onSetTool)
      window.removeEventListener("builder:set-type",      onSetType)
      window.removeEventListener("builder:set-paste-dir", onSetPasteDir)
      window.removeEventListener("builder:load-objects",  onLoadObjects)
      window.removeEventListener("builder:clear",        onClear)
    }
  }

  shutdown() {
    this._cleanup?.()
    this.game.canvas.style.cursor = "default"
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────

  private drawGrid() {
    this.bgGfx.lineStyle(1, 0xe2e8f0, 1)
    for (let x = 0; x <= WORLD; x += SNAP) this.bgGfx.lineBetween(x, 0, x, WORLD)
    for (let y = 0; y <= WORLD; y += SNAP) this.bgGfx.lineBetween(0, y, WORLD, y)
    this.bgGfx.lineStyle(1, 0xd1d5db, 1)
    for (let x = 0; x <= WORLD; x += 200) this.bgGfx.lineBetween(x, 0, x, WORLD)
    for (let y = 0; y <= WORLD; y += 200) this.bgGfx.lineBetween(0, y, WORLD, y)
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  update(_t: number, d: number) {
    const activeEl = document.activeElement as HTMLElement | null
    const inputFocused = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA"

    if (!inputFocused) {
      const cam = this.cameras.main
      const speed = 500 / cam.zoom
      const dt = d / 1000
      if (this.wasd.w.isDown) cam.scrollY -= speed * dt
      if (this.wasd.s.isDown) cam.scrollY += speed * dt
      if (this.wasd.a.isDown) cam.scrollX -= speed * dt
      if (this.wasd.d.isDown) cam.scrollX += speed * dt
    }

    this.renderOverlay()
  }

  // ── Hit testing ──────────────────────────────────────────────────────────────

  private handles(obj: MapObject) {
    const { x, y, w, h } = obj
    return [
      { x,        y        }, // 0 TL
      { x: x+w/2, y        }, // 1 TM
      { x: x+w,   y        }, // 2 TR
      { x,        y: y+h/2 }, // 3 ML
      { x: x+w,   y: y+h/2 }, // 4 MR
      { x,        y: y+h   }, // 5 BL
      { x: x+w/2, y: y+h   }, // 6 BM
      { x: x+w,   y: y+h   }, // 7 BR
    ]
  }

  private hitHandles(wx: number, wy: number): number {
    if (this.selectedIds.size !== 1) return -1
    const id = [...this.selectedIds][0]
    const obj = this.objects.find(o => o.id === id)
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

  // ── Pointer events ───────────────────────────────────────────────────────────

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonDown()) {
      this.panning = true
      this.panStart = { sx: pointer.x, sy: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY }
      return
    }

    const wx = pointer.worldX, wy = pointer.worldY
    const isShift = this.shiftKey?.isDown ?? false

    if (this.tool === "select") {
      // Resize handle takes priority (only with exactly one selection)
      if (!isShift) {
        const hIdx = this.hitHandles(wx, wy)
        if (hIdx >= 0) {
          const id = [...this.selectedIds][0]
          const obj = this.objects.find(o => o.id === id)!
          this.dragging = true; this.dragMode = "resize"; this.dragHandleIdx = hIdx
          this.dragStartWorld = { x: wx, y: wy }
          this.dragSingleSnap = { x: obj.x, y: obj.y, w: obj.w, h: obj.h }
          return
        }
      }

      const hitId = this.hitObjects(wx, wy)

      if (hitId) {
        if (isShift) {
          // Shift+click: toggle membership in selection
          if (this.selectedIds.has(hitId)) this.selectedIds.delete(hitId)
          else this.selectedIds.add(hitId)
          this.emitSelection()
          return
        }

        if (!this.selectedIds.has(hitId)) {
          // Click on unselected object: select just it
          this.selectedIds.clear()
          this.selectedIds.add(hitId)
        }
        // Start group drag (works whether 1 or many are selected)
        this.dragging = true; this.dragMode = "move"
        this.dragStartWorld = { x: wx, y: wy }
        this.dragObjSnaps.clear()
        this.selectedIds.forEach(id => {
          const o = this.objects.find(obj => obj.id === id)
          if (o) this.dragObjSnaps.set(id, { x: o.x, y: o.y })
        })
        this.emitSelection()
        return
      }

      // Click on empty space: clear selection
      this.selectedIds.clear()
      this.emitSelection()

    } else if (this.tool === "place") {
      // Start place-drag — commit happens on pointerup
      this.placeDragActive = true
      this.placeDragStart = { x: wx, y: wy }

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

    if (this.dragging && this.dragMode === "move") {
      const rawDx = wx - this.dragStartWorld.x, rawDy = wy - this.dragStartWorld.y
      this.selectedIds.forEach(id => {
        const obj = this.objects.find(o => o.id === id)
        const snap = this.dragObjSnaps.get(id)
        if (!obj || !snap) return
        let nx = snap.x + rawDx, ny = snap.y + rawDy
        if (this.snapEnabled) { nx = snapTo(nx); ny = snapTo(ny) }
        obj.x = Phaser.Math.Clamp(nx, 0, WORLD - obj.w)
        obj.y = Phaser.Math.Clamp(ny, 0, WORLD - obj.h)
        this.redrawObj(obj)
      })
      this.emitSelection()
      return
    }

    if (this.dragging && this.dragMode === "resize") {
      const id = [...this.selectedIds][0]
      const obj = this.objects.find(o => o.id === id)
      if (!obj) return
      const dx = wx - this.dragStartWorld.x, dy = wy - this.dragStartWorld.y
      const { x: ox, y: oy, w: ow, h: oh } = this.dragSingleSnap
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
      this.emitSelection()
      return
    }

    // Cursor updates (when not dragging)
    if (!this.dragging && !this.placeDragActive) {
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
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonReleased()) { this.panning = false; return }

    if (this.placeDragActive) {
      this.placeDragActive = false
      const dx = Math.abs(pointer.worldX - this.placeDragStart.x)
      const dy = Math.abs(pointer.worldY - this.placeDragStart.y)
      if (dx < 8 && dy < 8) {
        // Tiny move: treat as click → place at default size
        this.placeAtCenter(this.placeDragStart.x, this.placeDragStart.y)
      } else {
        // Drag: place with drawn bounds
        const b = this.dragPlaceBounds()
        this.placeWithBounds(b.x, b.y, b.w, b.h)
      }
      return
    }

    if (this.dragging) {
      this.dragging = false; this.dragMode = null; this.dragHandleIdx = -1
      this.emitObjects()
    }
  }

  // ── Place drag helpers ────────────────────────────────────────────────────────

  private dragPlaceBounds() {
    let x = Math.min(this.placeDragStart.x, this.lastWorld.x)
    let y = Math.min(this.placeDragStart.y, this.lastWorld.y)
    let w = Math.abs(this.lastWorld.x - this.placeDragStart.x)
    let h = Math.abs(this.lastWorld.y - this.placeDragStart.y)
    if (this.snapEnabled) { x = snapTo(x); y = snapTo(y); w = snapTo(w); h = snapTo(h) }
    return { x, y, w: Math.max(SNAP, w), h: Math.max(SNAP, h) }
  }

  private placeAtCenter(wx: number, wy: number) {
    const [dw, dh] = DEFAULT_SIZE[this.activeType]
    let x = wx - dw/2, y = wy - dh/2
    if (this.snapEnabled) { x = snapTo(x); y = snapTo(y) }
    this.placeWithBounds(
      Phaser.Math.Clamp(x, 0, WORLD - dw),
      Phaser.Math.Clamp(y, 0, WORLD - dh),
      dw, dh
    )
  }

  private placeWithBounds(x: number, y: number, w: number, h: number) {
    const obj: MapObject = {
      id: genId(), type: this.activeType, x, y, w, h,
      color: numToHex(DEFAULT_COLOR[this.activeType]),
    }
    this.objects.push(obj)
    this.createObjGfx(obj)
    this.selectedIds.clear()
    this.selectedIds.add(obj.id)
    this.emitSelection()
    this.emitObjects()
  }

  // ── Object lifecycle ─────────────────────────────────────────────────────────

  deleteObject(id: string) {
    this.objects = this.objects.filter(o => o.id !== id)
    this.objGfxMap.get(id)?.destroy()
    this.objGfxMap.delete(id)
    this.selectedIds.delete(id)
    this.emitSelection()
    this.emitObjects()
  }

  deleteSelected() {
    const ids = [...this.selectedIds]
    ids.forEach(id => {
      this.objects = this.objects.filter(o => o.id !== id)
      this.objGfxMap.get(id)?.destroy()
      this.objGfxMap.delete(id)
    })
    this.selectedIds.clear()
    this.emitSelection()
    this.emitObjects()
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

  // ── Clipboard ────────────────────────────────────────────────────────────────

  copySelected() {
    const sel = this.objects.filter(o => this.selectedIds.has(o.id))
    if (sel.length === 0) return

    const minX = Math.min(...sel.map(o => o.x))
    const minY = Math.min(...sel.map(o => o.y))
    const maxX = Math.max(...sel.map(o => o.x + o.w))
    const maxY = Math.max(...sel.map(o => o.y + o.h))

    this.clipBounds = { w: maxX - minX, h: maxY - minY }
    this.clipPattern = sel.map(o => ({
      type: o.type, relX: o.x - minX, relY: o.y - minY,
      w: o.w, h: o.h, color: o.color, label: o.label,
    }))
    // Anchor starts at the original selection so first paste goes right after it
    this.pasteAnchor = { x: minX, y: minY }

    window.dispatchEvent(new CustomEvent("builder:clipboard-changed", { detail: { count: this.clipPattern.length } }))
  }

  pasteClipboard() {
    if (this.clipPattern.length === 0) return

    let anchor: { x: number; y: number }
    if (this.pasteAnchor === null) {
      const cam = this.cameras.main
      anchor = { x: cam.scrollX + cam.width / cam.zoom / 2 - this.clipBounds.w / 2, y: cam.scrollY + cam.height / cam.zoom / 2 - this.clipBounds.h / 2 }
    } else {
      switch (this.pasteDir) {
        case "east":  anchor = { x: this.pasteAnchor.x + this.clipBounds.w, y: this.pasteAnchor.y }; break
        case "south": anchor = { x: this.pasteAnchor.x, y: this.pasteAnchor.y + this.clipBounds.h }; break
        case "west":  anchor = { x: this.pasteAnchor.x - this.clipBounds.w, y: this.pasteAnchor.y }; break
        case "north": anchor = { x: this.pasteAnchor.x, y: this.pasteAnchor.y - this.clipBounds.h }; break
      }
    }

    if (this.snapEnabled) { anchor.x = snapTo(anchor.x); anchor.y = snapTo(anchor.y) }

    const newIds = new Set<string>()
    this.clipPattern.forEach(p => {
      const x = Phaser.Math.Clamp(anchor.x + p.relX, 0, WORLD - p.w)
      const y = Phaser.Math.Clamp(anchor.y + p.relY, 0, WORLD - p.h)
      const obj: MapObject = { id: genId(), type: p.type, x, y, w: p.w, h: p.h, color: p.color, label: p.label }
      this.objects.push(obj)
      this.createObjGfx(obj)
      newIds.add(obj.id)
    })

    this.pasteAnchor = anchor
    this.selectedIds = newIds
    this.emitSelection()
    this.emitObjects()
  }

  // ── Graphics ─────────────────────────────────────────────────────────────────

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

    // ── Place tool overlay ──────────────────────────────────────────────────
    if (this.tool === "place") {
      const c = DEFAULT_COLOR[this.activeType]
      let px: number, py: number, pw: number, ph: number

      if (this.placeDragActive) {
        // Live drag bounds
        const b = this.dragPlaceBounds()
        px = b.x; py = b.y; pw = b.w; ph = b.h
      } else {
        // Floating ghost at cursor
        const [dw, dh] = DEFAULT_SIZE[this.activeType]
        px = this.lastWorld.x - dw/2; py = this.lastWorld.y - dh/2
        if (this.snapEnabled) { px = snapTo(px); py = snapTo(py) }
        px = Phaser.Math.Clamp(px, 0, WORLD - dw); py = Phaser.Math.Clamp(py, 0, WORLD - dh)
        pw = dw; ph = dh
      }

      g.fillStyle(c, 0.3)
      g.fillRect(px, py, pw, ph)
      g.lineStyle(2 * iz, c, 0.9)
      g.strokeRect(px, py, pw, ph)

      // Dimension label during drag
      if (this.placeDragActive && (pw > SNAP || ph > SNAP)) {
        // Small size readout drawn as a text-like line — we skip actual text since
        // Phaser.GameObjects.Text needs persistent objects. The rect is enough visual feedback.
      }
    }

    if (this.selectedIds.size === 0) return

    const hr = HANDLE_SCREEN_R * iz

    if (this.selectedIds.size === 1) {
      // ── Single selection: border + 8 resize handles ──────────────────────
      const id = [...this.selectedIds][0]
      const obj = this.objects.find(o => o.id === id)
      if (!obj) return
      g.lineStyle(2 * iz, 0x6366f1, 1)
      g.strokeRect(obj.x - iz, obj.y - iz, obj.w + 2*iz, obj.h + 2*iz)
      this.handles(obj).forEach(h => {
        g.fillStyle(0xffffff, 1); g.fillCircle(h.x, h.y, hr)
        g.lineStyle(2 * iz, 0x6366f1, 1); g.strokeCircle(h.x, h.y, hr)
      })
    } else {
      // ── Multi-selection: individual borders + group bounding box ─────────
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      this.selectedIds.forEach(id => {
        const obj = this.objects.find(o => o.id === id)
        if (!obj) return
        g.lineStyle(1.5 * iz, 0x6366f1, 0.75)
        g.strokeRect(obj.x - iz, obj.y - iz, obj.w + 2*iz, obj.h + 2*iz)
        if (obj.x < minX) minX = obj.x
        if (obj.y < minY) minY = obj.y
        if (obj.x + obj.w > maxX) maxX = obj.x + obj.w
        if (obj.y + obj.h > maxY) maxY = obj.y + obj.h
      })
      const pad = 8 * iz
      const bx = minX - pad, by = minY - pad
      const bw = maxX - minX + 2*pad, bh = maxY - minY + 2*pad
      g.lineStyle(1.5 * iz, 0x6366f1, 0.45)
      g.strokeRect(bx, by, bw, bh)
      // Corner anchors
      const cr = 4 * iz
      g.fillStyle(0x6366f1, 0.7)
      ;[[bx, by], [bx+bw, by], [bx, by+bh], [bx+bw, by+bh]].forEach(([hx, hy]) => g.fillCircle(hx, hy, cr))
    }
  }

  // ── Draw each object type ─────────────────────────────────────────────────────

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
        g.lineStyle(1, darken(c, 0.75), 0.5)
        g.lineBetween(x+2, y+2, x+w-2, y+h-2); g.lineBetween(x+w-2, y+2, x+2, y+h-2)
        break

      default: {
        const wallS = type==="tower" ? 18 : (type==="library"||type==="warehouse"||type==="bank") ? 14 : 10
        const wallE = Math.round(wallS * 0.6)
        const shadow = 5

        g.fillStyle(0x000000, 0.1); g.fillRect(x+shadow, y+shadow, w, h)
        g.fillStyle(darken(c, 0.5), 1); g.fillRect(x, y+h, w, wallS)
        g.fillStyle(darken(c, 0.72), 1); g.fillRect(x+w, y+wallE, wallE, h)
        g.fillStyle(c, 1); g.fillRect(x, y, w, h)

        if (type==="library" && w>=50 && h>=40) {
          const cols = Math.max(2, Math.floor(w/22)), rows = Math.max(2, Math.floor(h/18))
          const pw = (w-8)/cols, ph = (h-8)/rows
          g.fillStyle(lighten(c, 1.7), 0.65)
          for (let ci=0; ci<cols; ci++) for (let ri=0; ri<rows; ri++)
            g.fillRect(x+4+ci*pw+1, y+4+ri*ph+1, pw-2, ph-2)
          g.lineStyle(1, darken(c, 0.78), 0.7)
          for (let ci=1; ci<cols; ci++) g.lineBetween(x+4+ci*pw, y+2, x+4+ci*pw, y+h-2)
        }

        if (type==="church" && w>=30 && h>=40) {
          const cx=x+w/2, cy=y+h*0.4, cw=Math.min(8,w*0.15), ch=Math.min(16,h*0.35)
          g.fillStyle(darken(c, 0.6), 1)
          g.fillRect(cx-cw/2, cy-ch/2, cw, ch)
          g.fillRect(cx-ch*0.35, cy-ch*0.22, ch*0.7, cw)
        }

        if (type!=="library" && w>=40 && h>=36) {
          const ww=Math.max(6,w/5.5), wh=Math.max(4,h/4.5)
          const wc=Math.max(1,Math.floor((w-12)/(ww+6))), wr=Math.max(1,Math.floor((h-12)/(wh+6)))
          const osx=(w-wc*(ww+6)+6)/2, osy=(h-wr*(wh+6)+6)/2
          g.fillStyle(lighten(c, 1.6), 0.8)
          for (let ci=0; ci<wc; ci++) for (let ri=0; ri<wr; ri++)
            g.fillRect(x+osx+ci*(ww+6), y+osy+ri*(wh+6), ww, wh)
        }

        g.lineStyle(1, darken(c, 0.62), 0.75)
        g.strokeRect(x, y, w, h)
        break
      }
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  private emitObjects() {
    window.dispatchEvent(new CustomEvent("builder:objects-changed", { detail: { objects: [...this.objects] } }))
  }

  private emitSelection() {
    const ids = [...this.selectedIds]
    const objects = ids.map(id => this.objects.find(o => o.id === id)).filter(Boolean) as MapObject[]
    const primary = objects.length === 1 ? objects[0] : null
    window.dispatchEvent(new CustomEvent("builder:selection-changed", { detail: { ids, objects, primary } }))
  }
}
