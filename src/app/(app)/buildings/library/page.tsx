"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, FileText, Download, Trash2, FolderOpen, Loader2 } from "lucide-react"
import { AiChatPanel } from "@/components/buildings/ai-chat-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  { id: "general", label: "General Help", icon: "📖" },
  { id: "math", label: "Mathematics", icon: "🔢" },
  { id: "science", label: "Science", icon: "🔬" },
  { id: "english", label: "English & Writing", icon: "✍️" },
  { id: "history", label: "History", icon: "🏛️" },
  { id: "coding", label: "Coding & Tech", icon: "💻" },
  { id: "business", label: "Business & Finance", icon: "📊" },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryPage() {
  const router = useRouter()
  const [files, setFiles] = useState<RealmFile[]>([])
  const [activeSubject, setActiveSubject] = useState("general")
  const [uploading, setUploading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [activeTab, setActiveTab] = useState<"files" | "subjects">("subjects")

  const fetchFiles = useCallback(async () => {
    const res = await fetch("/api/files?folder=library")
    if (res.ok) setFiles(await res.json())
    setLoadingFiles(false)
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "library")

    const res = await fetch("/api/files/upload", { method: "POST", body: formData })
    if (res.ok) {
      const saved = await res.json()
      setFiles((prev) => [saved, ...prev])
    }
    setUploading(false)
    e.target.value = ""
  }

  async function deleteFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    await fetch(`/api/files?id=${id}`, { method: "DELETE" })
  }

  const contextData = activeSubject !== "general"
    ? `The student is asking about ${SUBJECTS.find((s) => s.id === activeSubject)?.label}. Focus your help on that subject.`
    : undefined

  return (
    <div className="h-screen bg-[#080810] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/8 shrink-0">
        <button onClick={() => router.push("/city")} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to City
        </button>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xl">📚</span>
          <span className="font-bold text-white">City Library</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all",
            "bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/25 hover:border-blue-500/50"
          )}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload File
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" />
          </label>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-56 shrink-0 border-r border-white/8 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/8">
            {[{ id: "subjects", label: "Subjects" }, { id: "files", label: "My Files" }].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as "files" | "subjects")}
                className={cn("flex-1 py-3 text-xs font-semibold transition-colors", activeTab === t.id ? "text-white border-b-2 border-blue-500" : "text-white/40 hover:text-white/70")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "subjects" && (
              <div className="space-y-1">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSubject(s.id)}
                    className={cn("w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors",
                      activeSubject === s.id ? "bg-blue-600/20 text-white border border-blue-500/30" : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === "files" && (
              <div className="space-y-1">
                {loadingFiles ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-xs">
                    <FolderOpen className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No files yet
                  </div>
                ) : (
                  files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 px-2 py-2 rounded-lg group hover:bg-white/5">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white/80 text-xs font-medium truncate">{file.name}</div>
                        <div className="text-white/30 text-xs">{formatBytes(file.size)}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/80">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => deleteFile(file.id)} className="text-white/40 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Subject info + study tips */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "subjects" && (
            <div>
              <div className="mb-6">
                <div className="text-3xl mb-2">{SUBJECTS.find((s) => s.id === activeSubject)?.icon}</div>
                <h2 className="text-xl font-bold text-white">{SUBJECTS.find((s) => s.id === activeSubject)?.label}</h2>
                <p className="text-white/40 text-sm mt-1">
                  Ask Prof. Elena anything about {SUBJECTS.find((s) => s.id === activeSubject)?.label.toLowerCase()} in the chat panel →
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Ask a Question", desc: "Type your homework question or topic in the chat. Professor Elena will explain it step by step.", icon: "💬" },
                  { title: "Review Your Work", desc: "Upload a document and ask the professor to review it and give feedback.", icon: "📝" },
                  { title: "Study Plan", desc: "Ask the professor to create a study plan for an upcoming exam or project.", icon: "📅" },
                  { title: "Research Help", desc: "Need sources or a summary of a topic? The library has everything.", icon: "🔍" },
                ].map((tip) => (
                  <div key={tip.title} className="bg-white/4 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors">
                    <div className="text-2xl mb-2">{tip.icon}</div>
                    <div className="text-white font-semibold text-sm mb-1">{tip.title}</div>
                    <div className="text-white/40 text-xs leading-relaxed">{tip.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <FolderOpen className="w-12 h-12 text-blue-400/40" />
              <div>
                <h3 className="text-white font-semibold mb-1">Your study files</h3>
                <p className="text-white/40 text-sm">Upload PDFs, docs, and notes. Ask the professor to help with them.</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Chat panel */}
        <div className="w-80 shrink-0">
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
    </div>
  )
}
