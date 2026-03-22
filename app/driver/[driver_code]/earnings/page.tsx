"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

const GOLD = "#C8A96A"

type Lang = "en" | "es" | "ht"

interface EarningsData {
  driver_name: string
  driver_code: string
  week_earnings: number
  month_earnings: number
  total_earnings: number
  vs_last_week: number | null
  vs_last_month: number | null
  source_breakdown: {
    captured_clients: number
    sln_network: number
    admin_dispatch: number
  }
  monthly_chart: { month: string; earnings: number }[]
  captured_clients_count: number
  captured_clients_revenue: number
  available_balance: number
  pending_balance: number
  best_week: number
  best_month: number
  ride_detail: {
    booking_id: string
    pickup_location: string
    dropoff_location: string
    pickup_datetime: string | null
    total_fare: number
    vehicle_type: string
    client_name: string | null
    sln_commission: number
    driver_net: number
    role: string
    payout_status: string
    date: string
  }[]
  payout_history: { date: string; amount: number; status: string }[]
  stripe_connect: {
    connected: boolean
    payout_method: string | null
    next_payout_date: string | null
    payout_schedule: string
  }
}

const T = {
  en: {
    title: "My Earnings",
    week: "This Week",
    month: "This Month",
    lifetime: "Lifetime",
    vsLastWeek: "vs last week",
    vsLastMonth: "vs last month",
    sourceBreakdown: "Earnings by Source",
    capturedClients: "Captured clients",
    slnNetwork: "SLN network",
    adminDispatch: "Admin dispatch",
    monthlyChart: "Monthly Earnings",
    clientImpact: "Captured Client Impact",
    clientsCaptured: "Clients captured",
    revenueGenerated: "Revenue generated",
    payoutDashboard: "Payout Dashboard",
    available: "Available",
    pending: "Pending",
    nextPayout: "Next payout",
    payoutSchedule: "Schedule",
    weekly: "Weekly",
    paymentMethod: "Payment Method",
    editMethod: "Edit payment method",
    noMethod: "No payout method connected",
    connectStripe: "Connect Stripe account",
    payoutHistory: "Payout History",
    noPayouts: "No payouts yet",
    rideDetail: "Ride Earnings Detail",
    totalFare: "Total fare",
    slnFee: "SLN fee",
    driverNet: "Your earnings",
    bestStats: "Personal Records",
    bestWeek: "Best week",
    bestMonth: "Best month",
    clientsGenerated: "Your clients generated",
    back: "← Back",
    noRides: "No completed rides yet",
  },
  es: {
    title: "Mis Ganancias",
    week: "Esta Semana",
    month: "Este Mes",
    lifetime: "Total",
    vsLastWeek: "vs semana pasada",
    vsLastMonth: "vs mes pasado",
    sourceBreakdown: "Ganancias por Fuente",
    capturedClients: "Clientes propios",
    slnNetwork: "Red SLN",
    adminDispatch: "Despacho admin",
    monthlyChart: "Ganancias Mensuales",
    clientImpact: "Impacto de Clientes Captados",
    clientsCaptured: "Clientes captados",
    revenueGenerated: "Ingresos generados",
    payoutDashboard: "Panel de Pagos",
    available: "Disponible",
    pending: "Pendiente",
    nextPayout: "Próximo pago",
    payoutSchedule: "Frecuencia",
    weekly: "Semanal",
    paymentMethod: "Método de Pago",
    editMethod: "Editar método de pago",
    noMethod: "Sin método de pago conectado",
    connectStripe: "Conectar cuenta Stripe",
    payoutHistory: "Historial de Pagos",
    noPayouts: "Sin pagos aún",
    rideDetail: "Detalle por Viaje",
    totalFare: "Tarifa total",
    slnFee: "Comisión SLN",
    driverNet: "Tus ganancias",
    bestStats: "Récords Personales",
    bestWeek: "Mejor semana",
    bestMonth: "Mejor mes",
    clientsGenerated: "Tus clientes generaron",
    back: "← Volver",
    noRides: "Sin viajes completados aún",
  },
  ht: {
    title: "Lajan Mwen",
    week: "Semèn Sa",
    month: "Mwa Sa",
    lifetime: "Total",
    vsLastWeek: "vs semèn pase",
    vsLastMonth: "vs mwa pase",
    sourceBreakdown: "Lajan pa Sous",
    capturedClients: "Kliyan mwen",
    slnNetwork: "Rezo SLN",
    adminDispatch: "Admin dispatch",
    monthlyChart: "Lajan Chak Mwa",
    clientImpact: "Enpak Kliyan Kaptire",
    clientsCaptured: "Kliyan kaptire",
    revenueGenerated: "Revni jenere",
    payoutDashboard: "Peman Dashboard",
    available: "Disponib",
    pending: "Annatant",
    nextPayout: "Pwochen peman",
    payoutSchedule: "Orè",
    weekly: "Chak semèn",
    paymentMethod: "Metòd Peman",
    editMethod: "Chanje metòd peman",
    noMethod: "Pa gen metòd peman konekte",
    connectStripe: "Konekte kont Stripe",
    payoutHistory: "Istwa Peman",
    noPayouts: "Pa gen peman ankò",
    rideDetail: "Detay pa Vwayaj",
    totalFare: "Tarif total",
    slnFee: "Komisyon SLN",
    driverNet: "Lajan ou",
    bestStats: "Rekò Pèsonèl",
    bestWeek: "Pi bon semèn",
    bestMonth: "Pi bon mwa",
    clientsGenerated: "Kliyan ou yo jenere",
    back: "← Retounen",
    noRides: "Pa gen vwayaj fèt ankò",
  },
}

function ComparisonBadge({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return null
  const isPos = pct >= 0
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-xs" style={{ color: isPos ? "#4ade80" : "#f87171" }}>
        {isPos ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
      </span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 rounded-full bg-zinc-800 mt-1.5">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default function EarningsPage() {
  const params = useParams()
  const router = useRouter()
  const driverCode = params?.driver_code as string | undefined
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>("es")
  const [expandedRide, setExpandedRide] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"overview" | "rides" | "payouts">("overview")

  useEffect(() => {
    if (!driverCode) return
    try {
      const saved = localStorage.getItem("sottovento_lang") as Lang | null
      if (saved && ["en", "es", "ht"].includes(saved)) setLang(saved)
    } catch {}
    fetch(`/api/driver/earnings?driver_code=${driverCode}&_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [driverCode])

  const t = T[lang]

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!data || (data as { error?: string }).error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-400 text-sm">Could not load earnings data.</div>
        <button onClick={() => router.back()} className="text-sm" style={{ color: GOLD }}>{t.back}</button>
      </div>
    )
  }

  const maxChart = Math.max(...data.monthly_chart.map(m => m.earnings), 1)
  const sourceTotal = data.source_breakdown.captured_clients + data.source_breakdown.sln_network + data.source_breakdown.admin_dispatch

  const payoutStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
    pending:   { bg: "#2a1f00", text: "#f59e0b", label: lang === "es" ? "Pendiente" : "Pending" },
    confirmed: { bg: "#0a2a1a", text: "#4ade80", label: lang === "es" ? "Confirmado" : "Confirmed" },
    paid:      { bg: "#0a2a1a", text: "#4ade80", label: lang === "es" ? "Transferido" : "Transferred" },
    disputed:  { bg: "#2a0a0a", text: "#f87171", label: lang === "es" ? "Disputado" : "Disputed" },
  }

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm" style={{ color: GOLD }}>{t.back}</button>
        <div className="text-sm font-medium">{t.title}</div>
        <div className="flex gap-1">
          {(["en", "es", "ht"] as Lang[]).map(l => (
            <button key={l} onClick={() => { setLang(l); try { localStorage.setItem("sottovento_lang", l) } catch {} }}
              className={`text-xs px-2 py-1 rounded-full border transition ${lang === l ? "text-black border-transparent" : "border-zinc-700 text-zinc-400"}`}
              style={lang === l ? { backgroundColor: GOLD } : {}}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Driver name */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs text-zinc-500">{data.driver_code}</div>
        <div className="text-lg font-light">{data.driver_name}</div>
      </div>

      {/* Section tabs */}
      <div className="px-4 flex gap-2 mb-4">
        {(["overview", "rides", "payouts"] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${activeSection === s ? "text-black border-transparent" : "border-zinc-700 text-zinc-400"}`}
            style={activeSection === s ? { backgroundColor: GOLD } : {}}>
            {s === "overview" ? (lang === "es" ? "Resumen" : "Overview") : s === "rides" ? (lang === "es" ? "Viajes" : "Rides") : (lang === "es" ? "Pagos" : "Payouts")}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW SECTION ── */}
      {activeSection === "overview" && (
        <div className="space-y-4 px-4">

          {/* LAYER A — Quick summary tiles */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xs text-zinc-500 mb-1">{t.week}</div>
              <div className="text-lg font-light" style={{ color: "#60a5fa" }}>${data.week_earnings.toFixed(0)}</div>
              <ComparisonBadge pct={data.vs_last_week} label={t.vsLastWeek} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xs text-zinc-500 mb-1">{t.month}</div>
              <div className="text-lg font-light" style={{ color: GOLD }}>${data.month_earnings.toFixed(0)}</div>
              <ComparisonBadge pct={data.vs_last_month} label={t.vsLastMonth} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="text-xs text-zinc-500 mb-1">{t.lifetime}</div>
              <div className="text-lg font-light" style={{ color: "#a78bfa" }}>${data.total_earnings.toFixed(0)}</div>
            </div>
          </div>

          {/* LAYER B — Period comparison already in tiles above */}

          {/* LAYER C — Earnings source breakdown */}
          {sourceTotal > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.sourceBreakdown}</div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: GOLD }}>{t.capturedClients}</span>
                    <span className="font-medium text-white">${data.source_breakdown.captured_clients.toFixed(2)}</span>
                  </div>
                  <MiniBar value={data.source_breakdown.captured_clients} max={sourceTotal} color={GOLD} />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#60a5fa" }}>{t.slnNetwork}</span>
                    <span className="font-medium text-white">${data.source_breakdown.sln_network.toFixed(2)}</span>
                  </div>
                  <MiniBar value={data.source_breakdown.sln_network} max={sourceTotal} color="#60a5fa" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">{t.adminDispatch}</span>
                    <span className="font-medium text-white">${data.source_breakdown.admin_dispatch.toFixed(2)}</span>
                  </div>
                  <MiniBar value={data.source_breakdown.admin_dispatch} max={sourceTotal} color="#a78bfa" />
                </div>
              </div>
            </div>
          )}

          {/* LAYER D — Monthly chart */}
          {data.monthly_chart.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.monthlyChart}</div>
              <div className="flex items-end gap-2 h-24">
                {data.monthly_chart.map((m, i) => {
                  const h = maxChart > 0 ? Math.max((m.earnings / maxChart) * 100, 4) : 4
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs text-zinc-500">${m.earnings > 0 ? m.earnings.toFixed(0) : ""}</div>
                      <div className="w-full rounded-t-sm" style={{ height: `${h}%`, backgroundColor: GOLD, opacity: 0.8 }} />
                      <div className="text-xs text-zinc-600">{m.month}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* LAYER E — Captured client impact */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.clientImpact}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-light" style={{ color: GOLD }}>{data.captured_clients_count}</div>
                <div className="text-xs text-zinc-400 mt-1">{t.clientsCaptured}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light" style={{ color: "#4ade80" }}>${data.captured_clients_revenue.toFixed(0)}</div>
                <div className="text-xs text-zinc-400 mt-1">{t.revenueGenerated}</div>
              </div>
            </div>
            <Link href={`/driver/${driverCode}/source-clients`}
              className="mt-3 flex items-center justify-center gap-1 text-xs py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition">
              {lang === "es" ? "Ver mis clientes →" : "View my clients →"}
            </Link>
          </div>

          {/* LAYER G — Psychological engagement / personal records */}
          {(data.best_week > 0 || data.best_month > 0) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.bestStats}</div>
              <div className="grid grid-cols-2 gap-3">
                {data.best_week > 0 && (
                  <div className="text-center">
                    <div className="text-xl font-light" style={{ color: "#f59e0b" }}>${data.best_week.toFixed(0)}</div>
                    <div className="text-xs text-zinc-400 mt-1">{t.bestWeek}</div>
                  </div>
                )}
                {data.best_month > 0 && (
                  <div className="text-center">
                    <div className="text-xl font-light" style={{ color: "#a78bfa" }}>${data.best_month.toFixed(0)}</div>
                    <div className="text-xs text-zinc-400 mt-1">{t.bestMonth}</div>
                  </div>
                )}
              </div>
              {data.captured_clients_revenue > 0 && (
                <div className="mt-3 text-center text-xs text-zinc-400">
                  {t.clientsGenerated}: <span className="font-medium" style={{ color: GOLD }}>${data.captured_clients_revenue.toFixed(0)}</span>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── RIDES SECTION ── */}
      {activeSection === "rides" && (
        <div className="px-4 space-y-3">
          {data.ride_detail.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">{t.noRides}</div>
          ) : (
            data.ride_detail.map((ride) => {
              const isExpanded = expandedRide === ride.booking_id
              const ps = payoutStatusStyle[ride.payout_status] ?? payoutStatusStyle.pending
              const pickupDate = ride.pickup_datetime
                ? new Date(ride.pickup_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"
              return (
                <div key={ride.booking_id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <button onClick={() => setExpandedRide(isExpanded ? null : ride.booking_id)}
                    className="w-full px-4 py-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{ride.pickup_location}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">→ {ride.dropoff_location}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-bold" style={{ color: "#4ade80" }}>+${ride.driver_net.toFixed(0)}</div>
                        <div className="text-xs mt-0.5" style={{ color: ps.text }}>{ps.label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-zinc-500">{pickupDate}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{ride.vehicle_type}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: ride.role === "executor" ? "#1e3a5f" : ride.role === "source" ? "#2a1f00" : "#1a1a2e", color: ride.role === "executor" ? "#60a5fa" : ride.role === "source" ? GOLD : "#a78bfa" }}>
                        {ride.role === "both" ? "Exec+Source" : ride.role}
                      </span>
                      <span className="text-xs text-zinc-500 ml-auto">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                      {ride.client_name && (
                        <div className="text-xs text-zinc-400 mb-2">{lang === "es" ? "Cliente" : "Client"}: <span className="text-white">{ride.client_name}</span></div>
                      )}
                      <div className="border border-zinc-700 rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{t.totalFare}</span>
                          <span className="text-white">${ride.total_fare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{t.slnFee}</span>
                          <span className="text-red-400">−${ride.sln_commission.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-zinc-700 pt-1.5">
                          <span className="font-medium" style={{ color: GOLD }}>{t.driverNet}</span>
                          <span className="font-bold" style={{ color: "#4ade80" }}>${ride.driver_net.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 rounded-lg px-3 py-2 bg-zinc-800">
                        <span className="text-xs text-zinc-400">{lang === "es" ? "Estado" : "Status"}</span>
                        <span className="text-xs font-medium" style={{ color: ps.text }}>{ps.label}</span>
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-xs text-zinc-600 font-mono">{ride.booking_id.slice(0, 12)}…</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── PAYOUTS SECTION ── */}
      {activeSection === "payouts" && (
        <div className="px-4 space-y-4">

          {/* LAYER F — Payout dashboard */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.payoutDashboard}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-light" style={{ color: "#4ade80" }}>${data.available_balance.toFixed(2)}</div>
                <div className="text-xs text-zinc-400 mt-1">{t.available}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-light" style={{ color: "#f59e0b" }}>${data.pending_balance.toFixed(2)}</div>
                <div className="text-xs text-zinc-400 mt-1">{t.pending}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs border-t border-zinc-800 pt-3">
              <span className="text-zinc-500">{t.payoutSchedule}</span>
              <span className="text-white">{t.weekly}</span>
            </div>
            {data.stripe_connect.next_payout_date && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-zinc-500">{t.nextPayout}</span>
                <span className="text-white">{data.stripe_connect.next_payout_date}</span>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.paymentMethod}</div>
            {data.stripe_connect.connected && data.stripe_connect.payout_method ? (
              <div className="flex items-center justify-between">
                <div className="text-sm text-white">{data.stripe_connect.payout_method}</div>
                <button className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition">
                  {t.editMethod}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-zinc-500">{t.noMethod}</div>
                <button className="w-full py-2.5 rounded-lg text-sm font-medium text-black transition"
                  style={{ backgroundColor: GOLD }}>
                  {t.connectStripe}
                </button>
                <div className="text-xs text-zinc-600 text-center">
                  {lang === "es" ? "Conecta tu cuenta bancaria o tarjeta de débito para recibir pagos automáticos." : "Connect your bank account or debit card to receive automatic payouts."}
                </div>
              </div>
            )}
          </div>

          {/* Payout history */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">{t.payoutHistory}</div>
            {data.payout_history.length === 0 ? (
              <div className="text-sm text-zinc-500 text-center py-4">{t.noPayouts}</div>
            ) : (
              <div className="space-y-2">
                {data.payout_history.map((p, i) => {
                  const ps = payoutStatusStyle[p.status] ?? payoutStatusStyle.pending
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-xs text-zinc-400">{p.date}</span>
                      <span className="text-sm font-medium text-white">${p.amount.toFixed(2)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: ps.bg, color: ps.text }}>{ps.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Commission structure reference */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
              {lang === "es" ? "Estructura de Comisiones" : "Commission Structure"}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-xl font-light" style={{ color: "#60a5fa" }}>65%</div>
                <div className="text-zinc-400">{lang === "es" ? "Ejecutor" : "Executor"}</div>
                <div className="text-zinc-600 text-xs mt-0.5">{lang === "es" ? "Conductor del viaje" : "Driver who runs ride"}</div>
              </div>
              <div>
                <div className="text-xl font-light" style={{ color: GOLD }}>15%</div>
                <div className="text-zinc-400">{lang === "es" ? "Fuente" : "Source"}</div>
                <div className="text-zinc-600 text-xs mt-0.5">{lang === "es" ? "Captó el cliente" : "Captured the client"}</div>
              </div>
              <div>
                <div className="text-xl font-light text-zinc-400">20%</div>
                <div className="text-zinc-400">{lang === "es" ? "Plataforma" : "Platform"}</div>
                <div className="text-zinc-600 text-xs mt-0.5">Sottovento Network</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
