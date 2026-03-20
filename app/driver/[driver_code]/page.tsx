"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

// ============================================================
// /driver/[driver_code] — SLN Driver Panel v5 (Master Block)
//
// PRIORITY ORDER:
//   1. OFFER    — active dispatch offer (full-screen)
//   2. RIDE     — active ride in progress (full-screen)
//   3. CALM     — no active offer / ride (dashboard)
//
// RIDE FLOW STATES:
//   assigned → en_route → arrived → in_trip → completed
//
// v5 ADDITIONS:
//   - Client Profile Strip (always visible in ride flow)
//   - State Visual System (color theme per state)
//   - Service Type Badge (AIRPORT / HOTEL / VIP)
//   - Contact: Call + Text SMS (separate buttons)
//   - Completion Feedback Overlay (+$amount, 2s)
//   - Global status as single source of truth
// ============================================================

const GOLD = "#C8A96A"
const POLL_INTERVAL = 5000

// ─── STATE THEME SYSTEM ───────────────────────────────────────
const STATE_THEME: Record<string, { primary: string; bg: string; dot: string }> = {
  assigned:  { primary: GOLD,      bg: "#0a0a00", dot: "#4ade80" },
  en_route:  { primary: "#f59e0b", bg: "#0a0800", dot: "#f59e0b" },
  arrived:   { primary: "#4ade80", bg: "#001a0a", dot: "#4ade80" },
  in_trip:   { primary: "#a78bfa", bg: "#08000f", dot: "#a78bfa" },
  completed: { primary: "#9ca3af", bg: "#0a0a0a", dot: "#9ca3af" },
  cancelled: { primary: "#f87171", bg: "#0a0000", dot: "#f87171" },
  no_show:   { primary: "#f87171", bg: "#0a0000", dot: "#f87171" },
}

// ─── TRANSLATIONS ─────────────────────────────────────────────
type Lang = "en" | "es" | "ht"

const T: Record<Lang, Record<string, string>> = {
  en: {
    network: "Sottovento Network",
    driverDashboard: "Driver Dashboard",
    youAreOnline: "You are online",
    youAreOffline: "You are offline",
    newRideOffer: "New Ride Offer",
    timeRemaining: "Time remaining",
    accept: "ACCEPT",
    decline: "Decline",
    assignedRide: "Assigned Ride",
    enRoute: "En Route to Pickup",
    arrived: "Arrived at Pickup",
    inTrip: "Ride in Progress",
    completed: "Ride Completed",
    startTrip: "Start Trip",
    enRouteBtn: "I'm On My Way",
    arrivedBtn: "I've Arrived",
    startRide: "Start Ride",
    completeRide: "Complete Ride",
    backToDashboard: "Back to Dashboard",
    navigate: "Navigate",
    call: "Call",
    text: "Text",
    noShow: "No Show",
    route: "Route",
    pickup: "Pickup",
    dropoff: "Dropoff",
    vehicle: "Vehicle",
    fare: "Fare",
    passenger: "Passenger",
    elapsedTime: "Elapsed",
    bookingId: "Booking",
    repeatClient: "Repeat Client",
    newClient: "New Client",
    serviceAirport: "AIRPORT",
    serviceHotel: "HOTEL",
    serviceVip: "VIP",
    rideCompletedTitle: "Ride Completed ✓",
    rideCompletedSub: "Returning to dashboard...",
    myTablet: "My Passenger Tablet",
    tabletLink: "Tablet Link",
    copy: "Copy",
    copied: "✓ Copied",
    open: "Open ↗",
    qrPreview: "QR Code Preview",
    hide: "▲ Hide",
    show: "▼ Show",
    sourceOwnership: "How Source Ownership Works",
    sourceOwnershipText1: "Every client you bring in through your QR code, referral link, or tablet is permanently attributed to you.",
    sourceOwnershipText2: "When they book again, you get the first offer — and earn a 15% source commission even if another driver executes the ride.",
    noOffer: "Waiting for rides...",
    totalClients: "Total Clients",
    monthEarnings: "Month Earnings",
    lifetimeEarnings: "Lifetime Earnings",
    pendingOffers: "Pending Offers",
    loading: "Loading...",
    driverNotFound: "Driver Not Found",
    contactAdmin: "Contact your administrator to get your driver code.",
    tabletSetup: "Tablet Setup",
    tabletSetup1: "Open your tablet link in Safari on the iPad",
    tabletSetup2: 'Tap Share → "Add to Home Screen"',
    tabletSetup3: "Name it Sottovento Ride",
    tabletSetup4: "Always launch from the Home Screen icon",
    quickAccess: "Quick Access",
    capturedClients: "My Captured Clients",
    capturedClientsSub: "View your full client ownership list",
    earningsLabel: "My Earnings",
    earningsSub: "Executor + Source earnings breakdown",
    referralLabel: "My Referral Link",
    referralSub: "Share to capture new clients",
    sourceOffer: "Source Offer",
    networkOffer: "Network Offer",
    acceptedTitle: "Ride Assigned ✓",
    acceptedSub: "Opening ride details...",
    declinedTitle: "Offer Declined",
    declinedSub: "Dispatching to next driver...",
    expiredTitle: "Offer Expired",
    expiredSub: "Dispatching to next driver...",
    round: "Round",
    clientName: "Client",
    rideDetails: "Ride Details",
    transitioning: "Updating...",
    sending: "Sending...",
    sent: "Sent ✓",
  },
  es: {
    network: "Red Sottovento",
    driverDashboard: "Panel del Conductor",
    youAreOnline: "Estás en línea",
    youAreOffline: "Estás fuera de línea",
    newRideOffer: "Nueva Solicitud",
    timeRemaining: "Tiempo restante",
    accept: "ACEPTAR",
    decline: "Rechazar",
    assignedRide: "Servicio asignado",
    enRoute: "En camino al pasajero",
    arrived: "Llegué al punto de recogida",
    inTrip: "Viaje en progreso",
    completed: "Viaje completado",
    startTrip: "Iniciar viaje",
    enRouteBtn: "Estoy en camino",
    arrivedBtn: "Llegué",
    startRide: "Iniciar viaje",
    completeRide: "Finalizar viaje",
    backToDashboard: "Volver al panel",
    navigate: "Navegar",
    call: "Llamar",
    text: "Mensaje",
    noShow: "No se presentó",
    route: "Ruta",
    pickup: "Recogida",
    dropoff: "Destino",
    vehicle: "Vehículo",
    fare: "Tarifa",
    passenger: "Pasajero",
    elapsedTime: "Tiempo",
    bookingId: "Reserva",
    repeatClient: "Cliente Frecuente",
    newClient: "Cliente Nuevo",
    serviceAirport: "AEROPUERTO",
    serviceHotel: "HOTEL",
    serviceVip: "VIP",
    rideCompletedTitle: "Viaje Completado ✓",
    rideCompletedSub: "Volviendo al panel...",
    myTablet: "Mi Tablet de Pasajero",
    tabletLink: "Enlace del Tablet",
    copy: "Copiar",
    copied: "✓ Copiado",
    open: "Abrir ↗",
    qrPreview: "Vista previa QR",
    hide: "▲ Ocultar",
    show: "▼ Mostrar",
    sourceOwnership: "Cómo funciona la propiedad de fuente",
    sourceOwnershipText1: "Cada cliente que traes a través de tu código QR, enlace de referido o tablet queda permanentemente atribuido a ti.",
    sourceOwnershipText2: "Cuando vuelvan a reservar, recibes la primera oferta — y ganas un 15% de comisión de fuente aunque otro conductor ejecute el viaje.",
    noOffer: "Esperando viajes...",
    totalClients: "Total de Clientes",
    monthEarnings: "Ganancias del Mes",
    lifetimeEarnings: "Ganancias Totales",
    pendingOffers: "Ofertas Pendientes",
    loading: "Cargando...",
    driverNotFound: "Conductor no encontrado",
    contactAdmin: "Contacta a tu administrador para obtener tu código de conductor.",
    tabletSetup: "Configuración del Tablet",
    tabletSetup1: "Abre el enlace del tablet en Safari en el iPad",
    tabletSetup2: 'Toca Compartir → "Agregar a pantalla de inicio"',
    tabletSetup3: "Nómbralo Sottovento Ride",
    tabletSetup4: "Siempre ábrelo desde el ícono en la pantalla de inicio",
    quickAccess: "Acceso Rápido",
    capturedClients: "Mis Clientes Capturados",
    capturedClientsSub: "Ver tu lista completa de clientes",
    earningsLabel: "Mis Ganancias",
    earningsSub: "Desglose de ganancias de ejecución y fuente",
    referralLabel: "Mi Enlace de Referido",
    referralSub: "Comparte para capturar nuevos clientes",
    sourceOffer: "Oferta de Fuente",
    networkOffer: "Oferta de Red",
    acceptedTitle: "Viaje Asignado ✓",
    acceptedSub: "Abriendo detalles del viaje...",
    declinedTitle: "Oferta Rechazada",
    declinedSub: "Enviando al siguiente conductor...",
    expiredTitle: "Oferta Expirada",
    expiredSub: "Enviando al siguiente conductor...",
    round: "Ronda",
    clientName: "Cliente",
    rideDetails: "Detalles del Viaje",
    transitioning: "Actualizando...",
    sending: "Enviando...",
    sent: "Enviado ✓",
  },
  ht: {
    network: "Rezo Sottovento",
    driverDashboard: "Panèl Chofè",
    youAreOnline: "Ou anliy",
    youAreOffline: "Ou pa anliy",
    newRideOffer: "Nouvo Sèvis",
    timeRemaining: "Tan ki rete",
    accept: "AKSEPTE",
    decline: "Refize",
    assignedRide: "Sèvis asiyen",
    enRoute: "Sou wout pran pasaje",
    arrived: "Rive nan pwen pran",
    inTrip: "Vwayaj an pwogrè",
    completed: "Vwayaj fini",
    startTrip: "Kòmanse vwayaj",
    enRouteBtn: "Mwen sou wout",
    arrivedBtn: "Mwen rive",
    startRide: "Kòmanse vwayaj",
    completeRide: "Fini vwayaj",
    backToDashboard: "Retounen nan panèl la",
    navigate: "Navige",
    call: "Rele",
    text: "Mesaj",
    noShow: "Pa parèt",
    route: "Wout",
    pickup: "Pran",
    dropoff: "Destinasyon",
    vehicle: "Machin",
    fare: "Pri",
    passenger: "Pasaje",
    elapsedTime: "Tan",
    bookingId: "Rezèvasyon",
    repeatClient: "Kliyan Fidèl",
    newClient: "Nouvo Kliyan",
    serviceAirport: "AYEWOPÒ",
    serviceHotel: "OTÈL",
    serviceVip: "VIP",
    rideCompletedTitle: "Vwayaj Fini ✓",
    rideCompletedSub: "Retounen nan panèl...",
    myTablet: "Tablèt Pasaje Mwen",
    tabletLink: "Lyen Tablèt",
    copy: "Kopye",
    copied: "✓ Kopye",
    open: "Ouvri ↗",
    qrPreview: "Apersi QR",
    hide: "▲ Kache",
    show: "▼ Montre",
    sourceOwnership: "Kijan pwopriyete sous travay",
    sourceOwnershipText1: "Chak kliyan ou mennen atravè kòd QR ou, lyen referans, oswa tablèt ou atribiye pou tout tan.",
    sourceOwnershipText2: "Lè yo rezève ankò, ou resevwa premye òf la — epi ou touche 15% komisyon sous menm si yon lòt chofè fè vwayaj la.",
    noOffer: "Ap tann vwayaj...",
    totalClients: "Total Kliyan",
    monthEarnings: "Lajan Mwa Sa",
    lifetimeEarnings: "Total Lajan",
    pendingOffers: "Òf Annatant",
    loading: "Ap chaje...",
    driverNotFound: "Chofè pa jwenn",
    contactAdmin: "Kontakte administratè ou pou jwenn kòd chofè ou.",
    tabletSetup: "Konfigirasyon Tablèt",
    tabletSetup1: "Ouvri lyen tablèt ou nan Safari sou iPad",
    tabletSetup2: 'Tape Pataje → "Ajoute nan Ekran Akèy"',
    tabletSetup3: "Rele l Sottovento Ride",
    tabletSetup4: "Toujou louvri l depi ikòn sou ekran akèy la",
    quickAccess: "Aksè Rapid",
    capturedClients: "Kliyan Mwen Yo",
    capturedClientsSub: "Wè lis konplè kliyan ou yo",
    earningsLabel: "Lajan Mwen",
    earningsSub: "Dekonpozisyon lajan ekzekisyon ak sous",
    referralLabel: "Lyen Referans Mwen",
    referralSub: "Pataje pou kaptire nouvo kliyan",
    sourceOffer: "Òf Sous",
    networkOffer: "Òf Rezo",
    acceptedTitle: "Vwayaj Asiyen ✓",
    acceptedSub: "Ap ouvri detay vwayaj...",
    declinedTitle: "Òf Refize",
    declinedSub: "Voye bay pwochen chofè...",
    expiredTitle: "Òf Ekspire",
    expiredSub: "Voye bay pwochen chofè...",
    round: "Wòn",
    clientName: "Kliyan",
    rideDetails: "Detay Vwayaj",
    transitioning: "Ap mete ajou...",
    sending: "Ap voye...",
    sent: "Voye ✓",
  },
}

// ─── TYPES ────────────────────────────────────────────────────
type RideStatus = "assigned" | "en_route" | "arrived" | "in_trip" | "completed" | "cancelled" | "no_show"

interface ActiveOffer {
  offer_id: string
  booking_id: string
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  vehicle_type: string
  total_price: number
  expires_at: string | null
  dispatch_status: string
  is_source_offer?: boolean
  offer_round?: number
  client_name?: string | null
  bookings_count?: number
}

interface ActiveRide {
  booking_id: string
  status: RideStatus
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  vehicle_type: string
  total_price: number
  client_name?: string | null
  client_phone?: string | null
  trip_started_at?: string | null
  bookings_count?: number
}

interface DriverSummary {
  driver_id: string
  driver_name: string
  driver_code: string
  driver_status: string
  total_clients: number
  month_earnings: number
  lifetime_earnings: number
  pending_offers: number
  active_offer: ActiveOffer | null
  assigned_ride: ActiveRide | null
}

const BASE_URL = "https://www.sottoventoluxuryride.com"

// ─── HOOKS ────────────────────────────────────────────────────
function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(999)
  useEffect(() => {
    if (!expiresAt) { setSecondsLeft(999); return }
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    calc()
    const id = setInterval(calc, 500)
    return () => clearInterval(id)
  }, [expiresAt])
  return secondsLeft
}

function useElapsed(startedAt: string | null) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const calc = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)))
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

// ─── HELPERS ──────────────────────────────────────────────────
function getServiceBadge(pickup: string, dropoff: string, isRepeat: boolean): string | null {
  const combined = (pickup + " " + dropoff).toLowerCase()
  if (combined.includes("airport") || combined.includes("mco") || combined.includes("mia") || combined.includes("fll")) return "AIRPORT"
  if (combined.includes("hotel") || combined.includes("resort") || combined.includes("marriott") || combined.includes("hilton") || combined.includes("ritz")) return "HOTEL"
  if (isRepeat) return "VIP"
  return null
}

function shortAddress(addr: string): string {
  // Return first meaningful segment (before comma)
  return addr.split(",")[0].trim()
}

// ─── LANG TOGGLE ─────────────────────────────────────────────
function LangToggle({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-700">
      {(["en", "es", "ht"] as Lang[]).map((l) => (
        <button key={l} onClick={() => onLang(l)}
          className="px-2 py-1 text-xs uppercase tracking-widest transition-all"
          style={{
            backgroundColor: lang === l ? GOLD : "transparent",
            color: lang === l ? "#000" : "#6b7280",
            fontWeight: lang === l ? 600 : 400,
          }}>
          {l}
        </button>
      ))}
    </div>
  )
}

// ─── CLIENT PROFILE STRIP ─────────────────────────────────────
function ClientProfileStrip({
  name, fare, pickup, dropoff, isRepeat, primaryColor, t,
}: {
  name: string | null | undefined
  fare: number
  pickup: string
  dropoff: string
  isRepeat: boolean
  primaryColor: string
  t: Record<string, string>
}) {
  const serviceBadge = getServiceBadge(pickup, dropoff, isRepeat)
  return (
    <div className="mx-4 mb-3 rounded-2xl border overflow-hidden"
      style={{ borderColor: primaryColor + "40", backgroundColor: primaryColor + "10" }}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-white truncate">
              {name ?? "Passenger"}
            </span>
            {isRepeat && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ backgroundColor: GOLD + "20", color: GOLD, border: `1px solid ${GOLD}60` }}>
                ⭐ {t.repeatClient}
              </span>
            )}
            {serviceBadge && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{ backgroundColor: primaryColor + "20", color: primaryColor, border: `1px solid ${primaryColor}60` }}>
                {serviceBadge}
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5 truncate">
            {shortAddress(pickup)} → {shortAddress(dropoff)}
          </div>
        </div>
        <div className="text-xl font-bold ml-3 flex-shrink-0" style={{ color: GOLD }}>
          ${fare.toFixed(0)}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function DriverDashboardByCode() {
  const params = useParams()
  const driverCode = (params?.driver_code as string)?.toUpperCase()

  const [lang, setLang] = useState<Lang>("en")
  const [summary, setSummary] = useState<DriverSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [responding, setResponding] = useState(false)
  const [respondResult, setRespondResult] = useState<"accepted" | "declined" | "expired" | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [completedFare, setCompletedFare] = useState<number | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const t = T[lang]
  const tabletUrl = driverCode ? `${BASE_URL}/tablet/${driverCode}` : ""

  useEffect(() => {
    if (!driverCode) return
    try { localStorage.setItem("sottovento_driver_code", driverCode) } catch {}
  }, [driverCode])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sln_driver_lang") as Lang | null
      if (saved && ["en", "es", "ht"].includes(saved)) setLang(saved)
    } catch {}
  }, [])

  const setLangAndSave = (l: Lang) => {
    setLang(l)
    try { localStorage.setItem("sln_driver_lang", l) } catch {}
  }

  const loadData = useCallback(async () => {
    if (!driverCode) return
    try {
      const res = await fetch(`/api/driver/me?code=${encodeURIComponent(driverCode)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      const d = data.driver
      let activeRide: ActiveRide | null = null
      if (d.assigned_ride) {
        activeRide = { ...d.assigned_ride, status: d.assigned_ride.status ?? "assigned" }
      }
      setSummary({
        driver_id: d.id,
        driver_name: d.full_name,
        driver_code: d.driver_code,
        driver_status: d.driver_status,
        total_clients: d.stats?.total_clients ?? 0,
        month_earnings: d.stats?.month_earnings ?? 0,
        lifetime_earnings: d.stats?.lifetime_earnings ?? 0,
        pending_offers: d.stats?.pending_offers ?? 0,
        active_offer: d.active_offer ?? null,
        assigned_ride: activeRide,
      })
      setLoading(false)
    } catch {
      setError("Failed to load driver data")
      setLoading(false)
    }
  }, [driverCode])

  useEffect(() => {
    loadData()
    pollRef.current = setInterval(loadData, POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadData])

  const respondOffer = async (response: "accepted" | "declined") => {
    if (!summary?.active_offer || responding) return
    setResponding(true)
    try {
      const res = await fetch("/api/dispatch/respond-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: summary.active_offer.offer_id,
          driver_id: summary.driver_id,
          response,
        }),
      })
      const data = await res.json()
      if (response === "accepted" && !data.error) {
        setRespondResult("accepted")
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 1500)
      } else {
        setRespondResult(response)
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2000)
      }
    } catch { setResponding(false) }
  }

  const handleOfferExpired = useCallback(() => {
    if (respondResult) return
    setRespondResult("expired")
    setTimeout(() => { setRespondResult(null); loadData() }, 2500)
  }, [respondResult, loadData])

  const transitionRide = async (newStatus: RideStatus) => {
    if (!summary?.assigned_ride || transitioning) return
    setTransitioning(true)
    try {
      const res = await fetch("/api/driver/ride-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_id: summary.driver_id,
          new_status: newStatus,
        }),
      })
      const data = await res.json()
      if (!data.error) {
        if (newStatus === "completed") {
          setCompletedFare(summary.assigned_ride.total_price)
          setShowCompleted(true)
          setTimeout(() => { setShowCompleted(false); setCompletedFare(null); loadData() }, 3000)
        } else {
          setSummary((prev) => {
            if (!prev || !prev.assigned_ride) return prev
            return {
              ...prev,
              assigned_ride: {
                ...prev.assigned_ride,
                status: newStatus,
                trip_started_at: newStatus === "in_trip" ? new Date().toISOString() : prev.assigned_ride.trip_started_at,
              },
            }
          })
        }
      }
    } catch {}
    setTransitioning(false)
  }

  const sendSMS = async (messageType: "arrived" | "en_route") => {
    if (!summary?.assigned_ride || smsSending) return
    setSmsSending(true)
    try {
      await fetch("/api/driver/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_id: summary.driver_id,
          message_type: messageType,
        }),
      })
      setSmsSent(true)
      setTimeout(() => setSmsSent(false), 3000)
    } catch {}
    setSmsSending(false)
  }

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tabletUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [tabletUrl])

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="text-center">
          <div className="text-zinc-500 text-sm mb-3">{t.loading}</div>
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white font-medium mb-2">{t.driverNotFound}</div>
          <div className="text-zinc-400 text-sm mb-4">{error ?? "Unknown error"}</div>
          <div className="text-zinc-500 text-xs">{t.contactAdmin}</div>
        </div>
      </div>
    )
  }

  // ── COMPLETION OVERLAY (v5 — shows +$amount) ─────────────────
  if (showCompleted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="text-7xl mb-5">✅</div>
        <div className="text-3xl font-light text-white mb-2">{t.rideCompletedTitle}</div>
        {completedFare !== null && (
          <div className="text-4xl font-bold mt-2" style={{ color: GOLD }}>
            +${completedFare.toFixed(0)}
          </div>
        )}
        <div className="text-sm text-zinc-400 mt-3">{t.rideCompletedSub}</div>
      </div>
    )
  }

  // ── OFFER RESPONSE OVERLAY ───────────────────────────────────
  if (respondResult) {
    const isAccepted = respondResult === "accepted"
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center"
        style={{
          backgroundColor: isAccepted ? "#052e16" : "#0a0a0a",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}>
        <div className="text-6xl mb-5">
          {isAccepted ? "✅" : respondResult === "declined" ? "✖️" : "⏰"}
        </div>
        <div className="text-2xl font-light text-white mb-2">
          {isAccepted ? t.acceptedTitle : respondResult === "declined" ? t.declinedTitle : t.expiredTitle}
        </div>
        <div className="text-sm text-zinc-400">
          {isAccepted ? t.acceptedSub : respondResult === "declined" ? t.declinedSub : t.expiredSub}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // PRIORITY 1: OFFER SCREEN
  // ══════════════════════════════════════════════════════════════
  if (summary.active_offer && !respondResult) {
    return (
      <OfferScreen
        offer={summary.active_offer}
        driverName={summary.driver_name}
        lang={lang}
        onLang={setLangAndSave}
        onAccept={() => respondOffer("accepted")}
        onDecline={() => respondOffer("declined")}
        onExpired={handleOfferExpired}
        responding={responding}
        t={t}
      />
    )
  }

  // ══════════════════════════════════════════════════════════════
  // PRIORITY 2: RIDE FLOW SCREEN
  // ══════════════════════════════════════════════════════════════
  if (summary.assigned_ride) {
    return (
      <RideFlowScreen
        ride={summary.assigned_ride}
        driverName={summary.driver_name}
        driverId={summary.driver_id}
        lang={lang}
        onLang={setLangAndSave}
        onTransition={transitionRide}
        transitioning={transitioning}
        onSendSMS={sendSMS}
        smsSending={smsSending}
        smsSent={smsSent}
        t={t}
      />
    )
  }

  // ══════════════════════════════════════════════════════════════
  // PRIORITY 3: CALM DASHBOARD
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-black text-white pb-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>

      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{t.network}</div>
          <h1 className="text-base font-light tracking-wide">{t.driverDashboard}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} onLang={setLangAndSave} />
          <div className="text-right">
            <div className="text-sm font-medium" style={{ color: GOLD }}>{summary.driver_name}</div>
            <div className="text-xs px-2 py-0.5 rounded-full inline-block mt-0.5"
              style={{
                backgroundColor: summary.driver_status === "active" ? "#14532d" : "#7f1d1d",
                color: summary.driver_status === "active" ? "#4ade80" : "#f87171",
              }}>
              {summary.driver_status === "active" ? t.youAreOnline : t.youAreOffline}
            </div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="mx-4 mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 8px #4ade80" }} />
        <span className="text-sm text-white/70">{t.noOffer}</span>
      </div>

      {/* Metrics */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {[
          { label: t.totalClients, value: summary.total_clients, icon: "👥", color: GOLD },
          { label: t.pendingOffers, value: summary.pending_offers, icon: "⏳", color: summary.pending_offers > 0 ? "#f87171" : "#6b7280" },
          { label: t.monthEarnings, value: `$${summary.month_earnings.toFixed(2)}`, icon: "💰", color: GOLD },
          { label: t.lifetimeEarnings, value: `$${summary.lifetime_earnings.toFixed(2)}`, icon: "📈", color: "#a78bfa" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xl mb-1">{card.icon}</div>
            <div className="text-xl font-light" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tablet section */}
      <div className="px-4 mt-5">
        <div className="text-xs text-zinc-500 uppercase tracking-widest px-1 mb-2">{t.myTablet}</div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">{t.tabletLink}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono flex-1 truncate" style={{ color: GOLD }}>
                /tablet/{summary.driver_code}
              </span>
              <button onClick={copyLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 transition shrink-0">
                {copied ? t.copied : t.copy}
              </button>
              <a href={tabletUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 transition shrink-0">
                {t.open}
              </a>
            </div>
          </div>
          <div className="px-5 py-3">
            <button onClick={() => setShowQR(!showQR)} className="flex items-center justify-between w-full">
              <span className="text-sm text-white">{t.qrPreview}</span>
              <span className="text-zinc-500 text-sm">{showQR ? t.hide : t.show}</span>
            </button>
            {showQR && (
              <div className="flex flex-col items-center gap-3 mt-4 pb-2">
                <div className="p-3 rounded-xl bg-white">
                  <QRCodeSVG value={tabletUrl} size={150} bgColor="#ffffff" fgColor="#000000" level="M" />
                </div>
                <div className="text-xs tracking-widest uppercase text-center" style={{ color: GOLD }}>
                  {summary.driver_code}
                </div>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t.tabletSetup}</div>
            <ol className="space-y-1 text-xs text-zinc-400 list-decimal list-inside">
              <li>{t.tabletSetup1}</li>
              <li>{t.tabletSetup2}</li>
              <li>{t.tabletSetup3}</li>
              <li>{t.tabletSetup4}</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div className="px-4 mt-5 space-y-3">
        <div className="text-xs text-zinc-500 uppercase tracking-widest px-1 mb-2">{t.quickAccess}</div>
        <Link href={`/driver/${driverCode}/source-clients`}
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition">
          <div>
            <div className="text-sm font-medium">{t.capturedClients}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{t.capturedClientsSub}</div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>
        <Link href={`/driver/${driverCode}/earnings`}
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition">
          <div>
            <div className="text-sm font-medium">{t.earningsLabel}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{t.earningsSub}</div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>
        <Link href={`/?ref=${summary.driver_code}`} target="_blank"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition">
          <div>
            <div className="text-sm font-medium">{t.referralLabel}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{t.referralSub}</div>
          </div>
          <span style={{ color: GOLD }}>↗</span>
        </Link>
      </div>

      {/* Source ownership */}
      <div className="mx-4 mt-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t.sourceOwnership}</div>
        <div className="space-y-2 text-xs text-zinc-400">
          <p>{t.sourceOwnershipText1}</p>
          <p>
            {t.sourceOwnershipText2.split("15%")[0]}
            <span style={{ color: GOLD }}>15%</span>
            {t.sourceOwnershipText2.split("15%")[1]}
          </p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// OFFER SCREEN — full screen priority mode
// ══════════════════════════════════════════════════════════════
function OfferScreen({
  offer, driverName, lang, onLang, onAccept, onDecline, onExpired, responding, t,
}: {
  offer: ActiveOffer; driverName: string; lang: Lang; onLang: (l: Lang) => void
  onAccept: () => void; onDecline: () => void; onExpired: () => void
  responding: boolean; t: Record<string, string>
}) {
  const secondsLeft = useCountdown(offer.expires_at)
  const hasExpiry = !!offer.expires_at
  const expired = hasExpiry && secondsLeft === 0

  const expiredRef = useRef(false)
  useEffect(() => {
    if (expired && !expiredRef.current && !responding) {
      expiredRef.current = true
      onExpired()
    }
  }, [expired, responding, onExpired])

  const timerColor =
    !hasExpiry ? "#ffffff" :
    secondsLeft > 60 ? "#ffffff" :
    secondsLeft > 20 ? "#f59e0b" : "#ef4444"

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")
  const maxSeconds = hasExpiry
    ? Math.max(90, Math.ceil((new Date(offer.expires_at!).getTime() - Date.now()) / 1000) + secondsLeft)
    : 90
  const progressPct = hasExpiry ? Math.min(100, (secondsLeft / maxSeconds) * 100) : 100

  const pickupDate = offer.pickup_datetime
    ? new Date(offer.pickup_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""
  const pickupTime = offer.pickup_datetime
    ? new Date(offer.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""

  const isRepeat = (offer.bookings_count ?? 0) > 1
  const serviceBadge = getServiceBadge(offer.pickup_location, offer.dropoff_location, isRepeat)

  return (
    <div className="fixed inset-0 flex flex-col bg-black"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: GOLD }}>
            {t.newRideOffer}
          </span>
          {offer.is_source_offer && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "#1c1400", color: GOLD, border: `1px solid ${GOLD}` }}>
              {t.sourceOffer}
            </span>
          )}
          {serviceBadge && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: GOLD + "20", color: GOLD, border: `1px solid ${GOLD}60` }}>
              {serviceBadge}
            </span>
          )}
          {offer.offer_round && offer.offer_round > 1 && (
            <span className="text-xs text-zinc-500">{t.round} {offer.offer_round}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} onLang={onLang} />
          <span className="text-xs text-zinc-500 hidden sm:block">{driverName}</span>
        </div>
      </div>

      {/* Client strip (if name available) */}
      {offer.client_name && (
        <div className="px-5 pt-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{offer.client_name}</span>
            {isRepeat && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: GOLD + "20", color: GOLD, border: `1px solid ${GOLD}60` }}>
                ⭐ {t.repeatClient}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center min-h-0">

          {/* Pickup */}
          <div className="mb-1">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              {t.pickup}
            </div>
            <div className="text-2xl font-light text-white leading-tight">{offer.pickup_location}</div>
          </div>

          <div className="flex items-center gap-3 my-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="text-zinc-600 text-lg">↓</div>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Dropoff */}
          <div className="mb-5">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              {t.dropoff}
            </div>
            <div className="text-2xl font-light text-white leading-tight">{offer.dropoff_location}</div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.pickup}</div>
              <div className="text-sm font-medium text-white">{pickupDate || "—"}</div>
              <div className="text-xs text-zinc-300">{pickupTime || "—"}</div>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.vehicle}</div>
              <div className="text-sm font-medium text-white leading-tight">{offer.vehicle_type}</div>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.fare}</div>
              <div className="text-xl font-bold" style={{ color: GOLD }}>${offer.total_price.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {hasExpiry && (
          <div className="mt-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">{t.timeRemaining}</span>
              <span className="text-2xl font-mono font-bold tabular-nums" style={{ color: timerColor }}>
                {mm}:{ss}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: timerColor }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex-shrink-0 space-y-3">
          <button
            onClick={onAccept}
            disabled={responding || expired}
            className="w-full py-5 rounded-2xl text-lg font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: GOLD, color: "#000" }}>
            {responding ? "..." : t.accept}
          </button>
          <button
            onClick={onDecline}
            disabled={responding || expired}
            className="w-full py-3 rounded-2xl border border-zinc-700 text-zinc-300 text-sm font-medium transition-all active:scale-95 disabled:opacity-40">
            {t.decline}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// RIDE FLOW SCREEN — 5 states, state visual system, client strip
// ══════════════════════════════════════════════════════════════
function RideFlowScreen({
  ride, driverName, driverId, lang, onLang, onTransition, transitioning, onSendSMS, smsSending, smsSent, t,
}: {
  ride: ActiveRide; driverName: string; driverId: string; lang: Lang
  onLang: (l: Lang) => void; onTransition: (s: RideStatus) => void
  transitioning: boolean
  onSendSMS: (type: "arrived" | "en_route") => void
  smsSending: boolean; smsSent: boolean
  t: Record<string, string>
}) {
  const elapsed = useElapsed(ride.trip_started_at ?? null)
  const theme = STATE_THEME[ride.status] ?? STATE_THEME.assigned
  const isRepeat = (ride.bookings_count ?? 0) > 1

  const pickupDate = ride.pickup_datetime
    ? new Date(ride.pickup_datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""
  const pickupTime = ride.pickup_datetime
    ? new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""

  const mapsPickupUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(ride.pickup_location)}`
  const mapsDropoffUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(ride.dropoff_location)}`
  const contactUrl = ride.client_phone ? `tel:${ride.client_phone}` : null

  const stateConfig: Record<RideStatus, {
    headerLabel: string
    primaryLabel: string
    primaryAction: RideStatus | null
    showNavigate: boolean
    navigateUrl: string
    showContact: boolean
    showNoShow?: boolean
    showElapsed?: boolean
    smsType?: "arrived" | "en_route"
  }> = {
    assigned: {
      headerLabel: t.assignedRide,
      primaryLabel: t.enRouteBtn,
      primaryAction: "en_route",
      showNavigate: true,
      navigateUrl: mapsPickupUrl,
      showContact: true,
    },
    en_route: {
      headerLabel: t.enRoute,
      primaryLabel: t.arrivedBtn,
      primaryAction: "arrived",
      showNavigate: true,
      navigateUrl: mapsPickupUrl,
      showContact: true,
      smsType: "en_route",
    },
    arrived: {
      headerLabel: t.arrived,
      primaryLabel: t.startRide,
      primaryAction: "in_trip",
      showNavigate: false,
      navigateUrl: mapsPickupUrl,
      showContact: true,
      showNoShow: true,
      smsType: "arrived",
    },
    in_trip: {
      headerLabel: t.inTrip,
      primaryLabel: t.completeRide,
      primaryAction: "completed",
      showNavigate: true,
      navigateUrl: mapsDropoffUrl,
      showContact: false,
      showElapsed: true,
    },
    completed: {
      headerLabel: t.completed,
      primaryLabel: t.backToDashboard,
      primaryAction: null,
      showNavigate: false,
      navigateUrl: "",
      showContact: false,
    },
    cancelled: {
      headerLabel: "Cancelled",
      primaryLabel: t.backToDashboard,
      primaryAction: null,
      showNavigate: false,
      navigateUrl: "",
      showContact: false,
    },
    no_show: {
      headerLabel: "No Show",
      primaryLabel: t.backToDashboard,
      primaryAction: null,
      showNavigate: false,
      navigateUrl: "",
      showContact: false,
    },
  }

  const cfg = stateConfig[ride.status] ?? stateConfig.assigned
  const steps: RideStatus[] = ["assigned", "en_route", "arrived", "in_trip", "completed"]
  const currentIdx = steps.indexOf(ride.status)

  return (
    <div className="fixed inset-0 flex flex-col"
      style={{
        backgroundColor: theme.bg,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: theme.primary + "30" }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: theme.dot }} />
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Sottovento Network</div>
            <div className="text-sm font-semibold" style={{ color: theme.primary }}>{cfg.headerLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} onLang={onLang} />
          <div className="text-sm font-medium" style={{ color: GOLD }}>{driverName}</div>
        </div>
      </div>

      {/* ── Progress bar (state-colored) ── */}
      <div className="flex items-center px-5 py-3 gap-1 flex-shrink-0">
        {steps.map((step, idx) => (
          <div key={step} className="flex items-center flex-1">
            <div className="h-1.5 flex-1 rounded-full transition-all duration-500"
              style={{ backgroundColor: idx <= currentIdx ? theme.primary : "#27272a" }} />
            {idx < steps.length - 1 && (
              <div className="w-1.5 h-1.5 rounded-full mx-0.5 flex-shrink-0"
                style={{ backgroundColor: idx < currentIdx ? theme.primary : "#27272a" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Client Profile Strip (TOP PRIORITY — always visible) ── */}
      <ClientProfileStrip
        name={ride.client_name}
        fare={ride.total_price}
        pickup={ride.pickup_location}
        dropoff={ride.dropoff_location}
        isRepeat={isRepeat}
        primaryColor={theme.primary}
        t={t}
      />

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">

        {/* Route card */}
        <div className="rounded-2xl border overflow-hidden mb-4"
          style={{ borderColor: theme.primary + "30", backgroundColor: "#0f0f0f" }}>
          <div className="px-5 py-4">
            <div className="mb-1">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {t.pickup}
              </div>
              <div className="text-lg font-light text-white">{ride.pickup_location}</div>
            </div>
            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-zinc-800" />
              <div className="text-zinc-600 text-sm">↓</div>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {t.dropoff}
              </div>
              <div className="text-lg font-light text-white">{ride.dropoff_location}</div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-3 divide-x border-t"
            style={{ borderColor: theme.primary + "20", divideColor: theme.primary + "20" }}>
            <div className="px-4 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.pickup}</div>
              <div className="text-sm font-medium text-white">{pickupDate}</div>
              <div className="text-xs text-zinc-300">{pickupTime}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.vehicle}</div>
              <div className="text-sm font-medium text-white">{ride.vehicle_type}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.fare}</div>
              <div className="text-xl font-bold" style={{ color: GOLD }}>${ride.total_price.toFixed(0)}</div>
            </div>
          </div>

          {/* Elapsed time (in_trip only) */}
          {cfg.showElapsed && (
            <div className="px-5 py-3 border-t flex items-center justify-between"
              style={{ borderColor: theme.primary + "30", backgroundColor: theme.primary + "08" }}>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">{t.elapsedTime}</div>
              <div className="text-xl font-mono font-bold tabular-nums" style={{ color: theme.primary }}>{elapsed}</div>
            </div>
          )}

          {/* Booking ID */}
          <div className="px-5 py-2 border-t border-zinc-800/50">
            <div className="text-xs text-zinc-600 font-mono truncate">
              {t.bookingId}: {ride.booking_id.slice(0, 8)}...
            </div>
          </div>
        </div>

        {/* Contact actions row: Navigate + Call + Text */}
        {(cfg.showNavigate || cfg.showContact) && (
          <div className="flex gap-2 mb-4">
            {cfg.showNavigate && (
              <a href={cfg.navigateUrl}
                className="flex-1 py-3.5 rounded-2xl border text-center text-sm font-medium transition-all active:scale-95"
                style={{ borderColor: theme.primary + "50", color: theme.primary }}>
                {t.navigate}
              </a>
            )}
            {cfg.showContact && contactUrl && (
              <a href={contactUrl}
                className="flex-1 py-3.5 rounded-2xl border text-center text-sm font-medium text-zinc-300 transition-all active:scale-95"
                style={{ borderColor: "#4b5563" }}>
                {t.call}
              </a>
            )}
            {cfg.showContact && cfg.smsType && (
              <button
                onClick={() => cfg.smsType && onSendSMS(cfg.smsType)}
                disabled={smsSending || smsSent}
                className="flex-1 py-3.5 rounded-2xl border text-center text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
                style={{ borderColor: "#4b5563", color: smsSent ? "#4ade80" : "#d1d5db" }}>
                {smsSending ? t.sending : smsSent ? t.sent : t.text}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Primary action (state-colored) ── */}
      <div className="px-4 flex-shrink-0 space-y-3">
        {cfg.primaryAction ? (
          <button
            onClick={() => cfg.primaryAction && onTransition(cfg.primaryAction)}
            disabled={transitioning}
            className="w-full py-5 rounded-2xl text-lg font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: theme.primary, color: theme.primary === "#f59e0b" || theme.primary === GOLD || theme.primary === "#4ade80" ? "#000" : "#fff" }}>
            {transitioning ? t.transitioning : cfg.primaryLabel}
          </button>
        ) : (
          <div className="text-center text-zinc-400 text-sm py-4">{cfg.primaryLabel}</div>
        )}

        {cfg.showNoShow && (
          <button
            onClick={() => onTransition("no_show")}
            disabled={transitioning}
            className="w-full py-3 rounded-2xl border border-zinc-800 text-zinc-500 text-sm font-medium transition-all active:scale-95 disabled:opacity-40">
            {t.noShow}
          </button>
        )}
      </div>
    </div>
  )
}
