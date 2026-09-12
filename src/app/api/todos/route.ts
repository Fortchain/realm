import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json([])

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [{ completed: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(todos)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { title, category, dueDate, priority } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const todo = await prisma.todo.create({
    data: {
      userId: user.id,
      title: title.trim(),
      category: category ?? "task",
      priority: priority ?? "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })
  return NextResponse.json(todo, { status: 201 })
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { id, completed } = await req.json()
  const todo = await prisma.todo.updateMany({
    where: { id, userId: user.id },
    data: { completed },
  })
  return NextResponse.json(todo)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  await prisma.todo.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
