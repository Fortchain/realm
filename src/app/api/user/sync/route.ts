import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ""
  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || undefined
  const avatarUrl = clerkUser.imageUrl || undefined

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { email, avatarUrl },
    create: { clerkId: userId, email, displayName, avatarUrl },
  })

  return NextResponse.json(user)
}
