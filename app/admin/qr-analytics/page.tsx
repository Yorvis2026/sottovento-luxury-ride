"use client"

import { useState, useEffect } from "react"
import { QRCodeCard } from "@/components/qr-code-card"
import {
  SLN_QR_REGISTRY,
  generateQRUrl,
  getQRForDriver,
  getQRForTablet,
  getQRForPartner,
} from "@/lib/qr/generator"
import type { QRCodeResult } from "@/lib/qr/generator"

// ============================================================
// SLN QR Analytics Dashboard
// /admin/qr-analytics
//
// Provides:
//   - Full SLN QR registry with downloadable QR codes
//   - Driver referral QR generator
//   - Tablet kiosk QR generator
//   - Partner QR generator
//   - Attribution channel breakdown (future: live stats)
// ============================================================

const GOLD = "#C9A84C"

type Tab = "registry" | "driver" | "tablet" | "partner" | "campaign"

export default function QRAnalyticsDashboard() {
  const [tab, setTab] = useState<Tab>("registry")
  const [driverCode, setDriverCode] = useState("")
  const [tabletCode, setTabletCode] = useState("")
  const [partnerCode, setPartnerCode] = useState("")
  const [campaignCode, setCampaignCode] = useState("")
  const [campaignDest, setCampaignDest] = useState("")
  const [generatedQR, setGeneratedQR] = useState<QRCodeResult | null>(null)

  // Build registry QR results
  const registryResults = SLN_QR_REGISTRY.map((config) => generateQRUrl(config))

  const handleGenerate = () => {
    setGeneratedQR(null)
    switch (tab) {
      case "driver":
        if (driverCode.trim()) setGeneratedQR(getQRForDriver(driverCode.trim().toUpperCase()))
        break
      case "tablet":
        if (tabletCode.trim()) setGeneratedQR(getQRForTablet(tabletCode.trim().toUpperCase()))
        break
      case "partner":
        if (partnerCode.trim()) setGeneratedQR(getQRForPartner(partnerCode.trim().toUpperCase()))
        break
      case "campaign":
        if (campaignCode.trim())
          setGeneratedQR(
            generateQRUrl({
              channel: "campaign",
              code: campaignCode.trim().toUpperCase(),
              destination: campaignDest || undefined,
              utm_source: "campaign",
              utm_medium: "qr",
            })
          )
        break
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "registry", label: "QR Registry" },
    { id: "driver",   label: "Driver" },
    { id: "tablet",   label: "Tablet" },
    { id: "partner",  label: "Partner" },
    { id: "campaign", label: "Campaign" },
  ]

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: `${GOLD}22`,
              border: `1px solid ${GOLD}44`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            ◈
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>
              SLN QR Attribution Dashboard
            </h1>
            <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
              Sottovento Luxury Network · QR Routing & Attribution Engine
            </p>
          </div>
        </div>

        {/* Attribution channel summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 24,
          }}
        >
          {[
            { label: "Driver Direct", color: GOLD, icon: "🚗", desc: "ref= param" },
            { label: "Tablet Kiosk", color: "#60a5fa", icon: "📱", desc: "tablet= param" },
            { label: "Partner", color: "#a78bfa", icon: "🤝", desc: "partner= param" },
            { label: "Campaign", color: "#4ade80", icon: "📣", desc: "campaign= param" },
            { label: "QR Standalone", color: "#f59e0b", icon: "◈", desc: "qr= param" },
          ].map((ch) => (
            <div
              key={ch.label}
              style={{
                background: "#111",
                border: `1px solid #222`,
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{ch.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: ch.color, marginBottom: 2 }}>
                {ch.label}
              </div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
                {ch.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          background: "#111",
          border: "1px solid #222",
          borderRadius: 12,
          padding: 4,
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setGeneratedQR(null) }}
            style={{
              flex: 1,
              minWidth: 80,
              padding: "10px 16px",
              background: tab === t.id ? `${GOLD}22` : "transparent",
              border: `1px solid ${tab === t.id ? `${GOLD}44` : "transparent"}`,
              borderRadius: 8,
              color: tab === t.id ? GOLD : "#666",
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Registry tab */}
      {tab === "registry" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
              SLN QR Registry
            </h2>
            <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
              {registryResults.length} pre-defined QR codes for physical materials and campaigns.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {registryResults.map((result) => (
              <QRCodeCard
                key={result.code}
                url={result.url}
                label={result.shortLabel}
                channel={result.channel}
                code={result.code}
                size={180}
                showDownload
                showCopy
              />
            ))}
          </div>
        </div>
      )}

      {/* Generator tabs */}
      {tab !== "registry" && (
        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
              Generate {TABS.find((t) => t.id === tab)?.label} QR Code
            </h2>

            {tab === "driver" && (
              <div>
                <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>
                  Driver Code
                </label>
                <input
                  value={driverCode}
                  onChange={(e) => setDriverCode(e.target.value)}
                  placeholder="e.g. CARLOS01"
                  style={{
                    width: "100%",
                    background: "#0d0d0d",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                  Generates a personal referral QR for the driver. Bookings will be attributed to this driver code via <code style={{ color: GOLD }}>ref=</code> parameter.
                </p>
              </div>
            )}

            {tab === "tablet" && (
              <div>
                <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>
                  Driver Code (for tablet attribution)
                </label>
                <input
                  value={tabletCode}
                  onChange={(e) => setTabletCode(e.target.value)}
                  placeholder="e.g. CARLOS01"
                  style={{
                    width: "100%",
                    background: "#0d0d0d",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                  Generates the tablet kiosk URL at <code style={{ color: GOLD }}>/tablet/[code]</code>. Bookings made on the tablet will be attributed to this driver.
                </p>
              </div>
            )}

            {tab === "partner" && (
              <div>
                <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>
                  Partner Code
                </label>
                <input
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  placeholder="e.g. HOTEL-RITZ"
                  style={{
                    width: "100%",
                    background: "#0d0d0d",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                  Generates a partner booking URL via <code style={{ color: GOLD }}>partner=</code> parameter.
                </p>
              </div>
            )}

            {tab === "campaign" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>
                    Campaign ID
                  </label>
                  <input
                    value={campaignCode}
                    onChange={(e) => setCampaignCode(e.target.value)}
                    placeholder="e.g. GOOGLE-MCO-2026"
                    style={{
                      width: "100%",
                      background: "#0d0d0d",
                      border: "1px solid #333",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "monospace",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>
                    Preset Destination (optional)
                  </label>
                  <input
                    value={campaignDest}
                    onChange={(e) => setCampaignDest(e.target.value)}
                    placeholder="e.g. Orlando International Airport (MCO)"
                    style={{
                      width: "100%",
                      background: "#0d0d0d",
                      border: "1px solid #333",
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "12px 20px",
                background: `${GOLD}22`,
                border: `1px solid ${GOLD}44`,
                borderRadius: 10,
                color: GOLD,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              Generate QR Code
            </button>
          </div>

          {generatedQR && (
            <QRCodeCard
              url={generatedQR.url}
              label={generatedQR.shortLabel}
              channel={generatedQR.channel}
              code={generatedQR.code}
              size={220}
              showDownload
              showCopy
            />
          )}
        </div>
      )}

      {/* Attribution flow diagram */}
      <div
        style={{
          marginTop: 48,
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>
          SLN Attribution Flow
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { step: "1", title: "QR Scan", desc: "User scans QR code with attribution params in URL" },
            { step: "2", title: "URL Capture", desc: "useAttribution hook reads and persists params to localStorage" },
            { step: "3", title: "Booking Form", desc: "Attribution data flows through all booking steps" },
            { step: "4", title: "Checkout", desc: "/api/checkout resolves lead origin via resolveLeadOrigin()" },
            { step: "5", title: "Stripe Metadata", desc: "Full attribution stored in Stripe session metadata" },
            { step: "6", title: "DB Record", desc: "Booking pre-created with source_type, source_reference, source_channel" },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: `${GOLD}22`,
                  border: `1px solid ${GOLD}44`,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: GOLD,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {item.step}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
