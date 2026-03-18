"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import Image from "next/image"

// ─────────────────────────────────────────────────────────────
// TabletKiosk — MASTER BLOCK FINAL
// Structure:
//   1. HERO (full screen — luxury image + brand + Reserve Now)
//   2. SERVICE CAROUSEL (Airport / Corporate / Hourly / Fleet / Port Canaveral)
//   3. CROWN MOMENT (photo frame experience)
//   4. FLEET SECTION (Suburban · Escalade · Executive SUV)
//   5. DESTINATIONS (secondary — Popular Routes)
//   6. QR BOOKING (Scan + phone input + Send + Get Quote)
//   7. SAFETY BUTTON (floating, always visible)
//
// Brand: Black · Gold · White · Elegant typography
// Identity: Private Chauffeur · Uber Black · Executive Transport
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.sottoventoluxuryride.com"
const GOLD = "#C9A84C"

// ─── SECTION IDs ───────────────────────────────────────────
type SectionId = "hero" | "carousel" | "crown" | "fleet" | "destinations" | "qr" | "safety"

// ─── SERVICE CAROUSEL SLIDES ───────────────────────────────
const SERVICE_SLIDES = [
  {
    id: "airport",
    title: "Airport Transfers",
    subtitle: "Premium airport pickup and drop-off service",
    photo: "/images/tablet/airport-bg.jpg",
  },
  {
    id: "corporate",
    title: "Corporate Travel",
    subtitle: "Executive transportation for business clients",
    photo: "/images/tablet/corporate-bg.jpg",
  },
  {
    id: "hourly",
    title: "Hourly Chauffeur",
    subtitle: "Flexible private service at your convenience",
    photo: "/images/tablet/hourly-bg.jpg",
  },
  {
    id: "fleet-slide",
    title: "Premium Vehicles",
    subtitle: "Suburban · Escalade · Luxury fleet",
    photo: "/images/tablet/fleet-bg.jpg",
  },
  {
    id: "port",
    title: "Port Canaveral Transfers",
    subtitle: "Cruise transportation with comfort and reliability",
    photo: "/images/tablet/qr-bg.jpg",
  },
]

// ─── MAIN SECTIONS (scroll-based) ──────────────────────────
// The kiosk renders as a full-screen paginated experience.
// Each section is a full-screen "page" that auto-advances.
const SECTIONS: SectionId[] = [
  "hero",
  "carousel",
  "crown",
  "fleet",
  "destinations",
  "qr",
]

const SECTION_DURATION: Record<SectionId, number> = {
  hero: 10000,
  carousel: 40000, // carousel handles its own timing internally
  crown: 12000,
  fleet: 10000,
  destinations: 10000,
  qr: 30000,
  safety: 0,
}

interface TabletKioskProps {
  driverCode?: string | null
  operatorName?: string | null
}

export default function TabletKiosk({ driverCode, operatorName: propOperatorName }: TabletKioskProps) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [urlDriverCode, setUrlDriverCode] = useState<string | null>(null)
  const [tabletCode, setTabletCode] = useState<string | null>(null)
  const [urlOperatorName, setUrlOperatorName] = useState<string | null>(null)
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

  // Brand Hierarchy:
  // - If operator is Sottovento itself (no operatorName), show "Sottovento Luxury Ride"
  // - If another operator is onboarded, show "[Operator Name] by Sottovento Network"
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
        advanceSection()
      }, 4000)
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
            onReserve={() => goToSection(SECTIONS.indexOf("qr"))}
          />
        )}

        {/* 2. SERVICE CAROUSEL */}
        {currentSection === "carousel" && (
          <ServiceCarousel
            accentColor={GOLD}
            onDone={() => goToSection(SECTIONS.indexOf("crown"))}
          />
        )}

        {/* 3. CROWN MOMENT */}
        {currentSection === "crown" && (
          <CrownMomentSection accentColor={GOLD} />
        )}

        {/* 4. FLEET */}
        {currentSection === "fleet" && (
          <FleetSection accentColor={GOLD} />
        )}

        {/* 5. DESTINATIONS */}
        {currentSection === "destinations" && (
          <DestinationsSection accentColor={GOLD} />
        )}

        {/* 6. QR BOOKING */}
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
          />
        )}
      </div>

      {/* ── SECTION DOTS ── */}
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

      {/* ── TAP ZONES ── */}
      <button
        className="absolute left-0 top-0 bottom-16 w-16 z-40 opacity-0"
        onClick={() =>
          goToSection((sectionIndex - 1 + SECTIONS.length) % SECTIONS.length)
        }
      />
      <button
        className="absolute right-0 top-0 bottom-16 w-16 z-40 opacity-0"
        onClick={() => goToSection((sectionIndex + 1) % SECTIONS.length)}
      />

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

      {/* ── 7. SAFETY BUTTON (floating, always visible) ── */}
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
            Safety
          </h3>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Your safety is our priority. If you feel uncomfortable at any
            point during your ride, please contact us immediately.
          </p>
          <a
            href="tel:+14074001111"
            className="block w-full py-3 rounded-lg text-center text-sm font-medium tracking-widest uppercase"
            style={{ backgroundColor: GOLD, color: "#000" }}
          >
            Call Support
          </a>
          <button
            onClick={() => setShowSafety(false)}
            className="block w-full mt-2 py-2 text-white/30 text-xs tracking-widest uppercase"
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

function FullScreenPhoto({
  src,
  overlay = 0.55,
}: {
  src: string
  overlay?: number
}) {
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
          // OWNER CASE: Sottovento itself
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
          // NETWORK CASE: another operator
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
// 2. SERVICE CAROUSEL
// ─────────────────────────────────────────────────────────────

function ServiceCarousel({
  accentColor,
  onDone,
}: {
  accentColor: string
  onDone: () => void
}) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    setCurrent((prev) => {
      if (prev + 1 >= SERVICE_SLIDES.length) {
        onDone()
        return prev
      }
      return prev + 1
    })
  }, [onDone])

  useEffect(() => {
    timerRef.current = setTimeout(advance, 8000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, advance])

  const goTo = (i: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrent(i)
  }

  const slide = SERVICE_SLIDES[current]

  return (
    <div className="relative w-full h-full">
      {/* Background photos with crossfade */}
      {SERVICE_SLIDES.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={s.photo}
            alt=""
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.60)" }}
          />
        </div>
      ))}

      {/* Slide content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-16 gap-5 z-10">
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
          {slide.title}
        </h2>
        <GoldDivider color={accentColor} />
        <p className="text-white/60 text-xl font-light max-w-md">
          {slide.subtitle}
        </p>
      </div>

      {/* Carousel dots */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2 z-20">
        {SERVICE_SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 20 : 7,
              height: 7,
              backgroundColor:
                i === current ? accentColor : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 3. CROWN MOMENT SECTION
// ─────────────────────────────────────────────────────────────

function CrownMomentSection({ accentColor }: { accentColor: string }) {
  const [mode, setMode] = useState<"intro" | "disney" | "universal">("intro")
  const [photoTaken, setPhotoTaken] = useState(false)

  if (mode === "intro") {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
        <FullScreenPhoto src="/images/tablet/lead-bg.jpg" overlay={0.55} />
        <div className="relative z-10 flex flex-col items-center gap-6 px-12">
          <p className="text-xs tracking-[0.5em] uppercase text-white/30">The</p>
          <h2
            className="text-6xl font-light text-white"
            style={{ fontFamily: "serif", letterSpacing: "0.08em" }}
          >
            Crown Moment
          </h2>
          <GoldDivider color={accentColor} />
          <p className="text-white/60 text-xl font-light max-w-md leading-relaxed">
            Capture Your Orlando Memory
          </p>
          <p className="text-white/40 text-base max-w-sm leading-relaxed">
            Complimentary luxury photo experience during your ride
          </p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setMode("disney")}
              className="px-8 py-3 rounded-full text-sm font-medium tracking-widest uppercase transition-all active:scale-95"
              style={{
                backgroundColor: accentColor,
                color: "#000",
              }}
            >
              Disney Frame
            </button>
            <button
              onClick={() => setMode("universal")}
              className="px-8 py-3 rounded-full text-sm font-medium tracking-widest uppercase transition-all active:scale-95"
              style={{
                backgroundColor: "transparent",
                color: accentColor,
                border: `1px solid ${accentColor}`,
              }}
            >
              Universal Frame
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isDisney = mode === "disney"
  const frameColor = isDisney ? "#6B21A8" : "#1E3A5F"
  const frameAccent = accentColor
  const frameTitle = isDisney
    ? "Orlando Family Trip · Walt Disney World Area"
    : "Universal Orlando Adventure"

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ backgroundColor: "#000" }}
    >
      {/* Photo frame */}
      <div
        className="relative flex flex-col items-center"
        style={{
          border: `6px solid ${frameAccent}`,
          borderRadius: 16,
          padding: 8,
          backgroundColor: frameColor,
          maxWidth: 480,
          width: "90%",
        }}
      >
        {/* Frame header */}
        <div
          className="w-full text-center py-3 text-sm tracking-widest uppercase font-medium"
          style={{ color: frameAccent, fontFamily: "serif" }}
        >
          {frameTitle}
        </div>

        {/* Camera viewport */}
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{ aspectRatio: "4/3", backgroundColor: "#111" }}
        >
          {!photoTaken ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke={frameAccent}
                strokeWidth="1.5"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p className="text-white/40 text-sm tracking-widest uppercase">
                Tap to take photo
              </p>
              <button
                onClick={() => setPhotoTaken(true)}
                className="px-8 py-3 rounded-full text-sm font-medium tracking-widest uppercase"
                style={{ backgroundColor: frameAccent, color: "#000" }}
              >
                Take Photo
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
              <p className="text-white/60 text-base">Photo captured!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPhotoTaken(false)}
                  className="px-6 py-2 rounded-full text-xs tracking-widest uppercase border"
                  style={{ borderColor: frameAccent, color: frameAccent }}
                >
                  Retake
                </button>
                <button
                  className="px-6 py-2 rounded-full text-xs tracking-widest uppercase font-medium"
                  style={{ backgroundColor: frameAccent, color: "#000" }}
                >
                  Save / Share
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Frame footer */}
        <div
          className="w-full text-center py-2 text-xs tracking-widest uppercase opacity-50"
          style={{ color: frameAccent }}
        >
          Sottovento Luxury Ride
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => { setMode("intro"); setPhotoTaken(false) }}
        className="mt-6 text-white/30 text-xs tracking-widest uppercase"
      >
        ← Back
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 4. FLEET SECTION
// ─────────────────────────────────────────────────────────────

function FleetSection({ accentColor }: { accentColor: string }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      <FullScreenPhoto src="/images/tablet/fleet-bg.jpg" overlay={0.65} />
      <div className="relative z-10 flex flex-col items-center gap-6 px-12 max-w-2xl">
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
        <div className="grid grid-cols-3 gap-4 mt-2 w-full">
          {[
            {
              name: "Suburban",
              desc: "Spacious luxury SUV for families and groups",
            },
            {
              name: "Escalade",
              desc: "Premium executive SUV experience",
            },
            {
              name: "Executive SUV",
              desc: "Comfort, style, and reliability",
            },
          ].map((v) => (
            <div
              key={v.name}
              className="rounded-xl p-5 text-center"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: `1px solid ${accentColor}25`,
              }}
            >
              <p
                className="text-white font-light text-lg mb-2"
                style={{ fontFamily: "serif" }}
              >
                {v.name}
              </p>
              <p className="text-white/40 text-xs leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 5. DESTINATIONS SECTION (secondary)
// ─────────────────────────────────────────────────────────────

function DestinationsSection({ accentColor }: { accentColor: string }) {
  const destinations = [
    "Orlando Airport (MCO)",
    "Port Canaveral",
    "Disney Resorts",
    "Universal Studios",
    "Clearwater Beach",
    "Miami",
  ]

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
      <FullScreenPhoto src="/images/tablet/airport-bg.jpg" overlay={0.70} />
      <div className="relative z-10 flex flex-col items-center gap-6 px-12 max-w-2xl w-full">
        <p
          className="text-xs tracking-[0.4em] uppercase"
          style={{ color: accentColor }}
        >
          Popular Routes
        </p>
        <h2
          className="text-5xl font-light text-white"
          style={{ fontFamily: "serif" }}
        >
          Popular Routes & Destinations
        </h2>
        <GoldDivider color={accentColor} />
        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          {destinations.map((dest) => (
            <div
              key={dest}
              className="flex items-center gap-3 rounded-xl px-5 py-4 text-left"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: `1px solid ${accentColor}20`,
              }}
            >
              <span style={{ color: accentColor, fontSize: 10 }}>◆</span>
              <span className="text-white/70 text-base font-light">{dest}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 6. QR BOOKING SECTION
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
        <p
          className="text-xs tracking-[0.4em] uppercase"
          style={{ color: accentColor }}
        >
          Quick Booking
        </p>
        <h2
          className="text-4xl font-light text-white text-center"
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
