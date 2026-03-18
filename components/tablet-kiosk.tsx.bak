"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import Image from "next/image"

// ─────────────────────────────────────────────────────────────
// TabletKiosk — FINAL MASTER FINISHING BLOCK
//
// Architecture:
//   1. HERO         — full-screen luxury image + brand + Reserve Now
//   2. GRID         — 12 cards (3×4) in conversion priority order
//                     Service cards → booking flow (preselected destination)
//                     Experience cards → Crown Moment camera flow
//   3. QR BOOKING   — secondary: QR + phone + send link + get quote
//
// Brand: Black · Gold · White · Elegant typography
// Identity: Private Chauffeur · Uber Black · Executive Transport
//
// RULE: Tap = Action. No dead-end states.
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.sottoventoluxuryride.com"
const GOLD = "#C9A84C"

// ─── SECTION IDs ───────────────────────────────────────────
type SectionId = "hero" | "grid" | "booking" | "crown" | "qr"

const SECTIONS: SectionId[] = ["hero", "grid", "qr"]

const SECTION_DURATION: Record<SectionId, number> = {
  hero: 10000,
  grid: 90000,
  booking: 120000,
  crown: 120000,
  qr: 30000,
}

// ─── CARD DEFINITIONS ──────────────────────────────────────
type CardType = "service" | "experience"

interface GridCard {
  id: string
  type: CardType
  label: string
  sublabel: string
  photo: string
  accentHex: string
  destination?: string   // for service cards — preselects booking destination
  frameId?: CrownFrame   // for experience cards — opens Crown Moment with this frame
}

// 12 cards in conversion priority order (Section 15 of master block)
const GRID_CARDS: GridCard[] = [
  // ── TOP PRIORITY ROW ──────────────────────────────────────
  {
    id: "port-canaveral",
    type: "service",
    label: "Port Canaveral",
    sublabel: "Cruise Transfers",
    photo: "/images/tablet/port-canaveral-bg.jpg",
    accentHex: "#7ec8e3",
    destination: "Port Canaveral",
  },
  {
    id: "disney",
    type: "service",
    label: "Disney",
    sublabel: "Walt Disney World",
    photo: "/images/tablet/orlando-bg.jpg",
    accentHex: "#f0c040",
    destination: "Walt Disney World",
  },
  {
    id: "universal",
    type: "service",
    label: "Universal",
    sublabel: "Universal Orlando",
    photo: "/images/tablet/universal-bg.jpg",
    accentHex: "#60a0ff",
    destination: "Universal Orlando",
  },
  {
    id: "airport",
    type: "service",
    label: "Airport",
    sublabel: "MCO · Sanford",
    photo: "/images/tablet/airport-bg.jpg",
    accentHex: GOLD,
    destination: "Orlando Airport (MCO)",
  },
  // ── SECONDARY HIGH-VALUE ROW ──────────────────────────────
  {
    id: "capture-moment",
    type: "experience",
    label: "Capture Your Moment",
    sublabel: "Orlando Memory Photo",
    photo: "/images/tablet/family-car-bg.jpg",
    accentHex: GOLD,
    frameId: "sottovento",
  },
  {
    id: "miami",
    type: "service",
    label: "Miami",
    sublabel: "South Beach · Brickell",
    photo: "/images/tablet/corporate-bg.jpg",
    accentHex: GOLD,
    destination: "Miami",
  },
  {
    id: "clearwater",
    type: "service",
    label: "Clearwater Beach",
    sublabel: "Tampa Bay Area",
    photo: "/images/tablet/clearwater-bg.jpg",
    accentHex: "#7ec8e3",
    destination: "Clearwater Beach",
  },
  {
    id: "kennedy",
    type: "service",
    label: "Kennedy Space Center",
    sublabel: "Cape Canaveral",
    photo: "/images/tablet/kennedy-bg.jpg",
    accentHex: GOLD,
    destination: "Kennedy Space Center",
  },
  // ── THIRD ROW / SUPPORTING EXPERIENCE ─────────────────────
  {
    id: "idrive",
    type: "service",
    label: "International Drive",
    sublabel: "Dining & Entertainment",
    photo: "/images/tablet/idrive-bg.jpg",
    accentHex: "#f0c040",
    destination: "International Drive",
  },
  {
    id: "corporate",
    type: "service",
    label: "Corporate · Hourly",
    sublabel: "Executive Transport",
    photo: "/images/tablet/hourly-bg.jpg",
    accentHex: GOLD,
    destination: "Corporate / Hourly",
  },
  {
    id: "shopping",
    type: "service",
    label: "Shopping · Lifestyle",
    sublabel: "Premium Outings",
    photo: "/images/tablet/fleet-bg.jpg",
    accentHex: GOLD,
    destination: "Shopping / Lifestyle",
  },
  {
    id: "family-memory",
    type: "experience",
    label: "Family Memory Photo",
    sublabel: "Crown Moment",
    photo: "/images/tablet/crown-bg.jpg",
    accentHex: GOLD,
    frameId: "disney",
  },
]

// ─── CROWN MOMENT FRAMES ───────────────────────────────────
type CrownFrame = "sottovento" | "disney" | "universal" | "cruise"

const CROWN_FRAMES = [
  {
    id: "sottovento" as CrownFrame,
    label: "Classic Sottovento",
    sublabel: "Elegance & Prestige",
    bgColor: "#0a0a0a",
    accentHex: GOLD,
    headerText: "SOTTOVENTO LUXURY RIDE",
    footerText: "Orlando · Florida",
    bgImage: "/images/tablet/crown-bg.jpg",
  },
  {
    id: "disney" as CrownFrame,
    label: "Disney Family Trip",
    sublabel: "Walt Disney World Area",
    bgColor: "#3b0764",
    accentHex: "#f0c040",
    headerText: "Orlando Family Trip · Walt Disney World Area",
    footerText: "Sottovento Luxury Ride",
    bgImage: "/images/tablet/orlando-bg.jpg",
  },
  {
    id: "universal" as CrownFrame,
    label: "Universal Adventure",
    sublabel: "Universal Orlando",
    bgColor: "#0f2040",
    accentHex: "#60a0ff",
    headerText: "Universal Orlando Adventure",
    footerText: "Sottovento Luxury Ride",
    bgImage: "/images/tablet/universal-bg.jpg",
  },
  {
    id: "cruise" as CrownFrame,
    label: "Cruise Memories",
    sublabel: "Port Canaveral",
    bgColor: "#0a1a30",
    accentHex: "#7ec8e3",
    headerText: "Port Canaveral Cruise Memories",
    footerText: "Sottovento Luxury Ride",
    bgImage: "/images/tablet/port-canaveral-bg.jpg",
  },
]

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

interface TabletKioskProps {
  driverCode?: string | null
  operatorName?: string | null
}

export default function TabletKiosk({ driverCode, operatorName: propOperatorName }: TabletKioskProps) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [urlDriverCode, setUrlDriverCode] = useState<string | null>(null)
  const [tabletCode, setTabletCode] = useState<string | null>(null)
  const [urlOperatorName, setUrlOperatorName] = useState<string | null>(null)

  // Booking flow state
  const [bookingDestination, setBookingDestination] = useState<string | null>(null)

  // Crown Moment state
  const [crownFrameId, setCrownFrameId] = useState<CrownFrame | null>(null)

  // Lead form state
  const [leadName, setLeadName] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [leadSubmitting, setLeadSubmitting] = useState(false)

  const [showSafety, setShowSafety] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrlDriverCode(params.get("driver") ?? params.get("ref") ?? null)
    setTabletCode(params.get("tablet") ?? null)
    setUrlOperatorName(params.get("operator") ?? null)
  }, [])

  const effectiveOperatorName = propOperatorName ?? urlOperatorName
  const isSottovento = !effectiveOperatorName || effectiveOperatorName.toLowerCase().includes("sottovento")
  const effectiveDriverCode = driverCode ?? urlDriverCode

  const bookingUrl = (() => {
    const url = new URL(`${BASE_URL}/#booking`)
    if (effectiveDriverCode) url.searchParams.set("ref", effectiveDriverCode)
    if (tabletCode) url.searchParams.set("tablet", tabletCode)
    return url.toString()
  })()

  const currentSection = SECTIONS[sectionIndex]

  const advanceSection = useCallback(() => {
    setSectionIndex((prev) => (prev + 1) % SECTIONS.length)
  }, [])

  useEffect(() => {
    // Don't auto-advance during active booking or crown moment flows
    if (currentSection === "booking" || currentSection === "crown") return
    const duration = SECTION_DURATION[currentSection] ?? 10000
    timerRef.current = setTimeout(advanceSection, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sectionIndex, currentSection, advanceSection])

  const goToSection = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSectionIndex(index)
  }

  const goToGrid = () => {
    setBookingDestination(null)
    setCrownFrameId(null)
    goToSection(SECTIONS.indexOf("grid"))
  }

  // Card tap handler
  const handleCardTap = (card: GridCard) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (card.type === "service") {
      setBookingDestination(card.destination ?? null)
      setSectionIndex(SECTIONS.indexOf("grid")) // stay on grid section but show booking overlay
    } else {
      setCrownFrameId(card.frameId ?? "sottovento")
    }
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
          destination: bookingDestination,
        }),
      })
      setLeadSubmitted(true)
      setTimeout(() => {
        setLeadSubmitted(false)
        setLeadName("")
        setLeadPhone("")
        setLeadEmail("")
        setBookingDestination(null)
        goToGrid()
      }, 5000)
    } catch {
      setLeadSubmitted(true)
    } finally {
      setLeadSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden select-none"
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
      {/* ── SECTION CONTENT ── */}
      <div className="w-full h-full relative">

        {/* 1. HERO */}
        {currentSection === "hero" && (
          <HeroSection
            accentColor={GOLD}
            driverCode={effectiveDriverCode}
            operatorName={effectiveOperatorName}
            isSottovento={isSottovento}
            onReserve={() => goToSection(SECTIONS.indexOf("grid"))}
          />
        )}

        {/* 2. GRID — with booking/crown overlays */}
        {currentSection === "grid" && !bookingDestination && !crownFrameId && (
          <GridSection
            accentColor={GOLD}
            onCardTap={handleCardTap}
            onQR={() => goToSection(SECTIONS.indexOf("qr"))}
          />
        )}

        {/* BOOKING FLOW (overlay on grid section) */}
        {currentSection === "grid" && bookingDestination && (
          <BookingFlowSection
            accentColor={GOLD}
            destination={bookingDestination}
            bookingUrl={bookingUrl}
            name={leadName}
            phone={leadPhone}
            email={leadEmail}
            onName={setLeadName}
            onPhone={setLeadPhone}
            onEmail={setLeadEmail}
            onSubmit={submitLead}
            submitting={leadSubmitting}
            submitted={leadSubmitted}
            onBack={goToGrid}
          />
        )}

        {/* CROWN MOMENT FLOW (overlay on grid section) */}
        {currentSection === "grid" && crownFrameId && !bookingDestination && (
          <CrownMomentFlow
            accentColor={GOLD}
            initialFrameId={crownFrameId}
            onBack={goToGrid}
          />
        )}

        {/* 3. QR BOOKING */}
        {currentSection === "qr" && (
          <QRBookingSection
            accentColor={GOLD}
            bookingUrl={bookingUrl}
            name={leadName}
            phone={leadPhone}
            email={leadEmail}
            onName={setLeadName}
            onPhone={setLeadPhone}
            onEmail={setLeadEmail}
            onSubmit={submitLead}
            submitting={leadSubmitting}
            submitted={leadSubmitted}
            onBack={goToGrid}
          />
        )}
      </div>

      {/* ── SECTION DOTS ── */}
      {!bookingDestination && !crownFrameId && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-50">
          {SECTIONS.map((s, i) => (
            <button
              key={s}
              onClick={() => goToSection(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === sectionIndex ? 24 : 8,
                height: 8,
                backgroundColor:
                  i === sectionIndex ? GOLD : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}

      {/* ── TAP ZONES (only on non-interactive sections) ── */}
      {currentSection === "hero" && (
        <>
          <button
            className="absolute left-0 top-0 bottom-16 w-16 z-40 opacity-0"
            onClick={() => goToSection((sectionIndex - 1 + SECTIONS.length) % SECTIONS.length)}
          />
          <button
            className="absolute right-0 top-0 bottom-16 w-16 z-40 opacity-0"
            onClick={() => goToSection((sectionIndex + 1) % SECTIONS.length)}
          />
        </>
      )}

      {/* ── BRANDING WATERMARK ── */}
      <div
        className="absolute top-5 left-6 z-50 text-xs tracking-[0.3em] uppercase opacity-40"
        style={{ color: GOLD, fontFamily: "serif" }}
      >
        Sottovento
      </div>

      {/* ── DRIVER ATTRIBUTION ── */}
      {effectiveDriverCode && (
        <div
          className="absolute bottom-6 right-6 z-50 text-xs opacity-20 tracking-widest uppercase"
          style={{ color: GOLD }}
        >
          {effectiveDriverCode}
        </div>
      )}

      {/* ── SAFETY BUTTON (floating, always visible) ── */}
      <button
        onClick={() => setShowSafety(!showSafety)}
        className="absolute top-5 right-6 z-50 px-4 py-2 rounded-full text-xs tracking-widest uppercase font-medium transition-all"
        style={{
          backgroundColor: showSafety ? GOLD : "rgba(255,255,255,0.08)",
          color: showSafety ? "#000" : "rgba(255,255,255,0.5)",
          border: `1px solid ${showSafety ? GOLD : "rgba(255,255,255,0.15)"}`,
        }}
      >
        Safety
      </button>

      {/* Safety panel */}
      {showSafety && (
        <div
          className="absolute top-16 right-6 z-50 rounded-2xl p-6 w-72"
          style={{
            backgroundColor: "rgba(0,0,0,0.95)",
            border: `1px solid ${GOLD}40`,
          }}
        >
          <h3
            className="text-white text-lg font-light mb-3"
            style={{ fontFamily: "serif" }}
          >
            Trip Assistance
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Your safety is our priority. Contact us at any point during your ride.
          </p>
          <a
            href="tel:+14074001111"
            className="block w-full py-3 rounded-lg text-center text-sm font-medium tracking-widest uppercase mb-2"
            style={{ backgroundColor: GOLD, color: "#000" }}
          >
            Call Support
          </a>
          <button
            onClick={() => setShowSafety(false)}
            className="block w-full py-2 text-white/30 text-xs tracking-widest uppercase"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
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

function FullScreenPhoto({ src, overlay = 0.55 }: { src: string; overlay?: number }) {
  return (
    <div className="absolute inset-0 z-0">
      <Image
        src={src}
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${overlay})` }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 1. HERO SECTION
// ─────────────────────────────────────────────────────────────

function HeroSection({
  accentColor,
  driverCode,
  operatorName,
  isSottovento,
  onReserve,
}: {
  accentColor: string
  driverCode?: string | null
  operatorName?: string | null
  isSottovento: boolean
  onReserve: () => void
}) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      <FullScreenPhoto src="/images/tablet/airport-bg.jpg" overlay={0.50} />

      <div className="relative z-10 flex flex-col items-center gap-5 px-12">
        {/* Crown — minimal, small, not protagonist */}
        <svg
          width="28"
          height="22"
          viewBox="0 0 48 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.45 }}
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

        {isSottovento ? (
          <>
            <h1
              className="text-6xl md:text-7xl font-light text-white"
              style={{ fontFamily: "serif", letterSpacing: "0.05em" }}
            >
              Sottovento Luxury Ride
            </h1>
            <p
              className="text-lg tracking-[0.3em] uppercase"
              style={{ color: accentColor }}
            >
              Orlando Luxury Transportation
            </p>
          </>
        ) : (
          <>
            <h1
              className="text-6xl md:text-7xl font-light text-white"
              style={{ fontFamily: "serif", letterSpacing: "0.05em" }}
            >
              {operatorName}
            </h1>
            <p
              className="text-sm tracking-[0.25em] uppercase"
              style={{ color: accentColor, opacity: 0.75 }}
            >
              by Sottovento Network
            </p>
          </>
        )}

        <GoldDivider color={accentColor} />

        <p className="text-white/50 text-base tracking-widest uppercase">
          Private Chauffeur · Airport · Corporate · Hourly
        </p>

        {driverCode && (
          <p
            className="text-xs tracking-[0.4em] uppercase mt-1"
            style={{ color: accentColor, opacity: 0.5 }}
          >
            Driver · {driverCode}
          </p>
        )}

        <button
          onClick={onReserve}
          className="mt-6 px-12 py-4 rounded-full text-black font-medium tracking-[0.3em] uppercase text-sm transition-all active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          Reserve Now
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 2. GRID SECTION — 12 cards, 3×4, conversion priority order
// ─────────────────────────────────────────────────────────────

function GridSection({
  accentColor,
  onCardTap,
  onQR,
}: {
  accentColor: string
  onCardTap: (card: GridCard) => void
  onQR: () => void
}) {
  return (
    <div className="relative w-full h-full flex flex-col" style={{ backgroundColor: "#000" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-3 z-10">
        <div>
          <h2
            className="text-2xl font-light text-white"
            style={{ fontFamily: "serif", letterSpacing: "0.04em" }}
          >
            Where are you headed?
          </h2>
          <p className="text-xs tracking-[0.3em] uppercase mt-0.5" style={{ color: accentColor, opacity: 0.7 }}>
            Tap a destination to book your ride
          </p>
        </div>
        <button
          onClick={onQR}
          className="px-4 py-2 rounded-full text-xs tracking-widest uppercase border transition-all active:scale-95"
          style={{ borderColor: `${accentColor}50`, color: accentColor }}
        >
          Quick Book
        </button>
      </div>

      {/* 3×4 Grid */}
      <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-2 px-3 pb-14 overflow-hidden">
        {GRID_CARDS.map((card) => (
          <GridCard
            key={card.id}
            card={card}
            onTap={() => onCardTap(card)}
          />
        ))}
      </div>
    </div>
  )
}

function GridCard({ card, onTap }: { card: GridCard; onTap: () => void }) {
  const isExperience = card.type === "experience"

  return (
    <button
      onClick={onTap}
      className="relative rounded-xl overflow-hidden flex flex-col items-start justify-end text-left transition-all active:scale-95 active:brightness-110"
      style={{
        border: `1.5px solid ${card.accentHex}40`,
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Background photo */}
      <div className="absolute inset-0">
        <Image
          src={card.photo}
          alt={card.label}
          fill
          className="object-cover object-center"
          sizes="25vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background: isExperience
              ? `linear-gradient(to top, rgba(0,0,0,0.92) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.2))`
              : `linear-gradient(to top, rgba(0,0,0,0.88) 35%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.15))`,
          }}
        />
      </div>

      {/* Experience badge */}
      {isExperience && (
        <div
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs tracking-widest uppercase font-medium"
          style={{ backgroundColor: `${card.accentHex}30`, color: card.accentHex, border: `1px solid ${card.accentHex}50` }}
        >
          Photo
        </div>
      )}

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: `${card.accentHex}70` }}
      />

      {/* Text */}
      <div className="relative z-10 px-3 pb-3 w-full">
        <p
          className="text-white font-semibold text-sm leading-tight"
          style={{ fontFamily: "serif" }}
        >
          {card.label}
        </p>
        <p
          className="text-xs mt-0.5 leading-tight"
          style={{ color: `${card.accentHex}cc` }}
        >
          {card.sublabel}
        </p>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// BOOKING FLOW SECTION
// Opens when a service card is tapped — destination preselected
// ─────────────────────────────────────────────────────────────

function BookingFlowSection({
  accentColor,
  destination,
  bookingUrl,
  name,
  phone,
  email,
  onName,
  onPhone,
  onEmail,
  onSubmit,
  submitting,
  submitted,
  onBack,
}: {
  accentColor: string
  destination: string
  bookingUrl: string
  name: string
  phone: string
  email: string
  onName: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onSubmit: () => void
  submitting: boolean
  submitted: boolean
  onBack: () => void
}) {
  // Auto-return after success
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(onBack, 5000)
      return () => clearTimeout(t)
    }
  }, [submitted, onBack])

  // Auto-return after 2 min inactivity
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(onBack, 120000)
  }, [onBack])

  useEffect(() => {
    resetInactivity()
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [resetInactivity])

  if (submitted) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center text-center" style={{ backgroundColor: "#000" }}>
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl" style={{ color: accentColor }}>✓</div>
          <h2
            className="text-4xl font-light text-white"
            style={{ fontFamily: "serif" }}
          >
            Request Sent
          </h2>
          <p className="text-white/50 text-lg">We will be in touch shortly.</p>
          <p className="text-white/30 text-sm">Returning to menu in 5 seconds...</p>
        </div>
      </div>
    )
  }

  const fullBookingUrl = `${bookingUrl}&destination=${encodeURIComponent(destination)}`

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ backgroundColor: "#000" }}
      onTouchStart={resetInactivity}
      onClick={resetInactivity}
    >
      <div className="relative z-10 flex flex-col items-center gap-5 px-10 max-w-2xl w-full">
        {/* Back */}
        <button
          onClick={onBack}
          className="self-start text-white/40 text-xs tracking-widest uppercase mb-2 active:text-white/70"
        >
          ← Back
        </button>

        <p
          className="text-xs tracking-[0.4em] uppercase self-start"
          style={{ color: accentColor }}
        >
          Book Your Ride
        </p>
        <h2
          className="text-4xl font-light text-white self-start"
          style={{ fontFamily: "serif" }}
        >
          {destination}
        </h2>
        <GoldDivider color={accentColor} />

        {/* Two-column layout: QR left, form right */}
        <div className="flex gap-8 w-full items-start mt-2">
          {/* QR code */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#fff" }}>
              <QRCodeSVG
                value={fullBookingUrl}
                size={150}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
            <p
              className="text-xs tracking-widest uppercase text-center"
              style={{ color: accentColor }}
            >
              Scan to Book
            </p>
          </div>

          {/* Lead form */}
          <div className="flex flex-col gap-3 flex-1">
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => { onPhone(e.target.value); resetInactivity() }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
            />
            <button
              onClick={onSubmit}
              disabled={submitting || !phone}
              className="w-full py-3 rounded-lg text-black font-medium tracking-widest uppercase text-xs disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? "Sending..." : "Send Link"}
            </button>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => { onName(e.target.value); resetInactivity() }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => { onEmail(e.target.value); resetInactivity() }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
            />
            <button
              onClick={onSubmit}
              disabled={submitting || (!name && !phone && !email)}
              className="w-full py-3 rounded-lg font-medium tracking-widest uppercase text-xs disabled:opacity-40 transition-opacity"
              style={{
                backgroundColor: "transparent",
                color: accentColor,
                border: `1px solid ${accentColor}`,
              }}
            >
              Get Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CROWN MOMENT FLOW
// Opens when an experience card is tapped
// ─────────────────────────────────────────────────────────────

function CrownMomentFlow({
  accentColor,
  initialFrameId,
  onBack,
}: {
  accentColor: string
  initialFrameId: CrownFrame
  onBack: () => void
}) {
  const [selectedFrame, setSelectedFrame] = useState<CrownFrame>(initialFrameId)
  const [inCamera, setInCamera] = useState(false)

  // Auto-return after 2 min inactivity
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(onBack, 120000)
  }, [onBack])

  useEffect(() => {
    resetInactivity()
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [resetInactivity])

  if (inCamera) {
    const frame = CROWN_FRAMES.find((f) => f.id === selectedFrame)!
    return (
      <CrownCamera
        accentColor={accentColor}
        frame={frame}
        onBack={() => { setInCamera(false); resetInactivity() }}
        onDone={onBack}
        onActivity={resetInactivity}
      />
    )
  }

  return (
    <div
      className="relative w-full h-full flex flex-col"
      style={{ backgroundColor: "#000" }}
      onTouchStart={resetInactivity}
      onClick={resetInactivity}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-5 left-6 z-20 text-white/40 text-xs tracking-widest uppercase active:text-white/70"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col items-center pt-12 pb-4 gap-1 z-10">
        <p className="text-xs tracking-[0.5em] uppercase" style={{ color: accentColor }}>
          Crown Moment
        </p>
        <h2
          className="text-4xl font-light text-white"
          style={{ fontFamily: "serif", letterSpacing: "0.06em" }}
        >
          Choose Your Memory
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Complimentary Orlando Family Photo
        </p>
      </div>

      {/* 2×2 Frame grid */}
      <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-16 overflow-hidden">
        {CROWN_FRAMES.map((frame) => (
          <button
            key={frame.id}
            onClick={() => { setSelectedFrame(frame.id); setInCamera(true) }}
            className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-end text-center transition-all active:scale-95"
            style={{
              border: `2px solid ${frame.accentHex}60`,
              backgroundColor: frame.bgColor,
            }}
          >
            {/* Background photo */}
            <div className="absolute inset-0">
              <Image
                src={frame.bgImage}
                alt={frame.label}
                fill
                className="object-cover object-center opacity-40"
                sizes="50vw"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, ${frame.bgColor}ee 30%, ${frame.bgColor}88 70%, transparent)`,
                }}
              />
            </div>

            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: frame.accentHex }} />

            {/* Corner ornaments */}
            <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 rounded-tl" style={{ borderColor: frame.accentHex }} />
            <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 rounded-tr" style={{ borderColor: frame.accentHex }} />
            <div className="absolute bottom-12 left-3 w-5 h-5 border-b-2 border-l-2 rounded-bl" style={{ borderColor: frame.accentHex }} />
            <div className="absolute bottom-12 right-3 w-5 h-5 border-b-2 border-r-2 rounded-br" style={{ borderColor: frame.accentHex }} />

            {/* Text */}
            <div className="relative z-10 px-4 pb-4">
              <p className="text-base font-semibold" style={{ color: frame.accentHex, fontFamily: "serif" }}>
                {frame.label}
              </p>
              <p className="text-white/50 text-xs mt-0.5">{frame.sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CROWN CAMERA — real device camera with themed frame overlay
// ─────────────────────────────────────────────────────────────

function CrownCamera({
  accentColor,
  frame,
  onBack,
  onDone,
  onActivity,
}: {
  accentColor: string
  frame: (typeof CROWN_FRAMES)[0]
  onBack: () => void
  onDone: () => void
  onActivity: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => { if (active) setCameraReady(true) }).catch(() => {})
        }
      })
      .catch(() => { if (active) setCameraError(true) })
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startCountdown = () => {
    onActivity()
    setCountdown(3)
    let c = 3
    const iv = setInterval(() => {
      c--
      if (c <= 0) {
        clearInterval(iv)
        setCountdown(null)
        capturePhoto()
      } else {
        setCountdown(c)
      }
    }, 1000)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth || 640
    c.height = v.videoHeight || 480
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.drawImage(v, 0, 0)
    setPhotoDataUrl(c.toDataURL("image/jpeg", 0.92))
  }

  const retake = () => { setPhotoDataUrl(null); onActivity() }

  const share = async () => {
    if (!photoDataUrl) return
    onActivity()
    setShowShareModal(true)
  }

  const doNativeShare = async () => {
    if (!photoDataUrl) return
    try {
      const blob = await (await fetch(photoDataUrl)).blob()
      const file = new File([blob], "sottovento-crown-moment.jpg", { type: "image/jpeg" })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Crown Moment — Sottovento Luxury Ride" })
      } else {
        const a = document.createElement("a")
        a.href = photoDataUrl
        a.download = "sottovento-crown-moment.jpg"
        a.click()
      }
    } catch {}
    setShowShareModal(false)
  }

  const doSaveOnly = () => {
    if (!photoDataUrl) return
    const a = document.createElement("a")
    a.href = photoDataUrl
    a.download = "sottovento-crown-moment.jpg"
    a.click()
    setShowShareModal(false)
  }

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ backgroundColor: "#000" }}
      onTouchStart={onActivity}
    >
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-5 left-6 z-20 text-white/40 text-xs tracking-widest uppercase active:text-white/70"
      >
        ← Back
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center pb-12" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ backgroundColor: "#111", border: `1px solid ${frame.accentHex}40` }}>
            <div className="p-6 text-center">
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: frame.accentHex }}>Crown Moment</p>
              <h3 className="text-xl font-light text-white mb-4" style={{ fontFamily: "serif" }}>Share Your Memory</h3>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-6">
              <button
                onClick={doNativeShare}
                className="w-full py-4 rounded-2xl text-black font-medium tracking-widest uppercase text-sm"
                style={{ backgroundColor: frame.accentHex }}
              >
                Share / AirDrop
              </button>
              <button
                onClick={doSaveOnly}
                className="w-full py-4 rounded-2xl text-sm tracking-widest uppercase"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
              >
                Save to Camera Roll
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 text-xs tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frame container — fullscreen on mobile */}
      <div
        className="relative flex flex-col items-center overflow-hidden"
        style={{
          border: `4px solid ${frame.accentHex}`,
          borderRadius: 16,
          backgroundColor: frame.bgColor,
          maxWidth: 460,
          width: "88%",
          maxHeight: "80vh",
        }}
      >
        {/* Top accent bar */}
        <div className="w-full h-1" style={{ backgroundColor: frame.accentHex }} />

        {/* Frame header */}
        <div
          className="w-full text-center py-2 text-xs tracking-widest uppercase font-semibold px-4"
          style={{ color: frame.accentHex, fontFamily: "serif" }}
        >
          {frame.headerText}
        </div>

        {/* Camera / Photo area */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "4/3", backgroundColor: "#111" }}
        >
          {/* Live video */}
          {!photoDataUrl && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
          )}

          {/* Captured photo */}
          {photoDataUrl && (
            <img
              src={photoDataUrl}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Camera error state */}
          {cameraError && !photoDataUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={frame.accentHex} strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="red" strokeWidth="2" />
              </svg>
              <p className="text-white/40 text-xs tracking-widest uppercase text-center px-4">
                Camera unavailable — check permissions
              </p>
            </div>
          )}

          {/* Loading state */}
          {!cameraReady && !cameraError && !photoDataUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${frame.accentHex} transparent transparent transparent` }}
              />
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span
                className="text-8xl font-bold"
                style={{ color: frame.accentHex, fontFamily: "serif" }}
              >
                {countdown}
              </span>
            </div>
          )}

          {/* Corner ornaments overlay on live view */}
          {!photoDataUrl && (
            <>
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: `${frame.accentHex}80` }} />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: `${frame.accentHex}80` }} />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: `${frame.accentHex}80` }} />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: `${frame.accentHex}80` }} />
            </>
          )}
        </div>

        {/* Frame footer */}
        <div
          className="w-full text-center py-1.5 text-xs tracking-widest uppercase opacity-60"
          style={{ color: frame.accentHex }}
        >
          {frame.footerText}
        </div>

        {/* Bottom accent bar */}
        <div className="w-full h-0.5" style={{ backgroundColor: `${frame.accentHex}60` }} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4 mt-5">
        {!photoDataUrl ? (
          <button
            onClick={startCountdown}
            disabled={!cameraReady || countdown !== null}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
            style={{ backgroundColor: frame.accentHex }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        ) : (
          <>
            <button
              onClick={retake}
              className="px-6 py-3 rounded-full text-xs tracking-widest uppercase border transition-all active:scale-95"
              style={{ borderColor: frame.accentHex, color: frame.accentHex }}
            >
              Retake
            </button>
            <button
              onClick={share}
              className="px-8 py-3 rounded-full text-xs tracking-widest uppercase font-semibold transition-all active:scale-95"
              style={{ backgroundColor: frame.accentHex, color: "#000" }}
            >
              Save / Share
            </button>
            <button
              onClick={onDone}
              className="px-6 py-3 rounded-full text-xs tracking-widest uppercase border transition-all active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)" }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// QR BOOKING SECTION (secondary — accessible via Quick Book btn)
// ─────────────────────────────────────────────────────────────

function QRBookingSection({
  accentColor,
  bookingUrl,
  name,
  phone,
  email,
  onName,
  onPhone,
  onEmail,
  onSubmit,
  submitting,
  submitted,
  onBack,
}: {
  accentColor: string
  bookingUrl: string
  name: string
  phone: string
  email: string
  onName: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onSubmit: () => void
  submitting: boolean
  submitted: boolean
  onBack: () => void
}) {
  if (submitted) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
        <FullScreenPhoto src="/images/tablet/qr-bg.jpg" overlay={0.65} />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="text-5xl" style={{ color: accentColor }}>✓</div>
          <h2
            className="text-4xl font-light text-white"
            style={{ fontFamily: "serif" }}
          >
            Thank You
          </h2>
          <p className="text-white/50 text-lg">We will be in touch shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <FullScreenPhoto src="/images/tablet/qr-bg.jpg" overlay={0.65} />
      <div className="relative z-10 flex flex-col items-center gap-5 px-10 max-w-2xl w-full">
        {/* Back */}
        <button
          onClick={onBack}
          className="self-start text-white/40 text-xs tracking-widest uppercase mb-2 active:text-white/70"
        >
          ← Back
        </button>

        <p
          className="text-xs tracking-[0.4em] uppercase self-start"
          style={{ color: accentColor }}
        >
          Quick Booking
        </p>
        <h2
          className="text-4xl font-light text-white self-start"
          style={{ fontFamily: "serif" }}
        >
          Scan or send link to book instantly
        </h2>
        <GoldDivider color={accentColor} />

        {/* Two-column layout: QR left, form right */}
        <div className="flex gap-8 w-full items-start mt-2">
          {/* QR code */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#fff" }}>
              <QRCodeSVG
                value={bookingUrl}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: accentColor }}
            >
              sottoventoluxuryride.com
            </p>
          </div>

          {/* Lead form */}
          <div className="flex flex-col gap-3 flex-1">
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
            />
            <div className="flex gap-2">
              <button
                onClick={onSubmit}
                disabled={submitting || !phone}
                className="flex-1 py-3 rounded-lg text-black font-medium tracking-widest uppercase text-xs disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? "Sending..." : "Send Link"}
              </button>
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => onName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
            />
            <button
              onClick={onSubmit}
              disabled={submitting || (!name && !phone && !email)}
              className="w-full py-3 rounded-lg font-medium tracking-widest uppercase text-xs disabled:opacity-40 transition-opacity"
              style={{
                backgroundColor: "transparent",
                color: accentColor,
                border: `1px solid ${accentColor}`,
              }}
            >
              Get Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
