import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid"
import { prisma } from "@/lib/prisma"

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments ?? "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(config)

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { publicToken, institutionName, institutionId } = await req.json()

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
  const { access_token, item_id } = exchangeResponse.data

  await prisma.bankConnection.upsert({
    where: { itemId: item_id },
    update: { accessToken: access_token, institutionName, institutionId },
    create: {
      userId: user.id,
      accessToken: access_token,
      itemId: item_id,
      institutionName,
      institutionId,
    },
  })

  return NextResponse.json({ ok: true })
}
