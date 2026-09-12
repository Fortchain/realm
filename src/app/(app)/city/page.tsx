"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Smartphone, Bell, Sparkles, LogOut, Zap, Users, Building2 } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { CityMap } from "@/components/city/city-map"
import { Phone } from "@/components/phone/phone"
import { usePhoneStore } from "@/store/phone"
import { BUILDINGS } from "@/lib/buildings"

interface User {
  id: string
  displayName?: string | null
  avatarUrl?: string | null
  onboardingDone: boolean
}

export default function CityPage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const openPhone = usePhoneStore((s) => s.open)
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

  // Entrance animation
  useEffect(() => {
    setTimeout(() => setEntered(true), 100)
  }, [])

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  const dateStr = time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const availableBuildings = BUILDINGS.filter((b) => b.available).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: entered ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[#080810] text-white overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.08) 0%, transparent 60%)",
      }}
    >
      {/* HUD Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5"
        style={{ background: "rgba(8,8,16,0.85)", backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </motion.div>
            <span className="font-bold text-base bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent tracking-tight">
              realm
            </span>
          </div>

          {/* Center HUD: stats */}
          <div className="hidden sm:flex items-center gap-5">
            {/* Live clock */}
            <div className="text-center">
              <div className="text-white/80 font-mono text-sm font-semibold leading-none">{timeStr}</div>
              <div className="text-white/25 text-xs mt-0.5">{dateStr}</div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            {/* City stats */}
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span>{availableBuildings} districts open</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>You're online</span>
            </div>
          </div>

          {/* Right HUD: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notifications */}
            <button className="relative p-2 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4" />
            </button>

            {/* Phone button */}
            <motion.button
              onClick={() => openPhone("todos")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/60 px-3 py-1.5 rounded-xl text-indigo-300 text-sm font-semibold transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Phone</span>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            </motion.button>

            {/* User avatar + menu */}
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
                    className="absolute right-0 top-10 w-44 bg-[#12121e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="px-3 py-2.5 border-b border-white/5">
                      <div className="text-white text-xs font-semibold truncate">{user?.displayName ?? "Realm User"}</div>
                      <div className="text-white/30 text-xs mt-0.5">Online in city</div>
                    </div>
                    <button
                      onClick={() => signOut(() => router.push("/"))}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-white/50 hover:text-white hover:bg-white/5 text-xs transition-colors"
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

      {/* City entrance flash */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-[#080810] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3"
            >
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <span className="text-xl font-bold text-white/60">Loading Realm...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main city */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <CityMap />
      </main>

      {/* Bottom status bar */}
      <div className="fixed bottom-0 inset-x-0 pointer-events-none">
        <div className="max-w-5xl mx-auto px-6 pb-4 flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-2 bg-black/40 border border-white/8 backdrop-blur rounded-full px-3 py-1.5 text-xs text-white/30"
          >
            <Zap className="w-3 h-3 text-indigo-400" />
            <span>AI active in all open buildings</span>
          </motion.div>
        </div>
      </div>

      {/* Phone overlay */}
      <Phone />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
      )}
    </motion.div>
  )
}
