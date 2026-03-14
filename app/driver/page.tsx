"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { SourceDriverSummary } from "@/lib/dispatch/types"

// ============================================================
// /driver — Driver Dashboard
// Shows source client ownership metrics and quick navigation
// ============================================================

const DEMO_SUMMARY: SourceDriverSummary = {
  driver_id: "demo",
  driver_name: "Angel Bandera",
  driver_code: "DRV001",
  driver_status: "active",
  total_clients_captured: 24,
  active_clients_captured: 18,
  repeat_bookings_count: 31,
  lifetime_source_earnings: 1840.5,
  monthly_source_earnings: 285.0,
  pending_offers_count: 2,
}

export default function DriverDashboard() {
  const [summary, setSummary] = useState<SourceDriverSummary>(DEMO_SUMMARY)
  const [loading, setLoading] = useState(false)

  // In production: fetch from /api/dispatch/source-summary?driver_id=xxx
  // useEffect(() => { fetch(...).then(r => r.json()).then(setSummary) }, [])

  const cards = [
    {
      label: "My Captured Clients",
      value: summary.total_clients_captured,
      sub: "Total clients you brought in",
      icon: "👥",
      color: "#C8A96A",
    },
    {
      label: "My Active Client Base",
      value: summary.active_clients_captured,
      sub: "Active in last 90 days",
      icon: "✅",
      color: "#4ade80",
    },
    {
      label: "My Repeat Clients",
      value: summary.repeat_bookings_count,
      sub: "Repeat bookings from your clients",
      icon: "🔄",
      color: "#60a5fa",
    },
    {
      label: "My Source Earnings (Month)",
      value: `$${summary.monthly_source_earnings.toFixed(2)}`,
      sub: "Source commissions this month",
      icon: "💰",
      color: "#C8A96A",
    },
    {
      label: "Lifetime Source Earnings",
      value: `$${summary.lifetime_source_earnings.toFixed(2)}`,
      sub: "Total earned from your client base",
      icon: "📈",
      color: "#a78bfa",
    },
    {
      label: "Pending Offers",
      value: summary.pending_offers_count,
      sub: "Bookings waiting for your response",
      icon: "⏳",
      color: summary.pending_offers_count > 0 ? "#f87171" : "#6b7280",
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
            Sottovento Network
          </div>
          <h1 className="text-lg font-light tracking-wide">
            Driver Dashboard
          </h1>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium" style={{ color: "#C8A96A" }}>
            {summary.driver_name}
          </div>
          <div
            className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
            style={{
              backgroundColor:
                summary.driver_status === "active" ? "#14532d" : "#7f1d1d",
              color: summary.driver_status === "active" ? "#4ade80" : "#f87171",
            }}
          >
            {summary.driver_status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="px-4 py-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="text-2xl mb-1">{card.icon}</div>
            <div
              className="text-2xl font-light tracking-wide"
              style={{ color: card.color }}
            >
              {card.value}
            </div>
            <div className="text-xs font-medium text-white mt-1">{card.label}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-6 space-y-3">
        <div className="text-xs text-zinc-500 uppercase tracking-widest px-1 mb-2">
          Quick Access
        </div>

        <Link
          href="/driver/source-clients"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-yellow-600 transition"
        >
          <div>
            <div className="text-sm font-medium">My Captured Clients</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              View your full client ownership list
            </div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>

        <Link
          href="/driver/earnings"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-yellow-600 transition"
        >
          <div>
            <div className="text-sm font-medium">My Earnings</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Executor + Source earnings breakdown
            </div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>

        <Link
          href={`/?ref=${summary.driver_code}`}
          target="_blank"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-yellow-600 transition"
        >
          <div>
            <div className="text-sm font-medium">My Referral Link</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Share to capture new clients
            </div>
          </div>
          <span style={{ color: "#C8A96A" }}>↗</span>
        </Link>
      </div>

      {/* Attribution info */}
      <div className="mx-4 mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          How Source Ownership Works
        </div>
        <div className="space-y-2 text-xs text-zinc-400">
          <p>
            Every client you bring in through your QR code, referral link, or
            tablet is permanently attributed to you.
          </p>
          <p>
            When they book again, you get the{" "}
            <span style={{ color: "#C8A96A" }}>first offer</span> — and earn a{" "}
            <span style={{ color: "#C8A96A" }}>15% source commission</span> even
            if another driver executes the ride.
          </p>
        </div>
      </div>
    </div>
  )
}
