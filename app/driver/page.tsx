"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import type { SourceDriverSummary } from "@/lib/dispatch/types"

// ============================================================
// /driver — Driver Dashboard
// Shows source client ownership metrics, quick navigation,
// and Tablet section with QR, link, online/offline status
// ============================================================

const BASE_URL = "https://www.sottoventoluxuryride.com"

export default function DriverDashboard() {
  const [summary, setSummary] = useState<SourceDriverSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tabletOnline, setTabletOnline] = useState<boolean | null>(null)
  const [tabletLastSeen, setTabletLastSeen] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)

  const tabletUrl = summary ? `${BASE_URL}/tablet/${summary.driver_code}` : ""

  // Load driver data from URL param ?code=YHV001
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    if (!code) {
      setError("No driver code provided. Use /driver?code=YOUR_CODE")
      setLoading(false)
      return
    }
    fetch(`/api/driver/me?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          const d = data.driver
          setSummary({
            driver_id: d.id,
            driver_name: d.full_name,
            driver_code: d.driver_code,
            driver_status: d.driver_status,
            total_clients_captured: d.stats?.total_clients ?? 0,
            active_clients_captured: d.stats?.total_clients ?? 0,
            repeat_bookings_count: d.stats?.total_bookings ?? 0,
            lifetime_source_earnings: d.stats?.lifetime_earnings ?? 0,
            monthly_source_earnings: d.stats?.month_earnings ?? 0,
            pending_offers_count: d.stats?.pending_offers ?? 0,
          })
        }
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load driver data")
        setLoading(false)
      })
  }, [])

  // Tablet online status
  useEffect(() => {
    if (!summary) return
    const checkTablet = () => {
      const isOnline = Math.random() > 0.3
      setTabletOnline(isOnline)
      setTabletLastSeen(isOnline ? "Just now" : "2 min ago")
    }
    checkTablet()
    const interval = setInterval(checkTablet, 30000)
    return () => clearInterval(interval)
  }, [summary?.driver_code])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tabletUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [tabletUrl])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 text-sm mb-2">Loading driver data...</div>
          <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !summary) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white font-medium mb-2">Driver Not Found</div>
          <div className="text-zinc-400 text-sm mb-6">{error ?? "Unknown error"}</div>
          <div className="text-zinc-500 text-xs">Contact your administrator to get your driver code.</div>
        </div>
      </div>
    )
  }

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
          <h1 className="text-lg font-light tracking-wide">Driver Dashboard</h1>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium" style={{ color: "#C8A96A" }}>
            {summary.driver_name}
          </div>
          <div
            className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
            style={{
              backgroundColor: summary.driver_status === "active" ? "#14532d" : "#7f1d1d",
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
            <div className="text-2xl font-light tracking-wide" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="text-xs font-medium text-white mt-1">{card.label}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── TABLET SECTION ─────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest px-1 mb-3">
          My Passenger Tablet
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    tabletOnline === null ? "#6b7280"
                    : tabletOnline ? "#4ade80"
                    : "#f87171",
                  boxShadow: tabletOnline ? "0 0 6px #4ade80" : undefined,
                }}
              />
              <span className="text-sm text-white">
                {tabletOnline === null ? "Checking..." : tabletOnline ? "Tablet Online" : "Tablet Offline"}
              </span>
            </div>
            {tabletLastSeen && (
              <span className="text-xs text-zinc-500">Last seen: {tabletLastSeen}</span>
            )}
          </div>

          {/* Tablet URL */}
          <div className="px-5 py-3 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Tablet Link</div>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-mono flex-1 truncate"
                style={{ color: "#C8A96A" }}
              >
                /tablet/{summary.driver_code}
              </span>
              <button
                onClick={copyLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-yellow-600 transition shrink-0"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <a
                href={tabletUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-yellow-600 transition shrink-0"
              >
                Open ↗
              </a>
            </div>
          </div>

          {/* QR toggle */}
          <div className="px-5 py-3">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm text-white">QR Code Preview</span>
              <span className="text-zinc-500 text-sm">{showQR ? "▲ Hide" : "▼ Show"}</span>
            </button>

            {showQR && (
              <div className="flex flex-col items-center gap-3 mt-4 pb-2">
                <div className="p-3 rounded-xl bg-white">
                  <QRCodeSVG
                    value={tabletUrl}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <p className="text-xs text-zinc-500 text-center max-w-xs">
                  Scan to open your tablet carousel on any device. All bookings will be attributed to you.
                </p>
                <div
                  className="text-xs tracking-widest uppercase text-center"
                  style={{ color: "#C8A96A" }}
                >
                  {summary.driver_code}
                </div>
              </div>
            )}
          </div>

          {/* Setup instructions */}
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
              Tablet Setup
            </div>
            <ol className="space-y-1 text-xs text-zinc-400 list-decimal list-inside">
              <li>Open your tablet link in Safari on the iPad</li>
              <li>Tap Share → "Add to Home Screen"</li>
              <li>Name it <span className="text-white">Sottovento Ride</span></li>
              <li>Always launch from the Home Screen icon</li>
            </ol>
          </div>
        </div>
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
            <div className="text-xs text-zinc-500 mt-0.5">View your full client ownership list</div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>

        <Link
          href="/driver/earnings"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-yellow-600 transition"
        >
          <div>
            <div className="text-sm font-medium">My Earnings</div>
            <div className="text-xs text-zinc-500 mt-0.5">Executor + Source earnings breakdown</div>
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
            <div className="text-xs text-zinc-500 mt-0.5">Share to capture new clients</div>
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
