"use client"
import { useState, useEffect, useCallback } from "react"
import { type Lang, type TranslationKey, getTranslation, saveLang, loadLang } from "@/lib/i18n"

// ============================================================
// /admin — Sottovento Luxury Network (SLN) Admin Panel
// 9 Modules + i18n EN/ES + iOS Safe Area
// ============================================================

const ADMIN_PASSWORD = "Sottovento.20"
const BASE_URL = "https://www.sottoventoluxuryride.com"

type Tab = "dashboard" | "bookings" | "dispatch" | "drivers" | "companies" | "leads" | "crown" | "finance" | "partners" | "settings"

// ---- TYPES ----
type Driver = { id: string; driver_code: string; full_name: string; phone: string; email: string; driver_status: string; is_eligible: boolean; created_at: string }
type Booking = { id: string; pickup_zone: string; dropoff_zone: string; pickup_address: string; dropoff_address: string; pickup_at: string; vehicle_type: string; total_price: number; status: string; dispatch_status?: string; readiness_status?: string; payment_status: string; created_at: string; client_name?: string; client_phone?: string; client_email?: string; assigned_driver_id?: string; driver_name?: string; driver_code?: string; flight_number?: string; notes?: string; passengers?: number; luggage?: string; driver_reported?: boolean; driver_report_action?: string }
type Lead = { id: string; lead_source: string; full_name: string; phone: string; email: string; interested_package: string; status: string; driver_code: string; tablet_code: string; created_at: string; driver_name?: string }
type DashboardData = { today: { count: number; revenue: number }; week: { count: number; revenue: number }; month: { count: number; revenue: number }; activeDrivers: number; totalLeads: number; leadsBySource: { lead_source: string; count: number }[]; bookingStatuses: { status: string; count: number }[]; recentBookings: Booking[] }
type FinanceData = { totalRevenue: number; monthRevenue: number; commissions: { totalDriverEarnings: number; totalSourceEarnings: number; totalPlatformEarnings: number; totalCommissions: number; count: number }; topDrivers: { full_name: string; driver_code: string; executor_earnings: number; source_earnings: number; rides: number }[]; recentCommissions: { id: string; booking_id: string; executor_amount: number; source_amount: number; platform_amount: number; total_amount: number; status: string; created_at: string; executor_name: string }[] }
type CrownData = { stats: { total: number; converted: number; today: number; thisWeek: number; thisMonth: number }; recentLeads: Lead[] }

// ---- STYLE HELPERS ----
const S = {
  card: { background: "#111", border: "1px solid #222", borderRadius: 12, padding: "18px 20px" } as React.CSSProperties,
  badge: (color: string) => ({ background: color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-block" } as React.CSSProperties),
  btn: (active?: boolean) => ({ padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#c9a84c" : "#1a1a1a", color: active ? "#000" : "#888", border: active ? "none" : "1px solid #333" } as React.CSSProperties),
  input: { width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
  label: { fontSize: 11, color: "#888", letterSpacing: 1, marginBottom: 6, display: "block" } as React.CSSProperties,
  statCard: (color?: string) => ({ background: "#111", border: `1px solid ${color ?? "#222"}`, borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 140 } as React.CSSProperties),
}

const statusColor: Record<string, string> = { new: "#1e3a5f", offered: "#1e3a5f", accepted: "#14532d", in_progress: "#3b1f5e", completed: "#14532d", cancelled: "#3b0000", contacted: "#1e3a5f", booked: "#14532d", lost: "#3b0000", pending: "#1a2a1a", pending_payment: "#2a1a00", pending_dispatch: "#0c2340" }
const statusText: Record<string, string> = { new: "#60a5fa", offered: "#60a5fa", accepted: "#4ade80", in_progress: "#a78bfa", completed: "#4ade80", cancelled: "#f87171", contacted: "#60a5fa", booked: "#4ade80", lost: "#f87171", pending: "#aaa", pending_payment: "#f59e0b", pending_dispatch: "#38bdf8" }
const dispatchColor: Record<string, string> = { not_required: "#1a1a1a", awaiting_source_owner: "#1e3a5f", awaiting_sln_member: "#3b1f5e", manual_dispatch_required: "#3b1a00", assigned: "#14532d", expired: "#3b0000", cancelled: "#3b0000" }
const dispatchText: Record<string, string> = { not_required: "#444", awaiting_source_owner: "#60a5fa", awaiting_sln_member: "#a78bfa", manual_dispatch_required: "#f59e0b", assigned: "#4ade80", expired: "#f87171", cancelled: "#f87171" }

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtDate(s: string) { try { return new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) } catch { return s } }

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<Tab>("dashboard")
  const [lang, setLang] = useState<Lang>("en")

  // i18n helper
  const t = useCallback((key: TranslationKey) => getTranslation(lang, key), [lang])

  // Load persisted language on mount
  useEffect(() => { setLang(loadLang()) }, [])

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "es" : "en"
    setLang(next)
    saveLang(next)
  }

  // Data states
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [crownData, setCrownData] = useState<CrownData | null>(null)
  const [dispatchData, setDispatchData] = useState<{ awaitingSourceOwner: Booking[]; awaitingSlnMember: Booking[]; manualDispatchRequired: Booking[]; total: number; migrationRequired?: boolean } | null>(null)
  const [loadingDispatch, setLoadingDispatch] = useState(false)
  const [migrationMsg, setMigrationMsg] = useState("")
  const [runningMigration, setRunningMigration] = useState(false)
  const [runningReclassify, setRunningReclassify] = useState(false)
  const [reclassifyMsg, setReclassifyMsg] = useState("")

  const [loadingDash, setLoadingDash] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingFinance, setLoadingFinance] = useState(false)
  const [loadingCrown, setLoadingCrown] = useState(false)

  // Partner System state
  type PartnerTab = "list" | "companies" | "invites" | "earnings" | "compliance"
  const [partnerTab, setPartnerTab] = useState<PartnerTab>("list")
  const [partners, setPartners] = useState<any[]>([])
  const [partnerCompanies, setPartnerCompanies] = useState<any[]>([])
  const [partnerInvites, setPartnerInvites] = useState<any[]>([])
  const [partnerEarnings, setPartnerEarnings] = useState<any[]>([])
  const [partnerCompliance, setPartnerCompliance] = useState<any[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [partnerMigMsg, setPartnerMigMsg] = useState("")
  const [runningPartnerMig, setRunningPartnerMig] = useState(false)
  // Invite form
  const [inviteForm, setInviteForm] = useState({ type: "individual", email: "", phone: "", commission_rate: "0.10", name: "", send_email: true })
  const [inviteMsg, setInviteMsg] = useState("")
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  // Company form
  const [companyForm, setCompanyForm] = useState({ name: "", brand_name: "", commission_split_company: "0.10", commission_split_staff: "0.05" })
  const [companyMsg, setCompanyMsg] = useState("")
  const [addingCompany, setAddingCompany] = useState(false)

  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newDriver, setNewDriver] = useState({ full_name: "", phone: "", email: "", driver_code: "" })
  const [addingDriver, setAddingDriver] = useState(false)
  const [addDriverMsg, setAddDriverMsg] = useState("")

  const [smsPhone, setSmsPhone] = useState("")
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState("")

  // Assign Driver Modal
  const [assignModal, setAssignModal] = useState<{ bookingId: string; pickup: string; dropoff: string } | null>(null)
  const [assigningDriver, setAssigningDriver] = useState(false)
  const [assignMsg, setAssignMsg] = useState("")
  // Global toast for error surfacing (D3 requirement)
  const [globalToast, setGlobalToast] = useState<{ msg: string; type: "error" | "success" } | null>(null)
  // Edit Booking Modal
  const [editModal, setEditModal] = useState<Booking | null>(null)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMsg, setEditMsg] = useState("")

  // ---- DATA LOADERS ----
  const loadDashboard = useCallback(async () => { setLoadingDash(true); try { const r = await fetch("/api/admin/dashboard"); if (r.ok) setDashboard(await r.json()) } catch { } finally { setLoadingDash(false) } }, [])
  const loadDrivers = useCallback(async () => { setLoadingDrivers(true); try { const r = await fetch("/api/admin/drivers"); if (r.ok) { const d = await r.json(); setDrivers(d.drivers ?? []) } } catch { } finally { setLoadingDrivers(false) } }, [])
  const loadBookings = useCallback(async () => { setLoadingBookings(true); try { const r = await fetch("/api/admin/bookings"); if (r.ok) { const d = await r.json(); setBookings(d.bookings ?? []) } } catch { } finally { setLoadingBookings(false) } }, [])
  const loadLeads = useCallback(async () => { setLoadingLeads(true); try { const r = await fetch("/api/admin/leads"); if (r.ok) { const d = await r.json(); setLeads(d.leads ?? []) } } catch { } finally { setLoadingLeads(false) } }, [])
  const loadFinance = useCallback(async () => { setLoadingFinance(true); try { const r = await fetch("/api/admin/finance"); if (r.ok) setFinance(await r.json()) } catch { } finally { setLoadingFinance(false) } }, [])
  const loadCrown = useCallback(async () => { setLoadingCrown(true); try { const r = await fetch("/api/admin/crown-moment"); if (r.ok) setCrownData(await r.json()) } catch { } finally { setLoadingCrown(false) } }, [])
  const loadDispatch = useCallback(async () => { setLoadingDispatch(true); try { const r = await fetch("/api/admin/dispatch"); if (r.ok) setDispatchData(await r.json()) } catch { } finally { setLoadingDispatch(false) } }, [])
  const loadPartners = useCallback(async () => { setLoadingPartners(true); try { const r = await fetch("/api/admin/partners"); if (r.ok) { const d = await r.json(); setPartners(d.partners ?? []) } } catch { } finally { setLoadingPartners(false) } }, [])
  const loadPartnerCompanies = useCallback(async () => { try { const r = await fetch("/api/admin/partner-companies"); if (r.ok) { const d = await r.json(); setPartnerCompanies(d.companies ?? []) } } catch { } }, [])
  const loadPartnerInvites = useCallback(async () => { try { const r = await fetch("/api/admin/partner-invites"); if (r.ok) { const d = await r.json(); setPartnerInvites(d.invites ?? []) } } catch { } }, [])
  const loadPartnerEarnings = useCallback(async () => { try { const r = await fetch("/api/admin/partner-earnings"); if (r.ok) { const d = await r.json(); setPartnerEarnings(d.earnings ?? []) } } catch { } }, [])
  const loadPartnerCompliance = useCallback(async () => { try { const r = await fetch("/api/admin/partner-earnings?compliance=true"); if (r.ok) { const d = await r.json(); setPartnerCompliance(d.compliance ?? []) } } catch { } }, [])

  useEffect(() => { if (authed) { loadDashboard(); loadDrivers(); loadBookings() } }, [authed, loadDashboard, loadDrivers, loadBookings])
  useEffect(() => { if (!authed) return; if (tab === "leads") loadLeads(); if (tab === "finance") loadFinance(); if (tab === "crown") loadCrown(); if (tab === "dispatch") loadDispatch(); if (tab === "partners") { loadPartners(); loadPartnerCompanies(); loadPartnerInvites() } }, [tab, authed, loadLeads, loadFinance, loadCrown, loadDispatch, loadPartners, loadPartnerCompanies, loadPartnerInvites])
  useEffect(() => { if (tab !== "partners") return; if (partnerTab === "earnings") loadPartnerEarnings(); if (partnerTab === "compliance") loadPartnerCompliance() }, [partnerTab, tab, loadPartnerEarnings, loadPartnerCompliance])

  // ---- ACTIONS ----
  const handleLogin = () => { if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false) } else setPwError(true) }

  const handleAddDriver = async () => {
    if (!newDriver.full_name || !newDriver.phone || !newDriver.driver_code) { setAddDriverMsg(t("drvRequiredFields")); return }
    setAddingDriver(true); setAddDriverMsg("")
    try {
      const res = await fetch("/api/admin/drivers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newDriver) })
      const data = await res.json()
      if (res.ok) { setAddDriverMsg(`✅ ${t("drvCreated")} ${newDriver.driver_code}`); setNewDriver({ full_name: "", phone: "", email: "", driver_code: "" }); setShowAddDriver(false); loadDrivers() }
      else setAddDriverMsg(`❌ ${t("drvError")} ${data.error ?? "Unknown error"}`)
    } catch (e: any) { setAddDriverMsg(`❌ ${t("drvNetworkError")} ${e.message}`) }
    finally { setAddingDriver(false) }
  }

  const handleToggleStatus = async (driver: Driver) => {
    const newStatus = driver.driver_status === "active" ? "inactive" : "active"
    try { await fetch(`/api/admin/drivers/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver_status: newStatus }) }); loadDrivers() } catch { }
  }

  const handleOpenEdit = (b: Booking) => {
    setEditModal(b)
    // Pre-populate fields with current values
    setEditFields({
      pickup_at: b.pickup_at ? new Date(b.pickup_at).toISOString().slice(0, 16) : "",
      pickup_address: b.pickup_address ?? "",
      dropoff_address: b.dropoff_address ?? "",
      flight_number: b.flight_number ?? "",
      notes: b.notes ?? "",
      service_type: (b as any).service_type ?? "transfer",
      passengers: String(b.passengers ?? 1),
      luggage: b.luggage ?? "",
      vehicle_type: b.vehicle_type ?? "",
      total_price: String(b.total_price ?? ""),
      client_name: b.client_name ?? "",
      client_phone: b.client_phone ?? "",
    })
    setEditMsg("")
  }

  const handleSaveEdit = async () => {
    if (!editModal) return
    setSavingEdit(true); setEditMsg("")
    try {
      // Convert pickup_at from local datetime-local to ISO
      const fields: Record<string, string | number> = { ...editFields }
      if (fields.pickup_at) fields.pickup_at = new Date(fields.pickup_at as string).toISOString()
      if (fields.passengers) fields.passengers = Number(fields.passengers)
      if (fields.total_price) fields.total_price = Number(fields.total_price)
      // Remove empty strings
      Object.keys(fields).forEach(k => { if (fields[k] === "" || fields[k] === null) delete fields[k] })
      const res = await fetch(`/api/admin/bookings/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit_fields: fields })
      })
      if (res.ok) {
        setEditMsg("✅ Guardado correctamente")
        loadBookings(); loadDispatch()
        setTimeout(() => { setEditModal(null); setEditMsg("") }, 1200)
      } else {
        const d = await res.json().catch(() => ({}))
        setEditMsg(`❌ Error: ${d.error ?? "Unknown"}`)
      }
    } catch (e: any) {
      setEditMsg(`❌ Network error: ${e.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleBookingStatus = async (id: string, status: string, dispatch_status?: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, dispatch_status }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setGlobalToast({ msg: `❌ ${data.error ?? "Failed to update booking"}`, type: "error" })
        setTimeout(() => setGlobalToast(null), 4000)
        return
      }
      loadBookings(); loadDispatch(); loadDashboard()
    } catch (e: any) {
      setGlobalToast({ msg: `❌ Network error: ${e.message}`, type: "error" })
      setTimeout(() => setGlobalToast(null), 4000)
    }
  }

  const handleAssignDriver = async (bookingId: string, driverId: string) => {
    setAssigningDriver(true); setAssignMsg("")
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted", dispatch_status: "assigned", assigned_driver_id: driverId })
      })
      const data = await res.json()
      if (res.ok) {
        setAssignMsg("✅ Driver assigned successfully")
        setTimeout(() => { setAssignModal(null); setAssignMsg("") }, 1200)
        loadBookings(); loadDispatch(); loadDashboard()
      } else {
        setAssignMsg(`❌ Error: ${data.error ?? "Unknown error"}`)
      }
    } catch (e: any) { setAssignMsg(`❌ Network error: ${e.message}`) }
    finally { setAssigningDriver(false) }
  }

  const handleDispatchStatus = async (id: string, dispatch_status: string) => {
    try { await fetch("/api/admin/dispatch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: id, dispatch_status }) }); loadDispatch(); loadBookings() } catch { }
  }

  const handleRunReclassify = async () => {
    setRunningReclassify(true); setReclassifyMsg("")
    try {
      const r = await fetch("/api/admin/reclassify", { method: "POST" })
      const d = await r.json()
      if (r.ok) { setReclassifyMsg(`✅ Fixed ${d.fixed ?? 0} bookings. ${d.results?.slice(-2).join(" | ")}`); loadBookings(); loadDispatch() }
      else setReclassifyMsg(`❌ Error: ${d.error}`)
    } catch (e: any) { setReclassifyMsg(`❌ Network error: ${e.message}`) }
    finally { setRunningReclassify(false) }
  }

  const handleRunMigration = async () => {
    setRunningMigration(true); setMigrationMsg("")
    try {
      const r = await fetch("/api/admin/migrate", { method: "POST" })
      const d = await r.json()
      if (r.ok) { setMigrationMsg(`✅ Migration complete: ${d.results?.join(" | ")}`); loadBookings(); loadDispatch() }
      else setMigrationMsg(`❌ Error: ${d.error}`)
    } catch (e: any) { setMigrationMsg(`❌ Network error: ${e.message}`) }
    finally { setRunningMigration(false) }
  }

  const handleLeadStatus = async (id: string, status: string) => {
    try { await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); loadLeads() } catch { }
  }

  const handleRunPartnerMigration = async () => {
    setRunningPartnerMig(true); setPartnerMigMsg("")
    try {
      const r = await fetch("/api/admin/migrate-partners")
      const d = await r.json()
      if (r.ok) { setPartnerMigMsg(`✅ ${d.message}. Tables: ${d.tables?.join(", ")}`); loadPartners(); loadPartnerCompanies() }
      else setPartnerMigMsg(`❌ Error: ${d.error}`)
    } catch (e: any) { setPartnerMigMsg(`❌ ${e.message}`) }
    finally { setRunningPartnerMig(false) }
  }

  const handleSendInvite = async () => {
    if (!inviteForm.type) return; setSendingInvite(true); setInviteMsg(""); setInviteLink("")
    try {
      const r = await fetch("/api/admin/partner-invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...inviteForm, commission_rate: parseFloat(inviteForm.commission_rate), prefilled_data: { name: inviteForm.name } }) })
      const d = await r.json()
      if (r.ok) { setInviteMsg("✅ Invite created" + (inviteForm.send_email && inviteForm.email ? " and email sent" : "")); setInviteLink(d.invite_link ?? ""); loadPartnerInvites() }
      else setInviteMsg(`❌ ${d.error}`)
    } catch (e: any) { setInviteMsg(`❌ ${e.message}`) }
    finally { setSendingInvite(false) }
  }

  const handleAddCompany = async () => {
    if (!companyForm.name || !companyForm.brand_name) return; setAddingCompany(true); setCompanyMsg("")
    try {
      const r = await fetch("/api/admin/partner-companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...companyForm, commission_split_company: parseFloat(companyForm.commission_split_company), commission_split_staff: parseFloat(companyForm.commission_split_staff) }) })
      const d = await r.json()
      if (r.ok) { setCompanyMsg(`✅ Company created: ${d.company?.brand_name} (${d.company?.master_ref_code})`); setCompanyForm({ name: "", brand_name: "", commission_split_company: "0.10", commission_split_staff: "0.05" }); loadPartnerCompanies() }
      else setCompanyMsg(`❌ ${d.error}`)
    } catch (e: any) { setCompanyMsg(`❌ ${e.message}`) }
    finally { setAddingCompany(false) }
  }

  const handleSendTestSMS = async () => {
    if (!smsPhone) return; setSmsSending(true); setSmsResult("")
    try {
      const res = await fetch("/api/dispatch/test-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: smsPhone }) })
      const data = await res.json()
      setSmsResult(res.ok && data.success ? `✅ SMS sent. SID: ${data.sid}` : `❌ ${t("drvError")} ${data.error ?? "Unknown"}`)
    } catch (e: any) { setSmsResult(`❌ ${t("drvNetworkError")} ${e.message}`) }
    finally { setSmsSending(false) }
  }

  // ============================================================
  // LOGIN SCREEN
  // ============================================================
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: "40px 32px", width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 3, marginBottom: 6 }}>SOTTOVENTO LUXURY NETWORK</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>SLN Admin</div>
          <div style={{ color: "#555", fontSize: 12, marginBottom: 32 }}>Luxury Network Operations</div>
          {/* Language toggle on login */}
          <div style={{ marginBottom: 20 }}>
            <button onClick={toggleLang} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#c9a84c" }}>
              {lang === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}
            </button>
          </div>
          <input type="password" placeholder={t("adminPassword")} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ ...S.input, marginBottom: 12, border: pwError ? "1px solid #ef4444" : "1px solid #333" }} />
          {pwError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{t("incorrectPassword")}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: 14, background: "#c9a84c", color: "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            {t("enterPassword")}
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // TABS CONFIG
  // ============================================================
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: t("tabDashboard"), icon: "◉" },
    { id: "bookings", label: t("tabBookings"), icon: "📋" },
    { id: "dispatch", label: t("tabDispatch"), icon: "⚡" },
    { id: "drivers", label: t("tabDrivers"), icon: "🚗" },
    { id: "companies", label: t("tabCompanies"), icon: "🏢" },
    { id: "leads", label: t("tabLeads"), icon: "🎯" },
    { id: "crown", label: t("tabCrown"), icon: "👑" },
    { id: "finance", label: t("tabFinance"), icon: "💰" },
    { id: "partners", label: "Partners", icon: "🤝" },
    { id: "settings", label: t("tabSettings"), icon: "⚙️" },
  ]

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", color: "#fff" }}>
      {/* ---- GLOBAL TOAST (error/success surfacing) ---- */}
      {globalToast && (
        <div style={{
          position: "fixed", top: "calc(env(safe-area-inset-top) + 16px)", left: "50%", transform: "translateX(-50%)",
          background: globalToast.type === "error" ? "#3b0000" : "#14532d",
          border: `1px solid ${globalToast.type === "error" ? "#f87171" : "#4ade80"}`,
          color: globalToast.type === "error" ? "#f87171" : "#4ade80",
          borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 600,
          zIndex: 9999, maxWidth: 360, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.6)"
        }}>
          {globalToast.msg}
        </div>
      )}
      {/* ---- HEADER — with iOS safe area ---- */}
      <div style={{
        background: "#0d0d0d",
        borderBottom: "1px solid #1a1a1a",
        paddingTop: "calc(env(safe-area-inset-top) + 0px)",
        paddingLeft: "max(24px, env(safe-area-inset-left))",
        paddingRight: "max(24px, env(safe-area-inset-right))",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>SLN</div>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{t("slnLabel")}</div>
          <div style={{ flex: 1 }} />
          {/* Language Toggle */}
          <button onClick={toggleLang} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#c9a84c" }}>
            {lang === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}
          </button>
          <div style={{ color: "#555", fontSize: 12 }}>{t("adminPanel")}</div>
          <button onClick={() => setAuthed(false)} style={{ background: "transparent", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
            {t("logout")}
          </button>
        </div>
      </div>

      {/* ---- NAV TABS — sticky below header ---- */}
      <div style={{
        background: "#0d0d0d",
        borderBottom: "1px solid #1a1a1a",
        paddingLeft: "max(24px, env(safe-area-inset-left))",
        paddingRight: "max(safe-area-inset-right, 0px)",
        display: "flex",
        gap: 2,
        overflowX: "auto",
        position: "sticky",
        top: "calc(env(safe-area-inset-top) + 56px)",
        zIndex: 99,
      }}>
        {tabs.map(t2 => (
          <button key={t2.id} onClick={() => setTab(t2.id)}
            style={{ background: "transparent", border: "none", padding: "14px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", color: tab === t2.id ? "#c9a84c" : "#666", borderBottom: tab === t2.id ? "2px solid #c9a84c" : "2px solid transparent", fontWeight: tab === t2.id ? 600 : 400 }}>
            {t2.icon} {t2.label}
          </button>
        ))}
      </div>

      {/* ---- CONTENT ---- */}
      <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto", paddingBottom: "calc(28px + env(safe-area-inset-bottom))" }}>

        {/* ======================================================
            1. DASHBOARD
        ====================================================== */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t("dashTitle")}</div>
                <div style={{ color: "#555", fontSize: 13 }}>{t("dashSubtitle")}</div>
              </div>
              <button onClick={loadDashboard} style={S.btn()}>{t("refresh")}</button>
            </div>

            {loadingDash ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : dashboard ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: t("dashToday"), count: dashboard.today.count, rev: dashboard.today.revenue, color: "#c9a84c" },
                    { label: t("dashWeek"), count: dashboard.week.count, rev: dashboard.week.revenue, color: "#60a5fa" },
                    { label: t("dashMonth"), count: dashboard.month.count, rev: dashboard.month.revenue, color: "#4ade80" },
                  ].map(k => (
                    <div key={k.label} style={S.statCard(k.color + "33")}>
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 8 }}>{k.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 2 }}>{k.count}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>{t("dashBookings")}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: k.color, marginTop: 6 }}>{fmt(k.rev)}</div>
                    </div>
                  ))}
                  <div style={S.statCard("#a78bfa33")}>
                    <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 2, marginBottom: 8 }}>{t("dashActiveDrivers")}</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.activeDrivers}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{t("dashMembers")}</div>
                  </div>
                  <div style={S.statCard("#f59e0b33")}>
                    <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>{t("dashTotalLeads")}</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.totalLeads}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{t("dashCaptured")}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div style={S.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>{t("dashBookingStatuses")}</div>
                    {dashboard.bookingStatuses.map(s => (
                      <div key={s.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ ...S.badge(statusColor[s.status] ?? "#1a1a1a"), color: statusText[s.status] ?? "#fff" }}>{s.status?.toUpperCase()}</span>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{Number(s.count)}</span>
                      </div>
                    ))}
                    {dashboard.bookingStatuses.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>{t("dashNoBookings")}</div>}
                  </div>
                  <div style={S.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>{t("dashLeadsBySource")}</div>
                    {dashboard.leadsBySource.map(s => (
                      <div key={s.lead_source} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#aaa" }}>{s.lead_source || "unknown"}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{Number(s.count)}</span>
                      </div>
                    ))}
                    {dashboard.leadsBySource.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>{t("dashNoLeads")}</div>}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>{t("dashRecentBookings")}</div>
                  {dashboard.recentBookings.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("dashNoBookings")}</div>
                  ) : dashboard.recentBookings.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{b.client_name || t("dashUnknownClient")} · {fmtDate(b.created_at)}</div>
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
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("noData")}</div>
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
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t("bookTitle")}</div>
                <div style={{ color: "#555", fontSize: 13 }}>{t("bookSubtitle")}</div>
              </div>
              <button onClick={loadBookings} style={S.btn()}>{t("refresh")}</button>
            </div>

            {loadingBookings ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : bookings.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ color: "#888" }}>{t("bookNoBookings")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bookings.map(b => (
                  <div key={b.id} style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{fmtDate(b.pickup_at)} · {b.vehicle_type} · {fmt(b.total_price)}</div>
                        {b.client_name && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{t("bookClient")}: {b.client_name} {b.client_phone && `· ${b.client_phone}`}</div>}
                        <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>ID: {b.id.slice(0, 8)}...</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 140 }}>
                        <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff", display: "block", marginBottom: 4 }}>📋 {b.status?.toUpperCase()}</span>
                        {b.dispatch_status && <span style={{ ...S.badge(dispatchColor[b.dispatch_status] ?? "#1a1a1a"), color: dispatchText[b.dispatch_status] ?? "#fff", display: "block", marginBottom: 4 }}>⚡ {b.dispatch_status?.replace(/_/g, " ").toUpperCase()}</span>}
                        <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b", fontSize: 11 }}>{b.payment_status?.toUpperCase()}</span>
                      </div>
                    </div>
                    {b.driver_name && <div style={{ fontSize: 12, color: "#4ade80", marginTop: 6 }}>🚗 {t("assign")}: {b.driver_name} ({b.driver_code})</div>}
                    {b.driver_reported && (
                      <div style={{ marginTop: 8, padding: "8px 12px", background: b.driver_report_action === "driver_rejected_incomplete_ride" ? "#3b0000" : "#3b1a00", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{b.driver_report_action === "driver_rejected_incomplete_ride" ? "🚫" : "⚠️"}</span>
                        <span style={{ fontSize: 12, color: b.driver_report_action === "driver_rejected_incomplete_ride" ? "#f87171" : "#f59e0b", fontWeight: 600 }}>
                          {b.driver_report_action === "driver_rejected_incomplete_ride"
                            ? "Conductor rechazó — datos incompletos. URGENTE: editar y reasignar."
                            : b.driver_report_action === "driver_requested_correction"
                            ? "Conductor solicitó corrección. Editar y notificar."
                            : "Conductor reportó datos incompletos. Editar booking."
                          }
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {b.status === "new" && <button onClick={() => handleBookingStatus(b.id, "accepted", "assigned")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#14532d", color: "#4ade80", border: "none" }}>{t("bookAccept")}</button>}
                      {["new", "offered", "accepted"].includes(b.status) && <button onClick={() => handleBookingStatus(b.id, "cancelled", "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#3b0000", color: "#f87171", border: "none" }}>{t("bookCancel")}</button>}
                      {b.status === "accepted" && <button onClick={() => handleBookingStatus(b.id, "in_progress", "assigned")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#3b1f5e", color: "#a78bfa", border: "none" }}>{t("bookInProgress")}</button>}
                      {b.status === "in_progress" && <button onClick={() => handleBookingStatus(b.id, "completed", "assigned")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#14532d", color: "#4ade80", border: "none" }}>{t("bookComplete")}</button>}
                      {(!b.dispatch_status || b.dispatch_status === "awaiting_source_owner") && <button onClick={() => handleDispatchStatus(b.id, "manual_dispatch_required")} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#3b1a00", color: "#f59e0b", border: "none" }}>⚡ Manual Dispatch</button>}
                      <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>✏️ Editar</button>
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
              <div style={{ fontSize: 20, fontWeight: 700 }}>{t("dispTitle")}</div>
              <div style={{ color: "#555", fontSize: 13 }}>{t("dispSubtitle")}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 12 }}>{t("dispFlowTitle")}</div>
                {[
                  { step: "1", label: t("dispStep1Label"), desc: t("dispStep1Desc"), color: "#c9a84c" },
                  { step: "2", label: t("dispStep2Label"), desc: t("dispStep2Desc"), color: "#60a5fa" },
                  { step: "3", label: t("dispStep3Label"), desc: t("dispStep3Desc"), color: "#f59e0b" },
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
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 12 }}>{t("dispRulesTitle")}</div>
                {[t("dispRule1"), t("dispRule2"), t("dispRule3"), t("dispRule4"), t("dispRule5")].map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#aaa" }}>
                    <span>{"⛔🔒👤📝✅"[i * 2]}{("⛔🔒👤📝✅")[i * 2 + 1]}</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* ---- Migration Banner ---- */}
            {dispatchData?.migrationRequired && (
              <div style={{ background: "#3b1a00", border: "1px solid #f59e0b", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>⚠️ Database Migration Required</div>
                  <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>The dispatch_status column needs to be added to the database. Run migration to fix state consistency.</div>
                </div>
                <button onClick={handleRunMigration} disabled={runningMigration} style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: runningMigration ? 0.5 : 1 }}>
                  {runningMigration ? "Running..." : "Run Migration"}
                </button>
              </div>
            )}
            {migrationMsg && <div style={{ background: migrationMsg.startsWith("✅") ? "#14532d" : "#3b0000", border: `1px solid ${migrationMsg.startsWith("✅") ? "#4ade80" : "#f87171"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: migrationMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{migrationMsg}</div>}

            {/* ---- Summary Counters ---- */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              {[
                { label: "Awaiting Source Owner", count: dispatchData?.awaitingSourceOwner?.length ?? 0, color: "#60a5fa" },
                { label: "Awaiting SLN Member", count: dispatchData?.awaitingSlnMember?.length ?? 0, color: "#a78bfa" },
                { label: "Manual Dispatch Required", count: dispatchData?.manualDispatchRequired?.length ?? 0, color: "#f59e0b" },
              ].map(k => (
                <div key={k.label} style={{ ...S.statCard(k.color + "33"), minWidth: 160 }}>
                  <div style={{ fontSize: 10, color: k.color, letterSpacing: 1, marginBottom: 6 }}>{k.label.toUpperCase()}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: k.count > 0 ? k.color : "#333" }}>{k.count}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>bookings</div>
                </div>
              ))}
            </div>

            {loadingDispatch ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : (
              <>
                {/* ---- Section 1: Awaiting Source Owner ---- */}
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa" }}>🔵 Awaiting Source Owner</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Offer sent to the driver who sourced this booking</div>
                    </div>
                    <span style={{ ...S.badge("#1e3a5f"), color: "#60a5fa" }}>{dispatchData?.awaitingSourceOwner?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.awaitingSourceOwner?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("dispNoPending")}</div>
                  ) : dispatchData.awaitingSourceOwner.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(b.pickup_at)} · {fmt(b.total_price)} · {b.client_name}</div>
                        <div style={{ fontSize: 11, color: "#333" }}>ID: {b.id.slice(0, 8)}...</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff" }}>{b.status?.toUpperCase()}</span>
                        <button onClick={() => handleDispatchStatus(b.id, "awaiting_sln_member")} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#3b1f5e", color: "#a78bfa", border: "none" }}>→ SLN Member</button>
                        <button onClick={() => handleDispatchStatus(b.id, "manual_dispatch_required")} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#3b1a00", color: "#f59e0b", border: "none" }}>→ Manual</button>
                        <button onClick={() => handleBookingStatus(b.id, "accepted", "assigned")} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#14532d", color: "#4ade80", border: "none" }}>{t("assign")}</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ---- Section 2: Awaiting SLN Member ---- */}
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>🟣 Awaiting SLN Member</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Offer sent to available SLN network members</div>
                    </div>
                    <span style={{ ...S.badge("#3b1f5e"), color: "#a78bfa" }}>{dispatchData?.awaitingSlnMember?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.awaitingSlnMember?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("dispNoPending")}</div>
                  ) : dispatchData.awaitingSlnMember.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(b.pickup_at)} · {fmt(b.total_price)} · {b.client_name}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleDispatchStatus(b.id, "manual_dispatch_required")} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#3b1a00", color: "#f59e0b", border: "none" }}>→ Manual</button>
                        <button onClick={() => handleBookingStatus(b.id, "accepted", "assigned")} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#14532d", color: "#4ade80", border: "none" }}>{t("assign")}</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ---- Section 3: Manual Dispatch Required ---- */}
                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>🟡 Manual Dispatch Required</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Requires manual admin assignment — no automatic offer possible</div>
                    </div>
                    <span style={{ ...S.badge("#3b1a00"), color: "#f59e0b" }}>{dispatchData?.manualDispatchRequired?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.manualDispatchRequired?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("dispNoPending")}</div>
                  ) : dispatchData.manualDispatchRequired.map(b => (() => {
                      // Capa 4: Dispatch Readiness Gate
                      const missingFields: string[] = []
                      if (!b.pickup_address?.trim()) missingFields.push("pickup address")
                      if (!b.dropoff_address?.trim()) missingFields.push("dropoff address")
                      if (!b.pickup_at) missingFields.push("pickup time")
                      if (!b.client_name?.trim()) missingFields.push("passenger name")
                      if (!b.client_phone?.trim()) missingFields.push("passenger phone")
                      const isReady = missingFields.length === 0
                      return (
                        <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #1a1a1a" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                              <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(b.pickup_at)} · {fmt(b.total_price)}</div>
                              {b.client_name && <div style={{ fontSize: 12, color: "#888" }}>{b.client_name} {b.client_phone && `· ${b.client_phone}`}</div>}
                              <div style={{ fontSize: 11, color: "#333" }}>ID: {b.id.slice(0, 8)}...</div>
                            </div>
                            <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff" }}>{b.status?.toUpperCase()}</span>
                          </div>
                          {!isReady && (
                            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#3b1a0020", border: "1px solid #dc262640", fontSize: 11, color: "#fca5a5" }}>
                              ⚠️ Incomplete booking — missing: {missingFields.join(", ")}. Edit before assigning.
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={() => {
                                if (!isReady) {
                                  setGlobalToast({ msg: `Cannot assign: missing ${missingFields.join(", ")}`, type: "error" })
                                  setTimeout(() => setGlobalToast(null), 4000)
                                  return
                                }
                                setAssignModal({ bookingId: b.id, pickup: b.pickup_zone || b.pickup_address, dropoff: b.dropoff_zone || b.dropoff_address })
                                setAssignMsg("")
                              }}
                              style={{ ...S.btn(), fontSize: 12, padding: "6px 14px", background: isReady ? "#14532d" : "#1a1a1a", color: isReady ? "#4ade80" : "#555", border: "none", cursor: isReady ? "pointer" : "not-allowed", opacity: isReady ? 1 : 0.6 }}
                            >
                              {isReady ? "✅" : "⚠️"} {t("assign")} Driver
                            </button>
                            <button onClick={() => handleBookingStatus(b.id, "cancelled", "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "6px 14px", background: "#3b0000", color: "#f87171", border: "none" }}>{t("bookCancel")}</button>
                            <button onClick={() => handleDispatchStatus(b.id, "awaiting_source_owner")} style={{ ...S.btn(), fontSize: 12, padding: "6px 14px" }}>↩ Back to Source</button>
                          </div>
                        </div>
                      )
                    })()
                  ))
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================
            4. DRIVERS
        ====================================================== */}
        {tab === "drivers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t("drvTitle")}</div>
                <div style={{ color: "#555", fontSize: 13 }}>{t("drvSubtitle")}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={loadDrivers} style={S.btn()}>{t("refresh")}</button>
                <button onClick={() => setShowAddDriver(!showAddDriver)} style={{ ...S.btn(true), background: "#c9a84c", color: "#000" }}>{t("drvAddDriver")}</button>
              </div>
            </div>

            {showAddDriver && (
              <div style={{ ...S.card, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{t("drvNewDriver")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "full_name", label: t("drvFullName"), placeholder: "John Smith" },
                    { key: "phone", label: t("drvPhone"), placeholder: "+14073830647" },
                    { key: "email", label: t("drvEmail"), placeholder: "driver@email.com" },
                    { key: "driver_code", label: t("drvCode"), placeholder: "JOHN001" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={S.label}>{f.label}</label>
                      <input value={(newDriver as any)[f.key]} onChange={e => setNewDriver(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={S.input} />
                    </div>
                  ))}
                </div>
                {addDriverMsg && <div style={{ marginTop: 12, fontSize: 13, color: addDriverMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{addDriverMsg}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={handleAddDriver} disabled={addingDriver} style={{ ...S.btn(true), background: "#c9a84c", color: "#000", opacity: addingDriver ? 0.5 : 1 }}>{addingDriver ? t("creating") : t("drvCreateDriver")}</button>
                  <button onClick={() => setShowAddDriver(false)} style={S.btn()}>{t("cancel")}</button>
                </div>
              </div>
            )}

            {loadingDrivers ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : drivers.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🚗</div>
                <div style={{ color: "#888" }}>{t("drvNoDrivers")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {drivers.map(d => (
                  <div key={d.id} style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{d.full_name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{t("drvCode")}: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{d.driver_code}</span> · {d.phone} {d.email && `· ${d.email}`}</div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{t("drvAdded")}: {fmtDate(d.created_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ ...S.badge(d.driver_status === "active" ? "#14532d" : "#1c1917"), color: d.driver_status === "active" ? "#4ade80" : "#78716c" }}>
                          {d.driver_status === "active" ? t("statusActive") : t("statusInactive")}
                        </span>
                        <button onClick={() => handleToggleStatus(d)} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px" }}>
                          {d.driver_status === "active" ? t("deactivate") : t("activate")}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${BASE_URL}/tablet/${d.driver_code}`) }} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px" }}>
                          {t("copyLink")}
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
            5. COMPANIES
        ====================================================== */}
        {tab === "companies" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{t("compTitle")}</div>
              <div style={{ color: "#555", fontSize: 13 }}>{t("compSubtitle")}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { name: "Sottovento Luxury Ride", type: t("compFlagship"), color: "#c9a84c", desc: lang === "en" ? "The core luxury transportation brand. All SLN operations are attributed to this brand by default." : "La marca principal de transporte de lujo. Todas las operaciones SLN se atribuyen a esta marca por defecto.", members: drivers.filter(d => d.driver_status === "active").length, url: BASE_URL },
                { name: "Alafyn Luxury by Sottovento Network", type: t("compPartner"), color: "#a78bfa", desc: lang === "en" ? "Partner brand operating under the Sottovento Network umbrella. Shared dispatch infrastructure." : "Marca asociada operando bajo el paraguas de Sottovento Network. Infraestructura de despacho compartida.", members: 0, url: null },
              ].map(c => (
                <div key={c.name} style={{ ...S.card, borderColor: c.color + "44" }}>
                  <div style={{ fontSize: 10, color: c.color, letterSpacing: 2, marginBottom: 8 }}>{c.type}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{c.desc}</div>
                  <div>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{t("compActiveMembers")}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.members}</div>
                  </div>
                  {c.url && <div style={{ marginTop: 12 }}><a href={c.url} target="_blank" rel="noreferrer" style={{ color: c.color, fontSize: 12 }}>{c.url}</a></div>}
                </div>
              ))}
            </div>
            <div style={{ ...S.card, borderColor: "#333" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 12 }}>{t("compAssignments")}</div>
              <div style={{ color: "#555", fontSize: 13 }}>
                {t("dashActiveDrivers").toLowerCase()} {drivers.filter(d => d.driver_status === "active").length} {t("compAssignmentsDesc")} <span style={{ color: "#c9a84c" }}>Sottovento Luxury Ride</span>. {t("compFuture")}
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
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t("leadsTitle")}</div>
                <div style={{ color: "#555", fontSize: 13 }}>{t("leadsSubtitle")}</div>
              </div>
              <button onClick={loadLeads} style={S.btn()}>{t("refresh")}</button>
            </div>

            {loadingLeads ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : leads.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ color: "#888" }}>{t("leadsNoLeads")}</div>
              </div>
            ) : (
              <>
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
                          <div style={{ fontSize: 12, color: "#888" }}>{l.phone && `${l.phone} · `}{l.email && `${l.email} · `}<span style={{ color: "#c9a84c" }}>{l.lead_source || "tablet"}</span></div>
                          {l.interested_package && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{t("leadsPackage")}: {l.interested_package}</div>}
                          {l.driver_code && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{t("leadsDriver")}: {l.driver_code}</div>}
                          <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>{fmtDate(l.created_at)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ ...S.badge(statusColor[l.status] ?? "#1a1a1a"), color: statusText[l.status] ?? "#fff" }}>{l.status?.toUpperCase()}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            {l.status === "new" && <button onClick={() => handleLeadStatus(l.id, "contacted")} style={{ ...S.btn(), fontSize: 11, padding: "4px 8px" }}>{t("leadsContact")}</button>}
                            {l.status !== "booked" && l.status !== "lost" && <button onClick={() => handleLeadStatus(l.id, "booked")} style={{ ...S.btn(), fontSize: 11, padding: "4px 8px", background: "#14532d", color: "#4ade80", border: "none" }}>{t("leadsBooked")}</button>}
                            {l.status !== "lost" && <button onClick={() => handleLeadStatus(l.id, "lost")} style={{ ...S.btn(), fontSize: 11, padding: "4px 8px", background: "#3b0000", color: "#f87171", border: "none" }}>{t("leadsLost")}</button>}
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
                <div style={{ fontSize: 20, fontWeight: 700 }}>👑 {t("crownTitle")}</div>
                <div style={{ color: "#555", fontSize: 13 }}>{t("crownSubtitle")}</div>
              </div>
              <button onClick={loadCrown} style={S.btn()}>{t("refresh")}</button>
            </div>

            {loadingCrown ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : crownData ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: t("crownToday"), value: crownData.stats.today, color: "#c9a84c" },
                    { label: t("crownWeek"), value: crownData.stats.thisWeek, color: "#60a5fa" },
                    { label: t("crownMonth"), value: crownData.stats.thisMonth, color: "#4ade80" },
                    { label: t("crownTotal"), value: crownData.stats.total, color: "#a78bfa" },
                    { label: t("crownConverted"), value: crownData.stats.converted, color: "#f59e0b" },
                  ].map(k => (
                    <div key={k.label} style={S.statCard(k.color + "33")}>
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{k.value}</div>
                    </div>
                  ))}
                </div>
                {crownData.stats.total > 0 && (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{t("crownConvRate")}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#c9a84c" }}>{Math.round((crownData.stats.converted / crownData.stats.total) * 100)}%</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{t("crownConvDesc")}</div>
                  </div>
                )}
                <div style={S.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>{t("crownRecentTitle")}</div>
                  {crownData.recentLeads.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("crownNoLeads")}</div>
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
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("crownFailed")}</div>
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
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t("finTitle")}</div>
                <div style={{ color: "#555", fontSize: 13 }}>{t("finSubtitle")}</div>
              </div>
              <button onClick={loadFinance} style={S.btn()}>{t("refresh")}</button>
            </div>

            {loadingFinance ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : finance ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: t("finTotalRevenue"), value: fmt(finance.totalRevenue), color: "#c9a84c" },
                    { label: t("finMonthRevenue"), value: fmt(finance.monthRevenue), color: "#4ade80" },
                    { label: t("finDriverEarnings"), value: fmt(finance.commissions.totalDriverEarnings), color: "#60a5fa" },
                    { label: t("finPlatformEarnings"), value: fmt(finance.commissions.totalPlatformEarnings), color: "#a78bfa" },
                  ].map(k => (
                    <div key={k.label} style={S.statCard(k.color + "33")}>
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>{t("finTopDrivers")}</div>
                  {finance.topDrivers.filter(d => Number(d.executor_earnings) + Number(d.source_earnings) > 0).length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("finNoCommissions")}</div>
                  ) : finance.topDrivers.filter(d => Number(d.executor_earnings) + Number(d.source_earnings) > 0).map((d, i) => (
                    <div key={d.driver_code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#c9a84c22", color: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.full_name}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{d.driver_code} · {Number(d.rides)} {t("finRides")}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{fmt(Number(d.executor_earnings) + Number(d.source_earnings))}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{t("finTotalEarnings")}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 14 }}>{t("finRecentCommissions")}</div>
                  {finance.recentCommissions.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("finNoRecent")}</div>
                  ) : finance.recentCommissions.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.executor_name || t("finUnassigned")}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{t("finBooking")}: {c.booking_id?.slice(0, 8)}... · {fmtDate(c.created_at)}</div>
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
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("finFailed")}</div>
            )}
          </div>
        )}

        {/* ======================================================
            9. SETTINGS
        ====================================================== */}
        {tab === "settings" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{t("settTitle")}</div>
              <div style={{ color: "#555", fontSize: 13 }}>{t("settSubtitle")}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>{t("settDispatch")}</div>
                {[
                  [t("settOfferTimeout"), "120 seconds"],
                  [t("settPoolTimeout"), "90 seconds"],
                  [t("settMaxRounds"), "3 rounds"],
                  [t("settFallback"), t("settFallbackVal")],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>{t("settCommissions")}</div>
                {[[t("settExecutor"), "80%"], [t("settSource"), "10%"], [t("settPlatform"), "10%"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{k}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>{t("settCrown")}</div>
                {[
                  [t("settDiscountCode"), "CROWN10 (10% OFF)"],
                  [t("settReferral"), "$10 OFF for friend"],
                  [t("settPhotoStorage"), "Vercel Blob (public)"],
                  [t("settEmailProvider"), "Resend"],
                  [t("settDomain"), "sottoventoluxuryride.com ✅"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{k}</span>
                    <span style={{ fontSize: 13 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>{t("settInfra")}</div>
                {[
                  [t("settHosting"), "Vercel (Hobby)"],
                  [t("settDatabase"), "Neon (Postgres)"],
                  [t("settSMS"), "Twilio ⚠️ Pending"],
                  [t("settPayments"), "Stripe"],
                  [t("settFramework"), "Next.js 16.1"],
                  [t("settDomain"), "sottoventoluxuryride.com"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{k}</span>
                    <span style={{ fontSize: 13 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Language Settings Card */}
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>LANGUAGE / IDIOMA</div>
              <div style={{ display: "flex", gap: 10 }}>
                {(["en", "es"] as Lang[]).map(l => (
                  <button key={l} onClick={() => { setLang(l); saveLang(l) }}
                    style={{ padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: lang === l ? "#c9a84c" : "#1a1a1a", color: lang === l ? "#000" : "#888", border: lang === l ? "none" : "1px solid #333" }}>
                    {l === "en" ? "🇺🇸 English" : "🇪🇸 Español"}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#555" }}>
                {lang === "en" ? "Language preference is saved automatically." : "La preferencia de idioma se guarda automáticamente."}
              </div>
            </div>

            {/* Dispatch Reclassify — Emergency Fix */}
            <div style={{ ...S.card, marginTop: 16, border: "1px solid #1e3a5f" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa", marginBottom: 8 }}>⚡ DISPATCH STATE RECLASSIFY</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Fixes bookings incorrectly classified as <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, color: "#f87171" }}>not_required</code>. Moves all active SLN bookings to the correct dispatch bucket. Safe to run multiple times.</div>
              <button onClick={handleRunReclassify} disabled={runningReclassify} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: runningReclassify ? 0.5 : 1 }}>
                {runningReclassify ? "⏳ Reclassifying..." : "🔄 Fix Dispatch Classification"}
              </button>
              {reclassifyMsg && <div style={{ marginTop: 12, padding: "10px 14px", background: reclassifyMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 12, color: reclassifyMsg.startsWith("✅") ? "#4ade80" : "#f87171", wordBreak: "break-all" }}>{reclassifyMsg}</div>}
            </div>

            {/* Database Migration */}
            <div style={{ ...S.card, marginTop: 16, border: "1px solid #3b1a00" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 12 }}>🗄️ DATABASE MIGRATION</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Run database migrations to add new columns (e.g., <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, color: "#c9a84c" }}>dispatch_status</code>) and sync state models. Safe to run multiple times.</div>
              <button onClick={handleRunMigration} disabled={runningMigration} style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: runningMigration ? 0.5 : 1 }}>
                {runningMigration ? "⏳ Running Migration..." : "▶️ Run Migration"}
              </button>
              {migrationMsg && <div style={{ marginTop: 12, padding: "10px 14px", background: migrationMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 13, color: migrationMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{migrationMsg}</div>}
            </div>

            {/* SMS Test */}
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>{t("settSMSTest")}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>{t("settPhoneNumber")}</label>
                  <input type="tel" placeholder="+14073830647" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} style={S.input} />
                </div>
                <button onClick={handleSendTestSMS} disabled={smsSending || !smsPhone} style={{ ...S.btn(!!smsPhone), background: smsPhone ? "#c9a84c" : "#333", color: smsPhone ? "#000" : "#666", padding: "12px 20px", opacity: smsSending ? 0.5 : 1 }}>
                  {smsSending ? t("settSending") : t("settSendSMS")}
                </button>
              </div>
              {smsResult && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: smsResult.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 13, color: smsResult.startsWith("✅") ? "#4ade80" : "#f87171", wordBreak: "break-all" }}>
                  {smsResult}
                </div>
              )}
              <div style={{ marginTop: 16, fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                <div>{t("settSMSNumber")}: <span style={{ color: "#c9a84c" }}>+1 (689) 264-6565</span></div>
                <div>{t("settSMSService")}: <span style={{ color: "#c9a84c" }}>Sottovento Driver Alerts</span></div>
                <div>{t("settA2P")}: <span style={{ color: "#f59e0b" }}>Registered — Pending vetting</span></div>
                <div>{t("settTollFree")} +1 (888) 997-5436: <span style={{ color: "#f59e0b" }}>In Review</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            PARTNER SYSTEM
        ====================================================== */}
        {tab === "partners" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Partner Network</div>
                <div style={{ color: "#555", fontSize: 13 }}>Hotels, Valets, Influencers, Airbnb, Staff</div>
              </div>
              <button onClick={() => { loadPartners(); loadPartnerCompanies(); loadPartnerInvites() }} style={S.btn()}>↺ Refresh</button>
            </div>

            {/* Partner Migration */}
            <div style={{ ...S.card, marginBottom: 20, borderColor: "#c9a84c33" }}>
              <div style={{ fontSize: 12, color: "#c9a84c", letterSpacing: 2, marginBottom: 8 }}>SETUP — RUN ONCE</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Create Partner System tables in the database. Safe to run multiple times.</div>
              <button onClick={handleRunPartnerMigration} disabled={runningPartnerMig} style={{ background: "#c9a84c", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: runningPartnerMig ? 0.5 : 1 }}>
                {runningPartnerMig ? "⏳ Running..." : "▶️ Run Partner Migration"}
              </button>
              {partnerMigMsg && <div style={{ marginTop: 10, padding: "10px 14px", background: partnerMigMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 12, color: partnerMigMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{partnerMigMsg}</div>}
            </div>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto" }}>
              {(["list", "companies", "invites", "earnings", "compliance"] as const).map(pt => (
                <button key={pt} onClick={() => setPartnerTab(pt)}
                  style={{ background: partnerTab === pt ? "#c9a84c" : "#1a1a1a", color: partnerTab === pt ? "#000" : "#888", border: "1px solid #333", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                  {pt === "list" ? "👥 Partners" : pt === "companies" ? "🏢 Companies" : pt === "invites" ? "✉️ Invites" : pt === "earnings" ? "💵 Earnings" : "📋 Compliance"}
                </button>
              ))}
            </div>

            {/* PARTNERS LIST */}
            {partnerTab === "list" && (
              <div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{partners.length} partners</div>
                {loadingPartners ? <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Loading...</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {partners.length === 0 && <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40 }}>No partners yet. Run migration and create invites.</div>}
                    {partners.map(p => (
                      <div key={p.id} style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                          <div style={{ color: "#888", fontSize: 12 }}>{p.type?.toUpperCase()} · {p.email ?? p.phone ?? "—"}</div>
                          {p.company_name && <div style={{ color: "#c9a84c", fontSize: 11 }}>🏢 {p.company_name}</div>}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "#888" }}>REF CODE</div>
                          <div style={{ fontFamily: "monospace", color: "#c9a84c", fontWeight: 700, fontSize: 14 }}>{p.ref_code}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "#888" }}>COMMISSION</div>
                          <div style={{ fontWeight: 700, color: "#4ade80" }}>{Math.round(Number(p.commission_rate) * 100)}%</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "#888" }}>MTD EARNINGS</div>
                          <div style={{ fontWeight: 700, color: "#c9a84c" }}>${Number(p.earnings_mtd ?? 0).toFixed(2)}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "#888" }}>BOOKINGS</div>
                          <div style={{ fontWeight: 700 }}>{p.total_bookings ?? 0}</div>
                        </div>
                        <div>
                          <span style={{ ...S.badge(p.status === "active" ? "#052e16" : p.status === "invited" ? "#1e3a5f" : "#3b0000"), color: p.status === "active" ? "#4ade80" : p.status === "invited" ? "#60a5fa" : "#f87171" }}>
                            {p.status?.toUpperCase()}
                          </span>
                        </div>
                        <a href={`https://www.sottoventoluxuryride.com/partner/${p.ref_code}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: "#c9a84c", textDecoration: "none" }}>View Panel →</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMPANIES */}
            {partnerTab === "companies" && (
              <div>
                {/* Add Company Form */}
                <div style={{ ...S.card, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>Add Partner Company</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={S.label}>Legal Name</label><input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} placeholder="Marriott International Inc." style={S.input} /></div>
                    <div><label style={S.label}>Brand Name</label><input value={companyForm.brand_name} onChange={e => setCompanyForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="JW Marriott Orlando" style={S.input} /></div>
                    <div><label style={S.label}>Company Commission</label><input type="number" step="0.01" value={companyForm.commission_split_company} onChange={e => setCompanyForm(f => ({ ...f, commission_split_company: e.target.value }))} placeholder="0.10" style={S.input} /></div>
                    <div><label style={S.label}>Staff Commission</label><input type="number" step="0.01" value={companyForm.commission_split_staff} onChange={e => setCompanyForm(f => ({ ...f, commission_split_staff: e.target.value }))} placeholder="0.05" style={S.input} /></div>
                  </div>
                  <button onClick={handleAddCompany} disabled={addingCompany || !companyForm.name || !companyForm.brand_name} style={{ background: "#c9a84c", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: addingCompany ? 0.5 : 1 }}>
                    {addingCompany ? "Adding..." : "+ Add Company"}
                  </button>
                  {companyMsg && <div style={{ marginTop: 10, padding: "10px 14px", background: companyMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 12, color: companyMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{companyMsg}</div>}
                </div>

                {/* Companies List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {partnerCompanies.length === 0 && <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40 }}>No companies yet.</div>}
                  {partnerCompanies.map(c => (
                    <div key={c.id} style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.brand_name}</div>
                        <div style={{ color: "#888", fontSize: 12 }}>{c.name}</div>
                      </div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>MASTER CODE</div><div style={{ fontFamily: "monospace", color: "#c9a84c", fontWeight: 700 }}>{c.master_ref_code}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>STAFF</div><div style={{ fontWeight: 700 }}>{c.staff_count ?? 0}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>MTD</div><div style={{ fontWeight: 700, color: "#c9a84c" }}>${Number(c.earnings_mtd ?? 0).toFixed(2)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>LIFETIME</div><div style={{ fontWeight: 700 }}>${Number(c.total_earnings ?? 0).toFixed(2)}</div></div>
                      <span style={{ ...S.badge("#052e16"), color: "#4ade80" }}>{c.status?.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INVITES */}
            {partnerTab === "invites" && (
              <div>
                {/* Send Invite Form */}
                <div style={{ ...S.card, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 16 }}>Send Partner Invite</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>Partner Name</label>
                      <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" style={S.input} />
                    </div>
                    <div>
                      <label style={S.label}>Type</label>
                      <select value={inviteForm.type} onChange={e => setInviteForm(f => ({ ...f, type: e.target.value }))} style={{ ...S.input, color: "#fff" }}>
                        <option value="hotel">Hotel</option>
                        <option value="valet">Valet</option>
                        <option value="airbnb">Airbnb Host</option>
                        <option value="influencer">Influencer</option>
                        <option value="staff">Staff</option>
                        <option value="individual">Individual</option>
                      </select>
                    </div>
                    <div><label style={S.label}>Email</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="partner@hotel.com" style={S.input} /></div>
                    <div><label style={S.label}>Commission Rate</label><input type="number" step="0.01" min="0" max="1" value={inviteForm.commission_rate} onChange={e => setInviteForm(f => ({ ...f, commission_rate: e.target.value }))} placeholder="0.10" style={S.input} /></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer" }}>
                      <input type="checkbox" checked={inviteForm.send_email} onChange={e => setInviteForm(f => ({ ...f, send_email: e.target.checked }))} />
                      Send email invitation
                    </label>
                  </div>
                  <button onClick={handleSendInvite} disabled={sendingInvite || !inviteForm.type} style={{ background: "#c9a84c", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: sendingInvite ? 0.5 : 1 }}>
                    {sendingInvite ? "Sending..." : "✉️ Send Invite"}
                  </button>
                  {inviteMsg && <div style={{ marginTop: 10, padding: "10px 14px", background: inviteMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 12, color: inviteMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{inviteMsg}</div>}
                  {inviteLink && (
                    <div style={{ marginTop: 12, padding: "12px 14px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #c9a84c33" }}>
                      <div style={{ fontSize: 11, color: "#c9a84c", marginBottom: 6 }}>INVITE LINK — Share this with the partner:</div>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#fff", wordBreak: "break-all" }}>{inviteLink}</div>
                      <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ marginTop: 8, background: "#333", border: "none", color: "#c9a84c", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>Copy Link</button>
                    </div>
                  )}
                </div>

                {/* Invites List */}
                <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{partnerInvites.length} invites</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {partnerInvites.length === 0 && <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40 }}>No invites yet.</div>}
                  {partnerInvites.map(inv => (
                    <div key={inv.id} style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{(inv.prefilled_data as any)?.name ?? inv.email ?? inv.phone ?? "Anonymous"}</div>
                        <div style={{ color: "#888", fontSize: 12 }}>{inv.type?.toUpperCase()} · {inv.email ?? "—"}</div>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>{inv.token?.substring(0, 16)}...</div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>COMMISSION</div><div style={{ fontWeight: 700, color: "#4ade80" }}>{Math.round(Number(inv.commission_rate) * 100)}%</div></div>
                      <span style={{ ...S.badge(inv.status === "completed" ? "#052e16" : inv.status === "opened" ? "#1e3a5f" : inv.status === "expired" ? "#3b0000" : "#1a1a1a"), color: inv.status === "completed" ? "#4ade80" : inv.status === "opened" ? "#60a5fa" : inv.status === "expired" ? "#f87171" : "#888" }}>
                        {inv.status?.toUpperCase()}
                      </span>
                      <button onClick={() => navigator.clipboard.writeText(`https://www.sottoventoluxuryride.com/partner/invite/${inv.token}`)} style={{ background: "#1a1a1a", border: "1px solid #333", color: "#c9a84c", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>Copy Link</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EARNINGS */}
            {partnerTab === "earnings" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "#888" }}>{partnerEarnings.length} records</div>
                  <a href="/api/admin/partner-earnings?export=csv" style={{ background: "#1a1a1a", border: "1px solid #333", color: "#c9a84c", borderRadius: 8, padding: "8px 16px", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>⬇ Export CSV</a>
                </div>
                {partnerEarnings.length === 0 && <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40 }}>No earnings yet. Earnings are created when bookings are completed.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {partnerEarnings.map(e => (
                    <div key={e.id} style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{e.partner_name}</div>
                        <div style={{ color: "#888", fontSize: 12 }}>{e.ref_code} · {e.pickup_address ?? "—"}</div>
                      </div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>GROSS</div><div style={{ fontWeight: 700 }}>${Number(e.gross_amount).toFixed(2)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>COMMISSION</div><div style={{ fontWeight: 700, color: "#c9a84c" }}>${Number(e.commission_amount).toFixed(2)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>RATE</div><div style={{ fontWeight: 700 }}>{Math.round(Number(e.commission_rate) * 100)}%</div></div>
                      <span style={{ ...S.badge(e.status === "paid" ? "#052e16" : e.status === "approved" ? "#1e3a5f" : e.status === "void" ? "#3b0000" : "#1a1a1a"), color: e.status === "paid" ? "#4ade80" : e.status === "approved" ? "#60a5fa" : e.status === "void" ? "#f87171" : "#888" }}>
                        {e.status?.toUpperCase()}
                      </span>
                      <div style={{ fontSize: 11, color: "#555" }}>{fmtDate(e.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPLIANCE (1099) */}
            {partnerTab === "compliance" && (
              <div>
                <div style={{ ...S.card, marginBottom: 20, borderColor: "#f59e0b33" }}>
                  <div style={{ fontSize: 12, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>1099 COMPLIANCE</div>
                  <div style={{ fontSize: 13, color: "#888" }}>Partners with YTD earnings ≥ $600 require a W-9 before year-end. Track W-9 status below.</div>
                </div>
                {partnerCompliance.length === 0 && <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40 }}>No compliance data yet.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {partnerCompliance.map(c => (
                    <div key={c.id} style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", borderColor: c.requires_w9 && c.w9_status !== "verified" ? "#f59e0b44" : "#222" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                        <div style={{ color: "#888", fontSize: 12 }}>{c.email ?? "—"} · {c.type?.toUpperCase()}</div>
                        {c.legal_name && <div style={{ color: "#555", fontSize: 11 }}>Legal: {c.legal_name}</div>}
                      </div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>YTD EARNINGS</div><div style={{ fontWeight: 700, color: Number(c.ytd_earnings) >= 600 ? "#f59e0b" : "#4ade80" }}>${Number(c.ytd_earnings).toFixed(2)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#888" }}>TAX ID TYPE</div><div style={{ fontWeight: 600 }}>{c.tax_id_type ?? "—"}</div></div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#888" }}>W-9 STATUS</div>
                        <span style={{ ...S.badge(c.w9_status === "verified" ? "#052e16" : c.w9_status === "submitted" ? "#1e3a5f" : "#3b1a00"), color: c.w9_status === "verified" ? "#4ade80" : c.w9_status === "submitted" ? "#60a5fa" : "#f59e0b" }}>
                          {(c.w9_status ?? "PENDING")?.toUpperCase()}
                        </span>
                      </div>
                      {c.requires_w9 && c.w9_status !== "verified" && (
                        <span style={{ ...S.badge("#3b1a00"), color: "#f59e0b" }}>⚠ W-9 REQUIRED</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ======================================================
          ASSIGN DRIVER MODAL
      ====================================================== */}
      {assignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#111", border: "1px solid #333", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Assign Driver</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{assignModal.pickup} → {assignModal.dropoff}</div>

            {assignMsg && (
              <div style={{ padding: "10px 14px", background: assignMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 13, color: assignMsg.startsWith("✅") ? "#4ade80" : "#f87171", marginBottom: 16 }}>{assignMsg}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
              {drivers.filter(d => d.driver_status === "active").length === 0 && (
                <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 20 }}>No active drivers available</div>
              )}
              {drivers.filter(d => d.driver_status === "active").map(driver => (
                <button
                  key={driver.id}
                  onClick={() => handleAssignDriver(assignModal.bookingId, driver.id)}
                  disabled={assigningDriver}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, cursor: assigningDriver ? "not-allowed" : "pointer", opacity: assigningDriver ? 0.6 : 1, textAlign: "left" }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{driver.full_name}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{driver.driver_code} · {driver.phone}</div>
                  </div>
                  <span style={{ background: "#14532d", color: "#4ade80", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ACTIVE</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setAssignModal(null); setAssignMsg("") }} style={{ ...S.btn(), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          EDIT BOOKING MODAL
      ====================================================== */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#111", border: "1px solid #1e3a5f", borderRadius: 16, padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>✏️ Editar Reserva</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>ID: {editModal.id.slice(0, 8)}...</div>
              </div>
              <button onClick={() => { setEditModal(null); setEditMsg("") }} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Client Info */}
              <div style={{ fontSize: 11, color: "#60a5fa", letterSpacing: 2, marginBottom: 4 }}>CLIENTE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>Nombre del Cliente</label>
                  <input value={editFields.client_name ?? ""} onChange={e => setEditFields(f => ({ ...f, client_name: e.target.value }))} style={S.input} placeholder="John Doe" />
                </div>
                <div>
                  <label style={S.label}>Teléfono del Cliente</label>
                  <input value={editFields.client_phone ?? ""} onChange={e => setEditFields(f => ({ ...f, client_phone: e.target.value }))} style={S.input} placeholder="+14073830647" />
                </div>
              </div>

              {/* Ride Info */}
              <div style={{ fontSize: 11, color: "#60a5fa", letterSpacing: 2, marginTop: 4, marginBottom: 4 }}>VIAJE</div>
              <div>
                <label style={S.label}>Fecha y Hora de Recogida</label>
                <input type="datetime-local" value={editFields.pickup_at ?? ""} onChange={e => setEditFields(f => ({ ...f, pickup_at: e.target.value }))} style={S.input} />
              </div>
              <div>
                <label style={S.label}>Dirección de Recogida</label>
                <input value={editFields.pickup_address ?? ""} onChange={e => setEditFields(f => ({ ...f, pickup_address: e.target.value }))} style={S.input} placeholder="123 Main St, Orlando, FL" />
              </div>
              <div>
                <label style={S.label}>Dirección de Destino</label>
                <input value={editFields.dropoff_address ?? ""} onChange={e => setEditFields(f => ({ ...f, dropoff_address: e.target.value }))} style={S.input} placeholder="MCO Airport, Terminal B" />
              </div>

              {/* Flight Info */}
              <div style={{ fontSize: 11, color: "#60a5fa", letterSpacing: 2, marginTop: 4, marginBottom: 4 }}>VUELO</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>Número de Vuelo</label>
                  <input value={editFields.flight_number ?? ""} onChange={e => setEditFields(f => ({ ...f, flight_number: e.target.value }))} style={S.input} placeholder="AA1234" />
                </div>
                <div>
                  <label style={S.label}>Tipo de Vehículo</label>
                  <select value={editFields.vehicle_type ?? ""} onChange={e => setEditFields(f => ({ ...f, vehicle_type: e.target.value }))} style={{ ...S.input, cursor: "pointer" }}>
                    <option value="">-- Seleccionar --</option>
                    <option value="Luxury Sedan">Luxury Sedan</option>
                    <option value="Luxury SUV">Luxury SUV</option>
                    <option value="Sprinter">Sprinter</option>
                  </select>
                </div>
              </div>

              {/* Passengers & Luggage */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>Pasajeros</label>
                  <input type="number" min="1" max="20" value={editFields.passengers ?? ""} onChange={e => setEditFields(f => ({ ...f, passengers: e.target.value }))} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Equipaje</label>
                  <input value={editFields.luggage ?? ""} onChange={e => setEditFields(f => ({ ...f, luggage: e.target.value }))} style={S.input} placeholder="2 maletas grandes" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={S.label}>Notas Especiales</label>
                <textarea value={editFields.notes ?? ""} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} style={{ ...S.input, height: 80, resize: "vertical" }} placeholder="Instrucciones especiales para el conductor..." />
              </div>

              {/* Price */}
              <div>
                <label style={S.label}>Precio Total ($)</label>
                <input type="number" step="0.01" value={editFields.total_price ?? ""} onChange={e => setEditFields(f => ({ ...f, total_price: e.target.value }))} style={S.input} placeholder="75.00" />
              </div>
            </div>

            {editMsg && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: editMsg.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 13, color: editMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{editMsg}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setEditModal(null); setEditMsg("") }} style={{ ...S.btn(), flex: 1 }}>Cancelar</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} style={{ ...S.btn(true), flex: 2, opacity: savingEdit ? 0.6 : 1 }}>
                {savingEdit ? "⏳ Guardando..." : "💾 Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
