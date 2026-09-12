"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X, FileText, Download, Trash2, Loader2, BookOpen, GraduationCap, FlaskConical } from "lucide-react"
import dynamic from "next/dynamic"
import { AiChatPanel } from "@/components/buildings/ai-chat-panel"
import { cn } from "@/lib/utils"
import type { LibraryZone } from "@/components/game/library-interior-scene"

const LibraryCanvas = dynamic(() => import("@/components/game/library-canvas"), { ssr: false })

interface RealmFile {
  id: string
  name: string
  url: string
  size: number
  mimeType: string
  folder: string
  createdAt: string
}

const SUBJECTS = [
  { id: "general",  label: "General Help",         icon: "📖" },
  { id: "math",     label: "Mathematics",           icon: "🔢" },
  { id: "science",  label: "Science",               icon: "🔬" },
  { id: "english",  label: "English & Writing",     icon: "✍️" },
  { id: "history",  label: "History",               icon: "🏛️" },
  { id: "coding",   label: "Coding & Tech",         icon: "💻" },
  { id: "business", label: "Business & Finance",    icon: "📊" },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Sliding panel that appears when in a zone
function ZonePanel({ zone, onClose, files, loadingFiles, uploading, onUpload, onDeleteFile, activeSubject, setActiveSubject }: {
  zone: LibraryZone
  onClose: () => void
  files: RealmFile[]
  loadingFiles: boolean
  uploading: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteFile: (id: string) => void
  activeSubject: string
  setActiveSubject: (s: string) => void
}) {
  if (!zone || zone === "exit") return null

  const contextData = activeSubject !== "general"
    ? `The student is asking about ${SUBJECTS.find((s) => s.id === activeSubject)?.label}. Focus on that subject.`
    : undefined

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm z-40 flex flex-col bg-[#0c0c1e]/95 border-l border-blue-500/20 shadow-2xl backdrop-blur-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          {zone === "professor" && <><GraduationCap className="w-4 h-4 text-blue-400" /><span className="text-white font-semibold text-sm">Prof. Elena Vasquez</span></>}
          {zone === "books"     && <><BookOpen       className="w-4 h-4 text-blue-400" /><span className="text-white font-semibold text-sm">Book Stacks</span></>}
          {zone === "tables"    && <><FlaskConical   className="w-4 h-4 text-blue-400" /><span className="text-white font-semibold text-sm">Study Tables</span></>}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {zone === "professor" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Subject selector */}
          <div className="px-3 py-2 border-b border-white/8 shrink-0">
            <div className="flex flex-wrap gap-1">
              {SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSubject(s.id)}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors", activeSubject === s.id ? "bg-blue-600/25 text-blue-300 border border-blue-500/30" : "text-white/40 hover:text-white/70 hover:bg-white/5")}
                >
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AiChatPanel
              location="library"
              personaName="Prof. Elena Vasquez"
              personaTitle={`${SUBJECTS.find((s) => s.id === activeSubject)?.label} · Head Librarian`}
              personaAvatar="EV"
              accentColor="blue"
              contextData={contextData}
            />
          </div>
        </div>
      )}

      {zone === "books" && (
        <div className="flex flex-col flex-1 min-h-0 p-4 overflow-y-auto">
          <p className="text-white/40 text-xs mb-4">Upload study materials or ask the professor to research a topic from here.</p>
          <label className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all mb-4 self-start",
            "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/25 hover:border-blue-500/50"
          )}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload File
            <input type="file" className="hidden" onChange={onUpload} accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" />
          </label>

          {loadingFiles ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-white/20 text-xs">No files yet. Upload your first document.</div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-2 px-2 py-2 rounded-lg group hover:bg-white/5">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 text-xs font-medium truncate">{file.name}</div>
                    <div className="text-white/30 text-xs">{formatBytes(file.size)}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/80"><Download className="w-3.5 h-3.5" /></a>
                    <button onClick={() => onDeleteFile(file.id)} className="text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {zone === "tables" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0">
            <AiChatPanel
              location="library"
              personaName="Prof. Elena Vasquez"
              personaTitle="Study Session · Ask anything"
              personaAvatar="EV"
              accentColor="blue"
              contextData="The student is at a study table working collaboratively. Help them brainstorm, outline, or work through problems together."
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function LibraryPage() {
  const router = useRouter()
  const [files, setFiles] = useState<RealmFile[]>([])
  const [activeSubject, setActiveSubject] = useState("general")
  const [uploading, setUploading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [activeZone, setActiveZone] = useState<LibraryZone>(null)
  const [user, setUser] = useState<{ displayName?: string | null } | null>(null)
  const onZoneChangeRef = useRef<((zone: LibraryZone) => void) | null>(null)

  useEffect(() => {
    fetch("/api/user/me").then((r) => r.ok ? r.json() : null).then(setUser)
  }, [])

  const fetchFiles = useCallback(async () => {
    const res = await fetch("/api/files?folder=library")
    if (res.ok) setFiles(await res.json())
    setLoadingFiles(false)
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const handleZoneChange = useCallback((zone: LibraryZone) => {
    setActiveZone(zone)
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "library")
    const res = await fetch("/api/files/upload", { method: "POST", body: formData })
    if (res.ok) { const saved = await res.json(); setFiles((prev) => [saved, ...prev]) }
    setUploading(false)
    e.target.value = ""
  }

  async function deleteFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    await fetch(`/api/files?id=${id}`, { method: "DELETE" })
  }

  return (
    <div className="h-screen bg-[#080810] text-white overflow-hidden flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-white/8 shrink-0 bg-[#080810]/90 backdrop-blur z-30">
        <button onClick={() => router.push("/city")} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to City</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <span className="font-bold text-white">City Library</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-white/30 text-xs">
          <span className="hidden sm:inline">Walk to a zone · Press</span>
          <kbd className="bg-white/8 border border-white/15 rounded px-1.5 py-0.5 font-mono text-xs">E</kbd>
          <span className="hidden sm:inline">to interact</span>
        </div>
      </header>

      {/* Game canvas */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
        <LibraryCanvas
          displayName={user?.displayName ?? "You"}
          onZoneChange={handleZoneChange}
        />

        {/* Zone panel overlay */}
        {activeZone && activeZone !== "exit" && (
          <ZonePanel
            zone={activeZone}
            onClose={() => setActiveZone(null)}
            files={files}
            loadingFiles={loadingFiles}
            uploading={uploading}
            onUpload={handleFileUpload}
            onDeleteFile={deleteFile}
            activeSubject={activeSubject}
            setActiveSubject={setActiveSubject}
          />
        )}
      </div>
    </div>
  )
}
