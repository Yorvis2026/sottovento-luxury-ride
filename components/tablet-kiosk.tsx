"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import Image from "next/image"

// ─────────────────────────────────────────────────────────────
// TabletKiosk — shared component for /tablet and /tablet/[driver_code]
// driverCode prop: when provided, all QR/booking URLs include ref=CODE
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://www.sottoventoluxuryride.com"

type SlideType =
  | "welcome"
  | "crown-intro"
  | "capture-memory"
  | "photo-frame"
  | "service"
  | "clearwater"
  | "port-canaveral"
  | "everglades"
  | "discover"
  | "qr"
  | "lead"

type Slide = {
  id: string
  type: SlideType
  bgImage: string
  accent: string
  frameTheme?: "disney" | "universal"
}

const SLIDES: Slide[] = [
  {
    id: "welcome",
    type: "welcome",
    bgImage: "/images/tablet/crown-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "airport",
    type: "service",
    bgImage: "/images/tablet/airport-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "clearwater",
    type: "clearwater",
    bgImage: "/images/tablet/clearwater-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "port-canaveral",
    type: "port-canaveral",
    bgImage: "/images/tablet/port-canaveral-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "everglades",
    type: "everglades",
    bgImage: "/images/tablet/everglades-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "discover",
    type: "discover",
    bgImage: "/images/tablet/orlando-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "crown-intro",
    type: "crown-intro",
    bgImage: "/images/tablet/family-car-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "photo-disney",
    type: "photo-frame",
    bgImage: "/images/tablet/family-car-bg.jpg",
    accent: "#C9A84C",
    frameTheme: "disney",
  },
  {
    id: "photo-universal",
    type: "photo-frame",
    bgImage: "/images/tablet/family-car-bg.jpg",
    accent: "#C9A84C",
    frameTheme: "universal",
  },
  {
    id: "qr-book",
    type: "qr",
    bgImage: "/images/tablet/kennedy-bg.jpg",
    accent: "#C9A84C",
  },
  {
    id: "lead",
    type: "lead",
    bgImage: "/images/tablet/orlando-bg.jpg",
    accent: "#C9A84C",
  },
]

const SLIDE_DURATION = 8000
const LEAD_SLIDE_DURATION = 30000
const PHOTO_SLIDE_DURATION = 20000

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
    const slideType = SLIDES[current]?.type
    let duration = SLIDE_DURATION
    if (slideType === "lead") duration = LEAD_SLIDE_DURATION
    if (slideType === "photo-frame") duration = PHOTO_SLIDE_DURATION
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
      {/* Background photos with crossfade */}
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
          {/* Overlay: lighter for photo-frame slides, darker for text slides */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor:
                s.type === "photo-frame"
                  ? "rgba(0,0,0,0.55)"
                  : s.type === "welcome"
                  ? "rgba(0,0,0,0.50)"
                  : "rgba(0,0,0,0.62)",
            }}
          />
        </div>
      ))}

      {/* Slide content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {slide.type === "welcome" && (
          <WelcomeSlide accentColor={slide.accent} driverCode={effectiveDriverCode} />
        )}
        {slide.type === "service" && (
          <ServiceSlide id={slide.id} accentColor={slide.accent} bookingUrl={bookingUrl} />
        )}
        {slide.type === "clearwater" && (
          <ClearwaterSlide accentColor={slide.accent} bookingUrl={bookingUrl} />
        )}
        {slide.type === "port-canaveral" && (
          <PortCanaveralSlide accentColor={slide.accent} bookingUrl={bookingUrl} />
        )}
        {slide.type === "everglades" && (
          <EvergladesSlide accentColor={slide.accent} bookingUrl={bookingUrl} />
        )}
        {slide.type === "discover" && (
          <DiscoverOrlandoSlide accentColor={slide.accent} bookingUrl={bookingUrl} />
        )}
        {slide.type === "crown-intro" && (
          <CrownIntroSlide accentColor={slide.accent} onBegin={() => goTo(SLIDES.findIndex(s => s.type === "photo-frame"))} />
        )}
        {slide.type === "photo-frame" && (
          <PhotoFrameSlide accentColor={slide.accent} theme={slide.frameTheme!} onNext={advance} />
        )}
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

      {/* Tap zones left/right */}
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

      {/* Driver attribution */}
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
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────

function GoldDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="h-px flex-1 opacity-30" style={{ backgroundColor: color }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: color }} />
      <div className="h-px flex-1 opacity-30" style={{ backgroundColor: color }} />
    </div>
  )
}

function NavArrows({ onPrev, onNext, color }: { onPrev: () => void; onNext: () => void; color: string }) {
  return (
    <>
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(0,0,0,0.35)", border: `1px solid ${color}40` }}
      >
        <span className="text-white text-xl leading-none">‹</span>
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(0,0,0,0.35)", border: `1px solid ${color}40` }}
      >
        <span className="text-white text-xl leading-none">›</span>
      </button>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: WELCOME
// ─────────────────────────────────────────────────────────────

function WelcomeSlide({ accentColor, driverCode }: { accentColor: string; driverCode?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-5">
      {/* Crown icon */}
      <svg width="52" height="36" viewBox="0 0 52 36" fill="none">
        <path
          d="M4 32L10 8L20 20L26 4L32 20L42 8L48 32H4Z"
          stroke={accentColor}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="32" r="2.5" fill={accentColor} />
        <circle cx="26" cy="4" r="2.5" fill={accentColor} />
        <circle cx="48" cy="32" r="2.5" fill={accentColor} />
      </svg>

      <h1
        className="text-6xl md:text-7xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
      >
        Sottovento
      </h1>
      <p
        className="text-lg font-light tracking-[0.35em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        Luxury Ride
      </p>
      <GoldDivider color={accentColor} />
      <p className="text-base text-white/75 tracking-[0.2em] uppercase drop-shadow">
        Orlando Luxury Transportation
      </p>
      {driverCode && (
        <p className="text-xs text-white/40 mt-2 tracking-widest uppercase">
          Driver: {driverCode}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: SERVICE (Airport Transfers)
// ─────────────────────────────────────────────────────────────

const SERVICE_DATA: Record<string, { label: string; title: string; subtitle: string; icon: string }> = {
  airport: {
    label: "Airport Service",
    title: "Airport Transfers",
    subtitle: "Premium airport pickup and drop-off service in Orlando and surrounding areas",
    icon: "✈",
  },
}

function ServiceSlide({ id, accentColor, bookingUrl }: { id: string; accentColor: string; bookingUrl: string }) {
  const data = SERVICE_DATA[id]
  if (!data) return null
  return (
    <div className="flex flex-col items-center justify-center text-center px-14 gap-5 max-w-2xl w-full">
      <p
        className="text-xs tracking-[0.45em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        {data.label}
      </p>
      <div className="text-4xl drop-shadow" style={{ color: accentColor }}>
        {data.icon}
      </div>
      <h2
        className="text-5xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {data.title}
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/80 text-lg font-light leading-relaxed drop-shadow max-w-sm">
        {data.subtitle}
      </p>
      <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(0,0,0,0.4)", border: `1px solid ${accentColor}30` }}>
        <QRCodeSVG value={bookingUrl} size={120} bgColor="transparent" fgColor="#ffffff" level="M" />
        <p className="text-white/50 text-xs mt-2 tracking-widest uppercase">Scan to Book</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: CLEARWATER BEACH
// ─────────────────────────────────────────────────────────────

function ClearwaterSlide({ accentColor, bookingUrl }: { accentColor: string; bookingUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-14 gap-5 max-w-2xl w-full">
      <p
        className="text-xs tracking-[0.45em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        Clearwater Beach
      </p>
      <div className="text-4xl drop-shadow" style={{ color: accentColor }}>🌊</div>
      <h2
        className="text-5xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Crystal Waters Awaiting
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/80 text-lg font-light leading-relaxed drop-shadow max-w-sm">
        Private luxury transfers to Clearwater Beach
      </p>
      <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(0,0,0,0.4)", border: `1px solid ${accentColor}30` }}>
        <QRCodeSVG value={bookingUrl} size={120} bgColor="transparent" fgColor="#ffffff" level="M" />
        <p className="text-white/50 text-xs mt-2 tracking-widest uppercase">Scan to Book</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: PORT CANAVERAL
// ─────────────────────────────────────────────────────────────

function PortCanaveralSlide({ accentColor, bookingUrl }: { accentColor: string; bookingUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-14 gap-5 max-w-2xl w-full">
      <p
        className="text-xs tracking-[0.45em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        Cruise Transfers
      </p>
      <div className="text-4xl drop-shadow" style={{ color: accentColor }}>🚢</div>
      <h2
        className="text-5xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Port Canaveral Transfers
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/80 text-lg font-light leading-relaxed drop-shadow max-w-sm">
        Comfortable rides to your cruise vacation
      </p>
      <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(0,0,0,0.4)", border: `1px solid ${accentColor}30` }}>
        <QRCodeSVG value={bookingUrl} size={120} bgColor="transparent" fgColor="#ffffff" level="M" />
        <p className="text-white/50 text-xs mt-2 tracking-widest uppercase">Scan to Book</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: EVERGLADES
// ─────────────────────────────────────────────────────────────

function EvergladesSlide({ accentColor, bookingUrl }: { accentColor: string; bookingUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-14 gap-5 max-w-2xl w-full">
      <p
        className="text-xs tracking-[0.45em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        Florida Nature
      </p>
      <div className="text-4xl drop-shadow" style={{ color: accentColor }}>🌿</div>
      <h2
        className="text-5xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Everglades Airboat Adventures
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/80 text-lg font-light leading-relaxed drop-shadow max-w-sm">
        Discover Florida wildlife and unforgettable nature tours
      </p>
      <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(0,0,0,0.4)", border: `1px solid ${accentColor}30` }}>
        <QRCodeSVG value={bookingUrl} size={120} bgColor="transparent" fgColor="#ffffff" level="M" />
        <p className="text-white/50 text-xs mt-2 tracking-widest uppercase">Scan to Book</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: DISCOVER ORLANDO
// ─────────────────────────────────────────────────────────────

const ORLANDO_DESTINATIONS = [
  { name: "Walt Disney World", icon: "🏰" },
  { name: "Universal Orlando", icon: "🎬" },
  { name: "Kennedy Space Center", icon: "🚀" },
  { name: "Port Canaveral", icon: "🚢" },
  { name: "Clearwater Beach", icon: "🌊" },
  { name: "Everglades Tours", icon: "🌿" },
]

function DiscoverOrlandoSlide({ accentColor, bookingUrl }: { accentColor: string; bookingUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-10 gap-4 max-w-2xl w-full">
      <p
        className="text-xs tracking-[0.45em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        Discover Orlando
      </p>
      <h2
        className="text-4xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Where would you like to go next?
      </h2>
      <GoldDivider color={accentColor} />
      <div className="grid grid-cols-3 gap-3 w-full mt-1">
        {ORLANDO_DESTINATIONS.map((dest) => (
          <div
            key={dest.name}
            className="rounded-xl p-3 flex flex-col items-center gap-1 backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              border: `1px solid ${accentColor}35`,
            }}
          >
            <span className="text-2xl">{dest.icon}</span>
            <p className="text-white/85 text-xs font-light leading-tight">{dest.name}</p>
          </div>
        ))}
      </div>
      <div
        className="mt-3 px-6 py-3 rounded-lg text-xs tracking-widest uppercase font-medium"
        style={{ backgroundColor: accentColor, color: "#000" }}
      >
        Scan QR to Book Any Destination
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: CROWN INTRO — "Capture Your Orlando Memory"
// ─────────────────────────────────────────────────────────────

function CrownIntroSlide({ accentColor, onBegin }: { accentColor: string; onBegin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      <p
        className="text-xs tracking-[0.5em] uppercase drop-shadow"
        style={{ color: accentColor }}
      >
        Crown Moment
      </p>
      <h2
        className="text-5xl font-bold text-white drop-shadow-lg leading-tight"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Capture Your<br />Orlando Memory
      </h2>
      <GoldDivider color={accentColor} />
      <p className="text-white/70 text-lg font-light drop-shadow max-w-sm">
        Complimentary photo with luxury frame
      </p>
      <button
        onClick={onBegin}
        className="mt-4 px-10 py-4 rounded-lg text-black font-bold tracking-widest uppercase text-sm shadow-lg"
        style={{ backgroundColor: accentColor }}
      >
        TAP TO BEGIN
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: PHOTO FRAME — Disney & Universal
// ─────────────────────────────────────────────────────────────

function PhotoFrameSlide({
  accentColor,
  theme,
  onNext,
}: {
  accentColor: string
  theme: "disney" | "universal"
  onNext: () => void
}) {
  const [photoTaken, setPhotoTaken] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isDisney = theme === "disney"

  // Frame styling
  const frameBorder = isDisney
    ? "linear-gradient(135deg, #7B2D8B, #4A1A6B, #9B4DB5, #C9A84C, #7B2D8B)"
    : "linear-gradient(135deg, #1A2A6B, #0D1B4B, #2A3D8B, #C9A84C, #1A2A6B)"

  const frameTitle = isDisney ? "Orlando Family Trip" : "Universal Orlando Adventure"
  const frameSubtitle = isDisney ? "Walt Disney World Area" : "Hollywood Studios Experience"
  const frameBg = isDisney ? "#5B1E7A" : "#0D1B4B"

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      // Camera not available — show placeholder
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setPhotoData(canvas.toDataURL("image/jpeg", 0.92))
    setPhotoTaken(true)
    stopCamera()
  }

  const retake = () => {
    setPhotoTaken(false)
    setPhotoData(null)
    startCamera()
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-6 gap-4">
      <p className="text-xs tracking-[0.4em] uppercase drop-shadow" style={{ color: accentColor }}>
        YOUR MEMORY
      </p>
      <p className="text-white text-2xl font-light drop-shadow" style={{ fontFamily: "Georgia, serif" }}>
        Looking Good?
      </p>

      {/* Photo frame */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: "min(320px, 80vw)",
          aspectRatio: "3/4",
          background: frameBg,
          padding: "12px",
          border: "4px solid transparent",
          backgroundImage: `${frameBorder}, linear-gradient(${frameBg}, ${frameBg})`,
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        {/* Frame header */}
        <div className="absolute top-0 left-0 right-0 z-20 text-center py-2 px-2"
          style={{ background: `linear-gradient(180deg, ${frameBg}EE 0%, transparent 100%)` }}>
          <p className="text-yellow-300 text-xs font-bold tracking-wide drop-shadow">✦ {frameTitle} ✦</p>
          <p className="text-yellow-200/80 text-[10px] tracking-widest">{frameSubtitle}</p>
        </div>

        {/* Photo area */}
        <div className="w-full h-full rounded-lg overflow-hidden bg-black/60 flex items-center justify-center">
          {!photoTaken ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <img
              src={photoData ?? ""}
              alt="Your photo"
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}
        </div>

        {/* Frame footer */}
        <div className="absolute bottom-0 left-0 right-0 z-20 text-center py-2 px-2"
          style={{ background: `linear-gradient(0deg, ${frameBg}EE 0%, transparent 100%)` }}>
          <p className="text-yellow-300 text-xs font-bold tracking-widest drop-shadow">
            ✦ SOTTOVENTO LUXURY RIDE ✦
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Action buttons */}
      <div className="flex gap-4 mt-1">
        {!photoTaken ? (
          <button
            onClick={takePhoto}
            className="px-8 py-3 rounded-full text-black font-bold tracking-widest uppercase text-sm shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            📸 Take Photo
          </button>
        ) : (
          <>
            <button
              onClick={retake}
              className="px-6 py-3 rounded-full font-medium tracking-wide text-sm"
              style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }}
            >
              ↺ Retake
            </button>
            <button
              onClick={onNext}
              className="px-6 py-3 rounded-full text-black font-bold tracking-widest uppercase text-sm shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              I LOVE IT ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SLIDE: QR BOOKING
// ─────────────────────────────────────────────────────────────

function QRSlide({ bookingUrl, accentColor }: { bookingUrl: string; accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-12 gap-6">
      <p className="text-xs tracking-[0.4em] uppercase drop-shadow" style={{ color: accentColor }}>
        Book Your Next Ride
      </p>
      <h2
        className="text-4xl font-bold text-white drop-shadow-lg"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Scan to Reserve
      </h2>
      <GoldDivider color={accentColor} />
      <div className="p-4 rounded-2xl mt-2 shadow-2xl" style={{ backgroundColor: "#fff" }}>
        <QRCodeSVG value={bookingUrl} size={200} bgColor="#ffffff" fgColor="#000000" level="M" />
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

// ─────────────────────────────────────────────────────────────
// SLIDE: LEAD CAPTURE
// ─────────────────────────────────────────────────────────────

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
        <h2 className="text-4xl font-light text-white drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
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
      <h2 className="text-4xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>
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
        className="w-full py-4 rounded-lg text-black font-bold tracking-widest uppercase text-sm mt-2 disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: accentColor }}
      >
        {submitting ? "Sending..." : "Submit"}
      </button>
    </div>
  )
}
