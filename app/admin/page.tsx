"use client"
import React, { useState, useEffect, useCallback } from "react"
import { type Lang, type TranslationKey, getTranslation, saveLang, loadLang } from "@/lib/i18n"

// ============================================================
// /admin — Sottovento Luxury Network (SLN) Admin Panel
// 9 Modules + i18n EN/ES + iOS Safe Area
// ============================================================

const ADMIN_PASSWORD = "Sottovento.20"
const BASE_URL = "https://www.sottoventoluxuryride.com"

type Tab = "dashboard" | "bookings" | "dispatch" | "drivers" | "companies" | "leads" | "crown" | "finance" | "partners" | "settings"

// ---- TYPES ----
type Driver = {
  id: string; driver_code: string; full_name: string; phone: string; email: string;
  driver_status: string; is_eligible: boolean; created_at: string;
  // Scoring Engine V1 — Provisional Driver Logic
  driver_score_total?: number;
  driver_score_tier?: string;
  provisional_started_at?: string;
  provisional_ends_at?: string;
  provisional_completed_rides?: number;
  provisional_exit_reason?: string;
  is_eligible_for_premium_dispatch?: boolean;
  is_eligible_for_airport_priority?: boolean;
  rides_completed?: number;
  on_time_rides?: number;
  late_cancel_count?: number;
  complaint_count?: number;
  contribution_bonus_granted?: boolean;
}
type Booking = { id: string; booking_ref?: string; pickup_zone: string; dropoff_zone: string; pickup_address: string; dropoff_address: string; pickup_at: string; vehicle_type: string; total_price: number; status: string; dispatch_status?: string; readiness_status?: string; payment_status: string; created_at: string; updated_at?: string; client_name?: string; client_phone?: string; client_email?: string; assigned_driver_id?: string; driver_name?: string; driver_code?: string; driver_phone?: string; flight_number?: string; notes?: string; passengers?: number; passenger_count?: number; luggage?: string; luggage_count?: number; lead_source?: string; captured_by_driver_code?: string; cancellation_reason?: string; cancelled_by?: string; booking_origin?: string; driver_reported?: boolean; driver_report_action?: string }
type Lead = { id: string; lead_source: string; full_name: string; phone: string; email: string; interested_package: string; status: string; driver_code: string; tablet_code: string; created_at: string; driver_name?: string }
type DashboardData = { today: { count: number; revenue: number }; week: { count: number; revenue: number }; month: { count: number; revenue: number }; activeDrivers: number; totalLeads: number; needsReview: number; leadsBySource: { lead_source: string; count: number }[]; bookingStatuses: { status: string; count: number }[]; recentBookings: Booking[] }
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

const statusColor: Record<string, string> = { new: "#1e3a5f", needs_review: "#3b2200", ready_for_dispatch: "#0c2340", assigned: "#14532d", driver_confirmed: "#0d3320", in_progress: "#3b1f5e", completed: "#0d2a0d", archived: "#1a1a1a", cancelled: "#3b0000", driver_issue: "#3b0000", offered: "#1e3a5f", accepted: "#14532d", contacted: "#1e3a5f", booked: "#14532d", lost: "#3b0000", pending: "#1a2a1a", pending_payment: "#2a1a00", pending_dispatch: "#0c2340" }
const statusText: Record<string, string> = { new: "#60a5fa", needs_review: "#f59e0b", ready_for_dispatch: "#38bdf8", assigned: "#4ade80", driver_confirmed: "#86efac", in_progress: "#a78bfa", completed: "#4ade80", archived: "#555", cancelled: "#f87171", driver_issue: "#ef4444", offered: "#60a5fa", accepted: "#4ade80", contacted: "#60a5fa", booked: "#4ade80", lost: "#f87171", pending: "#aaa", pending_payment: "#f59e0b", pending_dispatch: "#38bdf8" }
const dispatchColor: Record<string, string> = { not_required: "#1a1a1a", awaiting_source_owner: "#1e3a5f", awaiting_sln_member: "#3b1f5e", manual_dispatch_required: "#3b1a00", assigned: "#14532d", expired: "#3b0000", cancelled: "#3b0000" }
const dispatchText: Record<string, string> = { not_required: "#444", awaiting_source_owner: "#60a5fa", awaiting_sln_member: "#a78bfa", manual_dispatch_required: "#f59e0b", assigned: "#4ade80", expired: "#f87171", cancelled: "#f87171" }

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtDate(s: string) { try { return new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) } catch { return s } }

// ============================================================
// COMPANIES FLEET DASHBOARD — Phase 2
// Affiliate Company Fleet Dashboard Layer
// Read-only analytics visibility for partner_company owners
// ============================================================
function CompaniesFleetDashboard({ partnerCompanies, lang }: { partnerCompanies: any[]; lang: string }) {
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null)
  const [fleetData, setFleetData] = React.useState<any | null>(null)
  const [reputationData, setReputationData] = React.useState<any | null>(null)
  const [loadingFleet, setLoadingFleet] = React.useState(false)
  const [fleetError, setFleetError] = React.useState("")
  const [activeSection, setActiveSection] = React.useState<"health" | "drivers" | "vehicles" | "revenue" | "reputation">("health")

  const loadFleetData = React.useCallback(async (companyId: string) => {
    setLoadingFleet(true); setFleetError(""); setFleetData(null); setReputationData(null)
    try {
      const [fleetRes, repRes] = await Promise.all([
        fetch(`/api/admin/companies/${companyId}/fleet-analytics`),
        fetch(`/api/admin/companies/${companyId}/reputation-score`),
      ])
      if (fleetRes.ok) setFleetData(await fleetRes.json())
      else setFleetError("Failed to load fleet analytics")
      if (repRes.ok) setReputationData(await repRes.json())
    } catch (e: any) { setFleetError(e.message) }
    finally { setLoadingFleet(false) }
  }, [])

  React.useEffect(() => {
    if (selectedCompanyId) loadFleetData(selectedCompanyId)
  }, [selectedCompanyId, loadFleetData])

  const tierColor = (tier: string) => {
    if (tier === "PLATINUM") return "#e5e4e2"
    if (tier === "GOLD") return "#c9a84c"
    if (tier === "SILVER") return "#9ca3af"
    return "#f87171"
  }

  const permitBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      approved: { bg: "#14532d", text: "#4ade80" },
      pending:  { bg: "#3b2200", text: "#f59e0b" },
      expired:  { bg: "#3b0000", text: "#f87171" },
      rejected: { bg: "#3b0000", text: "#f87171" },
    }
    const c = colors[status] ?? { bg: "#1a1a1a", text: "#888" }
    return <span style={{ ...S.badge(c.bg), color: c.text, fontSize: 10 }}>{status?.toUpperCase() ?? "—"}</span>
  }

  const alertSeverityColor = (s: string) => s === "critical" ? "#f87171" : s === "warning" ? "#f59e0b" : "#60a5fa"

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>🏢 {lang === "es" ? "Red de Empresas Afiliadas" : "Affiliate Company Network"}</div>
          <div style={{ color: "#555", fontSize: 13 }}>{lang === "es" ? "Panel de flota y analítica por empresa — Solo lectura" : "Fleet analytics by company — Read-only visibility layer"}</div>
        </div>
        <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 1 }}>SOTTOVENTO LUXURY NETWORK</div>
      </div>

      {/* Company selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 24 }}>
        {partnerCompanies.length === 0 && (
          <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40, gridColumn: "1/-1" }}>
            {lang === "es" ? "No hay empresas afiliadas registradas." : "No affiliate companies registered yet."}
          </div>
        )}
        {partnerCompanies.map((c: any) => (
          <div
            key={c.id}
            onClick={() => setSelectedCompanyId(c.id === selectedCompanyId ? null : c.id)}
            style={{
              ...S.card,
              cursor: "pointer",
              borderColor: c.id === selectedCompanyId ? "#c9a84c" : "#222",
              background: c.id === selectedCompanyId ? "#1a1500" : "#111",
            }}
          >
            <div style={{ fontSize: 10, color: "#c9a84c", letterSpacing: 2, marginBottom: 6 }}>MEMBER · SLN</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.brand_name || c.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{c.name}</div>
            {c.id === selectedCompanyId && <div style={{ marginTop: 8, fontSize: 11, color: "#c9a84c" }}>▶ {lang === "es" ? "Seleccionada" : "Selected"}</div>}
          </div>
        ))}
      </div>

      {/* Fleet Dashboard */}
      {selectedCompanyId && (
        <div>
          {loadingFleet && (
            <div style={{ ...S.card, textAlign: "center", padding: 60, color: "#555" }}>
              {lang === "es" ? "Cargando datos de flota..." : "Loading fleet data..."}
            </div>
          )}
          {fleetError && (
            <div style={{ ...S.card, color: "#f87171", padding: 20 }}>{fleetError}</div>
          )}
          {!loadingFleet && fleetData && (
            <>
              {/* Company header */}
              <div style={{ ...S.card, borderColor: "#c9a84c44", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fleetData.company?.brand_name || fleetData.company?.name}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>🏢 {lang === "es" ? "Miembro de" : "Member of"} <span style={{ color: "#c9a84c" }}>Sottovento Luxury Network</span></div>
                  </div>
                  {reputationData && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: tierColor(reputationData.company_tier_label) }}>
                        {reputationData.company_score}
                      </div>
                      <div style={{ fontSize: 11, color: tierColor(reputationData.company_tier_label), letterSpacing: 1 }}>
                        {reputationData.company_tier_label}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {(["health", "drivers", "vehicles", "revenue", "reputation"] as const).map(s => (
                  <button key={s} onClick={() => setActiveSection(s)} style={S.btn(activeSection === s)}>
                    {s === "health" ? "⚡ Health" : s === "drivers" ? "👤 Drivers" : s === "vehicles" ? "🚗 Vehicles" : s === "revenue" ? "💵 Revenue" : "⭐ Reputation"}
                  </button>
                ))}
              </div>

              {/* SECTION: HEALTH */}
              {activeSection === "health" && (
                <div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                    {[
                      { label: "Active Drivers",  value: fleetData.fleet_health.active_drivers,         color: "#4ade80" },
                      { label: "Total Vehicles",  value: fleetData.fleet_health.total_vehicles,         color: "#60a5fa" },
                      { label: "MCO Eligible",    value: fleetData.fleet_health.mco_eligible_vehicles,  color: "#c9a84c" },
                      { label: "Port Eligible",   value: fleetData.fleet_health.port_eligible_vehicles, color: "#a78bfa" },
                      { label: "Critical Alerts", value: fleetData.fleet_health.critical_alerts,        color: "#f87171" },
                      { label: "Warnings",        value: fleetData.fleet_health.warning_alerts,         color: "#f59e0b" },
                    ].map(k => (
                      <div key={k.label} style={S.statCard(k.color + "33")}>
                        <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 6 }}>{k.label.toUpperCase()}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  {fleetData.alerts.length === 0 ? (
                    <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#4ade80" }}>
                      ✅ {lang === "es" ? "Sin alertas activas" : "No active alerts — fleet is compliant"}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {fleetData.alerts.map((a: any, i: number) => (
                        <div key={i} style={{ ...S.card, borderColor: alertSeverityColor(a.severity) + "55", display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <span style={{ ...S.badge(alertSeverityColor(a.severity) + "22"), color: alertSeverityColor(a.severity), fontSize: 10, flexShrink: 0 }}>{a.severity.toUpperCase()}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.entity_name}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{a.message}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>{a.entity_type.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: DRIVERS */}
              {activeSection === "drivers" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {fleetData.drivers.length === 0 && (
                    <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#555" }}>
                      {lang === "es" ? "Sin conductores asignados." : "No drivers assigned to this company."}
                    </div>
                  )}
                  {fleetData.drivers.map((d: any) => (
                    <div key={d.id} style={{ ...S.card }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{d.driver_name}</div>
                          <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{d.driver_code} · {d.driver_status?.toUpperCase()}</div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <div><div style={{ fontSize: 10, color: "#555" }}>RIDES</div><div style={{ fontSize: 18, fontWeight: 700 }}>{d.rides_completed}</div></div>
                            <div><div style={{ fontSize: 10, color: "#555" }}>COMPLETION</div><div style={{ fontSize: 18, fontWeight: 700 }}>{d.completion_rate ?? "—"}%</div></div>
                            <div><div style={{ fontSize: 10, color: "#555" }}>ON-TIME</div><div style={{ fontSize: 18, fontWeight: 700 }}>{d.on_time_rate ?? "—"}%</div></div>
                            <div><div style={{ fontSize: 10, color: "#555" }}>SCORE</div><div style={{ fontSize: 18, fontWeight: 700, color: tierColor(d.current_score_tier) }}>{d.driver_score_total}</div></div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                          <span style={{ ...S.badge("#1a1a1a"), color: tierColor(d.current_score_tier), fontSize: 11 }}>{d.current_score_tier}</span>
                          {d.is_provisional && <span style={{ ...S.badge("#3b2200"), color: "#f59e0b", fontSize: 10 }}>PROVISIONAL {d.provisional_completed_rides}/10</span>}
                          {d.is_eligible_for_premium_dispatch && <span style={{ ...S.badge("#1a0d3b"), color: "#a78bfa", fontSize: 10 }}>PREMIUM ✓</span>}
                          {d.is_eligible_for_airport_priority && <span style={{ ...S.badge("#0c2340"), color: "#38bdf8", fontSize: 10 }}>AIRPORT ✓</span>}
                          {d.complaint_count > 0 && <span style={{ ...S.badge("#3b0000"), color: "#f87171", fontSize: 10 }}>⚠ {d.complaint_count} COMPLAINT(S)</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: VEHICLES */}
              {activeSection === "vehicles" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {fleetData.vehicles.length === 0 && (
                    <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#555" }}>
                      {lang === "es" ? "Sin vehículos registrados." : "No vehicles registered for this company."}
                    </div>
                  )}
                  {fleetData.vehicles.map((v: any) => (
                    <div key={v.id} style={{ ...S.card, borderColor: v.document_status === "compliant" ? "#14532d" : v.document_status === "requires_action" ? "#3b000066" : "#222" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{v.vehicle_model}</div>
                          <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{v.plate}{v.driver_name ? ` · ${v.driver_name}` : " · Company Vehicle"}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: "#555" }}>City: {permitBadge(v.city_permit_status)}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>MCO: {permitBadge(v.airport_permit_mco_status)}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>Port: {permitBadge(v.port_permit_canaveral_status)}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>Ins: {permitBadge(v.insurance_status)}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>Reg: {permitBadge(v.registration_status)}</div>
                          </div>
                          <div style={{ display: "flex", gap: 16 }}>
                            <div><div style={{ fontSize: 10, color: "#555" }}>RIDES</div><div style={{ fontSize: 16, fontWeight: 700 }}>{v.rides_completed}</div></div>
                            <div><div style={{ fontSize: 10, color: "#555" }}>AVAILABILITY</div><div style={{ fontSize: 16, fontWeight: 700 }}>{v.availability_index}%</div></div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                          <span style={{ ...S.badge(v.airport_eligibility_status === "eligible" ? "#0c2340" : "#1a1a1a"), color: v.airport_eligibility_status === "eligible" ? "#38bdf8" : "#555", fontSize: 10 }}>MCO {v.airport_eligibility_status === "eligible" ? "✓" : "✗"}</span>
                          <span style={{ ...S.badge(v.port_eligibility_status === "eligible" ? "#1a0d3b" : "#1a1a1a"), color: v.port_eligibility_status === "eligible" ? "#a78bfa" : "#555", fontSize: 10 }}>PORT {v.port_eligibility_status === "eligible" ? "✓" : "✗"}</span>
                          <span style={{ ...S.badge(v.document_status === "compliant" ? "#14532d" : v.document_status === "requires_action" ? "#3b0000" : "#3b2200"), color: v.document_status === "compliant" ? "#4ade80" : v.document_status === "requires_action" ? "#f87171" : "#f59e0b", fontSize: 10 }}>{v.document_status?.replace("_", " ").toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: REVENUE */}
              {activeSection === "revenue" && (
                <div>
                  <div style={{ ...S.card, borderColor: "#c9a84c44", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>NETWORK REVENUE ANALYTICS — DISPLAY ONLY</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        { label: "Total Rides",       value: fleetData.revenue_analytics.total_rides,               color: "#c9a84c", fmt: false },
                        { label: "Completed",         value: fleetData.revenue_analytics.completed_rides,           color: "#4ade80", fmt: false },
                        { label: "Rides MTD",         value: fleetData.revenue_analytics.rides_mtd,                 color: "#60a5fa", fmt: false },
                        { label: "Total Revenue",     value: fleetData.revenue_analytics.total_revenue,             color: "#c9a84c", fmt: true  },
                        { label: "Revenue MTD",       value: fleetData.revenue_analytics.revenue_mtd,               color: "#4ade80", fmt: true  },
                        { label: "Avg Ride Value",    value: fleetData.revenue_analytics.avg_ride_value,            color: "#a78bfa", fmt: true  },
                        { label: "Est. Network Rev.", value: fleetData.revenue_analytics.estimated_network_revenue, color: "#f59e0b", fmt: true  },
                        { label: "Rides / Driver",    value: fleetData.revenue_analytics.rides_completed_per_driver, color: "#38bdf8", fmt: false },
                        { label: "Rides / Vehicle",   value: fleetData.revenue_analytics.rides_completed_per_vehicle, color: "#818cf8", fmt: false },
                      ].map(k => (
                        <div key={k.label} style={S.statCard(k.color + "33")}>
                          <div style={{ fontSize: 10, color: k.color, letterSpacing: 1, marginBottom: 6 }}>{k.label.toUpperCase()}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>
                            {k.fmt ? `$${Number(k.value).toLocaleString("en-US", { minimumFractionDigits: 0 })}` : k.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...S.card, borderColor: "#333" }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>FEE SPLIT BREAKDOWN (INFORMATIONAL)</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        { label: "Executor Share", value: fleetData.revenue_analytics.total_executor_share, color: "#4ade80" },
                        { label: "Source Share",   value: fleetData.revenue_analytics.total_source_share,   color: "#60a5fa" },
                        { label: "Platform Share", value: fleetData.revenue_analytics.total_platform_share, color: "#a78bfa" },
                      ].map(k => (
                        <div key={k.label} style={S.statCard(k.color + "22")}>
                          <div style={{ fontSize: 10, color: k.color, letterSpacing: 1, marginBottom: 4 }}>{k.label.toUpperCase()}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>${Number(k.value).toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: REPUTATION */}
              {activeSection === "reputation" && reputationData && (
                <div>
                  <div style={{ ...S.card, borderColor: tierColor(reputationData.company_tier_label) + "55", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>COMPANY REPUTATION SCORE</div>
                        <div style={{ fontSize: 48, fontWeight: 700, color: tierColor(reputationData.company_tier_label) }}>{reputationData.company_score}</div>
                        <div style={{ fontSize: 14, color: tierColor(reputationData.company_tier_label), letterSpacing: 2, fontWeight: 700 }}>{reputationData.company_tier_label}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.entries(reputationData.score_breakdown).map(([key, comp]: [string, any]) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ fontSize: 11, color: "#888", width: 200, flexShrink: 0 }}>{key.replace(/_/g, " ").toUpperCase()}</div>
                          <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 4, height: 8, overflow: "hidden" }}>
                            <div style={{ width: `${comp.score}%`, height: "100%", background: comp.score >= 80 ? "#4ade80" : comp.score >= 60 ? "#f59e0b" : "#f87171", borderRadius: 4 }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, width: 40, textAlign: "right" }}>{comp.score}</div>
                          <div style={{ fontSize: 10, color: "#555", width: 60, textAlign: "right" }}>×{comp.weight} = {comp.contribution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...S.card, borderColor: "#333" }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>FLEET SUMMARY</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        { label: "Drivers",           value: reputationData.fleet_summary.driver_count,        color: "#c9a84c" },
                        { label: "Active",             value: reputationData.fleet_summary.active_drivers,      color: "#4ade80" },
                        { label: "Provisional",        value: reputationData.fleet_summary.provisional_drivers, color: "#f59e0b" },
                        { label: "Total Rides",        value: reputationData.fleet_summary.total_rides,         color: "#60a5fa" },
                        { label: "Vehicles",           value: reputationData.fleet_summary.total_vehicles,      color: "#a78bfa" },
                        { label: "Compliant Vehicles", value: reputationData.fleet_summary.compliant_vehicles,  color: "#4ade80" },
                        { label: "Complaints",         value: reputationData.fleet_summary.total_complaints,    color: "#f87171" },
                        { label: "Late Cancels",       value: reputationData.fleet_summary.total_late_cancels,  color: "#f87171" },
                      ].map(k => (
                        <div key={k.label} style={S.statCard(k.color + "22")}>
                          <div style={{ fontSize: 10, color: k.color, letterSpacing: 1, marginBottom: 4 }}>{k.label.toUpperCase()}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

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
  const [vehicles, setVehicles] = useState<any[]>([])
  const [vehicleStats, setVehicleStats] = useState<any>(null)
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [crownData, setCrownData] = useState<CrownData | null>(null)
  const [dispatchData, setDispatchData] = useState<{
    // 7-bucket structure (Fases 1-10)
    driverIssue: Booking[];
    needsReview: Booking[];
    readyForDispatch: Booking[];
    assigned: Booking[];
    inProgress: Booking[];
    completed: Booking[];
    recentlyCancelled: any[]; // Fase 10: cancelled in last 24h with cancel_reason, cancel_responsibility, etc.
    total: number;
    // Legacy
    awaitingSourceOwner: Booking[];
    awaitingSlnMember: Booking[];
    manualDispatchRequired: Booking[];
    migrationRequired?: boolean;
  } | null>(null)
  const [loadingDispatch, setLoadingDispatch] = useState(false)
  const [expandedDispatchId, setExpandedDispatchId] = useState<string | null>(null)
  const [migrationMsg, setMigrationMsg] = useState("")
  const [runningMigration, setRunningMigration] = useState(false)
  const [runningReclassify, setRunningReclassify] = useState(false)
  const [reclassifyMsg, setReclassifyMsg] = useState("")

  // ── Fallback Queue (Bloque Maestro 3) ──────────────────────────────────
  const [fallbackQueue, setFallbackQueue] = useState<any[]>([])
  const [loadingFallbackQueue, setLoadingFallbackQueue] = useState(false)
  const [fallbackQueueMsg, setFallbackQueueMsg] = useState("")
  const [runningFallbackDispatch, setRunningFallbackDispatch] = useState<string | null>(null)

  // ── Cancel Metrics (Bloque Maestro 4) ────────────────────────────────────
  const [cancelMetricsData, setCancelMetricsData] = useState<{
    counts: { last_24h: number; today: number; this_week: number; this_month: number; total: number };
    breakdown: { by_client: number; by_driver: number; by_admin: number; by_system: number };
    stage_breakdown: { before_assignment: number; assigned: number; in_progress: number; post_driver_issue: number };
    recent_list: any[];
    generated_at: string;
  } | null>(null)
  const [loadingCancelMetrics, setLoadingCancelMetrics] = useState(false)

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
  // BM5: Driver Reliability Score Engine
  const [runningBm5Mig, setRunningBm5Mig] = useState(false)
  const [bm5MigMsg, setBm5MigMsg] = useState("")
  const [runningRecalc, setRunningRecalc] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState("")
  const [bm5Drivers, setBm5Drivers] = useState<any[]>([])
  const [updatingPartnerMode, setUpdatingPartnerMode] = useState<string | null>(null)
  // BM6: SLA Protection Queue
  const [slaQueue, setSlaQueue] = useState<any[]>([])
  const [loadingSlaQueue, setLoadingSlaQueue] = useState(false)
  const [slaEvalMsg, setSlaEvalMsg] = useState("")
  const [runningSlaEval, setRunningSlaEval] = useState(false)
  const [smartReassignMsg, setSmartReassignMsg] = useState<{[key: string]: string}>({})
  const [runningSmartReassign, setRunningSmartReassign] = useState<{[key: string]: boolean}>({})
  const [markingSafe, setMarkingSafe] = useState<{[key: string]: boolean}>({})
  // BM7: Communication Queue
  const [commQueue, setCommQueue] = useState<{pending_drafts: any[], recent_sent: any[], stats: any}>({ pending_drafts: [], recent_sent: [], stats: {} })
  const [loadingCommQueue, setLoadingCommQueue] = useState(false)
  const [commQueueMsg, setCommQueueMsg] = useState("")
  const [approvingComm, setApprovingComm] = useState<{[key: string]: boolean}>({})
  const [expandedCommLog, setExpandedCommLog] = useState<string | null>(null)
  const [commLogData, setCommLogData] = useState<{[bookingId: string]: any[]}>({})
  const [runningBm7Mig, setRunningBm7Mig] = useState(false)
  const [bm7MigMsg, setBm7MigMsg] = useState("")
  // BM8: Airport Intelligence Queue
  const [airportQueue, setAirportQueue] = useState<{airport_bookings: any[], stats: any}>({ airport_bookings: [], stats: {} })
  const [loadingAirportQueue, setLoadingAirportQueue] = useState(false)
  const [airportQueueMsg, setAirportQueueMsg] = useState("")
  const [runningBm8Mig, setRunningBm8Mig] = useState(false)
  const [bm8MigMsg, setBm8MigMsg] = useState("")
  const [runningFlightRefresh, setRunningFlightRefresh] = useState<{[key: string]: boolean}>({})
  const [flightRefreshMsg, setFlightRefreshMsg] = useState<{[key: string]: string}>({})
  const [expandedAirportId, setExpandedAirportId] = useState<string | null>(null)
  // BM8 Annex: Airport Load Awareness
  const [airportLoadDetail, setAirportLoadDetail] = useState<any | null>(null)
  const [loadingAirportLoad, setLoadingAirportLoad] = useState(false)
  const [airportLoadMsg, setAirportLoadMsg] = useState("")
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

  // ── Dashboard shortcut filters ──────────────────────────────────────────
  const [bookingDateFilter, setBookingDateFilter] = useState<"today" | "week" | "month" | "all">("all")
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all")
  const [bookingViewMode, setBookingViewMode] = useState<"active" | "completed" | "cancelled" | "archived">("active")
  const [cancelModal, setCancelModal] = useState<{ bookingId: string; clientName: string } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancellingBooking, setCancellingBooking] = useState(false)
  const [driverStatusFilter, setDriverStatusFilter] = useState<"active" | "all">("all")
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all")

  const goToTab = (target: Tab, opts?: {
    bookingDate?: "today" | "week" | "month" | "all"
    bookingStatus?: string
    driverStatus?: "active" | "all"
    leadSource?: string
  }) => {
    if (opts?.bookingDate !== undefined) setBookingDateFilter(opts.bookingDate)
    if (opts?.bookingStatus !== undefined) setBookingStatusFilter(opts.bookingStatus)
    if (opts?.driverStatus !== undefined) setDriverStatusFilter(opts.driverStatus)
    if (opts?.leadSource !== undefined) setLeadSourceFilter(opts.leadSource)
    setTab(target)
    if (target === "bookings") loadBookings("active")
    if (target === "drivers") loadDrivers()
    if (target === "leads") loadLeads()
  }

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
  const loadVehicles = useCallback(async () => { setLoadingVehicles(true); try { const r = await fetch("/api/admin/vehicles"); if (r.ok) { const d = await r.json(); setVehicles(d.vehicles ?? []); setVehicleStats(d.stats ?? null) } } catch { } finally { setLoadingVehicles(false) } }, [])
  const loadBookings = useCallback(async (viewMode?: string) => { setLoadingBookings(true); try { const v = viewMode ?? "active"; const r = await fetch(`/api/admin/bookings?view=${v}`); if (r.ok) { const d = await r.json(); setBookings(d.bookings ?? []) } } catch { } finally { setLoadingBookings(false) } }, [])
  const loadLeads = useCallback(async () => { setLoadingLeads(true); try { const r = await fetch("/api/admin/leads"); if (r.ok) { const d = await r.json(); setLeads(d.leads ?? []) } } catch { } finally { setLoadingLeads(false) } }, [])
  const loadFinance = useCallback(async () => { setLoadingFinance(true); try { const r = await fetch("/api/admin/finance"); if (r.ok) setFinance(await r.json()) } catch { } finally { setLoadingFinance(false) } }, [])
  const loadCrown = useCallback(async () => { setLoadingCrown(true); try { const r = await fetch("/api/admin/crown-moment"); if (r.ok) setCrownData(await r.json()) } catch { } finally { setLoadingCrown(false) } }, [])
  const loadDispatch = useCallback(async () => { setLoadingDispatch(true); try { const r = await fetch("/api/admin/dispatch"); if (r.ok) setDispatchData(await r.json()) } catch { } finally { setLoadingDispatch(false) } }, [])
  const loadFallbackQueue = useCallback(async () => { setLoadingFallbackQueue(true); try { const r = await fetch("/api/admin/fallback-pool-dispatch"); if (r.ok) { const d = await r.json(); setFallbackQueue(d.queue ?? []) } } catch { } finally { setLoadingFallbackQueue(false) } }, [])
  const loadCancelMetrics = useCallback(async () => { setLoadingCancelMetrics(true); try { const r = await fetch("/api/admin/cancel-metrics"); if (r.ok) setCancelMetricsData(await r.json()) } catch { } finally { setLoadingCancelMetrics(false) } }, [])
  const loadSlaQueue = useCallback(async () => { setLoadingSlaQueue(true); try { const r = await fetch("/api/admin/sla-queue", { headers: { "x-admin-key": "sln-admin-2024" } }); if (r.ok) { const d = await r.json(); setSlaQueue(d.queue ?? []) } } catch { } finally { setLoadingSlaQueue(false) } }, [])
  const loadCommQueue = useCallback(async () => { setLoadingCommQueue(true); try { const r = await fetch("/api/admin/communication-queue", { headers: { "x-admin-key": "sln-admin-2024" } }); if (r.ok) { const d = await r.json(); setCommQueue(d) } } catch { } finally { setLoadingCommQueue(false) } }, [])
  const loadPartners = useCallback(async () => { setLoadingPartners(true); try { const r = await fetch("/api/admin/partners"); if (r.ok) { const d = await r.json(); setPartners(d.partners ?? []) } } catch { } finally { setLoadingPartners(false) } }, [])
  const loadPartnerCompanies = useCallback(async () => { try { const r = await fetch("/api/admin/partner-companies"); if (r.ok) { const d = await r.json(); setPartnerCompanies(d.companies ?? []) } } catch { } }, [])
  const loadPartnerInvites = useCallback(async () => { try { const r = await fetch("/api/admin/partner-invites"); if (r.ok) { const d = await r.json(); setPartnerInvites(d.invites ?? []) } } catch { } }, [])
  const loadPartnerEarnings = useCallback(async () => { try { const r = await fetch("/api/admin/partner-earnings"); if (r.ok) { const d = await r.json(); setPartnerEarnings(d.earnings ?? []) } } catch { } }, [])
  const loadPartnerCompliance = useCallback(async () => { try { const r = await fetch("/api/admin/partner-earnings?compliance=true"); if (r.ok) { const d = await r.json(); setPartnerCompliance(d.compliance ?? []) } } catch { } }, [])

  useEffect(() => { if (authed) { loadDashboard(); loadDrivers(); loadBookings(); loadCancelMetrics() } }, [authed, loadDashboard, loadDrivers, loadBookings, loadCancelMetrics])
  useEffect(() => { if (!authed) return; if (tab === "leads") loadLeads(); if (tab === "finance") loadFinance(); if (tab === "crown") loadCrown(); if (tab === "dispatch") { loadDispatch(); loadFallbackQueue(); loadCancelMetrics(); loadSlaQueue(); loadCommQueue() }; if (tab === "partners") { loadPartners(); loadPartnerCompanies(); loadPartnerInvites() }; if (tab === "drivers") loadVehicles() }, [tab, authed, loadLeads, loadFinance, loadCrown, loadDispatch, loadFallbackQueue, loadCancelMetrics, loadSlaQueue, loadCommQueue, loadPartners, loadPartnerCompanies, loadPartnerInvites, loadVehicles])
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
      client_email: b.client_email ?? "",
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
      // FIX A (BM10 follow-up): Use /api/admin/manual-reassign instead of PATCH /api/admin/bookings/{id}.
      // Root cause: PATCH bookings only updates DB columns — it does NOT create a dispatch_offer row
      // and does NOT make the offer visible on the driver panel. The driver never receives an alert.
      // manual-reassign creates the dispatch_offer, sets dispatch_status='offer_pending', and
      // logs the event so the driver panel polling (every 5s) picks it up immediately.
      const res = await fetch("/api/admin/manual-reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
        body: JSON.stringify({ booking_id: bookingId, driver_id: driverId, override_state: true })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAssignMsg(`✅ Offer sent to ${data.target_driver?.driver_code ?? "driver"} — awaiting acceptance`)
        setTimeout(() => { setAssignModal(null); setAssignMsg("") }, 1800)
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
  // ── Full pipeline action handlers ──────────────────────────────────────────
  const handleMoveToReview = async (id: string) => {
    await handleBookingStatus(id, "needs_review", "not_required")
  }
  const handleReadyForDispatch = async (id: string) => {
    await handleBookingStatus(id, "ready_for_dispatch", "manual_dispatch_required")
  }
  const handleArchiveBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "archived", dispatch_status: "cancelled" }) })
      if (res.ok) { loadBookings(bookingViewMode); loadDashboard() }
      else { const d = await res.json().catch(() => ({})); setGlobalToast({ msg: `❌ ${d.error ?? "Failed to archive"}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000) }
    } catch (e: any) { setGlobalToast({ msg: `❌ Network error: ${e.message}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000) }
  }
  const handleRestoreBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "needs_review", dispatch_status: "not_required" }) })
      if (res.ok) { setBookingViewMode("active"); loadBookings("active"); loadDashboard() }
      else { const d = await res.json().catch(() => ({})); setGlobalToast({ msg: `❌ ${d.error ?? "Failed to restore"}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000) }
    } catch (e: any) { setGlobalToast({ msg: `❌ Network error: ${e.message}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000) }
  }
  const handleConfirmCancel = async () => {
    if (!cancelModal) return
    setCancellingBooking(true)
    try {
      const res = await fetch(`/api/admin/bookings/${cancelModal.bookingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", dispatch_status: "cancelled", edit_fields: { cancellation_reason: cancelReason || "Admin cancelled", cancelled_by: "admin" } })
      })
      if (res.ok) { setCancelModal(null); setCancelReason(""); loadBookings(bookingViewMode); loadDashboard() }
      else { const d = await res.json().catch(() => ({})); setGlobalToast({ msg: `❌ ${d.error ?? "Failed to cancel"}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000) }
    } catch (e: any) { setGlobalToast({ msg: `❌ Network error: ${e.message}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000) }
    finally { setCancellingBooking(false) }
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
                {/* ── METRIC CARDS — interactive navigation shortcuts ── */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    {
                      label: t("dashToday"),
                      count: dashboard.today.count,
                      rev: dashboard.today.revenue,
                      color: "#c9a84c",
                      hint: lang === "es" ? "Ver reservas de hoy" : "View today\'s bookings",
                      onClick: () => goToTab("bookings", { bookingDate: "today", bookingStatus: "all" }),
                    },
                    {
                      label: t("dashWeek"),
                      count: dashboard.week.count,
                      rev: dashboard.week.revenue,
                      color: "#60a5fa",
                      hint: lang === "es" ? "Ver reservas de esta semana" : "View this week\'s bookings",
                      onClick: () => goToTab("bookings", { bookingDate: "week", bookingStatus: "all" }),
                    },
                    {
                      label: t("dashMonth"),
                      count: dashboard.month.count,
                      rev: dashboard.month.revenue,
                      color: "#4ade80",
                      hint: lang === "es" ? "Ver reservas de este mes" : "View this month\'s bookings",
                      onClick: () => goToTab("bookings", { bookingDate: "month", bookingStatus: "all" }),
                    },
                  ].map(k => (
                    <button
                      key={k.label}
                      onClick={k.onClick}
                      style={{
                        ...S.statCard(k.color + "33"),
                        cursor: "pointer",
                        textAlign: "left",
                        border: `1px solid ${k.color}44`,
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = k.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = k.color + "44" }}
                    >
                      <div style={{ fontSize: 10, color: k.color, letterSpacing: 2, marginBottom: 8 }}>{k.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 2 }}>{k.count}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>{t("dashBookings")}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: k.color, marginTop: 6 }}>{fmt(k.rev)}</div>
                      <div style={{ fontSize: 10, color: k.color + "aa", marginTop: 8 }}>&#8594; {k.hint}</div>
                    </button>
                  ))}

                  <button
                    onClick={() => goToTab("drivers", { driverStatus: "active" })}
                    style={{
                      ...S.statCard("#a78bfa33"),
                      cursor: "pointer",
                      textAlign: "left",
                      border: "1px solid #a78bfa44",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#a78bfa" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#a78bfa44" }}
                  >
                    <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 2, marginBottom: 8 }}>{t("dashActiveDrivers")}</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.activeDrivers}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{t("dashMembers")}</div>
                    <div style={{ fontSize: 10, color: "#a78bfaaa", marginTop: 8 }}>&#8594; {lang === "es" ? "Ver conductores activos" : "View active drivers"}</div>
                  </button>

                  <button
                    onClick={() => goToTab("leads", { leadSource: "all" })}
                    style={{
                      ...S.statCard("#f59e0b33"),
                      cursor: "pointer",
                      textAlign: "left",
                      border: "1px solid #f59e0b44",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f59e0b" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f59e0b44" }}
                  >
                    <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>{t("dashTotalLeads")}</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.totalLeads}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{t("dashCaptured")}</div>
                    <div style={{ fontSize: 10, color: "#f59e0baa", marginTop: 8 }}>&#8594; {lang === "es" ? "Ver todos los leads" : "View all leads"}</div>
                  </button>

                  <button
                    onClick={() => goToTab("dispatch")}
                    style={{
                      ...S.statCard((dashboard.needsReview ?? 0) > 0 ? "#f59e0b33" : undefined),
                      cursor: "pointer",
                      textAlign: "left",
                      border: `1px solid ${(dashboard.needsReview ?? 0) > 0 ? "#f59e0b44" : "#222"}`,
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = (dashboard.needsReview ?? 0) > 0 ? "#f59e0b" : "#444" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = (dashboard.needsReview ?? 0) > 0 ? "#f59e0b44" : "#222" }}
                  >
                    <div style={{ fontSize: 10, color: (dashboard.needsReview ?? 0) > 0 ? "#f59e0b" : "#555", letterSpacing: 2, marginBottom: 8 }}>NEEDS REVIEW</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: (dashboard.needsReview ?? 0) > 0 ? "#f59e0b" : "#fff" }}>{dashboard.needsReview ?? 0}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{lang === "es" ? "Requieren atención" : "Require attention"}</div>
                    <div style={{ fontSize: 10, color: "#f59e0baa", marginTop: 8 }}>&#8594; {lang === "es" ? "Ver en Dispatch" : "View in Dispatch"}</div>
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div style={S.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>{t("dashBookingStatuses")}</div>
                    {dashboard.bookingStatuses.map(s => (
                      <button
                        key={s.status}
                        onClick={() => goToTab("bookings", { bookingStatus: s.status, bookingDate: "all" })}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1a1a1a" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                      >
                        <span style={{ ...S.badge(statusColor[s.status] ?? "#1a1a1a"), color: statusText[s.status] ?? "#fff" }}>{s.status?.toUpperCase()}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{Number(s.count)}</span>
                          <span style={{ fontSize: 10, color: "#555" }}>&#8594;</span>
                        </div>
                      </button>
                    ))}
                    {dashboard.bookingStatuses.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>{t("dashNoBookings")}</div>}
                  </div>
                  <div style={S.card}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>{t("dashLeadsBySource")}</div>
                    {dashboard.leadsBySource.map(s => (
                      <button
                        key={s.lead_source}
                        onClick={() => goToTab("leads", { leadSource: s.lead_source || "unknown" })}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1a1a1a" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                      >
                        <span style={{ fontSize: 13, color: "#aaa" }}>{s.lead_source || "unknown"}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{Number(s.count)}</span>
                          <span style={{ fontSize: 10, color: "#555" }}>&#8594;</span>
                        </div>
                      </button>
                    ))}
                    {dashboard.leadsBySource.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>{t("dashNoLeads")}</div>}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>{t("dashRecentBookings")}</div>
                    <button
                      onClick={() => goToTab("bookings", { bookingDate: "all", bookingStatus: "all" })}
                      style={{ fontSize: 11, color: "#c9a84c", background: "transparent", border: "1px solid #c9a84c44", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                    >
                      {lang === "es" ? "Ver todas →" : "View all →"}
                    </button>
                  </div>
                  {dashboard.recentBookings.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13 }}>{t("dashNoBookings")}</div>
                  ) : dashboard.recentBookings.map(b => (
                    <button
                      key={b.id}
                      onClick={() => goToTab("bookings", { bookingStatus: b.status, bookingDate: "all" })}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 6px", width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #1a1a1a", cursor: "pointer", textAlign: "left", borderRadius: 4 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#111" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}</div>
                        <div style={{ fontSize: 12, color: "#555" }}>{b.client_name || t("dashUnknownClient")} · {fmtDate(b.created_at)}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 100 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>{fmt(b.total_price)}</div>
                        <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff" }}>{b.status?.toUpperCase()}</span>
                      </div>
                    </button>
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
        {tab === "bookings" && (() => {
          const ACTIVE_STATES = ["new", "needs_review", "ready_for_dispatch", "assigned", "driver_confirmed", "in_progress", "driver_issue"]
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay())
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

          // Client-side filter on top of server-side view
          const filteredBookings = bookings.filter(b => {
            if (bookingDateFilter !== "all") {
              const d = new Date(b.pickup_at || b.created_at)
              if (bookingDateFilter === "today" && d < todayStart) return false
              if (bookingDateFilter === "week"  && d < weekStart)  return false
              if (bookingDateFilter === "month" && d < monthStart) return false
            }
            if (bookingStatusFilter !== "all" && b.status !== bookingStatusFilter) return false
            return true
          })
          const hasActiveFilter = bookingDateFilter !== "all" || bookingStatusFilter !== "all"

          const PIPELINE_STATES = [
            { key: "new",                label: "New",                color: "#60a5fa",  bg: "#1e3a5f" },
            { key: "needs_review",       label: "Needs Review",       color: "#f59e0b",  bg: "#3b2200" },
            { key: "ready_for_dispatch", label: "Ready for Dispatch", color: "#38bdf8",  bg: "#0c2340" },
            { key: "assigned",           label: "Assigned",           color: "#4ade80",  bg: "#14532d" },
            { key: "driver_confirmed",   label: "Driver Confirmed",   color: "#86efac",  bg: "#0d3320" },
            { key: "in_progress",        label: "In Progress",        color: "#a78bfa",  bg: "#3b1f5e" },
            { key: "driver_issue",       label: "Driver Issue",       color: "#ef4444",  bg: "#3b0000" },
          ]

          const originLabel: Record<string, string> = {
            public_website: "Website", driver_qr: "Driver QR", driver_referral: "Referral",
            driver_tablet: "Tablet", hotel_partner: "Hotel", manual_admin: "Admin", unknown: "—"
          }
          const paymentColor: Record<string, string> = {
            pending: "#f59e0b", authorized: "#38bdf8", paid: "#4ade80", failed: "#ef4444", refunded: "#a78bfa"
          }

          return (
          <div>
            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Gestión de Reservas</div>
                <div style={{ color: "#555", fontSize: 13 }}>Central booking command layer — {filteredBookings.length} showing</div>
              </div>
              <button onClick={() => loadBookings(bookingViewMode)} style={S.btn()}>Refresh</button>
            </div>

            {/* ── View Mode Tabs ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {(["active", "completed", "cancelled", "archived"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setBookingViewMode(v); setBookingDateFilter("all"); setBookingStatusFilter("all"); loadBookings(v) }}
                  style={{
                    padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: bookingViewMode === v ? (v === "active" ? "#c9a84c" : v === "completed" ? "#14532d" : v === "cancelled" ? "#3b0000" : "#1a1a1a") : "#111",
                    color: bookingViewMode === v ? (v === "active" ? "#000" : v === "completed" ? "#4ade80" : v === "cancelled" ? "#f87171" : "#888") : "#555",
                    border: bookingViewMode === v ? "none" : "1px solid #222"
                  }}
                >
                  {v === "active" ? "Active" : v === "completed" ? "Completed" : v === "cancelled" ? "Cancelled" : "Archived"}
                </button>
              ))}
            </div>

            {/* ── Pipeline Status Summary (active view only) ── */}
            {bookingViewMode === "active" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {PIPELINE_STATES.map(s => {
                  const cnt = bookings.filter(b => b.status === s.key).length
                  return (
                    <div
                      key={s.key}
                      onClick={() => setBookingStatusFilter(bookingStatusFilter === s.key ? "all" : s.key)}
                      style={{
                        background: bookingStatusFilter === s.key ? s.bg : "#0d0d0d",
                        border: `1px solid ${bookingStatusFilter === s.key ? s.color + "60" : "#1a1a1a"}`,
                        borderRadius: 8, padding: "8px 10px", cursor: "pointer"
                      }}
                    >
                      <div style={{ fontSize: 9, color: s.color, letterSpacing: 1, marginBottom: 2 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: cnt > 0 ? s.color : "#333" }}>{cnt}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Date Filter (active view) ── */}
            {bookingViewMode === "active" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {(["all", "today", "week", "month"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setBookingDateFilter(d)}
                    style={{ padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: bookingDateFilter === d ? "#1e3a5f" : "#111",
                      color: bookingDateFilter === d ? "#60a5fa" : "#555",
                      border: bookingDateFilter === d ? "1px solid #1e3a5f" : "1px solid #1a1a1a" }}
                  >
                    {d === "all" ? "All dates" : d === "today" ? "Today" : d === "week" ? "This week" : "This month"}
                  </button>
                ))}
              </div>
            )}

            {/* ── Active filter banner ── */}
            {hasActiveFilter && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #333", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Filters:</span>
                {bookingDateFilter !== "all" && <span style={{ ...S.badge("#1e3a5f"), color: "#60a5fa" }}>{bookingDateFilter.toUpperCase()}</span>}
                {bookingStatusFilter !== "all" && <span style={{ ...S.badge(statusColor[bookingStatusFilter] ?? "#1a1a1a"), color: statusText[bookingStatusFilter] ?? "#fff" }}>{bookingStatusFilter.toUpperCase()}</span>}
                <span style={{ fontSize: 12, color: "#c9a84c" }}>{filteredBookings.length} result(s)</span>
                <button onClick={() => { setBookingDateFilter("all"); setBookingStatusFilter("all") }} style={{ marginLeft: "auto", fontSize: 11, color: "#f87171", background: "transparent", border: "1px solid #3b0000", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>Clear ×</button>
              </div>
            )}

            {/* ── Booking list ── */}
            {loadingBookings ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading...</div>
            ) : filteredBookings.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ color: "#888" }}>
                  {bookingViewMode === "active" ? "No active bookings" : bookingViewMode === "completed" ? "No completed bookings" : bookingViewMode === "cancelled" ? "No cancelled bookings" : "No archived bookings"}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredBookings.map(b => {
                  const pax = b.passenger_count ?? b.passengers ?? 1
                  const lug = b.luggage_count ?? (b.luggage ? parseInt(b.luggage) || 0 : 0)
                  const ref = b.booking_ref ?? b.id.slice(0, 8).toUpperCase()
                  const origin = b.booking_origin ?? b.lead_source ?? "unknown"
                  return (
                  <div key={b.id} style={{ ...S.card, borderColor: b.status === "driver_issue" ? "#ef444440" : b.status === "needs_review" ? "#f59e0b30" : "#222" }}>

                    {/* Row 1: Ref + Status + Payment */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>{ref}</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{b.pickup_address || b.pickup_zone || "?"} → {b.dropoff_address || b.dropoff_zone || "?"}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{b.pickup_at ? new Date(b.pickup_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No date"} · {b.vehicle_type}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ ...S.badge(statusColor[b.status] ?? "#1a1a1a"), color: statusText[b.status] ?? "#fff" }}>{b.status?.replace(/_/g, " ").toUpperCase()}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: paymentColor[b.payment_status] ?? "#888" }}>{b.payment_status?.toUpperCase()}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#c9a84c" }}>${Number(b.total_price ?? 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Row 2: Passenger info */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                      {b.client_name && <div style={{ fontSize: 12, color: "#aaa" }}>👤 {b.client_name}{b.client_phone ? ` · ${b.client_phone}` : ""}</div>}
                      <div style={{ fontSize: 12, color: "#666" }}>👥 {pax} pax · 🧳 {lug} bags</div>
                      {b.flight_number && <div style={{ fontSize: 12, color: "#60a5fa" }}>✈️ {b.flight_number}</div>}
                    </div>

                    {/* Row 3: Driver + Origin + Capture */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                      {b.driver_name
                        ? <div style={{ fontSize: 12, color: "#4ade80" }}>🚗 {b.driver_name} ({b.driver_code})</div>
                        : <div style={{ fontSize: 12, color: "#555" }}>No driver assigned</div>
                      }
                      <div style={{ fontSize: 11, color: "#555" }}>Origin: <span style={{ color: "#888" }}>{originLabel[origin] ?? origin}</span></div>
                      {b.captured_by_driver_code && <div style={{ fontSize: 11, color: "#555" }}>Captured by: <span style={{ color: "#c9a84c" }}>{b.captured_by_driver_code}</span></div>}
                    </div>

                    {/* Row 4: Notes */}
                    {b.notes && <div style={{ fontSize: 12, color: "#666", marginBottom: 8, padding: "6px 10px", background: "#0d0d0d", borderRadius: 6 }}>📝 {b.notes}</div>}

                    {/* Row 5: Driver issue alert */}
                    {b.driver_reported && (
                      <div style={{ marginBottom: 8, padding: "8px 12px", background: b.driver_report_action === "driver_rejected_incomplete_ride" ? "#3b0000" : "#3b1a00", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{b.driver_report_action === "driver_rejected_incomplete_ride" ? "🚫" : "⚠️"}</span>
                        <span style={{ fontSize: 12, color: b.driver_report_action === "driver_rejected_incomplete_ride" ? "#f87171" : "#f59e0b", fontWeight: 600 }}>
                          {b.driver_report_action === "driver_rejected_incomplete_ride" ? "Driver rejected — incomplete data. URGENT: edit and reassign." : "Driver requested correction. Edit booking."}
                        </span>
                      </div>
                    )}

                    {/* Cancellation reason (cancelled view) */}
                    {b.cancellation_reason && (
                      <div style={{ marginBottom: 8, padding: "6px 10px", background: "#1a0000", borderRadius: 6, fontSize: 12, color: "#f87171" }}>
                        Cancelled: {b.cancellation_reason}{b.cancelled_by ? ` (by ${b.cancelled_by})` : ""}
                      </div>
                    )}

                    {/* ── Action Buttons ── */}
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>

                      {/* Edit — always available */}
                      <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>
                        ✏️ Edit
                      </button>

                      {/* Assign / Reassign driver */}
                      {/* BUG 2 FIX (BM10 Follow-Up 4): Block reassignment when:
                           (a) dispatch_status='offer_pending' — driver has not yet responded to active offer.
                               Showing Reassign here would allow double-offer creation.
                           (b) dispatch_state='ASSIGNED' AND status='accepted' — driver fully confirmed.
                               Ride is locked. Admin must use override explicitly.
                           In both cases, show a locked indicator instead of the button. */}
                      {(() => {
                        const hasActivePendingOffer = b.dispatch_status === 'offer_pending'
                        // BM13 Guard 4b: Broader closed-cycle detection (OR logic, matches server-side guard)
                        // BM10 FU4 used AND logic (all 3 required). BM13 uses OR: any one is sufficient.
                        const isFullyAccepted =
                          b.dispatch_state === 'ASSIGNED' ||
                          (b.status === 'accepted' && !!b.assigned_driver_id) ||
                          (b.dispatch_status === 'assigned' && !!b.assigned_driver_id && b.dispatch_state !== 'ROUND_3_POOL_OPEN')
                        const canReassign = ["new", "needs_review", "ready_for_dispatch", "assigned", "driver_confirmed", "driver_issue"].includes(b.status)
                        if (!canReassign) return null
                        if (hasActivePendingOffer) {
                          return (
                            <button
                              disabled
                              title="Awaiting driver response — cannot reassign while offer is pending"
                              style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#1a2a00", color: "#6b8c42", border: "1px solid #2a3a00", cursor: "not-allowed", opacity: 0.6 }}
                            >
                              ⏳ Awaiting Acceptance
                            </button>
                          )
                        }
                        if (isFullyAccepted) {
                          return (
                            <button
                              disabled
                              title="Driver has accepted this ride — use override to force reassignment"
                              style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#0d2a0d", color: "#4ade8060", border: "1px solid #14532d40", cursor: "not-allowed", opacity: 0.6 }}
                            >
                              🔒 Accepted — Locked
                            </button>
                          )
                        }
                        return (
                          <button
                            onClick={() => setAssignModal({ bookingId: b.id, pickup: b.pickup_zone || b.pickup_address, dropoff: b.dropoff_zone || b.dropoff_address })}
                            style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#14532d", color: "#4ade80", border: "none" }}
                          >
                            {b.driver_name ? "🔄 Reassign" : "👤 Assign Driver"}
                          </button>
                        )
                      })()}

                      {/* Move to Needs Review */}
                      {["new", "ready_for_dispatch"].includes(b.status) && (
                        <button onClick={() => handleMoveToReview(b.id)} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#3b2200", color: "#f59e0b", border: "none" }}>
                          ⚠️ Needs Review
                        </button>
                      )}

                      {/* Ready for Dispatch */}
                      {["new", "needs_review"].includes(b.status) && (
                        <button onClick={() => handleReadyForDispatch(b.id)} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#0c2340", color: "#38bdf8", border: "none" }}>
                          📦 Ready to Dispatch
                        </button>
                      )}

                      {/* In Progress */}
                      {b.status === "driver_confirmed" && (
                        <button onClick={() => handleBookingStatus(b.id, "in_progress", "assigned")} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#3b1f5e", color: "#a78bfa", border: "none" }}>
                          🚗 Start Ride
                        </button>
                      )}

                      {/* Complete */}
                      {b.status === "in_progress" && (
                        <button onClick={() => handleBookingStatus(b.id, "completed", "assigned")} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#14532d", color: "#4ade80", border: "none" }}>
                          ✅ Complete
                        </button>
                      )}

                      {/* Archive (completed bookings) */}
                      {b.status === "completed" && (
                        <button onClick={() => handleArchiveBooking(b.id)} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#1a1a1a", color: "#555", border: "1px solid #333" }}>
                          📦 Archive
                        </button>
                      )}

                      {/* Restore (archived/cancelled) */}
                      {["archived", "cancelled"].includes(b.status) && (
                        <button onClick={() => handleRestoreBooking(b.id)} style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#1e3a5f", color: "#60a5fa", border: "none" }}>
                          ↩️ Restore
                        </button>
                      )}

                      {/* Cancel — active bookings only */}
                      {!["completed", "cancelled", "archived"].includes(b.status) && (
                        <button
                          onClick={() => { setCancelModal({ bookingId: b.id, clientName: b.client_name ?? "this booking" }); setCancelReason("") }}
                          style={{ ...S.btn(), fontSize: 11, padding: "6px 12px", background: "#3b0000", color: "#f87171", border: "none" }}
                        >
                          ❌ Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}

            {/* ── Cancel Booking Modal ── */}
            {cancelModal && (
              <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ background: "#111", border: "1px solid #3b0000", borderRadius: 16, padding: 28, maxWidth: 420, width: "100%" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>❌ Cancel Booking</div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Cancelling booking for <strong style={{ color: "#fff" }}>{cancelModal.clientName}</strong>. This cannot be undone.</div>
                  <label style={S.label}>Cancellation reason (optional)</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="e.g. Client requested cancellation, No show, Duplicate booking..."
                    style={{ ...S.input, height: 80, resize: "vertical" as const, marginBottom: 16 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleConfirmCancel} disabled={cancellingBooking} style={{ ...S.btn(), flex: 1, background: "#3b0000", color: "#f87171", border: "none" }}>
                      {cancellingBooking ? "Cancelling..." : "Confirm Cancel"}
                    </button>
                    <button onClick={() => { setCancelModal(null); setCancelReason("") }} style={{ ...S.btn(), flex: 1 }}>Back</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          )
        })()}
        {/* ======================================================
            3. DISPATCH
        ====================================================== */}
                {tab === "dispatch" && (
          <div>
            {/* ── Header ── */}
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Dispatch Control Tower</div>
                <div style={{ color: "#555", fontSize: 13 }}>Operational dispatch — 6-bucket pipeline</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={loadDispatch} style={S.btn()} disabled={loadingDispatch}>
                  {loadingDispatch ? "Loading..." : "🔄 Refresh"}
                </button>
              </div>
            </div>

            {/* ── KPI Cards (scroll to bucket) ── */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
              {[
                { label: "Driver Issue", count: dispatchData?.driverIssue?.length ?? 0, color: "#ef4444", icon: "🚨", anchor: "bucket-driver-issue" },
                { label: "Needs Review", count: dispatchData?.needsReview?.length ?? 0, color: "#f59e0b", icon: "⚠️", anchor: "bucket-needs-review" },
                { label: "Ready to Dispatch", count: dispatchData?.readyForDispatch?.length ?? 0, color: "#60a5fa", icon: "📦", anchor: "bucket-ready" },
                { label: "Assigned", count: dispatchData?.assigned?.length ?? 0, color: "#a78bfa", icon: "👤", anchor: "bucket-assigned" },
                { label: "In Progress", count: dispatchData?.inProgress?.length ?? 0, color: "#4ade80", icon: "🚗", anchor: "bucket-in-progress" },
                { label: "Completed (24h)", count: dispatchData?.completed?.length ?? 0, color: "#6b7280", icon: "✅", anchor: "bucket-completed" },
                { label: "Cancelled (24h)", count: (dispatchData as any)?.recentlyCancelled?.length ?? 0, color: "#f87171", icon: "❌", anchor: "bucket-recently-cancelled" },
                { label: "Fallback Queue", count: fallbackQueue.length, color: "#fb923c", icon: "🔄", anchor: "bucket-fallback-queue" },
              ].map(k => (
                <div
                  key={k.anchor}
                  onClick={() => { const el = document.getElementById(k.anchor); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  style={{ ...S.statCard(k.count > 0 ? k.color + "40" : undefined), minWidth: 110, cursor: "pointer", transition: "border-color 150ms" }}
                >
                  <div style={{ fontSize: 18 }}>{k.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.count > 0 ? k.color : "#555" }}>{k.count}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {loadingDispatch ? (
              <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Loading dispatch data...</div>
            ) : !dispatchData ? (
              <div style={{ color: "#555", textAlign: "center", padding: 40 }}>No dispatch data available</div>
            ) : (
              <>
                {/* ════════════════════════════════════════════════
                    BUCKET 1: DRIVER ISSUE (red — urgent)
                ════════════════════════════════════════════════ */}
                <div id="bucket-driver-issue" style={{ ...S.card, marginBottom: 16, borderColor: (dispatchData?.driverIssue?.length ?? 0) > 0 ? "#ef444440" : "#222" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>🚨 Driver Issue</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Conductor rechazó o reportó datos incompletos</div>
                    </div>
                    <span style={{ ...S.badge("#3b0000"), color: "#ef4444" }}>{dispatchData?.driverIssue?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.driverIssue?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin issues de conductor activos</div>
                  ) : (dispatchData.driverIssue ?? []).map(b => {
                    const missingFields: string[] = (b as any).missing_critical ?? []
                    const missingOptionalFields: string[] = (b as any).missing_optional ?? []
                    const hasMissingOptional: boolean = (b as any).missing_optional_info ?? missingOptionalFields.length > 0
                    const isReady = missingFields.length === 0
                    const agingMs = b.updated_at ? Date.now() - new Date(b.updated_at).getTime() : Date.now() - new Date(b.created_at).getTime()
                    const agingMin = Math.floor(agingMs / 60000)
                    const agingLabel = agingMin < 60 ? `${agingMin}m` : `${Math.floor(agingMin / 60)}h ${agingMin % 60}m`
                    const isExpanded = expandedDispatchId === b.id
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #2a0000" }}>
                        {/* Summary row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ fontSize: 10, color: "#ef444480", background: "#3b000050", padding: "1px 6px", borderRadius: 4 }}>⏱️ {agingLabel} ago</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                              {b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}
                            </div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                              {fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)} &middot; {b.vehicle_type || "?"} &middot; {b.client_name || "Sin cliente"}
                            </div>
                            {b.client_phone && <div style={{ fontSize: 12, color: "#aaa" }}>📞 {b.client_phone}</div>}
                            {b.driver_name && <div style={{ fontSize: 12, color: "#a78bfa" }}>👤 {b.driver_name} ({b.driver_code}) {b.driver_phone ? `\u2022 ${b.driver_phone}` : ""}</div>}
                            {(b as any).driver_issue_notes && <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4, padding: "4px 8px", background: "#3b000050", borderRadius: 4 }}>Nota: {(b as any).driver_issue_notes}</div>}
                            {missingFields.length > 0 && (
                              <div style={{ marginTop: 6, padding: "5px 8px", borderRadius: 6, background: "#3b000050", border: "1px solid #ef444440", fontSize: 11, color: "#fca5a5" }}>
                                ⚠️ Faltan críticos: {missingFields.join(", ")}
                              </div>
                            )}
                            {hasMissingOptional && (
                              <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#1a1a2a50", border: "1px solid #60a5fa30", fontSize: 11, color: "#93c5fd" }}>
                                ℹ️ Missing optional info: {missingOptionalFields.join(", ")}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge("#3b0000"), color: "#ef4444", fontSize: 10 }}>DRIVER ISSUE</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {/* Expanded detail view */}
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#1a0000", borderRadius: 8, border: "1px solid #3b0000", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 10 }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Estado pago:</span> <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b" }}>{b.payment_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pickup:</span> <span style={{ color: "#fff" }}>{b.pickup_address || b.pickup_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Dropoff:</span> <span style={{ color: "#fff" }}>{b.dropoff_address || b.dropoff_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fecha/Hora:</span> <span style={{ color: "#fff" }}>{fmtDate(b.pickup_at)}</span></div>
                              <div><span style={{ color: "#666" }}>Vehículo:</span> <span style={{ color: "#fff" }}>{b.vehicle_type || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pasajeros:</span> <span style={{ color: "#fff" }}>{b.passenger_count || b.passengers || 1}</span></div>
                              <div><span style={{ color: "#666" }}>Equipaje:</span> <span style={{ color: "#fff" }}>{b.luggage_count ?? "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Vuelo:</span> <span style={{ color: "#fff" }}>{b.flight_number || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fuente:</span> <span style={{ color: "#fff" }}>{b.lead_source || b.booking_origin || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Capturado por:</span> <span style={{ color: "#fff" }}>{b.captured_by_driver_code || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Email cliente:</span> <span style={{ color: "#fff" }}>{b.client_email || "—"}</span></div>
                            </div>
                            {b.notes && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Notas: {b.notes}</div>}
                          </div>
                        )}
                        {/* Actions */}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>✏️ Editar</button>
                          <button
                            onClick={() => {
                              if (!isReady) { setGlobalToast({ msg: `Completar datos: ${missingFields.join(", ")}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000); return }
                              setAssignModal({ bookingId: b.id, pickup: b.pickup_zone || b.pickup_address, dropoff: b.dropoff_zone || b.dropoff_address }); setAssignMsg("")
                            }}
                            style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: isReady ? "#14532d" : "#1a1a1a", color: isReady ? "#4ade80" : "#555", cursor: isReady ? "pointer" : "not-allowed", opacity: isReady ? 1 : 0.6 }}
                          >{isReady ? "✅ Reasignar Conductor" : "⚠️ Completar primero"}</button>
                          <button onClick={() => handleDispatchStatus(b.id, "needs_review")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px" }}>&rarr; Mover a Revisión</button>
                          <button onClick={() => handleBookingStatus(b.id, "cancelled", "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#3b0000", color: "#f87171", border: "none" }}>Cancelar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ════════════════════════════════════════════════
                    BUCKET 2: NEEDS REVIEW (amber)
                ════════════════════════════════════════════════ */}
                <div id="bucket-needs-review" style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>⚠️ Needs Review</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Datos incompletos — NO mostrar a conductores</div>
                    </div>
                    <span style={{ ...S.badge("#3b1a00"), color: "#f59e0b" }}>{dispatchData?.needsReview?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.needsReview?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin bookings pendientes de revisión</div>
                  ) : (dispatchData.needsReview ?? []).map(b => {
                    // Use server-computed critical fields; fall back to client-side check
                    const missingFields: string[] = (b as any).missing_critical ?? []
                    const missingOptionalFields: string[] = (b as any).missing_optional ?? []
                    const hasMissingOptional: boolean = (b as any).missing_optional_info ?? missingOptionalFields.length > 0
                    const agingMs = Date.now() - new Date(b.created_at).getTime()
                    const agingMin = Math.floor(agingMs / 60000)
                    const agingLabel = agingMin < 60 ? `${agingMin}m` : `${Math.floor(agingMin / 60)}h ${agingMin % 60}m`
                    const isUrgent = agingMin > 60
                    const isComplete = missingFields.length === 0
                    const isExpanded = expandedDispatchId === b.id
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #2a1500" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ fontSize: 10, color: isUrgent ? "#ef4444" : "#f59e0b80", background: isUrgent ? "#3b000050" : "#3b1a0050", padding: "1px 6px", borderRadius: 4 }}>{isUrgent ? "🔴" : "⏱️"} {agingLabel}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                              {fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)} &middot; {b.vehicle_type || "?"} &middot; {b.client_name || "Sin cliente"}
                            </div>
                            {b.client_phone && <div style={{ fontSize: 12, color: "#aaa" }}>📞 {b.client_phone}</div>}
                            {missingFields.length > 0 && (
                              <div style={{ marginTop: 6, padding: "5px 8px", borderRadius: 6, background: "#3b1a0050", border: "1px solid #f59e0b40", fontSize: 11, color: "#fcd34d" }}>
                                ⚠️ Faltan críticos: {missingFields.join(", ")}
                              </div>
                            )}
                            {hasMissingOptional && (
                              <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#1a1a2a50", border: "1px solid #60a5fa30", fontSize: 11, color: "#93c5fd" }}>
                                ℹ️ Missing optional info: {missingOptionalFields.join(", ")}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge("#3b1a00"), color: "#f59e0b", fontSize: 10 }}>REVIEW</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#1a1000", borderRadius: 8, border: "1px solid #3b1a00", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 10 }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Estado pago:</span> <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b" }}>{b.payment_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pickup:</span> <span style={{ color: "#fff" }}>{b.pickup_address || b.pickup_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Dropoff:</span> <span style={{ color: "#fff" }}>{b.dropoff_address || b.dropoff_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fecha/Hora:</span> <span style={{ color: "#fff" }}>{fmtDate(b.pickup_at)}</span></div>
                              <div><span style={{ color: "#666" }}>Vehículo:</span> <span style={{ color: "#fff" }}>{b.vehicle_type || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pasajeros:</span> <span style={{ color: "#fff" }}>{b.passenger_count || b.passengers || 1}</span></div>
                              <div><span style={{ color: "#666" }}>Equipaje:</span> <span style={{ color: "#fff" }}>{b.luggage_count ?? "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Vuelo:</span> <span style={{ color: "#fff" }}>{b.flight_number || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fuente:</span> <span style={{ color: "#fff" }}>{b.lead_source || b.booking_origin || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Capturado por:</span> <span style={{ color: "#fff" }}>{b.captured_by_driver_code || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Email cliente:</span> <span style={{ color: "#fff" }}>{b.client_email || "—"}</span></div>
                            </div>
                            {b.notes && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Notas: {b.notes}</div>}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>✏️ Editar y Validar</button>
                          <button
                            onClick={() => {
                              if (!isComplete) { setGlobalToast({ msg: `Completar datos: ${missingFields.join(", ")}`, type: "error" }); setTimeout(() => setGlobalToast(null), 4000); return }
                              handleBookingStatus(b.id, "ready_for_dispatch", "not_required")
                            }}
                            style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: isComplete ? "#1e3a5f" : "#1a1a1a", color: isComplete ? "#60a5fa" : "#555", cursor: isComplete ? "pointer" : "not-allowed", opacity: isComplete ? 1 : 0.6 }}
                          >&rarr; {isComplete ? "Listo para Despacho" : "Completar datos primero"}</button>
                          <button onClick={() => handleBookingStatus(b.id, "cancelled", "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#3b0000", color: "#f87171", border: "none" }}>Cancelar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ════════════════════════════════════════════════
                    BUCKET 3: READY FOR DISPATCH (blue)
                ════════════════════════════════════════════════ */}
                <div id="bucket-ready" style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa" }}>📦 Ready for Dispatch</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Validado — listo para asignar conductor</div>
                    </div>
                    <span style={{ ...S.badge("#0c2340"), color: "#60a5fa" }}>{dispatchData?.readyForDispatch?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.readyForDispatch?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin bookings listos para despacho</div>
                  ) : (dispatchData.readyForDispatch ?? []).map(b => {
                    const missingOptionalFields: string[] = (b as any).missing_optional ?? []
                    const hasMissingOptional: boolean = (b as any).missing_optional_info ?? missingOptionalFields.length > 0
                    const agingMs = Date.now() - new Date(b.created_at).getTime()
                    const agingMin = Math.floor(agingMs / 60000)
                    const agingLabel = agingMin < 60 ? `${agingMin}m` : `${Math.floor(agingMin / 60)}h ${agingMin % 60}m`
                    const isExpanded = expandedDispatchId === b.id
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #0c2340" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ fontSize: 10, color: "#60a5fa80", background: "#1e3a5f50", padding: "1px 6px", borderRadius: 4 }}>⏱️ {agingLabel}</span>
                              {b.captured_by_driver_code && <span style={{ fontSize: 10, color: "#c9a84c", background: "#2a1a0050", padding: "1px 6px", borderRadius: 4 }}>src: {b.captured_by_driver_code}</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                              {fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)} &middot; {b.vehicle_type || "?"} &middot; {b.client_name || "Sin cliente"}
                            </div>
                            {b.client_phone && <div style={{ fontSize: 12, color: "#aaa" }}>📞 {b.client_phone}</div>}
                            {hasMissingOptional && (
                              <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#1a1a2a50", border: "1px solid #60a5fa30", fontSize: 11, color: "#93c5fd" }}>
                                ℹ️ Missing optional info: {missingOptionalFields.join(", ")}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge("#0c2340"), color: "#60a5fa", fontSize: 10 }}>READY</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#0a1a2a", borderRadius: 8, border: "1px solid #1e3a5f", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 10 }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Estado pago:</span> <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b" }}>{b.payment_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pickup:</span> <span style={{ color: "#fff" }}>{b.pickup_address || b.pickup_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Dropoff:</span> <span style={{ color: "#fff" }}>{b.dropoff_address || b.dropoff_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fecha/Hora:</span> <span style={{ color: "#fff" }}>{fmtDate(b.pickup_at)}</span></div>
                              <div><span style={{ color: "#666" }}>Vehículo:</span> <span style={{ color: "#fff" }}>{b.vehicle_type || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pasajeros:</span> <span style={{ color: "#fff" }}>{b.passenger_count || b.passengers || 1}</span></div>
                              <div><span style={{ color: "#666" }}>Equipaje:</span> <span style={{ color: "#fff" }}>{b.luggage_count ?? "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Vuelo:</span> <span style={{ color: "#fff" }}>{b.flight_number || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fuente:</span> <span style={{ color: "#fff" }}>{b.lead_source || b.booking_origin || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Capturado por:</span> <span style={{ color: "#fff" }}>{b.captured_by_driver_code || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Email cliente:</span> <span style={{ color: "#fff" }}>{b.client_email || "—"}</span></div>
                            </div>
                            {b.notes && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Notas: {b.notes}</div>}
                            {/* Smart Dispatch Priority Engine V1 — Dispatch Context */}
                            <div style={{ marginTop: 10, padding: "8px 10px", background: "#0a0a1a", borderRadius: 6, border: "1px solid #1e1e3f" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>🎯 Smart Dispatch Priority Engine V1</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11 }}>
                                <div><span style={{ color: "#666" }}>Service type:</span> <span style={{ color: "#fff" }}>{(b as any).service_type || "standard"}</span></div>
                                <div><span style={{ color: "#666" }}>Source driver:</span> <span style={{ color: "#c9a84c" }}>{(b as any).captured_by_driver_code || "—"}</span></div>
                                <div><span style={{ color: "#666" }}>Source override:</span> <span style={{ color: (b as any).source_driver_override ? "#a78bfa" : "#555" }}>{(b as any).source_driver_override ? "★ YES" : "No"}</span></div>
                                <div><span style={{ color: "#666" }}>Priority rank:</span> <span style={{ color: "#34d399" }}>{(b as any).dispatch_priority_rank != null ? `#${(b as any).dispatch_priority_rank}` : "—"}</span></div>
                                <div><span style={{ color: "#666" }}>Priority score:</span> <span style={{ color: "#34d399" }}>{(b as any).dispatch_priority_score != null ? `${(b as any).dispatch_priority_score?.toFixed(0)} pts` : "—"}</span></div>
                              </div>
                              {(b as any).priority_reason && (
                                <div style={{ marginTop: 6, fontSize: 10, color: "#6b7280", fontFamily: "monospace", wordBreak: "break-all" }}>
                                  {(b as any).priority_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            onClick={() => { setAssignModal({ bookingId: b.id, pickup: b.pickup_zone || b.pickup_address, dropoff: b.dropoff_zone || b.dropoff_address }); setAssignMsg("") }}
                            style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#14532d", color: "#4ade80", border: "none" }}
                          >👤 Asignar Conductor</button>
                          <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>✏️ Editar</button>
                          <button onClick={() => handleDispatchStatus(b.id, "needs_review")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px" }}>&larr; Mover a Revisión</button>
                          <button onClick={() => handleBookingStatus(b.id, "cancelled", "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#3b0000", color: "#f87171", border: "none" }}>Cancelar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ════════════════════════════════════════════════
                    BUCKET 4: ASSIGNED (purple)
                ════════════════════════════════════════════════ */}
                <div id="bucket-assigned" style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>👤 Assigned</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Conductor asignado — esperando ejecución</div>
                    </div>
                    <span style={{ ...S.badge("#3b1f5e"), color: "#a78bfa" }}>{dispatchData?.assigned?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.assigned?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin bookings asignados actualmente</div>
                  ) : (dispatchData.assigned ?? []).map(b => {
                    const missingOptionalFields: string[] = (b as any).missing_optional ?? []
                    const hasMissingOptional: boolean = (b as any).missing_optional_info ?? missingOptionalFields.length > 0
                    const agingMs = b.updated_at ? Date.now() - new Date(b.updated_at).getTime() : Date.now() - new Date(b.created_at).getTime()
                    const agingMin = Math.floor(agingMs / 60000)
                    const agingLabel = agingMin < 60 ? `${agingMin}m` : `${Math.floor(agingMin / 60)}h ${agingMin % 60}m`
                    const isExpanded = expandedDispatchId === b.id
                    // ── Fase 7/8: Overdue + offer no-response flags ──────────────────────────────
                    const isOverdue: boolean = (b as any).is_overdue ?? false
                    const overdueMinutes: number = (b as any).overdue_minutes ?? 0
                    const offerNoResponse: boolean = (b as any).offer_no_response ?? false
                    const offerPendingMinutes: number = (b as any).offer_pending_minutes ?? 0
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #2a1a40" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ fontSize: 10, color: "#a78bfa80", background: "#3b1f5e50", padding: "1px 6px", borderRadius: 4 }}>⏱️ {agingLabel}</span>
                              {/* Fase 7: Overdue badge */}
                              {isOverdue && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "#dc262620", border: "1px solid #dc262640", padding: "1px 7px", borderRadius: 4 }}>
                                  🔴 OVERDUE {overdueMinutes}m
                                </span>
                              )}
                              {/* Fase 8: Offer no-response badge */}
                              {offerNoResponse && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "#ea580c20", border: "1px solid #ea580c40", padding: "1px 7px", borderRadius: 4 }}>
                                  ⚠️ NO RESPONSE {offerPendingMinutes}m
                                </span>
                              )}
                              {/* Smart Dispatch Priority Engine V1 — SOURCE DRIVER OVERRIDE badge */}
                              {(b as any).source_driver_override && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "#7c3aed20", border: "1px solid #7c3aed50", padding: "1px 7px", borderRadius: 4 }}>
                                  ★ SOURCE DRIVER OVERRIDE
                                </span>
                              )}
                              {/* Smart Dispatch Priority Engine V1 — Priority Rank badge */}
                              {(b as any).dispatch_priority_rank != null && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "#05966920", border: "1px solid #05966940", padding: "1px 7px", borderRadius: 4 }}>
                                  #{(b as any).dispatch_priority_rank} · {(b as any).dispatch_priority_score?.toFixed(0)} pts
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                              {fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)} &middot; {b.vehicle_type || "?"} &middot; {b.client_name || "Sin cliente"}
                            </div>
                            {b.client_phone && <div style={{ fontSize: 12, color: "#aaa" }}>📞 {b.client_phone}</div>}
                            {b.driver_name && (
                              <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 2 }}>
                                👤 {b.driver_name} ({b.driver_code})
                                {b.driver_phone && (
                                  <a href={`tel:${b.driver_phone}`} style={{ color: "#60a5fa", marginLeft: 8 }}>📞 {b.driver_phone}</a>
                                )}
                              </div>
                            )}
                            {/* SLN Affiliate Company badge — Convergence Phase 1 */}
                            {(b as any).company_brand_display_name && (
                              <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#c9a84c", background: "#2a1a0060", border: "1px solid #c9a84c40", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
                                  🏢 {(b as any).company_brand_display_name}
                                </span>
                                <span style={{ fontSize: 10, color: "#555" }}>Member of Sottovento Luxury Network</span>
                              </div>
                            )}
                            {/* Priority reason detail */}
                            {(b as any).priority_reason && (
                              <div style={{ marginTop: 3, fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>
                                🎯 {(b as any).priority_reason}
                              </div>
                            )}
                            {hasMissingOptional && (
                              <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#1a1a2a50", border: "1px solid #60a5fa30", fontSize: 11, color: "#93c5fd" }}>
                                ℹ️ Missing optional info: {missingOptionalFields.join(", ")}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge(statusColor[b.status] ?? "#3b1f5e"), color: statusText[b.status] ?? "#a78bfa", fontSize: 10 }}>{b.status?.replace(/_/g, " ").toUpperCase()}</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#0f0a1a", borderRadius: 8, border: "1px solid #3b1f5e", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 10 }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Estado pago:</span> <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b" }}>{b.payment_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pickup:</span> <span style={{ color: "#fff" }}>{b.pickup_address || b.pickup_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Dropoff:</span> <span style={{ color: "#fff" }}>{b.dropoff_address || b.dropoff_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fecha/Hora:</span> <span style={{ color: "#fff" }}>{fmtDate(b.pickup_at)}</span></div>
                              <div><span style={{ color: "#666" }}>Vehículo:</span> <span style={{ color: "#fff" }}>{b.vehicle_type || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pasajeros:</span> <span style={{ color: "#fff" }}>{b.passenger_count || b.passengers || 1}</span></div>
                              <div><span style={{ color: "#666" }}>Equipaje:</span> <span style={{ color: "#fff" }}>{b.luggage_count ?? "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Vuelo:</span> <span style={{ color: "#fff" }}>{b.flight_number || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fuente:</span> <span style={{ color: "#fff" }}>{b.lead_source || b.booking_origin || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Capturado por:</span> <span style={{ color: "#fff" }}>{b.captured_by_driver_code || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Email cliente:</span> <span style={{ color: "#fff" }}>{b.client_email || "—"}</span></div>
                            </div>
                            {b.notes && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Notas: {b.notes}</div>}
                          </div>
                        )}
                        {/* BM10 Follow-Up 5: locked_dispatch badge — dispatch cycle is CLOSED */}
                        {(b as any).locked_dispatch && (
                          <div style={{ marginTop: 8, padding: "6px 12px", background: "#0d2a0d", border: "1px solid #14532d50", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12 }}>🔒</span>
                            <span style={{ fontSize: 11, color: "#4ade8090", fontWeight: 600 }}>Ciclo de dispatch cerrado — conductor confirmó. Solo monitoreo.</span>
                            <span style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>{(b as any).locked_reason}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>✏️ Editar</button>
                          {/* BM10 Follow-Up 5: Block Reassign when locked_dispatch=true.
                               locked_dispatch is set by admin/dispatch when dispatch_state=ASSIGNED
                               or dispatch_status=assigned (driver already accepted).
                               Showing Reassign here would allow re-opening a closed dispatch cycle.
                               Admin must use the Bookings panel with override_state=true. */}
                          {(b as any).locked_dispatch ? (
                            <button
                              disabled
                              title="Conductor ya aceptó este ride. Ciclo de dispatch cerrado. Para forzar reasignación, usa el panel de Bookings con override."
                              style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#0d2a0d", color: "#4ade8040", border: "1px solid #14532d30", cursor: "not-allowed", opacity: 0.5 }}
                            >
                              🔒 Reasignación Bloqueada
                            </button>
                          ) : (
                            <button
                              onClick={() => { setAssignModal({ bookingId: b.id, pickup: b.pickup_zone || b.pickup_address, dropoff: b.dropoff_zone || b.dropoff_address }); setAssignMsg("") }}
                              style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#3b1f5e", color: "#a78bfa", border: "none" }}
                            >🔄 Reasignar Conductor</button>
                          )}
                          {b.driver_phone && (
                            <a href={`tel:${b.driver_phone}`} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#14532d", color: "#4ade80", border: "none", textDecoration: "none" }}>
                              📞 Llamar Conductor
                            </a>
                          )}
                          {b.client_phone && (
                            <a href={`tel:${b.client_phone}`} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1e3a5f", color: "#60a5fa", border: "none", textDecoration: "none" }}>
                              📞 Llamar Cliente
                            </a>
                          )}
                          <button onClick={() => handleBookingStatus(b.id, "cancelled", "cancelled")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#3b0000", color: "#f87171", border: "none" }}>Cancelar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ════════════════════════════════════════════════
                    BUCKET 5: IN PROGRESS (green)
                ════════════════════════════════════════════════ */}
                <div id="bucket-in-progress" style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>🚗 In Progress</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Ride en ejecución activa</div>
                    </div>
                    <span style={{ ...S.badge("#14532d"), color: "#4ade80" }}>{dispatchData?.inProgress?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.inProgress?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin rides en progreso actualmente</div>
                  ) : (dispatchData.inProgress ?? []).map(b => {
                    const missingOptionalFields: string[] = (b as any).missing_optional ?? []
                    const hasMissingOptional: boolean = (b as any).missing_optional_info ?? missingOptionalFields.length > 0
                    const agingMs = b.updated_at ? Date.now() - new Date(b.updated_at).getTime() : 0
                    const agingMin = Math.floor(agingMs / 60000)
                    const agingLabel = agingMin < 60 ? `${agingMin}m` : `${Math.floor(agingMin / 60)}h ${agingMin % 60}m`
                    const isExpanded = expandedDispatchId === b.id
                    // ── Fase 7: Overdue flag for In Progress rides ──────────────────────────────────
                    const isOverdue: boolean = (b as any).is_overdue ?? false
                    const overdueMinutes: number = (b as any).overdue_minutes ?? 0
                    return (
                      <div key={b.id} style={{ display: "flex", flexDirection: "column", padding: "12px 0", borderBottom: "1px solid #1a2a1a", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ fontSize: 10, color: "#4ade8080", background: "#14532d50", padding: "1px 6px", borderRadius: 4 }}>🟢 {agingLabel}</span>
                              {/* Fase 7: Overdue badge for In Progress rides */}
                              {isOverdue && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "#dc262620", border: "1px solid #dc262640", padding: "1px 7px", borderRadius: 4 }}>
                                  🔴 OVERDUE {overdueMinutes}m
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>
                              {fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)} &middot; {b.vehicle_type || "?"} &middot; {b.client_name || "Sin cliente"}
                            </div>
                            {b.driver_name && <div style={{ fontSize: 12, color: "#4ade80" }}>👤 {b.driver_name} ({b.driver_code})</div>}
                            {/* SLN Affiliate Company badge — Convergence Phase 1 */}
                            {(b as any).company_brand_display_name && (
                              <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#c9a84c", background: "#2a1a0060", border: "1px solid #c9a84c40", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
                                  🏢 {(b as any).company_brand_display_name}
                                </span>
                                <span style={{ fontSize: 10, color: "#555" }}>Member of Sottovento Luxury Network</span>
                              </div>
                            )}
                            {hasMissingOptional && (
                              <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#1a1a2a50", border: "1px solid #60a5fa30", fontSize: 11, color: "#93c5fd" }}>
                                ℹ️ Missing optional info: {missingOptionalFields.join(", ")}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge(statusColor[b.status] ?? "#14532d"), color: statusText[b.status] ?? "#4ade80" }}>{b.status?.replace(/_/g, " ").toUpperCase()}</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: "12px 14px", background: "#0a1a0a", borderRadius: 8, border: "1px solid #14532d", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 10 }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Estado pago:</span> <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b" }}>{b.payment_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pickup:</span> <span style={{ color: "#fff" }}>{b.pickup_address || b.pickup_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Dropoff:</span> <span style={{ color: "#fff" }}>{b.dropoff_address || b.dropoff_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fecha/Hora:</span> <span style={{ color: "#fff" }}>{fmtDate(b.pickup_at)}</span></div>
                              <div><span style={{ color: "#666" }}>Vehículo:</span> <span style={{ color: "#fff" }}>{b.vehicle_type || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pasajeros:</span> <span style={{ color: "#fff" }}>{b.passenger_count || b.passengers || 1}</span></div>
                              <div><span style={{ color: "#666" }}>Equipaje:</span> <span style={{ color: "#fff" }}>{b.luggage_count ?? "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Conductor:</span> <span style={{ color: "#4ade80" }}>{b.driver_name} ({b.driver_code})</span></div>
                              <div><span style={{ color: "#666" }}>Tel. conductor:</span> <span style={{ color: "#fff" }}>{b.driver_phone || "—"}</span></div>
                            </div>
                            {b.notes && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Notas: {b.notes}</div>}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {b.driver_phone && (
                            <a href={`tel:${b.driver_phone}`} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#14532d", color: "#4ade80", border: "none", textDecoration: "none" }}>
                              📞 Conductor
                            </a>
                          )}
                          {b.client_phone && (
                            <a href={`tel:${b.client_phone}`} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1e3a5f", color: "#60a5fa", border: "none", textDecoration: "none" }}>
                              📞 Cliente
                            </a>
                          )}
                          <button
                            onClick={() => { if (window.confirm("Override restringido: ¿marcar como completado?")) handleBookingStatus(b.id, "completed", "not_required") }}
                            style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a1a1a", color: "#555", border: "1px solid #333" }}
                          >🔒 Override Completar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ════════════════════════════════════════════════
                    BUCKET 6: COMPLETED (gray — last 24h)
                ════════════════════════════════════════════════ */}
                <div id="bucket-completed" style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7280" }}>✅ Completed (24h)</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Rides completados en las últimas 24 horas</div>
                    </div>
                    <span style={{ ...S.badge("#1a1a1a"), color: "#6b7280" }}>{dispatchData?.completed?.length ?? 0}</span>
                  </div>
                  {!dispatchData?.completed?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin rides completados en las últimas 24h</div>
                  ) : (dispatchData.completed ?? []).map(b => {
                    const isExpanded = expandedDispatchId === b.id
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #1a1a1a" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ ...S.badge("#1a1a1a"), color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b", fontSize: 10 }}>{b.payment_status?.toUpperCase() || "PENDING"}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)}</div>
                            {b.driver_name && <div style={{ fontSize: 12, color: "#555" }}>👤 {b.driver_name}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge("#1a1a1a"), color: "#6b7280" }}>COMPLETED</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#111", borderRadius: 8, border: "1px solid #222", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 10 }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Estado pago:</span> <span style={{ color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b" }}>{b.payment_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Pickup:</span> <span style={{ color: "#fff" }}>{b.pickup_address || b.pickup_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Dropoff:</span> <span style={{ color: "#fff" }}>{b.dropoff_address || b.dropoff_zone || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Fecha/Hora:</span> <span style={{ color: "#fff" }}>{fmtDate(b.pickup_at)}</span></div>
                              <div><span style={{ color: "#666" }}>Vehículo:</span> <span style={{ color: "#fff" }}>{b.vehicle_type || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Conductor:</span> <span style={{ color: "#aaa" }}>{b.driver_name} ({b.driver_code})</span></div>
                              <div><span style={{ color: "#666" }}>Fuente:</span> <span style={{ color: "#fff" }}>{b.lead_source || b.booking_origin || "—"}</span></div>
                            </div>
                            {b.notes && <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>Notas: {b.notes}</div>}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button onClick={() => handleBookingStatus(b.id, "archived", "not_required")} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px" }}>Archivar</button>
                          <button
                            onClick={() => { if (window.confirm("Reabrir este booking requiere permiso especial. ¿Continuar?")) handleBookingStatus(b.id, "needs_review", "not_required") }}
                            style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a1a1a", color: "#555", border: "1px solid #333" }}
                          >🔒 Reabrir (restringido)</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* ══════════════════════════════════════════════
                    CANCEL METRICS PANEL (Bloque Maestro 4 — Cancellation Metrics Sync)
                ══════════════════════════════════════════════ */}
                <div id="cancel-metrics-panel" style={{ ...S.card, marginBottom: 16, marginTop: 16, borderColor: "#3b0000" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }}>📊 Cancellation Metrics — Bloque Maestro 4</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Fuente única de verdad — endpoint dedicado <code style={{ color: "#f87171", fontSize: 11 }}>/api/admin/cancel-metrics</code></div>
                    </div>
                    <button onClick={loadCancelMetrics} disabled={loadingCancelMetrics} style={{ ...S.btn(), fontSize: 11, padding: "4px 12px" }}>
                      {loadingCancelMetrics ? "..." : "↻ Refresh"}
                    </button>
                  </div>
                  {loadingCancelMetrics && !cancelMetricsData ? (
                    <div style={{ color: "#555", fontSize: 13, padding: "12px 0" }}>Cargando métricas de cancelación...</div>
                  ) : cancelMetricsData ? (
                    <>
                      {/* ── Row 1: Time-based counts ── */}
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Conteos por período</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                        {[
                          { label: "Last 24h",   value: cancelMetricsData.counts.last_24h,   color: "#f87171" },
                          { label: "Today",      value: cancelMetricsData.counts.today,      color: "#f87171" },
                          { label: "This Week",  value: cancelMetricsData.counts.this_week,  color: "#fb923c" },
                          { label: "This Month", value: cancelMetricsData.counts.this_month, color: "#fbbf24" },
                          { label: "All Time",   value: cancelMetricsData.counts.total,      color: "#888" },
                        ].map(m => (
                          <div key={m.label} style={{ background: "#0d0000", border: "1px solid #3b0000", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: m.value > 0 ? m.color : "#444" }}>{m.value}</div>
                            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* ── Row 2: Breakdown by origin ── */}
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Breakdown por origen</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                        {[
                          { label: "By Client",  value: cancelMetricsData.breakdown.by_client, color: "#fbbf24", icon: "👤" },
                          { label: "By Driver",  value: cancelMetricsData.breakdown.by_driver, color: "#f87171", icon: "🚗" },
                          { label: "By Admin",   value: cancelMetricsData.breakdown.by_admin,  color: "#a78bfa", icon: "🛠️" },
                          { label: "By System",  value: cancelMetricsData.breakdown.by_system, color: "#6b7280", icon: "⚙️" },
                        ].map(m => (
                          <div key={m.label} style={{ background: "#0d0000", border: "1px solid #2a1a1a", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{m.icon}</span>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: m.value > 0 ? m.color : "#444" }}>{m.value}</div>
                              <div style={{ fontSize: 10, color: "#666" }}>{m.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* ── Row 3: Stage breakdown ── */}
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Breakdown por etapa de cancelación</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                        {[
                          { label: "Before Assignment", value: cancelMetricsData.stage_breakdown.before_assignment, color: "#60a5fa" },
                          { label: "Assigned",          value: cancelMetricsData.stage_breakdown.assigned,          color: "#fb923c" },
                          { label: "In Progress",       value: cancelMetricsData.stage_breakdown.in_progress,       color: "#f87171" },
                          { label: "Post Driver Issue", value: cancelMetricsData.stage_breakdown.post_driver_issue, color: "#a78bfa" },
                        ].map(m => (
                          <div key={m.label} style={{ background: "#0d0000", border: "1px solid #1a1a2a", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: m.value > 0 ? m.color : "#444" }}>{m.value}</div>
                            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* ── Footer: last updated ── */}
                      <div style={{ fontSize: 10, color: "#444", textAlign: "right" }}>
                        Actualizado: {new Date(cancelMetricsData.generated_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#555", fontSize: 13, padding: "12px 0" }}>Sin datos de cancelación. Haz clic en Refresh para cargar.</div>
                  )}
                </div>

                {/* ══════════════════════════════════════════════
                    BM6: SLA PROTECTION QUEUE
                ══════════════════════════════════════════════ */}
                <div id="sla-protection-queue" style={{ ...S.card, marginBottom: 16, marginTop: 16, borderColor: slaQueue.some(b => b.sla_current_state === 'sla_critical') ? '#f87171' : slaQueue.some(b => b.sla_current_state === 'sla_high_risk') ? '#f59e0b' : '#c9a84c' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>🛡️ SLA Protection Queue — BM6</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Rides under active SLA monitoring · Smart Reassignment Engine</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ ...S.badge(slaQueue.length > 0 ? "#3b1a00" : "#1a1a1a"), color: slaQueue.length > 0 ? "#f59e0b" : "#555" }}>{slaQueue.length} active</span>
                      <button
                        onClick={async () => {
                          setRunningSlaEval(true); setSlaEvalMsg("")
                          try {
                            const r = await fetch("/api/admin/sla-evaluate", { headers: { "x-admin-key": "sln-admin-2024" } })
                            const d = await r.json()
                            setSlaEvalMsg(`✅ Evaluated ${d.evaluated ?? 0} · Escalated ${d.escalated ?? 0}`)
                            loadSlaQueue()
                          } catch (e: any) { setSlaEvalMsg(`❌ ${e.message}`) }
                          finally { setRunningSlaEval(false) }
                        }}
                        disabled={runningSlaEval}
                        style={{ ...S.btn(), fontSize: 11, padding: "4px 12px", background: "#1a1500", color: "#c9a84c", border: "1px solid #c9a84c40" }}
                      >{runningSlaEval ? "Evaluating..." : "⚡ Run SLA Eval"}</button>
                      <button onClick={() => loadSlaQueue()} disabled={loadingSlaQueue} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px" }}>{loadingSlaQueue ? "..." : "🔄 Refresh"}</button>
                    </div>
                  </div>
                  {slaEvalMsg && <div style={{ fontSize: 12, color: slaEvalMsg.startsWith("✅") ? "#4ade80" : "#f87171", marginBottom: 10 }}>{slaEvalMsg}</div>}
                  {slaQueue.length === 0 ? (
                    <div style={{ color: "#555", fontSize: 13, padding: "8px 0" }}>✅ No rides under SLA monitoring. All services on track.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {slaQueue.map((b: any) => {
                        const isCritical = b.sla_current_state === "sla_critical"
                        const isHighRisk = b.sla_current_state === "sla_high_risk"
                        const isMonitoring = b.sla_current_state === "sla_monitoring"
                        const stateColor = isCritical ? "#f87171" : isHighRisk ? "#f59e0b" : "#c9a84c"
                        const stateBg = isCritical ? "#3b0000" : isHighRisk ? "#3b2200" : "#1a1500"
                        const minsLeft = Math.round(parseFloat(b.minutes_to_pickup ?? "999"))
                        const isRunning = runningSmartReassign[b.id]
                        const reassignMsg = smartReassignMsg[b.id]
                        const isMarking = markingSafe[b.id]
                        return (
                          <div key={b.id} style={{ background: stateBg, border: `1px solid ${stateColor}40`, borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                                  <span style={{ ...S.badge(stateBg), color: stateColor, fontSize: 10, fontWeight: 700, border: `1px solid ${stateColor}` }}>
                                    {isCritical ? "🚨 CRITICAL" : isHighRisk ? "⚠️ HIGH RISK" : "👁️ MONITORING"}
                                  </span>
                                  <span style={{ ...S.badge("#1a1a1a"), color: "#c9a84c", fontSize: 10 }}>{b.sla_protection_level ?? "STANDARD"}</span>
                                  {b.dispatcher_override_required && <span style={{ ...S.badge("#3b0000"), color: "#f87171", fontSize: 10 }}>⚡ OVERRIDE REQUIRED</span>}
                                  {b.reassignment_count > 0 && <span style={{ ...S.badge("#1a0a2a"), color: "#a78bfa", fontSize: 10 }}>↩️ Reassigned ×{b.reassignment_count}</span>}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                                  <span style={{ color: "#888", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                                  {" · "}
                                  <span style={{ color: stateColor, fontWeight: 700 }}>{minsLeft > 0 ? `${minsLeft} min to pickup` : "OVERDUE"}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>📍 {b.pickup_address?.slice(0, 60)}{b.pickup_address?.length > 60 ? "..." : ""}</div>
                                <div style={{ fontSize: 11, color: "#555" }}>
                                  {b.driver_code ? `👤 ${b.driver_name} (${b.driver_code})` : "⚠️ No driver assigned"}
                                  {" · "}
                                  <span style={{ color: "#888" }}>{b.last_system_action ?? "—"}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}>
                                {/* Smart Reassign button */}
                                <button
                                  onClick={async () => {
                                    setRunningSmartReassign(prev => ({ ...prev, [b.id]: true }))
                                    setSmartReassignMsg(prev => ({ ...prev, [b.id]: "" }))
                                    try {
                                      const r = await fetch("/api/admin/smart-reassign", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                        body: JSON.stringify({ booking_id: b.id, admin_override: true })
                                      })
                                      const d = await r.json()
                                      if (d.success) {
                                        setSmartReassignMsg(prev => ({ ...prev, [b.id]: `✅ ${d.action === 'rescue_assigned' ? `Rescue → ${d.rescue_driver?.driver_code}` : 'Candidates ready'}` }))
                                        loadSlaQueue(); loadDispatch()
                                      } else {
                                        setSmartReassignMsg(prev => ({ ...prev, [b.id]: `❌ ${d.error ?? d.action}` }))
                                      }
                                    } catch (e: any) { setSmartReassignMsg(prev => ({ ...prev, [b.id]: `❌ ${e.message}` })) }
                                    finally { setRunningSmartReassign(prev => ({ ...prev, [b.id]: false })) }
                                  }}
                                  disabled={isRunning}
                                  style={{ ...S.btn(), fontSize: 10, padding: "5px 10px", background: isCritical ? "#3b0000" : "#1a1500", color: stateColor, border: `1px solid ${stateColor}40` }}
                                >{isRunning ? "Reassigning..." : "⚡ Smart Reassign"}</button>
                                {/* Mark Safe button */}
                                <button
                                  onClick={async () => {
                                    setMarkingSafe(prev => ({ ...prev, [b.id]: true }))
                                    try {
                                      await fetch("/api/admin/sla-mark-safe", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                        body: JSON.stringify({ booking_id: b.id, marked_by: "admin" })
                                      })
                                      loadSlaQueue()
                                    } catch { }
                                    finally { setMarkingSafe(prev => ({ ...prev, [b.id]: false })) }
                                  }}
                                  disabled={isMarking}
                                  style={{ ...S.btn(), fontSize: 10, padding: "5px 10px" }}
                                >{isMarking ? "..." : "✅ Mark Safe"}</button>
                              </div>
                            </div>
                            {reassignMsg && <div style={{ fontSize: 11, color: reassignMsg.startsWith("✅") ? "#4ade80" : "#f87171", marginTop: 6 }}>{reassignMsg}</div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ══════════════════════════════════════════════
                    BM7: CLIENT COMMUNICATION QUEUE
                ══════════════════════════════════════════════ */}
                <div id="bucket-comm-queue" style={{ ...S.card, marginBottom: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#818cf8" }}>📨 Client Communication Queue — BM7</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Pending approvals, recent notifications, and channel delivery status</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {commQueue.stats?.pending_count > 0 && <span style={{ ...S.badge("#1e1b4b"), color: "#818cf8", fontSize: 11 }}>⚠️ {commQueue.stats.pending_count} pending</span>}
                      <button onClick={() => { setRunningBm7Mig(true); setBm7MigMsg(""); fetch("/api/admin/migrate-bm7", { headers: { "x-admin-key": "sln-admin-2024" } }).then(r => r.json()).then(d => setBm7MigMsg(d.success ? "✓ BM7 migration OK" : `❌ ${d.error ?? "Error"}`)).catch(() => setBm7MigMsg("❌ Network error")).finally(() => setRunningBm7Mig(false)) }} disabled={runningBm7Mig} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#1e1b4b", color: "#818cf8", border: "1px solid #3730a3" }}>{runningBm7Mig ? "..." : "🔧 Run BM7 Migration"}</button>
                      <button onClick={() => loadCommQueue()} disabled={loadingCommQueue} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px" }}>{loadingCommQueue ? "..." : "🔄 Refresh"}</button>
                    </div>
                  </div>
                  {bm7MigMsg && <div style={{ fontSize: 12, marginBottom: 10, color: bm7MigMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{bm7MigMsg}</div>}
                  {commQueueMsg && <div style={{ fontSize: 12, marginBottom: 10, color: commQueueMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{commQueueMsg}</div>}
                  {/* Stats Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
                    {[{label: "Sent 24h", value: commQueue.stats?.sent_24h ?? 0, color: "#4ade80"}, {label: "Failed 24h", value: commQueue.stats?.failed_24h ?? 0, color: "#f87171"}, {label: "Via Email", value: commQueue.stats?.sent_email ?? 0, color: "#818cf8"}, {label: "Via SMS", value: commQueue.stats?.sent_sms ?? 0, color: "#60a5fa"}, {label: "Via WhatsApp", value: commQueue.stats?.sent_whatsapp ?? 0, color: "#4ade80"}].map(s => (
                      <div key={s.label} style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Pending Drafts */}
                  {commQueue.pending_drafts?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>⏳ PENDING ADMIN APPROVAL</div>
                      {commQueue.pending_drafts.map((d: any) => (
                        <div key={d.id} style={{ background: "#0d0d1a", border: "1px solid #3730a3", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                                <span style={{ ...S.badge("#1e1b4b"), color: "#818cf8", fontSize: 10 }}>{d.message_type?.toUpperCase()}</span>
                                <span style={{ ...S.badge("#1a1a1a"), color: "#888", fontSize: 10 }}>{d.trigger_source}</span>
                                <span style={{ fontSize: 11, color: "#555" }}>{d.booking_id?.slice(0,8).toUpperCase()}</span>
                              </div>
                              <div style={{ fontSize: 13, color: "#e5e5e5" }}>👤 {d.client_name ?? "Unknown"} {d.client_phone ? `· ${d.client_phone}` : ""}</div>
                              {d.client_email && <div style={{ fontSize: 12, color: "#888" }}>✉️ {d.client_email}</div>}
                              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{new Date(d.created_at).toLocaleString()}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <button disabled={approvingComm[d.id]} onClick={async () => { setApprovingComm(p => ({...p, [d.id]: true})); setCommQueueMsg(""); try { const r = await fetch("/api/admin/communication-approve", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" }, body: JSON.stringify({ log_id: d.id, action: "approve" }) }); const res = await r.json(); setCommQueueMsg(r.ok ? `✅ Sent via ${res.channel_used}` : `❌ ${res.error ?? "Error"}`); loadCommQueue() } catch { setCommQueueMsg("❌ Network error") } finally { setApprovingComm(p => ({...p, [d.id]: false})) } }} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#14532d", color: "#4ade80", border: "none" }}>{approvingComm[d.id] ? "..." : "✅ Approve & Send"}</button>
                              <button disabled={approvingComm[d.id]} onClick={async () => { setApprovingComm(p => ({...p, [d.id]: true})); try { await fetch("/api/admin/communication-approve", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" }, body: JSON.stringify({ log_id: d.id, action: "cancel" }) }); loadCommQueue() } catch { } finally { setApprovingComm(p => ({...p, [d.id]: false})) } }} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#3b0000", color: "#f87171", border: "none" }}>✕ Cancel</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Recent Sent */}
                  <div>
                    <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>📬 RECENT NOTIFICATIONS (24h)</div>
                    {!commQueue.recent_sent?.length ? (
                      <div style={{ color: "#555", fontSize: 13 }}>No notifications sent in the last 24 hours.</div>
                    ) : commQueue.recent_sent.slice(0, 10).map((n: any) => (
                      <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                            <span style={{ ...S.badge(n.delivery_status === "sent" ? "#14532d" : "#3b0000"), color: n.delivery_status === "sent" ? "#4ade80" : "#f87171", fontSize: 10 }}>{n.delivery_status?.toUpperCase()}</span>
                            <span style={{ ...S.badge("#1a1a1a"), color: "#888", fontSize: 10 }}>{n.channel?.toUpperCase()}</span>
                            <span style={{ fontSize: 11, color: "#818cf8" }}>{n.message_type}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#888" }}>👤 {n.client_name ?? "?"} · {new Date(n.created_at).toLocaleString()}</div>
                        </div>
                        <button onClick={async () => { if (expandedCommLog === n.booking_id) { setExpandedCommLog(null); return }; setExpandedCommLog(n.booking_id); if (!commLogData[n.booking_id]) { try { const r = await fetch(`/api/admin/communication-log?booking_id=${n.booking_id}`, { headers: { "x-admin-key": "sln-admin-2024" } }); if (r.ok) { const d = await r.json(); setCommLogData(p => ({...p, [n.booking_id]: d.timeline ?? []})) } } catch { } } }} style={{ ...S.btn(), fontSize: 10, padding: "3px 8px" }}>📋 Timeline</button>
                      </div>
                    ))}
                    {/* Expanded Timeline */}
                    {expandedCommLog && commLogData[expandedCommLog] && (
                      <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: "12px 14px", marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, marginBottom: 8 }}>📋 Communication Timeline — {expandedCommLog?.slice(0,8).toUpperCase()}</div>
                        {commLogData[expandedCommLog].map((entry: any) => (
                          <div key={entry.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #111" }}>
                            <div style={{ width: 60, fontSize: 10, color: "#555", flexShrink: 0 }}>{new Date(entry.created_at).toLocaleTimeString()}</div>
                            <div style={{ flex: 1 }}>
                              <span style={{ ...S.badge(entry.delivery_status === "sent" ? "#14532d" : entry.delivery_status === "failed" ? "#3b0000" : "#1e1b4b"), color: entry.delivery_status === "sent" ? "#4ade80" : entry.delivery_status === "failed" ? "#f87171" : "#818cf8", fontSize: 10 }}>{entry.delivery_status?.toUpperCase()}</span>
                              {" "}<span style={{ fontSize: 12, color: "#aaa" }}>{entry.message_type}</span>
                              {" via "}<span style={{ fontSize: 12, color: "#60a5fa" }}>{entry.channel}</span>
                              {entry.approved_by_admin && <span style={{ fontSize: 10, color: "#c9a84c", marginLeft: 6 }}>★ Admin approved</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                 {/* ════════════════════════════════════════════
                    BM8: AIRPORT INTELLIGENCE QUEUE
                ════════════════════════════════════════════ */}
                <div id="bucket-airport-intelligence" style={{ ...S.card, marginBottom: 16, marginTop: 16, border: "1px solid #1e3a5f" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>✈️ Airport Intelligence Queue — BM8</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Reservas aeroportuarias activas con monitoreo de vuelo en tiempo real</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {airportQueue.stats?.monitoring_active > 0 && <span style={{ ...S.badge("#0c2340"), color: "#38bdf8", fontSize: 11 }}>✈️ {airportQueue.stats.monitoring_active} monitored</span>}
                      {airportQueue.stats?.delayed_count > 0 && <span style={{ ...S.badge("#3b2200"), color: "#f59e0b", fontSize: 11 }}>⏱️ {airportQueue.stats.delayed_count} delayed</span>}
                      {airportQueue.stats?.irregular_count > 0 && <span style={{ ...S.badge("#3b0000"), color: "#f87171", fontSize: 11 }}>🚨 {airportQueue.stats.irregular_count} irregular</span>}
                      {airportQueue.stats?.manual_review_count > 0 && <span style={{ ...S.badge("#2a1a00"), color: "#fb923c", fontSize: 11 }}>⚠️ {airportQueue.stats.manual_review_count} review needed</span>}
                      {airportQueue.stats?.not_found_count > 0 && <span style={{ ...S.badge("#1a1a00"), color: "#fde68a", fontSize: 11 }}>❓ {airportQueue.stats.not_found_count} not found</span>}
                      <button onClick={() => { setRunningBm8Mig(true); setBm8MigMsg(""); fetch("/api/admin/migrate-bm8", { headers: { "x-admin-key": "sln-admin-2024" } }).then(r => r.json()).then(d => setBm8MigMsg(d.success ? "✓ BM8 migration OK" : `❌ ${d.error ?? "Error"}`)).catch(() => setBm8MigMsg("❌ Network error")).finally(() => setRunningBm8Mig(false)) }} disabled={runningBm8Mig} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#0c2340", color: "#38bdf8", border: "1px solid #1e3a5f" }}>{runningBm8Mig ? "..." : "🔧 Run BM8 Migration"}</button>
                      <button onClick={async () => { setLoadingAirportQueue(true); setAirportQueueMsg(""); try { const r = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } }); const d = await r.json(); if (r.ok) { setAirportQueue({ airport_bookings: d.airport_bookings ?? [], stats: d.stats ?? {} }); setAirportQueueMsg(`✅ ${d.airport_bookings?.length ?? 0} airport bookings loaded`) } else { setAirportQueueMsg(`❌ ${d.error ?? "Error"}`) } } catch { setAirportQueueMsg("❌ Network error") } finally { setLoadingAirportQueue(false) } }} disabled={loadingAirportQueue} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#0c2340", color: "#38bdf8", border: "1px solid #1e3a5f" }}>{loadingAirportQueue ? "Loading..." : "🔄 Refresh Queue"}</button>
                    </div>
                  </div>
                  {bm8MigMsg && <div style={{ fontSize: 12, marginBottom: 10, color: bm8MigMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{bm8MigMsg}</div>}
                  {airportQueueMsg && <div style={{ fontSize: 12, marginBottom: 10, color: airportQueueMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{airportQueueMsg}</div>}
                  {/* ── BM8 Annex: Airport Load Detail ─────────────────────────────── */}
                  <div style={{ background: "#050d1a", border: "1px solid #1e3a5f", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>Airport Load Intelligence</div>
                      <button
                        onClick={async () => {
                          setLoadingAirportLoad(true); setAirportLoadMsg("");
                          try {
                            const r = await fetch("/api/admin/airport-load?airport_code=MCO", { headers: { "x-admin-key": "sln-admin-2024" } });
                            const d = await r.json();
                            if (r.ok) { setAirportLoadDetail(d); setAirportLoadMsg("") }
                            else { setAirportLoadMsg(`❌ ${d.error ?? "Error"}`); }
                          } catch { setAirportLoadMsg("❌ Network error") }
                          finally { setLoadingAirportLoad(false) }
                        }}
                        disabled={loadingAirportLoad}
                        style={{ fontSize: 11, padding: "3px 10px", background: "#0c2340", color: "#38bdf8", border: "1px solid #1e3a5f", borderRadius: 6, cursor: "pointer" }}
                      >{loadingAirportLoad ? "Loading..." : "📊 Load Airport Activity"}</button>
                    </div>
                    {airportLoadMsg && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6 }}>{airportLoadMsg}</div>}
                    {airportLoadDetail ? (
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          {[{label: "Load Level", value: (airportLoadDetail.airport_load_level ?? "--").toUpperCase(), color: airportLoadDetail.airport_load_level === "peak" ? "#f87171" : airportLoadDetail.airport_load_level === "high" ? "#f97316" : airportLoadDetail.airport_load_level === "moderate" ? "#facc15" : "#4ade80"}, {label: "Arr. 30m", value: airportLoadDetail.arrivals_next_30m ?? 0, color: "#38bdf8"}, {label: "Arr. 60m", value: airportLoadDetail.arrivals_next_60m ?? 0, color: "#38bdf8"}, {label: "Arr. 120m", value: airportLoadDetail.arrivals_next_120m ?? 0, color: "#38bdf8"}, {label: "Delayed", value: airportLoadDetail.delayed_flights_count ?? 0, color: "#f59e0b"}, {label: "Cancelled", value: airportLoadDetail.cancelled_flights_count ?? 0, color: "#f87171"}, {label: "Diverted", value: airportLoadDetail.diverted_flights_count ?? 0, color: "#a78bfa"}, {label: "Delay Index", value: `${airportLoadDetail.delay_pressure_index ?? 0}%`, color: "#fb923c"}].map(s => (
                          <div key={s.label} style={{ background: "#0a0a0a", border: `1px solid ${s.color}30`, borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{s.label}</div>
                          </div>
                        ))}
                        </div>
                        {airportLoadDetail.terminal_congestion_hint && (
                          <div style={{ fontSize: 11, color: "#f97316", marginBottom: 6 }}>Terminal: {airportLoadDetail.terminal_congestion_hint}</div>
                        )}
                        {airportLoadDetail.terminal_load_summary && Object.keys(airportLoadDetail.terminal_load_summary).length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {Object.entries(airportLoadDetail.terminal_load_summary).map(([t, cnt]: [string, any]) => (
                              <span key={t} style={{ fontSize: 11, padding: "2px 8px", background: "#0c2340", color: "#38bdf8", border: "1px solid #1e3a5f", borderRadius: 4 }}>T-{t}: {cnt}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "#444", marginTop: 6 }}>Source: {airportLoadDetail.source} · {airportLoadDetail.bookings_tracked ?? 0} bookings tracked</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#555" }}>Click "Load Airport Activity" to view real-time airport load context for MCO.</div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    {[{label: "Monitored", value: airportQueue.stats?.monitoring_active ?? 0, color: "#38bdf8"}, {label: "Delayed", value: airportQueue.stats?.delayed_count ?? 0, color: "#f59e0b"}, {label: "Landed", value: airportQueue.stats?.landed_count ?? 0, color: "#34d399"}, {label: "Irregular", value: airportQueue.stats?.irregular_count ?? 0, color: "#f87171"}, {label: "Manual Review", value: airportQueue.stats?.manual_review_count ?? 0, color: "#fb923c"}, {label: "Verified", value: airportQueue.stats?.verified_count ?? 0, color: "#4ade80"}, {label: "Not Found", value: airportQueue.stats?.not_found_count ?? 0, color: "#fde68a"}].map(s => (
                      <div key={s.label} style={{ background: "#0a0a0a", border: `1px solid ${s.color}30`, borderRadius: 8, padding: "8px 14px", minWidth: 80, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Airport bookings list */}
                  {!airportQueue.airport_bookings?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>No airport bookings under monitoring. Click Refresh Queue to load.</div>
                  ) : airportQueue.airport_bookings.map((b: any) => {
                    const isExpanded = expandedAirportId === b.id
                    const isIrregular = b.airport_irregularity_flag
                    const isDelayed = b.airport_intelligence_status === "delayed"
                    const isLanded = b.airport_intelligence_status === "landed" || b.airport_phase === "baggage_claim"
                    const isPassengerReady = b.airport_phase === "passenger_ready" || b.airport_phase === "pickup_window_active"
                    const phaseColor = isIrregular ? "#f87171" : isPassengerReady ? "#4ade80" : isLanded ? "#34d399" : isDelayed ? "#f59e0b" : "#38bdf8"
                    const phaseIcon = isIrregular ? "🚨" : isPassengerReady ? "✅" : isLanded ? "🛬" : isDelayed ? "⏱️" : "✈️"
                    const effectiveArrival = b.actual_arrival_at ?? b.estimated_arrival_at ?? b.scheduled_arrival_at
                    const arrivalLabel = effectiveArrival ? new Date(effectiveArrival).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null
                    const operationalPickupLabel = b.operational_pickup_target_at ? new Date(b.operational_pickup_target_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #1e3a5f30" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ ...S.badge("#0c2340"), color: phaseColor, fontSize: 10, fontWeight: 700 }}>{phaseIcon} {(b.airport_phase ?? "unknown").replace(/_/g, " ").toUpperCase()}</span>
                              {b.flight_number && <span style={{ ...S.badge("#1a1a1a"), color: "#aaa", fontSize: 10 }}>✈️ {b.flight_number}</span>}
                              {b.airport_code && <span style={{ ...S.badge("#1a1a1a"), color: "#888", fontSize: 10 }}>{b.airport_code}</span>}
                              {b.terminal_code && <span style={{ ...S.badge("#1a1a1a"), color: "#888", fontSize: 10 }}>T{b.terminal_code}</span>}
                              {isIrregular && <span style={{ ...S.badge("#3b0000"), color: "#f87171", fontSize: 10, fontWeight: 700 }}>🚨 IRREGULAR</span>}
                              {b.manual_flight_review_required && <span style={{ ...S.badge("#2a1a00"), color: "#fb923c", fontSize: 10, fontWeight: 700 }}>⚠️ REVIEW NEEDED</span>}
                              {b.flight_validation_status === "not_found" && <span style={{ ...S.badge("#1a1a00"), color: "#fde68a", fontSize: 10 }}>❓ FLIGHT NOT FOUND</span>}
                              {b.flight_validation_status === "invalid_format" && <span style={{ ...S.badge("#1a1a00"), color: "#fde68a", fontSize: 10 }}>⚠️ INVALID FORMAT</span>}
                              {b.flight_validation_status === "provider_unavailable" && <span style={{ ...S.badge("#1a1a2a"), color: "#818cf8", fontSize: 10 }}>📡 PROVIDER UNAVAIL.</span>}
                              {b.flight_validation_status === "verified" && <span style={{ ...S.badge("#003320"), color: "#4ade80", fontSize: 10 }}>✓ VERIFIED</span>}
                              {b.flight_validation_status === "manually_reviewed" && <span style={{ ...S.badge("#003320"), color: "#34d399", fontSize: 10 }}>✓ MANUAL REVIEW</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{b.pickup_address || b.pickup_zone || "?"} → {b.dropoff_address || b.dropoff_zone || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                              {b.client_name && <span>👤 {b.client_name} · </span>}
                              {b.driver_name && <span>🚗 {b.driver_name} ({b.driver_code}) · </span>}
                              {arrivalLabel && <span>✈️ Arr: {arrivalLabel}</span>}
                              {b.flight_delay_minutes > 0 && <span style={{ color: "#f59e0b" }}> · +{b.flight_delay_minutes}min delay</span>}
                              {operationalPickupLabel && <span style={{ color: "#38bdf8" }}> · Pickup target: {operationalPickupLabel}</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {/* Live Refresh button */}
                              <button onClick={async () => {
                                setRunningFlightRefresh(p => ({...p, [b.id]: true}))
                                setFlightRefreshMsg(p => ({...p, [b.id]: ""}))
                                try {
                                  const r = await fetch("/api/admin/airport-refresh-flight", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                    body: JSON.stringify({ booking_id: b.id })
                                  })
                                  const d = await r.json()
                                  if (r.ok) {
                                    setFlightRefreshMsg(p => ({...p, [b.id]: `✅ Live: ${d.flight_validation_status} · ${d.final_phase} · ${d.flight_provider_used}`}))
                                    const qr = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } })
                                    const qd = await qr.json()
                                    if (qr.ok) setAirportQueue({ airport_bookings: qd.airport_bookings ?? [], stats: qd.stats ?? {} })
                                  } else { setFlightRefreshMsg(p => ({...p, [b.id]: `❌ ${d.error ?? "Error"}`})) }
                                } catch { setFlightRefreshMsg(p => ({...p, [b.id]: "❌ Network error"})) }
                                finally { setRunningFlightRefresh(p => ({...p, [b.id]: false})) }
                              }} disabled={runningFlightRefresh[b.id]} style={{ ...S.btn(), fontSize: 9, padding: "2px 8px", background: "#0c2340", color: "#38bdf8", border: "1px solid #1e3a5f" }}>🔄 Live Refresh</button>
                              {/* Manual Validate */}
                              <button onClick={async () => {
                                setRunningFlightRefresh(p => ({...p, [b.id]: true}))
                                setFlightRefreshMsg(p => ({...p, [b.id]: ""}))
                                try {
                                  const r = await fetch("/api/admin/airport-refresh-flight", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                    body: JSON.stringify({ booking_id: b.id, manual_validate: true })
                                  })
                                  const d = await r.json()
                                  if (r.ok) {
                                    setFlightRefreshMsg(p => ({...p, [b.id]: `✅ Manually reviewed`}))
                                    const qr = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } })
                                    const qd = await qr.json()
                                    if (qr.ok) setAirportQueue({ airport_bookings: qd.airport_bookings ?? [], stats: qd.stats ?? {} })
                                  } else { setFlightRefreshMsg(p => ({...p, [b.id]: `❌ ${d.error ?? "Error"}`})) }
                                } catch { setFlightRefreshMsg(p => ({...p, [b.id]: "❌ Network error"})) }
                                finally { setRunningFlightRefresh(p => ({...p, [b.id]: false})) }
                              }} disabled={runningFlightRefresh[b.id]} style={{ ...S.btn(), fontSize: 9, padding: "2px 8px", background: "#003320", color: "#4ade80", border: "none" }}>✓ Manual Validate</button>
                              {/* Mark Passenger Ready */}
                              <button onClick={async () => {
                                setRunningFlightRefresh(p => ({...p, [b.id]: true}))
                                setFlightRefreshMsg(p => ({...p, [b.id]: ""}))
                                try {
                                  const r = await fetch("/api/admin/airport-refresh-flight", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                    body: JSON.stringify({ booking_id: b.id, mark_passenger_ready: true })
                                  })
                                  const d = await r.json()
                                  if (r.ok) {
                                    setFlightRefreshMsg(p => ({...p, [b.id]: `✅ Passenger ready`}))
                                    const qr = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } })
                                    const qd = await qr.json()
                                    if (qr.ok) setAirportQueue({ airport_bookings: qd.airport_bookings ?? [], stats: qd.stats ?? {} })
                                  } else { setFlightRefreshMsg(p => ({...p, [b.id]: `❌ ${d.error ?? "Error"}`})) }
                                } catch { setFlightRefreshMsg(p => ({...p, [b.id]: "❌ Network error"})) }
                                finally { setRunningFlightRefresh(p => ({...p, [b.id]: false})) }
                              }} disabled={runningFlightRefresh[b.id]} style={{ ...S.btn(), fontSize: 9, padding: "2px 8px", background: "#003320", color: "#34d399", border: "none" }}>🛬 Mark Ready</button>
                              {/* Force Pickup Window */}
                              <button onClick={async () => {
                                setRunningFlightRefresh(p => ({...p, [b.id]: true}))
                                setFlightRefreshMsg(p => ({...p, [b.id]: ""}))
                                try {
                                  const r = await fetch("/api/admin/airport-refresh-flight", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                    body: JSON.stringify({ booking_id: b.id, force_pickup_window: true })
                                  })
                                  const d = await r.json()
                                  if (r.ok) {
                                    setFlightRefreshMsg(p => ({...p, [b.id]: `✅ Pickup window active`}))
                                    const qr = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } })
                                    const qd = await qr.json()
                                    if (qr.ok) setAirportQueue({ airport_bookings: qd.airport_bookings ?? [], stats: qd.stats ?? {} })
                                  } else { setFlightRefreshMsg(p => ({...p, [b.id]: `❌ ${d.error ?? "Error"}`})) }
                                } catch { setFlightRefreshMsg(p => ({...p, [b.id]: "❌ Network error"})) }
                                finally { setRunningFlightRefresh(p => ({...p, [b.id]: false})) }
                              }} disabled={runningFlightRefresh[b.id]} style={{ ...S.btn(), fontSize: 9, padding: "2px 8px", background: "#1a0a2a", color: "#a78bfa", border: "none" }}>🚗 Force Pickup</button>
                              {/* Escalate Dispatch */}
                              <button onClick={async () => {
                                setRunningFlightRefresh(p => ({...p, [b.id]: true}))
                                setFlightRefreshMsg(p => ({...p, [b.id]: ""}))
                                try {
                                  const r = await fetch("/api/admin/airport-refresh-flight", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                    body: JSON.stringify({ booking_id: b.id, escalate_dispatch: true, contact_customer: true })
                                  })
                                  const d = await r.json()
                                  if (r.ok) {
                                    setFlightRefreshMsg(p => ({...p, [b.id]: `✅ Escalated to dispatch`}))
                                    const qr = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } })
                                    const qd = await qr.json()
                                    if (qr.ok) setAirportQueue({ airport_bookings: qd.airport_bookings ?? [], stats: qd.stats ?? {} })
                                  } else { setFlightRefreshMsg(p => ({...p, [b.id]: `❌ ${d.error ?? "Error"}`})) }
                                } catch { setFlightRefreshMsg(p => ({...p, [b.id]: "❌ Network error"})) }
                                finally { setRunningFlightRefresh(p => ({...p, [b.id]: false})) }
                              }} disabled={runningFlightRefresh[b.id]} style={{ ...S.btn(), fontSize: 9, padding: "2px 8px", background: "#3b0000", color: "#f87171", border: "none" }}>🚨 Escalate</button>
                              {/* Sandbox scenario buttons (contingency/testing) */}
                              {["on_time", "delayed_30", "delayed_60", "landed", "cancelled", "not_found"].map(scenario => (
                                <button key={scenario} onClick={async () => {
                                  setRunningFlightRefresh(p => ({...p, [b.id]: true}))
                                  setFlightRefreshMsg(p => ({...p, [b.id]: ""}))
                                  try {
                                    const r = await fetch("/api/admin/airport-refresh-flight", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                      body: JSON.stringify({ booking_id: b.id, sandbox_scenario: scenario, force_mode: "fallback_sandbox" })
                                    })
                                    const d = await r.json()
                                    if (r.ok) {
                                      setFlightRefreshMsg(p => ({...p, [b.id]: `✅ [sandbox] ${scenario}: ${d.final_phase}`}))
                                      const qr = await fetch("/api/admin/airport-queue", { headers: { "x-admin-key": "sln-admin-2024" } })
                                      const qd = await qr.json()
                                      if (qr.ok) setAirportQueue({ airport_bookings: qd.airport_bookings ?? [], stats: qd.stats ?? {} })
                                    } else {
                                      setFlightRefreshMsg(p => ({...p, [b.id]: `❌ ${d.error ?? "Error"}`}))
                                    }
                                  } catch { setFlightRefreshMsg(p => ({...p, [b.id]: "❌ Network error"})) }
                                  finally { setRunningFlightRefresh(p => ({...p, [b.id]: false})) }
                                }} disabled={runningFlightRefresh[b.id]} style={{ ...S.btn(), fontSize: 9, padding: "2px 7px", background: scenario === "landed" ? "#003320" : scenario.startsWith("delayed") ? "#3b2200" : scenario === "cancelled" ? "#3b0000" : scenario === "not_found" ? "#1a1a00" : "#0c2340", color: scenario === "landed" ? "#34d399" : scenario.startsWith("delayed") ? "#f59e0b" : scenario === "cancelled" ? "#f87171" : scenario === "not_found" ? "#fde68a" : "#38bdf8", border: "none", opacity: 0.7 }}>[sb] {scenario.replace(/_/g, " ")}</button>
                              ))}
                            </div>
                            <button onClick={() => setExpandedAirportId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Hide" : "▼ Details"}</button>
                          </div>
                        </div>
                        {flightRefreshMsg[b.id] && <div style={{ fontSize: 11, marginTop: 4, color: flightRefreshMsg[b.id].startsWith("✅") ? "#4ade80" : "#f87171" }}>{flightRefreshMsg[b.id]}</div>}
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#050d14", borderRadius: 8, border: "1px solid #1e3a5f", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                              <div><span style={{ color: "#555" }}>Flight:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.flight_number || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Airline:</span> <span style={{ color: "#aaa" }}>{b.airline_code || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Airport:</span> <span style={{ color: "#aaa" }}>{b.airport_code || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Terminal:</span> <span style={{ color: "#aaa" }}>{b.terminal_code || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Gate:</span> <span style={{ color: "#aaa" }}>{b.gate_info || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Baggage:</span> <span style={{ color: "#aaa" }}>{b.baggage_claim_zone || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Sched. Arrival:</span> <span style={{ color: "#aaa" }}>{b.scheduled_arrival_at ? new Date(b.scheduled_arrival_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Est. Arrival:</span> <span style={{ color: "#aaa" }}>{b.estimated_arrival_at ? new Date(b.estimated_arrival_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Actual Arrival:</span> <span style={{ color: b.actual_arrival_at ? "#4ade80" : "#555" }}>{b.actual_arrival_at ? new Date(b.actual_arrival_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Delay:</span> <span style={{ color: b.flight_delay_minutes > 0 ? "#f59e0b" : "#4ade80" }}>{b.flight_delay_minutes > 0 ? `+${b.flight_delay_minutes} min` : "On time"}</span></div>
                              <div><span style={{ color: "#555" }}>Op. Pickup:</span> <span style={{ color: "#38bdf8" }}>{b.operational_pickup_target_at ? new Date(b.operational_pickup_target_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Driver Release:</span> <span style={{ color: "#818cf8" }}>{b.operational_driver_release_at ? new Date(b.operational_driver_release_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Intel Status:</span> <span style={{ color: phaseColor }}>{b.airport_intelligence_status || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Phase:</span> <span style={{ color: phaseColor }}>{b.airport_phase?.replace(/_/g, " ") || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Last Lookup:</span> <span style={{ color: "#555" }}>{b.flight_lookup_last_at ? new Date(b.flight_lookup_last_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Source:</span> <span style={{ color: "#555" }}>{b.flight_lookup_source || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Validation:</span> <span style={{ color: b.flight_validation_status === "verified" ? "#4ade80" : b.flight_validation_status === "not_found" ? "#fde68a" : b.flight_validation_status === "provider_unavailable" ? "#818cf8" : b.flight_validation_status === "manually_reviewed" ? "#34d399" : "#f59e0b" }}>{b.flight_validation_status?.replace(/_/g, " ").toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Provider:</span> <span style={{ color: "#888" }}>{b.flight_provider_used || "—"}</span></div>
                              <div><span style={{ color: "#555" }}>Manual Review:</span> <span style={{ color: b.manual_flight_review_required ? "#fb923c" : "#555" }}>{b.manual_flight_review_required ? "YES — Required" : "No"}</span></div>
                              {b.flight_validation_message && <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#555" }}>Validation Msg:</span> <span style={{ color: "#fde68a", fontStyle: "italic" }}>{b.flight_validation_message}</span></div>}
                            </div>
                            {b.recommended_actions?.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Recommended Actions:</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {b.recommended_actions.map((a: string) => (
                                    <span key={a} style={{ ...S.badge("#1e3a5f"), color: "#38bdf8", fontSize: 10 }}>{a.replace(/_/g, " ")}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* ════════════════════════════════════════════
                    BUCKET 7: RECENTLY CANCELLED (red — last 24h)
                ════════════════════════════════════════════ */}
                <div id="bucket-recently-cancelled" style={{ ...S.card, marginBottom: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }}>❌ Recently Cancelled (24h)</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Rides cancelados en las últimas 24 horas — revisar responsabilidad y payout</div>
                    </div>
                    <span style={{ ...S.badge("#3b0000"), color: "#f87171" }}>{(dispatchData as any)?.recentlyCancelled?.length ?? 0}</span>
                  </div>
                  {!(dispatchData as any)?.recentlyCancelled?.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin cancelaciones recientes en las últimas 24h</div>
                  ) : ((dispatchData as any).recentlyCancelled ?? []).map((b: any) => {
                    const isExpanded = expandedDispatchId === b.id
                    const isNoShow = b.passenger_no_show === true
                    const isDriverFault = b.cancel_responsibility === "driver"
                    const isPassengerFault = b.cancel_responsibility === "passenger" && !isNoShow
                    const isDispatchFault = b.cancel_responsibility === "dispatch"
                    const isLateCancel = b.late_cancel === true
                    const cancelledAtLabel = b.cancelled_at
                      ? new Date(b.cancelled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                      : ""
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #2a0000" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              {isNoShow && <span style={{ ...S.badge("#3b1a00"), color: "#fbbf24", fontSize: 10, fontWeight: 700 }}>🚶 PASSENGER NO-SHOW</span>}
                              {isDriverFault && <span style={{ ...S.badge("#3b0000"), color: "#f87171", fontSize: 10, fontWeight: 700 }}>⚠️ DRIVER CANCELLED</span>}
                              {isPassengerFault && <span style={{ ...S.badge("#1a1a00"), color: "#fde68a", fontSize: 10, fontWeight: 700 }}>📞 PASSENGER REQUESTED</span>}
                              {isDispatchFault && <span style={{ ...S.badge("#1a0a2a"), color: "#a78bfa", fontSize: 10, fontWeight: 700 }}>📻 DISPATCH</span>}
                              {isLateCancel && <span style={{ ...S.badge("#2a1a00"), color: "#fb923c", fontSize: 10, fontWeight: 700 }}>⏰ LATE CANCEL</span>}
                              {b.payout_status === "needs_review" && <span style={{ ...S.badge("#3b2200"), color: "#f59e0b", fontSize: 10, fontWeight: 700 }}>⚠️ NEEDS REVIEW</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{fmtDate(b.pickup_at)} &middot; {fmt(b.total_price)}</div>
                            {b.driver_name && <div style={{ fontSize: 12, color: "#888" }}>👤 {b.driver_name} {b.driver_code ? `(${b.driver_code})` : ""}</div>}
                            {b.cancel_reason && (
                              <div style={{ marginTop: 6, padding: "5px 10px", background: "#1a0000", borderRadius: 6, fontSize: 11, color: "#f87171" }}>
                                <span style={{ color: "#888" }}>Motivo: </span>
                                <span style={{ fontWeight: 600 }}>{b.cancel_reason.replace(/_/g, " ")}</span>
                                {cancelledAtLabel && <span style={{ color: "#666", marginLeft: 8 }}>@ {cancelledAtLabel}</span>}
                              </div>
                            )}
                            {b.payout_status && (
                              <div style={{ marginTop: 4, fontSize: 11, color: b.payout_status === "pending" ? "#fbbf24" : b.payout_status === "cancelled" ? "#f87171" : "#f59e0b" }}>
                                Payout: <span style={{ fontWeight: 600 }}>{b.payout_status.toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ ...S.badge("#3b0000"), color: "#f87171" }}>CANCELLED</span>
                            <button onClick={() => setExpandedDispatchId(isExpanded ? null : b.id)} style={{ ...S.btn(), fontSize: 11, padding: "3px 10px" }}>{isExpanded ? "▲ Ocultar" : "▼ Detalles"}</button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 12, padding: "12px 14px", background: "#0d0000", borderRadius: 8, border: "1px solid #3b0000", fontSize: 12 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                              <div><span style={{ color: "#666" }}>Ref:</span> <span style={{ color: "#fff", fontFamily: "monospace" }}>{b.booking_ref || b.id}</span></div>
                              <div><span style={{ color: "#666" }}>Responsabilidad:</span> <span style={{ color: b.cancel_responsibility === "driver" ? "#f87171" : b.cancel_responsibility === "passenger" ? "#fbbf24" : "#f59e0b" }}>{b.cancel_responsibility?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Motivo:</span> <span style={{ color: "#fff" }}>{b.cancel_reason?.replace(/_/g, " ") || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Payout:</span> <span style={{ color: b.payout_status === "pending" ? "#fbbf24" : "#f87171" }}>{b.payout_status?.toUpperCase() || "—"}</span></div>
                              <div><span style={{ color: "#666" }}>No-Show:</span> <span style={{ color: b.passenger_no_show ? "#fbbf24" : "#555" }}>{b.passenger_no_show ? "SÍ" : "NO"}</span></div>
                              <div><span style={{ color: "#666" }}>Late Cancel:</span> <span style={{ color: b.late_cancel ? "#fb923c" : "#555" }}>{b.late_cancel ? "SÍ" : "NO"}</span></div>
                              <div><span style={{ color: "#666" }}>Cancelado:</span> <span style={{ color: "#fff" }}>{b.cancelled_at ? new Date(b.cancelled_at).toLocaleString() : "—"}</span></div>
                              <div><span style={{ color: "#666" }}>Conductor:</span> <span style={{ color: "#aaa" }}>{b.driver_name || "—"} {b.driver_code ? `(${b.driver_code})` : ""}</span></div>
                            </div>
                            {/* ── Auto Fee Logic V2 — SLN Network fee distribution ── */}
                            {(Number(b.cancellation_fee) > 0 || b.fee_split_strategy) && (
                              <div style={{ marginTop: 12, padding: "10px 12px", background: "#0a0a00", borderRadius: 6, border: "1px solid #2a2200" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#c9a84c", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>SLN Network — Fee Distribution</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px", fontSize: 12 }}>
                                  <div>
                                    <span style={{ color: "#666" }}>Fee Total:</span>{" "}
                                    <span style={{ color: "#c9a84c", fontWeight: 700 }}>${parseFloat(b.cancellation_fee || 0).toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span style={{ color: "#666" }}>Estrategia:</span>{" "}
                                    <span style={{
                                      color: b.fee_split_strategy === "same_driver" ? "#4ade80"
                                           : b.fee_split_strategy === "split_network" ? "#60a5fa"
                                           : b.fee_split_strategy === "platform_origin" ? "#a78bfa"
                                           : "#888",
                                      fontWeight: 600, fontFamily: "monospace", fontSize: 11,
                                    }}>
                                      {b.fee_split_strategy ? b.fee_split_strategy.toUpperCase().replace(/_/g, " ") : "—"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ color: "#666" }}>Executor:</span>{" "}
                                    <span style={{ color: "#4ade80", fontWeight: 700 }}>${parseFloat(b.executor_share_amount || 0).toFixed(2)}</span>
                                    {Number(b.cancellation_fee) > 0 && (
                                      <span style={{ color: "#444", fontSize: 10 }}>({Math.round((Number(b.executor_share_amount) / Number(b.cancellation_fee)) * 100)}%)</span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ color: "#666" }}>Source Driver:</span>{" "}
                                    <span style={{ color: Number(b.source_driver_share_amount) > 0 ? "#60a5fa" : "#444", fontWeight: 700 }}>${parseFloat(b.source_driver_share_amount || 0).toFixed(2)}</span>
                                    {Number(b.cancellation_fee) > 0 && Number(b.source_driver_share_amount) > 0 && (
                                      <span style={{ color: "#444", fontSize: 10 }}>({Math.round((Number(b.source_driver_share_amount) / Number(b.cancellation_fee)) * 100)}%)</span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ color: "#666" }}>Platform:</span>{" "}
                                    <span style={{ color: "#f59e0b", fontWeight: 700 }}>${parseFloat(b.platform_share_amount || 0).toFixed(2)}</span>
                                    {Number(b.cancellation_fee) > 0 && (
                                      <span style={{ color: "#444", fontSize: 10 }}>({Math.round((Number(b.platform_share_amount) / Number(b.cancellation_fee)) * 100)}%)</span>
                                    )}
                                  </div>
                                  {b.source_driver_id && (
                                    <div style={{ gridColumn: "span 2" }}>
                                      <span style={{ color: "#666" }}>Source Driver ID:</span>{" "}
                                      <span style={{ color: "#888", fontFamily: "monospace", fontSize: 10 }}>{b.source_driver_id}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleBookingStatus(b.id, "needs_review", "not_required")}
                            style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#3b2200", color: "#f59e0b", border: "none" }}
                          >⚠️ Reabrir para Revisión</button>
                          <button onClick={() => handleOpenEdit(b)} style={{ ...S.btn(), fontSize: 12, padding: "7px 14px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>✏️ Editar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              {/* ════════════════════════════════════════════════
                    BUCKET 8: FALLBACK QUEUE (Bloque Maestro 3)
                ════════════════════════════════════════════════ */}
                <div id="bucket-fallback-queue" style={{ ...S.card, marginBottom: 16, marginTop: 16, borderColor: fallbackQueue.length > 0 ? "#fb923c40" : "#222" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fb923c" }}>🔄 Fallback Queue</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Bookings en espera de reasignación por fallback pool — Bloque Maestro 3</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ ...S.badge("#3b1a00"), color: "#fb923c" }}>{fallbackQueue.length}</span>
                      <button onClick={() => { loadFallbackQueue(); setFallbackQueueMsg("") }} disabled={loadingFallbackQueue} style={{ ...S.btn(), fontSize: 11, padding: "4px 10px" }}>{loadingFallbackQueue ? "..." : "🔄 Refresh"}</button>
                      <button
                        onClick={async () => {
                          setFallbackQueueMsg("Running dispatch...")
                          try {
                            const r = await fetch("/api/admin/fallback-pool-dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run_all" }) })
                            const d = await r.json()
                            setFallbackQueueMsg(r.ok ? `✅ Dispatched ${d.dispatched ?? 0} booking(s)` : `❌ ${d.error ?? "Error"}`)
                            loadFallbackQueue(); loadDispatch()
                          } catch { setFallbackQueueMsg("❌ Network error") }
                        }}
                        style={{ ...S.btn(true), fontSize: 11, padding: "4px 12px", background: "#fb923c", color: "#000", border: "none" }}
                      >⚡ Run Dispatch</button>
                    </div>
                  </div>
                  {fallbackQueueMsg && <div style={{ fontSize: 12, marginBottom: 10, color: fallbackQueueMsg.startsWith("✅") ? "#4ade80" : fallbackQueueMsg.startsWith("❌") ? "#f87171" : "#fb923c" }}>{fallbackQueueMsg}</div>}
                  {!fallbackQueue.length ? (
                    <div style={{ color: "#555", fontSize: 13 }}>Sin bookings en fallback queue</div>
                  ) : fallbackQueue.map((b: any) => {
                    const caseColors: Record<string, string> = { A: "#c9a84c", B: "#fb923c", C: "#ef4444" }
                    const caseColor = caseColors[b.fallback_case_level] ?? "#fb923c"
                    const isRunning = runningFallbackDispatch === b.id
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid #2a1500" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: caseColor, fontFamily: "monospace" }}>{b.booking_ref || b.id?.slice(0,8).toUpperCase()}</span>
                              <span style={{ ...S.badge("#3b1a00"), color: caseColor, fontSize: 10, fontWeight: 700 }}>CASE {b.fallback_case_level ?? "?"}</span>
                              {b.dispatch_status === "urgent_reassignment" && <span style={{ ...S.badge("#3b0000"), color: "#ef4444", fontSize: 10 }}>URGENT</span>}
                              {b.dispatch_status === "critical_driver_failure" && <span style={{ ...S.badge("#3b0000"), color: "#ef4444", fontSize: 10, fontWeight: 700 }}>CRITICAL</span>}
                              {b.fallback_attempts != null && <span style={{ fontSize: 10, color: "#888" }}>Attempts: {b.fallback_attempts}</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: caseColor }}>{b.pickup_zone || b.pickup_address || "?"} &rarr; {b.dropoff_zone || b.dropoff_address || "?"}</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{b.pickup_at ? new Date(b.pickup_at).toLocaleString() : "?"} &middot; ${b.total_price?.toFixed(0) ?? "?"} &middot; {b.vehicle_type || "?"}</div>
                            {b.client_name && <div style={{ fontSize: 12, color: "#aaa" }}>👤 {b.client_name} {b.client_phone ? `• ${b.client_phone}` : ""}</div>}
                            {b.driver_exit_reason && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>Exit reason: {b.driver_exit_reason.replace(/_/g, " ")}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                            {/* Manual Dispatch */}
                            <button
                              disabled={isRunning}
                              onClick={async () => {
                                setRunningFallbackDispatch(b.id)
                                setFallbackQueueMsg("")
                                try {
                                  const r = await fetch("/api/admin/fallback-pool-dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dispatch_single", booking_id: b.id }) })
                                  const d = await r.json()
                                  setFallbackQueueMsg(r.ok ? `✅ Dispatched: ${d.message ?? "OK"}` : `❌ ${d.error ?? "Error"}`)
                                  loadFallbackQueue(); loadDispatch()
                                } catch { setFallbackQueueMsg("❌ Network error") } finally { setRunningFallbackDispatch(null) }
                              }}
                              style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#1a2a1a", color: "#4ade80", border: "1px solid #14532d", opacity: isRunning ? 0.5 : 1 }}
                            >{isRunning ? "..." : "⚡ Dispatch"}</button>
                            {/* Force Assign */}
                            <button
                              disabled={isRunning}
                              onClick={async () => {
                                const driverCode = window.prompt("Driver code to force-assign:")
                                if (!driverCode) return
                                setRunningFallbackDispatch(b.id)
                                try {
                                  const r = await fetch("/api/admin/fallback-pool-dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "force_assign", booking_id: b.id, driver_code: driverCode }) })
                                  const d = await r.json()
                                  setFallbackQueueMsg(r.ok ? `✅ Force assigned to ${driverCode}` : `❌ ${d.error ?? "Error"}`)
                                  loadFallbackQueue(); loadDispatch()
                                } catch { setFallbackQueueMsg("❌ Network error") } finally { setRunningFallbackDispatch(null) }
                              }}
                              style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#1a1a3a", color: "#a78bfa", border: "1px solid #3b1f5e", opacity: isRunning ? 0.5 : 1 }}
                            >🎯 Force Assign</button>
                            {/* Cancel */}
                            <button
                              disabled={isRunning}
                              onClick={async () => {
                                if (!window.confirm(`Cancel booking ${b.booking_ref || b.id?.slice(0,8)}?`)) return
                                setRunningFallbackDispatch(b.id)
                                try {
                                  const r = await fetch("/api/admin/fallback-pool-dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel_booking", booking_id: b.id }) })
                                  const d = await r.json()
                                  setFallbackQueueMsg(r.ok ? `✅ Booking cancelled` : `❌ ${d.error ?? "Error"}`)
                                  loadFallbackQueue(); loadDispatch()
                                } catch { setFallbackQueueMsg("❌ Network error") } finally { setRunningFallbackDispatch(null) }
                              }}
                              style={{ ...S.btn(), fontSize: 11, padding: "4px 10px", background: "#3b0000", color: "#f87171", border: "none", opacity: isRunning ? 0.5 : 1 }}
                            >✕ Cancel</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
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

            {driverStatusFilter !== "all" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #333" }}>
                <span style={{ fontSize: 12, color: "#888" }}>{lang === "es" ? "Filtro activo:" : "Active filter:"}</span>
                <span style={{ ...S.badge("#14532d"), color: "#4ade80" }}>ACTIVE</span>
                <span style={{ fontSize: 12, color: "#a78bfa" }}>{drivers.filter(d => d.driver_status === "active").length} {lang === "es" ? "conductor(es)" : "driver(s)"}</span>
                <button
                  onClick={() => setDriverStatusFilter("all")}
                  style={{ marginLeft: "auto", fontSize: 11, color: "#f87171", background: "transparent", border: "1px solid #3b0000", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                >
                  {lang === "es" ? "Limpiar" : "Clear"} ×
                </button>
              </div>
            )}

            {loadingDrivers ? (
              <div style={{ color: "#555", textAlign: "center", padding: 60 }}>{t("loading")}</div>
            ) : drivers.filter(d => driverStatusFilter === "all" || d.driver_status === driverStatusFilter).length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🚗</div>
                <div style={{ color: "#888" }}>{t("drvNoDrivers")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {drivers.filter(d => driverStatusFilter === "all" || d.driver_status === driverStatusFilter).map(d => (
                  <div key={d.id} style={S.card}>
                    {/* ── Row 1: Name + status badge + actions ── */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{d.full_name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{t("drvCode")}: <span style={{ color: "#c9a84c", fontWeight: 700 }}>{d.driver_code}</span> · {d.phone} {d.email && `· ${d.email}`}</div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{t("drvAdded")}: {fmtDate(d.created_at)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        {/* Status badge — shows 'PROVISIONAL' when applicable */}
                        {d.driver_status === "provisional" ? (
                          <span style={{ ...S.badge("#2a1a00"), color: "#f59e0b", border: "1px solid #f59e0b40" }}>PROVISIONAL</span>
                        ) : (
                          <span style={{ ...S.badge(d.driver_status === "active" ? "#14532d" : "#1c1917"), color: d.driver_status === "active" ? "#4ade80" : "#78716c" }}>
                            {d.driver_status === "active" ? t("statusActive") : t("statusInactive")}
                          </span>
                        )}
                        <button onClick={() => handleToggleStatus(d)} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px" }}>
                          {d.driver_status === "active" ? t("deactivate") : t("activate")}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${BASE_URL}/tablet/${d.driver_code}`) }} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px" }}>
                          {t("copyLink")}
                        </button>
                      </div>
                    </div>

                    {/* ── Row 2: Scoring Engine V1 — Provisional Panel ── */}
                    {(() => {
                      const score     = d.driver_score_total ?? 75;
                      const tier      = d.driver_score_tier ?? "GOLD";
                      const isProvis  = d.driver_status === "provisional";
                      const provRides = d.provisional_completed_rides ?? 0;
                      const endsAt    = d.provisional_ends_at ? new Date(d.provisional_ends_at) : null;
                      const daysLeft  = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000)) : null;
                      const onTimeRate = (d.rides_completed ?? 0) > 0
                        ? Math.round(((d.on_time_rides ?? 0) / (d.rides_completed ?? 1)) * 100)
                        : null;
                      const tierColors: Record<string, { bg: string; text: string }> = {
                        PLATINUM: { bg: "#1a1a2e", text: "#e2e8f0" },
                        GOLD:     { bg: "#2a1a00", text: "#c9a84c" },
                        SILVER:   { bg: "#1a1a1a", text: "#94a3b8" },
                        BRONZE:   { bg: "#1c0a00", text: "#b45309" },
                      };
                      const tc = tierColors[tier] ?? tierColors.GOLD;
                      const tierLabel = isProvis ? `${tier} (Provisional)` : tier;
                      return (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #222" }}>
                          {/* Score + Tier row */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                            {/* Tier badge */}
                            <span style={{ ...S.badge(tc.bg), color: tc.text, border: `1px solid ${tc.text}40`, fontWeight: 700 }}>
                              {tierLabel}
                            </span>
                            {/* Score */}
                            <span style={{ fontSize: 12, color: "#888" }}>
                              Score: <span style={{ color: tc.text, fontWeight: 700 }}>{score}/100</span>
                            </span>
                            {/* Rides completed */}
                            <span style={{ fontSize: 11, color: "#555" }}>
                              {d.rides_completed ?? 0} rides
                            </span>
                            {/* On-time rate */}
                            {onTimeRate !== null && (
                              <span style={{ fontSize: 11, color: onTimeRate >= 90 ? "#4ade80" : onTimeRate >= 70 ? "#f59e0b" : "#f87171" }}>
                                {onTimeRate}% on-time
                              </span>
                            )}
                          </div>

                          {/* Provisional window info */}
                          {isProvis && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: "#f59e0b" }}>
                                ⏳ Provisional window: {provRides}/10 rides
                                {daysLeft !== null && ` · ${daysLeft}d left`}
                              </span>
                            </div>
                          )}

                          {/* Eligibility badges */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {d.is_eligible_for_premium_dispatch ? (
                              <span style={{ ...S.badge("#0c2340"), color: "#38bdf8", fontSize: 10 }}>PREMIUM DISPATCH ✓</span>
                            ) : (
                              <span style={{ ...S.badge("#1a1a1a"), color: "#444", fontSize: 10 }}>PREMIUM DISPATCH ✕</span>
                            )}
                            {d.is_eligible_for_airport_priority ? (
                              <span style={{ ...S.badge("#0d2a0d"), color: "#4ade80", fontSize: 10 }}>AIRPORT PRIORITY ✓</span>
                            ) : (
                              <span style={{ ...S.badge("#1a1a1a"), color: "#444", fontSize: 10 }}>AIRPORT PRIORITY ✕</span>
                            )}
                            {d.contribution_bonus_granted && (
                              <span style={{ ...S.badge("#1a0a2e"), color: "#a78bfa", fontSize: 10 }}>AFFILIATE BONUS ✓</span>
                            )}
                            {(d.late_cancel_count ?? 0) > 0 && (
                              <span style={{ ...S.badge("#3b1a00"), color: "#f97316", fontSize: 10 }}>LATE CANCELS: {d.late_cancel_count}</span>
                            )}
                            {(d.complaint_count ?? 0) > 0 && (
                              <span style={{ ...S.badge("#3b0000"), color: "#f87171", fontSize: 10 }}>COMPLAINTS: {d.complaint_count}</span>
                            )}
                          </div>
                          {/* BM5: Legal Affiliation Type Selector (Admin Only) */}
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "#888", letterSpacing: 1 }}>FLEET AFFILIATION:</span>
                            <select
                              value={d.legal_affiliation_type ?? "GENERAL_NETWORK_DRIVER"}
                              onChange={async (e) => {
                                const newAff = e.target.value;
                                try {
                                  const res = await fetch(`/api/admin/drivers/${d.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ legal_affiliation_type: newAff }),
                                  });
                                  if (res.ok) {
                                    loadDrivers();
                                  }
                                } catch {}
                              }}
                              style={{
                                background: d.legal_affiliation_type === "SOTTOVENTO_LEGAL_FLEET"
                                  ? "#1a0a2e"
                                  : d.legal_affiliation_type === "PARTNER_LEGAL_FLEET"
                                  ? "#0c2340"
                                  : "#1a1a1a",
                                color: d.legal_affiliation_type === "SOTTOVENTO_LEGAL_FLEET"
                                  ? "#c9a84c"
                                  : d.legal_affiliation_type === "PARTNER_LEGAL_FLEET"
                                  ? "#38bdf8"
                                  : "#888",
                                border: `1px solid ${d.legal_affiliation_type === "SOTTOVENTO_LEGAL_FLEET" ? "#c9a84c" : d.legal_affiliation_type === "PARTNER_LEGAL_FLEET" ? "#38bdf8" : "#333"}`,
                                borderRadius: 6,
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <option value="SOTTOVENTO_LEGAL_FLEET">⚡ SOTTOVENTO LEGAL FLEET</option>
                              <option value="PARTNER_LEGAL_FLEET">🤝 PARTNER LEGAL FLEET</option>
                              <option value="GENERAL_NETWORK_DRIVER">🌐 GENERAL NETWORK DRIVER</option>
                            </select>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* ── Vehicle Eligibility Gates Panel ─────────────────────────────── */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Vehicle Eligibility Gates</div>
                  <div style={{ color: "#555", fontSize: 12 }}>Permit status by vehicle · MCO Airport · Port Canaveral · Insurance · Registration</div>
                </div>
                <button onClick={loadVehicles} style={S.btn()}>{loadingVehicles ? "Loading..." : "Refresh"}</button>
              </div>

              {/* Stats row */}
              {vehicleStats && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={{ ...S.statCard("#14532d"), textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#4ade80", letterSpacing: 2, marginBottom: 4 }}>MCO ELIGIBLE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#4ade80" }}>{vehicleStats.mco_eligible ?? 0}</div>
                  </div>
                  <div style={{ ...S.statCard("#0c2340"), textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#38bdf8", letterSpacing: 2, marginBottom: 4 }}>PORT ELIGIBLE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#38bdf8" }}>{vehicleStats.port_eligible ?? 0}</div>
                  </div>
                  <div style={{ ...S.statCard("#3b1a00"), textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#f97316", letterSpacing: 2, marginBottom: 4 }}>EXPIRED/PENDING</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>{vehicleStats.expired_or_pending ?? 0}</div>
                  </div>
                  <div style={{ ...S.statCard("#3b0000"), textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#f87171", letterSpacing: 2, marginBottom: 4 }}>NO VEHICLE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f87171" }}>{vehicleStats.drivers_without_vehicle ?? 0}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>active drivers</div>
                  </div>
                </div>
              )}

              {/* Vehicle list */}
              {loadingVehicles ? (
                <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Loading vehicles...</div>
              ) : vehicles.length === 0 ? (
                <div style={{ ...S.card, textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🚗</div>
                  <div style={{ color: "#888", fontSize: 13 }}>No vehicles registered yet.</div>
                  <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>Use POST /api/admin/vehicles to register a vehicle for a driver.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {vehicles.map((v: any) => {
                    const permitStatus = (s: string) => ({
                      approved: { bg: "#14532d", text: "#4ade80" },
                      pending:  { bg: "#2a1a00", text: "#f59e0b" },
                      expired:  { bg: "#3b1a00", text: "#f97316" },
                      rejected: { bg: "#3b0000", text: "#f87171" },
                    }[s] ?? { bg: "#1a1a1a", text: "#555" });
                    const mcoEligible = v.airport_permit_mco_status === "approved" && v.city_permit_status === "approved" && v.insurance_status === "approved" && v.registration_status === "approved" && v.vehicle_status === "active";
                    const portEligible = v.port_permit_canaveral_status === "approved" && v.city_permit_status === "approved" && v.insurance_status === "approved" && v.registration_status === "approved" && v.vehicle_status === "active";
                    return (
                      <div key={v.id} style={{ ...S.card, borderColor: mcoEligible && portEligible ? "#14532d44" : "#222" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{v.year} {v.make} {v.model} <span style={{ color: "#c9a84c" }}>{v.plate}</span></div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Driver: <span style={{ color: "#fff" }}>{v.driver_name ?? v.driver_id}</span> · {v.vehicle_type ?? "—"} · {v.color ?? "—"}</div>
                            {v.is_primary && <span style={{ ...S.badge("#1a1a2e"), color: "#a78bfa", fontSize: 10, marginTop: 4 }}>PRIMARY</span>}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            {/* Vehicle status */}
                            <span style={{ ...S.badge(v.vehicle_status === "active" ? "#14532d" : "#3b0000"), color: v.vehicle_status === "active" ? "#4ade80" : "#f87171", fontSize: 10 }}>{(v.vehicle_status ?? "unknown").toUpperCase()}</span>
                            {/* MCO eligibility */}
                            {mcoEligible ? (
                              <span style={{ ...S.badge("#0c2340"), color: "#38bdf8", fontSize: 10 }}>✈ MCO PICKUP ✓</span>
                            ) : (
                              <span style={{ ...S.badge("#1a1a1a"), color: "#444", fontSize: 10 }}>✈ MCO PICKUP ✕</span>
                            )}
                            {/* Port eligibility */}
                            {portEligible ? (
                              <span style={{ ...S.badge("#0d2a0d"), color: "#4ade80", fontSize: 10 }}>⚓ PORT PICKUP ✓</span>
                            ) : (
                              <span style={{ ...S.badge("#1a1a1a"), color: "#444", fontSize: 10 }}>⚓ PORT PICKUP ✕</span>
                            )}
                          </div>
                        </div>
                        {/* Permit status grid */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                          {[
                            { label: "CITY PERMIT",    val: v.city_permit_status },
                            { label: "MCO PERMIT",     val: v.airport_permit_mco_status },
                            { label: "PORT PERMIT",    val: v.port_permit_canaveral_status },
                            { label: "INSURANCE",      val: v.insurance_status },
                            { label: "REGISTRATION",   val: v.registration_status },
                          ].map(p => {
                            const c = permitStatus(p.val ?? "pending");
                            return (
                              <span key={p.label} style={{ ...S.badge(c.bg), color: c.text, fontSize: 10, border: `1px solid ${c.text}30` }}>
                                {p.label}: {(p.val ?? "pending").toUpperCase()}
                              </span>
                            );
                          })}
                          {v.expires_at && (
                            <span style={{ fontSize: 10, color: new Date(v.expires_at) < new Date() ? "#f87171" : "#888", marginLeft: 4, alignSelf: "center" }}>
                              Exp: {fmtDate(v.expires_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
             {/* ── End Vehicle Eligibility Gates Panel ─────────────────────────── */}

            {/* ── BM5: Driver Reliability Score Engine Control ─────────────────── */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>⚡ Driver Reliability Score Engine <span style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginLeft: 8 }}>BM5</span></div>
                  <div style={{ color: "#555", fontSize: 12 }}>DRS formula · Legal affiliation tier · Dispatch ordering · Partner governance mode</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      setRunningBm5Mig(true); setBm5MigMsg("")
                      try {
                        const res = await fetch(`${BASE_URL}/api/admin/migrate-bm5`, { method: "POST", headers: { "x-admin-key": "sln-admin-2024" } })
                        const data = await res.json()
                        setBm5MigMsg(data.message ?? JSON.stringify(data))
                      } catch (e: any) { setBm5MigMsg(e.message) }
                      finally { setRunningBm5Mig(false) }
                    }}
                    style={{ ...S.btn(), fontSize: 12 }}
                    disabled={runningBm5Mig}
                  >{runningBm5Mig ? "Running..." : "Run BM5 Migration"}</button>
                  <button
                    onClick={async () => {
                      setRunningRecalc(true); setRecalcMsg("")
                      try {
                        const res = await fetch(`${BASE_URL}/api/admin/recalculate-driver-scores`, { method: "POST", headers: { "x-admin-key": "sln-admin-2024" } })
                        const data = await res.json()
                        setRecalcMsg(`✓ Recalculated ${data.processed ?? 0} drivers · ${data.tier_distribution ? Object.entries(data.tier_distribution).map(([k,v]) => `${k}:${v}`).join(" · ") : ""}`)
                        setBm5Drivers(data.drivers ?? [])
                        loadDrivers()
                      } catch (e: any) { setRecalcMsg(e.message) }
                      finally { setRunningRecalc(false) }
                    }}
                    style={{ ...S.btn(true), fontSize: 12 }}
                    disabled={runningRecalc}
                  >{runningRecalc ? "Recalculating..." : "⚡ Recalculate All Scores"}</button>
                </div>
              </div>
              {bm5MigMsg && <div style={{ ...S.card, color: bm5MigMsg.includes("error") || bm5MigMsg.includes("Error") ? "#f87171" : "#4ade80", marginBottom: 12, fontSize: 13 }}>{bm5MigMsg}</div>}
              {recalcMsg && <div style={{ ...S.card, color: "#4ade80", marginBottom: 12, fontSize: 13 }}>{recalcMsg}</div>}

              {/* BM5 Driver Reliability Table */}
              {drivers.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #222" }}>
                        {["Driver", "Code", "Affiliation", "DRS Score", "Tier BM5", "Acceptance", "Completion", "Cancel Rate", "On-Time", "Response"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d: any) => {
                        const affColor: Record<string, { bg: string; text: string }> = {
                          SOTTOVENTO_LEGAL_FLEET: { bg: "#1a0a2e", text: "#c9a84c" },
                          PARTNER_LEGAL_FLEET:    { bg: "#0c2340", text: "#38bdf8" },
                          GENERAL_NETWORK_DRIVER: { bg: "#1a1a1a", text: "#888" },
                        }
                        const tierBm5Color: Record<string, { bg: string; text: string }> = {
                          ELITE:       { bg: "#1a0a2e", text: "#c9a84c" },
                          PREMIUM:     { bg: "#14532d", text: "#4ade80" },
                          STANDARD:    { bg: "#0c2340", text: "#38bdf8" },
                          RESTRICTED:  { bg: "#3b0000", text: "#f87171" },
                          OBSERVATION: { bg: "#3b2200", text: "#f59e0b" },
                        }
                        const affType = d.legal_affiliation_type ?? "GENERAL_NETWORK_DRIVER"
                        const tierBm5 = d.driver_tier ?? "STANDARD"
                        const ac = affColor[affType] ?? affColor.GENERAL_NETWORK_DRIVER
                        const tc = tierBm5Color[tierBm5] ?? tierBm5Color.STANDARD
                        const drs = d.reliability_score ?? 65
                        const drsColor = drs >= 85 ? "#c9a84c" : drs >= 70 ? "#4ade80" : drs >= 55 ? "#38bdf8" : drs >= 40 ? "#f59e0b" : "#f87171"
                        return (
                          <tr key={d.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                            <td style={{ padding: "8px 12px", color: "#fff", fontWeight: 600 }}>{d.full_name}</td>
                            <td style={{ padding: "8px 12px", color: "#c9a84c", fontFamily: "monospace" }}>{d.driver_code}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ ...S.badge(ac.bg), color: ac.text, fontSize: 10 }}>
                                {affType === "SOTTOVENTO_LEGAL_FLEET" ? "SLN LEGAL" : affType === "PARTNER_LEGAL_FLEET" ? "PARTNER LEGAL" : "GENERAL"}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ fontSize: 18, fontWeight: 700, color: drsColor }}>{drs}</span>
                              <span style={{ fontSize: 10, color: "#555", marginLeft: 4 }}>/100</span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ ...S.badge(tc.bg), color: tc.text, fontSize: 10 }}>{tierBm5}</span>
                            </td>
                            <td style={{ padding: "8px 12px", color: d.acceptance_rate != null ? (d.acceptance_rate >= 85 ? "#4ade80" : d.acceptance_rate >= 70 ? "#f59e0b" : "#f87171") : "#555" }}>
                              {d.acceptance_rate != null ? `${Math.round(Number(d.acceptance_rate))}%` : "—"}
                            </td>
                            <td style={{ padding: "8px 12px", color: d.completion_rate != null ? (d.completion_rate >= 95 ? "#4ade80" : d.completion_rate >= 85 ? "#f59e0b" : "#f87171") : "#555" }}>
                              {d.completion_rate != null ? `${Math.round(Number(d.completion_rate))}%` : "—"}
                            </td>
                            <td style={{ padding: "8px 12px", color: d.driver_cancel_rate != null ? (d.driver_cancel_rate <= 5 ? "#4ade80" : d.driver_cancel_rate <= 10 ? "#f59e0b" : "#f87171") : "#555" }}>
                              {d.driver_cancel_rate != null ? `${Math.round(Number(d.driver_cancel_rate))}%` : "—"}
                            </td>
                            <td style={{ padding: "8px 12px", color: d.on_time_score != null ? (d.on_time_score >= 90 ? "#4ade80" : d.on_time_score >= 75 ? "#f59e0b" : "#f87171") : "#555" }}>
                              {d.on_time_score != null ? `${Math.round(Number(d.on_time_score))}%` : "—"}
                            </td>
                            <td style={{ padding: "8px 12px", color: d.dispatch_response_score != null ? (d.dispatch_response_score >= 90 ? "#4ade80" : d.dispatch_response_score >= 75 ? "#f59e0b" : "#f87171") : "#555" }}>
                              {d.dispatch_response_score != null ? `${Math.round(Number(d.dispatch_response_score))}%` : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* ── End BM5 Driver Reliability Score Engine Control ───────────────── */}
          </div>
        )}

        {/* ======================================================
            5. COMPANIES
        ====================================================== */}
        {tab === "companies" && (
          <CompaniesFleetDashboard
            partnerCompanies={partnerCompanies}
            lang={lang}
          />
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

            {leadSourceFilter !== "all" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #333" }}>
                <span style={{ fontSize: 12, color: "#888" }}>{lang === "es" ? "Filtro activo:" : "Active filter:"}</span>
                <span style={{ ...S.badge("#3b1a00"), color: "#f59e0b" }}>{leadSourceFilter.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "#f59e0b" }}>{leads.filter(l => (l.lead_source || "unknown") === leadSourceFilter).length} {lang === "es" ? "lead(s)" : "lead(s)"}</span>
                <button
                  onClick={() => setLeadSourceFilter("all")}
                  style={{ marginLeft: "auto", fontSize: 11, color: "#f87171", background: "transparent", border: "1px solid #3b0000", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                >
                  {lang === "es" ? "Limpiar" : "Clear"} ×
                </button>
              </div>
            )}

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
                  {leads.filter(l => leadSourceFilter === "all" || (l.lead_source || "unknown") === leadSourceFilter).map(l => (
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
                      {/* BM5: Partner Dispatch Mode Switch */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 10, color: "#555", letterSpacing: 1 }}>DISPATCH MODE</div>
                        <select
                          value={c.partner_dispatch_mode ?? "CAPTURE_ONLY"}
                          onChange={async (e) => {
                            const newMode = e.target.value
                            try {
                              await fetch(`${BASE_URL}/api/admin/partners/companies`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", "x-admin-key": "sln-admin-2024" },
                                body: JSON.stringify({ company_id: c.id, partner_dispatch_mode: newMode })
                              })
                              loadPartnerCompanies()
                            } catch {}
                          }}
                          style={{ background: c.partner_dispatch_mode === "SUBNETWORK_PRIORITY" ? "#0c2340" : "#1a1a1a", color: c.partner_dispatch_mode === "SUBNETWORK_PRIORITY" ? "#38bdf8" : "#888", border: `1px solid ${c.partner_dispatch_mode === "SUBNETWORK_PRIORITY" ? "#38bdf8" : "#333"}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          <option value="CAPTURE_ONLY">CAPTURE ONLY</option>
                          <option value="SUBNETWORK_PRIORITY">SUBNETWORK PRIORITY</option>
                        </select>
                      </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>✏️ Editar Reserva</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4, fontFamily: "monospace", letterSpacing: 0.5 }}>ID: {editModal.id}</div>
                <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4, fontWeight: 600 }}>
                  {editModal.pickup_zone || editModal.pickup_address || "—"} → {editModal.dropoff_zone || editModal.dropoff_address || "—"}
                </div>
                {editModal.client_name && (
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                    👤 {editModal.client_name}{editModal.client_phone ? ` · ${editModal.client_phone}` : ""}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                  📅 {fmtDate(editModal.pickup_at)} · {editModal.vehicle_type} · {fmt(editModal.total_price)}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ ...S.badge(statusColor[editModal.status] ?? "#1a1a1a"), color: statusText[editModal.status] ?? "#fff" }}>{editModal.status?.toUpperCase()}</span>
                  {editModal.dispatch_status && <span style={{ ...S.badge(dispatchColor[editModal.dispatch_status] ?? "#1a1a1a"), color: dispatchText[editModal.dispatch_status] ?? "#fff" }}>{editModal.dispatch_status?.replace(/_/g, " ").toUpperCase()}</span>}
                </div>
              </div>
              <button onClick={() => { setEditModal(null); setEditMsg("") }} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", marginLeft: 12, flexShrink: 0 }}>✕</button>
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
              <div>
                <label style={S.label}>Email del Cliente</label>
                <input type="email" value={editFields.client_email ?? ""} onChange={e => setEditFields(f => ({ ...f, client_email: e.target.value }))} style={S.input} placeholder="cliente@email.com" />
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
