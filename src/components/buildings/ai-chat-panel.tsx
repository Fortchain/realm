"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AiChatPanelProps {
  location: string
  personaName: string
  personaTitle: string
  personaAvatar: string
  accentColor?: string
  contextData?: string
}

export function AiChatPanel({
  location,
  personaName,
  personaTitle,
  personaAvatar,
  accentColor = "indigo",
  contextData,
}: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadHistory() {
      const res = await fetch(`/api/ai/chat?location=${location}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
      setInitialized(true)
    }
    loadHistory()
  }, [location])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setLoading(true)

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, message: userMsg, contextData }),
    })

    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d15] border-l border-white/8">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3 shrink-0">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white", {
          "bg-emerald-600": accentColor === "emerald",
          "bg-blue-600": accentColor === "blue",
          "bg-orange-600": accentColor === "orange",
          "bg-indigo-600": accentColor === "indigo",
        })}>
          {personaAvatar}
        </div>
        <div>
          <div className="text-white font-semibold text-sm">{personaName}</div>
          <div className="text-white/40 text-xs">{personaTitle}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/30 text-xs">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {!initialized && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        )}

        {initialized && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", {
              "bg-emerald-600/20": accentColor === "emerald",
              "bg-blue-600/20": accentColor === "blue",
              "bg-orange-600/20": accentColor === "orange",
              "bg-indigo-600/20": accentColor === "indigo",
            })}>
              <Bot className={cn("w-6 h-6", {
                "text-emerald-400": accentColor === "emerald",
                "text-blue-400": accentColor === "blue",
                "text-orange-400": accentColor === "orange",
                "text-indigo-400": accentColor === "indigo",
              })} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{personaName}</div>
              <div className="text-white/40 text-xs mt-1">Ask me anything</div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5", {
                "bg-emerald-600": accentColor === "emerald",
                "bg-blue-600": accentColor === "blue",
                "bg-indigo-600": accentColor === "indigo",
              })}>
                {personaAvatar}
              </div>
            )}
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", {
              "bg-white/10 text-white/90 rounded-tr-sm": msg.role === "user",
              "bg-white/5 text-white/80 border border-white/8 rounded-tl-sm": msg.role === "assistant",
            })}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-start">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0", {
              "bg-emerald-600": accentColor === "emerald",
              "bg-blue-600": accentColor === "blue",
              "bg-indigo-600": accentColor === "indigo",
            })}>
              {personaAvatar}
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/8 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={`Message ${personaName}...`}
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/90 placeholder:text-white/30 text-sm outline-none focus:border-white/20 resize-none transition-colors"
            style={{ maxHeight: "100px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={cn("p-2.5 rounded-xl transition-all disabled:opacity-40", {
              "bg-emerald-600 hover:bg-emerald-500": accentColor === "emerald",
              "bg-blue-600 hover:bg-blue-500": accentColor === "blue",
              "bg-indigo-600 hover:bg-indigo-500": accentColor === "indigo",
            })}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
