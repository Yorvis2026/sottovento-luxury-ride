"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ZONES, PACKAGE_TO_ZONE, type ZoneId } from "@/lib/zones"
import {
  getGuaranteedPrice,
  WAIT_ADDONS,
  EXTRA_STOP_ADDONS,
  EXTRA_STOP_LABELS,
  UPGRADE_ADDON,
  HOURLY_PACKAGES,
  HOURLY_RATE,
  MINIMUM_FARE,
  type VehicleType,
  type ServiceType,
  type WaitTime,
  type ExtraStop,
} from "@/lib/pricing"

function BookingInner() {
  const searchParams = useSearchParams()

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
    // Round trip fields
    returnDate: "",
    returnTime: "",
    returnPickupLocation: "",
    passengers: "",
    serviceType: "oneway" as ServiceType | "hourly" | "event" | "corporate",
    tripType: "oneway" as "oneway" | "roundtrip",
    waitTime: "none" as WaitTime,
    extraStop: "none" as ExtraStop,
    vehicleType: "SUV" as VehicleType,
    upgradeVehicle: false,
    luggage: "",
    flightNumber: "",
    notes: "",
    // Hourly Chauffeur fields
    hoursRequested: "",
    eventDestination: "",
    returnLocation: "",
  })

  // Read URL params on mount
  useEffect(() => {
    const pkg = searchParams.get("package")
    const service = searchParams.get("service")
    const updates: Partial<typeof formData> = {}

    if (pkg) {
      const zoneId = PACKAGE_TO_ZONE[pkg.toLowerCase()]
      if (zoneId) updates.pickupZone = zoneId
    }
    if (service === "hourly") updates.serviceType = "hourly"

    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }))
    }
  }, [searchParams])

  const isHourly = formData.serviceType === "hourly"
  const isRoundTrip = formData.tripType === "roundtrip" && !isHourly
  const isLongDistance =
    formData.dropoffZone === "KENNEDY" ||
    formData.dropoffZone === "TAMPA" ||
    formData.dropoffZone === "CLEARWATER" ||
    formData.dropoffZone === "MIAMI" ||
    formData.pickupZone === "KENNEDY" ||
    formData.pickupZone === "TAMPA" ||
    formData.pickupZone === "CLEARWATER" ||
    formData.pickupZone === "MIAMI"

  const showUpgrade = formData.vehicleType === "Sedan" && !isHourly

  // Hourly price calculation
  const hourlyPrice = (() => {
    if (!isHourly) return null
    const pkg = HOURLY_PACKAGES.find((p) => p.hours === Number(formData.hoursRequested))
    if (pkg) return pkg.price
    const hrs = Number(formData.hoursRequested)
    if (hrs >= 3) return hrs * HOURLY_RATE
    return null
  })()

  // Transfer price calculation
  const transferPrice =
    !isHourly && formData.pickupZone && formData.dropoffZone && formData.vehicleType
      ? getGuaranteedPrice({
          pickupZone: formData.pickupZone as ZoneId,
          dropoffZone: formData.dropoffZone as ZoneId,
          vehicle: formData.vehicleType as VehicleType,
          serviceType: formData.tripType as ServiceType,
          waitTime: formData.waitTime,
          extraStop: formData.extraStop,
          upgrade: formData.upgradeVehicle,
        })
      : null

  const price = isHourly ? hourlyPrice : transferPrice

  // Effective vehicle for display
  const effectiveVehicle = formData.upgradeVehicle && formData.vehicleType === "Sedan" ? "SUV" : formData.vehicleType

  // Price breakdown for display
  const priceBreakdown = (() => {
    if (isHourly || !transferPrice) return null
    const lines: string[] = []
    if (formData.waitTime !== "none") lines.push(`Waiting time: +$${WAIT_ADDONS[formData.waitTime]}`)
    if (formData.extraStop !== "none") lines.push(`Extra stop: +$${EXTRA_STOP_ADDONS[formData.extraStop]}`)
    if (formData.upgradeVehicle && formData.vehicleType === "Sedan") lines.push(`Vehicle upgrade: +$${UPGRADE_ADDON}`)
    return lines
  })()

  // Build request text
  const requestText = isHourly
    ? `SOTTOVENTO BOOKING REQUEST — HOURLY CHAUFFEUR
Name: ${formData.name}
Phone: ${formData.phone}
Email: ${formData.email}
Vehicle: ${effectiveVehicle}
Passengers: ${formData.passengers}
Luggage: ${formData.luggage}
Date/Time: ${formData.date} ${formData.time}
Pickup Location: ${formData.pickupLocation}
Event / Destination: ${formData.eventDestination}
Hours Requested: ${formData.hoursRequested}
Return Location: ${formData.returnLocation || "N/A"}
Estimated Price: ${price ? `$${price}` : "To be confirmed"}
Flight #: ${formData.flightNumber || "N/A"}
Notes: ${formData.notes || "N/A"}
`
    : `SOTTOVENTO BOOKING REQUEST — ${formData.tripType === "roundtrip" ? "ROUND TRIP" : "ONE WAY"}
Name: ${formData.name}
Phone: ${formData.phone}
Email: ${formData.email}
Pickup Zone: ${formData.pickupZone}
Drop-off Zone: ${formData.dropoffZone}
Vehicle: ${effectiveVehicle}${formData.upgradeVehicle && formData.vehicleType === "Sedan" ? " (Upgraded from Sedan)" : ""}
Passengers: ${formData.passengers}
Luggage: ${formData.luggage}
Date/Time: ${formData.date} ${formData.time}
Pickup: ${formData.pickupLocation}
Drop-off: ${formData.dropoffLocation}${
      isRoundTrip
        ? `\nReturn Date/Time: ${formData.returnDate} ${formData.returnTime}\nReturn Pickup: ${formData.returnPickupLocation || "Same as drop-off"}`
        : ""
    }${
      formData.waitTime !== "none"
        ? `\nWaiting Time: ${formData.waitTime} (+$${WAIT_ADDONS[formData.waitTime]})`
        : ""
    }${
      formData.extraStop !== "none"
        ? `\nExtra Stop: ${EXTRA_STOP_LABELS[formData.extraStop]}`
        : ""
    }
Flight #: ${formData.flightNumber || "N/A"}
Notes: ${formData.notes || "N/A"}
Guaranteed Price: $${price ?? "N/A"}
`

  const encoded = encodeURIComponent(requestText)

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handlePayment = async () => {
    setPayError("")
    if (isHourly) {
      setPayError("For hourly service, please contact us via Email, SMS or WhatsApp below to confirm pricing.")
      return
    }
    if (!formData.pickupZone || !formData.dropoffZone) {
      setPayError("Please select a pickup zone and drop-off zone to see your guaranteed price.")
      return
    }
    if (!price) {
      setPayError("No price available for this route. Please contact us directly.")
      return
    }
    setPaying(true)
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          vehicle: effectiveVehicle,
          pickupZone: formData.pickupZone,
          dropoffZone: formData.dropoffZone,
          tripType: formData.tripType,
        }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        setPayError("Payment error: " + data.error)
      }
    } catch (err: any) {
      setPayError("Connection error. Please try again or use Email/WhatsApp below.")
      console.error(err)
    } finally {
      setPaying(false)
    }
  }

  return (
    <section id="booking" className="py-24 md:py-32 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-slide-up">
            <h2
              className="font-light tracking-wider text-center"
              style={{ fontSize: "clamp(22px, 4vw, 28px)" }}
            >
              Reserve Your Luxury Ride in{" "}
              <span className="text-accent">Less Than 30 Seconds</span>
            </h2>
            <p className="text-muted-foreground text-center">Guaranteed price. No surprises.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-background border border-border p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Personal Info */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              {/* Type of Service */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="serviceType">Type of Service *</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, serviceType: value as typeof formData.serviceType })
                  }
                >
                  <SelectTrigger id="serviceType">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oneway">One Way Transfer</SelectItem>
                    <SelectItem value="roundtrip">Round Trip Transfer</SelectItem>
                    <SelectItem value="hourly">Hourly Chauffeur</SelectItem>
                    <SelectItem value="event">Event Transportation</SelectItem>
                    <SelectItem value="corporate">Corporate Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trip type toggle for non-hourly */}
              {!isHourly && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Trip Type *</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tripType: "oneway" })}
                      className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition ${
                        formData.tripType === "oneway"
                          ? "border-accent text-accent"
                          : "border-border text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      One Way
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tripType: "roundtrip" })}
                      className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition ${
                        formData.tripType === "roundtrip"
                          ? "border-accent text-accent"
                          : "border-border text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      Round Trip
                    </button>
                  </div>
                </div>
              )}

              {/* Transfer fields */}
              {!isHourly && (
                <>
                  {/* Pickup Zone */}
                  <div className="space-y-2">
                    <Label htmlFor="pickupZone">Pickup Zone *</Label>
                    <Select
                      value={formData.pickupZone}
                      onValueChange={(value) =>
                        setFormData({ ...formData, pickupZone: value as ZoneId })
                      }
                    >
                      <SelectTrigger id="pickupZone">
                        <SelectValue placeholder="Select pickup zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONES.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Drop-off Zone */}
                  <div className="space-y-2">
                    <Label htmlFor="dropoffZone">Drop-off Zone *</Label>
                    <Select
                      value={formData.dropoffZone}
                      onValueChange={(value) =>
                        setFormData({ ...formData, dropoffZone: value as ZoneId })
                      }
                    >
                      <SelectTrigger id="dropoffZone">
                        <SelectValue placeholder="Select drop-off zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONES.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pickup Address */}
                  <div className="space-y-2">
                    <Label htmlFor="pickupLocation">Pickup Address *</Label>
                    <Input
                      id="pickupLocation"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                      placeholder="Hotel name, terminal, address..."
                    />
                  </div>

                  {/* Drop-off Address */}
                  <div className="space-y-2">
                    <Label htmlFor="dropoffLocation">Drop-off Address *</Label>
                    <Input
                      id="dropoffLocation"
                      required
                      value={formData.dropoffLocation}
                      onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                      placeholder="Hotel name, terminal, address..."
                    />
                  </div>

                  {/* Round Trip return fields */}
                  {isRoundTrip && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="returnDate">Return Date *</Label>
                        <Input
                          id="returnDate"
                          type="date"
                          required
                          value={formData.returnDate}
                          onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="returnTime">Return Pickup Time *</Label>
                        <Input
                          id="returnTime"
                          type="time"
                          required
                          value={formData.returnTime}
                          onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="returnPickupLocation">Return Pickup Location</Label>
                        <Input
                          id="returnPickupLocation"
                          value={formData.returnPickupLocation}
                          onChange={(e) => setFormData({ ...formData, returnPickupLocation: e.target.value })}
                          placeholder="Same as drop-off if blank"
                        />
                      </div>
                    </>
                  )}

                  {/* Waiting Package — only for long-distance routes */}
                  {isLongDistance && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="waitTime">Waiting Package (Optional)</Label>
                      <Select
                        value={formData.waitTime}
                        onValueChange={(value) =>
                          setFormData({ ...formData, waitTime: value as WaitTime })
                        }
                      >
                        <SelectTrigger id="waitTime">
                          <SelectValue placeholder="Select waiting option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Wait</SelectItem>
                          <SelectItem value="2h">2 Hours Wait (+$80)</SelectItem>
                          <SelectItem value="4h">4 Hours Wait (+$150)</SelectItem>
                          <SelectItem value="fullday">Full Day Wait (+$350)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Extra Stop */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="extraStop">Add Stop (Optional)</Label>
                    <Select
                      value={formData.extraStop}
                      onValueChange={(value) =>
                        setFormData({ ...formData, extraStop: value as ExtraStop })
                      }
                    >
                      <SelectTrigger id="extraStop">
                        <SelectValue placeholder="No extra stop" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No extra stop</SelectItem>
                        <SelectItem value="quick">Quick stop (10 min) +$15</SelectItem>
                        <SelectItem value="short">Short stop (20 min) +$25</SelectItem>
                        <SelectItem value="extended">Extended stop (40 min) +$40</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Hourly Chauffeur fields */}
              {isHourly && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pickupLocation">Pickup Location *</Label>
                    <Input
                      id="pickupLocation"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                      placeholder="Hotel name, address..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hoursRequested">Number of Hours * (min. 3)</Label>
                    <Input
                      id="hoursRequested"
                      type="number"
                      min="3"
                      required
                      value={formData.hoursRequested}
                      onChange={(e) =>
                        setFormData({ ...formData, hoursRequested: e.target.value })
                      }
                      placeholder="3"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="eventDestination">Event / Main Destination *</Label>
                    <Input
                      id="eventDestination"
                      required
                      value={formData.eventDestination}
                      onChange={(e) =>
                        setFormData({ ...formData, eventDestination: e.target.value })
                      }
                      placeholder="Event venue, destination address, etc."
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="returnLocation">Return Location (Optional)</Label>
                    <Input
                      id="returnLocation"
                      value={formData.returnLocation}
                      onChange={(e) =>
                        setFormData({ ...formData, returnLocation: e.target.value })
                      }
                      placeholder="Return address or same as pickup"
                    />
                  </div>

                  {/* Hourly price display */}
                  <div className="md:col-span-2">
                    {hourlyPrice !== null ? (
                      <div className="border border-border rounded-md p-4 text-center">
                        <div className="text-sm text-muted-foreground">Estimated Price — Hourly Chauffeur</div>
                        <div className="text-3xl font-light tracking-wider">${hourlyPrice}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Rate: $95/hr · Minimum 3 hours · Final price confirmed after review.
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center">
                        Enter hours requested (minimum 3) to see estimated price.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Date & Time */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Pickup Time *</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              {/* Passengers */}
              <div className="space-y-2">
                <Label htmlFor="passengers">Number of Passengers *</Label>
                <Select
                  value={formData.passengers}
                  onValueChange={(value) => setFormData({ ...formData, passengers: value })}
                >
                  <SelectTrigger id="passengers">
                    <SelectValue placeholder="Select passengers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Passenger</SelectItem>
                    <SelectItem value="2">2 Passengers</SelectItem>
                    <SelectItem value="3">3 Passengers</SelectItem>
                    <SelectItem value="4">4 Passengers</SelectItem>
                    <SelectItem value="5">5 Passengers</SelectItem>
                    <SelectItem value="6">6+ Passengers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Luggage */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Luggage *</label>
                <select
                  value={formData.luggage}
                  onChange={(e) => setFormData({ ...formData, luggage: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select luggage</option>
                  <option value="No luggage">No luggage</option>
                  <option value="1-2 bags">1–2 bags</option>
                  <option value="3-4 bags">3–4 bags</option>
                  <option value="5+ bags">5+ bags</option>
                  <option value="Oversized / stroller / wheelchair">Oversized / stroller / wheelchair</option>
                </select>
              </div>

              {/* Vehicle */}
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Preferred Vehicle</Label>
                <Select
                  value={formData.vehicleType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicleType: value as VehicleType, upgradeVehicle: false })
                  }
                >
                  <SelectTrigger id="vehicleType">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sedan">Sedan</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Upgrade — only shown when Sedan is selected */}
              {showUpgrade && (
                <div className="space-y-2">
                  <Label>Vehicle Upgrade (Optional)</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, upgradeVehicle: !formData.upgradeVehicle })
                    }
                    className={`w-full py-2 px-4 rounded-md border text-sm font-medium transition ${
                      formData.upgradeVehicle
                        ? "border-accent text-accent"
                        : "border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {formData.upgradeVehicle
                      ? "✓ Upgraded to Luxury SUV (+$35)"
                      : "Upgrade to Luxury SUV (+$35)"}
                  </button>
                </div>
              )}

              {/* Flight Number */}
              <div className="space-y-2">
                <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
                <Input
                  id="flightNumber"
                  value={formData.flightNumber}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                  placeholder="AA1234"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special requests, luggage details, etc."
                  rows={4}
                />
              </div>
            </div>

            {/* Price display for transfer routes */}
            {!isHourly && (
              <div className="border border-border rounded-md p-4 text-center">
                {transferPrice !== null ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      {formData.tripType === "roundtrip" ? "Round Trip" : "One Way"} · {effectiveVehicle}
                    </div>
                    <div className="text-3xl font-light tracking-wider">${transferPrice}</div>
                    {priceBreakdown && priceBreakdown.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {priceBreakdown.join(" · ")}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">Guaranteed price. No surprises.</div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Select pickup zone, drop-off zone, and vehicle to see your guaranteed price.
                  </div>
                )}
              </div>
            )}

            {/* Stripe payment button — only for transfer routes */}
            {!isHourly && (
              <button
                type="button"
                onClick={handlePayment}
                disabled={paying}
                className="w-full py-3 rounded-md font-medium tracking-wide hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: "#C8A96A", color: "#000" }}
              >
                {paying
                  ? "Redirecting to payment..."
                  : transferPrice
                  ? `Confirm & Pay Securely — $${transferPrice}`
                  : "Confirm & Pay Securely"}
              </button>
            )}

            {payError && (
              <p className="text-sm text-red-500 text-center">{payError}</p>
            )}

            {/* 3 send buttons */}
            <div className="grid md:grid-cols-3 gap-3">
              <a
                href={`mailto:contact@sottoventoluxuryride.com?subject=${encodeURIComponent("Sottovento Booking Request")}&body=${encoded}`}
                className="w-full text-center px-4 py-3 border border-border rounded-md hover:border-accent transition"
              >
                Send via Email
              </a>
              <a
                href={`sms:+14073830647?&body=${encoded}`}
                className="w-full text-center px-4 py-3 border border-border rounded-md hover:border-accent transition"
              >
                Send via Text (SMS)
              </a>
              <a
                href={`https://wa.me/14073830647?text=${encoded}`}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center px-4 py-3 border border-border rounded-md hover:border-accent transition"
              >
                Send via WhatsApp
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Choose how you&apos;d like to send your request. No app is required.
            </p>
          </form>
        </div>
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
