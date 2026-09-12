import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { chatWithPersona, type ChatMessage } from "@/lib/ai"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { location, message, contextData } = await req.json()
  if (!location || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  // Load or create conversation
  let conversation = await prisma.aiConversation.findUnique({
    where: { userId_location: { userId: user.id, location } },
  })

  const personaNames: Record<string, string> = {
    bank: "Morgan Wells",
    library: "Prof. Elena Vasquez",
    gym: "Coach Tyler Brooks",
    home: "ARIA",
    hospital: "Dr. Patel",
  }

  const existingMessages: ChatMessage[] = conversation
    ? (conversation.messages as unknown as ChatMessage[])
    : []

  const updatedMessages: ChatMessage[] = [
    ...existingMessages,
    { role: "user", content: message },
  ]

  const reply = await chatWithPersona(location, updatedMessages, contextData)

  const finalMessages: ChatMessage[] = [
    ...updatedMessages,
    { role: "assistant", content: reply },
  ]

  // Keep last 40 messages for context window management
  const trimmedMessages = finalMessages.slice(-40)

  if (conversation) {
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { messages: trimmedMessages as object[] },
    })
  } else {
    await prisma.aiConversation.create({
      data: {
        userId: user.id,
        location,
        personaName: personaNames[location] ?? "Assistant",
        messages: trimmedMessages as object[],
      },
    })
  }

  return NextResponse.json({ reply, messages: trimmedMessages })
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ messages: [] })

  const { searchParams } = new URL(req.url)
  const location = searchParams.get("location")
  if (!location) return NextResponse.json({ messages: [] })

  const conversation = await prisma.aiConversation.findUnique({
    where: { userId_location: { userId: user.id, location } },
  })

  return NextResponse.json({ messages: conversation?.messages ?? [] })
}
