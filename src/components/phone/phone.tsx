"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckSquare, MessageCircle, Users, Rss, Plus, Trash2, Check } from "lucide-react"
import { usePhoneStore } from "@/store/phone"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Todo {
  id: string
  title: string
  category: string
  completed: boolean
  priority: string
  dueDate?: string
  createdAt: string
}

const CATEGORY_ICONS: Record<string, string> = {
  homework: "📚",
  chore: "🧹",
  errand: "🚗",
  prescription: "💊",
  task: "✅",
  reminder: "🔔",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-green-400",
}

export function Phone() {
  const { isOpen, activeTab, close, setTab } = usePhoneStore()
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [newCategory, setNewCategory] = useState("task")
  const [addingTodo, setAddingTodo] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && activeTab === "todos") fetchTodos()
  }, [isOpen, activeTab])

  async function fetchTodos() {
    const res = await fetch("/api/todos")
    if (res.ok) setTodos(await res.json())
  }

  async function addTodo() {
    if (!newTodo.trim()) return
    setLoading(true)
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTodo.trim(), category: newCategory }),
    })
    if (res.ok) {
      const todo = await res.json()
      setTodos((prev) => [todo, ...prev])
      setNewTodo("")
      setAddingTodo(false)
    }
    setLoading(false)
  }

  async function toggleTodo(id: string, completed: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)))
    await fetch("/api/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !completed }),
    })
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/todos?id=${id}`, { method: "DELETE" })
  }

  const pending = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Phone frame */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-50"
          >
            <div className="bg-[#0f0f1a] border border-white/15 rounded-t-3xl overflow-hidden shadow-2xl" style={{ height: "82vh" }}>
              {/* Phone notch / drag handle */}
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-5 py-1.5">
                <span className="text-white/60 text-xs font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-white/40 rounded-sm relative">
                    <div className="absolute left-0.5 top-0.5 bottom-0.5 w-2/3 bg-green-400 rounded-sm" />
                  </div>
                </div>
              </div>

              {/* App header */}
              <div className="flex items-center justify-between px-5 py-2">
                <span className="text-white font-bold text-lg">
                  {activeTab === "todos" && "My Tasks"}
                  {activeTab === "messages" && "Messages"}
                  {activeTab === "contacts" && "Contacts"}
                  {activeTab === "feed" && "Feed"}
                </span>
                <button onClick={close} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ height: "calc(82vh - 160px)" }}>
                {/* TODOS TAB */}
                {activeTab === "todos" && (
                  <div className="space-y-4">
                    {/* Add todo */}
                    {addingTodo ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <input
                          autoFocus
                          value={newTodo}
                          onChange={(e) => setNewTodo(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTodo()}
                          placeholder="What needs to be done?"
                          className="w-full bg-transparent text-white placeholder:text-white/30 text-sm outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 text-xs outline-none"
                          >
                            {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                              <option key={key} value={key}>{icon} {key}</option>
                            ))}
                          </select>
                          <button onClick={addTodo} disabled={loading || !newTodo.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40">
                            Add
                          </button>
                          <button onClick={() => setAddingTodo(false)} className="text-white/40 text-xs px-2">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingTodo(true)}
                        className="w-full flex items-center gap-3 bg-white/3 hover:bg-white/6 border border-white/8 border-dashed rounded-2xl px-4 py-3 text-white/40 text-sm transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add task, reminder, or errand
                      </button>
                    )}

                    {/* Pending */}
                    {pending.length > 0 && (
                      <div className="space-y-2">
                        {pending.map((todo) => (
                          <div key={todo.id} className="flex items-center gap-3 bg-white/4 rounded-xl px-3 py-3 group">
                            <button
                              onClick={() => toggleTodo(todo.id, todo.completed)}
                              className="w-5 h-5 rounded-full border border-white/25 hover:border-indigo-400 transition-colors shrink-0 flex items-center justify-center"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white/90 text-sm">{todo.title}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-white/30 text-xs">{CATEGORY_ICONS[todo.category]} {todo.category}</span>
                                <span className={cn("text-xs", PRIORITY_COLORS[todo.priority])}>● {todo.priority}</span>
                              </div>
                            </div>
                            <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Done */}
                    {done.length > 0 && (
                      <div>
                        <div className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-2 px-1">Completed</div>
                        <div className="space-y-1.5">
                          {done.slice(0, 5).map((todo) => (
                            <div key={todo.id} className="flex items-center gap-3 px-3 py-2 group opacity-50">
                              <button onClick={() => toggleTodo(todo.id, todo.completed)} className="w-5 h-5 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-indigo-400" />
                              </button>
                              <span className="text-white/50 text-sm line-through flex-1">{todo.title}</span>
                              <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {todos.length === 0 && (
                      <div className="text-center py-12 text-white/20 text-sm">
                        No tasks yet. Add your first one above.
                      </div>
                    )}
                  </div>
                )}

                {/* MESSAGES / CONTACTS / FEED — stubs */}
                {activeTab === "messages" && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white/30 text-sm">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Messages coming soon.<br />
                      <span className="text-xs">Invite friends to Realm to start chatting.</span>
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white/30 text-sm">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Contacts coming soon.
                    </div>
                  </div>
                )}

                {activeTab === "feed" && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white/30 text-sm">
                      <Rss className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Gleam feed is loading.<br />
                      <span className="text-xs">Your social world lives here.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom nav */}
              <div className="border-t border-white/8 px-6 py-3 flex items-center justify-around bg-[#0f0f1a] shrink-0">
                {[
                  { tab: "todos" as const, icon: CheckSquare, label: "Tasks" },
                  { tab: "messages" as const, icon: MessageCircle, label: "Messages" },
                  { tab: "contacts" as const, icon: Users, label: "Contacts" },
                  { tab: "feed" as const, icon: Rss, label: "Feed" },
                ].map(({ tab, icon: Icon, label }) => (
                  <button
                    key={tab}
                    onClick={() => setTab(tab)}
                    className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === tab ? "text-indigo-400" : "text-white/30 hover:text-white/60")}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
