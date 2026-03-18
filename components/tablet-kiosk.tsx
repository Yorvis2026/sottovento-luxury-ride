"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import Image from "next/image"

// ─────────────────────────────────────────────────────────────
// TabletKiosk — shared component for /tablet and /tablet/[driver_code]
// driverCode prop: when provided, all QR/booking URLs include ref=CODE
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.sottoventoluxuryride.com"

type Slide = {
  id: string
  type: "welcome" | "service" | "qr" | "fleet" | "lead" | "crown"
  bg: string
  bgImage: string
  accent: string
}

const SLIDES: Slide[] = [
  { id: "welcome",    type: "welcome",  bg: "bg-black",       bgImage: "/images/tablet/welcome-bg.jpg",   accent: "#C9A84C" },
  { id: "airport",   type: "service",  bg: "bg-zinc-950",    bgImage: "/images/tablet/airport-bg.jpg",   accent: "#C9A84C" },
  { id: "corporate", type: "service",  bg: "bg-neutral-950", bgImage: "/images/tablet/corporate-bg.jpg", accent: "#C9A84C" },
  { id: "hourly",    type: "service",  bg: "bg-stone-950",   bgImage: "/images/tablet/hourly-bg.jpg",    accent: "#C9A84C" },
  { id: "fleet",     type: "fleet",    bg: "bg-black",       bgImage: "/images/tablet/fleet-bg.jpg",     accent: "#C9A84C" },
  { id: "qr-book",   type: "qr",       bg: "bg-zinc-950",    bgImage: "/images/tablet/qr-bg.jpg",        accent: "#C9A84C" },
  { id: "lead",      type: "lead",     bg: "bg-black",       bgImage: "/images/tablet/lead-bg.jpg",      accent: "#C9A84C" },
  { id: "crown",     type: "crown",    bg: "bg-black",       bgImage: "/images/tablet/crown-bg.jpg",     accent: "#C9A84C" },
]

const SLIDE_DURATION = 8000
const LEAD_SLIDE_DURATION = 30000

interface TabletKioskProps {
  driverCode?: string | null
}

export default function TabletKiosk({ driverCode }: TabletKioskProps) {
  const [current, setCurrent] = useState(0)
  const [urlDriverCode, setUrlDriverCode] = useState<string | null>(null)
  const [tabletCode, setTabletCode] = useState<string | null>(null)
  const [leadName, setLeadName] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Parse URL params (for /tablet?driver=xxx legacy support)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrlDriverCode(params.get("driver") ?? params.get("ref") ?? null)
    setTabletCode(params.get("tablet") ?? null)
  }, [])

  // Effective driver code: prop takes priority over URL param
  const effectiveDriverCode = driverCode ?? urlDriverCode

  // Build QR URL with attribution
  const bookingUrl = (() => {
    const url = new URL(`${BASE_URL}/#booking`)
    if (effectiveDriverCode) url.searchParams.set("ref", effectiveDriverCode)
    if (tabletCode) url.searchParams.set("tablet", tabletCode)
    return url.toString()
  })()

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length)
  }, [])

  useEffect(() => {
    const duration =
      SLIDES[current]?.type === "lead" ? LEAD_SLIDE_DURATION : SLIDE_DURATION
    timerRef.current = setTimeout(advance, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, advance])

  const goTo = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrent(index)
  }

  const submitLead = async () => {
    if (!leadName && !leadPhone && !leadEmail) return
    setLeadSubmitting(true)
    try {
      await fetch("/api/dispatch/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: leadName,
          phone: leadPhone,
          email: leadEmail,
          driver_code: effectiveDriverCode,
          tablet_code: tabletCode,
          lead_source: "tablet",
        }),
      })
      setLeadSubmitted(true)
      setTimeout(() => {
        setLeadSubmitted(false)
        setLeadName("")
        setLeadPhone("")
        setLeadEmail("")
        advance()
      }, 4000)
    } catch {
      setLeadSubmitted(true)
    } finally {
      setLeadSubmitting(false)
    }
  }

  const slide = SLIDES[current]

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        overscrollBehavior: "none",
        width: "100dvw",
        height: "100dvh",
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
        backgroundColor: "#000",
      }}
    >
      {/* Background photo with crossfade transition */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0, zIndex: 0 }}
        >
          <Image
            src={s.bgImage}
            alt=""
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ))}

      {/* Slide content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {slide.type === "welcome" && <WelcomeSlide accentColor={slide.accent} driverCode={effectiveDriverCode} />}
        {slide.type === "service" && <ServiceSlide id={slide.id} accentColor={slide.accent} />}
        {slide.type === "fleet" && <FleetSlide accentColor={slide.accent} />}
        {slide.type === "qr" && <QRSlide bookingUrl={bookingUrl} accentColor={slide.accent} />}
        {slide.type === "lead" && (
          <LeadSlide
            accentColor={slide.accent}
            name={leadName}
            phone={leadPhone}
            email={leadEmail}
            onName={setLeadName}
            onPhone={setLeadPhone}
            onEmail={setLeadEmail}
            onSubmit={submitLead}
            submitting={leadSubmitting}
            submitted={leadSubmitted}
          />
        )}
        {slide.type === "crown" && <CrownSlide accentColor={slide.accent} />}
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-50">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              backgroundColor: i === current ? slide.accent : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>

      {/* Tap zones */}
      <button
        className="absolute left-0 top-0 bottom-16 w-16 z-40 opacity-0"
        onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
      />
      <button
        className="absolute right-0 top-0 bottom-16 w-16 z-40 opacity-0"
        onClick={() => goTo((current + 1) % SLIDES.length)}
      />

      {/* Branding watermark */}
      <div
        className="absolute top-5 left-6 z-50 text-xs tracking-[0.3em] uppercase opacity-60"
        style={{ color: slide.accent, fontFamily: "serif" }}
      >
        Sottovento
      </div>

      {/* Driver attribution badge (subtle, bottom right) */}
      {effectiveDriverCode && (
        <div
          className="absolute bottom-6 right-6 z-50 text-xs opacity-30 tracking-widest uppercase"
          style={{ color: slide.accent }}
        >
          {effectiveDriverCode}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE COMPONENTS
// ─────────────────────────────────────────────────────────────

function GoldDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 opacity-30" style={{ backgroundColor: color }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: color }} />
      <div className="h-px flex-1 opacity-30" style={{ backgroundColor: color }} />
    </div>
  )
}

function WelcomeSlide({ accentColor, driverCode }: { accentColor: string; driverCode?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      <p className="text-xs tracking-[0.5em] uppercase text-white/60">Welcome aboard</p>
      <h1
        className="text-6xl md:text-7xl font-light text-white drop-shadow-lg"
        style={{ fontFamily: "serif", letterSpacing: "0.05em" }}
      >
        Sottovento
      </h1>
      <GoldDivider color={accentColor} />
      <p className="text-xl text-white/80 font-light tracking-wide drop-shadow">
        Luxury Transportation · Orlando
      </p>
      <p className="text-sm text-white/50 mt-4 max-w-md leading-relaxed">
        Sit back and enjoy the journey. Your comfort is our only priority.
      </p>
    </div>
  )
}

const SERVICE_DATA: Record<string, { title: string; subtitle: string; points: string[] }> = {
  airport: {
    title: "Airport Transfers",
    subtitle: "MCO · Sanford · Tampa · Miami",
    points: [
      "Flight tracking included",
      "Meet & greet service",
      "Complimentary wait time",
      "Fixed guaranteed pricing",
    ],
  },
  corporate: {
    title: "Corporate Travel",
    subtitle: "Executive · Roadshow · Events",
    points: [
      "Dedicated account manager",
      "Invoicing available",
      "Multi-stop itineraries",
      "Confidential & discreet",
    ],
  },
  hourly: {
    title: "Hourly Chauffeur",
    subtitle: "As-directed service",
    points: [
      "3-hour minimum",
      "Multiple stops included",
      "Flexible scheduling",
      "Available 24/7",
    ],
  },
}

function ServiceSlide({ id, accentColor }: { id: string; accentColor: string }) {
  const data = SERVICE_DATA[id]
  if (!data) return null
  return (
    <div className="flex flex-col items-center justify-center text-center px-16 gap-5 max-w-2xl">
      <p className="text-xs tracking-[0.4em] uppercase drop-shadow" style={{ color: accentColor }}>
        Our Services
      </p>
      <h2 className="text-5xl font-light text-white drop-shadow-lg" style={{ fontFamily: "serif" }}>
        {data.title}
      </h2>
      <p className="text-white/70 text-sm tracking-widest uppercase drop-shadow">{data.subtitle}</p>
      <GoldDivider color={accentColor} />
      <ul className="flex flex-col gap-3 mt-2">
        {data.points.map((point) => (
          <li key={point} className="flex items-center gap-3 text-white/90 text-lg drop-shadow">
            <span style={{ color: accentColor }}>◆</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FleetSlide({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6 max-w-2xl">
      <p className="text-xs tracking-[0.4em] uppercase drop-shadow" style={{ color: accentColor }}>
        Our Fleet
      </p>
      <h2 className="text-5xl font-light text-white drop-shadow-lg" style={{ fontFamily: "serif" }}>
        Premium Vehicles
      </h2>
      <GoldDivider color={accentColor} />
      <div className="grid grid-cols-2 gap-6 mt-2 w-full">
        {[
          { name: "Mercedes S-Class", cap: "3 passengers" },
          { name: "Cadillac Escalade ESV", cap: "6 passengers" },
          { name: "Chevrolet Suburban", cap: "6 passengers" },
          { name: "SUV Executive", cap: "6 passengers" },
        ].map((v) => (
          <div
            key={v.name}
            className="rounded-lg p-4 text-left backdrop-blur-sm"
            style={{
              border: `1px solid ${accentColor}40`,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <p className="text-white font-light text-base">{v.name}</p>
            <p className="text-white/50 text-xs mt-1">{v.cap}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function QRSlide({ bookingUrl, accentColor }: { bookingUrl: string; accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      <p className="text-xs tracking-[0.4em] uppercase drop-shadow" style={{ color: accentColor }}>
        Book Your Next Ride
      </p>
      <h2 className="text-4xl font-light text-white drop-shadow-lg" style={{ fontFamily: "serif" }}>
        Scan to Reserve
      </h2>
      <GoldDivider color={accentColor} />
      <div className="p-4 rounded-2xl mt-2 shadow-2xl" style={{ backgroundColor: "#fff" }}>
        <QRCodeSVG
          value={bookingUrl}
          size={200}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      <p className="text-white/60 text-sm max-w-xs drop-shadow">
        Scan with your phone camera to book instantly with guaranteed pricing
      </p>
      <p className="text-xs tracking-widest uppercase drop-shadow" style={{ color: accentColor }}>
        sottoventoluxuryride.com
      </p>
    </div>
  )
}

function LeadSlide({
  accentColor, name, phone, email,
  onName, onPhone, onEmail,
  onSubmit, submitting, submitted,
}: {
  accentColor: string
  name: string; phone: string; email: string
  onName: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onSubmit: () => void
  submitting: boolean
  submitted: boolean
}) {
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-6">
        <div className="text-5xl drop-shadow" style={{ color: accentColor }}>✓</div>
        <h2 className="text-4xl font-light text-white drop-shadow-lg" style={{ fontFamily: "serif" }}>
          Thank You
        </h2>
        <p className="text-white/70 text-lg drop-shadow">We will be in touch shortly.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-5 max-w-lg w-full">
      <p className="text-xs tracking-[0.4em] uppercase drop-shadow" style={{ color: accentColor }}>
        Stay Connected
      </p>
      <h2 className="text-4xl font-light text-white drop-shadow-lg" style={{ fontFamily: "serif" }}>
        Get Priority Access
      </h2>
      <p className="text-white/60 text-sm drop-shadow">
        Leave your info and receive exclusive offers & priority booking
      </p>
      <GoldDivider color={accentColor} />
      <div className="flex flex-col gap-3 w-full mt-2">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-base focus:outline-none focus:border-yellow-600/60"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-base focus:outline-none focus:border-yellow-600/60"
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-base focus:outline-none focus:border-yellow-600/60"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={submitting || (!name && !phone && !email)}
        className="w-full py-4 rounded-lg text-black font-medium tracking-widest uppercase text-sm mt-2 disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: accentColor }}
      >
        {submitting ? "Sending..." : "Submit"}
      </button>
    </div>
  )
}

function CrownSlide({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      <p className="text-xs tracking-[0.5em] uppercase text-white/50 drop-shadow">The</p>
      <h2
        className="text-6xl font-light text-white drop-shadow-lg"
        style={{ fontFamily: "serif", letterSpacing: "0.08em" }}
      >
        Crown Moment
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/70 text-xl font-light max-w-md leading-relaxed drop-shadow">
        Every journey is a statement. Every detail, intentional.
      </p>
      <p className="text-white/40 text-sm mt-4 tracking-widest uppercase drop-shadow">
        Sottovento Luxury Ride · Orlando
      </p>
    </div>
  )
}
