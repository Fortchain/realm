import Link from "next/link"
import { Sparkles, Building2, Smartphone, Brain, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-hidden">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">realm</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-white/60 hover:text-white text-sm transition-colors">Sign in</Link>
          <Link href="/sign-up" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            Enter Realm
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          <span className="text-indigo-300 text-xs font-semibold">AI-Powered Gamified Life Platform</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
          Your city.<br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Your life.
          </span>
        </h1>

        <p className="text-white/50 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Realm is a living, AI-powered city where every building helps you manage a real part of your life —
          your bank, your studies, your health, your work, your social world — all in one gamified platform.
        </p>

        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02]"
        >
          Enter Realm <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* City preview */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-white/3 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="relative grid grid-cols-3 sm:grid-cols-3 gap-3">
            {[
              { icon: "🏦", name: "Bank", desc: "Plaid + AI banker", color: "emerald", live: true },
              { icon: "📚", name: "Library", desc: "AI professors + files", color: "blue", live: true },
              { icon: "🎓", name: "University", desc: "Campus life + clubs", color: "violet", live: false },
              { icon: "🏋️", name: "Gym", desc: "AI trainer + fitness", color: "orange", live: false },
              { icon: "🏠", name: "Your Home", desc: "Reminders + AI", color: "amber", live: false },
              { icon: "🛍️", name: "The Mall", desc: "Shop everywhere", color: "pink", live: false },
            ].map((b) => (
              <div key={b.name} className={`p-4 rounded-2xl border ${b.live ? "border-white/15 bg-white/5" : "border-white/5 bg-white/2 opacity-60"}`}>
                <div className="text-2xl mb-2">{b.icon}</div>
                <div className="font-semibold text-white text-sm">{b.name}</div>
                <div className="text-white/40 text-xs mt-0.5">{b.desc}</div>
                {b.live && <div className="mt-2 text-xs text-green-400 font-medium">● Live</div>}
                {!b.live && <div className="mt-2 text-xs text-white/20">Coming soon</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Building2, title: "Every Building is a Tool", desc: "The bank connects to your real accounts. The library has AI professors. The gym tracks your workouts. Real utility, gamified.", color: "indigo" },
            { icon: Smartphone, title: "Your In-Game Phone", desc: "Like GTA's phone, yours lives on screen. Pull up your to-do list, message friends, browse your social feed, or video call anyone in the city.", color: "violet" },
            { icon: Brain, title: "AI in Every Room", desc: "Every building has its own AI persona — your banker, your professor, your trainer, your doctor. All powered by Claude.", color: "fuchsia" },
          ].map((f) => (
            <div key={f.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-colors">
              <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="font-semibold text-white mb-2">{f.title}</div>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Your city is waiting.</h2>
        <p className="text-white/40 mb-8">One platform. Every building. Your whole life, organized.</p>
        <Link href="/sign-up" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.02]">
          <Sparkles className="w-4 h-4" />
          Enter Realm
        </Link>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-white/20 text-xs">
        © 2026 Realm. Built for the ones who want it all.
      </footer>
    </div>
  )
}
