"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Users } from "lucide-react"
import { BUILDINGS } from "@/lib/buildings"
import { cn } from "@/lib/utils"

const COLOR_MAP: Record<string, { bg: string; border: string; glow: string; icon: string; badge: string }> = {
  emerald: { bg: "bg-emerald-500/10 hover:bg-emerald-500/20", border: "border-emerald-500/25 hover:border-emerald-500/50", glow: "hover:shadow-emerald-500/20", icon: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
  blue:    { bg: "bg-blue-500/10 hover:bg-blue-500/20", border: "border-blue-500/25 hover:border-blue-500/50", glow: "hover:shadow-blue-500/20", icon: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
  violet:  { bg: "bg-violet-500/10 hover:bg-violet-500/20", border: "border-violet-500/25 hover:border-violet-500/50", glow: "hover:shadow-violet-500/20", icon: "text-violet-400", badge: "bg-violet-500/20 text-violet-300" },
  orange:  { bg: "bg-orange-500/10 hover:bg-orange-500/20", border: "border-orange-500/25 hover:border-orange-500/50", glow: "hover:shadow-orange-500/20", icon: "text-orange-400", badge: "bg-orange-500/20 text-orange-300" },
  amber:   { bg: "bg-amber-500/10 hover:bg-amber-500/20", border: "border-amber-500/25 hover:border-amber-500/50", glow: "hover:shadow-amber-500/20", icon: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  red:     { bg: "bg-red-500/10 hover:bg-red-500/20", border: "border-red-500/25 hover:border-red-500/50", glow: "hover:shadow-red-500/20", icon: "text-red-400", badge: "bg-red-500/20 text-red-300" },
  pink:    { bg: "bg-pink-500/10 hover:bg-pink-500/20", border: "border-pink-500/25 hover:border-pink-500/50", glow: "hover:shadow-pink-500/20", icon: "text-pink-400", badge: "bg-pink-500/20 text-pink-300" },
  slate:   { bg: "bg-slate-500/10 hover:bg-slate-500/20", border: "border-slate-500/25 hover:border-slate-500/50", glow: "hover:shadow-slate-500/20", icon: "text-slate-400", badge: "bg-slate-500/20 text-slate-300" },
  cyan:    { bg: "bg-cyan-500/10 hover:bg-cyan-500/20", border: "border-cyan-500/25 hover:border-cyan-500/50", glow: "hover:shadow-cyan-500/20", icon: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-300" },
}

export function CityMap() {
  const router = useRouter()

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* City header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/60 text-xs">Realm City — Live</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Realm</h1>
        <p className="text-white/40 text-sm">Your city. Your life. Tap a building to enter.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {BUILDINGS.map((building, i) => {
          const colors = COLOR_MAP[building.color] ?? COLOR_MAP.slate

          return (
            <motion.div
              key={building.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <button
                onClick={() => building.available && router.push(building.href)}
                disabled={!building.available}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border transition-all duration-200 group",
                  "hover:shadow-lg hover:-translate-y-0.5",
                  building.available ? `${colors.bg} ${colors.border} ${colors.glow} cursor-pointer` : "bg-white/2 border-white/5 cursor-not-allowed opacity-60"
                )}
              >
                {/* Icon + lock */}
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{building.icon}</span>
                  {!building.available && (
                    <div className="bg-white/10 rounded-lg p-1">
                      <Lock className="w-3.5 h-3.5 text-white/30" />
                    </div>
                  )}
                  {building.available && (
                    <div className={cn("text-xs px-2 py-0.5 rounded-full font-medium", colors.badge)}>
                      Open
                    </div>
                  )}
                </div>

                {/* Name + description */}
                <div className="font-semibold text-white text-sm mb-1 leading-tight">{building.name}</div>
                <div className="text-white/40 text-xs leading-relaxed">{building.description}</div>

                {/* AI persona hint */}
                {building.available && (
                  <div className={cn("mt-3 pt-3 border-t border-white/5 flex items-center gap-2")}>
                    <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white", {
                      "bg-emerald-600": building.color === "emerald",
                      "bg-blue-600": building.color === "blue",
                    })}>
                      {building.aiPersona.avatar}
                    </div>
                    <span className={cn("text-xs", colors.icon)}>{building.aiPersona.name} is here</span>
                  </div>
                )}

                {!building.available && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="text-white/20 text-xs">Coming soon</span>
                  </div>
                )}
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
