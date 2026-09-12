"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, Locate, MapPin } from "lucide-react"

const WORLD_W = 4800
const WORLD_H = 4800
const COLS    = 12
const ROWS    = 12
const CELL    = 400
const BLOCK   = 320

// ── Grid (mirrors city-scene.ts) ─────────────────────────────────────────────
type Cell = 'water' | 'beach' | 'park' | 'plaza' | 'res' | 'com' | 'dt'
const GRID: Cell[][] = [
  ['water','water','water','beach','beach','res',  'res',  'res',  'res',  'res',  'res',  'res'],
  ['water','water','beach','beach','res',  'res',  'park', 'park', 'res',  'res',  'res',  'res'],
  ['water','beach','beach','res',  'res',  'park', 'park', 'park', 'res',  'res',  'res',  'res'],
  ['water','beach','res',  'res',  'park', 'park', 'park', 'res',  'res',  'com',  'com',  'res'],
  ['beach','beach','res',  'res',  'res',  'res',  'res',  'com',  'com',  'com',  'com',  'res'],
  ['beach','beach','com',  'com',  'res',  'res',  'com',  'com',  'com',  'com',  'res',  'res'],
  ['beach','beach','com',  'com',  'com',  'dt',   'dt',   'dt',   'com',  'com',  'res',  'res'],
  ['water','beach','com',  'com',  'dt',   'dt',   'dt',   'dt',   'com',  'com',  'res',  'res'],
  ['water','water','plaza','com',  'dt',   'dt',   'dt',   'com',  'com',  'res',  'res',  'res'],
  ['water','water','water','plaza','com',  'com',  'com',  'com',  'res',  'res',  'res',  'res'],
  ['water','water','water','water','water','plaza', 'com',  'res',  'res',  'res',  'res',  'res'],
  ['water','water','water','water','water','water', 'water','water','water','water','water','water'],
]

const CELL_COLOR: Record<Cell, string> = {
  water: '#0d4a78',
  beach: '#c8b460',
  park:  '#1a5a1a',
  plaza: '#505060',
  res:   '#444038',
  com:   '#384048',
  dt:    '#283040',
}

// ── Building markers (world-space centers) ────────────────────────────────────
const MARKERS = [
  { id: 'bank',       name: 'First Realm Bank', x: 5*CELL+BLOCK/2, y: 7*CELL+BLOCK/2, color: '#10b981', icon: '🏦', available: true  },
  { id: 'library',    name: 'City Library',      x: 7*CELL+BLOCK/2, y: 3*CELL+BLOCK/2, color: '#3b82f6', icon: '📚', available: true  },
  { id: 'government', name: 'City Hall',         x: 4*CELL+BLOCK/2, y: 7*CELL+BLOCK/2, color: '#64748b', icon: '🏛️', available: false },
  { id: 'office',     name: 'Office Tower',      x: 6*CELL+BLOCK/2, y: 8*CELL+BLOCK/2, color: '#0891b2', icon: '💼', available: false },
  { id: 'hospital',   name: 'Realm Medical',     x: 4*CELL+BLOCK/2, y: 6*CELL+BLOCK/2, color: '#ef4444', icon: '🏥', available: false },
  { id: 'university', name: 'Realm University',  x: 8*CELL+BLOCK/2, y: 1*CELL+BLOCK/2, color: '#8b5cf6', icon: '🎓', available: false },
  { id: 'mall',       name: 'The Mall',          x:10*CELL+BLOCK/2, y: 3*CELL+BLOCK/2, color: '#ec4899', icon: '🛍️', available: false },
  { id: 'gym',        name: 'Iron District Gym', x: 2*CELL+BLOCK/2, y: 5*CELL+BLOCK/2, color: '#f97316', icon: '🏋️', available: false },
  { id: 'home',       name: 'Your Home',         x:10*CELL+BLOCK/2, y: 0*CELL+BLOCK/2, color: '#f59e0b', icon: '🏠', available: false },
]

// ── Quick-travel waypoints ────────────────────────────────────────────────────
const WAYPOINTS = [
  { name: 'Downtown',      x: 5*CELL+200,  y: 7*CELL+200  },
  { name: 'Balboa Park',   x: 5*CELL+200,  y: 2*CELL+200  },
  { name: 'Pacific Beach', x: 1*CELL+200,  y: 4*CELL+200  },
  { name: 'La Jolla',      x: 8*CELL+200,  y: 1*CELL+200  },
  { name: 'UTC',           x:10*CELL+200,  y: 3*CELL+200  },
  { name: 'Embarcadero',   x: 3*CELL+200,  y: 9*CELL+200  },
  { name: 'Hillcrest',     x: 4*CELL+200,  y: 5*CELL+200  },
  { name: 'North County',  x: 9*CELL+200,  y: 0*CELL+200  },
]

// ── SVG grid city map ─────────────────────────────────────────────────────────
function CityMapSVG({ showLabels = false, showMarkers = false, interactive = false,
  onHoverMarker, hoveredMarker, onClickMap }: {
  showLabels?: boolean
  showMarkers?: boolean
  interactive?: boolean
  onHoverMarker?: (id: string | null) => void
  hoveredMarker?: string | null
  onClickMap?: (wx: number, wy: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onClickMap || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    onClickMap(
      ((e.clientX - rect.left) / rect.width)  * WORLD_W,
      ((e.clientY - rect.top)  / rect.height) * WORLD_H
    )
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="w-full h-full"
      style={{ cursor: interactive ? 'crosshair' : 'default' }}
      onClick={interactive ? handleSvgClick : undefined}
    >
      {/* Background */}
      <rect width={WORLD_W} height={WORLD_H} fill="#050810" />

      {/* Grid cells */}
      {GRID.map((row, ri) =>
        row.map((cell, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={ci * CELL} y={ri * CELL}
            width={CELL} height={CELL}
            fill={CELL_COLOR[cell]}
            opacity={0.9}
          />
        ))
      )}

      {/* Road grid overlay */}
      {Array.from({ length: ROWS }, (_, ri) =>
        Array.from({ length: COLS }, (_, ci) => {
          if (GRID[ri][ci] === 'water') return null
          const x = ci * CELL, y = ri * CELL
          const lines = []
          if (ci < COLS - 1 && GRID[ri][ci + 1] !== 'water')
            lines.push(<line key={`rv${ri}-${ci}`} x1={x+BLOCK} y1={y} x2={x+BLOCK} y2={y+CELL} stroke="#181828" strokeWidth={CELL*0.04} />)
          if (ri < ROWS - 1 && GRID[ri + 1][ci] !== 'water')
            lines.push(<line key={`rh${ri}-${ci}`} x1={x} y1={y+BLOCK} x2={x+CELL} y2={y+BLOCK} stroke="#181828" strokeWidth={CELL*0.04} />)
          return lines
        })
      )}

      {/* Neighbourhood labels */}
      {showLabels && [
        { t: 'DOWNTOWN',       col: 5,  row: 7  },
        { t: 'BALBOA PARK',    col: 5,  row: 2  },
        { t: 'PACIFIC BEACH',  col: 0,  row: 4  },
        { t: 'HILLCREST',      col: 4,  row: 5  },
        { t: 'LA JOLLA',       col: 8,  row: 0  },
        { t: 'UTC',            col: 10, row: 2  },
        { t: 'CARMEL VALLEY',  col: 9,  row: 0  },
        { t: 'EMBARCADERO',    col: 3,  row: 9  },
        { t: 'NORTH PARK',     col: 9,  row: 5  },
        { t: 'NORTH COUNTY',   col: 9,  row: 2  },
      ].map((l) => (
        <text key={l.t}
          x={l.col * CELL + CELL / 2} y={l.row * CELL + CELL / 2}
          fontSize={60} fill="#8aaabb" fontWeight="bold"
          textAnchor="middle" dominantBaseline="middle" letterSpacing="4"
          style={{ fontFamily: 'monospace' }} opacity={0.6}
        >
          {l.t}
        </text>
      ))}

      {/* Building markers */}
      {showMarkers && MARKERS.map((m) => {
        const isHovered = hoveredMarker === m.id
        const r = m.available ? (isHovered ? 130 : 100) : (isHovered ? 90 : 70)
        return (
          <g key={m.id}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onMouseEnter={() => onHoverMarker?.(m.id)}
            onMouseLeave={() => onHoverMarker?.(null)}
            onClick={(e) => { if (interactive) { e.stopPropagation(); onClickMap?.(m.x, m.y) } }}
          >
            {m.available && <circle cx={m.x} cy={m.y} r={r * 1.8} fill={m.color} opacity={isHovered ? 0.18 : 0.08} />}
            <circle cx={m.x} cy={m.y} r={r / 2}
              fill={m.available ? m.color : '#1a1a2a'}
              stroke={m.available ? m.color : '#2a2a3a'}
              strokeWidth={m.available ? (isHovered ? 18 : 10) : 8}
              opacity={m.available ? 1 : 0.4}
            />
            <polygon
              points={`${m.x - 18},${m.y + r / 2} ${m.x + 18},${m.y + r / 2} ${m.x},${m.y + r / 2 + 40}`}
              fill={m.available ? m.color : '#2a2a3a'}
              opacity={m.available ? 0.8 : 0.3}
            />
            <text x={m.x} y={m.y + r * 0.2} fontSize={r * 0.55} textAnchor="middle"
              opacity={m.available ? 1 : 0.25}>
              {m.available ? m.icon : '🔒'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Minimap ───────────────────────────────────────────────────────────────────
function Minimap({ playerPos, onOpen }: { playerPos: { x: number; y: number }; onOpen: () => void }) {
  const px = (playerPos.x / WORLD_W) * 100
  const py = (playerPos.y / WORLD_H) * 100

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.4 }}
      className="fixed bottom-6 left-6 z-30 select-none"
    >
      <button
        onClick={onOpen}
        className="group relative block rounded-xl overflow-hidden border border-white/15 hover:border-indigo-500/50 transition-all shadow-2xl shadow-black/60"
        style={{ width: 174, height: 174, background: '#050810' }}
        title="Open map  [M]"
      >
        <div className="absolute inset-0"><CityMapSVG /></div>

        {/* Player dot */}
        <div className="absolute pointer-events-none"
          style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          <div className="absolute inset-0 w-5 h-5 -translate-x-1 -translate-y-1 rounded-full bg-yellow-400/30 animate-ping" />
          <div className="relative w-3 h-3 rounded-full bg-yellow-400 border border-yellow-200 shadow-lg shadow-yellow-400/50" />
        </div>

        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)'
        }} />
        <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)'
        }} />
        <div className="absolute top-1.5 left-2 text-white/50 text-xs font-mono font-bold tracking-widest">MAP</div>
        <div className="absolute bottom-1.5 right-2 text-white/30 text-xs font-mono">[M]</div>
        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <span className="text-white/80 text-xs font-semibold bg-black/50 px-2 py-1 rounded">Open Map</span>
        </div>
      </button>
    </motion.div>
  )
}

// ── Full map overlay ──────────────────────────────────────────────────────────
function FullMap({ playerPos, onClose, onTeleport }: {
  playerPos: { x: number; y: number }
  onClose: () => void
  onTeleport: (x: number, y: number) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 })
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 })
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null)
  const [hoverInfo, setHoverInfo] = useState<{ name: string } | null>(null)
  const [teleportTarget, setTeleportTarget] = useState<{ x: number; y: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const dragMoved = useRef(false)

  const px = (playerPos.x / WORLD_W) * 100
  const py = (playerPos.y / WORLD_H) * 100

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom((z) => Math.max(0.7, Math.min(5, z + (e.deltaY < 0 ? 0.25 : -0.25))))
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    setIsDragging(true)
    dragMoved.current = false
    setDragOrigin({ x: e.clientX, y: e.clientY })
    setPanOrigin({ ...pan })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width
        const relY = (e.clientY - rect.top) / rect.height
        const wx = ((relX - 0.5) / zoom - pan.x / (rect.width * zoom) + 0.5) * WORLD_W
        const wy = ((relY - 0.5) / zoom - pan.y / (rect.height * zoom) + 0.5) * WORLD_H
        setHoverInfo({ name: getNeighborhoodAt(wx, wy) })
      }
      return
    }
    const dx = e.clientX - dragOrigin.x
    const dy = e.clientY - dragOrigin.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true
    setPan({ x: panOrigin.x + dx, y: panOrigin.y + dy })
  }

  function handleMouseUp(e: React.MouseEvent) {
    setIsDragging(false)
    if (!dragMoved.current && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      const relY = (e.clientY - rect.top) / rect.height
      const wx = ((relX - 0.5) / zoom - pan.x / (rect.width * zoom) + 0.5) * WORLD_W
      const wy = ((relY - 0.5) / zoom - pan.y / (rect.height * zoom) + 0.5) * WORLD_H
      setTeleportTarget({ x: Math.round(wx), y: Math.round(wy) })
    }
  }

  function teleportTo(x: number, y: number) { onTeleport(x, y); onClose() }

  function getNeighborhoodAt(wx: number, wy: number): string {
    const col = Math.floor(wx / CELL)
    const row = Math.floor(wy / CELL)
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 'Realm City'
    const cell = GRID[row]?.[col]
    if (cell === 'water') return 'Pacific Ocean'
    if (cell === 'beach') return 'Pacific Beach'
    if (cell === 'park')  return 'Balboa Park'
    if (cell === 'plaza') return 'Embarcadero'
    if (row >= 6 && row <= 8 && col >= 4 && col <= 7) return 'Downtown'
    if (row <= 2 && col >= 7) return 'La Jolla'
    if (row <= 1 && col >= 9) return 'Carmel Valley'
    if (col >= 9 && row <= 4) return 'UTC'
    if (col <= 1) return 'Pacific Beach'
    if (col >= 3 && col <= 6 && row >= 4 && row <= 5) return 'Hillcrest'
    if (row <= 3 && col >= 4 && col <= 8) return 'North Park'
    return 'Realm City'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
    >
      <div className="relative flex flex-col h-full w-full max-w-7xl p-4 pt-14 pb-16">
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-white font-bold tracking-widest text-sm">REALM CITY MAP</span>
            {hoverInfo && <span className="text-white/40 text-xs font-mono ml-4">{hoverInfo.name}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/25 text-xs font-mono">ESC / M to close</span>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Map area */}
        <div
          ref={mapRef}
          className="flex-1 relative rounded-xl overflow-hidden border border-white/10 select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'crosshair', background: '#050810' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); setHoverInfo(null) }}
        >
          <div className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              willChange: 'transform',
            }}
          >
            <CityMapSVG showLabels showMarkers interactive
              hoveredMarker={hoveredMarker}
              onHoverMarker={setHoveredMarker}
              onClickMap={(wx, wy) => setTeleportTarget({ x: Math.round(wx), y: Math.round(wy) })}
            />

            {/* Player marker */}
            <div className="absolute pointer-events-none"
              style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400/30 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-white shadow-lg shadow-yellow-400/60 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            {teleportTarget && (
              <div className="absolute pointer-events-none"
                style={{ left: `${(teleportTarget.x / WORLD_W) * 100}%`, top: `${(teleportTarget.y / WORLD_H) * 100}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-8 h-8 rounded-full border-2 border-indigo-400 bg-indigo-400/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-indigo-300" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)'
          }} />
          <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
            background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.5) 100%)'
          }} />
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 inset-x-0 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/30 text-xs font-mono mr-1">QUICK TRAVEL</span>
            {WAYPOINTS.map((wp) => (
              <button key={wp.name} onClick={() => teleportTo(wp.x, wp.y)}
                className="px-3 py-1 bg-white/5 hover:bg-indigo-600/25 border border-white/10 hover:border-indigo-500/40 rounded-full text-white/50 hover:text-white text-xs transition-all">
                {wp.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {teleportTarget && (
              <button onClick={() => { teleportTo(teleportTarget.x, teleportTarget.y) }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/30">
                <Locate className="w-4 h-4" />
                Teleport Here
              </button>
            )}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button onClick={() => setZoom((z) => Math.max(0.7, z - 0.25))}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-white/40 text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MapHUD() {
  const [playerPos, setPlayerPos] = useState({ x: 5 * CELL + 200, y: 7 * CELL + 360 })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => setPlayerPos((e as CustomEvent<{ x: number; y: number }>).detail)
    window.addEventListener('realm:player-position', handler)
    return () => window.removeEventListener('realm:player-position', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'm' || e.key === 'M') && !expanded) setExpanded(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  function handleTeleport(x: number, y: number) {
    window.dispatchEvent(new CustomEvent('realm:teleport', { detail: { x, y } }))
    setExpanded(false)
  }

  return (
    <>
      <Minimap playerPos={playerPos} onOpen={() => setExpanded(true)} />
      <AnimatePresence>
        {expanded && (
          <FullMap playerPos={playerPos} onClose={() => setExpanded(false)} onTeleport={handleTeleport} />
        )}
      </AnimatePresence>
    </>
  )
}
