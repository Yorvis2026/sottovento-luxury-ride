"use client"

import { useEffect, useRef, useState, useCallback } from "react"

const GOLD = "#C9A84C"
const DARK_BG = "rgba(255,255,255,0.05)"
const BORDER_COLOR = "rgba(255,255,255,0.15)"
const BORDER_FOCUS = GOLD

// ── Types ────────────────────────────────────────────────────

export interface FlightSuggestion {
  flight_display: string
  airline_name: string
  airline_code: string
  flight_number: string
  origin_airport: string
  destination_airport: string
  scheduled_arrival_at: string | null
  estimated_arrival_at: string | null
  terminal_code: string | null
  status: string
  provider: string
  priority_score: number
}

export interface FlightSelectionData {
  flight_display: string
  airline_code: string
  flight_number: string
  carrier_name: string
  destination_airport: string
  origin_airport: string
  scheduled_arrival_at: string | null
  estimated_arrival_at: string | null
  terminal_code: string | null
  provider: string
  selection_mode: "suggested" | "manual"
  selected_at: string
}

interface FlightAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (data: FlightSelectionData) => void
  airportBias?: string
  date?: string
  placeholder?: string
  disabled?: boolean
}

// ── Helpers ──────────────────────────────────────────────────

function formatArrivalTime(isoString: string | null): string {
  if (!isoString) return ""
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    })
  } catch {
    return ""
  }
}

function getStatusBadge(status: string): { label: string; color: string } {
  switch (status) {
    case "scheduled":
      return { label: "Scheduled", color: "rgba(100,200,100,0.8)" }
    case "in_air":
      return { label: "In Air", color: "rgba(100,160,255,0.8)" }
    case "landed":
    case "at_gate":
      return { label: "Landed", color: "rgba(180,180,180,0.8)" }
    case "delayed":
      return { label: "Delayed", color: "rgba(255,180,50,0.8)" }
    case "cancelled":
      return { label: "Cancelled", color: "rgba(255,80,80,0.8)" }
    default:
      return { label: status, color: "rgba(180,180,180,0.6)" }
  }
}

// ── Component ────────────────────────────────────────────────

export function FlightAutocomplete({
  value,
  onChange,
  onSelect,
  airportBias = "MCO",
  date,
  placeholder = "AA1234",
  disabled = false,
}: FlightAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<FlightSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [providerUnavailable, setProviderUnavailable] = useState(false)
  const [selected, setSelected] = useState(false)
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([])
        setOpen(false)
        setNoResults(false)
        setProviderUnavailable(false)
        return
      }

      setLoading(true)
      setNoResults(false)
      setProviderUnavailable(false)

      try {
        const params = new URLSearchParams({
          query,
          airport_bias: airportBias,
          limit: "8",
        })
        if (date) params.set("date", date)

        const res = await fetch(`/api/flights/search-suggestions?${params.toString()}`)
        if (!res.ok) throw new Error("API error")
        const data = await res.json()

        if (data.results && data.results.length > 0) {
          setSuggestions(data.results)
          setOpen(true)
          setNoResults(false)
        } else {
          setSuggestions([])
          setOpen(true)
          if (data.provider_status === "providers_unavailable") {
            setProviderUnavailable(true)
          } else {
            setNoResults(true)
          }
        }
      } catch {
        setSuggestions([])
        setOpen(false)
        setProviderUnavailable(true)
      } finally {
        setLoading(false)
      }
    },
    [airportBias, date]
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    setSelected(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val.trim())
    }, 350)
  }

  function handleSelect(suggestion: FlightSuggestion) {
    const selectionData: FlightSelectionData = {
      flight_display: suggestion.flight_display,
      airline_code: suggestion.airline_code,
      flight_number: suggestion.flight_number,
      carrier_name: suggestion.airline_name,
      destination_airport: suggestion.destination_airport,
      origin_airport: suggestion.origin_airport,
      scheduled_arrival_at: suggestion.scheduled_arrival_at,
      estimated_arrival_at: suggestion.estimated_arrival_at,
      terminal_code: suggestion.terminal_code,
      provider: suggestion.provider,
      selection_mode: "suggested",
      selected_at: new Date().toISOString(),
    }
    onChange(suggestion.flight_display)
    onSelect(selectionData)
    setSelected(true)
    setOpen(false)
    setSuggestions([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const isMCOPriority = (s: FlightSuggestion) =>
    s.destination_airport === airportBias || s.priority_score >= 90

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Input field */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            if (value.length >= 2 && !selected) fetchSuggestions(value.trim())
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: "100%",
            background: DARK_BG,
            border: `1px solid ${focused ? BORDER_FOCUS : BORDER_COLOR}`,
            borderRadius: 8,
            padding: "12px 40px 12px 14px",
            color: "#fff",
            fontSize: 16,
            outline: "none",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
          }}
        />
        {/* Right icon: loading spinner or plane icon */}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: loading ? GOLD : "rgba(255,255,255,0.3)",
            fontSize: 16,
            pointerEvents: "none",
          }}
        >
          {loading ? "⟳" : "✈"}
        </div>
      </div>

      {/* Selected badge */}
      {selected && (
        <div
          style={{
            marginTop: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(201,168,76,0.15)",
            border: `1px solid ${GOLD}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 13,
            color: GOLD,
          }}
        >
          ✓ Flight selected
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1a1a1a",
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            zIndex: 9999,
            overflow: "hidden",
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {/* No results message */}
          {noResults && (
            <div
              style={{
                padding: "14px 16px",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              No matching flights found.{" "}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                You may continue entering your flight manually.
              </span>
            </div>
          )}

          {/* Provider unavailable message */}
          {providerUnavailable && (
            <div
              style={{
                padding: "14px 16px",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              We couldn&apos;t fully verify that flight yet.{" "}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                You may continue with your reservation and update it later if needed.
              </span>
            </div>
          )}

          {/* Suggestion items */}
          {suggestions.map((s, i) => {
            const arrivalTime = formatArrivalTime(s.estimated_arrival_at ?? s.scheduled_arrival_at)
            const statusBadge = getStatusBadge(s.status)
            const isMCO = isMCOPriority(s)

            return (
              <button
                key={`${s.flight_display}-${i}`}
                type="button"
                onClick={() => handleSelect(s)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    i < suggestions.length - 1
                      ? `1px solid rgba(255,255,255,0.06)`
                      : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.05)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
                }}
              >
                {/* Airline icon placeholder */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: GOLD,
                    flexShrink: 0,
                    letterSpacing: 0,
                  }}
                >
                  {s.airline_code}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Flight code */}
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 15,
                        fontFamily: "monospace",
                        letterSpacing: 1,
                      }}
                    >
                      {s.flight_display}
                    </span>

                    {/* MCO priority badge */}
                    {isMCO && (
                      <span
                        style={{
                          background: "rgba(201,168,76,0.2)",
                          border: `1px solid ${GOLD}`,
                          borderRadius: 4,
                          padding: "1px 6px",
                          fontSize: 10,
                          color: GOLD,
                          fontWeight: 600,
                          letterSpacing: 0.5,
                        }}
                      >
                        MCO
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontSize: 10,
                        color: statusBadge.color,
                        fontWeight: 500,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Airline name */}
                  <div
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    {s.airline_name}
                  </div>

                  {/* Route + arrival */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.origin_airport || "—"} → {s.destination_airport || "—"}
                    </span>
                    {arrivalTime && (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                        }}
                      >
                        Arrives {arrivalTime}
                      </span>
                    )}
                    {s.terminal_code && (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 11,
                        }}
                      >
                        Terminal {s.terminal_code}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
