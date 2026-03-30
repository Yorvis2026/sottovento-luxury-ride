"use client"

import type React from "react"
import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useAttribution, buildAttributionMetadata } from "@/hooks/useAttribution"
import { ZONES, PACKAGE_TO_ZONE, type ZoneId } from "@/lib/zones"
import {
  getGuaranteedPrice,
  getPriceResolutionWithAddons,
  WAIT_ADDONS,
  EXTRA_STOP_ADDONS,
  EXTRA_STOP_LABELS,
  UPGRADE_ADDON,
  HOURLY_PACKAGES,
  HOURLY_RATE,
  type VehicleType,
  type ServiceType,
  type WaitTime,
  type ExtraStop,
} from "@/lib/pricing"
import { PlacesAutocomplete, type PlaceResult } from "@/components/places-autocomplete"
import { RouteInfoDisplay } from "@/components/route-info-display"
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader"
import { useZoneValidation } from "@/hooks/useZoneValidation"
import { useRouteCalculator } from "@/hooks/useRouteCalculator"

// ─── Types ────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5

// ─── Quick Routes ─────────────────────────────────────────────
const QUICK_ROUTES: { label: string; icon: string; zone: ZoneId }[] = [
  { label: "MCO Airport",        icon: "✈",  zone: "MCO" },
  { label: "Universal / I-Drive",icon: "🎡", zone: "UNIVERSAL_IDRIVE" },
  { label: "Disney",             icon: "🏰", zone: "DISNEY" },
  { label: "Port Canaveral",     icon: "🚢", zone: "PORT_CANAVERAL" },
  { label: "Downtown / Dr. Phillips", icon: "🏙", zone: "DOWNTOWN" },
]

// ─── Vehicle data ─────────────────────────────────────────────
const VEHICLES: { type: VehicleType; label: string; cap: string; note: string }[] = [
  { type: "Sedan", label: "Mercedes S-Class",     cap: "Up to 3 passengers", note: "Executive Sedan" },
  { type: "SUV",   label: "Cadillac Escalade ESV", cap: "Up to 6 passengers", note: "Luxury SUV" },
]

// ─── Accent color ─────────────────────────────────────────────
const GOLD = "#C9A84C"

// ─── Step indicator ───────────────────────────────────────────
const STEP_LABELS = ["Route", "Vehicle", "Date & Time", "Your Info", "Confirm"]

function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all"
              style={{
                backgroundColor: done ? GOLD : active ? GOLD : "transparent",
                border: `2px solid ${done || active ? GOLD : "rgba(255,255,255,0.2)"}`,
                color: done || active ? "#000" : "rgba(255,255,255,0.4)",
              }}
            >
              {done ? "✓" : n}
            </div>
            <span
              className="text-xs tracking-wide hidden sm:block"
              style={{ color: active ? GOLD : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────
const inputClass =
  "w-full bg-white/5 border border-white/15 rounded-lg px-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-600/60 transition"
const inputStyle = { fontSize: 18, height: 54 }
const labelStyle = { fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" as const }

// ─── Coordinates type ─────────────────────────────────────────
interface Coordinates {
  lat: number
  lng: number
}

// ─── Main component ───────────────────────────────────────────
function BookingInner() {
  const searchParams = useSearchParams()

  // SLN Attribution
  const attribution = useAttribution()

  // Google Maps loader
  const { loaded: mapsLoaded } = useGoogleMapsLoader()

  // Zone validation
  const { validateZone } = useZoneValidation()

  // Route calculator
  const routeCalc = useRouteCalculator()

  const [step, setStep] = useState<Step>(1)
  const [submitted, setSubmitted] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [step1Error, setStep1Error] = useState("")
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)

  // Zone adjustment notifications
  const [pickupZoneWarning, setPickupZoneWarning] = useState<string | null>(null)
  const [dropoffZoneWarning, setDropoffZoneWarning] = useState<string | null>(null)
  const [pickupZoneMatch, setPickupZoneMatch] = useState(false)
  const [dropoffZoneMatch, setDropoffZoneMatch] = useState(false)

  // Geocoded coordinates (stored for Stripe metadata and route calculation)
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<Coordinates | null>(null)
  const [pickupPlaceId, setPickupPlaceId] = useState("")
  const [dropoffPlaceId, setDropoffPlaceId] = useState("")

  // Zone mismatch adjustment notification
  const [zoneAdjustedMsg, setZoneAdjustedMsg] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    pickupZone: "" as ZoneId | "",
    dropoffZone: "" as ZoneId | "",
    pickupLocation: "",
    dropoffLocation: "",
    date: "",
    time: "",
    returnDate: "",
    returnTime: "",
    returnPickupLocation: "",
    passengers: "1",
    serviceType: "oneway" as ServiceType | "hourly" | "event" | "corporate",
    tripType: "oneway" as "oneway" | "roundtrip",
    waitTime: "none" as WaitTime,
    extraStop: "none" as ExtraStop,
    vehicleType: "SUV" as VehicleType,
    upgradeVehicle: false,
    luggage: "1-2 bags",
    flightNumber: "",
    notes: "",
    hoursRequested: "",
    eventDestination: "",
    returnLocation: "",
  })

  // ── URL params ────────────────────────────────────────────────
  useEffect(() => {
    const pkg = searchParams.get("package")
    const service = searchParams.get("service")
    const updates: Partial<typeof formData> = {}
    if (pkg) {
      const zoneId = PACKAGE_TO_ZONE[pkg.toLowerCase()]
      if (zoneId) updates.pickupZone = zoneId
    }
    if (service === "hourly") updates.serviceType = "hourly"
    if (Object.keys(updates).length > 0) setFormData((prev) => ({ ...prev, ...updates }))
  }, [searchParams])

  // ── Trigger route calculation when both coords are set ────────
  useEffect(() => {
    if (pickupCoords && dropoffCoords && mapsLoaded) {
      routeCalc.calculate(pickupCoords, dropoffCoords)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoords, dropoffCoords, mapsLoaded])

  // ── Pickup address selected ───────────────────────────────────
  const handlePickupSelect = useCallback(
    (result: PlaceResult) => {
      const coords: Coordinates = { lat: result.lat, lng: result.lng }
      setPickupCoords(coords)
      setPickupPlaceId(result.placeId)

      const validation = validateZone(formData.pickupZone, result.lat, result.lng, "pickup")

      if (!validation.isMatch && validation.detectedZone) {
        // Auto-correct the zone
        setFormData((prev) => ({
          ...prev,
          pickupLocation: result.formattedAddress,
          pickupZone: validation.detectedZone!,
        }))
        setPickupZoneWarning(validation.warningMessage)
        setZoneAdjustedMsg("Pickup zone updated automatically. Price adjusted.")
        setTimeout(() => setZoneAdjustedMsg(null), 5000)
      } else {
        setFormData((prev) => ({
          ...prev,
          pickupLocation: result.formattedAddress,
        }))
        setPickupZoneWarning(null)
      }

      setPickupZoneMatch(validation.isMatch && !!validation.detectedZone)
    },
    [formData.pickupZone, validateZone]
  )

  // ── Dropoff address selected ──────────────────────────────────
  const handleDropoffSelect = useCallback(
    (result: PlaceResult) => {
      const coords: Coordinates = { lat: result.lat, lng: result.lng }
      setDropoffCoords(coords)
      setDropoffPlaceId(result.placeId)

      const validation = validateZone(formData.dropoffZone, result.lat, result.lng, "dropoff")

      if (!validation.isMatch && validation.detectedZone) {
        // Auto-correct the zone
        setFormData((prev) => ({
          ...prev,
          dropoffLocation: result.formattedAddress,
          dropoffZone: validation.detectedZone!,
        }))
        setDropoffZoneWarning(validation.warningMessage)
        setZoneAdjustedMsg("Destination updated. Trip price adjusted accordingly.")
        setTimeout(() => setZoneAdjustedMsg(null), 5000)
      } else {
        setFormData((prev) => ({
          ...prev,
          dropoffLocation: result.formattedAddress,
        }))
        setDropoffZoneWarning(null)
      }

      setDropoffZoneMatch(validation.isMatch && !!validation.detectedZone)
    },
    [formData.dropoffZone, validateZone]
  )

  // ── Clear coords and route when zone changes manually ─────────
  const handlePickupZoneChange = (zone: ZoneId) => {
    setFormData((prev) => ({ ...prev, pickupZone: zone }))
    setPickupZoneWarning(null)
    setPickupZoneMatch(false)
    // Re-validate if we already have coords
    if (pickupCoords) {
      const validation = validateZone(zone, pickupCoords.lat, pickupCoords.lng, "pickup")
      if (!validation.isMatch && validation.detectedZone) {
        setPickupZoneWarning(validation.warningMessage)
      }
      setPickupZoneMatch(validation.isMatch && !!validation.detectedZone)
    }
  }

  const handleDropoffZoneChange = (zone: ZoneId) => {
    setFormData((prev) => ({ ...prev, dropoffZone: zone }))
    setDropoffZoneWarning(null)
    setDropoffZoneMatch(false)
    if (dropoffCoords) {
      const validation = validateZone(zone, dropoffCoords.lat, dropoffCoords.lng, "dropoff")
      if (!validation.isMatch && validation.detectedZone) {
        setDropoffZoneWarning(validation.warningMessage)
      }
      setDropoffZoneMatch(validation.isMatch && !!validation.detectedZone)
    }
  }

  // ── Derived values ────────────────────────────────────────────
  const isHourly = formData.serviceType === "hourly"
  const isRoundTrip = formData.tripType === "roundtrip" && !isHourly
  const isLongDistance =
    ["KENNEDY","TAMPA","CLEARWATER","MIAMI"].includes(formData.dropoffZone as string) ||
    ["KENNEDY","TAMPA","CLEARWATER","MIAMI"].includes(formData.pickupZone as string)
  const showUpgrade = formData.vehicleType === "Sedan" && !isHourly

  const hourlyPrice = (() => {
    if (!isHourly) return null
    const pkg = HOURLY_PACKAGES.find((p) => p.hours === Number(formData.hoursRequested))
    if (pkg) return pkg.price
    const hrs = Number(formData.hoursRequested)
    if (hrs >= 3) return hrs * HOURLY_RATE
    return null
  })()

  const priceResolution = !isHourly && formData.pickupZone && formData.dropoffZone && formData.vehicleType
    ? getPriceResolutionWithAddons({
        pickupZone: formData.pickupZone as ZoneId,
        dropoffZone: formData.dropoffZone as ZoneId,
        vehicle: formData.vehicleType as VehicleType,
        serviceType: formData.tripType as ServiceType,
        waitTime: formData.waitTime,
        extraStop: formData.extraStop,
        upgrade: formData.upgradeVehicle,
      })
    : null

  const transferPrice = priceResolution?.finalPrice ?? null
  const isOutOfArea = priceResolution?.resolution?.type === "out_of_area"
  const priceResolutionType = priceResolution?.resolution?.type ?? null

  const price = isHourly ? hourlyPrice : transferPrice
  const canPay = !isHourly && price !== null && !isOutOfArea
  const effectiveVehicle = formData.upgradeVehicle && formData.vehicleType === "Sedan" ? "SUV" : formData.vehicleType

  const priceBreakdown = (() => {
    if (isHourly || !transferPrice) return null
    const lines: string[] = []
    if (formData.waitTime !== "none") lines.push(`Waiting time: +$${WAIT_ADDONS[formData.waitTime]}`)
    if (formData.extraStop !== "none") lines.push(`Extra stop: +$${EXTRA_STOP_ADDONS[formData.extraStop]}`)
    if (formData.upgradeVehicle && formData.vehicleType === "Sedan") lines.push(`Vehicle upgrade: +$${UPGRADE_ADDON}`)
    return lines
  })()

  // ── Request text for send buttons ─────────────────────────────
  const coordsText = pickupCoords && dropoffCoords
    ? `\nPickup Coords: ${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}\nDropoff Coords: ${dropoffCoords.lat.toFixed(6)},${dropoffCoords.lng.toFixed(6)}`
    : ""

  const routeText = routeCalc.route
    ? `\nRoute Distance: ${routeCalc.route.distanceMiles} mi (${routeCalc.route.durationText})`
    : ""

  const requestText = isHourly
    ? `SOTTOVENTO BOOKING REQUEST — HOURLY CHAUFFEUR\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nVehicle: ${effectiveVehicle}\nPassengers: ${formData.passengers}\nLuggage: ${formData.luggage}\nDate/Time: ${formData.date} ${formData.time}\nPickup Location: ${formData.pickupLocation}\nEvent / Destination: ${formData.eventDestination}\nHours Requested: ${formData.hoursRequested}\nReturn Location: ${formData.returnLocation || "N/A"}\nEstimated Price: ${price ? `$${price}` : "To be confirmed"}\nFlight #: ${formData.flightNumber || "N/A"}\nNotes: ${formData.notes || "N/A"}${coordsText}`
    : `SOTTOVENTO BOOKING REQUEST — ${formData.tripType === "roundtrip" ? "ROUND TRIP" : "ONE WAY"}\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nPickup Zone: ${formData.pickupZone}\nDrop-off Zone: ${formData.dropoffZone}\nVehicle: ${effectiveVehicle}${formData.upgradeVehicle && formData.vehicleType === "Sedan" ? " (Upgraded from Sedan)" : ""}\nPassengers: ${formData.passengers}\nLuggage: ${formData.luggage}\nDate/Time: ${formData.date} ${formData.time}\nPickup: ${formData.pickupLocation}\nDrop-off: ${formData.dropoffLocation}${isRoundTrip ? `\nReturn Date/Time: ${formData.returnDate} ${formData.returnTime}\nReturn Pickup: ${formData.returnPickupLocation || "Same as drop-off"}` : ""}${formData.waitTime !== "none" ? `\nWaiting Time: ${formData.waitTime} (+$${WAIT_ADDONS[formData.waitTime]})` : ""}${formData.extraStop !== "none" ? `\nExtra Stop: ${EXTRA_STOP_LABELS[formData.extraStop]}` : ""}\nFlight #: ${formData.flightNumber || "N/A"}\nNotes: ${formData.notes || "N/A"}\nGuaranteed Price: $${price ?? "N/A"}${coordsText}${routeText}`

  const encoded = encodeURIComponent(requestText)

  // ── Auto-return countdown (tablet mode) ───────────────────────
  const startCountdown = useCallback(() => {
    const fromTablet = searchParams.get("tablet") || searchParams.get("ref")
    if (!fromTablet) return
    setCountdown(30)
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(countdownRef.current!)
          window.location.href = "/tablet"
          return null
        }
        return c - 1
      })
    }, 1000)
  }, [searchParams])

  useEffect(() => {
    if (submitted) startCountdown()
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [submitted, startCountdown])

  // ── Payment ───────────────────────────────────────────────────
  const handlePayment = async () => {
    setPayError("")
    if (isHourly) {
      setPayError("For hourly service, please send your request via Email, SMS or WhatsApp below.")
      return
    }
    if (!formData.pickupZone || !formData.dropoffZone) {
      setPayError("Please select a pickup zone and drop-off zone.")
      return
    }
    if (!formData.pickupLocation?.trim()) {
      setPayError("Pickup address is required before proceeding to payment.")
      return
    }
    if (!formData.dropoffLocation?.trim()) {
      setPayError("Drop-off address is required before proceeding to payment.")
      return
    }
    if (!formData.date || !formData.time) {
      setPayError("Pickup date and time are required.")
      return
    }
    if (!formData.name || !formData.phone || !formData.email) {
      setPayError("Please complete your contact information.")
      return
    }
    setPaying(true)
    try {
      // Build Stripe metadata with full coordinate, zone, and attribution data
      const attrMeta = buildAttributionMetadata(attribution)
      const metadata: Record<string, string> = {
        pickup_address: formData.pickupLocation,
        dropoff_address: formData.dropoffLocation,
        pickup_zone_selected: formData.pickupZone,
        dropoff_zone_selected: formData.dropoffZone,
        vehicle: effectiveVehicle,
        passengers: formData.passengers,
        luggage: formData.luggage,
        date: formData.date,
        time: formData.time,
        flight_number: formData.flightNumber || "",
        notes: formData.notes || "",
        trip_type: formData.tripType,
        // SLN Attribution (Step 10 — full rollout)
        ...attrMeta,
        // Legacy fallback params (backward compat)
        ref: attribution.ref || searchParams.get("ref") || "",
        driver: attribution.driver || searchParams.get("driver") || "",
        tablet: attribution.tablet || searchParams.get("tablet") || "",
        package: attribution.package || searchParams.get("package") || "",
        service: attribution.service || searchParams.get("service") || "",
      }

      // Add coordinates if available
      if (pickupCoords) {
        metadata.pickup_lat = pickupCoords.lat.toFixed(6)
        metadata.pickup_lng = pickupCoords.lng.toFixed(6)
      }
      if (dropoffCoords) {
        metadata.dropoff_lat = dropoffCoords.lat.toFixed(6)
        metadata.dropoff_lng = dropoffCoords.lng.toFixed(6)
      }
      if (routeCalc.route) {
        metadata.route_distance_miles = String(routeCalc.route.distanceMiles)
        metadata.route_duration_text = routeCalc.route.durationText
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: price,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          metadata,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPayError(data.error || "Payment failed. Please try again.")
        setPaying(false)
      }
    } catch {
      setPayError("Payment failed. Please try again or use Email/WhatsApp.")
      setPaying(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <section className="min-h-dvh flex items-center justify-center bg-black px-4 py-16">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="text-6xl" style={{ color: GOLD }}>✔</div>
          <h2 className="text-white font-light" style={{ fontSize: 32, fontFamily: "serif" }}>
            Request Sent
          </h2>
          <p className="text-white/50" style={{ fontSize: 18 }}>
            Your driver will contact you shortly to confirm the details.
          </p>
          {countdown !== null && (
            <p className="text-white/30 text-sm">
              Returning to carousel in {countdown} seconds...
            </p>
          )}
          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={() => {
                setSubmitted(false)
                setStep(1)
                setPickupCoords(null)
                setDropoffCoords(null)
                setPickupPlaceId("")
                setDropoffPlaceId("")
                setPickupZoneWarning(null)
                setDropoffZoneWarning(null)
                setPickupZoneMatch(false)
                setDropoffZoneMatch(false)
                routeCalc.reset()
                setFormData((prev) => ({
                  ...prev,
                  name: "",
                  phone: "",
                  email: "",
                  pickupLocation: "",
                  dropoffLocation: "",
                  date: "",
                  time: "",
                  notes: "",
                }))
              }}
              className="w-full py-4 rounded-lg border text-white font-medium tracking-widest uppercase text-sm transition hover:border-yellow-600/60"
              style={{ borderColor: "rgba(255,255,255,0.15)", fontSize: 16 }}
            >
              New Quote
            </button>
            <a
              href="/tablet"
              className="w-full py-4 rounded-lg text-center font-medium tracking-widest uppercase text-sm transition"
              style={{ backgroundColor: GOLD, color: "#000", fontSize: 16, display: "block" }}
            >
              Back to Carousel
            </a>
          </div>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // BOOKING FLOW
  // ─────────────────────────────────────────────────────────────
  return (
    <section
      id="booking"
      className="py-16 md:py-24 bg-black"
      style={{ minHeight: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <h2
              className="font-light tracking-wider text-white"
              style={{ fontSize: "clamp(26px, 5vw, 32px)", fontFamily: "serif" }}
            >
              Reserve Your Luxury Ride
            </h2>
            <p className="text-white/40 mt-2" style={{ fontSize: 16 }}>
              Guaranteed price. No surprises.
            </p>
          </div>

          {/* Step bar */}
          <StepBar current={step} />

          {/* Zone auto-adjustment notification */}
          {zoneAdjustedMsg && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{
                backgroundColor: `${GOLD}12`,
                border: `1px solid ${GOLD}40`,
                color: GOLD,
              }}
            >
              <span>✓</span>
              <span>{zoneAdjustedMsg}</span>
            </div>
          )}

          {/* ── STEP 1: ROUTE ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-white font-light" style={{ fontSize: 24, fontFamily: "serif" }}>
                Where are you going?
              </h3>

              {/* Service type */}
              <div>
                <label style={labelStyle}>Type of Service</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "oneway", label: "One Way" },
                    { value: "roundtrip", label: "Round Trip" },
                    { value: "hourly", label: "Hourly Chauffeur" },
                    { value: "corporate", label: "Corporate" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, serviceType: opt.value as typeof formData.serviceType, tripType: opt.value === "roundtrip" ? "roundtrip" : "oneway" })}
                      className="py-4 rounded-lg border font-medium transition text-center"
                      style={{
                        fontSize: 16,
                        borderColor: formData.serviceType === opt.value ? GOLD : "rgba(255,255,255,0.15)",
                        color: formData.serviceType === opt.value ? GOLD : "rgba(255,255,255,0.6)",
                        backgroundColor: formData.serviceType === opt.value ? `${GOLD}15` : "transparent",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Routes */}
              {!isHourly && (
                <div>
                  <label style={labelStyle}>Quick Select — Pickup Zone</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {QUICK_ROUTES.map((r) => (
                      <button
                        key={r.zone}
                        type="button"
                        onClick={() => handlePickupZoneChange(r.zone)}
                        className="py-4 px-3 rounded-lg border flex flex-col items-center gap-1 transition"
                        style={{
                          borderColor: formData.pickupZone === r.zone ? GOLD : "rgba(255,255,255,0.12)",
                          backgroundColor: formData.pickupZone === r.zone ? `${GOLD}15` : "rgba(255,255,255,0.03)",
                          color: formData.pickupZone === r.zone ? GOLD : "rgba(255,255,255,0.6)",
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{r.icon}</span>
                        <span style={{ fontSize: 13 }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone selects + address autocomplete */}
              {!isHourly && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Pickup Zone *</label>
                    <select
                      value={formData.pickupZone}
                      onChange={(e) => handlePickupZoneChange(e.target.value as ZoneId)}
                      className={inputClass}
                      style={{ ...inputStyle, paddingTop: 0, paddingBottom: 0 }}
                    >
                      <option value="">Select zone...</option>
                      {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Drop-off Zone *</label>
                    <select
                      value={formData.dropoffZone}
                      onChange={(e) => handleDropoffZoneChange(e.target.value as ZoneId)}
                      className={inputClass}
                      style={{ ...inputStyle, paddingTop: 0, paddingBottom: 0 }}
                    >
                      <option value="">Select zone...</option>
                      {ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                    </select>
                  </div>

                  {/* Pickup address with Google Places Autocomplete */}
                  <div className="sm:col-span-2">
                    <PlacesAutocomplete
                      id="pickup-address"
                      label="Pickup Address *"
                      value={formData.pickupLocation}
                      placeholder="Hotel, terminal, address..."
                      mapsLoaded={mapsLoaded}
                      onSelect={handlePickupSelect}
                      onChange={(val) => setFormData((prev) => ({ ...prev, pickupLocation: val }))}
                      zoneWarning={pickupZoneWarning}
                      zoneMatch={pickupZoneMatch}
                    />
                  </div>

                  {/* Dropoff address with Google Places Autocomplete */}
                  <div className="sm:col-span-2">
                    <PlacesAutocomplete
                      id="dropoff-address"
                      label="Drop-off Address *"
                      value={formData.dropoffLocation}
                      placeholder="Hotel, terminal, address..."
                      mapsLoaded={mapsLoaded}
                      onSelect={handleDropoffSelect}
                      onChange={(val) => setFormData((prev) => ({ ...prev, dropoffLocation: val }))}
                      zoneWarning={dropoffZoneWarning}
                      zoneMatch={dropoffZoneMatch}
                    />
                  </div>
                </div>
              )}

              {/* Route info display (distance + duration) */}
              {!isHourly && (
                <RouteInfoDisplay
                  status={routeCalc.status}
                  route={routeCalc.route}
                  error={routeCalc.error}
                />
              )}

              {/* Hourly fields */}
              {isHourly && (
                <div className="space-y-4">
                  <PlacesAutocomplete
                    id="hourly-pickup"
                    label="Pickup Location *"
                    value={formData.pickupLocation}
                    placeholder="Hotel name, address..."
                    mapsLoaded={mapsLoaded}
                    onSelect={(result) => {
                      setFormData((prev) => ({ ...prev, pickupLocation: result.formattedAddress }))
                      setPickupCoords({ lat: result.lat, lng: result.lng })
                    }}
                    onChange={(val) => setFormData((prev) => ({ ...prev, pickupLocation: val }))}
                  />
                  <div>
                    <label style={labelStyle}>Event / Main Destination *</label>
                    <input
                      type="text"
                      value={formData.eventDestination}
                      onChange={(e) => setFormData({ ...formData, eventDestination: e.target.value })}
                      placeholder="Event venue, destination..."
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Number of Hours * (min. 3)</label>
                    <input
                      type="number"
                      min="3"
                      value={formData.hoursRequested}
                      onChange={(e) => setFormData({ ...formData, hoursRequested: e.target.value })}
                      placeholder="3"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {!isHourly && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isLongDistance && (
                    <div>
                      <label style={labelStyle}>Waiting Package</label>
                      <select value={formData.waitTime} onChange={(e) => setFormData({ ...formData, waitTime: e.target.value as WaitTime })} className={inputClass} style={{ ...inputStyle, paddingTop: 0, paddingBottom: 0 }}>
                        <option value="none">No Wait</option>
                        <option value="2h">2 Hours (+$80)</option>
                        <option value="4h">4 Hours (+$150)</option>
                        <option value="fullday">Full Day (+$350)</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Extra Stop</label>
                    <select value={formData.extraStop} onChange={(e) => setFormData({ ...formData, extraStop: e.target.value as ExtraStop })} className={inputClass} style={{ ...inputStyle, paddingTop: 0, paddingBottom: 0 }}>
                      <option value="none">No extra stop</option>
                      <option value="quick">Quick (10 min) +$15</option>
                      <option value="short">Short (20 min) +$25</option>
                      <option value="extended">Extended (40 min) +$40</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 1 validation error */}
              {step1Error && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#7c2d1220", color: "#fca5a5", border: "1px solid #dc262640" }}>
                  {step1Error}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isHourly) {
                    if (!formData.pickupZone || !formData.dropoffZone) {
                      setStep1Error("Please select a pickup zone and drop-off zone.")
                      return
                    }
                    if (!formData.pickupLocation?.trim()) {
                      setStep1Error("Please enter a pickup address.")
                      return
                    }
                    if (!formData.dropoffLocation?.trim()) {
                      setStep1Error("Please enter a drop-off address.")
                      return
                    }
                  } else {
                    if (!formData.pickupLocation?.trim()) {
                      setStep1Error("Please enter a pickup location.")
                      return
                    }
                  }
                  setStep1Error("")
                  setStep(2)
                }}
                className="w-full py-4 rounded-lg font-medium tracking-widest uppercase transition"
                style={{ backgroundColor: GOLD, color: "#000", fontSize: 18 }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: VEHICLE ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-white font-light" style={{ fontSize: 24, fontFamily: "serif" }}>
                Choose your vehicle
              </h3>
              <div className="space-y-4">
                {VEHICLES.map((v) => {
                  const vPriceRes = !isHourly && formData.pickupZone && formData.dropoffZone
                    ? getPriceResolutionWithAddons({ pickupZone: formData.pickupZone as ZoneId, dropoffZone: formData.dropoffZone as ZoneId, vehicle: v.type, serviceType: formData.tripType as ServiceType, waitTime: formData.waitTime, extraStop: formData.extraStop, upgrade: false })
                    : null
                  const vPrice = vPriceRes?.finalPrice ?? null
                  const selected = formData.vehicleType === v.type
                  return (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => setFormData({ ...formData, vehicleType: v.type, upgradeVehicle: false })}
                      className="w-full rounded-xl border p-5 text-left transition"
                      style={{
                        borderColor: selected ? GOLD : "rgba(255,255,255,0.12)",
                        backgroundColor: selected ? `${GOLD}12` : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium" style={{ fontSize: 20 }}>{v.label}</p>
                          <p style={{ color: GOLD, fontSize: 14 }}>{v.note}</p>
                          <p className="text-white/50 mt-1" style={{ fontSize: 15 }}>👥 {v.cap}</p>
                        </div>
                        <div className="text-right">
                          {vPrice !== null ? (
                            <p className="text-white font-light" style={{ fontSize: 26 }}>${vPrice}</p>
                          ) : (formData.pickupZone && formData.dropoffZone && !isHourly) ? (
                            <p style={{ color: GOLD, fontSize: 14 }}>Request Quote</p>
                          ) : null}
                          {selected && (
                            <div className="mt-2 w-6 h-6 rounded-full flex items-center justify-center ml-auto" style={{ backgroundColor: GOLD }}>
                              <span style={{ color: "#000", fontSize: 14 }}>✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}

                {/* Upgrade option */}
                {showUpgrade && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, upgradeVehicle: !formData.upgradeVehicle })}
                    className="w-full rounded-xl border p-4 text-left transition"
                    style={{
                      borderColor: formData.upgradeVehicle ? GOLD : "rgba(255,255,255,0.12)",
                      backgroundColor: formData.upgradeVehicle ? `${GOLD}12` : "transparent",
                      color: formData.upgradeVehicle ? GOLD : "rgba(255,255,255,0.5)",
                      fontSize: 16,
                    }}
                  >
                    {formData.upgradeVehicle ? "✓ Upgraded to Luxury SUV (+$35)" : "⬆ Upgrade to Luxury SUV (+$35)"}
                  </button>
                )}

                {/* Passengers & Luggage */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Passengers</label>
                    <select value={formData.passengers} onChange={(e) => setFormData({ ...formData, passengers: e.target.value })} className={inputClass} style={{ ...inputStyle, paddingTop: 0, paddingBottom: 0 }}>
                      {["1","2","3","4","5","6"].map((n) => <option key={n} value={n}>{n} {n === "6" ? "+" : ""} passenger{n !== "1" ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Luggage</label>
                    <select value={formData.luggage} onChange={(e) => setFormData({ ...formData, luggage: e.target.value })} className={inputClass} style={{ ...inputStyle, paddingTop: 0, paddingBottom: 0 }}>
                      <option value="No luggage">No luggage</option>
                      <option value="1-2 bags">1–2 bags</option>
                      <option value="3-4 bags">3–4 bags</option>
                      <option value="5+ bags">5+ bags</option>
                      <option value="Oversized / stroller / wheelchair">Oversized / stroller</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 rounded-lg border text-white/60 font-medium transition hover:border-white/30" style={{ borderColor: "rgba(255,255,255,0.15)", fontSize: 16 }}>← Back</button>
                <button type="button" onClick={() => setStep(3)} className="flex-[2] py-4 rounded-lg font-medium tracking-widest uppercase transition" style={{ backgroundColor: GOLD, color: "#000", fontSize: 18 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: DATE & TIME ───────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-white font-light" style={{ fontSize: 24, fontFamily: "serif" }}>
                When is your ride?
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>📅 Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>🕐 Pickup Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* 120-min advance notice warning */}
              {formData.date && formData.time && (() => {
                const pickupDT = new Date(`${formData.date}T${formData.time}:00`)
                const minDT = new Date(Date.now() + 120 * 60 * 1000)
                return pickupDT < minDT ? (
                  <div className="rounded-lg p-4" style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)" }}>
                    <p style={{ color: "#fca5a5", fontSize: 14, lineHeight: 1.5 }}>
                      ⚠️ <strong>Advance notice required.</strong> Sottovento bookings require at least 2 hours advance notice. Please select a later time or{" "}
                      <a href="#contact" style={{ color: "#fca5a5", textDecoration: "underline" }}>contact us directly</a> for urgent requests.
                    </p>
                  </div>
                ) : null
              })()}

              {/* Date/time summary */}
              {formData.date && formData.time && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40` }}>
                  <p style={{ color: GOLD, fontSize: 22, fontFamily: "serif" }}>
                    {new Date(formData.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    {" — "}
                    {(() => {
                      const [h, m] = formData.time.split(":")
                      const hour = parseInt(h)
                      const ampm = hour >= 12 ? "PM" : "AM"
                      return `${hour % 12 || 12}:${m} ${ampm}`
                    })()}
                  </p>
                </div>
              )}

              {/* Round trip return */}
              {isRoundTrip && (
                <div className="space-y-4">
                  <p className="text-white/50" style={{ fontSize: 15 }}>Return trip details:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Return Date *</label>
                      <input type="date" value={formData.returnDate} onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })} className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Return Pickup Time *</label>
                      <input type="time" value={formData.returnTime} onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })} className={inputClass} style={inputStyle} />
                    </div>
                    <div className="sm:col-span-2">
                      <label style={labelStyle}>Return Pickup Location</label>
                      <input type="text" value={formData.returnPickupLocation} onChange={(e) => setFormData({ ...formData, returnPickupLocation: e.target.value })} placeholder="Same as drop-off if blank" className={inputClass} style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}

              {/* Flight number */}
              <div>
                <label style={labelStyle}>✈ Flight Number (Optional)</label>
                <input
                  type="text"
                  value={formData.flightNumber}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                  placeholder="AA1234"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-4 rounded-lg border text-white/60 font-medium transition hover:border-white/30" style={{ borderColor: "rgba(255,255,255,0.15)", fontSize: 16 }}>← Back</button>
                <button type="button" onClick={() => setStep(4)} disabled={!formData.date || !formData.time} className="flex-[2] py-4 rounded-lg font-medium tracking-widest uppercase transition disabled:opacity-40" style={{ backgroundColor: GOLD, color: "#000", fontSize: 18 }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 4: PASSENGER INFO ────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-white font-light" style={{ fontSize: 24, fontFamily: "serif" }}>
                Your information
              </h3>

              <div className="space-y-4">
                <div>
                  <label style={labelStyle}>👤 Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>📱 Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>✉ Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>📝 Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Special requests, child seat, etc."
                    rows={3}
                    className={inputClass}
                    style={{ fontSize: 18, paddingTop: 14, paddingBottom: 14, resize: "none" as const }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-4 rounded-lg border text-white/60 font-medium transition hover:border-white/30" style={{ borderColor: "rgba(255,255,255,0.15)", fontSize: 16 }}>← Back</button>
                <button type="button" onClick={() => setStep(5)} disabled={!formData.name || !formData.phone || !formData.email} className="flex-[2] py-4 rounded-lg font-medium tracking-widest uppercase transition disabled:opacity-40" style={{ backgroundColor: GOLD, color: "#000", fontSize: 18 }}>Review →</button>
              </div>
            </div>
          )}

          {/* ── STEP 5: CONFIRM ───────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-white font-light" style={{ fontSize: 24, fontFamily: "serif" }}>
                Trip Summary
              </h3>

              {/* Summary card */}
              <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: `${GOLD}40`, backgroundColor: `${GOLD}08` }}>
                {!isHourly && formData.pickupZone && formData.dropoffZone && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/50" style={{ fontSize: 15 }}>Route</span>
                    <span className="text-white text-right" style={{ fontSize: 16 }}>
                      {ZONES.find(z => z.id === formData.pickupZone)?.label?.split(" /")[0]} → {ZONES.find(z => z.id === formData.dropoffZone)?.label?.split(" /")[0]}
                    </span>
                  </div>
                )}
                {/* Route distance/duration in summary */}
                {routeCalc.route && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/50" style={{ fontSize: 15 }}>Distance</span>
                    <span className="text-white/70" style={{ fontSize: 15 }}>
                      {routeCalc.route.distanceMiles} mi · {routeCalc.route.durationText}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-white/50" style={{ fontSize: 15 }}>Vehicle</span>
                  <span className="text-white" style={{ fontSize: 16 }}>{effectiveVehicle}</span>
                </div>
                {formData.date && formData.time && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/50" style={{ fontSize: 15 }}>Date & Time</span>
                    <span className="text-white" style={{ fontSize: 16 }}>
                      {new Date(formData.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {(() => { const [h, m] = formData.time.split(":"); const hour = parseInt(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}` })()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-white/50" style={{ fontSize: 15 }}>Passenger</span>
                  <span className="text-white" style={{ fontSize: 16 }}>{formData.name}</span>
                </div>
                <div className="border-t my-2" style={{ borderColor: `${GOLD}30` }} />
                {price !== null && !isOutOfArea ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span style={{ color: GOLD, fontSize: 16 }}>Estimated Price</span>
                      <span className="text-white font-light" style={{ fontSize: 28 }}>${price}</span>
                    </div>
                    {priceBreakdown && priceBreakdown.length > 0 && (
                      <p className="text-white/30 text-xs text-right">{priceBreakdown.join(" · ")}</p>
                    )}
                    <p className="text-white/30 text-xs text-right">Guaranteed price. No surprises.</p>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span style={{ color: GOLD, fontSize: 16 }}>Price</span>
                    <span style={{ color: GOLD, fontSize: 18 }}>To be confirmed</span>
                  </div>
                )}
              </div>

              {/* Payment button — only show when price is available */}
              {!isHourly && canPay && (
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paying}
                  className="w-full py-5 rounded-xl font-medium tracking-widest uppercase transition disabled:opacity-50"
                  style={{ backgroundColor: GOLD, color: "#000", fontSize: 18 }}
                >
                  {paying ? "Redirecting..." : `Confirm & Pay — $${price}`}
                </button>
              )}

              {/* Request Quote — shown when no price is available */}
              {!isHourly && !canPay && (
                <div className="space-y-3">
                  {isOutOfArea ? (
                    <div className="rounded-xl border p-4 text-center" style={{ borderColor: "rgba(255,165,0,0.3)", backgroundColor: "rgba(255,165,0,0.05)" }}>
                      <p style={{ color: "rgba(255,200,100,0.9)", fontSize: 15 }}>This route may be outside our standard service area.</p>
                      <p className="text-white/40 mt-1" style={{ fontSize: 14 }}>Send your request below and we'll confirm availability.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${GOLD}40`, backgroundColor: `${GOLD}08` }}>
                      <p style={{ color: GOLD, fontSize: 15 }}>Custom route — price to be confirmed</p>
                      <p className="text-white/40 mt-1" style={{ fontSize: 14 }}>Send your request and we'll reply with a guaranteed quote.</p>
                    </div>
                  )}
                </div>
              )}

              {payError && <p className="text-red-400 text-sm text-center">{payError}</p>}

              {/* Send buttons */}
              <div className="grid grid-cols-3 gap-3">
                <a
                  href={`mailto:contact@sottoventoluxuryride.com?subject=${encodeURIComponent("Sottovento Booking Request")}&body=${encoded}`}
                  onClick={() => setSubmitted(true)}
                  className="py-4 rounded-xl border text-center transition"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", fontSize: 14 }}
                >
                  ✉ Email
                </a>
                <a
                  href={`sms:+14073830647?&body=${encoded}`}
                  onClick={() => setSubmitted(true)}
                  className="py-4 rounded-xl border text-center transition"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", fontSize: 14 }}
                >
                  💬 SMS
                </a>
                <a
                  href={`https://wa.me/14073830647?text=${encoded}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setSubmitted(true)}
                  className="py-4 rounded-xl border text-center transition"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", fontSize: 14 }}
                >
                  📱 WhatsApp
                </a>
              </div>

              <p className="text-white/25 text-xs text-center">
                Choose how to send your request. No app required.
              </p>

              <button type="button" onClick={() => setStep(4)} className="w-full py-3 text-white/40 text-sm transition hover:text-white/60">
                ← Edit Information
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Floating Support Button ───────────────────────────── */}
      <div className="fixed bottom-6 right-4 z-50">
        {supportOpen && (
          <div
            className="absolute bottom-16 right-0 w-64 rounded-2xl border p-4 space-y-2 shadow-2xl"
            style={{ backgroundColor: "#111", borderColor: "rgba(255,255,255,0.12)" }}
          >
            <p className="text-white/40 text-xs text-center mb-3">Your ride is monitored for your safety.</p>
            {[
              { label: "📞 Contact Driver", href: `tel:+14073830647` },
              { label: "📍 Share Trip", href: `https://wa.me/14073830647?text=I'm sharing my trip location` },
              { label: "💬 Contact Support", href: `https://wa.me/14073830647` },
              { label: "🚨 Call 911", href: `tel:911` },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="block w-full py-3 px-4 rounded-lg border text-center text-white/70 transition hover:border-white/30"
                style={{ borderColor: "rgba(255,255,255,0.1)", fontSize: 15 }}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
        <button
          onClick={() => setSupportOpen(!supportOpen)}
          className="rounded-full px-4 py-3 shadow-lg transition"
          style={{ backgroundColor: "#1a1a1a", border: `1px solid ${GOLD}50`, color: GOLD, fontSize: 13 }}
        >
          {supportOpen ? "✕" : "🛡 Ride Support"}
        </button>
      </div>
    </section>
  )
}

export function BookingSection() {
  return (
    <Suspense fallback={null}>
      <BookingInner />
    </Suspense>
  )
}
