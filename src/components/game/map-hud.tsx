"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, Locate, MapPin } from "lucide-react"

// ── Grid constants (mirrors city-scene.ts — top-down 2D) ─────────────────────
const GC = 48
const GR = 48
const TW = 48   // tile size px (same as city-scene.ts)

// Convert player world position to fractional tile coords
function screenToTile(sx: number, sy: number) {
  return { col: sx / TW, row: sy / TW }
}

// Convert tile coords to player world position (tile center)
function tileToScreen(col: number, row: number) {
  return { sx: col * TW + TW / 2, sy: row * TW + TW / 2 }
}

// ── Grid (top-down logical, mirrors city-scene.ts) ────────────────────────────
type Cell = 'water' | 'beach' | 'park' | 'plaza' | 'road' | 'inter' | 'res' | 'com' | 'dt' | 'dock' | 'lake'

const RAW_STR = `
WWWWWWWWRdddddddRsssKsssRsssssssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRssKKKssRsssssssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRsssKsssRssKssssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRsssssssRsKKKsssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRsssssssRssKssssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRsssssssRsssssssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRsssssssRsssssssRKKKKKKKRKKKKKKK
WWWWWWWWRdddddddRsssssssRsssssssRKKKKKKKRKKKKKKK
RRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRR
WWWWWWWWRcccccccRDDDDDDDRDDDDDDDRcccccccRccccccc
WWWWWWWWRcccccccRDDDDDDDRDDDDDDDRcccccccRccccccc
WWWWWWWWRcccccccRDDDDDDDRDDDDDDDRcccccccRccccccc
WWWWWWWWRcccccccRDDDDDDDRDDDDDDDRcccccccRccccccc
WWWWWWWWRcccccccRDDDDDDDRDDPDDDDRcccccccRccccccc
WWWWWWWWRcccccccRDDDDPDDRDPPPDDDRcccccccRccccccc
WWWWWWWWRcccccccRDDPPPDDRDDPPDDDRcccccccRccccccc
RRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRR
WWWWWWWWRKKKKKKKRKKKKKKKRcccccccRcccccccRsssssss
WWWWWWWWRKKLLLKKRKKKKKKKRcccccccRcccccccRsssssss
WWWWWWWWRKKLLLKKRKKKKKKKRPPPPPPPRcccccccRsssssss
WWWWWWWWRKKLLLKKRKKKKKKKRPPPPPPPRcccccccRsssssss
WWWWWWWWRKKLLLKKRKKKKKKKRcccccccRcccccccRsssssss
WWWWWWWWRKKLLLKKRKKKKKKKRcccccccRcccccccRsssssss
WWWWWWWWRKKKKKKKRKKKKKKKRcccccccRcccccccRsssssss
RRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRR
WWWWWWWWRsssssssRssKssssRcccccccRcccccccRsssssss
WWWWWWWWRsssssssRsKKKsssRcccccccRcccccccRsssssss
WWWWWWWWRssKssssRssKssssRcccccccRcccccccRsssssss
WWWWWWWWRsKKKsssRsssssssRcccccccRcccccccRsssssss
WWWWWWWWRssKssssRsssssssRcccccccRcccccccRsssssss
WWWWWWWWRsssssssRsssssssRcccccccRcccccccRsssssss
WWWWWWWWRsssssssRsssssssRcccccccRcccccccRsssssss
RRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRR
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
RRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRRXRRRRRRR
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
BBBBBBBBRsssssssRsssssssRsssssssRsssssssRsssssss
`.trim()
const KEY: Record<string, Cell> = {
  W:'water', B:'beach', K:'park', P:'plaza', R:'road', X:'inter',
  s:'res', c:'com', D:'dt', d:'dock', L:'lake',
}
const GRID: Cell[][] = RAW_STR.split('\n').map(row => row.split('').map(c => KEY[c] ?? 'res'))

const CELL_COLOR: Record<Cell, string> = {
  water: '#0d3a6e', beach: '#b89830', park: '#1a4e1a', plaza: '#505068',
  road: '#1a1a28', inter: '#141420', res: '#383028', com: '#283038', dt: '#182030',
  dock: '#1a3050', lake: '#0d4a8e',
}

// ── Building markers (tile positions) ─────────────────────────────────────────
const MARKERS = [
  { id:'bank',       name:'First Realm Bank',  col:19, row:11, color:'#10b981', icon:'🏦', available:true  },
  { id:'library',    name:'City Library',       col:43, row:11, color:'#3b82f6', icon:'📚', available:true  },
  { id:'gym',        name:'Iron District Gym',  col:43, row:27, color:'#f97316', icon:'🏋️', available:false },
  { id:'hospital',   name:'Realm Medical',      col:36, row:11, color:'#ef4444', icon:'🏥', available:false },
  { id:'university', name:'Realm University',   col:44, row:20, color:'#8b5cf6', icon:'🎓', available:false },
  { id:'mall',       name:'The Mall',           col:28, row:27, color:'#ec4899', icon:'🛍️', available:false },
  { id:'government', name:'City Hall',          col:36, row:27, color:'#64748b', icon:'🏛️', available:false },
  { id:'home',       name:'Your Home',          col:20, row: 3, color:'#f59e0b', icon:'🏠', available:false },
  { id:'office',     name:'Office Tower',       col:22, row:10, color:'#0891b2', icon:'💼', available:false },
  { id:'library2',   name:'Library District',   col:36, row:19, color:'#6366f1', icon:'📖', available:false },
  { id:'marina',     name:'Marina',             col:12, row: 5, color:'#06b6d4', icon:'⚓', available:false },
]

// ── Quick-travel waypoints ────────────────────────────────────────────────────
const WAYPOINTS = [
  { name: 'Financial District', col: 21, row: 12 },
  { name: 'Marina',             col: 12, row:  5 },
  { name: 'North Park',         col: 37, row:  5 },
  { name: 'Central Park',       col: 12, row: 20 },
  { name: 'Ranch Houses',       col: 20, row: 27 },
  { name: 'University Row',     col: 44, row: 20 },
  { name: 'South Beach',        col:  4, row: 40 },
]

// SVG viewBox size (arbitrary logical units for the top-down grid)
const SVG_W = GC * 100
const SVG_H = GR * 100
const CELL_PX = 100

// ── SVG city map ──────────────────────────────────────────────────────────────
function CityMapSVG({
  showLabels = false, showMarkers = false, interactive = false,
  onHoverMarker, hoveredMarker, onClickTile,
}: {
  showLabels?: boolean
  showMarkers?: boolean
  interactive?: boolean
  onHoverMarker?: (id: string | null) => void
  hoveredMarker?: string | null
  onClickTile?: (col: number, row: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onClickTile || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    onClickTile(
      ((e.clientX - rect.left) / rect.width)  * GC,
      ((e.clientY - rect.top)  / rect.height) * GR,
    )
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      style={{ cursor: interactive ? 'crosshair' : 'default' }}
      onClick={interactive ? handleSvgClick : undefined}
    >
      <rect width={SVG_W} height={SVG_H} fill="#05080f" />

      {GRID.map((row, ri) =>
        row.map((cell, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={ci * CELL_PX} y={ri * CELL_PX}
            width={CELL_PX} height={CELL_PX}
            fill={CELL_COLOR[cell]}
            opacity={0.92}
          />
        ))
      )}

      {/* Grid lines at roads */}
      {[8, 16, 24, 32, 40].map(c => (
        <line key={`gc${c}`} x1={c * CELL_PX} y1={0} x2={c * CELL_PX} y2={SVG_H}
          stroke="#0a0a18" strokeWidth={4} />
      ))}
      {[8, 16, 24, 32, 40].map(r => (
        <line key={`gr${r}`} x1={0} y1={r * CELL_PX} x2={SVG_W} y2={r * CELL_PX}
          stroke="#0a0a18" strokeWidth={4} />
      ))}

      {/* Neighbourhood labels */}
      {showLabels && [
        { t:'FINANCIAL',    col:21, row:12 },
        { t:'MARINA',       col:12, row: 3 },
        { t:'NORTH PARK',   col:37, row: 3 },
        { t:'HOSPITAL',     col:36, row:11 },
        { t:'LIBRARY',      col:44, row:11 },
        { t:'CENTRAL PARK', col:12, row:20 },
        { t:'COMMERCE',     col:28, row:20 },
        { t:'LIBRARY 2',    col:36, row:20 },
        { t:'RANCH',        col:15, row:27 },
        { t:'THE MALL',     col:28, row:27 },
        { t:'CITY HALL',    col:36, row:27 },
        { t:'UNIVERSITY',   col:44, row:20 },
        { t:'SOUTH BEACH',  col: 4, row:40 },
      ].map(l => (
        <text key={l.t}
          x={(l.col + 0.5) * CELL_PX} y={(l.row + 0.5) * CELL_PX}
          fontSize={28} fill="#8aaabb" fontWeight="bold"
          textAnchor="middle" dominantBaseline="middle" letterSpacing="2"
          style={{ fontFamily: 'monospace' }} opacity={0.6}
        >{l.t}</text>
      ))}

      {/* Building markers */}
      {showMarkers && MARKERS.map(m => {
        const isHovered = hoveredMarker === m.id
        const cx = (m.col + 0.5) * CELL_PX
        const cy = (m.row + 0.5) * CELL_PX
        const r  = m.available ? (isHovered ? 42 : 34) : (isHovered ? 30 : 24)
        return (
          <g key={m.id}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onMouseEnter={() => onHoverMarker?.(m.id)}
            onMouseLeave={() => onHoverMarker?.(null)}
            onClick={e => { if (interactive) { e.stopPropagation(); onClickTile?.(m.col + 0.5, m.row + 0.5) } }}
          >
            {m.available && <circle cx={cx} cy={cy} r={r * 1.8} fill={m.color} opacity={isHovered ? 0.18 : 0.08} />}
            <circle cx={cx} cy={cy} r={r / 2}
              fill={m.available ? m.color : '#1a1a2a'}
              stroke={m.available ? m.color : '#2a2a3a'}
              strokeWidth={m.available ? (isHovered ? 6 : 4) : 3}
              opacity={m.available ? 1 : 0.4}
            />
            <polygon
              points={`${cx - 6},${cy + r / 2} ${cx + 6},${cy + r / 2} ${cx},${cy + r / 2 + 14}`}
              fill={m.available ? m.color : '#2a2a3a'}
              opacity={m.available ? 0.8 : 0.3}
            />
            <text x={cx} y={cy + r * 0.2} fontSize={r * 0.55} textAnchor="middle"
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
function Minimap({ playerScreenPos, onOpen }: {
  playerScreenPos: { x: number; y: number }
  onOpen: () => void
}) {
  const tile = screenToTile(playerScreenPos.x, playerScreenPos.y)
  const px = Math.max(0, Math.min(100, (tile.col / GC) * 100))
  const py = Math.max(0, Math.min(100, (tile.row / GR) * 100))

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
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        }} />
        <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)',
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
function FullMap({ playerScreenPos, onClose, onTeleport }: {
  playerScreenPos: { x: number; y: number }
  onClose: () => void
  onTeleport: (sx: number, sy: number) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 })
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 })
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null)
  const [hoverInfo, setHoverInfo] = useState<string | null>(null)
  const [teleportTarget, setTeleportTarget] = useState<{ col: number; row: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const dragMoved = useRef(false)

  const playerTile = screenToTile(playerScreenPos.x, playerScreenPos.y)
  const px = Math.max(0, Math.min(100, (playerTile.col / GC) * 100))
  const py = Math.max(0, Math.min(100, (playerTile.row / GR) * 100))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.max(0.7, Math.min(5, z + (e.deltaY < 0 ? 0.25 : -0.25))))
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    setIsDragging(true); dragMoved.current = false
    setDragOrigin({ x: e.clientX, y: e.clientY }); setPanOrigin({ ...pan })
  }

  function getNeighborhoodAt(col: number, row: number): string {
    const c = Math.floor(col), r = Math.floor(row)
    if (r < 0 || r >= GR || c < 0 || c >= GC) return 'Realm City'
    const cell = GRID[r]?.[c]
    if (!cell) return 'Realm City'
    if (cell === 'water') return c < 8 ? 'Pacific Ocean' : 'Ocean'
    if (cell === 'beach') return r >= 33 ? 'South Beach' : 'Beachfront'
    if (cell === 'lake')  return 'Central Park Lake'
    if (cell === 'dock')  return 'Marina District'
    if (cell === 'dt')    return 'Financial District'
    if (cell === 'plaza') return 'Financial Plaza'
    if (cell === 'park') {
      if (r <= 7) return c >= 33 ? 'North Park' : 'Ranch Yard'
      return 'Central Park'
    }
    if (cell === 'com') {
      if (c >= 9  && c <= 15 && r >= 9  && r <= 15) return 'Marina Commercial'
      if (c >= 33 && c <= 39 && r >= 9  && r <= 15) return 'Realm Medical'
      if (c >= 41 && c <= 47 && r >= 9  && r <= 15) return 'City Library'
      if (c >= 25 && c <= 31 && r >= 17 && r <= 23) return 'Commerce District'
      if (c >= 33 && c <= 39 && r >= 17 && r <= 23) return 'Library District'
      if (c >= 25 && c <= 31 && r >= 25 && r <= 31) return 'The Mall'
      if (c >= 33 && c <= 39 && r >= 25 && r <= 31) return 'City Hall District'
      if (c >= 41 && c <= 47 && r >= 25 && r <= 31) return 'Gym District'
      return 'Commercial Zone'
    }
    if (cell === 'res') {
      if (r <= 7) return 'Ranch Houses'
      if (r >= 25 && r <= 31) return 'Ranch South'
      if (r >= 33) return 'Residential'
      return 'Residential'
    }
    return 'Realm City'
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect()
        const col = ((e.clientX - rect.left) / rect.width) * GC
        const row = ((e.clientY - rect.top) / rect.height) * GR
        setHoverInfo(getNeighborhoodAt(col, row))
      }
      return
    }
    const dx = e.clientX - dragOrigin.x, dy = e.clientY - dragOrigin.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true
    setPan({ x: panOrigin.x + dx, y: panOrigin.y + dy })
  }

  function handleMouseUp(e: React.MouseEvent) {
    setIsDragging(false)
    if (!dragMoved.current && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const col = ((e.clientX - rect.left) / rect.width) * GC
      const row = ((e.clientY - rect.top) / rect.height) * GR
      setTeleportTarget({ col, row })
    }
  }

  function doTeleport(col: number, row: number) {
    const { sx, sy } = tileToScreen(col, row)
    onTeleport(sx, sy)
    onClose()
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
            {hoverInfo && <span className="text-white/40 text-xs font-mono ml-4">{hoverInfo}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/25 text-xs font-mono">ESC / M to close</span>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors">
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
              onClickTile={(col, row) => setTeleportTarget({ col, row })}
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
                style={{ left: `${(teleportTarget.col / GC) * 100}%`, top: `${(teleportTarget.row / GR) * 100}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-8 h-8 rounded-full border-2 border-indigo-400 bg-indigo-400/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-indigo-300" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
          }} />
          <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
            background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.5) 100%)',
          }} />
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 inset-x-0 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/30 text-xs font-mono mr-1">QUICK TRAVEL</span>
            {WAYPOINTS.map(wp => (
              <button key={wp.name} onClick={() => doTeleport(wp.col + 0.5, wp.row + 0.5)}
                className="px-3 py-1 bg-white/5 hover:bg-indigo-600/25 border border-white/10 hover:border-indigo-500/40 rounded-full text-white/50 hover:text-white text-xs transition-all">
                {wp.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {teleportTarget && (
              <button onClick={() => doTeleport(teleportTarget.col, teleportTarget.row)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/30">
                <Locate className="w-4 h-4" />
                Teleport Here
              </button>
            )}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button onClick={() => setZoom(z => Math.max(0.7, z - 0.25))}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-white/40 text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.25))}
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
  // Player spawn: financial district centre (matches city-scene.ts pX/pY = 21.5*TW, 12.5*TW)
  const spawn = tileToScreen(21.5, 12.5)
  const [playerScreenPos, setPlayerScreenPos] = useState({ x: spawn.sx, y: spawn.sy })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      setPlayerScreenPos({ x, y })
    }
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

  function handleTeleport(sx: number, sy: number) {
    window.dispatchEvent(new CustomEvent('realm:teleport', { detail: { x: sx, y: sy } }))
    setExpanded(false)
  }

  return (
    <>
      <Minimap playerScreenPos={playerScreenPos} onOpen={() => setExpanded(true)} />
      <AnimatePresence>
        {expanded && (
          <FullMap
            playerScreenPos={playerScreenPos}
            onClose={() => setExpanded(false)}
            onTeleport={handleTeleport}
          />
        )}
      </AnimatePresence>
    </>
  )
}
