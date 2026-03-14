"use client"

import { useState } from "react"
import Link from "next/link"

// ============================================================
// /driver/source-clients
// Table of all clients attributed to this driver
// ============================================================

type ClientStatus = "active" | "inactive" | "new"

interface SourceClient {
  id: string
  client_name: string
  first_booking_date: string
  last_booking_date: string
  total_bookings: number
  total_source_earnings: number
  current_status: ClientStatus
  last_service_type: string
}

// Demo data — replace with API call
const DEMO_CLIENTS: SourceClient[] = [
  {
    id: "1",
    client_name: "Michael Torres",
    first_booking_date: "2025-08-14",
    last_booking_date: "2026-02-28",
    total_bookings: 5,
    total_source_earnings: 142.5,
    current_status: "active",
    last_service_type: "Airport Transfer",
  },
  {
    id: "2",
    client_name: "Sarah Johnson",
    first_booking_date: "2025-10-02",
    last_booking_date: "2026-03-10",
    total_bookings: 3,
    total_source_earnings: 85.5,
    current_status: "active",
    last_service_type: "Round Trip",
  },
  {
    id: "3",
    client_name: "David Kim",
    first_booking_date: "2025-11-19",
    last_booking_date: "2025-12-30",
    total_bookings: 2,
    total_source_earnings: 57.0,
    current_status: "inactive",
    last_service_type: "One Way Transfer",
  },
  {
    id: "4",
    client_name: "Emma Williams",
    first_booking_date: "2026-01-05",
    last_booking_date: "2026-01-05",
    total_bookings: 1,
    total_source_earnings: 19.0,
    current_status: "new",
    last_service_type: "Hourly Chauffeur",
  },
  {
    id: "5",
    client_name: "Carlos Rivera",
    first_booking_date: "2025-09-22",
    last_booking_date: "2026-03-01",
    total_bookings: 7,
    total_source_earnings: 199.75,
    current_status: "active",
    last_service_type: "Corporate Transfer",
  },
  {
    id: "6",
    client_name: "Priya Patel",
    first_booking_date: "2025-12-10",
    last_booking_date: "2026-02-14",
    total_bookings: 4,
    total_source_earnings: 114.0,
    current_status: "active",
    last_service_type: "Airport Transfer",
  },
]

const STATUS_STYLES: Record<ClientStatus, { bg: string; text: string; label: string }> = {
  active:   { bg: "#14532d", text: "#4ade80", label: "Active" },
  inactive: { bg: "#3f3f46", text: "#a1a1aa", label: "Inactive" },
  new:      { bg: "#1e3a5f", text: "#60a5fa", label: "New" },
}

export default function SourceClientsPage() {
  const [filter, setFilter] = useState<"all" | ClientStatus>("all")
  const [search, setSearch] = useState("")

  const filtered = DEMO_CLIENTS.filter((c) => {
    const matchStatus = filter === "all" || c.current_status === filter
    const matchSearch =
      search === "" ||
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.last_service_type.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalEarnings = filtered.reduce((sum, c) => sum + c.total_source_earnings, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
        <Link href="/driver" className="text-zinc-400 hover:text-white transition">
          ←
        </Link>
        <div>
          <h1 className="text-base font-medium">My Captured Clients</h1>
          <p className="text-xs text-zinc-500">
            {DEMO_CLIENTS.length} clients · Lifetime source earnings
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 border-b border-zinc-800">
        {[
          { label: "Total Clients", value: DEMO_CLIENTS.length },
          {
            label: "Active",
            value: DEMO_CLIENTS.filter((c) => c.current_status === "active").length,
          },
          {
            label: "Source Earned",
            value: `$${DEMO_CLIENTS.reduce((s, c) => s + c.total_source_earnings, 0).toFixed(2)}`,
          },
        ].map((stat) => (
          <div key={stat.label} className="px-4 py-3 text-center">
            <div
              className="text-xl font-light"
              style={{ color: "#C8A96A" }}
            >
              {stat.value}
            </div>
            <div className="text-xs text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {(["all", "active", "inactive", "new"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f
                ? "text-black"
                : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
            style={filter === f ? { backgroundColor: "#C8A96A" } : {}}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-full text-xs bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-600 w-32"
        />
      </div>

      {/* Client list */}
      <div className="px-4 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 text-sm">
            No clients found.
          </div>
        ) : (
          filtered.map((client) => {
            const statusStyle = STATUS_STYLES[client.current_status]
            return (
              <div
                key={client.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">{client.client_name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {client.last_service_type}
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-3">
                  <div>
                    <span className="text-zinc-500">First booking</span>
                    <div className="text-white">{client.first_booking_date}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">Last booking</span>
                    <div className="text-white">{client.last_booking_date}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">Total bookings</span>
                    <div className="text-white">{client.total_bookings}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">Source earned</span>
                    <div style={{ color: "#C8A96A" }}>
                      ${client.total_source_earnings.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
