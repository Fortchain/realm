import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { cityMap: true },
  })
  if (!user) return NextResponse.json({ objects: [] })

  return NextResponse.json({ objects: user.cityMap?.objects ?? [] })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { objects } = await req.json()

  const cityMap = await prisma.cityMap.upsert({
    where: { userId: user.id },
    create: { userId: user.id, objects },
    update: { objects },
  })

  return NextResponse.json({ ok: true, updatedAt: cityMap.updatedAt })
}
