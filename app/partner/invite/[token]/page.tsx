"use client"

import { useState, useEffect } from "react"

// ============================================================
// /partner/invite/[token] — Partner Onboarding Flow
// 5 Steps: Welcome → Profile → Tax Info → Agreement → Activate
// ============================================================

const S = {
  container: { minHeight: "100vh", background: "#0a0a0a", fontFamily: "Georgia, serif", color: "#fff", paddingTop: "calc(env(safe-area-inset-top) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)", paddingLeft: "max(20px, env(safe-area-inset-left))", paddingRight: "max(20px, env(safe-area-inset-right))" } as React.CSSProperties,
  card: { background: "#111", border: "1px solid #222", borderRadius: 16, padding: "28px 24px", maxWidth: 480, margin: "0 auto" } as React.CSSProperties,
  input: { width: "100%", padding: "14px 16px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" as const, fontFamily: "system-ui, sans-serif" },
  label: { fontSize: 11, color: "#888", letterSpacing: 1.5, marginBottom: 6, display: "block", textTransform: "uppercase" as const },
  btnPrimary: { width: "100%", padding: "16px", background: "#C8A96A", color: "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" as const } as React.CSSProperties,
  btnSecondary: { width: "100%", padding: "14px", background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 10, fontSize: 14, cursor: "pointer" } as React.CSSProperties,
}

export default function PartnerOnboarding({ params }: { params: { token: string } }) {
  const { token } = params
  const [step, setStep] = useState(0) // 0=loading, 1=welcome, 2=profile, 3=tax, 4=agreement, 5=activate
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    type: "individual",
    legal_name: "",
    business_name: "",
    entity_type: "individual",
    tax_id_type: "SSN",
    tax_id: "",
    address: "",
    agreement_accepted: false,
  })

  const [result, setResult] = useState<{ partner_link: string; referral_link: string; ref_code: string } | null>(null)

  // Load invite on mount
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`/api/partner/onboard?token=${token}`)
        const d = await r.json()
        if (!r.ok) { setError(d.error ?? "Invalid invitation"); setStep(-1); return }
        setInvite(d.invite)
        // Pre-fill from invite
        if (d.invite.prefilled_data?.name) setForm(f => ({ ...f, name: d.invite.prefilled_data.name }))
        if (d.invite.email) setForm(f => ({ ...f, email: d.invite.email }))
        if (d.invite.phone) setForm(f => ({ ...f, phone: d.invite.phone }))
        if (d.invite.type) setForm(f => ({ ...f, type: d.invite.type }))
        setStep(1)
      } catch {
        setError("Network error. Please try again.")
        setStep(-1)
      }
    }
    load()
  }, [token])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch("/api/partner/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form })
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error ?? "Submission failed"); return }
      setResult(d)
      setStep(5)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const update = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }))

  // ---- LOADING ----
  if (step === 0) {
    return (
      <div style={S.container}>
        <div style={{ ...S.card, textAlign: "center", paddingTop: 60, paddingBottom: 60 }}>
          <div style={{ color: "#C8A96A", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>SOTTOVENTO LUXURY NETWORK</div>
          <div style={{ color: "#555", fontSize: 14 }}>Validating your invitation...</div>
        </div>
      </div>
    )
  }

  // ---- ERROR / INVALID ----
  if (step === -1) {
    return (
      <div style={S.container}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ color: "#C8A96A", fontSize: 11, letterSpacing: 3, marginBottom: 24 }}>SOTTOVENTO LUXURY NETWORK</div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Invalid Invitation</div>
          <div style={{ color: "#888", fontSize: 14, lineHeight: 1.8 }}>{error}</div>
          <div style={{ color: "#555", fontSize: 12, marginTop: 20 }}>
            This invitation may have expired or already been used.<br />
            Contact your Sottovento representative for a new link.
          </div>
        </div>
      </div>
    )
  }

  // ---- STEP 5: ACTIVATE / SUCCESS ----
  if (step === 5 && result) {
    return (
      <div style={S.container}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ color: "#C8A96A", fontSize: 11, letterSpacing: 3, marginBottom: 24 }}>SOTTOVENTO LUXURY NETWORK</div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome to the Network</div>
          <div style={{ color: "#888", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
            Your partner account is now active.<br />
            Start sharing your referral link to earn commissions.
          </div>

          {/* Ref Code */}
          <div style={{ background: "#1a1a1a", border: "1px solid #C8A96A33", borderRadius: 12, padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#C8A96A", letterSpacing: 2, marginBottom: 8 }}>YOUR REFERRAL CODE</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: "#C8A96A" }}>{result.ref_code}</div>
          </div>

          {/* Referral Link */}
          <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 12, padding: "16px", marginBottom: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, marginBottom: 8 }}>YOUR REFERRAL LINK</div>
            <div style={{ fontSize: 13, color: "#fff", wordBreak: "break-all", marginBottom: 10 }}>{result.referral_link}</div>
            <button onClick={() => navigator.clipboard.writeText(result.referral_link)}
              style={{ background: "#333", border: "none", color: "#C8A96A", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              Copy Link
            </button>
          </div>

          {/* Go to Dashboard */}
          <a href={result.partner_link}
            style={{ ...S.btnPrimary, display: "block", textDecoration: "none", textAlign: "center" }}>
            Open My Dashboard →
          </a>

          <div style={{ color: "#555", fontSize: 12, marginTop: 20 }}>
            A welcome email has been sent with your credentials.
          </div>
        </div>
      </div>
    )
  }

  // Progress indicator
  const steps = ["Welcome", "Profile", "Tax Info", "Agreement"]
  const currentStepIdx = step - 1

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: "#C8A96A", fontSize: 11, letterSpacing: 3, marginBottom: 4 }}>SOTTOVENTO LUXURY NETWORK</div>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Partner Onboarding</div>
      </div>

      {/* Progress Bar */}
      <div style={{ maxWidth: 480, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ fontSize: 10, color: i < currentStepIdx ? "#C8A96A" : i === currentStepIdx ? "#fff" : "#444", letterSpacing: 1, textTransform: "uppercase" as const, flex: 1, textAlign: "center" }}>
              {i < currentStepIdx ? "✓" : `${i + 1}`}. {s}
            </div>
          ))}
        </div>
        <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2 }}>
          <div style={{ height: "100%", background: "#C8A96A", borderRadius: 2, width: `${(currentStepIdx / (steps.length - 1)) * 100}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* ---- STEP 1: WELCOME ---- */}
      {step === 1 && (
        <div style={S.card}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome</div>
          <div style={{ color: "#888", fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
            You've been invited to join the <strong style={{ color: "#C8A96A" }}>Sottovento Partner Network</strong> — 
            Orlando's premier luxury transportation referral program.
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "#C8A96A", letterSpacing: 2, marginBottom: 12 }}>YOUR INVITATION DETAILS</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#888", fontSize: 13 }}>Type</span>
              <span style={{ fontWeight: 600, textTransform: "capitalize" as const }}>{invite?.type ?? "Partner"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#888", fontSize: 13 }}>Commission Rate</span>
              <span style={{ fontWeight: 700, color: "#C8A96A" }}>{Math.round(Number(invite?.commission_rate ?? 0.10) * 100)}% per booking</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#888", fontSize: 13 }}>Expires</span>
              <span style={{ fontSize: 13 }}>{invite?.expires_at ? new Date(invite.expires_at).toLocaleDateString() : "—"}</span>
            </div>
          </div>

          <div style={{ color: "#555", fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>
            By completing this onboarding, you agree to receive commission payments for bookings generated through your referral link. 
            Tax information is required for payments exceeding $600/year (IRS 1099 requirement).
          </div>

          <button onClick={() => setStep(2)} style={S.btnPrimary}>
            Get Started →
          </button>
        </div>
      )}

      {/* ---- STEP 2: PROFILE ---- */}
      {step === 2 && (
        <div style={S.card}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Your Profile</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>Tell us about yourself</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={S.label}>Full Name *</label>
              <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="John Smith" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Phone *</label>
              <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+1 (407) 000-0000" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Email</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="john@hotel.com" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Company / Hotel / Business</label>
              <input value={form.company} onChange={e => update("company", e.target.value)} placeholder="JW Marriott Orlando" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Partner Type</label>
              <select value={form.type} onChange={e => update("type", e.target.value)} style={{ ...S.input, color: "#fff" }}>
                <option value="hotel">Hotel</option>
                <option value="valet">Valet</option>
                <option value="airbnb">Airbnb Host</option>
                <option value="influencer">Influencer</option>
                <option value="staff">Staff</option>
                <option value="individual">Individual</option>
              </select>
            </div>
          </div>

          {error && <div style={{ marginTop: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={S.btnSecondary}>← Back</button>
            <button onClick={() => { if (!form.name || !form.phone) { setError("Name and phone are required"); return }; setError(""); setStep(3) }} style={S.btnPrimary}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ---- STEP 3: TAX INFO ---- */}
      {step === 3 && (
        <div style={S.card}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Tax Information</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>Required for IRS compliance (1099)</div>
          <div style={{ background: "#1a1a1a", borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 12, color: "#888", lineHeight: 1.7 }}>
            🔒 Your tax information is encrypted and stored securely. It is only used for annual 1099 reporting when earnings exceed $600.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={S.label}>Legal Name (as on tax return)</label>
              <input value={form.legal_name} onChange={e => update("legal_name", e.target.value)} placeholder={form.name} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Business Name (if applicable)</label>
              <input value={form.business_name} onChange={e => update("business_name", e.target.value)} placeholder={form.company} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Entity Type</label>
              <select value={form.entity_type} onChange={e => update("entity_type", e.target.value)} style={{ ...S.input, color: "#fff" }}>
                <option value="individual">Individual / Sole Proprietor</option>
                <option value="sole_prop">Sole Proprietorship</option>
                <option value="llc">LLC</option>
                <option value="corp">Corporation</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Tax ID Type</label>
              <div style={{ display: "flex", gap: 12 }}>
                {["SSN", "EIN"].map(t => (
                  <button key={t} onClick={() => update("tax_id_type", t)}
                    style={{ flex: 1, padding: "12px", borderRadius: 8, border: form.tax_id_type === t ? "1px solid #C8A96A" : "1px solid #333", background: form.tax_id_type === t ? "#C8A96A22" : "#1a1a1a", color: form.tax_id_type === t ? "#C8A96A" : "#888", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>{form.tax_id_type} Number</label>
              <input
                type="password"
                value={form.tax_id}
                onChange={e => update("tax_id", e.target.value)}
                placeholder={form.tax_id_type === "SSN" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Address</label>
              <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="123 Main St, Orlando, FL 32801" style={S.input} />
            </div>
          </div>

          <div style={{ color: "#555", fontSize: 11, marginTop: 12, lineHeight: 1.7 }}>
            You may skip tax information now and provide it later. However, payments will be held until tax information is verified.
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={S.btnSecondary}>← Back</button>
            <button onClick={() => setStep(4)} style={S.btnPrimary}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ---- STEP 4: AGREEMENT ---- */}
      {step === 4 && (
        <div style={S.card}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Partner Agreement</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Please read and accept the terms</div>

          <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 10, padding: "20px", marginBottom: 20, maxHeight: 320, overflowY: "auto" as const, fontSize: 12, color: "#888", lineHeight: 1.9 }}>
            <strong style={{ color: "#C8A96A", display: "block", marginBottom: 4, fontSize: 13 }}>SOTTOVENTO LUXURY NETWORK — PARTNER AGREEMENT</strong>
            <div style={{ color: "#555", fontSize: 11, marginBottom: 16 }}>Effective Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>

            <span style={{ color: "#aaa", fontSize: 12 }}>This Partner Agreement (&quot;Agreement&quot;) is entered into between Sottovento Luxury Network (&quot;Company&quot;) and the individual or entity registering as a Partner (&quot;Partner&quot;).</span>
            <br /><br />

            <strong style={{ color: "#fff" }}>1. PURPOSE</strong><br />
            The purpose of this Agreement is to establish a referral relationship in which the Partner introduces potential clients to Sottovento Luxury Network transportation services.
            <br /><br />

            <strong style={{ color: "#fff" }}>2. INDEPENDENT CONTRACTOR STATUS</strong><br />
            Partner is an independent contractor and not an employee, agent, or representative of Sottovento Luxury Network. Partner may not represent themselves as: an employee of Sottovento, a driver for Sottovento, or an official company representative.
            <br /><br />

            <strong style={{ color: "#fff" }}>3. REFERRAL SYSTEM</strong><br />
            Partner will receive a unique referral link and/or QR code. Clients referred through this link will be tracked and assigned within the system.
            <br /><br />

            <strong style={{ color: "#fff" }}>4. CLIENT OWNERSHIP</strong><br />
            Partner is granted a conditional commission right, not ownership of clients. Clients remain property of Sottovento Luxury Network. Partner may earn commissions from referred clients while active.
            <br /><br />

            <strong style={{ color: "#fff" }}>5. COMMISSIONS</strong><br />
            Partner will receive a commission based on completed bookings generated through their referral. Commission rate: <strong style={{ color: "#C8A96A" }}>{Math.round(Number(invite?.commission_rate ?? 0.10) * 100)}%</strong> per completed and paid booking.
            <br /><br />

            <strong style={{ color: "#fff" }}>6. CONDITIONS FOR COMMISSION</strong><br />
            Commissions are valid only if: (a) Partner account is active, (b) Client booking occurs within Sottovento system, and (c) Booking is completed successfully.
            <br /><br />

            <strong style={{ color: "#fff" }}>7. ACTIVITY REQUIREMENT</strong><br />
            If Partner shows no activity for 90 days, commission may be reduced or paused. If inactive for an extended period, client assignment may be reassigned.
            <br /><br />

            <strong style={{ color: "#fff" }}>8. TAX COMPLIANCE (1099)</strong><br />
            If Partner earnings reach or exceed $600 USD annually, Partner must provide valid tax information (W-9) and Company may issue IRS Form 1099. Failure to provide tax information may result in withholding of payments or account suspension.
            <br /><br />

            <strong style={{ color: "#fff" }}>9. PAYMENT TERMS</strong><br />
            Payments may be issued periodically (weekly or monthly). Payments are subject to approval and verification.
            <br /><br />

            <strong style={{ color: "#fff" }}>10. PROHIBITED CONDUCT</strong><br />
            Partner agrees NOT to: misrepresent Sottovento services, offer unauthorized pricing, engage in fraudulent referrals, or violate hotel or property policies.
            <br /><br />

            <strong style={{ color: "#fff" }}>11. BRAND USAGE</strong><br />
            Partner may use Sottovento branding only as authorized (e.g., &quot;Official Transportation Partner&quot;). Unauthorized use of logos or misleading branding is prohibited.
            <br /><br />

            <strong style={{ color: "#fff" }}>12. TERMINATION</strong><br />
            Company reserves the right to suspend or terminate Partner account at any time, modify commission structure, and reassign client relationships if necessary.
            <br /><br />

            <strong style={{ color: "#fff" }}>13. LIMITATION OF LIABILITY</strong><br />
            Sottovento is not liable for Partner business losses, missed opportunities, or indirect damages.
            <br /><br />

            <strong style={{ color: "#fff" }}>14. AGREEMENT ACCEPTANCE</strong><br />
            By registering and activating the Partner account, Partner agrees to all terms stated in this Agreement.
            <br /><br />
            <span style={{ color: "#555", fontSize: 11 }}>Sottovento Luxury Network — &quot;Premium Transportation. Elevated Experience.&quot;</span>
          </div>

          {/* Agreement Checkbox */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 24 }}>
            <input
              type="checkbox"
              checked={form.agreement_accepted}
              onChange={e => update("agreement_accepted", e.target.checked)}
              style={{ marginTop: 3, width: 18, height: 18, accentColor: "#C8A96A", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
              I have read, understood, and agree to the <strong style={{ color: "#C8A96A" }}>Sottovento Luxury Network Partner Agreement</strong>. I understand my status as an independent contractor, the commission structure, payment terms, tax obligations (1099), and all terms stated above. I agree that clients remain property of Sottovento Luxury Network.
            </span>
          </label>

          {error && <div style={{ marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setStep(3)} style={S.btnSecondary}>← Back</button>
            <button
              onClick={() => {
                if (!form.agreement_accepted) { setError("You must accept the agreement to continue"); return }
                setError("")
                handleSubmit()
              }}
              disabled={submitting || !form.agreement_accepted}
              style={{ ...S.btnPrimary, opacity: submitting || !form.agreement_accepted ? 0.5 : 1 }}>
              {submitting ? "Activating..." : "Activate Account →"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
