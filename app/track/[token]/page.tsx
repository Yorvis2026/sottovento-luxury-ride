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

// ─── Status Config — Premium Copy ─────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    icon: string
    title: string
    subtitle: string
    color: string
    bgColor: string
    borderColor: string
    pulse?: boolean
    glow?: boolean
  }
> = {
  pending: {
    icon: "⏳",
    title: "Booking Received",
    subtitle: "We're preparing your private ride",
    color: "#9ca3af",
    bgColor: "rgba(156,163,175,0.06)",
    borderColor: "rgba(156,163,175,0.15)",
  },
  confirmed: {
    icon: "✅",
    title: "Your private ride is confirmed",
    subtitle: "A driver will be assigned shortly",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.06)",
    borderColor: "rgba(74,222,128,0.18)",
  },
  offered: {
    icon: "✅",
    title: "Your private ride is confirmed",
    subtitle: "Connecting you with your driver",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.06)",
    borderColor: "rgba(74,222,128,0.18)",
  },
  accepted: {
    icon: "✅",
    title: "Your private ride is confirmed",
    subtitle: "Your driver is preparing to depart",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.06)",
    borderColor: "rgba(74,222,128,0.18)",
  },
  assigned: {
    icon: "🚘",
    title: "Your private driver is on the way",
    subtitle: "Heading to your pickup location",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.06)",
    borderColor: "rgba(245,158,11,0.2)",
    pulse: true,
  },
  en_route: {
    icon: "🚘",
    title: "Your private driver is on the way",
    subtitle: "Heading to your pickup location",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.06)",
    borderColor: "rgba(245,158,11,0.2)",
    pulse: true,
  },
  arrived: {
    icon: "📍",
    title: "Your driver has arrived at your pickup location",
    subtitle: "Please proceed to your vehicle",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.08)",
    borderColor: "rgba(74,222,128,0.3)",
    glow: true,
  },
  in_progress: {
    icon: "🛣️",
    title: "You are on your way",
    subtitle: "Sit back and enjoy the journey",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.06)",
    borderColor: "rgba(167,139,250,0.18)",
  },
  in_trip: {
    icon: "🛣️",
    title: "You are on your way",
    subtitle: "Sit back and enjoy the journey",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.06)",
    borderColor: "rgba(167,139,250,0.18)",
  },
  completed: {
    icon: "✅",
    title: "Your ride has been completed",
    subtitle: "Thank you for choosing Sottovento Luxury Ride.",
    color: "#C8A96A",
    bgColor: "rgba(200,169,106,0.06)",
    borderColor: "rgba(200,169,106,0.2)",
  },
  cancelled: {
    icon: "❌",
    title: "Ride cancelled",
    subtitle: "Please contact us if you need assistance",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.06)",
    borderColor: "rgba(239,68,68,0.18)",
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
  const [tripElapsed, setTripElapsed] = useState<number>(0)

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

  // Trip elapsed timer
  useEffect(() => {
    if (!booking?.trip_started_at) return
    const start = new Date(booking.trip_started_at).getTime()
    const tick = () => setTripElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [booking?.trip_started_at])

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
    booking?.eta != null && booking.eta > 0 &&
    ["assigned", "en_route"].includes(booking.status)

  const showCallDriver =
    booking?.driver?.phone &&
    ["assigned", "en_route", "arrived", "in_progress", "in_trip"].includes(
      booking?.status || ""
    )

  const showRebook = booking?.status === "completed"
  const isInTrip = booking?.status === "in_progress" || booking?.status === "in_trip"
  const isArrived = booking?.status === "arrived"
  const isEnRoute = booking?.status === "en_route" || booking?.status === "assigned"

  const brandName =
    booking?.branding?.display_brand_name || "Sottovento Luxury Ride"

  const elapsedStr = (() => {
    const m = Math.floor(tripElapsed / 60)
    const s = tripElapsed % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  })()

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#080808",
        color: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)",
        paddingLeft: "20px",
        paddingRight: "20px",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          70% { box-shadow: 0 0 0 12px rgba(245,158,11,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        @keyframes glow-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          50% { box-shadow: 0 0 20px 4px rgba(74,222,128,0.25); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .track-card { animation: fade-in 0.35s ease; }
        .pulse-amber { animation: pulse-ring 2s ease-out infinite; }
        .glow-green-anim { animation: glow-green 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "20px",
          paddingBottom: "28px",
          gap: "6px",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #C8A96A 0%, #8a6020 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            marginBottom: "10px",
            boxShadow: "0 4px 24px rgba(200,169,106,0.35)",
          }}
        >
          🚘
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#C8A96A",
          }}
        >
          {brandName}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#374151",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
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
            paddingTop: "80px",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              border: "2px solid rgba(200,169,106,0.15)",
              borderTopColor: "#C8A96A",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <div style={{ color: "#4b5563", fontSize: "14px", letterSpacing: "0.04em" }}>
            Loading your ride...
          </div>
        </div>
      )}

      {/* ── Error State ── */}
      {!loading && error && (
        <div
          className="track-card"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.18)",
            borderRadius: "20px",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "14px" }}>⚠️</div>
          <div style={{ color: "#ef4444", fontSize: "15px", fontWeight: 500 }}>
            {error}
          </div>
        </div>
      )}

      {/* ── Booking Content ── */}
      {!loading && booking && statusCfg && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* ── Status Card (Main) ── */}
          <div
            className={`track-card ${isEnRoute ? "pulse-amber" : ""} ${isArrived ? "glow-green-anim" : ""}`}
            style={{
              background: statusCfg.bgColor,
              border: `1px solid ${statusCfg.borderColor}`,
              borderRadius: "22px",
              padding: "28px 22px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>
              {statusCfg.icon}
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#f9fafb",
                marginBottom: "8px",
                lineHeight: 1.3,
              }}
            >
              {statusCfg.title}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              {statusCfg.subtitle}
            </div>

            {/* ETA badge */}
            {showETA && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "16px",
                  padding: "8px 16px",
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: "100px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#f59e0b",
                }}
              >
                ⏱ ETA: {booking.eta} min
              </div>
            )}

            {/* In-trip elapsed timer */}
            {isInTrip && booking.trip_started_at && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "16px",
                  padding: "8px 16px",
                  background: "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: "100px",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#a78bfa",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                🕐 {elapsedStr} in ride
              </div>
            )}
          </div>

          {/* ── Arrived — Strong Visual Confirmation ── */}
          {isArrived && (
            <div
              className="track-card"
              style={{
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: "16px",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(74,222,128,0.15)",
                  border: "2px solid #4ade80",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#4ade80", marginBottom: "2px" }}>
                  Your vehicle is waiting
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  Proceed to your pickup location
                </div>
              </div>
            </div>
          )}

          {/* ── Driver Card ── */}
          {showDriver && booking.driver && (
            <div
              className="track-card"
              style={{
                background: "rgba(200,169,106,0.05)",
                border: "1px solid rgba(200,169,106,0.18)",
                borderRadius: "20px",
                padding: "22px 20px",
              }}
            >
              {/* Section label */}
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#4b5563",
                  marginBottom: "16px",
                }}
              >
                Your driver
              </div>

              {/* Driver info row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "18px",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #C8A96A 0%, #7a5010 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    flexShrink: 0,
                    border: "2px solid rgba(200,169,106,0.3)",
                  }}
                >
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#f9fafb",
                      marginBottom: "4px",
                    }}
                  >
                    {booking.driver.name}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>🚘</span>
                    <span>{booking.driver.vehicle || booking.vehicle}</span>
                  </div>
                </div>
              </div>

              {/* Concierge tone */}
              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "16px",
                  fontStyle: "italic",
                }}
              >
                Need anything? Contact your driver directly.
              </div>

              {/* Call Driver Button */}
              {showCallDriver && booking.driver.phone && (
                <a
                  href={`tel:${booking.driver.phone}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "15px",
                    background: "linear-gradient(135deg, #C8A96A 0%, #a07030 100%)",
                    borderRadius: "14px",
                    color: "#000000",
                    fontSize: "15px",
                    fontWeight: 700,
                    textDecoration: "none",
                    boxSizing: "border-box",
                    boxShadow: "0 4px 16px rgba(200,169,106,0.25)",
                    letterSpacing: "0.02em",
                  }}
                >
                  📞 Call Driver
                </a>
              )}
            </div>
          )}

          {/* ── Route Details Card ── */}
          <div
            className="track-card"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "20px",
              padding: "22px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Pickup */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#4ade80",
                  marginTop: "5px",
                  flexShrink: 0,
                  boxShadow: "0 0 6px rgba(74,222,128,0.5)",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#374151",
                    marginBottom: "3px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 600,
                  }}
                >
                  Pickup
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#f9fafb",
                    lineHeight: 1.35,
                  }}
                >
                  {shortenAddress(booking.pickup)}
                </div>
              </div>
            </div>

            {/* Divider line */}
            <div
              style={{
                marginLeft: "4px",
                width: "2px",
                height: "20px",
                background: "linear-gradient(to bottom, #4ade80, #ef4444)",
                borderRadius: "2px",
                alignSelf: "flex-start",
                marginTop: "-12px",
                marginBottom: "-12px",
              }}
            />

            {/* Dropoff */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  marginTop: "5px",
                  flexShrink: 0,
                  boxShadow: "0 0 6px rgba(239,68,68,0.5)",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#374151",
                    marginBottom: "3px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 600,
                  }}
                >
                  Dropoff
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "#f9fafb",
                    lineHeight: 1.35,
                  }}
                >
                  {shortenAddress(booking.dropoff)}
                </div>
              </div>
            </div>

            {/* Pickup Time */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#374151",
                    marginBottom: "3px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 600,
                  }}
                >
                  Pickup Time
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#C8A96A",
                  }}
                >
                  {formatTime(booking.pickup_time)}
                </div>
                <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
                  {formatDate(booking.pickup_time)}
                </div>
              </div>
              {booking.fare > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#374151",
                      marginBottom: "3px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 600,
                    }}
                  >
                    Fare
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#C8A96A",
                    }}
                  >
                    ${booking.fare}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Completion Screen ── */}
          {showRebook && (
            <div
              className="track-card"
              style={{
                background: "rgba(200,169,106,0.06)",
                border: "1px solid rgba(200,169,106,0.2)",
                borderRadius: "20px",
                padding: "28px 22px",
                textAlign: "center",
              }}
            >
              {/* Thank you message */}
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#f9fafb",
                  marginBottom: "10px",
                  lineHeight: 1.3,
                }}
              >
                ✅ Your ride has been completed
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  marginBottom: "24px",
                  lineHeight: 1.6,
                }}
              >
                Thank you for choosing Sottovento Luxury Ride
              </div>

              {/* Retention Hook */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  marginBottom: "20px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#C8A96A",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Save this link for your next ride
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    lineHeight: 1.5,
                  }}
                >
                  You can use this same link anytime to request your next ride — no app, no login required.
                </div>
              </div>

              {/* Rebook CTA */}
              {booking.driver?.driver_code && (
                <a
                  href={`/book?ref=${booking.driver.driver_code}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "17px",
                    background: "linear-gradient(135deg, #C8A96A 0%, #a07030 100%)",
                    borderRadius: "14px",
                    color: "#000000",
                    fontSize: "16px",
                    fontWeight: 800,
                    textDecoration: "none",
                    boxSizing: "border-box",
                    boxShadow: "0 6px 24px rgba(200,169,106,0.35)",
                    letterSpacing: "0.02em",
                  }}
                >
                  🚘 Book your next ride
                </a>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div
            style={{
              textAlign: "center",
              paddingTop: "4px",
              paddingBottom: "8px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#1f2937",
                letterSpacing: "0.03em",
              }}
            >
              Auto-updating
              {" · "}
              {lastUpdated.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
