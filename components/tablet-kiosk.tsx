"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import Image from "next/image"

// ─────────────────────────────────────────────────────────────
// TabletKiosk — luxury chauffeur kiosk experience
// Structure: 8 slides, cinematic full-screen photos, text overlay
// Brand identity: Uber Black · Private Chauffeur · Executive Transport
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.sottoventoluxuryride.com"

type Slide = {
  id: string
  type: "welcome" | "service" | "qr" | "fleet" | "lead" | "crown"
  bg: string
  photo: string
  accent: string
}

const SLIDES: Slide[] = [
  { id: "welcome",    type: "welcome",  bg: "bg-black",       photo: "/images/tablet/crown-bg.jpg",     accent: "#C9A84C" },
  { id: "airport",   type: "service",  bg: "bg-zinc-950",    photo: "/images/tablet/airport-bg.jpg",   accent: "#C9A84C" },
  { id: "corporate", type: "service",  bg: "bg-neutral-950", photo: "/images/tablet/corporate-bg.jpg", accent: "#C9A84C" },
  { id: "hourly",    type: "service",  bg: "bg-stone-950",   photo: "/images/tablet/hourly-bg.jpg",    accent: "#C9A84C" },
  { id: "fleet",     type: "fleet",    bg: "bg-black",       photo: "/images/tablet/fleet-bg.jpg",     accent: "#C9A84C" },
  { id: "qr-book",   type: "qr",       bg: "bg-zinc-950",    photo: "/images/tablet/qr-bg.jpg",        accent: "#C9A84C" },
  { id: "lead",      type: "lead",     bg: "bg-black",       photo: "/images/tablet/lead-bg.jpg",      accent: "#C9A84C" },
  { id: "crown",     type: "crown",    bg: "bg-black",       photo: "/images/tablet/crown-bg.jpg",     accent: "#C9A84C" },
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrlDriverCode(params.get("driver") ?? params.get("ref") ?? null)
    setTabletCode(params.get("tablet") ?? null)
  }, [])

  const effectiveDriverCode = driverCode ?? urlDriverCode

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
      className={`fixed inset-0 ${slide.bg} overflow-hidden select-none`}
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
      }}
    >
      {/* Cinematic full-screen background photo with crossfade */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0, zIndex: 0 }}
        >
          <Image
            src={s.photo}
            alt=""
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Dark cinematic overlay — preserves luxury feel */}
          <div
            className="absolute inset-0"
            style={{
              background:
                s.type === "welcome" || s.type === "crown"
                  ? "rgba(0,0,0,0.45)"
                  : "rgba(0,0,0,0.62)",
            }}
          />
        </div>
      ))}

      {/* Slide content — text as overlay */}
      <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
        {slide.type === "welcome" && (
          <WelcomeSlide accentColor={slide.accent} driverCode={effectiveDriverCode} />
        )}
        {slide.type === "service" && (
          <ServiceSlide id={slide.id} accentColor={slide.accent} />
        )}
        {slide.type === "fleet" && <FleetSlide accentColor={slide.accent} />}
        {slide.type === "qr" && (
          <QRSlide bookingUrl={bookingUrl} accentColor={slide.accent} />
        )}
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
              backgroundColor:
                i === current ? slide.accent : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>

      {/* Tap zones — left/right navigation */}
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
        className="absolute top-5 left-6 z-50 text-xs tracking-[0.3em] uppercase opacity-40"
        style={{ color: slide.accent, fontFamily: "serif" }}
      >
        Sottovento
      </div>

      {/* Driver attribution badge */}
      {effectiveDriverCode && (
        <div
          className="absolute bottom-6 right-6 z-50 text-xs opacity-20 tracking-widest uppercase"
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

function WelcomeSlide({
  accentColor,
  driverCode,
}: {
  accentColor: string
  driverCode?: string | null
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      {/* Crown icon */}
      <svg
        width="48"
        height="36"
        viewBox="0 0 48 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.9 }}
      >
        <path
          d="M4 32L8 12L18 22L24 4L30 22L40 12L44 32H4Z"
          stroke={accentColor}
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <line x1="4" y1="32" x2="44" y2="32" stroke={accentColor} strokeWidth="1.5" />
      </svg>
      <p className="text-xs tracking-[0.5em] uppercase text-white/40">Welcome aboard</p>
      <h1
        className="text-6xl md:text-7xl font-light text-white"
        style={{ fontFamily: "serif", letterSpacing: "0.05em" }}
      >
        Sottovento
      </h1>
      <GoldDivider color={accentColor} />
      <p className="text-xl text-white/60 font-light tracking-wide">
        Luxury Transportation · Orlando
      </p>
      <p className="text-sm text-white/30 mt-4 max-w-md leading-relaxed">
        Sit back and enjoy the journey. Your comfort is our only priority.
      </p>
      {driverCode && (
        <p className="text-xs tracking-[0.4em] uppercase mt-2" style={{ color: accentColor, opacity: 0.5 }}>
          Driver · {driverCode}
        </p>
      )}
    </div>
  )
}

const SERVICE_DATA: Record<
  string,
  { title: string; subtitle: string; points: string[] }
> = {
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

function ServiceSlide({
  id,
  accentColor,
}: {
  id: string
  accentColor: string
}) {
  const data = SERVICE_DATA[id]
  if (!data) return null
  return (
    <div className="flex flex-col items-center justify-center text-center px-16 gap-5 max-w-2xl">
      <p
        className="text-xs tracking-[0.4em] uppercase"
        style={{ color: accentColor }}
      >
        Our Services
      </p>
      <h2
        className="text-5xl font-light text-white"
        style={{ fontFamily: "serif" }}
      >
        {data.title}
      </h2>
      <p className="text-white/40 text-sm tracking-widest uppercase">
        {data.subtitle}
      </p>
      <GoldDivider color={accentColor} />
      <ul className="flex flex-col gap-3 mt-2">
        {data.points.map((point) => (
          <li
            key={point}
            className="flex items-center gap-3 text-white/70 text-lg"
          >
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
      <p
        className="text-xs tracking-[0.4em] uppercase"
        style={{ color: accentColor }}
      >
        Our Fleet
      </p>
      <h2
        className="text-5xl font-light text-white"
        style={{ fontFamily: "serif" }}
      >
        Premium Vehicles
      </h2>
      <GoldDivider color={accentColor} />
      <div className="grid grid-cols-2 gap-4 mt-2 w-full max-w-sm">
        {[
          { name: "Cadillac Escalade", cap: "Up to 6 passengers" },
          { name: "Mercedes S-Class", cap: "Up to 3 passengers" },
          { name: "Lincoln Navigator", cap: "Up to 6 passengers" },
          { name: "SUV Executive", cap: "Up to 6 passengers" },
        ].map((v) => (
          <div
            key={v.name}
            className="border rounded-lg p-4 text-left"
            style={{ borderColor: `${accentColor}30` }}
          >
            <p className="text-white font-light text-base">{v.name}</p>
            <p className="text-white/40 text-xs mt-1">{v.cap}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function QRSlide({
  bookingUrl,
  accentColor,
}: {
  bookingUrl: string
  accentColor: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      <p
        className="text-xs tracking-[0.4em] uppercase"
        style={{ color: accentColor }}
      >
        Book Your Next Ride
      </p>
      <h2
        className="text-4xl font-light text-white"
        style={{ fontFamily: "serif" }}
      >
        Scan to Reserve
      </h2>
      <GoldDivider color={accentColor} />
      <div className="p-4 rounded-2xl mt-2" style={{ backgroundColor: "#fff" }}>
        <QRCodeSVG
          value={bookingUrl}
          size={200}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      <p className="text-white/40 text-sm max-w-xs">
        Scan with your phone camera to book instantly with guaranteed pricing
      </p>
      <p
        className="text-xs tracking-widest uppercase"
        style={{ color: accentColor }}
      >
        sottoventoluxuryride.com
      </p>
    </div>
  )
}

function LeadSlide({
  accentColor,
  name,
  phone,
  email,
  onName,
  onPhone,
  onEmail,
  onSubmit,
  submitting,
  submitted,
}: {
  accentColor: string
  name: string
  phone: string
  email: string
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
        <div className="text-5xl" style={{ color: accentColor }}>
          ✓
        </div>
        <h2
          className="text-4xl font-light text-white"
          style={{ fontFamily: "serif" }}
        >
          Thank You
        </h2>
        <p className="text-white/50 text-lg">We will be in touch shortly.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-5 max-w-lg w-full">
      <p
        className="text-xs tracking-[0.4em] uppercase"
        style={{ color: accentColor }}
      >
        Stay Connected
      </p>
      <h2
        className="text-4xl font-light text-white"
        style={{ fontFamily: "serif" }}
      >
        Get Priority Access
      </h2>
      <p className="text-white/40 text-sm">
        Leave your info and receive exclusive offers & priority booking
      </p>
      <GoldDivider color={accentColor} />
      <div className="flex flex-col gap-3 w-full mt-2">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
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
      <p className="text-xs tracking-[0.5em] uppercase text-white/30">The</p>
      <h2
        className="text-6xl font-light text-white"
        style={{ fontFamily: "serif", letterSpacing: "0.08em" }}
      >
        Crown Moment
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/50 text-xl font-light max-w-md leading-relaxed">
        Every journey is a statement. Every detail, intentional.
      </p>
      <p className="text-white/25 text-sm mt-4 tracking-widest uppercase">
        Sottovento Luxury Ride · Orlando
      </p>
    </div>
  )
}
