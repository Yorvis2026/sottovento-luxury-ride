"use client"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"

const GOLD = "#c9a84c"

interface CapturedClient {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  source_type: string
  total_bookings: number
  total_revenue: number
  first_booking_at: string | null
  last_booking_at: string | null
  created_at: string
}

interface ClientsData {
  driver_code: string
  driver_name: string
  total_clients: number
  clients: CapturedClient[]
}

const SOURCE_LABELS: Record<string, string> = {
  tablet: "Tablet",
  qr: "QR Code",
  referral: "Referral Link",
  booking: "Direct Booking",
  direct: "Direct",
}

const SOURCE_COLORS: Record<string, string> = {
  tablet: "#6366f1",
  qr: "#10b981",
  referral: GOLD,
  booking: "#3b82f6",
  direct: "#6b7280",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function CapturedClientsPage() {
  const params = useParams()
  const router = useRouter()
  const driverCode = (params?.driver_code as string ?? "").toUpperCase()

  const [data, setData] = useState<ClientsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")

  const loadData = useCallback(async () => {
    if (!driverCode) return
    try {
      const res = await fetch(`/api/driver/captured-clients?driver_code=${driverCode}&_t=${Date.now()}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e?.message ?? "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [driverCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = (data?.clients ?? []).filter((c) => {
    const matchSearch =
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || c.source_type === filter
    return matchSearch && matchFilter
  })

  const totalRevenue = (data?.clients ?? []).reduce((s, c) => s + c.total_revenue, 0)
  const totalBookings = (data?.clients ?? []).reduce((s, c) => s + c.total_bookings, 0)

  return (
    <div
      className="min-h-screen bg-black text-white"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-lg"
        >
          ←
        </button>
        <div>
          <div className="text-sm font-semibold">My Captured Clients</div>
          <div className="text-xs text-zinc-500">{driverCode}</div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
          Loading clients...
        </div>
      )}

      {error && (
        <div className="mx-4 mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 px-4 mt-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
              <div className="text-xl font-light" style={{ color: GOLD }}>{data.total_clients}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Clients</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
              <div className="text-xl font-light text-blue-400">{totalBookings}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Bookings</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
              <div className="text-xl font-light text-emerald-400">${totalRevenue.toFixed(0)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Revenue</div>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 mt-4">
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
            {["all", "tablet", "qr", "referral", "booking", "direct"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition"
                style={
                  filter === f
                    ? { background: GOLD, borderColor: GOLD, color: "#000" }
                    : { background: "transparent", borderColor: "#3f3f46", color: "#a1a1aa" }
                }
              >
                {f === "all" ? "All" : SOURCE_LABELS[f] ?? f}
              </button>
            ))}
          </div>

          {/* Client list */}
          <div className="px-4 mt-4 pb-10 space-y-3">
            {filtered.length === 0 && (
              <div className="text-center text-zinc-600 text-sm py-12">
                {data.total_clients === 0
                  ? "No captured clients yet. Share your referral link to start building your client base."
                  : "No clients match your search."}
              </div>
            )}
            {filtered.map((client) => (
              <div
                key={client.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                {/* Name + source badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{client.full_name}</div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: `${SOURCE_COLORS[client.source_type] ?? "#6b7280"}22`,
                      color: SOURCE_COLORS[client.source_type] ?? "#6b7280",
                      border: `1px solid ${SOURCE_COLORS[client.source_type] ?? "#6b7280"}44`,
                    }}
                  >
                    {SOURCE_LABELS[client.source_type] ?? client.source_type}
                  </span>
                </div>

                {/* Contact */}
                <div className="mt-2 space-y-1">
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: GOLD }}
                    >
                      <span>📞</span> {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-2 text-xs text-zinc-400"
                    >
                      <span>✉️</span> {client.email}
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-zinc-800/60 py-2">
                    <div className="text-sm font-medium">{client.total_bookings}</div>
                    <div className="text-xs text-zinc-500">Rides</div>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 py-2">
                    <div className="text-sm font-medium text-emerald-400">
                      ${client.total_revenue.toFixed(0)}
                    </div>
                    <div className="text-xs text-zinc-500">Revenue</div>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 py-2">
                    <div className="text-xs font-medium text-zinc-300">{formatDate(client.last_booking_at)}</div>
                    <div className="text-xs text-zinc-500">Last ride</div>
                  </div>
                </div>

                {/* First captured */}
                <div className="mt-2 text-xs text-zinc-600">
                  Captured {formatDate(client.created_at)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
