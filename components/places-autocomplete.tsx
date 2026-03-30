"use client"

import { useEffect, useRef, useState, useCallback } from "react"

const GOLD = "#C9A84C"

export interface PlaceResult {
  formattedAddress: string
  lat: number
  lng: number
  placeId: string
}

interface Prediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface PlacesAutocompleteProps {
  id: string
  value: string
  placeholder?: string
  label?: string
  disabled?: boolean
  onSelect: (result: PlaceResult) => void
  onChange?: (value: string) => void
  mapsLoaded: boolean
  zoneWarning?: string | null
  zoneMatch?: boolean
}

const labelStyle: React.CSSProperties = {
  fontSize: 16,
  color: "rgba(255,255,255,0.7)",
  marginBottom: 6,
  display: "block",
}

export function PlacesAutocomplete({
  id,
  value,
  placeholder,
  label,
  disabled,
  onSelect,
  onChange,
  mapsLoaded,
  zoneWarning,
  zoneMatch,
}: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [focused, setFocused] = useState(false)

  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Initialize AutocompleteService and Geocoder once Maps API is ready
  useEffect(() => {
    if (!mapsLoaded) return
    if (serviceRef.current) return

    try {
      serviceRef.current = new window.google.maps.places.AutocompleteService()
      geocoderRef.current = new window.google.maps.Geocoder()
    } catch (err) {
      console.error("[PlacesAutocomplete] Failed to initialize service:", err)
    }
  }, [mapsLoaded])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchPredictions = useCallback((query: string) => {
    if (!serviceRef.current || query.length < 2) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    serviceRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "us" },
        types: ["establishment", "geocode"],
      },
      (results, status) => {
        setLoading(false)
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          const preds: Prediction[] = results.map((r) => ({
            placeId: r.place_id,
            description: r.description,
            mainText: r.structured_formatting.main_text,
            secondaryText: r.structured_formatting.secondary_text || "",
          }))
          setPredictions(preds)
          setShowDropdown(true)
          setActiveIndex(-1)
        } else {
          setPredictions([])
          setShowDropdown(false)
        }
      }
    )
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setInputValue(val)
      onChange?.(val)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchPredictions(val)
      }, 250)
    },
    [onChange, fetchPredictions]
  )

  const handleSelect = useCallback(
    async (prediction: Prediction) => {
      setInputValue(prediction.description)
      setShowDropdown(false)
      setPredictions([])
      setActiveIndex(-1)
      onChange?.(prediction.description)

      if (!geocoderRef.current) return

      try {
        geocoderRef.current.geocode(
          { placeId: prediction.placeId },
          (results, status) => {
            if (
              status === window.google.maps.GeocoderStatus.OK &&
              results?.[0]
            ) {
              const loc = results[0].geometry.location
              onSelectRef.current({
                formattedAddress: results[0].formatted_address,
                lat: loc.lat(),
                lng: loc.lng(),
                placeId: prediction.placeId,
              })
            }
          }
        )
      } catch (err) {
        console.error("[PlacesAutocomplete] Geocode error:", err)
      }
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || predictions.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, predictions.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault()
        handleSelect(predictions[activeIndex])
      } else if (e.key === "Escape") {
        setShowDropdown(false)
        setActiveIndex(-1)
      }
    },
    [showDropdown, predictions, activeIndex, handleSelect]
  )

  const borderColor = focused
    ? zoneWarning
      ? "rgba(239,68,68,0.8)"
      : `${GOLD}80`
    : zoneWarning
    ? "rgba(239,68,68,0.6)"
    : zoneMatch
    ? `${GOLD}80`
    : "rgba(255,255,255,0.15)"

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
        </label>
      )}

      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            if (inputValue.length >= 2 && predictions.length > 0) {
              setShowDropdown(true)
            }
          }}
          onBlur={() => setFocused(false)}
          placeholder={
            mapsLoaded
              ? placeholder ?? "Enter address..."
              : "Loading address search..."
          }
          disabled={disabled || !mapsLoaded}
          autoComplete="off"
          className="w-full bg-white/5 border rounded-lg px-4 text-white placeholder-white/30 focus:outline-none transition"
          style={{
            fontSize: 18,
            height: 54,
            borderColor,
            outline: "none",
            opacity: disabled ? 0.5 : 1,
            paddingRight: loading || zoneMatch ? 40 : 16,
          }}
        />

        {/* Loading spinner */}
        {loading && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin"
            style={{
              borderColor: `${GOLD}40`,
              borderTopColor: GOLD,
            }}
          />
        )}

        {/* Zone match checkmark */}
        {!loading && zoneMatch && mapsLoaded && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
            style={{ color: GOLD }}
          >
            ✓
          </div>
        )}

        {/* Maps not loaded spinner */}
        {!mapsLoaded && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin"
            style={{
              borderColor: `${GOLD}40`,
              borderTopColor: GOLD,
            }}
          />
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 99999,
            backgroundColor: "#111",
            border: `1px solid rgba(201,168,76,0.35)`,
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            marginTop: 4,
            overflow: "hidden",
          }}
        >
          {predictions.map((pred, index) => (
            <div
              key={pred.placeId}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(pred)
              }}
              onMouseEnter={() => setActiveIndex(index)}
              style={{
                padding: "11px 14px",
                cursor: "pointer",
                backgroundColor:
                  activeIndex === index
                    ? "rgba(201,168,76,0.14)"
                    : "transparent",
                borderTop:
                  index > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                transition: "background-color 0.15s",
              }}
            >
              <div
                style={{
                  color: GOLD,
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {pred.mainText}
              </div>
              {pred.secondaryText && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {pred.secondaryText}
                </div>
              )}
            </div>
          ))}
          {/* Google attribution */}
          <div
            style={{
              padding: "6px 14px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
              powered by Google
            </span>
          </div>
        </div>
      )}

      {/* Zone mismatch warning */}
      {zoneWarning && (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-sm leading-snug"
          style={{
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
          }}
        >
          {zoneWarning}
        </div>
      )}
    </div>
  )
}
