"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, LogOut, Zap, Users, Building2 } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { Phone } from "@/components/phone/phone"
import { MapHUD } from "@/components/game/map-hud"
import { BUILDINGS } from "@/lib/buildings"

const GameCanvas = dynamic(() => import("@/components/game/game-canvas"), { ssr: false })

interface User {
  id: string
  displayName?: string | null
  avatarUrl?: string | null
  onboardingDone: boolean
}

export default function CityPage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const [user, setUser] = useState<User | null>(null)
  const [time, setTime] = useState(new Date())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    async function init() {
      let res = await fetch("/api/user/me")
      if (!res.ok) {
        await fetch("/api/user/sync", { method: "POST" })
        res = await fetch("/api/user/me")
      }
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        if (!data.onboardingDone) {
          await fetch("/api/user/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ onboardingDone: true }),
          })
        }
      }
    }
    init()
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { setTimeout(() => setEntered(true), 100) }, [])

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  const dateStr = time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const availableBuildings = BUILDINGS.filter((b) => b.available).length

  return (
    <div className="fixed inset-0 overflow-hidden bg-sky-200">

      {/* ── Game canvas (fills everything) ── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <GameCanvas displayName={user?.displayName ?? "You"} />
      </motion.div>

      {/* ── HUD overlay ── */}
      <header
        className="absolute top-0 inset-x-0 z-30 h-12"
        style={{ background: "rgba(255,255,255,0.80)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="h-full max-w-none px-5 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </motion.div>
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
              realm
            </span>
          </div>

          {/* Center stats */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
              <div className="text-slate-700 font-mono text-xs font-semibold leading-none">{timeStr}</div>
              <div className="text-slate-400 text-xs mt-0.5">{dateStr}</div>
            </div>
            <div className="w-px h-5 bg-black/10" />
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <Building2 className="w-3 h-3" />
              <span>{availableBuildings} open</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <Users className="w-3 h-3" />
              <span>Online</span>
            </div>
            <div className="w-px h-5 bg-black/10" />
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs">WASD</kbd>
              <span>move</span>
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs">E</kbd>
              <span>enter</span>
            </div>
          </div>

          {/* Right: user avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white hover:scale-105 transition-transform"
              >
                {user?.displayName?.[0]?.toUpperCase() ?? "R"}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-10 w-44 bg-white border border-black/8 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-black/5">
                      <div className="text-slate-800 text-xs font-semibold truncate">{user?.displayName ?? "Realm User"}</div>
                      <div className="text-slate-400 text-xs mt-0.5">Online in Realm City</div>
                    </div>
                    <button
                      onClick={() => signOut(() => router.push("/"))}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── Bottom-left AI status ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-5 left-5 z-20 flex items-center gap-2 bg-white/70 border border-black/8 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-slate-400 pointer-events-none"
      >
        <Zap className="w-3 h-3 text-indigo-400" />
        <span>AI active in all open buildings</span>
      </motion.div>

      {/* ── Entrance flash ── */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-50 bg-sky-100 flex items-center justify-center"
          >
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <span className="text-xl font-bold text-slate-500">Loading Realm...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phone widget (FAB + panel) ── */}
      <Phone />

      {/* ── Map HUD (minimap + full map overlay) ── */}
      <MapHUD />

      {/* Click outside to close user menu */}
      {showUserMenu && <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />}
    </div>
  )
}
