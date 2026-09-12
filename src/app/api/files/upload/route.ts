import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const folder = (formData.get("folder") as string) ?? "general"

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  // For MVP, store file metadata with a placeholder URL.
  // In production, replace with Uploadthing or S3 upload.
  const saved = await prisma.realmFile.create({
    data: {
      userId: user.id,
      name: file.name,
      url: "#",
      size: file.size,
      mimeType: file.type,
      folder,
    },
  })

  return NextResponse.json(saved, { status: 201 })
}
