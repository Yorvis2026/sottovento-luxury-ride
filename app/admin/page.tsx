"use client"
import { useState, useEffect, useCallback } from "react"

// ============================================================
// /admin — Sottovento Luxury Network (SLN) Admin Panel
// 9 Modules: Dashboard, Bookings, Dispatch, Drivers,
//            Companies, Leads, Crown Moment, Finance, Settings
// ============================================================

const ADMIN_PASSWORD = "Sottovento.20"
const BASE_URL = "https://www.sottoventoluxuryride.com"

type Tab = "dashboard" | "bookings" | "dispatch" | "drivers" | "companies" | "leads" | "crown" | "finance" | "settings" | "sms"

// ---- TYPES ----
type Driver = {
  id: string; driver_code: string; full_name: string; phone: string; email: string; driver_status: string; is_eligible: boolean; created_at: string;
}
type Booking = {
  id: string; pickup_zone: string; dropoff_zone: string; pickup_address: string; dropoff_address: string; pickup_at: string; vehicle_type: string; total_price: number; status: string; payment_status: string; created_at: string; client_name?: string; client_phone?: string; assigned_driver_id?: string; driver_name?: string;
}
type Lead = {
  id: string; lead_source: string; full_name: string; phone: string; email: string; interested_package: string; status: string; driver_code: string; tablet_code: string; created_at: string; driver_name?: string;
}
type DashboardData = {
  today: { count: number; revenue: number };
  week: { count: number; revenue: number };
  month: { count: number; revenue: number };
  activeDrivers: number;
  totalLeads: number;
  leadsBySource: { lead_source: string; count: number }[];
  bookingStatuses: { status: string; count: number }[];
  recentBookings: Booking[];
}
type FinanceData = {
  totalRevenue: number;
  monthRevenue: number;
  commissions: { totalDriverEarnings: number; totalSourceEarnings: number; totalPlatformEarnings: number; totalCommissions: number; count: number };
  topDrivers: { full_name: string; driver_code: string; executor_earnings: number; source_earnings: number; rides: number }[];
  recentCommissions: { id: string; booking_id: string; executor_amount: number; source_amount: number; platform_amount: number; total_amount: number; status: string; created_at: string; executor_name: string }[];
}
type CrownData = {
  stats: { total: number; converted: number; today: number; thisWeek: number; thisMonth: number };
  recentLeads: Lead[];
}

// ---- STYLE HELPERS ----
const S = {
  card: { background: "#111", border: "1px solid #222", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  badge: (color: string) => ({ background: color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-block" } as React.CSSProperties),
  btn: (active?: boolean) => ({
    padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: active ? "#c9a84c" : "#1a1a1a", color: active ? "#000" : "#888",
    border: active ? "none" : "1px solid #333",
  } as React.CSSProperties),
  input: { width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
  label: { fontSize: 11, color: "#888", letterSpacing: 1, marginBottom: 6, display: "block" } as React.CSSProperties,
  statCard: (color?: string) => ({ background: "#111", border: `1px solid ${color ?? "#222"}`, borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 140 } as React.CSSProperties),
}

const statusColor: Record<string, string> = {
  new: "#1e3a5f", offered: "#1e3a5f", accepted: "#14532d", in_progress: "#3b1f5e",
  completed: "#14532d", cancelled: "#3b0000", contacted: "#1e3a5f", booked: "#14532d", lost: "#3b0000",
}
const statusText: Record<string, string> = {
  new: "#60a5fa", offered: "#60a5fa", accepted: "#4ade80", in_progress: "#a78bfa",
  completed: "#4ade80", cancelled: "#f87171", contacted: "#60a5fa", booked: "#4ade80", lost: "#f87171",
}

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtDate(s: string) {
  try { return new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }
  catch { return s }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<Tab>("dashboard")

  // Data states
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [crownData, setCrownData] = useState<CrownData | null>(null)

  // Loading states
  const [loadingDash, setLoadingDash] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingFinance, setLoadingFinance] = useState(false)
  const [loadingCrown, setLoadingCrown] = useState(false)

  // Driver form
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newDriver, setNewDriver] = useState({ full_name: "", phone: "", email: "", driver_code: "" })
  const [addingDriver, setAddingDriver] = useState(false)
  const [addDriverMsg, setAddDriverMsg] = useState("")

  // SMS test
  const [smsPhone, setSmsPhone] = useState("")
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState("")

  // Booking detail modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // ---- DATA LOADERS ----
  const loadDashboard = useCallback(async () => {
    setLoadingDash(true)
    try {
      const res = await fetch("/api/admin/dashboard")
      if (res.ok) setDashboard(await res.json())
    } catch { } finally { setLoadingDash(false) }
  }, [])

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true)
    try {
      const res = await fetch("/api/admin/drivers")
      if (res.ok) { const d = await res.json(); setDrivers(d.drivers ?? []) }
    } catch { } finally { setLoadingDrivers(false) }
  }, [])

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch("/api/admin/bookings")
      if (res.ok) { const d = await res.json(); setBookings(d.bookings ?? []) }
    } catch { } finally { setLoadingBookings(false) }
  }, [])

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true)
    try {
      const res = await fetch("/api/admin/leads")
      if (res.ok) { const d = await res.json(); setLeads(d.leads ?? []) }
    } catch { } finally { setLoadingLeads(false) }
  }, [])

  const loadFinance = useCallback(async () => {
    setLoadingFinance(true)
    try {
      const res = await fetch("/api/admin/finance")
      if (res.ok) setFinance(await res.json())
    } catch { } finally { setLoadingFinance(false) }
  }, [])

  const loadCrown = useCallback(async () => {
    setLoadingCrown(true)
    try {
      const res = await fetch("/api/admin/crown-moment")
      if (res.ok) setCrownData(await res.json())
    } catch { } finally { setLoadingCrown(false) }
  }, [])

  useEffect(() => {
    if (authed) {
      loadDashboard()
      loadDrivers()
      loadBookings()
    }
  }, [authed, loadDashboard, loadDrivers, loadBookings])

  useEffect(() => {
    if (!authed) return
    if (tab === "leads") loadLeads()
    if (tab === "finance") loadFinance()
    if (tab === "crown") loadCrown()
  }, [tab, authed, loadLeads, loadFinance, loadCrown])

  // ---- ACTIONS ----
  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false) }
    else setPwError(true)
  }

  const handleAddDriver = async () => {
    if (!newDriver.full_name || !newDriver.phone || !newDriver.driver_code) {
      setAddDriverMsg("Full name, phone and driver code are required."); return
    }
    setAddingDriver(true); setAddDriverMsg("")
    try {
      const res = await fetch("/api/admin/drivers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newDriver) })
      const data = await res.json()
      if (res.ok) {
        setAddDriverMsg(`✅ Driver "${newDriver.full_name}" created. Code: ${newDriver.driver_code}`)
        setNewDriver({ full_name: "", phone: "", email: "", driver_code: "" })
        setShowAddDriver(false); loadDrivers()
      } else setAddDriverMsg(`❌ Error: ${data.error ?? "Unknown error"}`)
    } catch (e: any) { setAddDriverMsg(`❌ Network error: ${e.message}`) }
    finally { setAddingDriver(false) }
  }

  const handleToggleStatus = async (driver: Driver) => {
    const newStatus = driver.driver_status === "active" ? "inactive" : "active"
    try {
      await fetch(`/api/admin/drivers/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver_status: newStatus }) })
      loadDrivers()
    } catch { }
  }

  const handleBookingStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      loadBookings(); loadDashboard()
    } catch { }
  }

  const handleLeadStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      loadLeads()
    } catch { }
  }

  const handleSendTestSMS = async () => {
    if (!smsPhone) return
    setSmsSending(true); setSmsResult("")
    try {
      const res = await fetch("/api/dispatch/test-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: smsPhone }) })
      const data = await res.json()
      setSmsResult(res.ok && data.success ? `✅ SMS sent. SID: ${data.sid}` : `❌ Error: ${data.error ?? "Unknown"}`)
    } catch (e: any) { setSmsResult(`❌ Network error: ${e.message}`) }
    finally { setSmsSending(false) }
  }

  // ============================================================
  // LOGIN SCREEN
  // ============================================================
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "40px 32px", width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 3, marginBottom: 6 }}>SOTTOVENTO LUXURY NETWORK</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>SLN Admin</div>
          <div style={{ color: "#555", fontSize: 12, marginBottom: 32 }}>Luxury Network Operations</div>
          <input type="password" placeholder="Admin password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ ...S.input, marginBottom: 12, border: pwError ? "1px solid #ef4444" : "1px solid #333" }} />
          {pwError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>Incorrect password</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: 14, background: "#c9a84c", color: "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Enter
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // TABS CONFIG
  // ============================================================
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "◉" },
    { id: "bookings", label: "Bookings", icon: "📋" },
    { id: "dispatch", label: "Dispatch", icon: "⚡" },
    { id: "drivers", label: "Drivers", icon: "🚗" },
    { id: "companies", label: "Companies", icon: "🏢" },
    { id: "leads", label: "Leads", icon: "🎯" },
    { id: "crown", label: "Crown Moment", icon: "👑" },
    { id: "finance", label: "Finance", icon: "💰" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ]

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", color: "#fff" }}>
      {/* ---- HEADER ---- */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <div style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>SLN</div>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Sottovento Luxury Network</div>
        <div style={{ flex: 1 }} />
        <div style={{ color: "#555", fontSize: 12 }}>Admin Panel</div>
        <button onClick={() => setAuthed(false)} style={{ background: "transparent", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
          Logout
        </button>
      </div>

      {/* ---- NAV TABS ---- */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: "transparent", border: "none", padding: "14px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              color: tab === t.id ? "#c9a84c" : "#666",
              borderBottom: tab === t.id ? "2px solid #c9a84c" : "2px solid transparent",
              fontWeight: tab === t.id ? 600 : 400,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ---- CONTENT ---- */}
      <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ======================================================
            1. DASHBOARD
        ====================================================== */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Dashboard</div>
                <div style={{ color: "#555", fontSize: 13 }}>Sottovento Luxury Network — Operations Overview</div>
              </div>
              <button onClick={loadDashboard} style={S.btn()}>↻ Refresh</button>
            </div>

            {loadingDash ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading dashboard...</div>
            ) : dashboard ? (
              <>
                {/* KPI Row */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: "TODAY", count: dashboard.today.count, rev: dashboard.today.revenue, color: "#c9a84c" },
                    { label: "THIS WEEK", count: dashboard.week.count, rev: dashboard.week.revenue, color: "#60a5fa" },
                    { label: "THIS MONTH", count: dashboard.month.count, rev: dashboard.month.revenue, color: "#4ade80" },
                  ].map(k => (
                    <div key={k.label} style={S.statCard(k.color + "33")}>
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 8 }}>{k.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 2 }}>{k.count}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>bookings</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: k.color, marginTop: 6 }}>{fmt(k.rev)}</div>
                    </div>
                  ))}
                  <div style={S.statCard("#a78bfa33")}>
                    <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 2, marginBottom: 8 }}>ACTIVE DRIVERS</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.activeDrivers}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>SLN members</div>
                  </div>
                  <div style={S.statCard("#f59e0b33")}>
                    <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>TOTAL LEADS</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.totalLeads}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>captured</div>
                  </div>
                </div>

                {/* Booking Statuses + Leads by Source */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div style={S.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>BOOKING STATUSES</div>
                    {dashboard.bookingStatuses.map(s => (
                      <div key={s.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ ...S.badge(statusColor[s.status] ?? "#1a1a1a"), color: statusText[s.status] ?? "#fff" }}>{s.status?.toUpperCase()}</span>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{Number(s.count)}</span>
                      </div>
                    ))}
                    {dashboard.bookingStatuses.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>No bookings yet</div>}
                  </div>
                  <div style={S.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>LEADS BY SOURCE</div>
                    {dashboard.leadsBySource.map(s => (
                      <div key={s.lead_source} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#aaa" }}>{s.lead_source || "unknown"}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{Number(s.count)}</span>
                      </div>
                    ))}
                    {dashboard.leadsBySource.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>No leads yet</div>}
                  </div>
                </div>

                {/* Recent Bookings */}
                <div style={S.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>RECENT BOOKINGS</div>
                  {dashboard.recentBookings.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>No bookings yet</div>
                  ) : dashboard.recentBookings.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{b.client_name || "Unknown client"} · {fmtDate(b.created_at)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{fmt(b.total_price)}</div>
                        <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff" }}>{b.status?.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Failed to load dashboard</div>
            )}
          </div>
        )}

        {/* ======================================================
            2. BOOKINGS
        ====================================================== */}
        {tab === "bookings" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Bookings</div>
                <div style={{ color: "#555", fontSize: 13 }}>SLN luxury bookings — manage and assign</div>
              </div>
              <button onClick={loadBookings} style={S.btn()}>↻ Refresh</button>
            </div>

            {loadingBookings ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ color: "#888" }}>No bookings yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bookings.map(b => (
                  <div key={b.id} style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                          {b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          {fmtDate(b.pickup_at)} · {b.vehicle_type} · {fmt(b.total_price)}
                        </div>
                        {b.client_name && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Client: {b.client_name} {b.client_phone && `· ${b.client_phone}`}</div>}
                        <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>ID: {b.id.slice(0, 8)}...</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 120 }}>
                        <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff", display: "block", marginBottom: 4 }}>{b.status?.toUpperCase()}</span>
                        <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b", fontSize: 11 }}>{b.payment_status?.toUpperCase()}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {b.status === "new" && (
                        <button onClick={() => handleBookingStatus(b.id, "accepted")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#14532d", color: "#4ade80", border: "none" }}>
                          ✓ Accept
                        </button>
                      )}
                      {["new", "offered", "accepted"].includes(b.status) && (
                        <button onClick={() => handleBookingStatus(b.id, "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#3b0000", color: "#f87171", border: "none" }}>
                          ✕ Cancel
                        </button>
                      )}
                      {b.status === "accepted" && (
                        <button onClick={() => handleBookingStatus(b.id, "in_progress")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#3b1f5e", color: "#a78bfa", border: "none" }}>
                          ▶ In Progress
                        </button>
                      )}
                      {b.status === "in_progress" && (
                        <button onClick={() => handleBookingStatus(b.id, "completed")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#14532d", color: "#4ade80", border: "none" }}>
                          ✓ Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================
            3. DISPATCH
        ====================================================== */}
        {tab === "dispatch" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Dispatch</div>
              <div style={{ color: "#555", fontSize: 13 }}>SLN dispatch engine — booking assignment flow</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 12 }}>DISPATCH FLOW</div>
                {[
                  { step: "1", label: "Source Owner (SLN)", desc: "Booking goes first to the source driver who captured the client", color: "#c9a84c" },
                  { step: "2", label: "SLN Eligible Members", desc: "If source driver declines or times out, offered to eligible SLN drivers", color: "#60a5fa" },
                  { step: "3", label: "Manual Fallback (Admin)", desc: "Admin manually assigns if no driver accepts", color: "#f59e0b" },
                ].map(s => (
                  <div key={s.step} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color + "22", border: `1px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 12 }}>CRITICAL RULES</div>
                {[
                  { icon: "🔒", text: "SLN bookings ONLY handled inside SLN Admin" },
                  { icon: "⛔", text: "NO automatic cross-dispatch to DPS drivers" },
                  { icon: "👤", text: "Customer belongs to the SLN network" },
                  { icon: "📝", text: "Manual escalation must be logged and approved" },
                  { icon: "✅", text: "Only SLN-approved drivers participate" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#aaa" }}>
                    <span>{r.icon}</span><span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Pending bookings for manual dispatch */}
            <div style={S.card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>PENDING MANUAL DISPATCH</div>
              {bookings.filter(b => b.status === "new" || b.status === "offered").length === 0 ? (
                <div style={{ color: "#555", fontSize: 13 }}>No bookings pending dispatch</div>
              ) : bookings.filter(b => b.status === "new" || b.status === "offered").map(b => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(b.pickup_at)} · {fmt(b.total_price)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff" }}>{b.status?.toUpperCase()}</span>
                    <button onClick={() => handleBookingStatus(b.id, "accepted")} style={{ ...S.btn(), fontSize: 12, padding: "5px 10px", background: "#14532d", color: "#4ade80", border: "none" }}>
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================
            4. DRIVERS
        ====================================================== */}
        {tab === "drivers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Drivers</div>
                <div style={{ color: "#555", fontSize: 13 }}>SLN member drivers — manage and activate</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={loadDrivers} style={S.btn()}>↻ Refresh</button>
                <button onClick={() => setShowAddDriver(!showAddDriver)} style={{ ...S.btn(true), background: "#c9a84c", color: "#000" }}>
                  + Add Driver
                </button>
              </div>
            </div>

            {showAddDriver && (
              <div style={{ ...S.card, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New SLN Driver</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "full_name", label: "FULL NAME", placeholder: "John Smith" },
                    { key: "phone", label: "PHONE", placeholder: "+14073830647" },
                    { key: "email", label: "EMAIL", placeholder: "driver@email.com" },
                    { key: "driver_code", label: "DRIVER CODE", placeholder: "JOHN001" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={S.label}>{f.label}</label>
                      <input value={(newDriver as any)[f.key]} onChange={e => setNewDriver(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} style={S.input} />
                    </div>
                  ))}
                </div>
                {addDriverMsg && <div style={{ marginTop: 12, fontSize: 13, color: addDriverMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{addDriverMsg}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={handleAddDriver} disabled={addingDriver} style={{ ...S.btn(true), background: "#c9a84c", color: "#000", opacity: addingDriver ? 0.5 : 1 }}>
                    {addingDriver ? "Creating..." : "Create Driver"}
                  </button>
                  <button onClick={() => setShowAddDriver(false)} style={S.btn()}>Cancel</button>
                </div>
              </div>
            )}

            {loadingDrivers ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading drivers...</div>
            ) : drivers.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🚗</div>
                <div style={{ color: "#888" }}>No drivers yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {drivers.map(d => (
                  <div key={d.id} style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{d.full_name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>Code: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{d.driver_code}</span> · {d.phone} {d.email && `· ${d.email}`}</div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Added: {fmtDate(d.created_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ ...S.badge(d.driver_status === "active" ? "#14532d" : "#1c1917"), color: d.driver_status === "active" ? "#4ade80" : "#78716c" }}>
                          {d.driver_status?.toUpperCase()}
                        </span>
                        <button onClick={() => handleToggleStatus(d)} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px" }}>
                          {d.driver_status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${BASE_URL}/tablet/${d.driver_code}`) }} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px" }}>
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================
            5. COMPANIES / BRANDS
        ====================================================== */}
        {tab === "companies" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Companies & Brands</div>
              <div style={{ color: "#555", fontSize: 13 }}>SLN network brands and member companies</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                {
                  name: "Sottovento Luxury Ride",
                  type: "FLAGSHIP BRAND",
                  color: "#c9a84c",
                  desc: "The core luxury transportation brand. All SLN operations are attributed to this brand by default.",
                  members: drivers.filter(d => d.driver_status === "active").length,
                  url: BASE_URL,
                },
                {
                  name: "Alafyn Luxury by Sottovento Network",
                  type: "PARTNER BRAND",
                  color: "#a78bfa",
                  desc: "Partner brand operating under the Sottovento Network umbrella. Shared dispatch infrastructure.",
                  members: 0,
                  url: null,
                },
              ].map(c => (
                <div key={c.name} style={{ ...S.card, borderColor: c.color + "44" }}>
                  <div style={{ fontSize: 10, color: c.color, letterSpacing: 2, marginBottom: 8 }}>{c.type}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{c.desc}</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>ACTIVE MEMBERS</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.members}</div>
                    </div>
                  </div>
                  {c.url && (
                    <div style={{ marginTop: 12 }}>
                      <a href={c.url} target="_blank" rel="noreferrer" style={{ color: c.color, fontSize: 12 }}>{c.url}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ ...S.card, borderColor: "#333" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 12 }}>DRIVER ASSIGNMENTS</div>
              <div style={{ color: "#555", fontSize: 13 }}>
                All {drivers.filter(d => d.driver_status === "active").length} active drivers are currently assigned to <span style={{ color: "#c9a84c" }}>Sottovento Luxury Ride</span>.
                Multi-brand assignment is planned for a future release.
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            6. LEADS
        ====================================================== */}
        {tab === "leads" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Leads</div>
                <div style={{ color: "#555", fontSize: 13 }}>SLN leads — tablet, QR, web captures</div>
              </div>
              <button onClick={loadLeads} style={S.btn()}>↻ Refresh</button>
            </div>

            {loadingLeads ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading leads...</div>
            ) : leads.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ color: "#888" }}>No leads yet</div>
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {["new", "contacted", "booked", "lost"].map(s => (
                    <div key={s} style={S.statCard()}>
                      <div style={{ fontSize: 10, color: statusText[s] ?? "#888", letterSpacing: 2, marginBottom: 6 }}>{s.toUpperCase()}</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{leads.filter(l => l.status === s).length}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {leads.map(l => (
                    <div key={l.id} style={S.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{l.full_name || "Anonymous"}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>
                            {l.phone && `${l.phone} · `}{l.email && `${l.email} · `}
                            <span style={{ color: "#c9a84c" }}>{l.lead_source || "tablet"}</span>
                          </div>
                          {l.interested_package && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Package: {l.interested_package}</div>}
                          {l.driver_code && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Driver: {l.driver_code}</div>}
                          <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>{fmtDate(l.created_at)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ ...S.badge(statusColor[l.status] ?? "#1a1a1a"), color: statusText[l.status] ?? "#fff" }}>{l.status?.toUpperCase()}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            {l.status === "new" && <button onClick={() => handleLeadStatus(l.id, "contacted")} style={{ ...S.btn(), fontSize: 11, padding: "4px 8px" }}>Contact</button>}
                            {l.status !== "booked" && l.status !== "lost" && <button onClick={() => handleLeadStatus(l.id, "booked")} style={{ ...S.btn(), fontSize: 11, padding: "4px 8px", background: "#14532d", color: "#4ade80", border: "none" }}>Booked</button>}
                            {l.status !== "lost" && <button onClick={() => handleLeadStatus(l.id, "lost")} style={{ ...S.btn(), fontSize: 11, padding: "4px 8px", background: "#3b0000", color: "#f87171", border: "none" }}>Lost</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================
            7. CROWN MOMENT
        ====================================================== */}
        {tab === "crown" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>👑 Crown Moment</div>
                <div style={{ color: "#555", fontSize: 13 }}>Photo captures, emails sent, conversions</div>
              </div>
              <button onClick={loadCrown} style={S.btn()}>↻ Refresh</button>
            </div>

            {loadingCrown ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading Crown Moment data...</div>
            ) : crownData ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: "TODAY", value: crownData.stats.today, color: "#c9a84c" },
                    { label: "THIS WEEK", value: crownData.stats.thisWeek, color: "#60a5fa" },
                    { label: "THIS MONTH", value: crownData.stats.thisMonth, color: "#4ade80" },
                    { label: "TOTAL", value: crownData.stats.total, color: "#a78bfa" },
                    { label: "CONVERTED", value: crownData.stats.converted, color: "#f59e0b" },
                  ].map(k => (
                    <div key={k.label} style={S.statCard(k.color + "33")}>
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {crownData.stats.total > 0 && (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>CONVERSION RATE</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#c9a84c" }}>
                      {crownData.stats.total > 0 ? Math.round((crownData.stats.converted / crownData.stats.total) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: 12, color: "#555" }}>Crown Moment → Booking</div>
                  </div>
                )}

                <div style={S.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>RECENT CROWN MOMENT LEADS</div>
                  {crownData.recentLeads.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>No Crown Moment leads yet</div>
                  ) : crownData.recentLeads.map(l => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{l.full_name || "Anonymous"}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{l.email} {l.phone && `· ${l.phone}`}</div>
                        <div style={{ fontSize: 11, color: "#333" }}>{fmtDate(l.created_at)}</div>
                      </div>
                      <span style={{ ...S.badge(statusColor[l.status] ?? "#1a1a1a"), color: statusText[l.status] ?? "#fff" }}>{l.status?.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Failed to load Crown Moment data</div>
            )}
          </div>
        )}

        {/* ======================================================
            8. FINANCE
        ====================================================== */}
        {tab === "finance" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Finance</div>
                <div style={{ color: "#555", fontSize: 13 }}>SLN revenue, commissions and driver earnings</div>
              </div>
              <button onClick={loadFinance} style={S.btn()}>↻ Refresh</button>
            </div>

            {loadingFinance ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading finance data...</div>
            ) : finance ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: "TOTAL REVENUE", value: fmt(finance.totalRevenue), color: "#c9a84c" },
                    { label: "THIS MONTH", value: fmt(finance.monthRevenue), color: "#4ade80" },
                    { label: "DRIVER EARNINGS", value: fmt(finance.commissions.totalDriverEarnings), color: "#60a5fa" },
                    { label: "PLATFORM EARNINGS", value: fmt(finance.commissions.totalPlatformEarnings), color: "#a78bfa" },
                  ].map(k => (
                    <div key={k.label} style={S.statCard(k.color + "33")}>
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Top Drivers */}
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>TOP EARNING DRIVERS</div>
                  {finance.topDrivers.filter(d => Number(d.executor_earnings) + Number(d.source_earnings) > 0).length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>No commission data yet</div>
                  ) : finance.topDrivers.filter(d => Number(d.executor_earnings) + Number(d.source_earnings) > 0).map((d, i) => (
                    <div key={d.driver_code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#c9a84c22", color: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.full_name}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{d.driver_code} · {Number(d.rides)} rides</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{fmt(Number(d.executor_earnings) + Number(d.source_earnings))}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>total earnings</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Commissions */}
                <div style={S.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>RECENT COMMISSIONS</div>
                  {finance.recentCommissions.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>No commissions yet</div>
                  ) : finance.recentCommissions.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.executor_name || "Unassigned"}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>Booking: {c.booking_id?.slice(0, 8)}... · {fmtDate(c.created_at)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{fmt(Number(c.total_amount))}</div>
                        <span style={{ ...S.badge(c.status === "confirmed" ? "#14532d" : "#1c1917"), color: c.status === "confirmed" ? "#4ade80" : "#78716c" }}>{c.status?.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Failed to load finance data</div>
            )}
          </div>
        )}

        {/* ======================================================
            9. SETTINGS
        ====================================================== */}
        {tab === "settings" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Settings</div>
              <div style={{ color: "#555", fontSize: 13 }}>SLN configuration — dispatch, commissions, rules</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Dispatch Settings */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>DISPATCH SETTINGS</div>
                {[
                  { label: "Offer Timeout (Source Driver)", value: "120 seconds" },
                  { label: "Offer Timeout (Pool Drivers)", value: "90 seconds" },
                  { label: "Max Dispatch Rounds", value: "3 rounds" },
                  { label: "Fallback Mode", value: "Manual (Admin)" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              {/* Commission Rules */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>COMMISSION RULES</div>
                {[
                  { label: "Executor Driver", value: "80%" },
                  { label: "Source Driver (referral)", value: "10%" },
                  { label: "Platform (SLN)", value: "10%" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{s.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              {/* Crown Moment Settings */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>CROWN MOMENT</div>
                {[
                  { label: "Discount Code", value: "CROWN10 (10% OFF)" },
                  { label: "Referral Discount", value: "$10 OFF for friend" },
                  { label: "Photo Storage", value: "Vercel Blob (public)" },
                  { label: "Email Provider", value: "Resend" },
                  { label: "Domain", value: "sottoventoluxuryride.com ✅" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{s.label}</span>
                    <span style={{ fontSize: 13, color: "#fff" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              {/* Infrastructure */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>INFRASTRUCTURE</div>
                {[
                  { label: "Hosting", value: "Vercel (Hobby)" },
                  { label: "Database", value: "Neon (Postgres)" },
                  { label: "SMS", value: "Twilio ⚠️ Pending" },
                  { label: "Payments", value: "Stripe" },
                  { label: "Framework", value: "Next.js 16.1" },
                  { label: "Domain", value: "sottoventoluxuryride.com" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{s.label}</span>
                    <span style={{ fontSize: 13, color: "#fff" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SMS Test Section */}
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>SMS TEST (Twilio)</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>PHONE NUMBER</label>
                  <input type="tel" placeholder="+14073830647" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} style={S.input} />
                </div>
                <button onClick={handleSendTestSMS} disabled={smsSending || !smsPhone} style={{ ...S.btn(!!smsPhone), background: smsPhone ? "#c9a84c" : "#333", color: smsPhone ? "#000" : "#666", padding: "12px 20px", opacity: smsSending ? 0.5 : 1 }}>
                  {smsSending ? "Sending..." : "Send Test SMS"}
                </button>
              </div>
              {smsResult && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: smsResult.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 13, color: smsResult.startsWith("✅") ? "#4ade80" : "#f87171", wordBreak: "break-all" }}>
                  {smsResult}
                </div>
              )}
              <div style={{ marginTop: 16, fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                <div>Number: <span style={{ color: "#c9a84c" }}>+1 (689) 264-6565</span></div>
                <div>Messaging Service: <span style={{ color: "#c9a84c" }}>Sottovento Driver Alerts</span></div>
                <div>A2P 10DLC: <span style={{ color: "#f59e0b" }}>Registered — Pending vetting</span></div>
                <div>Toll-Free +1 (888) 997-5436: <span style={{ color: "#f59e0b" }}>In Review</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
