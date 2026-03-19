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

// 12 cards in conversion priority order
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
    // Approved frame PNG from kiosk — used as overlay on camera and composited into final photo
    frameImage: "/images/frames/frame-classic.png",
    // This frame supports dynamic branding (company name replaces hardcoded text)
    dynamicBranding: true,
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
    frameImage: "/images/frames/frame-disney.png",
    dynamicBranding: false,
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
    frameImage: "/images/frames/frame-universal.png",
    dynamicBranding: false,
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
    frameImage: "/images/frames/frame-cruise.png",
    dynamicBranding: false,
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
  const [leadDate, setLeadDate] = useState("")
  const [leadTime, setLeadTime] = useState("")
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

  const goBack = () => {
    // Reliable back: always go to grid, never rely on history.back()
    if (bookingDestination || crownFrameId) {
      goToGrid()
    } else if (sectionIndex > 0) {
      goToSection(sectionIndex - 1)
    } else {
      goToSection(0)
    }
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
          pickup_date: leadDate || undefined,
          pickup_time: leadTime || undefined,
        }),
      })
      setLeadSubmitted(true)
      setTimeout(() => {
        setLeadSubmitted(false)
        setLeadName("")
        setLeadPhone("")
        setLeadEmail("")
        setLeadDate("")
        setLeadTime("")
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
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
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
            date={leadDate}
            time={leadTime}
            onName={setLeadName}
            onPhone={setLeadPhone}
            onEmail={setLeadEmail}
            onDate={setLeadDate}
            onTime={setLeadTime}
            onSubmit={submitLead}
            submitting={leadSubmitting}
            submitted={leadSubmitted}
            onBack={goBack}
          />
        )}

        {/* CROWN MOMENT FLOW (overlay on grid section) */}
        {currentSection === "grid" && crownFrameId && !bookingDestination && (
          <CrownMomentFlow
            accentColor={GOLD}
            initialFrameId={crownFrameId}
            onBack={goBack}
            companyName={effectiveOperatorName}
            isSottovento={isSottovento}
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
            date={leadDate}
            time={leadTime}
            onName={setLeadName}
            onPhone={setLeadPhone}
            onEmail={setLeadEmail}
            onDate={setLeadDate}
            onTime={setLeadTime}
            onSubmit={submitLead}
            submitting={leadSubmitting}
            submitted={leadSubmitted}
            onBack={goBack}
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

      {/* ── BRANDING WATERMARK — hidden during Crown Moment ── */}
      {!crownFrameId && (
        <div
          className="absolute z-50 text-xs tracking-[0.3em] uppercase opacity-40"
          style={{
            color: GOLD,
            fontFamily: "serif",
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
            left: "24px",
          }}
        >
          Sottovento
        </div>
      )}

      {/* ── DRIVER ATTRIBUTION — hidden during Crown Moment ── */}
      {effectiveDriverCode && !crownFrameId && (
        <div
          className="absolute bottom-6 right-6 z-50 text-xs opacity-20 tracking-widest uppercase"
          style={{ color: GOLD }}
        >
          {effectiveDriverCode}
        </div>
      )}

      {/* ── HEADER BUTTONS: Quick Book (primary) + Safety (secondary) — hidden during Crown Moment ── */}
      {!crownFrameId && (
      <div
        className="absolute z-50 flex items-center gap-2"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 10px)",
          right: "16px",
        }}
      >
        {/* Quick Book — PRIMARY */}
        {!bookingDestination && !crownFrameId && (
          <button
            onClick={() => goToSection(SECTIONS.indexOf("qr"))}
            className="px-4 py-2 rounded-full text-xs tracking-widest uppercase font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: GOLD,
              color: "#000",
            }}
          >
            Quick Book
          </button>
        )}

        {/* Safety — SECONDARY */}
        <button
          onClick={() => setShowSafety(!showSafety)}
          className="px-4 py-2 rounded-full text-xs tracking-widest uppercase font-medium transition-all active:scale-95"
          style={{
            backgroundColor: showSafety ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
            color: showSafety ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
            border: `1px solid ${showSafety ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"}`,
          }}
        >
           Safety
        </button>
      </div>
      )}
      {/* Safety panel */}
      {showSafety && (
        <div
          className="absolute z-50 rounded-2xl p-6 w-72"
          style={{
            backgroundColor: "rgba(0,0,0,0.95)",
            border: `1px solid ${GOLD}40`,
            top: "calc(env(safe-area-inset-top, 0px) + 52px)",
            right: "16px",
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
      </div>

      {/* 3×4 Grid */}
      <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-2 px-3 pb-14 overflow-hidden">
        {GRID_CARDS.map((card) => (
          <GridCardItem
            key={card.id}
            card={card}
            onTap={() => onCardTap(card)}
          />
        ))}
      </div>
    </div>
  )
}

function GridCardItem({ card, onTap }: { card: GridCard; onTap: () => void }) {
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
  date,
  time,
  onName,
  onPhone,
  onEmail,
  onDate,
  onTime,
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
  date: string
  time: string
  onName: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onDate: (v: string) => void
  onTime: (v: string) => void
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
      className="relative w-full h-full flex flex-col"
      style={{ backgroundColor: "#000" }}
      onTouchStart={resetInactivity}
      onClick={resetInactivity}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center gap-4 px-8 pt-6 pb-8 max-w-2xl mx-auto w-full">
          {/* Back */}
          <button
            onClick={onBack}
            className="self-start text-white/50 text-sm tracking-widest uppercase mb-1 active:text-white/80 flex items-center gap-2"
          >
            <span>←</span>
            <span>Back</span>
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
          <div className="flex gap-6 w-full items-start mt-1">
            {/* QR code */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#fff" }}>
                <QRCodeSVG
                  value={fullBookingUrl}
                  size={140}
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
              {/* Date & Time row */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { onDate(e.target.value); resetInactivity() }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white text-base focus:outline-none focus:border-yellow-600/50"
                  style={{ colorScheme: "dark" }}
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => { onTime(e.target.value); resetInactivity() }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white text-base focus:outline-none focus:border-yellow-600/50"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => { onName(e.target.value); resetInactivity() }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => { onPhone(e.target.value); resetInactivity() }}
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
                className="w-full py-4 rounded-lg text-black font-semibold tracking-widest uppercase text-sm disabled:opacity-40 transition-opacity active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? "Sending..." : "Get Quote"}
              </button>
              {phone && (
                <button
                  onClick={onSubmit}
                  disabled={submitting || !phone}
                  className="w-full py-3 rounded-lg font-medium tracking-widest uppercase text-xs disabled:opacity-40 transition-opacity"
                  style={{
                    backgroundColor: "transparent",
                    color: accentColor,
                    border: `1px solid ${accentColor}60`,
                  }}
                >
                  {submitting ? "Sending..." : "Send Booking Link"}
                </button>
              )}
            </div>
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
  companyName,
  isSottovento,
}: {
  accentColor: string
  initialFrameId: CrownFrame
  onBack: () => void
  companyName?: string | null
  isSottovento?: boolean
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
        companyName={companyName}
        isSottovento={isSottovento ?? true}
      />
    )
  }

  return (
    <div
      className="relative w-full h-full flex flex-col"
      style={{
        background: "radial-gradient(circle at center, rgba(255,215,120,0.06) 0%, rgba(10,10,12,0.99) 60%, rgba(0,0,0,1) 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxSizing: "border-box" as const,
      }}
      onTouchStart={resetInactivity}
      onClick={resetInactivity}
    >
      {/* Back — quiet, secondary */}
      <button
        onClick={onBack}
        className="absolute z-20 text-white/40 text-xs tracking-widest uppercase active:text-white/70 flex items-center gap-1"
        style={{ top: "calc(env(safe-area-inset-top) + 16px)", left: "20px" }}
      >
        <span>←</span>
        <span>Back</span>
      </button>

      {/* Header — compact, not competing with frames */}
      <div className="flex-shrink-0 flex flex-col items-center pt-10 pb-3 gap-1 z-10">
        <p className="text-xs tracking-[0.5em] uppercase" style={{ color: accentColor }}>
          Crown Moment
        </p>
        <h2
          className="text-3xl font-light text-white"
          style={{ fontFamily: "serif", letterSpacing: "0.06em" }}
        >
          Choose Your Memory
        </h2>
        <p className="text-white/35 text-xs mt-0.5 tracking-wider">
          Complimentary Orlando Family Photo
        </p>
      </div>

      {/* 2×2 Frame grid — frames are the hero, fill available space */}
      <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-6 overflow-hidden">
        {CROWN_FRAMES.map((frame) => (
          <button
            key={frame.id}
            onClick={() => { setSelectedFrame(frame.id); setInCamera(true) }}
            className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center text-center transition-all active:scale-95"
            style={{
              border: `1.5px solid ${frame.accentHex}50`,
              backgroundColor: frame.bgColor,
              boxShadow: `0 0 20px ${frame.accentHex}15`,
            }}
          >
            {/* Real approved frame PNG as thumbnail — object-contain to show full frame */}
            <div className="absolute inset-0">
              <Image
                src={frame.frameImage}
                alt={frame.label}
                fill
                className="object-contain object-center"
                sizes="50vw"
              />
            </div>

            {/* Bottom label overlay — subtle, does not obscure frame art */}
            <div
              className="absolute bottom-0 left-0 right-0 px-3 py-2 z-10"
              style={{ background: `linear-gradient(to top, ${frame.bgColor}f0 50%, transparent)` }}
            >
              <p className="text-sm font-semibold" style={{ color: frame.accentHex, fontFamily: "serif" }}>
                {frame.label}
              </p>
              <p className="text-white/45 text-xs">{frame.sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CROWN CAMERA — real device camera with themed frame overlay
// No navigator.share() — only email delivery + Done
// ─────────────────────────────────────────────────────────────

function CrownCamera({
  accentColor,
  frame,
  onBack,
  onDone,
  onActivity,
  companyName,
  isSottovento,
}: {
  accentColor: string
  frame: (typeof CROWN_FRAMES)[0]
  onBack: () => void
  onDone: () => void
  onActivity: () => void
  companyName?: string | null
  isSottovento?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameImgRef = useRef<HTMLImageElement | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const streamRef = useRef<MediaStream | null>(null)

  // Request fullscreen when Crown Moment opens — hides iOS status bar
  useEffect(() => {
    const el = document.documentElement
    try {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen()
    } catch {}
    return () => {
      try {
        if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else if ((document as any).webkitExitFullscreen && (document as any).webkitFullscreenElement) (document as any).webkitExitFullscreen()
      } catch {}
    }
  }, [])

  // Preload the frame PNG for canvas compositing
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = frame.frameImage
    img.onload = () => { frameImgRef.current = img }
  }, [frame.frameImage])

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
    // Use the frame PNG dimensions as the canvas size (1792x2400) if available,
    // otherwise fall back to camera resolution
    const frameImg = frameImgRef.current
    if (frameImg && frameImg.naturalWidth > 0) {
      // Composite: draw camera photo scaled to fill frame area, then overlay frame PNG
      c.width = frameImg.naturalWidth   // 1792
      c.height = frameImg.naturalHeight // 2400
      const ctx = c.getContext("2d")
      if (!ctx) return
      // Fill black background
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, c.width, c.height)
      // Draw camera photo centered and scaled to fill canvas
      const camAspect = v.videoWidth / v.videoHeight
      const canvasAspect = c.width / c.height
      let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight
      if (camAspect > canvasAspect) {
        // Camera is wider — crop sides
        sw = v.videoHeight * canvasAspect
        sx = (v.videoWidth - sw) / 2
      } else {
        // Camera is taller — crop top/bottom
        sh = v.videoWidth / canvasAspect
        sy = (v.videoHeight - sh) / 2
      }
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height)
      // Overlay the approved frame PNG on top
      ctx.drawImage(frameImg, 0, 0, c.width, c.height)
    } else {
      // Fallback: no frame compositing, just camera photo
      c.width = v.videoWidth || 640
      c.height = v.videoHeight || 480
      const ctx = c.getContext("2d")
      if (!ctx) return
      ctx.drawImage(v, 0, 0)
    }
    setPhotoDataUrl(c.toDataURL("image/jpeg", 0.92))
  }

  const retake = () => {
    setPhotoDataUrl(null)
    setEmailInput("")
    setEmailSent(false)
    setEmailError("")
    onActivity()
  }

  const sendPhotoEmail = async () => {
    if (!photoDataUrl || !emailInput) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailInput)) {
      setEmailError("Please enter a valid email address")
      return
    }
    setEmailSending(true)
    setEmailError("")
    try {
      const res = await fetch("/api/crown-moment/send-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput,
          photoDataUrl,
          frameName: frame.label,
        }),
      })
      if (res.ok) {
        setEmailSent(true)
        setShowEmailModal(false)
        onActivity()
      } else {
        const data = await res.json()
        setEmailError(data.error ?? "Failed to send. Please try again.")
      }
    } catch {
      setEmailError("Network error. Please try again.")
    } finally {
      setEmailSending(false)
    }
  }

  // STATE A = live capture mode | STATE B = photo preview mode
  const isCapture = !photoDataUrl

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at 50% 45%, rgba(255,215,120,0.10) 0%, rgba(14,14,18,0.97) 50%, rgba(0,0,0,1) 100%)",
        boxSizing: "border-box" as const,
      }}
      onTouchStart={onActivity}
    >
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── BACK — always visible, top-left, safe area aware ── */}
      <button
        onClick={onBack}
        className="absolute z-30 flex items-center gap-1 active:opacity-100"
        style={{
          top: "calc(env(safe-area-inset-top) + 10px)",
          left: "16px",
          fontSize: "14px",
          color: "#fff",
          opacity: 0.85,
        }}
      >
        <span>←</span>
        <span style={{ letterSpacing: "0.1em" }}>Back</span>
      </button>

      {/* Safety handled by parent TabletKiosk — not duplicated here */}

      {/* ── EMAIL MODAL ── */}
      {showEmailModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.90)" }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ backgroundColor: "#111", border: `1px solid ${frame.accentHex}40` }}>
            <div className="p-6 text-center">
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: frame.accentHex }}>Crown Moment</p>
              <h3 className="text-xl font-light text-white mb-2" style={{ fontFamily: "serif" }}>Send to My Email</h3>
              <p className="text-white/40 text-sm mb-5">{"We'll send your photo directly to your inbox."}</p>
              <input
                type="email"
                placeholder="your@email.com"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError("") }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none mb-2"
                style={{ borderColor: emailError ? "#ff4444" : undefined }}
                autoFocus
              />
              {emailError && <p className="text-red-400 text-xs mb-3">{emailError}</p>}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-6">
              <button
                onClick={sendPhotoEmail}
                disabled={emailSending || !emailInput}
                className="w-full py-4 rounded-2xl text-black font-semibold tracking-widest uppercase text-sm disabled:opacity-40"
                style={{ background: "linear-gradient(145deg, #FFD700, #C9A646)", boxShadow: "0 8px 25px rgba(255,215,120,0.35)" }}
              >
                {emailSending ? "Sending..." : "Send Photo"}
              </button>
              <button
                onClick={() => { setShowEmailModal(false); setEmailError("") }}
                className="w-full py-3 text-xs tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EMAIL SENT CONFIRMATION ── */}
      {emailSent && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full text-sm font-medium tracking-widest uppercase"
          style={{ backgroundColor: `${frame.accentHex}20`, color: frame.accentHex, border: `1px solid ${frame.accentHex}40` }}
        >
          ✓ Photo sent to your email
        </div>
      )}

      {/* ── FRAME STAGE: TRUE FULLSCREEN — no padding, no margins, frame is the screen ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        {/* ── FRAME WRAPPER: 100% of the stage, fills entire screen ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          {/* STATE A: Live video */}
          {isCapture && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
          )}

          {/* STATE B: Captured photo */}
          {!isCapture && (
            <img
              src={photoDataUrl!}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Approved frame PNG overlay — always on top */}
          <img
            src={frame.frameImage}
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "contain", pointerEvents: "none", zIndex: 10 }}
          />

          {/* Camera error */}
          {cameraError && isCapture && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={frame.accentHex} strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="red" strokeWidth="2" />
              </svg>
              <p className="text-white/60 text-xs tracking-widest uppercase text-center px-4">
                Camera unavailable — check permissions
              </p>
            </div>
          )}

          {/* Loading */}
          {!cameraReady && !cameraError && isCapture && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${frame.accentHex} transparent transparent transparent` }}
              />
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
              <span
                className="text-9xl font-bold"
                style={{ color: frame.accentHex, fontFamily: "serif", textShadow: "0 0 40px rgba(0,0,0,0.8)" }}
              >
                {countdown}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* ── STATE A: CAPTURE BUTTON — floating over frame, bottom-center ── */}
      {isCapture && (
        <button
          onClick={startCountdown}
          disabled={!cameraReady || countdown !== null}
          className="flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
          style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: "linear-gradient(145deg, #FFD700, #C9A646)",
            boxShadow: "0 10px 30px rgba(255,215,120,0.35)",
            zIndex: 30,
            border: "none",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      )}
      {/* ── STATE B: PREVIEW BUTTONS — Send to Email / Retake / Done ── */}
      {!isCapture && (
        <div
          className="absolute left-0 right-0 flex flex-col items-center gap-3"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
            paddingLeft: "24px",
            paddingRight: "24px",
            zIndex: 30,
          }}
        >
          {/* PRIMARY: Send to My Email */}
          <button
            onClick={() => { setShowEmailModal(true); onActivity() }}
            className="w-full max-w-xs py-4 rounded-2xl text-black font-semibold tracking-widest uppercase text-sm transition-all active:scale-95"
            style={{
              background: "linear-gradient(145deg, #FFD700, #C9A646)",
              boxShadow: "0 8px 25px rgba(255,215,120,0.35)",
            }}
          >
            Send to My Email
          </button>
          {/* SECONDARY: Retake + Done */}
          <div className="flex gap-4 w-full max-w-xs">
            <button
              onClick={retake}
              className="flex-1 py-3 rounded-xl text-xs tracking-widest uppercase border transition-all active:scale-95"
              style={{ borderColor: `${frame.accentHex}60`, color: `${frame.accentHex}cc`, opacity: 0.7 }}
            >
              Retake
            </button>
            <button
              onClick={onDone}
              className="flex-1 py-3 rounded-xl text-xs tracking-widest uppercase border transition-all active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", opacity: 0.7 }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// QR BOOKING SECTION (accessible via Quick Book btn)
// ─────────────────────────────────────────────────────────────

function QRBookingSection({
  accentColor,
  bookingUrl,
  name,
  phone,
  email,
  date,
  time,
  onName,
  onPhone,
  onEmail,
  onDate,
  onTime,
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
  date: string
  time: string
  onName: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onDate: (v: string) => void
  onTime: (v: string) => void
  onSubmit: () => void
  submitting: boolean
  submitted: boolean
  onBack: () => void
}) {
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
    <div
      className="relative w-full h-full flex flex-col"
      onTouchStart={resetInactivity}
      onClick={resetInactivity}
    >
      <FullScreenPhoto src="/images/tablet/qr-bg.jpg" overlay={0.65} />

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center gap-4 px-8 pt-6 pb-8 max-w-2xl mx-auto w-full">
          {/* Back */}
          <button
            onClick={onBack}
            className="self-start text-white/50 text-sm tracking-widest uppercase mb-1 active:text-white/80 flex items-center gap-2"
          >
            <span>←</span>
            <span>Back</span>
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
            Book Your Luxury Ride
          </h2>
          <GoldDivider color={accentColor} />

          {/* Two-column layout: QR left, form right */}
          <div className="flex gap-6 w-full items-start mt-1">
            {/* QR code */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#fff" }}>
                <QRCodeSVG
                  value={bookingUrl}
                  size={150}
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
              {/* Date & Time row */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { onDate(e.target.value); resetInactivity() }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white text-base focus:outline-none focus:border-yellow-600/50"
                  style={{ colorScheme: "dark" }}
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => { onTime(e.target.value); resetInactivity() }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white text-base focus:outline-none focus:border-yellow-600/50"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => { onName(e.target.value); resetInactivity() }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-base focus:outline-none focus:border-yellow-600/50"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => { onPhone(e.target.value); resetInactivity() }}
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
                className="w-full py-4 rounded-lg text-black font-semibold tracking-widest uppercase text-sm disabled:opacity-40 transition-opacity active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? "Sending..." : "Get Quote"}
              </button>
              {phone && (
                <button
                  onClick={onSubmit}
                  disabled={submitting || !phone}
                  className="w-full py-3 rounded-lg font-medium tracking-widest uppercase text-xs disabled:opacity-40 transition-opacity"
                  style={{
                    backgroundColor: "transparent",
                    color: accentColor,
                    border: `1px solid ${accentColor}60`,
                  }}
                >
                  {submitting ? "Sending..." : "Send Booking Link"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

