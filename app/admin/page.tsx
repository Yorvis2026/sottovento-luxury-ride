"use client"
import { useState, useEffect, useCallback } from "react"

// ============================================================
// /admin — Sottovento Admin Panel
// Protected with password. Manage drivers, view bookings.
// ============================================================

const ADMIN_PASSWORD = "Sottovento.20"
const BASE_URL = "https://www.sottoventoluxuryride.com"

type Driver = {
  id: string
  driver_code: string
  full_name: string
  phone: string
  email: string
  driver_status: string
  is_eligible: boolean
  created_at: string
}

type Booking = {
  id: string
  pickup_zone: string
  dropoff_zone: string
  pickup_address: string
  dropoff_address: string
  pickup_at: string
  vehicle_type: string
  total_price: number
  status: string
  payment_status: string
  created_at: string
  client_name?: string
  client_phone?: string
}

type Tab = "drivers" | "bookings" | "sms"

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [pwError, setPwError] = useState(false)
  const [tab, setTab] = useState<Tab>("drivers")

  // Drivers state
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newDriver, setNewDriver] = useState({
    full_name: "",
    phone: "",
    email: "",
    driver_code: "",
  })
  const [addingDriver, setAddingDriver] = useState(false)
  const [addDriverMsg, setAddDriverMsg] = useState("")

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  // SMS test state
  const [smsPhone, setSmsPhone] = useState("")
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState("")

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  const loadDrivers = useCallback(async () => {
    setLoadingDrivers(true)
    try {
      const res = await fetch("/api/admin/drivers")
      if (res.ok) {
        const data = await res.json()
        setDrivers(data.drivers ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingDrivers(false)
    }
  }, [])

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch("/api/admin/bookings")
      if (res.ok) {
        const data = await res.json()
        setBookings(data.bookings ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingBookings(false)
    }
  }, [])

  useEffect(() => {
    if (authed) {
      loadDrivers()
      loadBookings()
    }
  }, [authed, loadDrivers, loadBookings])

  const handleAddDriver = async () => {
    if (!newDriver.full_name || !newDriver.phone || !newDriver.driver_code) {
      setAddDriverMsg("Full name, phone and driver code are required.")
      return
    }
    setAddingDriver(true)
    setAddDriverMsg("")
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDriver),
      })
      const data = await res.json()
      if (res.ok) {
        setAddDriverMsg(`✅ Driver "${newDriver.full_name}" created. Code: ${newDriver.driver_code}`)
        setNewDriver({ full_name: "", phone: "", email: "", driver_code: "" })
        setShowAddDriver(false)
        loadDrivers()
      } else {
        setAddDriverMsg(`❌ Error: ${data.error ?? "Unknown error"}`)
      }
    } catch (e: any) {
      setAddDriverMsg(`❌ Network error: ${e.message}`)
    } finally {
      setAddingDriver(false)
    }
  }

  const handleToggleStatus = async (driver: Driver) => {
    const newStatus = driver.driver_status === "active" ? "inactive" : "active"
    try {
      await fetch(`/api/admin/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_status: newStatus }),
      })
      loadDrivers()
    } catch {
      // ignore
    }
  }

  const handleSendTestSMS = async () => {
    if (!smsPhone) return
    setSmsSending(true)
    setSmsResult("")
    try {
      const res = await fetch("/api/dispatch/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: smsPhone }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSmsResult(`✅ SMS sent successfully. SID: ${data.sid}`)
      } else {
        setSmsResult(`❌ Error: ${data.error ?? "Unknown error"}`)
      }
    } catch (e: any) {
      setSmsResult(`❌ Network error: ${e.message}`)
    } finally {
      setSmsSending(false)
    }
  }

  // ---- LOGIN SCREEN ----
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: 16,
          padding: "40px 32px",
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
        }}>
          <div style={{ color: "#c9a84c", fontSize: 12, letterSpacing: 3, marginBottom: 8 }}>SOTTOVENTO NETWORK</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Admin Panel</div>
          <input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: "#1a1a1a",
              border: pwError ? "1px solid #ef4444" : "1px solid #333",
              borderRadius: 10,
              color: "#fff",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 12,
            }}
          />
          {pwError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>Incorrect password</div>}
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "14px",
              background: "#c9a84c",
              color: "#000",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  // ---- ADMIN DASHBOARD ----
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      fontFamily: "system-ui, sans-serif",
      color: "#fff",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a1a1a",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 3 }}>SOTTOVENTO NETWORK</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Admin Dashboard</div>
        </div>
        <button
          onClick={() => setAuthed(false)}
          style={{
            background: "transparent",
            border: "1px solid #333",
            color: "#888",
            padding: "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "16px 24px 0",
        borderBottom: "1px solid #1a1a1a",
      }}>
        {(["drivers", "bookings", "sms"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              background: tab === t ? "#c9a84c" : "transparent",
              color: tab === t ? "#000" : "#888",
              border: "none",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t ? 700 : 400,
              textTransform: "capitalize",
            }}
          >
            {t === "drivers" ? `Drivers (${drivers.length})` : t === "bookings" ? `Bookings (${bookings.length})` : "SMS Test"}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px" }}>

        {/* ---- DRIVERS TAB ---- */}
        {tab === "drivers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ color: "#888", fontSize: 13 }}>Manage drivers and their tablet links</div>
              <button
                onClick={() => setShowAddDriver(!showAddDriver)}
                style={{
                  background: "#c9a84c",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add Driver
              </button>
            </div>

            {/* Add Driver Form */}
            {showAddDriver && (
              <div style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Driver</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "full_name", label: "Full Name *", placeholder: "Yorvis Hernandez" },
                    { key: "driver_code", label: "Driver Code *", placeholder: "YHV001" },
                    { key: "phone", label: "Phone *", placeholder: "+14073830647" },
                    { key: "email", label: "Email", placeholder: "driver@email.com" },
                  ].map(f => (
                    <div key={f.key}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 6, letterSpacing: 1 }}>{f.label}</div>
                      <input
                        type="text"
                        placeholder={f.placeholder}
                        value={(newDriver as any)[f.key]}
                        onChange={e => setNewDriver(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 14,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  ))}
                </div>
                {addDriverMsg && (
                  <div style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    background: addDriverMsg.startsWith("✅") ? "#0f2" + "0" : "#200",
                    borderRadius: 8,
                    fontSize: 13,
                    color: addDriverMsg.startsWith("✅") ? "#4ade80" : "#f87171",
                  }}>
                    {addDriverMsg}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    onClick={handleAddDriver}
                    disabled={addingDriver}
                    style={{
                      background: "#c9a84c",
                      color: "#000",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: addingDriver ? "not-allowed" : "pointer",
                      opacity: addingDriver ? 0.6 : 1,
                    }}
                  >
                    {addingDriver ? "Creating..." : "Create Driver"}
                  </button>
                  <button
                    onClick={() => { setShowAddDriver(false); setAddDriverMsg("") }}
                    style={{
                      background: "transparent",
                      border: "1px solid #333",
                      color: "#888",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Drivers List */}
            {loadingDrivers ? (
              <div style={{ color: "#888", textAlign: "center", padding: 40 }}>Loading drivers...</div>
            ) : drivers.length === 0 ? (
              <div style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                color: "#888",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No drivers yet</div>
                <div style={{ fontSize: 13 }}>Click "+ Add Driver" to register the first driver</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {drivers.map(driver => (
                  <div
                    key={driver.id}
                    style={{
                      background: "#111",
                      border: "1px solid #222",
                      borderRadius: 12,
                      padding: "16px 20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{driver.full_name}</div>
                          <span style={{
                            background: driver.driver_status === "active" ? "#14532d" : "#1c1917",
                            color: driver.driver_status === "active" ? "#4ade80" : "#78716c",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            {driver.driver_status?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>
                          Code: <span style={{ color: "#c9a84c", fontWeight: 600 }}>{driver.driver_code}</span>
                          {" · "}{driver.phone}
                          {driver.email && ` · ${driver.email}`}
                        </div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                          Tablet: <a
                            href={`${BASE_URL}/tablet/${driver.driver_code}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#c9a84c", textDecoration: "none" }}
                          >
                            {BASE_URL}/tablet/{driver.driver_code}
                          </a>
                        </div>
                        <div style={{ fontSize: 12, color: "#555" }}>
                          Driver Panel: <a
                            href={`${BASE_URL}/driver?code=${driver.driver_code}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#c9a84c", textDecoration: "none" }}
                          >
                            {BASE_URL}/driver?code={driver.driver_code}
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(driver)}
                        style={{
                          background: "transparent",
                          border: "1px solid #333",
                          color: "#888",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {driver.driver_status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- BOOKINGS TAB ---- */}
        {tab === "bookings" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ color: "#888", fontSize: 13 }}>All bookings in the system</div>
              <button
                onClick={loadBookings}
                style={{
                  background: "transparent",
                  border: "1px solid #333",
                  color: "#888",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
            </div>

            {loadingBookings ? (
              <div style={{ color: "#888", textAlign: "center", padding: 40 }}>Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                color: "#888",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No bookings yet</div>
                <div style={{ fontSize: 13 }}>Bookings will appear here once clients start booking</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bookings.map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: "#111",
                      border: "1px solid #222",
                      borderRadius: 12,
                      padding: "14px 18px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                          {b.pickup_zone || b.pickup_address} → {b.dropoff_zone || b.dropoff_address}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          {new Date(b.pickup_at).toLocaleString("en-US", {
                            timeZone: "America/New_York",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}{b.vehicle_type}
                          {" · "}${b.total_price}
                        </div>
                        {b.client_name && (
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                            Client: {b.client_name} {b.client_phone && `· ${b.client_phone}`}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
                          ID: {b.id.slice(0, 8)}...
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{
                          background: b.status === "completed" ? "#14532d" : b.status === "offered" ? "#1e3a5f" : "#1c1917",
                          color: b.status === "completed" ? "#4ade80" : b.status === "offered" ? "#60a5fa" : "#78716c",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}>
                          {b.status?.toUpperCase()}
                        </span>
                        <span style={{
                          color: b.payment_status === "paid" ? "#4ade80" : "#f59e0b",
                          fontSize: 11,
                        }}>
                          {b.payment_status?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- SMS TEST TAB ---- */}
        {tab === "sms" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
              Send a test SMS to verify Twilio is working correctly
            </div>
            <div style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 12,
              padding: 24,
            }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8, letterSpacing: 1 }}>PHONE NUMBER</div>
              <input
                type="tel"
                placeholder="+14073830647"
                value={smsPhone}
                onChange={e => setSmsPhone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
              />
              <button
                onClick={handleSendTestSMS}
                disabled={smsSending || !smsPhone}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: smsPhone ? "#c9a84c" : "#333",
                  color: smsPhone ? "#000" : "#666",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: smsPhone && !smsSending ? "pointer" : "not-allowed",
                }}
              >
                {smsSending ? "Sending..." : "Send Test SMS"}
              </button>
              {smsResult && (
                <div style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: smsResult.startsWith("✅") ? "#052e16" : "#1c0a0a",
                  borderRadius: 10,
                  fontSize: 13,
                  color: smsResult.startsWith("✅") ? "#4ade80" : "#f87171",
                  wordBreak: "break-all",
                }}>
                  {smsResult}
                </div>
              )}
            </div>

            <div style={{
              marginTop: 24,
              background: "#111",
              border: "1px solid #222",
              borderRadius: 12,
              padding: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Twilio Status</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.8 }}>
                <div>Number: <span style={{ color: "#c9a84c" }}>+1 (689) 264-6565</span></div>
                <div>Messaging Service: <span style={{ color: "#c9a84c" }}>Sottovento Driver Alerts</span></div>
                <div>A2P 10DLC: <span style={{ color: "#4ade80" }}>Registered — Pending vetting</span></div>
                <div>Toll-Free +1 (888) 997-5436: <span style={{ color: "#f59e0b" }}>In Review</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
