"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Loader2, TrendingUp, TrendingDown, CreditCard, Building2, RefreshCw } from "lucide-react"
import { usePlaidLink } from "react-plaid-link"
import { AiChatPanel } from "@/components/buildings/ai-chat-panel"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

interface Account {
  id: string
  name: string
  officialName: string | null
  type: string
  subtype: string | null
  balance: number | null
  availableBalance: number | null
  institution: string | null
}

interface Transaction {
  id: string
  name: string
  amount: number
  date: string
  category: string
  pending: boolean
}

interface BankData {
  connected: boolean
  accounts: Account[]
  transactions: Transaction[]
  institutions: string[]
}

function PlaidConnectButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/bank/link-token", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setLinkToken(d.linkToken))
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: async (publicToken, metadata) => {
      await fetch("/api/bank/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionName: metadata.institution?.name,
          institutionId: metadata.institution?.institution_id,
        }),
      })
      onSuccess()
    },
  })

  return (
    <Button variant="glow" size="md" onClick={() => open()} disabled={!ready || !linkToken}>
      <Plus className="w-4 h-4 mr-2" />
      Connect Bank Account
    </Button>
  )
}

export default function BankPage() {
  const router = useRouter()
  const [bankData, setBankData] = useState<BankData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/bank/data")
    if (res.ok) setBankData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalBalance = bankData?.accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0) ?? 0
  const spending = bankData?.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) ?? 0

  const contextData = bankData?.connected
    ? `User accounts: ${JSON.stringify(bankData.accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance })))}
Total balance: $${totalBalance.toFixed(2)}
Recent spending (30 days): $${spending.toFixed(2)}
Top transactions: ${JSON.stringify(bankData.transactions.slice(0, 10))}`
    : "No bank accounts connected yet."

  return (
    <div className="h-screen bg-[#080810] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/8 shrink-0">
        <button onClick={() => router.push("/city")} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to City
        </button>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xl">🏦</span>
          <span className="font-bold text-white">First Realm Bank</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {bankData?.connected && (
            <button onClick={fetchData} className="text-white/40 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {!bankData?.connected && !loading && <PlaidConnectButton onSuccess={fetchData} />}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : !bankData?.connected ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl">🏦</div>
              <div>
                <h2 className="text-white font-bold text-lg mb-1">Connect your bank</h2>
                <p className="text-white/40 text-sm">Morgan will analyze your finances and give you a personalized plan.</p>
              </div>
              <PlaidConnectButton onSuccess={fetchData} />
              <p className="text-white/20 text-xs">Powered by Plaid · Bank-level encryption</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                  <div className="text-emerald-400/70 text-xs font-semibold uppercase tracking-wider mb-2">Total Balance</div>
                  <div className="text-3xl font-bold text-white">{formatCurrency(totalBalance)}</div>
                  <div className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Across {bankData.accounts.length} accounts
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">30-Day Spending</div>
                  <div className="text-3xl font-bold text-white">{formatCurrency(spending)}</div>
                  <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Debits this month
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Institutions</div>
                  <div className="text-xl font-bold text-white">{bankData.institutions.join(", ") || "—"}</div>
                  <div className="text-white/30 text-xs mt-1">Connected via Plaid</div>
                </div>
              </div>

              {/* Accounts */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" /> Accounts
                </h3>
                <div className="space-y-2">
                  {bankData.accounts.map((account) => (
                    <div key={account.id} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{account.name}</div>
                          <div className="text-white/40 text-xs capitalize">{account.subtype ?? account.type} · {account.institution}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{account.balance !== null ? formatCurrency(account.balance) : "—"}</div>
                        {account.availableBalance !== null && (
                          <div className="text-white/30 text-xs">{formatCurrency(account.availableBalance)} available</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div>
                <h3 className="text-white font-semibold mb-3">Recent Transactions</h3>
                <div className="space-y-1.5">
                  {bankData.transactions.slice(0, 15).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/5 rounded-xl transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-white/90 text-sm font-medium truncate">{tx.name}</div>
                        <div className="text-white/30 text-xs">{tx.category} · {tx.date} {tx.pending ? "· pending" : ""}</div>
                      </div>
                      <div className={`font-semibold text-sm ml-4 ${tx.amount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {tx.amount > 0 ? "-" : "+"}{formatCurrency(Math.abs(tx.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* AI Chat panel */}
        <div className="w-80 shrink-0">
          <AiChatPanel
            location="bank"
            personaName="Morgan Wells"
            personaTitle="Personal Banker"
            personaAvatar="MW"
            accentColor="emerald"
            contextData={contextData}
          />
        </div>
      </div>
    </div>
  )
}
