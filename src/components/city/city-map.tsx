"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Users, Zap } from "lucide-react"
import { BUILDINGS } from "@/lib/buildings"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

// Neon color palettes per building
const STYLES: Record<string, {
  glow: string
  border: string
  bg: string
  roof: string
  badge: string
  dot: string
}> = {
  emerald: { glow: "shadow-emerald-500/40", border: "border-emerald-500/50", bg: "bg-emerald-950/60", roof: "from-emerald-600/30 to-emerald-900/60", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  blue:    { glow: "shadow-blue-500/40",    border: "border-blue-500/50",    bg: "bg-blue-950/60",    roof: "from-blue-600/30 to-blue-900/60",    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",    dot: "bg-blue-400"    },
  violet:  { glow: "shadow-violet-500/40",  border: "border-violet-500/50",  bg: "bg-violet-950/60",  roof: "from-violet-600/30 to-violet-900/60",  badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",  dot: "bg-violet-400"  },
  orange:  { glow: "shadow-orange-500/40",  border: "border-orange-500/50",  bg: "bg-orange-950/60",  roof: "from-orange-600/30 to-orange-900/60",  badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",  dot: "bg-orange-400"  },
  amber:   { glow: "shadow-amber-500/40",   border: "border-amber-500/50",   bg: "bg-amber-950/60",   roof: "from-amber-600/30 to-amber-900/60",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",   dot: "bg-amber-400"   },
  red:     { glow: "shadow-red-500/40",     border: "border-red-500/50",     bg: "bg-red-950/60",     roof: "from-red-600/30 to-red-900/60",     badge: "bg-red-500/20 text-red-300 border-red-500/30",     dot: "bg-red-400"     },
  pink:    { glow: "shadow-pink-500/40",    border: "border-pink-500/50",    bg: "bg-pink-950/60",    roof: "from-pink-600/30 to-pink-900/60",    badge: "bg-pink-500/20 text-pink-300 border-pink-500/30",    dot: "bg-pink-400"    },
  slate:   { glow: "shadow-slate-500/40",   border: "border-slate-500/50",   bg: "bg-slate-950/60",   roof: "from-slate-600/30 to-slate-900/60",   badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",   dot: "bg-slate-400"   },
  cyan:    { glow: "shadow-cyan-500/40",    border: "border-cyan-500/50",    bg: "bg-cyan-950/60",    roof: "from-cyan-600/30 to-cyan-900/60",    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",    dot: "bg-cyan-400"    },
}

function FloatingParticle({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute w-0.5 h-0.5 rounded-full bg-indigo-400/40"
      style={{ left: `${Math.random() * 100}%`, bottom: 0 }}
      animate={{ y: [-0, -120], opacity: [0, 0.6, 0] }}
      transition={{ duration: 4 + Math.random() * 3, delay, repeat: Infinity, ease: "linear" }}
    />
  )
}

function BuildingTile({ building, index }: { building: typeof BUILDINGS[number]; index: number }) {
  const router = useRouter()
  const s = STYLES[building.color] ?? STYLES.slate
  const [entering, setEntering] = useState(false)

  async function handleClick() {
    if (!building.available) return
    setEntering(true)
    setTimeout(() => router.push(building.href), 400)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: entering ? 1.06 : 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, type: "spring", stiffness: 200 }}
      className="relative"
    >
      <motion.button
        onClick={handleClick}
        disabled={!building.available}
        whileHover={building.available ? { scale: 1.04, y: -4 } : {}}
        whileTap={building.available ? { scale: 0.97 } : {}}
        className={cn(
          "relative w-full text-left rounded-2xl border overflow-hidden transition-shadow duration-300 group",
          building.available
            ? `${s.bg} ${s.border} hover:shadow-xl ${s.glow} cursor-pointer`
            : "bg-white/2 border-white/8 cursor-not-allowed opacity-50"
        )}
      >
        {/* Roof gradient */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", s.roof)} />

        {/* Animated glow pulse for available buildings */}
        {building.available && (
          <motion.div
            className={cn("absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300", `shadow-inner`)}
          />
        )}

        <div className="relative p-5">
          {/* Top row: icon + status */}
          <div className="flex items-start justify-between mb-4">
            <motion.span
              className="text-4xl block leading-none"
              animate={building.available ? { rotate: [0, -5, 5, 0] } : {}}
              transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
            >
              {building.icon}
            </motion.span>

            {building.available ? (
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", s.badge)}>
                <motion.div
                  className={cn("w-1.5 h-1.5 rounded-full", s.dot)}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Open
              </div>
            ) : (
              <div className="bg-white/5 rounded-full p-1.5">
                <Lock className="w-3.5 h-3.5 text-white/25" />
              </div>
            )}
          </div>

          {/* Building name */}
          <div className="font-bold text-white text-sm leading-tight mb-1">
            {building.name}
          </div>
          <div className="text-white/40 text-xs leading-relaxed mb-4">
            {building.description}
          </div>

          {/* AI Persona footer */}
          {building.available ? (
            <div className="flex items-center gap-2 pt-3 border-t border-white/8">
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0",
                (building as {color: string}).color === "emerald" ? "bg-emerald-600" :
                (building as {color: string}).color === "blue" ? "bg-blue-600" :
                (building as {color: string}).color === "violet" ? "bg-violet-600" :
                (building as {color: string}).color === "orange" ? "bg-orange-600" :
                "bg-indigo-600"
              )}>
                {building.aiPersona.avatar}
              </div>
              <div className="min-w-0">
                <div className="text-white/70 text-xs font-medium truncate">{building.aiPersona.name}</div>
                <div className="text-white/30 text-xs truncate">{building.aiPersona.title}</div>
              </div>
              <Zap className="w-3 h-3 text-white/20 ml-auto shrink-0" />
            </div>
          ) : (
            <div className="pt-3 border-t border-white/5">
              <span className="text-white/20 text-xs">Coming soon</span>
            </div>
          )}
        </div>

        {/* Enter overlay on click */}
        <AnimatedEnterOverlay active={entering} color={s.dot} />
      </motion.button>
    </motion.div>
  )
}

function AnimatedEnterOverlay({ active, color }: { active: boolean; color: string }) {
  if (!active) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm z-10"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-white text-sm font-bold flex items-center gap-2"
      >
        <motion.div
          className={cn("w-2 h-2 rounded-full", color)}
          animate={{ scale: [1, 1.8, 1] }}
          transition={{ duration: 0.4, repeat: 2 }}
        />
        Entering...
      </motion.div>
    </motion.div>
  )
}

export function CityMap() {
  const [particles] = useState(() => Array.from({ length: 18 }, (_, i) => i))

  return (
    <div className="relative w-full max-w-5xl mx-auto">

      {/* Ambient background glow */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-20 w-[300px] h-[400px] bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-[300px] h-[400px] bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />

      {/* City header */}
      <div className="text-center mb-10 relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-white/60 text-xs font-medium">Realm City · Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Welcome to Realm
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/30 text-sm"
        >
          Your city. Your life. Tap a building to enter.
        </motion.p>
      </div>

      {/* Street grid container */}
      <div className="relative rounded-3xl overflow-hidden border border-white/6"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #0a0a12",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)"
        }}
      >
        {/* Street grid lines */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />

        {/* Floating particles (steam/light from buildings) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((i) => (
            <FloatingParticle key={i} delay={i * 0.4} />
          ))}
        </div>

        {/* City building grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-3 p-5">
          {BUILDINGS.map((building, i) => (
            <BuildingTile key={building.id} building={building} index={i} />
          ))}
        </div>

        {/* Bottom city glow */}
        <div className="h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
      </div>
    </div>
  )
}
