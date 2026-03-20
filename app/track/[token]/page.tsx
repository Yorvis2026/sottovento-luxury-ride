"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverInfo {
  name: string
  phone: string | null
  vehicle: string
  driver_code: string
}

interface BookingData {
  booking_id: string
  status: string
  pickup: string
  dropoff: string
  pickup_time: string
  vehicle: string
  service_type: string
  fare: number
  currency: string
  driver: DriverInfo | null
  eta: number | null
  company_name: string
  branding: {
    display_brand_name: string
  }
  en_route_at: string | null
  arrived_at: string | null
  trip_started_at: string | null
  completed_at: string | null
}

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    icon: string
    title: string
    subtitle: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  pending: {
    icon: "⏳",
    title: "Booking Received",
    subtitle: "We're preparing your ride",
    color: "#9ca3af",
    bgColor: "rgba(156,163,175,0.08)",
    borderColor: "rgba(156,163,175,0.2)",
  },
  confirmed: {
    icon: "✅",
    title: "Your ride is confirmed",
    subtitle: "A driver will be assigned shortly",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.2)",
  },
  offered: {
    icon: "✅",
    title: "Your ride is confirmed",
    subtitle: "Connecting you with a driver",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.2)",
  },
  accepted: {
    icon: "✅",
    title: "Your ride is confirmed",
    subtitle: "Driver is preparing to depart",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.2)",
  },
  assigned: {
    icon: "🚘",
    title: "Your driver is on the way",
    subtitle: "Heading to your pickup location",
    color: "#C8A96A",
    bgColor: "rgba(200,169,106,0.08)",
    borderColor: "rgba(200,169,106,0.2)",
  },
  en_route: {
    icon: "🚘",
    title: "Your driver is on the way",
    subtitle: "Heading to your pickup location",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.2)",
  },
  arrived: {
    icon: "📍",
    title: "Your driver has arrived",
    subtitle: "Please proceed to pickup location",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.2)",
  },
  in_progress: {
    icon: "🛣️",
    title: "Ride in progress",
    subtitle: "Enjoy your journey",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.08)",
    borderColor: "rgba(167,139,250,0.2)",
  },
  in_trip: {
    icon: "🛣️",
    title: "Ride in progress",
    subtitle: "Enjoy your journey",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.08)",
    borderColor: "rgba(167,139,250,0.2)",
  },
  completed: {
    icon: "✅",
    title: "Ride completed",
    subtitle: "Thank you for choosing Sottovento Luxury Ride",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.2)",
  },
  cancelled: {
    icon: "❌",
    title: "Ride cancelled",
    subtitle: "Please contact us if you need assistance",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function shortenAddress(addr: string | null): string {
  if (!addr) return "—"
  // Remove long zip codes and state abbreviations for cleaner display
  return addr.replace(/,?\s*(FL|GA|NY|CA|TX)\s+\d{5}(-\d{4})?/g, "").trim()
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrackPage() {
  const params = useParams()
  const token = params?.token as string

  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchBooking = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/client/booking/${token}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError("Booking not found. Please check your link.")
        } else {
          setError("Unable to load booking. Please try again.")
        }
        return
      }
      const data: BookingData = await res.json()
      setBooking(data)
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError("Connection error. Retrying...")
    } finally {
      setLoading(false)
    }
  }, [token])

  // Initial load
  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  // Polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchBooking, 5000)
    return () => clearInterval(interval)
  }, [fetchBooking])

  // ─── Render ────────────────────────────────────────────────────────────────

  const statusCfg = booking
    ? STATUS_CONFIG[booking.status] || STATUS_CONFIG["pending"]
    : null

  const showDriver =
    booking?.driver &&
    ["assigned", "en_route", "arrived", "in_progress", "in_trip"].includes(
      booking.status
    )

  const showETA =
    booking?.eta &&
    ["assigned", "en_route"].includes(booking.status)

  const showCallDriver =
    booking?.driver?.phone &&
    ["assigned", "en_route", "arrived", "in_progress", "in_trip"].includes(
      booking?.status || ""
    )

  const showRebook = booking?.status === "completed"

  const brandName =
    booking?.branding?.display_brand_name || "Sottovento Luxury Ride"

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        paddingLeft: "16px",
        paddingRight: "16px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "24px",
          paddingBottom: "28px",
          gap: "6px",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #C8A96A 0%, #a07840 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            marginBottom: "8px",
            boxShadow: "0 4px 20px rgba(200,169,106,0.3)",
          }}
        >
          🚘
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#C8A96A",
          }}
        >
          {brandName}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#4b5563",
            letterSpacing: "0.05em",
          }}
        >
          Ride Tracking
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "60px",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "2px solid rgba(200,169,106,0.2)",
              borderTopColor: "#C8A96A",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "#6b7280", fontSize: "14px" }}>
            Loading your ride...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Error State ── */}
      {!loading && error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
          <div
            style={{ color: "#ef4444", fontSize: "15px", fontWeight: 500 }}
          >
            {error}
          </div>
        </div>
      )}

      {/* ── Booking Content ── */}
      {!loading && booking && statusCfg && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* ── Status Card (Main) ── */}
          <div
            style={{
              background: statusCfg.bgColor,
              border: `1px solid ${statusCfg.borderColor}`,
              borderRadius: "20px",
              padding: "24px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>
              {statusCfg.icon}
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: statusCfg.color,
                marginBottom: "6px",
                letterSpacing: "-0.02em",
              }}
            >
              {statusCfg.title}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                lineHeight: 1.4,
              }}
            >
              {statusCfg.subtitle}
            </div>

            {/* ETA Badge */}
            {showETA && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "14px",
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: "100px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#f59e0b",
                }}
              >
                ⏱ ETA {booking.eta} min
              </div>
            )}
          </div>

          {/* ── Ride Details ── */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "0",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#4b5563",
                marginBottom: "14px",
              }}
            >
              Ride Details
            </div>

            {/* Pickup */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                paddingBottom: "14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4ade80",
                  marginTop: "4px",
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#4b5563",
                    marginBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Pickup
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#f9fafb",
                    lineHeight: 1.3,
                  }}
                >
                  {shortenAddress(booking.pickup)}
                </div>
              </div>
            </div>

            {/* Dropoff */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                paddingBottom: "14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  marginTop: "4px",
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#4b5563",
                    marginBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Dropoff
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#f9fafb",
                    lineHeight: 1.3,
                  }}
                >
                  {shortenAddress(booking.dropoff)}
                </div>
              </div>
            </div>

            {/* Time */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#C8A96A",
                  marginTop: "4px",
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#4b5563",
                    marginBottom: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Pickup Time
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#C8A96A",
                  }}
                >
                  {formatTime(booking.pickup_time)}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {formatDate(booking.pickup_time)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Driver Card ── */}
          {showDriver && booking.driver && (
            <div
              style={{
                background: "rgba(200,169,106,0.06)",
                border: "1px solid rgba(200,169,106,0.15)",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                  marginBottom: "14px",
                }}
              >
                Your Driver
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "14px",
                }}
              >
                {/* Driver Avatar */}
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #C8A96A 0%, #a07840 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#f9fafb",
                      marginBottom: "2px",
                    }}
                  >
                    {booking.driver.name}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                    }}
                  >
                    {booking.driver.vehicle || booking.vehicle}
                  </div>
                </div>
              </div>

              {/* Call Driver Button */}
              {showCallDriver && booking.driver.phone && (
                <a
                  href={`tel:${booking.driver.phone}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "14px",
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: "12px",
                    color: "#4ade80",
                    fontSize: "15px",
                    fontWeight: 600,
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                >
                  📞 Call Driver
                </a>
              )}
            </div>
          )}

          {/* ── In Trip State — Route Summary ── */}
          {(booking.status === "in_progress" ||
            booking.status === "in_trip") && (
            <div
              style={{
                background: "rgba(167,139,250,0.06)",
                border: "1px solid rgba(167,139,250,0.15)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#a78bfa",
                  fontWeight: 600,
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Ride in Progress
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "#f9fafb" }}>
                  {shortenAddress(booking.pickup)}
                </span>
                <span style={{ margin: "0 8px", color: "#4b5563" }}>→</span>
                <span style={{ color: "#f9fafb" }}>
                  {shortenAddress(booking.dropoff)}
                </span>
              </div>
            </div>
          )}

          {/* ── Rebook Button (after completion) ── */}
          {showRebook && booking.driver?.driver_code && (
            <a
              href={`/book?ref=${booking.driver.driver_code}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #C8A96A 0%, #a07840 100%)",
                borderRadius: "14px",
                color: "#000000",
                fontSize: "16px",
                fontWeight: 700,
                textDecoration: "none",
                boxSizing: "border-box",
                boxShadow: "0 4px 20px rgba(200,169,106,0.3)",
              }}
            >
              🚘 Book Again
            </a>
          )}

          {/* ── Footer ── */}
          <div
            style={{
              textAlign: "center",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#374151",
              }}
            >
              Auto-updating every 5 seconds
              {" · "}
              Last updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
