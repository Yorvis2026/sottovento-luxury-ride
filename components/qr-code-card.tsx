"use client"

import { useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"

// ============================================================
// QRCodeCard — Reusable QR code display component
//
// Shows a QR code with:
//   - Sottovento brand logo in center
//   - Channel label and attribution code
//   - Copy URL button
//   - Download QR button
//   - Optional destination/service badge
// ============================================================

const GOLD = "#C9A84C"
const DARK = "#0a0a0a"

interface QRCodeCardProps {
  url: string
  label: string
  channel: string
  code: string
  destination?: string
  size?: number
  showDownload?: boolean
  showCopy?: boolean
  compact?: boolean
}

const CHANNEL_LABELS: Record<string, string> = {
  driver_direct: "Driver Referral",
  tablet:        "Tablet Kiosk",
  partner:       "Partner",
  campaign:      "Campaign",
  qr_standalone: "QR Code",
  organic:       "Direct",
}

const CHANNEL_COLORS: Record<string, string> = {
  driver_direct: "#C9A84C",
  tablet:        "#60a5fa",
  partner:       "#a78bfa",
  campaign:      "#4ade80",
  qr_standalone: "#f59e0b",
  organic:       "#6b7280",
}

export function QRCodeCard({
  url,
  label,
  channel,
  code,
  destination,
  size = 200,
  showDownload = true,
  showCopy = true,
  compact = false,
}: QRCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const channelLabel = CHANNEL_LABELS[channel] ?? channel
  const channelColor = CHANNEL_COLORS[channel] ?? GOLD

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      // Create a canvas from the SVG QR code
      const svgEl = document.querySelector(`[data-qr-id="${code}"] svg`) as SVGElement
      if (!svgEl) {
        setDownloading(false)
        return
      }
      const svgData = new XMLSerializer().serializeToString(svgEl)
      const canvas = document.createElement("canvas")
      const padding = 40
      canvas.width = size + padding * 2
      canvas.height = size + padding * 2 + 60
      const ctx = canvas.getContext("2d")!

      // Background
      ctx.fillStyle = DARK
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // QR code
      const img = new Image()
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      img.onload = () => {
        ctx.drawImage(img, padding, padding, size, size)

        // Label text
        ctx.fillStyle = channelColor
        ctx.font = "bold 14px system-ui"
        ctx.textAlign = "center"
        ctx.fillText(label, canvas.width / 2, size + padding + 24)

        ctx.fillStyle = "#888"
        ctx.font = "11px system-ui"
        ctx.fillText(code, canvas.width / 2, size + padding + 42)

        // Download
        const link = document.createElement("a")
        link.download = `sottovento-qr-${code.toLowerCase()}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()

        URL.revokeObjectURL(svgUrl)
        setDownloading(false)
      }
      img.onerror = () => {
        setDownloading(false)
      }
      img.src = svgUrl
    } catch {
      setDownloading(false)
    }
  }, [url, code, label, size, channelColor])

  if (compact) {
    return (
      <div
        data-qr-id={code}
        style={{
          background: "#111",
          border: `1px solid #222`,
          borderRadius: 12,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 8,
            flexShrink: 0,
          }}
        >
          <QRCodeSVG
            value={url}
            size={80}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
            {label}
          </div>
          <div
            style={{
              display: "inline-block",
              padding: "2px 8px",
              background: `${channelColor}22`,
              border: `1px solid ${channelColor}44`,
              borderRadius: 4,
              fontSize: 10,
              color: channelColor,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {channelLabel}
          </div>
          <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url}
          </div>
        </div>
        {showCopy && (
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 12px",
              background: copied ? "#4ade8022" : "#1a1a1a",
              border: `1px solid ${copied ? "#4ade80" : "#333"}`,
              borderRadius: 8,
              color: copied ? "#4ade80" : "#888",
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {copied ? "✓" : "Copy"}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      data-qr-id={code}
      style={{
        background: "#111",
        border: `1px solid #222`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Channel badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        <div
          style={{
            padding: "3px 10px",
            background: `${channelColor}22`,
            border: `1px solid ${channelColor}44`,
            borderRadius: 6,
            fontSize: 10,
            color: channelColor,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {channelLabel}
        </div>
        {destination && (
          <div
            style={{
              padding: "3px 10px",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 6,
              fontSize: 10,
              color: "#888",
              letterSpacing: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            → {destination}
          </div>
        )}
      </div>

      {/* QR Code */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          boxShadow: `0 0 0 1px #333`,
        }}
      >
        <QRCodeSVG
          value={url}
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          imageSettings={{
            src: "/images/logo-qr.png",
            x: undefined,
            y: undefined,
            height: Math.round(size * 0.18),
            width: Math.round(size * 0.18),
            excavate: true,
          }}
        />
      </div>

      {/* Label */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>
          {code}
        </div>
      </div>

      {/* URL preview */}
      <div
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#0d0d0d",
          border: "1px solid #222",
          borderRadius: 8,
          fontSize: 11,
          color: "#555",
          fontFamily: "monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {url}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {showCopy && (
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: copied ? "#4ade8022" : "#1a1a1a",
              border: `1px solid ${copied ? "#4ade80" : "#333"}`,
              borderRadius: 10,
              color: copied ? "#4ade80" : "#aaa",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copied" : "Copy URL"}
          </button>
        )}
        {showDownload && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: downloading ? "#1a1a1a" : `${GOLD}22`,
              border: `1px solid ${downloading ? "#333" : `${GOLD}44`}`,
              borderRadius: 10,
              color: downloading ? "#555" : GOLD,
              fontSize: 13,
              fontWeight: 600,
              cursor: downloading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {downloading ? "Generating..." : "Download PNG"}
          </button>
        )}
      </div>
    </div>
  )
}
