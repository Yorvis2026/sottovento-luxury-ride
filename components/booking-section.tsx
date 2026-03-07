"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ZONES, type ZoneId } from "@/lib/zones"
import { getGuaranteedPrice, type VehicleType } from "@/lib/pricing"

export function BookingSection() {
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
    passengers: "",
    serviceType: "",
    vehicleType: "SUV" as VehicleType,
    luggage: "",
    flightNumber: "",
    notes: "",
  })

  const price =
    formData.pickupZone && formData.dropoffZone && formData.vehicleType
      ? getGuaranteedPrice({
          pickupZone: formData.pickupZone as ZoneId,
          dropoffZone: formData.dropoffZone as ZoneId,
          vehicle: formData.vehicleType as VehicleType,
        })
      : null

  const requestText = `SOTTOVENTO BOOKING REQUEST
Name: ${formData.name}
Phone: ${formData.phone}
Email: ${formData.email}
Pickup Zone: ${formData.pickupZone}
Drop-off Zone: ${formData.dropoffZone}
Vehicle: ${formData.vehicleType}
Passengers: ${formData.passengers}
Luggage: ${formData.luggage}
Date/Time: ${formData.date} ${formData.time}
Pickup: ${formData.pickupLocation}
Drop-off: ${formData.dropoffLocation}
Flight #: ${formData.flightNumber || "N/A"}
Notes: ${formData.notes || "N/A"}
Guaranteed Price: $${price ?? "N/A"}
`

  const encoded = encodeURIComponent(requestText)

  const [paying, setPaying] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handlePayment = async () => {
    if (!price) return
    setPaying(true)
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          vehicle: formData.vehicleType,
          pickupZone: formData.pickupZone,
          dropoffZone: formData.dropoffZone,
        }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
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

              {/* Zone selectors */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Pickup Zone *</label>
                <select
                  value={formData.pickupZone}
                  onChange={(e) => setFormData({ ...formData, pickupZone: e.target.value as ZoneId })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select pickup zone</option>
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Drop-off Zone *</label>
                <select
                  value={formData.dropoffZone}
                  onChange={(e) => setFormData({ ...formData, dropoffZone: e.target.value as ZoneId })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select drop-off zone</option>
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guaranteed price display */}
              <div className="md:col-span-2">
                {price !== null ? (
                  <div className="border border-border rounded-md p-4 text-center">
                    <div className="text-sm text-muted-foreground">Guaranteed Price</div>
                    <div className="text-3xl font-light tracking-wider">${price}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Guaranteed for standard service within selected zones. Extra stops / wait time may add fees.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center">
                    Select pickup zone, drop-off zone, and vehicle to see your guaranteed price.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupLocation">Pickup Location *</Label>
                <Input
                  id="pickupLocation"
                  required
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  placeholder="MCO Airport / Hotel / Address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoffLocation">Drop-off Location *</Label>
                <Input
                  id="dropoffLocation"
                  required
                  value={formData.dropoffLocation}
                  onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                  placeholder="Hotel / Address / Airport"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="serviceType">Type of Service *</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                >
                  <SelectTrigger id="serviceType">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airport">Airport Transfer</SelectItem>
                    <SelectItem value="hourly">Hourly Charter</SelectItem>
                    <SelectItem value="event">Event Transportation</SelectItem>
                    <SelectItem value="corporate">Corporate Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">Preferred Vehicle</Label>
                <Select
                  value={formData.vehicleType}
                  onValueChange={(value) => setFormData({ ...formData, vehicleType: value as VehicleType })}
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

              <div className="space-y-2">
                <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
                <Input
                  id="flightNumber"
                  value={formData.flightNumber}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                  placeholder="AA1234"
                />
              </div>

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

            {price !== null && (
              <button
                type="button"
                onClick={handlePayment}
                disabled={paying}
                className="w-full bg-accent text-accent-foreground py-3 rounded-md font-medium tracking-wide hover:opacity-90 transition disabled:opacity-50"
              >
                {paying ? "Redirecting..." : `Confirm & Pay Securely — $${price}`}
              </button>
            )}

            <div className="grid md:grid-cols-3 gap-3">
              {/* Email */}
              <a
                href={`mailto:contact@sottoventoluxuryride.com?subject=${encodeURIComponent("Sottovento Booking Request")}&body=${encoded}`}
                className="w-full text-center px-4 py-3 border border-border rounded-md hover:border-accent transition"
              >
                Send via Email
              </a>

              {/* SMS */}
              <a
                href={`sms:+14073830647?&body=${encoded}`}
                className="w-full text-center px-4 py-3 border border-border rounded-md hover:border-accent transition"
              >
                Send via Text (SMS)
              </a>

              {/* WhatsApp */}
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
