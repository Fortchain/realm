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

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ connected: false, accounts: [], transactions: [] })

  const connections = await prisma.bankConnection.findMany({ where: { userId: user.id } })
  if (connections.length === 0) return NextResponse.json({ connected: false, accounts: [], transactions: [] })

  const allAccounts = []
  const allTransactions = []

  for (const connection of connections) {
    try {
      const accountsRes = await plaidClient.accountsGet({ access_token: connection.accessToken })
      allAccounts.push(...accountsRes.data.accounts.map((a) => ({
        id: a.account_id,
        name: a.name,
        officialName: a.official_name,
        type: a.type,
        subtype: a.subtype,
        balance: a.balances.current,
        availableBalance: a.balances.available,
        institution: connection.institutionName,
      })))

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const txRes = await plaidClient.transactionsGet({
        access_token: connection.accessToken,
        start_date: thirtyDaysAgo.toISOString().split("T")[0],
        end_date: now.toISOString().split("T")[0],
        options: { count: 50 },
      })
      allTransactions.push(...txRes.data.transactions.map((t) => ({
        id: t.transaction_id,
        name: t.name,
        amount: t.amount,
        date: t.date,
        category: t.category?.[0] ?? "Other",
        pending: t.pending,
      })))
    } catch {
      // Skip failed connections
    }
  }

  return NextResponse.json({
    connected: true,
    accounts: allAccounts,
    transactions: allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    institutions: connections.map((c) => c.institutionName).filter(Boolean),
  })
}
