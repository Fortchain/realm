"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, ChevronLeft, Save, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import { EditorToolbar } from "@/components/builder/editor-toolbar"
import type { Tool, ObjectType, MapObject, EditorScene } from "@/components/builder/editor-scene"

const EditorCanvas = dynamic(() => import("@/components/builder/editor-canvas"), { ssr: false })

type SaveState = "idle" | "saving" | "saved"

export default function BuilderPage() {
  const router = useRouter()
  const sceneRef = useRef<EditorScene | null>(null)

  const [tool, setTool]             = useState<Tool>("select")
  const [activeType, setActiveType] = useState<ObjectType>("building")
  const [snapEnabled, setSnap]      = useState(true)
  const [selected, setSelected]     = useState<MapObject | null>(null)
  const [objectCount, setCount]     = useState(0)
  const [saveState, setSaveState]   = useState<SaveState>("idle")
  const [loaded, setLoaded]         = useState(false)

  // ── Scene bridge ────────────────────────────────────────────────────────────

  const onSceneReady = useCallback((scene: EditorScene) => {
    sceneRef.current = scene

    // Load saved map from DB
    fetch("/api/city-map")
      .then(r => r.json())
      .then(({ objects }) => {
        if (Array.isArray(objects) && objects.length > 0) {
          window.dispatchEvent(new CustomEvent("builder:load-objects", { detail: { objects } }))
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  // ── Listen to scene events ──────────────────────────────────────────────────

  useEffect(() => {
    const onObjectsChanged = (e: Event) => {
      const { objects } = (e as CustomEvent<{ objects: MapObject[] }>).detail
      setCount(objects.length)
    }
    const onSelectionChanged = (e: Event) => {
      const { obj } = (e as CustomEvent<{ id: string | null; obj?: MapObject }>).detail
      setSelected(obj ?? null)
    }
    const onSnapChanged = (e: Event) => {
      setSnap((e as CustomEvent<{ snap: boolean }>).detail.snap)
    }

    window.addEventListener("builder:objects-changed",  onObjectsChanged)
    window.addEventListener("builder:selection-changed", onSelectionChanged)
    window.addEventListener("builder:snap-changed",     onSnapChanged)
    return () => {
      window.removeEventListener("builder:objects-changed",  onObjectsChanged)
      window.removeEventListener("builder:selection-changed", onSelectionChanged)
      window.removeEventListener("builder:snap-changed",     onSnapChanged)
    }
  }, [])

  // ── Toolbar callbacks ────────────────────────────────────────────────────────

  function dispatchTool(t: Tool) {
    setTool(t)
    window.dispatchEvent(new CustomEvent("builder:set-tool", { detail: { tool: t } }))
  }

  function dispatchType(t: ObjectType) {
    setActiveType(t)
    window.dispatchEvent(new CustomEvent("builder:set-type", { detail: { objectType: t } }))
  }

  function handleColorChange(color: string) {
    if (!selected) return
    sceneRef.current?.updateColor(selected.id, color)
    setSelected(prev => prev ? { ...prev, color } : null)
  }

  function handleLabelChange(label: string) {
    if (!selected) return
    sceneRef.current?.updateLabel(selected.id, label)
    setSelected(prev => prev ? { ...prev, label } : null)
  }

  function handleDelete() {
    if (!selected) return
    window.dispatchEvent(new CustomEvent("builder:set-tool", { detail: { tool: "erase" } }))
    sceneRef.current?.deleteSelected()
    setSelected(null)
    dispatchTool("select")
  }

  function handleClear() {
    if (!confirm("Clear all objects?")) return
    window.dispatchEvent(new CustomEvent("builder:clear"))
  }

  function handleToggleSnap() {
    window.dispatchEvent(new CustomEvent("builder:set-tool", { detail: { tool } }))
    sceneRef.current && (sceneRef.current.snapEnabled = !snapEnabled)
    setSnap(v => !v)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!sceneRef.current) return
    setSaveState("saving")
    const objects = sceneRef.current.getObjects()
    try {
      await fetch("/api/city-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects }),
      })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 2200)
    } catch {
      setSaveState("idle")
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100">

      {/* ── Top HUD ── */}
      <header
        className="h-12 shrink-0 flex items-center px-4 gap-3 z-30"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Back */}
        <button
          onClick={() => router.push("/city")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">City</span>
        </button>

        <div className="w-px h-5 bg-black/10" />

        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </motion.div>
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
            realm builder
          </span>
        </div>

        <div className="flex-1" />

        {/* Hints */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
          <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono text-xs">WASD</kbd> pan</span>
          <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono text-xs">scroll</kbd> zoom</span>
          <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono text-xs">right drag</kbd> pan</span>
          <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono text-xs">G</kbd> grid</span>
          <span><kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono text-xs">Del</kbd> delete</span>
        </div>

        <div className="w-px h-5 bg-black/10" />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${saveState === "saved"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"}`}
        >
          {saveState === "saved"
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
            : <><Save className="w-3.5 h-3.5" /> {saveState === "saving" ? "Saving…" : "Save"}</>}
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        <EditorToolbar
          tool={tool}
          activeType={activeType}
          snapEnabled={snapEnabled}
          selected={selected}
          objectCount={objectCount}
          onTool={dispatchTool}
          onType={dispatchType}
          onColorChange={handleColorChange}
          onLabelChange={handleLabelChange}
          onDelete={handleDelete}
          onClear={handleClear}
          onToggleSnap={handleToggleSnap}
        />

        {/* Canvas */}
        <div className="flex-1 relative">
          <EditorCanvas onSceneReady={onSceneReady} />

          {/* Loading veil */}
          {!loaded && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                Loading builder…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
