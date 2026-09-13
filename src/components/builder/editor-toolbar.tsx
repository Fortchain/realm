"use client"

import { useState } from "react"
import type { Tool, ObjectType, MapObject } from "./editor-scene"
import { MousePointer2, Pencil, Eraser, Trash2, Grid3X3 } from "lucide-react"

// ── Palette ──────────────────────────────────────────────────────────────────

const PALETTE: Array<{
  category: string
  items: Array<{ type: ObjectType; label: string; color: string }>
}> = [
  {
    category: "Terrain",
    items: [
      { type: "park",     label: "Park",     color: "#4ade80" },
      { type: "water",    label: "Water",    color: "#38bdf8" },
      { type: "beach",    label: "Beach",    color: "#fde68a" },
      { type: "plaza",    label: "Plaza",    color: "#cbd5e1" },
    ],
  },
  {
    category: "Roads",
    items: [
      { type: "road-h",      label: "Road →",   color: "#475569" },
      { type: "road-v",      label: "Road ↑",   color: "#475569" },
      { type: "intersection", label: "Cross",   color: "#64748b" },
    ],
  },
  {
    category: "Buildings",
    items: [
      { type: "building",  label: "Building",  color: "#e2e8f0" },
      { type: "house",     label: "House",     color: "#fef3c7" },
      { type: "ranch",     label: "Ranch",     color: "#fde68a" },
      { type: "library",   label: "Library",   color: "#bfdbfe" },
      { type: "bank",      label: "Bank",      color: "#bbf7d0" },
      { type: "church",    label: "Church",    color: "#ede9fe" },
      { type: "warehouse", label: "Warehouse", color: "#d1d5db" },
      { type: "tower",     label: "Tower",     color: "#c7d2fe" },
    ],
  },
  {
    category: "Nature",
    items: [
      { type: "tree-large", label: "Tree L",   color: "#16a34a" },
      { type: "tree-small", label: "Tree S",   color: "#22c55e" },
      { type: "bush",       label: "Bush",     color: "#4ade80" },
      { type: "mountain",   label: "Mountain", color: "#9ca3af" },
      { type: "rocks",      label: "Rocks",    color: "#6b7280" },
    ],
  },
  {
    category: "Props",
    items: [
      { type: "lamp",  label: "Lamp",  color: "#fef08a" },
      { type: "bench", label: "Bench", color: "#d97706" },
      { type: "table", label: "Table", color: "#92400e" },
    ],
  },
]

// ── Props ────────────────────────────────────────────────────────────────────

interface EditorToolbarProps {
  tool: Tool
  activeType: ObjectType
  snapEnabled: boolean
  selected: MapObject | null
  objectCount: number
  onTool: (t: Tool) => void
  onType: (t: ObjectType) => void
  onColorChange: (color: string) => void
  onLabelChange: (label: string) => void
  onDelete: () => void
  onClear: () => void
  onToggleSnap: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function EditorToolbar({
  tool, activeType, snapEnabled, selected, objectCount,
  onTool, onType, onColorChange, onLabelChange, onDelete, onClear, onToggleSnap,
}: EditorToolbarProps) {
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  function toggleCat(cat: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-black/8 overflow-y-auto z-20">

      {/* ── Tools ── */}
      <div className="p-3 border-b border-black/8">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-2">Tools</p>
        <div className="flex gap-1.5">
          {(
            [
              { t: "select", icon: <MousePointer2 className="w-3.5 h-3.5" />, tip: "Select" },
              { t: "place",  icon: <Pencil         className="w-3.5 h-3.5" />, tip: "Place" },
              { t: "erase",  icon: <Eraser         className="w-3.5 h-3.5" />, tip: "Erase" },
            ] as const
          ).map(({ t, icon, tip }) => (
            <button
              key={t}
              title={tip}
              onClick={() => onTool(t)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all
                ${tool === t
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {icon}
              <span className="text-xs">{tip}</span>
            </button>
          ))}
        </div>

        {/* Snap toggle */}
        <button
          onClick={onToggleSnap}
          className={`mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all
            ${snapEnabled
              ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          Snap to grid {snapEnabled ? "on" : "off"}
        </button>
      </div>

      {/* ── Palette ── */}
      <div className="flex-1 overflow-y-auto">
        {PALETTE.map(({ category, items }) => (
          <div key={category} className="border-b border-black/5">
            <button
              onClick={() => toggleCat(category)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-700"
            >
              <span>{category}</span>
              <span className="text-slate-300">{collapsedCats.has(category) ? "+" : "−"}</span>
            </button>

            {!collapsedCats.has(category) && (
              <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                {items.map(({ type, label, color }) => (
                  <button
                    key={type}
                    onClick={() => { onType(type); if (tool !== "place") onTool("place") }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${activeType === type && tool === "place"
                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                  >
                    <span
                      className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
                      style={{ background: color }}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Selection Properties ── */}
      {selected && (
        <div className="border-t border-black/8 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-slate-700 capitalize">{selected.type.replace("-", " ")}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div>
              <span className="block text-slate-400 mb-0.5">W</span>
              <span className="font-mono font-semibold text-slate-700">{Math.round(selected.w)}px</span>
            </div>
            <div>
              <span className="block text-slate-400 mb-0.5">H</span>
              <span className="font-mono font-semibold text-slate-700">{Math.round(selected.h)}px</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Color</span>
            <input
              type="color"
              value={selected.color}
              onChange={e => onColorChange(e.target.value)}
              className="w-full h-7 rounded cursor-pointer border border-black/10"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">Label</span>
            <input
              type="text"
              value={selected.label ?? ""}
              onChange={e => onLabelChange(e.target.value)}
              placeholder="optional..."
              className="w-full text-xs bg-slate-50 border border-black/10 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-black/8 px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">{objectCount} objects</span>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>
    </aside>
  )
}

