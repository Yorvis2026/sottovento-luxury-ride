"use client"

import { useState, useEffect, useCallback } from "react"

// ============================================================
// /partner/[code] — Partner Dashboard
// Sections: Home | My Link | Quick Send | My Clients | Earnings
// ============================================================

const GOLD = "#C8A96A"
const BG = "#0a0a0a"
const CARD = "#111"
const BORDER = "#222"

const S = {
  container: {
    minHeight: "100vh",
    background: BG,
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#fff",
    paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
  } as React.CSSProperties,
  header: {
    background: "#0d0d0d",
    borderBottom: `1px solid ${BORDER}`,
    padding: "calc(env(safe-area-inset-top) + 12px) 20px 14px",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  card: {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: "20px",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "14px 16px",
    background: "#1a1a1a",
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "system-ui, sans-serif",
  },
  label: {
    fontSize: 11,
    color: "#888",
    letterSpacing: 1.5,
    marginBottom: 6,
    display: "block",
    textTransform: "uppercase" as const,
  },
  btn: (active = true) => ({
    padding: "14px 20px",
    background: active ? GOLD : "#1a1a1a",
    color: active ? "#000" : "#888",
    border: active ? "none" : `1px solid ${BORDER}`,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: active ? "pointer" : "not-allowed",
    letterSpacing: 0.5,
    transition: "all 0.2s",
  } as React.CSSProperties),
  statCard: (color: string) => ({
    background: `${color}11`,
    border: `1px solid ${color}33`,
    borderRadius: 12,
    padding: "16px",
    flex: 1,
    minWidth: 120,
  } as React.CSSProperties),
  badge: (bg: string) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    background: bg,
  } as React.CSSProperties),
}

type Section = "home" | "link" | "send" | "clients" | "earnings"

export default function PartnerPanel({ params }: { params: { code: string } }) {
  const { code } = params
  const [section, setSection] = useState<Section>("home")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Quick Send state
  const [sendPhone, setSendPhone] = useState("")
  const [sendName, setSendName] = useState("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState("")

  // Earnings
  const [earnings, setEarnings] = useState<any[]>([])
  const [loadingEarnings, setLoadingEarnings] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/partner/me?code=${code}`)
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? "Partner not found"); return }
      setData(d)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [code])

  const loadEarnings = useCallback(async () => {
    setLoadingEarnings(true)
    try {
      const r = await fetch(`/api/partner/earnings?code=${code}`)
      const d = await r.json()
      if (r.ok) setEarnings(d.earnings ?? [])
    } catch { }
    finally { setLoadingEarnings(false) }
  }, [code])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (section === "earnings") loadEarnings() }, [section, loadEarnings])

  const handleQuickSend = async () => {
    if (!sendPhone) return
    setSending(true); setSendResult("")
    try {
      const r = await fetch("/api/partner/quick-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_code: code, phone: sendPhone, name: sendName })
      })
      const d = await r.json()
      if (r.ok) { setSendResult("✅ Link sent via SMS!"); setSendPhone(""); setSendName("") }
      else setSendResult(`❌ ${d.error}`)
    } catch (e: any) { setSendResult(`❌ ${e.message}`) }
    finally { setSending(false) }
  }

  const referralLink = data ? `https://www.sottoventoluxuryride.com/?ref=${data.partner?.ref_code}` : ""
  const fmt = (n: number) => `$${Number(n ?? 0).toFixed(2)}`
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"

  // ---- LOADING ----
  if (loading) {
    return (
      <div style={S.container}>
        <div style={{ textAlign: "center", paddingTop: 120 }}>
          <div style={{ color: GOLD, fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>SOTTOVENTO NETWORK</div>
          <div style={{ color: "#555", fontSize: 14 }}>Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  // ---- ERROR ----
  if (error || !data) {
    return (
      <div style={S.container}>
        <div style={{ textAlign: "center", paddingTop: 80, padding: "80px 24px 24px" }}>
          <div style={{ color: GOLD, fontSize: 11, letterSpacing: 3, marginBottom: 24 }}>SOTTOVENTO NETWORK</div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Partner Not Found</div>
          <div style={{ color: "#888", fontSize: 14 }}>{error || "Invalid partner code"}</div>
        </div>
      </div>
    )
  }

  const partner = data.partner
  const stats = data.stats ?? {}
  const clients = data.recent_clients ?? []

  return (
    <div style={S.container}>
      {/* ---- HEADER ---- */}
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: 2, marginBottom: 2 }}>SOTTOVENTO NETWORK</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{partner.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: GOLD, fontWeight: 700, background: `${GOLD}11`, padding: "4px 10px", borderRadius: 6, border: `1px solid ${GOLD}33` }}>
              {partner.ref_code}
            </div>
            <span style={{ ...S.badge(partner.status === "active" ? "#052e16" : "#3b0000"), color: partner.status === "active" ? "#4ade80" : "#f87171" }}>
              {partner.status?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ---- CONTENT ---- */}
      <div style={{ padding: "20px 16px", maxWidth: 520, margin: "0 auto" }}>

        {/* ======== HOME ======== */}
        {section === "home" && (
          <div>
            {/* Stats Row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={S.statCard(GOLD)}>
                <div style={{ fontSize: 10, color: GOLD, letterSpacing: 1.5, marginBottom: 6 }}>MTD EARNINGS</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{fmt(stats.earnings_mtd)}</div>
              </div>
              <div style={S.statCard("#4ade80")}>
                <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 1.5, marginBottom: 6 }}>TOTAL CLIENTS</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total_clients ?? 0}</div>
              </div>
              <div style={S.statCard("#60a5fa")}>
                <div style={{ fontSize: 10, color: "#60a5fa", letterSpacing: 1.5, marginBottom: 6 }}>BOOKINGS</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total_bookings ?? 0}</div>
              </div>
              <div style={S.statCard("#a78bfa")}>
                <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 1.5, marginBottom: 6 }}>LIFETIME</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(stats.total_earnings)}</div>
              </div>
            </div>

            {/* Commission Rate */}
            <div style={{ ...S.card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#888", letterSpacing: 1.5, marginBottom: 4 }}>YOUR COMMISSION RATE</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: GOLD }}>{Math.round(Number(partner.commission_rate) * 100)}%</div>
                <div style={{ fontSize: 12, color: "#555" }}>per completed booking</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#888", letterSpacing: 1.5, marginBottom: 4 }}>PARTNER TYPE</div>
                <div style={{ fontWeight: 600, textTransform: "capitalize" as const }}>{partner.type}</div>
                {partner.company_name && <div style={{ fontSize: 12, color: GOLD }}>{partner.company_name}</div>}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setSection("link")} style={{ ...S.card, cursor: "pointer", textAlign: "center", border: `1px solid ${GOLD}33` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔗</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: GOLD }}>My Referral Link</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Share & earn</div>
              </button>
              <button onClick={() => setSection("send")} style={{ ...S.card, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📲</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Quick Send</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Send to client</div>
              </button>
              <button onClick={() => setSection("clients")} style={{ ...S.card, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>My Clients</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{stats.total_clients ?? 0} captured</div>
              </button>
              <button onClick={() => setSection("earnings")} style={{ ...S.card, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Earnings</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>History & payouts</div>
              </button>
            </div>

            {/* Recent Clients */}
            {clients.length > 0 && (
              <div style={S.card}>
                <div style={{ fontSize: 12, color: "#888", letterSpacing: 1.5, marginBottom: 14 }}>RECENT CLIENTS</div>
                {clients.slice(0, 5).map((c: any) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #1a1a1a" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.client_name ?? "Guest"}</div>
                      <div style={{ color: "#555", fontSize: 11 }}>{fmtDate(c.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: GOLD }}>{fmt(c.commission_amount)}</div>
                      <span style={{ ...S.badge(c.status === "completed" ? "#052e16" : "#1a1a1a"), color: c.status === "completed" ? "#4ade80" : "#888", fontSize: 9 }}>
                        {c.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== MY LINK ======== */}
        {section === "link" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>My Referral Link</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Share this link to earn commissions</div>

            {/* Ref Code Display */}
            <div style={{ ...S.card, textAlign: "center", marginBottom: 16, border: `1px solid ${GOLD}33` }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: 2, marginBottom: 8 }}>YOUR CODE</div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 6, color: GOLD, marginBottom: 12 }}>{partner.ref_code}</div>
              <div style={{ fontSize: 12, color: "#555" }}>Clients enter this code at checkout</div>
            </div>

            {/* Full Link */}
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: 1.5, marginBottom: 10 }}>BOOKING LINK</div>
              <div style={{ fontSize: 13, color: "#fff", wordBreak: "break-all", marginBottom: 12, lineHeight: 1.6 }}>{referralLink}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => navigator.clipboard.writeText(referralLink)} style={{ ...S.btn(), flex: 1 }}>
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "Sottovento Luxury Ride", text: "Book luxury transportation in Orlando", url: referralLink })
                    } else {
                      navigator.clipboard.writeText(referralLink)
                    }
                  }}
                  style={{ ...S.btn(false), flex: 1 }}>
                  Share
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ ...S.card, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: 1.5, marginBottom: 12 }}>QR CODE</div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}&bgcolor=0a0a0a&color=C8A96A&margin=10`}
                alt="QR Code"
                style={{ width: 180, height: 180, borderRadius: 12, border: `1px solid ${GOLD}33` }}
              />
              <div style={{ color: "#555", fontSize: 12, marginTop: 12 }}>
                Screenshot and print for your location
              </div>
            </div>

            {/* How it works */}
            <div style={{ ...S.card, background: "#0d0d0d" }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: 2, marginBottom: 14 }}>HOW IT WORKS</div>
              {[
                { step: "1", text: "Share your link or code with a client" },
                { step: "2", text: "Client books through your link" },
                { step: "3", text: "Ride is completed" },
                { step: `4`, text: `You earn ${Math.round(Number(partner.commission_rate) * 100)}% commission automatically` },
              ].map(item => (
                <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${GOLD}22`, border: `1px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: GOLD, fontWeight: 700, flexShrink: 0 }}>
                    {item.step}
                  </div>
                  <div style={{ color: "#888", fontSize: 13, lineHeight: 1.6 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======== QUICK SEND ======== */}
        {section === "send" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Quick Send</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Send your referral link to a client via SMS</div>

            <div style={S.card}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>Client Name (optional)</label>
                  <input value={sendName} onChange={e => setSendName(e.target.value)} placeholder="John Smith" style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Client Phone *</label>
                  <input type="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+1 (407) 000-0000" style={S.input} />
                </div>
              </div>

              <div style={{ background: "#0d0d0d", borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 12, color: "#888", lineHeight: 1.8 }}>
                <div style={{ color: GOLD, fontWeight: 600, marginBottom: 6 }}>Message Preview:</div>
                <em>"{sendName ? `Hi ${sendName}! ` : ""}Book your luxury ride in Orlando with Sottovento. Use my link: {referralLink}"</em>
              </div>

              <button onClick={handleQuickSend} disabled={sending || !sendPhone} style={{ ...S.btn(!!sendPhone), width: "100%", opacity: sending ? 0.5 : 1 }}>
                {sending ? "Sending..." : "📲 Send via SMS"}
              </button>

              {sendResult && (
                <div style={{ marginTop: 14, padding: "12px 14px", background: sendResult.startsWith("✅") ? "#052e16" : "#1c0a0a", borderRadius: 8, fontSize: 13, color: sendResult.startsWith("✅") ? "#4ade80" : "#f87171" }}>
                  {sendResult}
                </div>
              )}
            </div>

            <div style={{ ...S.card, marginTop: 16, background: "#0d0d0d" }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: 2, marginBottom: 12 }}>QUICK COPY</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Or copy the message manually:</div>
              <button
                onClick={() => navigator.clipboard.writeText(`Book your luxury ride in Orlando with Sottovento. Use my link: ${referralLink}`)}
                style={{ ...S.btn(false), width: "100%" }}>
                Copy Message Text
              </button>
            </div>
          </div>
        )}

        {/* ======== MY CLIENTS ======== */}
        {section === "clients" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>My Clients</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Clients who booked through your referral</div>

            {clients.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No clients yet</div>
                <div style={{ color: "#555", fontSize: 13 }}>Share your referral link to start earning</div>
                <button onClick={() => setSection("link")} style={{ ...S.btn(), marginTop: 20 }}>
                  Get My Link →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clients.map((c: any) => (
                  <div key={c.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{c.client_name ?? "Guest"}</div>
                      <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>{c.pickup_address ?? "—"}</div>
                      <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>{fmtDate(c.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: GOLD, fontSize: 16 }}>{fmt(c.commission_amount)}</div>
                      <div style={{ color: "#555", fontSize: 11 }}>{fmt(c.gross_amount)} gross</div>
                      <span style={{ ...S.badge(c.status === "completed" ? "#052e16" : c.status === "pending" ? "#1a1a1a" : "#1e3a5f"), color: c.status === "completed" ? "#4ade80" : c.status === "pending" ? "#888" : "#60a5fa", fontSize: 9 }}>
                        {c.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== EARNINGS ======== */}
        {section === "earnings" && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Earnings</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Your commission history</div>

            {/* Summary */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={S.statCard(GOLD)}>
                <div style={{ fontSize: 10, color: GOLD, letterSpacing: 1.5, marginBottom: 6 }}>THIS MONTH</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{fmt(stats.earnings_mtd)}</div>
              </div>
              <div style={S.statCard("#4ade80")}>
                <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 1.5, marginBottom: 6 }}>PENDING</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(stats.earnings_pending)}</div>
              </div>
              <div style={S.statCard("#a78bfa")}>
                <div style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 1.5, marginBottom: 6 }}>LIFETIME</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(stats.total_earnings)}</div>
              </div>
            </div>

            {/* Payment Info */}
            <div style={{ ...S.card, marginBottom: 16, background: "#0d0d0d" }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: 2, marginBottom: 12 }}>PAYMENT SCHEDULE</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8 }}>
                Commissions are paid monthly for all bookings completed in the prior month.<br />
                Minimum payout: <strong style={{ color: "#fff" }}>$50</strong><br />
                Payment method: <strong style={{ color: "#fff" }}>ACH / Check</strong>
              </div>
            </div>

            {/* Earnings List */}
            {loadingEarnings ? (
              <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Loading...</div>
            ) : earnings.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: "40px 24px", color: "#555" }}>
                No earnings yet. Commissions appear when bookings are completed.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {earnings.map(e => (
                  <div key={e.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.client_name ?? "Guest"}</div>
                      <div style={{ color: "#555", fontSize: 11 }}>{fmtDate(e.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: GOLD }}>{fmt(e.commission_amount)}</div>
                      <span style={{ ...S.badge(e.status === "paid" ? "#052e16" : e.status === "approved" ? "#1e3a5f" : "#1a1a1a"), color: e.status === "paid" ? "#4ade80" : e.status === "approved" ? "#60a5fa" : "#888", fontSize: 9 }}>
                        {e.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ---- BOTTOM NAV ---- */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#0d0d0d",
        borderTop: `1px solid ${BORDER}`,
        display: "flex",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)",
        paddingTop: 4,
        zIndex: 100,
      }}>
        {([
          { id: "home", icon: "🏠", label: "Home" },
          { id: "link", icon: "🔗", label: "My Link" },
          { id: "send", icon: "📲", label: "Send" },
          { id: "clients", icon: "👥", label: "Clients" },
          { id: "earnings", icon: "💰", label: "Earnings" },
        ] as { id: Section; icon: string; label: string }[]).map(nav => (
          <button key={nav.id} onClick={() => setSection(nav.id)}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 18 }}>{nav.icon}</span>
            <span style={{ fontSize: 9, color: section === nav.id ? GOLD : "#555", fontWeight: section === nav.id ? 700 : 400, letterSpacing: 0.5 }}>
              {nav.label}
            </span>
            {section === nav.id && <div style={{ width: 20, height: 2, background: GOLD, borderRadius: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}
