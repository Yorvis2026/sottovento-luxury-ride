"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

// ============================================================
// /driver/earnings
// Driver Earnings Dashboard — 3 tabs:
//   1. Earnings  — executor + source breakdown, monthly chart
//   2. Rides     — per-ride commission history (last 30)
//   3. Payouts   — payout method, balance, history
// ============================================================

const GOLD = "#C8A96A"
const BLUE = "#60a5fa"
const GREEN = "#4ade80"
const AMBER = "#fbbf24"
const PURPLE = "#a78bfa"
const ZINC800 = "#27272a"
const ZINC900 = "#18181b"

// ── Types ────────────────────────────────────────────────────

interface PayoutMethod {
  status: "connected" | "not_connected" | "pending_verification" | "restricted"
  type: string | null
  last4: string | null
  bank_name: string | null
  verified: boolean
  stripe_account_id: string | null
  onboarding_url: string | null
  payout_onboarding_status?: string | null
  payouts_enabled?: boolean
  resume_onboarding_url?: string | null
}

interface Balance {
  available: number
  pending: number
  paid_total: number
  payout_frequency: string
  next_payout_day: string
}

interface PayoutHistoryItem {
  date: string
  amount: number
  status: string
  ride_count: number
}

interface EarningsHistoryItem {
  id: string
  date: string
  pickup_at: string
  client_name: string
  route: string
  booking_total: number
  my_amount: number
  my_pct: number
  role: "executor" | "source" | "both"
  status: string
  vehicle_type: string
}

interface PayoutData {
  driver: { id: string; driver_code: string; full_name: string }
  payout_method: PayoutMethod
  balance: Balance
  payout_history: PayoutHistoryItem[]
  earnings_history: EarningsHistoryItem[]
}

// ── Status badge styles ──────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "#1e3a5f", text: BLUE },
  paid:      { bg: "#14532d", text: GREEN },
  pending:   { bg: "#3f3f46", text: "#a1a1aa" },
  disputed:  { bg: "#7f1d1d", text: "#f87171" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {status}
    </span>
  )
}

function RoleBadge({ role }: { role: "executor" | "source" | "both" }) {
  const map = {
    executor: { bg: "#1e3a5f", text: BLUE, label: "Executor" },
    source:   { bg: "#3b2a0e", text: GOLD,  label: "Source" },
    both:     { bg: "#2d1a4a", text: PURPLE, label: "Exec+Source" },
  }
  const s = map[role]
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ── Payout Method Card ───────────────────────────────────────
// Shows the full Stripe Connect onboarding state with all UX states:
//   not_connected        → Not started
//   pending_verification → Pending verification
//   connected            → Connected (payouts_enabled)
//   restricted           → Restricted / action required

function PayoutMethodCard({
  method,
  driverCode,
  onUpdate,
}: {
  method: PayoutMethod
  driverCode: string
  onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Refresh status from Stripe
  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch(`/api/driver/payout-status?code=${driverCode}`, { cache: "no-store" })
      onUpdate()
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  async function handleAction() {
    setLoading(true)
    try {
      if (method.status === "not_connected") {
        // Start Stripe onboarding — GET redirects to Stripe
        window.location.href = `/api/driver/stripe-onboard?code=${driverCode}`
        return
      }
      if (method.status === "pending_verification" || method.status === "restricted") {
        // Resume onboarding if URL available, else generate new link
        if (method.resume_onboarding_url) {
          window.location.href = method.resume_onboarding_url
          return
        }
        // Fallback: GET generates a new Account Link
        window.location.href = `/api/driver/stripe-onboard?code=${driverCode}`
        return
      }
      // connected — get login link to manage payout method
      const res = await fetch(`/api/driver/stripe-onboard?code=${driverCode}`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.redirect) {
        window.location.href = data.redirect
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Status badge config
  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    connected:            { label: "Connected",          bg: "#14532d",  color: GREEN },
    pending_verification: { label: "Pending verification", bg: "#3b2a0e", color: AMBER },
    restricted:           { label: "Action required",    bg: "#7f1d1d",  color: "#f87171" },
    not_connected:        { label: "Not started",        bg: "#3f3f46",  color: "#a1a1aa" },
  }
  const badge = statusConfig[method.status] ?? statusConfig.not_connected

  // Button label
  const buttonLabel = loading
    ? "Redirecting to Stripe..."
    : method.status === "not_connected"
    ? "Connect Stripe for Payouts"
    : method.status === "pending_verification"
    ? "Resume Verification"
    : method.status === "restricted"
    ? "Fix Account Issues"
    : "Manage Payout Method"

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: ZINC800, backgroundColor: ZINC900 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-zinc-500 uppercase tracking-widest">
          Payout Setup
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          {method.stripe_account_id && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
              title="Refresh status from Stripe"
            >
              {refreshing ? "↻" : "↻"}
            </button>
          )}
          {/* Status badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Ready for payouts indicator */}
      {method.payouts_enabled && (
        <div
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
          style={{ backgroundColor: "#14532d22", border: "1px solid #14532d" }}
        >
          <span className="text-green-400 text-sm">✓</span>
          <div className="text-xs text-green-400 font-medium">Ready for weekly payouts</div>
        </div>
      )}

      {/* Method info */}
      {method.status === "connected" || method.status === "pending_verification" ? (
        <div className="mb-4">
          {method.last4 ? (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏦</span>
              <div>
                <div className="text-sm font-medium text-white">
                  {method.type === "debit_card" ? "Debit Card" : "Bank Account"}
                  {` ****${method.last4}`}
                </div>
                {method.bank_name && (
                  <div className="text-xs text-zinc-500">{method.bank_name}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400 mb-1">
              {method.status === "pending_verification"
                ? "Verification in progress — complete your Stripe setup to receive payouts."
                : "Bank account connected via Stripe"}
            </div>
          )}
          <div className="text-xs text-zinc-600 mt-1">
            Payout destination managed securely by Stripe
          </div>
        </div>
      ) : method.status === "restricted" ? (
        <div className="mb-4">
          <div className="text-sm text-red-400 mb-1">Action required</div>
          <div className="text-xs text-zinc-600">
            Your Stripe account has pending requirements. Please complete them to enable payouts.
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="text-sm text-zinc-400 mb-1">No payout method connected</div>
          <div className="text-xs text-zinc-600">
            Connect your bank account or debit card to receive weekly payments.
            All transfers are processed securely through Stripe.
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-medium transition"
        style={{
          backgroundColor: loading ? ZINC800 : GOLD,
          color: loading ? "#a1a1aa" : "#000",
        }}
      >
        {buttonLabel}
      </button>

      {/* Security note */}
      <div className="mt-2 text-xs text-zinc-600 text-center">
        🔒 Your banking details are never stored on our servers.
        Managed securely through Stripe Express.
      </div>
    </div>
  )
}

// ── Balance Summary Card ─────────────────────────────────────

function BalanceSummaryCard({ balance }: { balance: Balance }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: ZINC800, backgroundColor: ZINC900 }}
    >
      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
        Payout Summary
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Available */}
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: "#14532d22", border: `1px solid #14532d` }}
        >
          <div className="text-xs text-zinc-500 mb-1">Available</div>
          <div className="text-xl font-light" style={{ color: GREEN }}>
            ${balance.available.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">Ready for payout</div>
        </div>

        {/* Pending */}
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: "#3b2a0e22", border: `1px solid #3b2a0e` }}
        >
          <div className="text-xs text-zinc-500 mb-1">Pending</div>
          <div className="text-xl font-light" style={{ color: AMBER }}>
            ${balance.pending.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">Awaiting confirmation</div>
        </div>
      </div>

      {/* Payout schedule — platform controlled */}
      <div
        className="rounded-lg p-3"
        style={{ backgroundColor: "#1e1e2e", border: `1px solid ${ZINC800}` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-zinc-500">Payout Schedule</div>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#1e3a5f", color: BLUE }}
          >
            Platform controlled
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-zinc-600">Frequency</div>
            <div className="text-sm text-white font-medium mt-0.5">
              {balance.payout_frequency}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-600">Next payout</div>
            <div className="text-sm font-medium mt-0.5" style={{ color: GOLD }}>
              {balance.next_payout_day}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-zinc-600">
          Payout frequency is set by the platform. Contact support to request changes.
        </div>
      </div>
    </div>
  )
}

// ── Payout History Table ─────────────────────────────────────

function PayoutHistorySection({ history }: { history: PayoutHistoryItem[] }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: ZINC800, backgroundColor: ZINC900 }}
    >
      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
        Payout History
      </div>

      {history.length === 0 ? (
        <div className="text-center text-zinc-600 py-6 text-sm">
          No payouts yet. Your first payout will appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b"
              style={{ borderColor: ZINC800 }}
            >
              <div>
                <div className="text-sm text-white">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-xs text-zinc-500">
                  {item.ride_count} ride{item.ride_count !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium" style={{ color: GREEN }}>
                  ${item.amount.toFixed(2)}
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Commission Structure Reference ──────────────────────────

function CommissionReference() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: ZINC800, backgroundColor: "#0f0f1a" }}
    >
      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
        Commission Structure
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-xl font-light mb-1" style={{ color: BLUE }}>65%</div>
          <div className="text-zinc-300 font-medium">Executor</div>
          <div className="text-zinc-600 mt-0.5">Driver who runs the ride</div>
        </div>
        <div>
          <div className="text-xl font-light mb-1" style={{ color: GOLD }}>15%</div>
          <div className="text-zinc-300 font-medium">Source</div>
          <div className="text-zinc-600 mt-0.5">Driver who captured the client</div>
        </div>
        <div>
          <div className="text-xl font-light mb-1 text-zinc-400">20%</div>
          <div className="text-zinc-300 font-medium">Platform</div>
          <div className="text-zinc-600 mt-0.5">Sottovento Network</div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function EarningsPage() {
  const [tab, setTab] = useState<"earnings" | "rides" | "payouts">("earnings")
  const [data, setData] = useState<PayoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [driverCode, setDriverCode] = useState<string>("")
  const [expandedRide, setExpandedRide] = useState<string | null>(null)

  // Month filter for earnings tab
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  // Get driver code from localStorage (set by driver panel)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sottovento_driver_code")
      if (stored) setDriverCode(stored.toUpperCase())
    } catch {}
  }, [])

  const fetchData = useCallback(async () => {
    if (!driverCode) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/driver/payout-info?code=${driverCode}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [driverCode])

  useEffect(() => {
    if (driverCode) fetchData()
  }, [driverCode, fetchData])

  // Handle Stripe return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("stripe") === "success") {
      // Refresh data after Stripe onboarding
      setTimeout(() => fetchData(), 1500)
    }
  }, [fetchData])

  // ── Earnings tab data ──────────────────────────────────────
  const filteredRides = data?.earnings_history.filter((e) =>
    e.date.startsWith(selectedMonth)
  ) ?? []

  const executorTotal = filteredRides
    .filter((e) => e.role === "executor" || e.role === "both")
    .reduce((s, e) => s + (e.role === "both" ? e.my_amount * (65 / (65 + 15)) : e.my_amount), 0)

  const sourceTotal = filteredRides
    .filter((e) => e.role === "source" || e.role === "both")
    .reduce((s, e) => s + (e.role === "both" ? e.my_amount * (15 / (65 + 15)) : e.my_amount), 0)

  const grandTotal = filteredRides.reduce((s, e) => s + e.my_amount, 0)

  // Generate last 4 months for month selector
  const months: string[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header — sticky with iOS safe-area-inset-top */}
      <div
        className="border-b px-4 flex items-center gap-3 bg-black"
        style={{
          borderColor: ZINC800,
          position: "sticky",
          top: 0,
          zIndex: 50,
          paddingTop: "max(env(safe-area-inset-top), 16px)",
          paddingBottom: "16px",
        }}
      >
        <Link
          href={driverCode ? `/driver/${driverCode}` : "/driver"}
          className="text-zinc-400 hover:text-white transition text-lg"
        >
          ←
        </Link>
        <div>
          <h1 className="text-base font-medium">My Earnings</h1>
          <p className="text-xs text-zinc-500">
            {data?.driver.full_name ?? "Loading..."} · {driverCode}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div
        className="flex border-b"
        style={{ borderColor: ZINC800 }}
      >
        {(["earnings", "rides", "payouts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-sm font-medium transition"
            style={{
              color: tab === t ? GOLD : "#71717a",
              borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
            }}
          >
            {t === "earnings" ? "Earnings" : t === "rides" ? "Rides" : "Payouts"}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-zinc-500 text-sm">Loading earnings data...</div>
        </div>
      )}

      {error && !loading && (
        <div className="px-4 py-6">
          <div
            className="rounded-xl border p-4 text-sm"
            style={{ borderColor: "#7f1d1d", backgroundColor: "#1c0a0a", color: "#f87171" }}
          >
            Failed to load earnings data. Please try again.
            <button
              onClick={fetchData}
              className="ml-2 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── TAB: EARNINGS ──────────────────────────────── */}
          {tab === "earnings" && (
            <div className="pb-10">
              {/* Month selector */}
              <div
                className="px-4 py-3 flex gap-2 overflow-x-auto border-b"
                style={{ borderColor: ZINC800 }}
              >
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition"
                    style={
                      selectedMonth === m
                        ? { backgroundColor: GOLD, color: "#000" }
                        : { border: `1px solid ${ZINC800}`, color: "#71717a" }
                    }
                  >
                    {new Date(m + "-01").toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </button>
                ))}
              </div>

              {/* Summary cards */}
              <div
                className="grid grid-cols-3 border-b"
                style={{ borderColor: ZINC800 }}
              >
                <div
                  className="px-4 py-4 text-center border-r"
                  style={{ borderColor: ZINC800 }}
                >
                  <div className="text-xs text-zinc-500 mb-1">Executor</div>
                  <div className="text-xl font-light" style={{ color: BLUE }}>
                    ${executorTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">65%</div>
                </div>
                <div
                  className="px-4 py-4 text-center border-r"
                  style={{ borderColor: ZINC800 }}
                >
                  <div className="text-xs text-zinc-500 mb-1">Source</div>
                  <div className="text-xl font-light" style={{ color: GOLD }}>
                    ${sourceTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">15%</div>
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="text-xs text-zinc-500 mb-1">Total</div>
                  <div className="text-xl font-light text-white">
                    ${grandTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">Combined</div>
                </div>
              </div>

              {/* Split bar */}
              {grandTotal > 0 && (
                <div className="px-4 py-3">
                  <div className="flex rounded-full overflow-hidden h-2">
                    <div
                      style={{
                        width: `${(executorTotal / grandTotal) * 100}%`,
                        backgroundColor: BLUE,
                      }}
                    />
                    <div
                      style={{
                        width: `${(sourceTotal / grandTotal) * 100}%`,
                        backgroundColor: GOLD,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span style={{ color: BLUE }}>
                      Executor {grandTotal > 0 ? ((executorTotal / grandTotal) * 100).toFixed(0) : 0}%
                    </span>
                    <span style={{ color: GOLD }}>
                      Source {grandTotal > 0 ? ((sourceTotal / grandTotal) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Balance quick view */}
              <div className="px-4 py-3">
                <div
                  className="rounded-xl border p-3 flex items-center justify-between"
                  style={{ borderColor: ZINC800, backgroundColor: ZINC900 }}
                >
                  <div>
                    <div className="text-xs text-zinc-500">Available for payout</div>
                    <div className="text-lg font-light" style={{ color: GREEN }}>
                      ${data.balance.available.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Next payout</div>
                    <div className="text-sm font-medium" style={{ color: GOLD }}>
                      {data.balance.next_payout_day.split(",")[0]}
                    </div>
                  </div>
                  <button
                    onClick={() => setTab("payouts")}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: ZINC800, color: "#a1a1aa" }}
                  >
                    View Payouts →
                  </button>
                </div>
              </div>

              {/* Empty state */}
              {filteredRides.length === 0 && (
                <div className="text-center text-zinc-600 py-12 text-sm">
                  No earnings for this period.
                </div>
              )}

              {/* Commission reference */}
              <div className="px-4 mt-2">
                <CommissionReference />
              </div>
            </div>
          )}

          {/* ── TAB: RIDES ─────────────────────────────────── */}
          {tab === "rides" && (
            <div className="px-4 py-4 space-y-3 pb-10">
              {data.earnings_history.length === 0 ? (
                <div className="text-center text-zinc-600 py-12 text-sm">
                  No ride earnings recorded yet.
                </div>
              ) : (
                data.earnings_history.map((entry) => {
                  const isExpanded = expandedRide === entry.id
                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border"
                      style={{ borderColor: ZINC800, backgroundColor: ZINC900 }}
                    >
                      {/* Collapsed row */}
                      <button
                        className="w-full p-4 text-left"
                        onClick={() =>
                          setExpandedRide(isExpanded ? null : entry.id)
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="text-sm font-medium truncate">
                              {entry.client_name}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5 truncate">
                              {entry.route}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div
                              className="text-base font-light"
                              style={{ color: entry.role === "source" ? GOLD : entry.role === "both" ? PURPLE : BLUE }}
                            >
                              +${entry.my_amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {entry.my_pct.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={entry.role} />
                          <StatusBadge status={entry.status} />
                          <span className="text-xs text-zinc-600 ml-auto">
                            {new Date(entry.pickup_at || entry.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div
                          className="px-4 pb-4 pt-0 border-t"
                          style={{ borderColor: ZINC800 }}
                        >
                          <div className="mt-3 space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Booking total</span>
                              <span className="text-white">${entry.booking_total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">SLN commission (20%)</span>
                              <span className="text-zinc-400">
                                -${(entry.booking_total * 0.2).toFixed(2)}
                              </span>
                            </div>
                            {(entry.role === "executor" || entry.role === "both") && (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Your executor share (65%)</span>
                                <span style={{ color: BLUE }}>
                                  +${(entry.booking_total * 0.65).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {(entry.role === "source" || entry.role === "both") && (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Your source share (15%)</span>
                                <span style={{ color: GOLD }}>
                                  +${(entry.booking_total * 0.15).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div
                              className="flex justify-between font-medium pt-1 border-t"
                              style={{ borderColor: ZINC800 }}
                            >
                              <span className="text-white">Your earnings</span>
                              <span style={{ color: GREEN }}>
                                +${entry.my_amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Vehicle</span>
                              <span className="text-zinc-400">{entry.vehicle_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Payment status</span>
                              <StatusBadge status={entry.status} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── TAB: PAYOUTS ───────────────────────────────── */}
          {tab === "payouts" && (
            <div className="px-4 py-4 space-y-4 pb-10">
              {/* Payout method */}
              <PayoutMethodCard
                method={data.payout_method}
                driverCode={driverCode}
                onUpdate={fetchData}
              />

              {/* Balance summary */}
              <BalanceSummaryCard balance={data.balance} />

              {/* Payout history */}
              <PayoutHistorySection history={data.payout_history} />

              {/* Commission reference */}
              <CommissionReference />

              {/* Support note */}
              <div
                className="rounded-xl border p-4 text-xs text-zinc-500"
                style={{ borderColor: ZINC800 }}
              >
                <div className="font-medium text-zinc-400 mb-1">Questions about your payouts?</div>
                Contact us at{" "}
                <a
                  href="mailto:contact@sottoventoluxuryride.com"
                  className="underline"
                  style={{ color: GOLD }}
                >
                  contact@sottoventoluxuryride.com
                </a>{" "}
                or call{" "}
                <a href="tel:+14073830647" className="underline" style={{ color: GOLD }}>
                  +1 407-383-0647
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* No driver code state */}
      {!loading && !driverCode && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="text-zinc-500 text-sm mb-4">
            Please access this page from your driver panel.
          </div>
          <Link
            href="/driver"
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: GOLD, color: "#000" }}
          >
            Go to Driver Panel
          </Link>
        </div>
      )}
    </div>
  )
}
