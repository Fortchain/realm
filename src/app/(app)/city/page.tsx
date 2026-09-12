"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Smartphone, Bell, Sparkles, LogOut } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { CityMap } from "@/components/city/city-map"
import { Phone } from "@/components/phone/phone"
import { usePhoneStore } from "@/store/phone"

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

    const timer = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [router])

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  const dateStr = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-[#080810]/90 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-base bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">realm</span>
          </div>

          {/* Clock */}
          <div className="hidden sm:block text-center">
            <div className="text-white/90 font-semibold text-sm">{timeStr}</div>
            <div className="text-white/30 text-xs">{dateStr}</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <button className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4" />
            </button>

            {/* Phone trigger */}
            <button
              onClick={() => openPhone("todos")}
              className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/25 hover:border-indigo-500/50 px-3 py-1.5 rounded-xl text-indigo-300 text-sm font-semibold transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">My Phone</span>
            </button>

            {/* Avatar */}
            {user && (
              <button
                onClick={() => signOut(() => router.push("/"))}
                className="text-white/30 hover:text-white/60 p-2 rounded-xl hover:bg-white/5 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* City content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <CityMap />
      </main>

      {/* Phone overlay */}
      <Phone />
    </div>
  )
}
