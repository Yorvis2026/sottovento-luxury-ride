"use client"

import { useState } from "react"
import Link from "next/link"

// ============================================================
// /driver/earnings
// Split view: Executor Earnings vs Source Earnings
// ============================================================

interface EarningEntry {
  id: string
  date: string
  client_name: string
  route: string
  type: "executor" | "source"
  amount: number
  pct: number
  booking_total: number
  status: "confirmed" | "paid" | "pending"
}

// Demo data — replace with API call to /api/dispatch/source-summary (POST)
const DEMO_ENTRIES: EarningEntry[] = [
  {
    id: "1",
    date: "2026-03-10",
    client_name: "Sarah Johnson",
    route: "MCO → Disney",
    type: "executor",
    amount: 61.75,
    pct: 65,
    booking_total: 95,
    status: "confirmed",
  },
  {
    id: "2",
    date: "2026-03-08",
    client_name: "Michael Torres",
    route: "MCO → Port Canaveral",
    type: "source",
    amount: 21.75,
    pct: 15,
    booking_total: 145,
    status: "confirmed",
  },
  {
    id: "3",
    date: "2026-03-05",
    client_name: "Carlos Rivera",
    route: "Disney → Tampa",
    type: "source",
    amount: 36.0,
    pct: 15,
    booking_total: 240,
    status: "paid",
  },
  {
    id: "4",
    date: "2026-03-03",
    client_name: "Emma Williams",
    route: "Hourly — 3 hrs",
    type: "executor",
    amount: 185.25,
    pct: 65,
    booking_total: 285,
    status: "paid",
  },
  {
    id: "5",
    date: "2026-02-28",
    client_name: "Priya Patel",
    route: "MCO → Miami",
    type: "source",
    amount: 91.5,
    pct: 15,
    booking_total: 610,
    status: "paid",
  },
  {
    id: "6",
    date: "2026-02-22",
    client_name: "David Kim",
    route: "Universal → Downtown",
    type: "executor",
    amount: 42.25,
    pct: 65,
    booking_total: 65,
    status: "paid",
  },
]

const MONTHS = ["2026-03", "2026-02", "2026-01", "2025-12"]

const STATUS_STYLES = {
  confirmed: { bg: "#1e3a5f", text: "#60a5fa" },
  paid:      { bg: "#14532d", text: "#4ade80" },
  pending:   { bg: "#3f3f46", text: "#a1a1aa" },
}

export default function EarningsPage() {
  const [selectedMonth, setSelectedMonth] = useState("2026-03")
  const [activeTab, setActiveTab] = useState<"all" | "executor" | "source">("all")

  const filtered = DEMO_ENTRIES.filter((e) => {
    const matchMonth = e.date.startsWith(selectedMonth)
    const matchTab = activeTab === "all" || e.type === activeTab
    return matchMonth && matchTab
  })

  const executorTotal = DEMO_ENTRIES.filter(
    (e) => e.type === "executor" && e.date.startsWith(selectedMonth)
  ).reduce((s, e) => s + e.amount, 0)

  const sourceTotal = DEMO_ENTRIES.filter(
    (e) => e.type === "source" && e.date.startsWith(selectedMonth)
  ).reduce((s, e) => s + e.amount, 0)

  const grandTotal = executorTotal + sourceTotal

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
        <Link href="/driver" className="text-zinc-400 hover:text-white transition">
          ←
        </Link>
        <div>
          <h1 className="text-base font-medium">My Earnings</h1>
          <p className="text-xs text-zinc-500">Executor + Source commission breakdown</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-zinc-800">
        {MONTHS.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedMonth === m
                ? "text-black"
                : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
            style={selectedMonth === m ? { backgroundColor: "#C8A96A" } : {}}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 border-b border-zinc-800">
        <div className="px-4 py-4 text-center border-r border-zinc-800">
          <div className="text-xs text-zinc-500 mb-1">Executor</div>
          <div className="text-xl font-light" style={{ color: "#60a5fa" }}>
            ${executorTotal.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">65% of rides</div>
        </div>
        <div className="px-4 py-4 text-center border-r border-zinc-800">
          <div className="text-xs text-zinc-500 mb-1">Source</div>
          <div className="text-xl font-light" style={{ color: "#C8A96A" }}>
            ${sourceTotal.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">15% of clients</div>
        </div>
        <div className="px-4 py-4 text-center">
          <div className="text-xs text-zinc-500 mb-1">Total</div>
          <div className="text-xl font-light text-white">
            ${grandTotal.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">Combined</div>
        </div>
      </div>

      {/* Visual split bar */}
      {grandTotal > 0 && (
        <div className="px-4 py-3">
          <div className="flex rounded-full overflow-hidden h-2">
            <div
              style={{
                width: `${(executorTotal / grandTotal) * 100}%`,
                backgroundColor: "#60a5fa",
              }}
            />
            <div
              style={{
                width: `${(sourceTotal / grandTotal) * 100}%`,
                backgroundColor: "#C8A96A",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span style={{ color: "#60a5fa" }}>
              Executor {((executorTotal / grandTotal) * 100).toFixed(0)}%
            </span>
            <span style={{ color: "#C8A96A" }}>
              Source {((sourceTotal / grandTotal) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Tab filter */}
      <div className="px-4 py-2 flex gap-2 border-b border-zinc-800">
        {(["all", "executor", "source"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === tab
                ? "text-black"
                : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
            style={activeTab === tab ? { backgroundColor: "#C8A96A" } : {}}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Earnings list */}
      <div className="px-4 py-4 space-y-3 pb-10">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 text-sm">
            No earnings for this period.
          </div>
        ) : (
          filtered.map((entry) => {
            const statusStyle = STATUS_STYLES[entry.status]
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">{entry.client_name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{entry.route}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-base font-light"
                      style={{
                        color: entry.type === "executor" ? "#60a5fa" : "#C8A96A",
                      }}
                    >
                      +${entry.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-500">{entry.pct}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          entry.type === "executor" ? "#1e3a5f" : "#3b2a0e",
                        color:
                          entry.type === "executor" ? "#60a5fa" : "#C8A96A",
                      }}
                    >
                      {entry.type === "executor" ? "Executor" : "Source"}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                      }}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">{entry.date}</div>
                </div>

                <div className="mt-2 text-xs text-zinc-600">
                  Booking total: ${entry.booking_total}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Commission explanation */}
      <div className="mx-4 mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          Commission Structure
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-lg font-light" style={{ color: "#60a5fa" }}>65%</div>
            <div className="text-zinc-400">Executor</div>
            <div className="text-zinc-600">Driver who runs the ride</div>
          </div>
          <div>
            <div className="text-lg font-light" style={{ color: "#C8A96A" }}>15%</div>
            <div className="text-zinc-400">Source</div>
            <div className="text-zinc-600">Driver who captured the client</div>
          </div>
          <div>
            <div className="text-lg font-light text-zinc-400">20%</div>
            <div className="text-zinc-400">Platform</div>
            <div className="text-zinc-600">Sottovento Network</div>
          </div>
        </div>
      </div>
    </div>
  )
}
