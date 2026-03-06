"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function BookingSection() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    pickupLocation: "",
    dropoffLocation: "",
    date: "",
    time: "",
    passengers: "",
    serviceType: "",
    vehicleType: "",
    luggage: "",
    flightNumber: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Create WhatsApp message
    const message = `
*New Booking Request*

Name: ${formData.name}
Phone: ${formData.phone}
Email: ${formData.email}

Pickup: ${formData.pickupLocation}
Drop-off: ${formData.dropoffLocation}

Date: ${formData.date}
Time: ${formData.time}
Passengers: ${formData.passengers}
Luggage: ${formData.luggage}

Service: ${formData.serviceType}
Vehicle: ${formData.vehicleType}
${formData.flightNumber ? `Flight: ${formData.flightNumber}` : ""}

${formData.notes ? `Notes: ${formData.notes}` : ""}
    `.trim()

    const whatsappUrl = `https://wa.me/14073830647?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <section id="booking" className="py-24 md:py-32 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-slide-up">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider">
              Book Your <span className="text-accent">Ride</span>
            </h2>
            <p className="text-muted-foreground">Reserve your luxury transportation experience</p>
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
                  onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                >
                  <SelectTrigger id="vehicleType">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
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

            <Button type="submit" size="lg" className="w-full tracking-wider">
              SEND BOOKING REQUEST
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              We&apos;ll confirm your booking by text or email.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
