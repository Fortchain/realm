"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, Locate, MapPin } from "lucide-react"

const WORLD_W = 3600
const WORLD_H = 3000

// ── Building markers (world-space centers) ────────────────────────────────
const MARKERS = [
  { id: "bank",       name: "First Realm Bank",  x: 1000, y: 1905, color: "#10b981", hex: 0x10b981, icon: "🏦", available: true  },
  { id: "library",    name: "City Library",       x: 1005, y: 1500, color: "#3b82f6", hex: 0x3b82f6, icon: "📚", available: true  },
  { id: "government", name: "City Hall",          x: 840,  y: 1910, color: "#64748b", hex: 0x64748b, icon: "🏛️", available: false },
  { id: "police",     name: "Police Department",  x: 1140, y: 1905, color: "#334155", hex: 0x334155, icon: "🚔", available: false },
  { id: "hospital",   name: "Realm Medical",      x: 807,  y: 1450, color: "#ef4444", hex: 0xef4444, icon: "🏥", available: false },
  { id: "university", name: "Realm University",   x: 670,  y: 570,  color: "#8b5cf6", hex: 0x8b5cf6, icon: "🎓", available: false },
  { id: "mall",       name: "The Mall (UTC)",     x: 795,  y: 465,  color: "#ec4899", hex: 0xec4899, icon: "🛍️", available: false },
  { id: "gym",        name: "Iron District Gym",  x: 485,  y: 870,  color: "#f97316", hex: 0xf97316, icon: "🏋️", available: false },
  { id: "home",       name: "Your Home",          x: 1010, y: 360,  color: "#f59e0b", hex: 0xf59e0b, icon: "🏠", available: false },
]

// ── Quick-travel waypoints ─────────────────────────────────────────────────
const WAYPOINTS = [
  { name: "Downtown",     x: 920,  y: 1870 },
  { name: "Balboa Park",  x: 990,  y: 1510 },
  { name: "Pacific Beach",x: 450,  y: 820  },
  { name: "La Jolla",     x: 380,  y: 550  },
  { name: "UTC",          x: 750,  y: 420  },
  { name: "North County", x: 1050, y: 320  },
  { name: "Embarcadero",  x: 640,  y: 1800 },
  { name: "Coronado",     x: 475,  y: 2300 },
]

// ── SVG path data (matches Phaser world coordinates) ──────────────────────
const P = {
  land: "M390,200L340,320L295,460L278,580L315,700L370,820L345,940L330,1050L295,1180L255,1360L360,1560L520,1720L680,1810L820,1900L840,2050L880,2200L840,2450L790,2650L760,3000L3600,3000L3600,200Z",
  bay: "M360,1560L500,1640L540,1720L630,1790L730,1850L820,1900L840,2050L880,2200L840,2450L790,2650L760,2820L680,2900L570,2880L490,2800L460,2680L420,2500L395,2380L380,2200L370,1980L355,1760Z",
  coronado: "M390,2100L460,2040L540,2080L580,2180L570,2320L540,2460L500,2580L460,2650L430,2600L400,2480L375,2320L370,2180Z",
  missionBay: "M355,920L410,870L490,855L570,880L620,940L640,1040L620,1150L560,1230L470,1260L390,1230L345,1150L330,1050L335,970Z",
  balboapark: "M840,1290L1000,1270L1150,1290L1170,1460L1150,1640L1120,1720L980,1740L850,1720L830,1620L820,1460L830,1360Z",
}

// ── Shared SVG city map ───────────────────────────────────────────────────
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
    const rx = (e.clientX - rect.left) / rect.width
    const ry = (e.clientY - rect.top) / rect.height
    const wx = rx * WORLD_W
    const wy = ry * WORLD_H
    onClickMap(wx, wy)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="w-full h-full"
      style={{ cursor: interactive ? "crosshair" : "default" }}
      onClick={interactive ? handleSvgClick : undefined}
    >
      {/* Ocean */}
      <rect width={WORLD_W} height={WORLD_H} fill="#05101e" />
      {/* Ocean shimmer */}
      {[...Array(12)].map((_, i) => (
        <rect key={i} x={0} y={i * 250} width={400} height={120} fill="#0a1e32" opacity={0.3 + (i % 3) * 0.1} />
      ))}

      {/* Land */}
      <path d={P.land} fill="#0e1918" />
      {/* Land texture */}
      <path d={P.land} fill="none" stroke="#0d1e17" strokeWidth={4} />

      {/* San Diego Bay */}
      <path d={P.bay} fill="#071828" />
      <path d={P.bay} fill="none" stroke="#1a4a7a" strokeWidth={3} opacity={0.4} />

      {/* Coronado */}
      <path d={P.coronado} fill="#101e18" />
      <path d={P.coronado} fill="none" stroke="#1a3a28" strokeWidth={2} />

      {/* Mission Bay */}
      <path d={P.missionBay} fill="#071828" />
      <path d={P.missionBay} fill="none" stroke="#1a4a7a" strokeWidth={2} opacity={0.35} />

      {/* Balboa Park */}
      <path d={P.balboapark} fill="#0d2210" />
      <path d={P.balboapark} fill="none" stroke="#1a4a22" strokeWidth={3} opacity={0.5} />

      {/* North County green tint */}
      <rect x={500} y={200} width={3000} height={700} fill="#0d1a12" opacity={0.35} />

      {/* Downtown footprint */}
      <rect x={680} y={1750} width={600} height={350} fill="#0a0f14" opacity={0.4} rx={4} />

      {/* Freeways */}
      <polyline points="845,200 848,400 851,600 855,800 860,1000 865,1200 868,1380 875,1560 870,1700 855,1820 845,1870 830,1920"
        fill="none" stroke="#040810" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="845,200 848,400 851,600 855,800 860,1000 865,1200 868,1380 875,1560 870,1700 855,1820 845,1870 830,1920"
        fill="none" stroke="#141420" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />

      <polyline points="570,1340 700,1330 900,1320 1100,1320 1400,1325 1700,1330 2000,1340 2400,1350"
        fill="none" stroke="#040810" strokeWidth={10} strokeLinecap="round" />
      <polyline points="570,1340 700,1330 900,1320 1100,1320 1400,1325 1700,1330 2000,1340 2400,1350"
        fill="none" stroke="#141420" strokeWidth={7} strokeLinecap="round" />

      <polyline points="1450,200 1448,500 1445,800 1445,1100 1445,1400 1450,1700 1440,2000"
        fill="none" stroke="#141420" strokeWidth={6} strokeLinecap="round" />

      <polyline points="960,1060 962,1200 964,1350 966,1500 966,1650 958,1760"
        fill="none" stroke="#141420" strokeWidth={5} strokeLinecap="round" />

      {/* Major roads */}
      <polyline points="430,200 415,340 390,480 388,620 420,760 440,900 410,1020 390,1160"
        fill="none" stroke="#131826" strokeWidth={5} strokeLinecap="round" />
      <polyline points="375,1580 440,1640 530,1710 640,1770 740,1830 800,1880"
        fill="none" stroke="#131826" strokeWidth={6} strokeLinecap="round" />
      <polyline points="390,1040 500,1038 640,1045 780,1055 950,1060 1200,1065 1500,1070"
        fill="none" stroke="#131826" strokeWidth={5} strokeLinecap="round" />
      <polyline points="360,820 430,818 530,822 640,820 750,820"
        fill="none" stroke="#131826" strokeWidth={5} strokeLinecap="round" />
      <polyline points="700,380 695,480 688,580 680,700 670,840 665,960 660,1080 660,1200 660,1380"
        fill="none" stroke="#131826" strokeWidth={4} strokeLinecap="round" />
      <line x1="900" y1="1760" x2="1600" y2="1760" stroke="#131826" strokeWidth={4} />
      <line x1="840" y1="680" x2="1600" y2="685" stroke="#131826" strokeWidth={3} />

      {/* Downtown grid */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={`dth${i}`} x1={720 - i * 2} y1={1775 + i * 44} x2={1200 - i * 2} y2={1775 + i * 44}
          stroke="#131320" strokeWidth={4} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line key={`dtv${i}`} x1={720 + i * 58} y1={1755} x2={720 + i * 58} y2={2100}
          stroke="#131320" strokeWidth={4} />
      ))}

      {/* Coronado Bridge */}
      <polyline points="790,2060 750,2080 700,2110 650,2140 600,2160 550,2175 500,2185 470,2200"
        fill="none" stroke="#000000" strokeWidth={8} opacity={0.5} />
      <polyline points="790,2060 750,2080 700,2110 650,2140 600,2160 550,2175 500,2185 470,2200"
        fill="none" stroke="#2a2a4a" strokeWidth={5} />

      {/* Beach edge (west coast) */}
      <polyline points="390,200 345,310 300,450 283,570 318,692 375,815 350,938 335,1045 300,1175 260,1355 368,1555"
        fill="none" stroke="#9a8060" strokeWidth={10} opacity={0.15} />

      {/* Neighborhood labels (full map only) */}
      {showLabels && (
        <g opacity={0.55}>
          {[
            { t: "DOWNTOWN",       x: 910,  y: 2000, s: 38 },
            { t: "GASLAMP",        x: 890,  y: 2070, s: 24 },
            { t: "BALBOA PARK",    x: 990,  y: 1510, s: 28 },
            { t: "HILLCREST",      x: 820,  y: 1280, s: 24 },
            { t: "PACIFIC BEACH",  x: 450,  y: 750,  s: 24 },
            { t: "LA JOLLA",       x: 380,  y: 545,  s: 28 },
            { t: "OCEAN BEACH",    x: 395,  y: 1050, s: 22 },
            { t: "MISSION BAY",    x: 490,  y: 1060, s: 22 },
            { t: "UTC",            x: 750,  y: 360,  s: 22 },
            { t: "CARMEL VALLEY",  x: 1000, y: 250,  s: 22 },
            { t: "NORTH COUNTY",   x: 1680, y: 420,  s: 32 },
            { t: "CORONADO",       x: 475,  y: 2300, s: 24 },
            { t: "POINT LOMA",     x: 315,  y: 1260, s: 22, angle: -15 },
            { t: "EAST COUNTY",    x: 2400, y: 1200, s: 34 },
            { t: "MISSION VALLEY", x: 1100, y: 1350, s: 22 },
            { t: "MIRAMAR",        x: 1200, y: 665,  s: 22 },
            { t: "NATIONAL CITY",  x: 870,  y: 2510, s: 22 },
          ].map((l) => (
            <text key={l.t} x={l.x} y={l.y} fontSize={l.s} fill="#8aaabb" fontWeight="bold"
              textAnchor="middle" letterSpacing="3"
              transform={l.angle ? `rotate(${l.angle}, ${l.x}, ${l.y})` : undefined}
              style={{ fontFamily: "monospace" }}
            >
              {l.t}
            </text>
          ))}
        </g>
      )}

      {/* Building markers */}
      {showMarkers && MARKERS.map((m) => {
        const isHovered = hoveredMarker === m.id
        const size = m.available ? (isHovered ? 52 : 40) : (isHovered ? 38 : 28)
        return (
          <g key={m.id} style={{ cursor: interactive ? "pointer" : "default" }}
            onMouseEnter={() => onHoverMarker?.(m.id)}
            onMouseLeave={() => onHoverMarker?.(null)}
            onClick={(e) => { if (interactive) { e.stopPropagation(); onClickMap?.(m.x, m.y) } }}
          >
            {/* Glow for available */}
            {m.available && (
              <circle cx={m.x} cy={m.y} r={size * 1.6} fill={m.color} opacity={isHovered ? 0.2 : 0.1} />
            )}
            {/* Marker circle */}
            <circle cx={m.x} cy={m.y} r={size / 2}
              fill={m.available ? m.color : "#1a1a2a"}
              stroke={m.available ? m.color : "#2a2a3a"}
              strokeWidth={m.available ? (isHovered ? 6 : 3) : 2}
              opacity={m.available ? 1 : 0.4}
            />
            {/* Pin spike */}
            <polygon
              points={`${m.x - 6},${m.y + size / 2} ${m.x + 6},${m.y + size / 2} ${m.x},${m.y + size / 2 + 14}`}
              fill={m.available ? m.color : "#2a2a3a"}
              opacity={m.available ? 0.8 : 0.3}
            />
            {/* Icon text */}
            <text x={m.x} y={m.y + 6} fontSize={size * 0.55} textAnchor="middle"
              opacity={m.available ? 1 : 0.25}
            >
              {m.available ? m.icon : "🔒"}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Minimap widget ────────────────────────────────────────────────────────
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
        style={{ width: 174, height: 146, background: "#05101e" }}
        title="Open map  [M]"
      >
        {/* Map SVG */}
        <div className="absolute inset-0">
          <CityMapSVG />
        </div>

        {/* Player dot */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${px}%`, top: `${py}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
        >
          {/* Outer pulse */}
          <div className="absolute inset-0 w-5 h-5 -translate-x-1 -translate-y-1 rounded-full bg-yellow-400/30 animate-ping" />
          {/* Arrow/dot */}
          <div className="relative w-3 h-3 rounded-full bg-yellow-400 border border-yellow-200 shadow-lg shadow-yellow-400/50" />
        </div>

        {/* Scan line overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)"
        }} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
          background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)"
        }} />

        {/* HUD label */}
        <div className="absolute top-1.5 left-2 text-white/50 text-xs font-mono font-bold tracking-widest">MAP</div>
        <div className="absolute bottom-1.5 right-2 text-white/30 text-xs font-mono">[M]</div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <span className="text-white/80 text-xs font-semibold bg-black/50 px-2 py-1 rounded">Open Map</span>
        </div>
      </button>
    </motion.div>
  )
}

// ── Full map overlay ──────────────────────────────────────────────────────
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
  const [hoverInfo, setHoverInfo] = useState<{ name: string; wx: number; wy: number } | null>(null)
  const [teleportTarget, setTeleportTarget] = useState<{ x: number; y: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const dragMoved = useRef(false)

  const px = (playerPos.x / WORLD_W) * 100
  const py = (playerPos.y / WORLD_H) * 100

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M" || e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.25 : -0.25
    setZoom((z) => Math.max(0.7, Math.min(5, z + delta)))
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
      // Show hover info
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width
        const relY = (e.clientY - rect.top) / rect.height
        // Account for zoom + pan
        const wx = ((relX - 0.5) / zoom - pan.x / (rect.width * zoom) + 0.5) * WORLD_W
        const wy = ((relY - 0.5) / zoom - pan.y / (rect.height * zoom) + 0.5) * WORLD_H
        setHoverInfo({ name: getNeighborhoodAt(wx, wy), wx: Math.round(wx), wy: Math.round(wy) })
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
    if (!dragMoved.current) {
      // Click = teleport
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width
        const relY = (e.clientY - rect.top) / rect.height
        const wx = ((relX - 0.5) / zoom - pan.x / (rect.width * zoom) + 0.5) * WORLD_W
        const wy = ((relY - 0.5) / zoom - pan.y / (rect.height * zoom) + 0.5) * WORLD_H
        setTeleportTarget({ x: Math.round(wx), y: Math.round(wy) })
      }
    }
  }

  function confirmTeleport() {
    if (teleportTarget) {
      onTeleport(teleportTarget.x, teleportTarget.y)
      onClose()
    }
  }

  function teleportTo(x: number, y: number) {
    onTeleport(x, y)
    onClose()
  }

  function getNeighborhoodAt(wx: number, wy: number): string {
    if (wx < 450 && wy > 1700) return "Point Loma"
    if (wy > 1750 && wy < 2120 && wx > 720 && wx < 1250) return "Downtown"
    if (wy > 2120 && wy < 2400 && wx > 700 && wx < 1000) return "National City"
    if (wx > 350 && wx < 650 && wy > 2050 && wy < 2700) return "Coronado"
    if (wx > 820 && wx < 1170 && wy > 1280 && wy < 1740) return "Balboa Park"
    if (wx > 730 && wx < 1100 && wy > 1140 && wy < 1300) return "Hillcrest"
    if (wx > 330 && wx < 640 && wy > 860 && wy < 1260) return "Mission Bay"
    if (wx > 330 && wx < 560 && wy > 680 && wy < 960) return "Pacific Beach"
    if (wx > 270 && wx < 580 && wy > 420 && wy < 750) return "La Jolla"
    if (wx > 540 && wx < 860 && wy > 320 && wy < 640) return "UTC / UCSD"
    if (wx > 360 && wx < 560 && wy > 150 && wy < 420) return "Del Mar / Solana Beach"
    if (wx > 700 && wx < 1150 && wy > 200 && wy < 560) return "Carmel Valley"
    if (wx > 1150 && wy < 800) return "North County"
    if (wx > 1800) return "East County"
    if (wy > 1300 && wy < 1450) return "Mission Valley"
    return "Realm City"
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)" }}
    >
      {/* Map container */}
      <div className="relative flex flex-col h-full w-full max-w-7xl p-4 pt-14 pb-16">

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-white font-bold tracking-widest text-sm">REALM CITY MAP</span>
            {hoverInfo && (
              <span className="text-white/40 text-xs font-mono ml-4">
                {hoverInfo.name}
              </span>
            )}
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
          style={{ cursor: isDragging ? "grabbing" : "crosshair", background: "#05101e" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); setHoverInfo(null) }}
        >
          {/* Zoomed/panned map */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.05s ease-out",
              willChange: "transform",
            }}
          >
            <CityMapSVG
              showLabels
              showMarkers
              interactive
              hoveredMarker={hoveredMarker}
              onHoverMarker={setHoveredMarker}
              onClickMap={(wx, wy) => {
                setTeleportTarget({ x: Math.round(wx), y: Math.round(wy) })
              }}
            />

            {/* Player marker on map */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${px}%`, top: `${py}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400/30 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-white shadow-lg shadow-yellow-400/60 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            {/* Teleport target marker */}
            {teleportTarget && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${(teleportTarget.x / WORLD_W) * 100}%`,
                  top: `${(teleportTarget.y / WORLD_H) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-8 h-8 rounded-full border-2 border-indigo-400 bg-indigo-400/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-indigo-300" />
                </div>
              </div>
            )}
          </div>

          {/* Scan lines */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)"
          }} />
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
            background: "radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.5) 100%)"
          }} />
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 inset-x-0 h-16 flex items-center justify-between px-6">
          {/* Quick travel */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/30 text-xs font-mono mr-1">QUICK TRAVEL</span>
            {WAYPOINTS.map((wp) => (
              <button key={wp.name} onClick={() => teleportTo(wp.x, wp.y)}
                className="px-3 py-1 bg-white/5 hover:bg-indigo-600/25 border border-white/10 hover:border-indigo-500/40 rounded-full text-white/50 hover:text-white text-xs transition-all"
              >
                {wp.name}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            {teleportTarget && (
              <button onClick={confirmTeleport}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
              >
                <Locate className="w-4 h-4" />
                Teleport Here
              </button>
            )}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button onClick={() => setZoom((z) => Math.max(0.7, z - 0.25))}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-white/40 text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export function MapHUD() {
  const [playerPos, setPlayerPos] = useState({ x: 920, y: 1870 })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      setPlayerPos((e as CustomEvent<{ x: number; y: number }>).detail)
    }
    window.addEventListener("realm:player-position", handler)
    return () => window.removeEventListener("realm:player-position", handler)
  }, [])

  // M key toggles map
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "m" || e.key === "M") && !expanded) {
        // Only open from here; close is handled inside FullMap
        setExpanded(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [expanded])

  function handleTeleport(x: number, y: number) {
    window.dispatchEvent(new CustomEvent("realm:teleport", { detail: { x, y } }))
    setExpanded(false)
  }

  return (
    <>
      <Minimap playerPos={playerPos} onOpen={() => setExpanded(true)} />
      <AnimatePresence>
        {expanded && (
          <FullMap
            playerPos={playerPos}
            onClose={() => setExpanded(false)}
            onTeleport={handleTeleport}
          />
        )}
      </AnimatePresence>
    </>
  )
}
