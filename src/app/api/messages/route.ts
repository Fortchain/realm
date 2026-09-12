import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json([])

  const { searchParams } = new URL(req.url)
  const withUserId = searchParams.get("with")

  if (withUserId) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: user.id, toUserId: withUserId },
          { fromUserId: withUserId, toUserId: user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    })
    return NextResponse.json(messages)
  }

  // Return conversation threads (last message per contact)
  const messages = await prisma.message.findMany({
    where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: { from: { select: { id: true, displayName: true, avatarUrl: true } } },
    take: 100,
  })
  return NextResponse.json(messages)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { toUserId, content } = await req.json()
  if (!toUserId || !content?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const message = await prisma.message.create({
    data: { fromUserId: user.id, toUserId, content: content.trim() },
  })
  return NextResponse.json(message, { status: 201 })
}
