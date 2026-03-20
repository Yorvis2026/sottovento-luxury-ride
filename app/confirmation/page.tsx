"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

const GOLD = "#C9A84C"

interface BookingData {
  booking_id?: string | null
  client_email?: string | null
  client_email_sent?: boolean | null  // true = delivered, false = failed, null = pending/unknown
  pickup_location?: string
  dropoff_location?: string
  pickup_datetime?: string | null
  pickup_date?: string | null
  pickup_time?: string | null
  vehicle_type?: string
  fare?: number
  status?: string
  paid?: boolean
}

function ConfirmationInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [status, setStatus] = useState<"loading" | "confirmed" | "pending" | "error">("loading")
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    if (!sessionId) {
      setStatus("confirmed") // Legacy: no session_id, show generic confirmation
      return
    }

    let attempts = 0
    const maxAttempts = 6 // Try for up to 30 seconds (5s intervals)

    const verify = async () => {
      try {
        const res = await fetch(`/api/booking/verify?session_id=${sessionId}`)
        const data = await res.json()

        if (data.verified) {
          setBooking(data.booking)
          setStatus("confirmed")
        } else if (attempts < maxAttempts) {
          attempts++
          setRetries(attempts)
          setTimeout(verify, 5000) // Retry in 5s (webhook may not have fired yet)
        } else {
          // Max retries reached — show confirmation anyway (payment was verified by Stripe)
          setStatus("pending")
        }
      } catch {
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(verify, 5000)
        } else {
          setStatus("error")
        }
      }
    }

    verify()
  }, [sessionId])

  const pickupFormatted = booking?.pickup_datetime
    ? new Date(booking.pickup_datetime).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }) + " at " + new Date(booking.pickup_datetime).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit",
      })
    : booking?.pickup_date && booking?.pickup_time
    ? `${booking.pickup_date} at ${booking.pickup_time}`
    : null

  const bookingRef = booking?.booking_id
    ? booking.booking_id.slice(0, 8).toUpperCase()
    : null

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-6 px-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-2 border-yellow-600/30 border-t-yellow-600 rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-light tracking-wider text-white">Confirming your booking...</h2>
          {retries > 0 && (
            <p className="text-sm text-zinc-500">
              Verifying with our system... ({retries}/6)
            </p>
          )}
        </div>
      </main>
    )
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-6 px-4 max-w-lg mx-auto">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-light tracking-wider text-white">Payment Received</h1>
          <p className="text-zinc-400">
            Your payment was processed successfully, but we had trouble confirming your booking details.
            We will contact you shortly to confirm everything.
          </p>
          <p className="text-sm text-zinc-500">
            Questions?{" "}
            <a href="tel:+14073830647" className="text-yellow-600 hover:underline">+1 (407) 383-0647</a>
          </p>
          <a href="/" className="inline-block mt-4 px-6 py-3 border border-zinc-700 rounded-md hover:border-yellow-600 transition text-sm tracking-wide text-zinc-300">
            Return to Home
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: GOLD + "20", border: `2px solid ${GOLD}` }}>
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-3xl font-light tracking-wider text-white mb-2">Booking Confirmed</h1>
          <p className="text-zinc-400 text-sm">
            {status === "pending"
              ? "Your payment was received. A confirmation email will be sent shortly."
              : "Your payment was received and your ride is confirmed."}
          </p>
        </div>

        {/* Booking details card */}
        {booking && (
          <div className="rounded-2xl border overflow-hidden mb-6"
            style={{ borderColor: GOLD + "30", backgroundColor: "#0f0f0f" }}>

            {bookingRef && (
              <div className="px-6 py-4 border-b" style={{ borderColor: GOLD + "20" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest">Booking Reference</span>
                  <span className="text-sm font-mono font-bold" style={{ color: GOLD }}>#{bookingRef}</span>
                </div>
              </div>
            )}

            <div className="px-6 py-4 space-y-4">
              {booking.pickup_location && (
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5">Pickup</div>
                    <div className="text-white text-sm">{booking.pickup_location}</div>
                  </div>
                </div>
              )}
              {booking.dropoff_location && (
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-zinc-500 mb-0.5">Drop-off</div>
                    <div className="text-white text-sm">{booking.dropoff_location}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x border-t"
              style={{ borderColor: GOLD + "20" }}>
              {pickupFormatted && (
                <div className="px-4 py-3 col-span-2">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Date & Time</div>
                  <div className="text-xs text-white">{pickupFormatted}</div>
                </div>
              )}
              {booking.vehicle_type && (
                <div className="px-4 py-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Vehicle</div>
                  <div className="text-xs text-white">{booking.vehicle_type}</div>
                </div>
              )}
            </div>

            {booking.fare && (
              <div className="px-6 py-4 border-t flex items-center justify-between"
                style={{ borderColor: GOLD + "20" }}>
                <span className="text-zinc-500 text-sm">Total Paid</span>
                <span className="text-2xl font-bold" style={{ color: GOLD }}>${booking.fare.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact info */}
        <div className="text-center space-y-2">
          <p className="text-zinc-500 text-sm">
            {booking?.client_email_sent === true
              ? `A confirmation has been sent to ${booking.client_email}`
              : booking?.client_email_sent === false
              ? `We had trouble sending the confirmation to ${booking.client_email ?? "your email"}. Please contact us if you need a copy.`
              : booking?.client_email
              ? `A confirmation will be sent to ${booking.client_email} shortly.`
              : "A confirmation email will be sent to you shortly."}
          </p>
          <p className="text-zinc-600 text-xs">
            Questions?{" "}
            <a href="tel:+14073830647" className="text-yellow-600 hover:underline">+1 (407) 383-0647</a>
            {" · "}
            <a href="mailto:contact@sottoventoluxuryride.com" className="text-yellow-600 hover:underline">
              contact@sottoventoluxuryride.com
            </a>
          </p>
        </div>

        <div className="text-center mt-6">
          <a href="/"
            className="inline-block px-6 py-3 border border-zinc-800 rounded-md hover:border-yellow-600 transition text-sm tracking-wide text-zinc-400">
            Return to Home
          </a>
        </div>
      </div>
    </main>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-2 border-yellow-600/30 border-t-yellow-600 rounded-full animate-spin" />
      </main>
    }>
      <ConfirmationInner />
    </Suspense>
  )
}
