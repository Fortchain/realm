"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckSquare, MessageCircle, Users, Rss, Plus, Trash2, Check, Smartphone } from "lucide-react"
import { usePhoneStore } from "@/store/phone"
import { cn } from "@/lib/utils"

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
  homework: "📚", chore: "🧹", errand: "🚗",
  prescription: "💊", task: "✅", reminder: "🔔",
}
const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400", medium: "text-amber-400", low: "text-green-400",
}

export function Phone() {
  const { isOpen, activeTab, open, close, setTab } = usePhoneStore()
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
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !completed } : t))
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
  const done    = todos.filter((t) => t.completed)
  const pendingCount = pending.length

  return (
    <>
      {/* Floating phone button — always visible bottom-right */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => open("todos")}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/40 flex items-center justify-center transition-colors"
          >
            <Smartphone className="w-6 h-6 text-white" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Phone panel — slides up from bottom-right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-6 right-6 z-50"
            style={{ width: 340, height: 580 }}
          >
            {/* Phone shell */}
            <div className="w-full h-full rounded-[2.5rem] border border-white/15 overflow-hidden shadow-2xl shadow-black/60 flex flex-col"
              style={{ background: "linear-gradient(180deg, #0d0d1e 0%, #0a0a18 100%)" }}
            >
              {/* Notch bar */}
              <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
                <div className="w-20 h-1 bg-white/15 rounded-full" />
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between px-5 py-1 shrink-0">
                <span className="text-white/50 text-xs font-semibold font-mono">
                  {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2.5 border border-white/30 rounded-[2px] relative">
                    <div className="absolute left-0.5 top-0.5 bottom-0.5 w-2/3 bg-green-400 rounded-[1px]" />
                  </div>
                  <button onClick={close} className="ml-1 w-6 h-6 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors">
                    <X className="w-3 h-3 text-white/50" />
                  </button>
                </div>
              </div>

              {/* Page title */}
              <div className="px-5 py-2 shrink-0">
                <h2 className="text-white font-bold text-base">
                  {activeTab === "todos"    && "My Tasks"}
                  {activeTab === "messages" && "Messages"}
                  {activeTab === "contacts" && "Contacts"}
                  {activeTab === "feed"     && "Gleam Feed"}
                </h2>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 min-h-0">
                {/* TODOS */}
                {activeTab === "todos" && (
                  <div className="space-y-3 pb-4">
                    {addingTodo ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2.5">
                        <input
                          autoFocus
                          value={newTodo}
                          onChange={(e) => setNewTodo(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTodo()}
                          placeholder="What needs to be done?"
                          className="w-full bg-transparent text-white placeholder:text-white/25 text-sm outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60 text-xs outline-none"
                          >
                            {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                              <option key={key} value={key}>{icon} {key}</option>
                            ))}
                          </select>
                          <button onClick={addTodo} disabled={loading || !newTodo.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
                          >Add</button>
                          <button onClick={() => setAddingTodo(false)} className="text-white/30 text-xs">✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTodo(true)}
                        className="w-full flex items-center gap-2.5 bg-white/3 hover:bg-white/6 border border-dashed border-white/10 rounded-2xl px-4 py-2.5 text-white/35 text-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add task, reminder, or errand
                      </button>
                    )}

                    {pending.map((todo) => (
                      <div key={todo.id} className="flex items-center gap-2.5 bg-white/4 rounded-xl px-3 py-2.5 group">
                        <button onClick={() => toggleTodo(todo.id, todo.completed)}
                          className="w-4.5 h-4.5 rounded-full border border-white/20 hover:border-indigo-400 transition-colors shrink-0 flex items-center justify-center"
                          style={{ width: 18, height: 18 }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/85 text-xs leading-tight">{todo.title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-white/25 text-xs">{CATEGORY_ICONS[todo.category]}</span>
                            <span className={cn("text-xs", PRIORITY_COLORS[todo.priority])}>● {todo.priority}</span>
                          </div>
                        </div>
                        <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {done.length > 0 && (
                      <div>
                        <div className="text-white/20 text-xs uppercase tracking-wider mb-1.5 px-1">Done</div>
                        {done.slice(0, 4).map((todo) => (
                          <div key={todo.id} className="flex items-center gap-2.5 px-3 py-2 group opacity-40">
                            <button onClick={() => toggleTodo(todo.id, todo.completed)}
                              className="w-4.5 h-4.5 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center shrink-0"
                              style={{ width: 18, height: 18 }}
                            >
                              <Check className="w-2.5 h-2.5 text-indigo-400" />
                            </button>
                            <span className="text-white/40 text-xs line-through flex-1">{todo.title}</span>
                            <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {todos.length === 0 && !addingTodo && (
                      <div className="text-center py-10 text-white/20 text-xs">No tasks yet.</div>
                    )}
                  </div>
                )}

                {activeTab === "messages" && (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center text-white/25 text-xs">
                      <MessageCircle className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      Messages coming soon
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center text-white/25 text-xs">
                      <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      Contacts coming soon
                    </div>
                  </div>
                )}

                {activeTab === "feed" && (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center text-white/25 text-xs">
                      <Rss className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      Your Gleam feed lives here
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom tab bar */}
              <div className="border-t border-white/8 flex items-center justify-around px-4 py-2.5 shrink-0">
                {([
                  { tab: "todos",    icon: CheckSquare,  label: "Tasks"    },
                  { tab: "messages", icon: MessageCircle, label: "Messages" },
                  { tab: "contacts", icon: Users,         label: "Contacts" },
                  { tab: "feed",     icon: Rss,           label: "Feed"     },
                ] as const).map(({ tab, icon: Icon, label }) => (
                  <button key={tab} onClick={() => setTab(tab)}
                    className={cn("flex flex-col items-center gap-0.5 transition-colors", activeTab === tab ? "text-indigo-400" : "text-white/25 hover:text-white/50")}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                    <span className="text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
