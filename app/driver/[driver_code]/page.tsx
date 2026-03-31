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
  accepted:  { primary: GOLD,      bg: "#0a0a00", dot: "#4ade80" },
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
    flightNumber: "Flight",
    airline: "Airline",
    terminal: "Terminal / Door",
    serviceType: "Service Type",
    passengerPhone: "Phone",
    passengers: "Pax",
    luggage: "Bags",
    notes: "Notes",
    meetGreet: "MEET & GREET",
    curbside: "CURBSIDE",
    transfer: "TRANSFER",
    readinessWarning: "Complete ride data required before departure",
    gpsRequiredWarning: "GPS inactive — enable location to proceed",
    overrideGps: "Proceed without GPS",
    cancelOverride: "Cancel",
    returnToDispatch: "Return to Dispatch",
    reportIncomplete: "Report Incomplete Data",
    requestCorrection: "Request Correction",
    rejectRide: "Reject Ride",
    recoveryTitle: "Need Help?",
    reportSent: "Admin notified ✓",
    returnedToDispatch: "Returned to dispatch ✓",
    rideRejected: "Ride rejected – returning...",
    actionFailed: "Action failed. Try again.",
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
    flightNumber: "Vuelo",
    airline: "Aerolínea",
    terminal: "Terminal / Puerta",
    serviceType: "Tipo de Servicio",
    passengerPhone: "Teléfono",
    passengers: "Pax",
    luggage: "Maletas",
    notes: "Notas",
    meetGreet: "MEET & GREET",
    curbside: "CURBSIDE",
    transfer: "TRASLADO",
    readinessWarning: "Se requieren datos completos antes de salir",
    gpsRequiredWarning: "GPS inactivo — activa la ubicación para continuar",
    overrideGps: "Continuar sin GPS",
    cancelOverride: "Cancelar",
    returnToDispatch: "Devolver al Despacho",
    reportIncomplete: "Reportar Datos Incompletos",
    requestCorrection: "Solicitar Corrección",
    rejectRide: "Rechazar Viaje",
    recoveryTitle: "¿Necesitas ayuda?",
    reportSent: "Admin notificado ✓",
    returnedToDispatch: "Devuelto al despacho ✓",
    rideRejected: "Viaje rechazado – volviendo...",
    actionFailed: "Acción fallida. Inténtalo de nuevo.",
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
    flightNumber: "Vòl",
    airline: "Konpayi Avyon",
    terminal: "Tèminal / Pòt",
    serviceType: "Tip Sèvis",
    passengerPhone: "Telefòn",
    passengers: "Pasaje",
    luggage: "Valiz",
    notes: "Nòt",
    meetGreet: "MEET & GREET",
    curbside: "CURBSIDE",
    transfer: "TRANSFÈ",
    readinessWarning: "Done konplè obligatwa anvan depa",
    gpsRequiredWarning: "GPS inaktif — aktive kote ou ye pou kontinye",
    overrideGps: "Kontinye san GPS",
    cancelOverride: "Anile",
    returnToDispatch: "Retounen nan Dispach",
    reportIncomplete: "Rapò Done Enkomplet",
    requestCorrection: "Mande Koreksyon",
    rejectRide: "Refize Vwayaj",
    recoveryTitle: "Bezwen Ede?",
    reportSent: "Admin avize ✓",
    returnedToDispatch: "Retounen nan dispach ✓",
    rideRejected: "Vwayaj refize – ap retounen...",
    actionFailed: "Aksyon echwe. Eseye ankò.",
  },
}

// ─── TYPES ────────────────────────────────────────────────────
type RideStatus = "offer_pending" | "accepted" | "assigned" | "en_route" | "arrived" | "in_trip" | "completed" | "cancelled" | "no_show"

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
  pickup_zone?: string | null
  dropoff_zone?: string | null
  pickup_datetime: string | null
  vehicle_type: string
  total_price: number
  client_name?: string | null
  client_phone?: string | null
  service_type?: string | null
  flight_number?: string | null
  notes?: string | null
  passengers?: number | null
  luggage?: number | null
  trip_started_at?: string | null
  en_route_at?: string | null
  arrived_at?: string | null
  completed_at?: string | null
  bookings_count?: number
  ride_mode?: "active_window" | "live_flow" | "upcoming" | "offer_pending"
  minutes_until_pickup?: number | null
  updated_at?: string | null
  dispatch_status?: string | null
  offer_expires_at?: string | null
  pickup_lat?: number | null
  pickup_lng?: number | null
  dropoff_lat?: number | null
  dropoff_lng?: number | null
}

interface UpcomingRide {
  booking_id: string
  status: string
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  vehicle_type: string
  total_price: number
  ride_window_state: string
  minutes_until_pickup?: number | null
  flight_number?: string | null
  passengers?: number | null
  luggage?: string | null
  notes?: string | null
  client_name?: string | null
  client_phone?: string | null
}

interface CompletedRide {
  booking_id: string
  status: string
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  completed_at: string | null
  vehicle_type: string
  total_price: number
  flight_number?: string | null
  notes?: string | null
  passengers?: number | null
  luggage?: number | null
  client_name?: string | null
  client_phone?: string | null
  driver_earnings?: number | null
  sln_commission?: number | null
  source_earnings?: number | null
  dispatch_status?: string | null
  ride_mode?: string | null
  captured_by_driver_code?: string | null
  minutes_until_pickup?: number | null
  payout_status?: string | null
  cancel_reason?: string | null
  cancel_responsibility?: string | null
  passenger_no_show?: boolean | null
  early_cancel?: boolean | null
  late_cancel?: boolean | null
  cancelled_at?: string | null
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
  completed_rides_count: number
  active_offer: ActiveOffer | null
  assigned_ride: ActiveRide | null
  upcoming_rides: UpcomingRide[]
  completed_rides: CompletedRide[]
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
  const [dashTab, setDashTab] = useState<"overview" | "upcoming" | "completed" | "earnings">("overview")
    // ── Temporal guardrail modals ─────────────────────────────
  const [showEarlyStartModal, setShowEarlyStartModal] = useState(false)
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const [overdueMinutes, setOverdueMinutes] = useState<number>(0)
  const [pendingTransition, setPendingTransition] = useState<RideStatus | null>(null)
  // ── GPS state ─────────────────────────────────────────────────
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  // ── New ride assignment alert modal ───────────────────────────
  const [showNewRideAlert, setShowNewRideAlert] = useState(false)
  const [newRideAlertData, setNewRideAlertData] = useState<{ pickup: string; dropoff: string; fare: number; pickup_time: string | null } | null>(null)
  // ── Driver recovery actions ──────────────────────────────────
  const [reporting, setReporting] = useState(false)
  const [reportResult, setReportResult] = useState<{ action: string; success: boolean } | null>(null)
  // ── Upcoming ride detail expand ─────────────────────────────────
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null)
  // ── Completed ride detail expand ─────────────────────────────────
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null)
  // ── Referral share modal ─────────────────────────────────────
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)
  // ── Dispatch live sync ────────────────────────────────────────
  const [rideUpdatedByDispatch, setRideUpdatedByDispatch] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevRideIdRef = useRef<string | null>(null)
  const prevOfferIdRef = useRef<string | null>(null)
  const prevRideUpdatedAtRef = useRef<string | null>(null)
  // ── Real-time alert layer ─────────────────────────────────────
  // showOfferBanner: persistent top banner while offer is active
  // offerAlertCount: cumulative new-offer count in this session
  // showOfferAlertModal: foreground modal triggered on transition no_offer → new_offer
  const [showOfferBanner, setShowOfferBanner] = useState(false)
  const [offerAlertCount, setOfferAlertCount] = useState(0)
  const [showOfferAlertModal, setShowOfferAlertModal] = useState(false)
  // DEDUP GUARD: track the last booking_id that was accepted by this driver.
  // After acceptance, block any offer screen for this booking_id until the backend
  // confirms status='accepted' (prevents race condition re-render of OfferScreen).
  const lastAcceptedBookingIdRef = useRef<string | null>(null)
  // ── Overdue live timer (Fase 3) ──────────────────────────────────────────
  // Shows real-time minutes overdue in RideFlowScreen when pickup_at has passed
  const [overdueSeconds, setOverdueSeconds] = useState<number>(0)
  const overdueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // ── Geofence Override Modal ───────────────────────────────────────────────
  // Shown when driver tries to trigger arrived/start_trip/complete_trip
  // while not within the allowed radius of pickup/dropoff.
  // Persists: driver coords, expected coords, distance, timestamp, override_confirmed=true
  const [showGeoModal, setShowGeoModal] = useState(false)
  const [geoModalData, setGeoModalData] = useState<{
    action: RideStatus
    message: string
    driverLat: number
    driverLng: number
    targetLat: number
    targetLng: number
    distanceMeters: number
  } | null>(null)
  // ── Cancel Reason Modal (Fases 1-9) ──────────────────────────────────────
  // showCancelModal: shows the cancel reason selection modal
  // cancelReason: selected reason key
  // cancelNotes: free text for 'OTHER' reason
  // cancelStep: 'reason' | 'no_show_confirm' | 'submitting' | 'done'
  // cancelResult: result of the cancel API call
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState<string>("")
  const [cancelNotes, setCancelNotes] = useState<string>("")
  const [cancelStep, setCancelStep] = useState<"reason" | "no_show_confirm" | "submitting" | "done">("reason")
  const [cancelResult, setCancelResult] = useState<{ success: boolean; responsibility?: string; payout_status?: string; message?: string } | null>(null)

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

  const playAlert = useCallback(() => {
    try {
      // Web Audio API beep — works without audio file
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.30)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
    } catch {}
  }, [])

  const loadData = useCallback(async () => {
    if (!driverCode) return
    try {
      // cache: 'no-store' ensures we always get fresh data from the server
      const res = await fetch(`/api/driver/me?code=${encodeURIComponent(driverCode)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      const d = data.driver
      let activeRide: ActiveRide | null = null
      if (d.assigned_ride) {
        activeRide = { ...d.assigned_ride, status: d.assigned_ride.status ?? "assigned" }
      }

      // ── Detect new ride or offer and play alert ──────────────────────
      const newRideId = activeRide?.booking_id ?? null
      const newOfferId = d.active_offer?.offer_id ?? null
      const newUpdatedAt = activeRide?.updated_at ?? null

      const hadNoRide = prevRideIdRef.current === null
      const hadNoOffer = prevOfferIdRef.current === null
      const rideChanged = newRideId !== null && newRideId !== prevRideIdRef.current
      const offerChanged = newOfferId !== null && newOfferId !== prevOfferIdRef.current

      // Detect booking update by dispatch (same ride, newer updated_at)
      const sameRide = newRideId !== null && newRideId === prevRideIdRef.current
      const rideDataUpdated = sameRide &&
        newUpdatedAt !== null &&
        prevRideUpdatedAtRef.current !== null &&
        newUpdatedAt !== prevRideUpdatedAtRef.current

      // ── ALERT LAYER: detect transition no_offer → new_offer ──────────────────────
      // offerChanged && hadNoOffer = genuine new offer arrived in this session
      if (offerChanged && hadNoOffer) {
        // 1. Persistent top banner
        setShowOfferBanner(true)
        // 2. Increment counter (supports multiple offers in session)
        setOfferAlertCount((c) => c + 1)
        // 3. Foreground modal (auto-opens)
        setShowOfferAlertModal(true)
        // 4. Vibration: urgent triple-pulse pattern per spec
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]) } catch {}
        // 5. Sound: only if tab is visible
        if (document.visibilityState === 'visible') {
          playAlert()
        }
      }

      // Clear banner and counter when offer disappears (accepted/declined/expired)
      if (!d.active_offer && prevOfferIdRef.current !== null) {
        setShowOfferBanner(false)
        setOfferAlertCount(0)
        setShowOfferAlertModal(false)
      }

      if (rideChanged || (offerChanged && hadNoOffer)) {
        if (!offerChanged || !hadNoOffer) playAlert() // avoid double-play when both conditions true
        // Vibrate if supported (pattern: 3 pulses)
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]) } catch {}
        // Browser Notification API — fires even when tab is in background
        if (rideChanged && activeRide) {
          try {
            if (typeof Notification !== 'undefined') {
              const sendBrowserNotif = () => {
                new Notification('SLN — New Ride Assigned', {
                  body: `Pickup: ${activeRide.pickup_location ?? 'TBD'} → ${activeRide.dropoff_location ?? 'TBD'}`,
                  icon: '/favicon.ico',
                  tag: 'sln-new-ride',
                  requireInteraction: true,
                })
              }
              if (Notification.permission === 'granted') {
                sendBrowserNotif()
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(p => { if (p === 'granted') sendBrowserNotif() })
              }
            }
          } catch {}
        }
        // Show dominant modal for new ride assignment
        // v6: Only show if it's NOT an offer_pending (which has its own full-screen UI)
        // v7: Also exclude rides that are already accepted/assigned (status='accepted'/'assigned')
        //     when the driver opens the app — prevRideIdRef=null means first load, not new assignment.
        //     Only fire for genuinely new ride assignments during an active session.
        const isFirstLoad = hadNoRide // prevRideIdRef was null before this poll
        const isAlreadyAccepted = activeRide?.status === "accepted" || activeRide?.status === "assigned"
        const isOfferGated = activeRide?.ride_mode === "offer_pending" || activeRide?.status === "offer_pending"
        if (rideChanged && activeRide && !isOfferGated && !(isFirstLoad && isAlreadyAccepted)) {
          setNewRideAlertData({
            pickup: activeRide.pickup_location,
            dropoff: activeRide.dropoff_location,
            fare: activeRide.total_price,
            pickup_time: activeRide.pickup_datetime,
          })
          setShowNewRideAlert(true)
        }
      }

      // If dispatch updated the booking data, show sync banner and clear any report result
      if (rideDataUpdated) {
        setRideUpdatedByDispatch(true)
        setReportResult(null) // clear recovery screen so driver sees updated ride
        // Auto-dismiss the banner after 8 seconds
        setTimeout(() => setRideUpdatedByDispatch(false), 8000)
      }

      prevRideIdRef.current = newRideId
      prevOfferIdRef.current = newOfferId
      prevRideUpdatedAtRef.current = newUpdatedAt
      // DEDUP GUARD: clear lastAcceptedBookingIdRef once backend confirms status='accepted'
      // for that booking (either in assigned_ride or upcoming_rides).
      // This allows future offers for a different booking to appear normally.
      if (lastAcceptedBookingIdRef.current) {
        const acceptedId = lastAcceptedBookingIdRef.current
        const confirmedInAssigned = activeRide?.booking_id === acceptedId &&
          (activeRide?.status === 'accepted' || activeRide?.dispatch_status === 'accepted')
        const confirmedInUpcoming = (d.upcoming_rides ?? []).some(
          (r: any) => r.booking_id === acceptedId && (r.status === 'accepted' || r.dispatch_status === 'accepted')
        )
        if (confirmedInAssigned || confirmedInUpcoming) {
          lastAcceptedBookingIdRef.current = null
        }
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
        completed_rides_count: d.stats?.completed_rides_count ?? 0,
        active_offer: d.active_offer ?? null,
        assigned_ride: activeRide,
        upcoming_rides: d.upcoming_rides ?? [],
        completed_rides: d.completed_rides ?? [],
      })
      setLoading(false)
    } catch {
      setError("Failed to load driver data")
      setLoading(false)
    }
  }, [driverCode, playAlert])

  useEffect(() => {
    loadData()
    pollRef.current = setInterval(loadData, POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadData])
  // ── Visibility: immediate loadData when driver returns to app tab ──────────────
  // Ensures offer appears instantly when driver opens the PWA from background.
  // Without this, the driver would wait up to POLL_INTERVAL (5s) to see a new offer.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])
  // ── Heartbeat: trigger server-side cron every 60s while panel is visible ─
  // Simulates Vercel Pro cron frequency on Hobby plan.
  // Covers: offer expiry for drivers who closed the app / lost signal.
  // Fire-and-forget — does NOT block render, does NOT affect UX.
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetch('/api/cron/expire-driver-offers', { method: 'GET' }).catch(() => {})
      }
    }, 60000)
    return () => clearInterval(heartbeat)
  }, [])
  // ── Overdue live timer (Fase 3) ──────────────────────────────────────────
  // Starts a 1s interval when the assigned ride has pickup_at in the past.
  // Updates overdueSeconds every second so the RideFlowScreen shows live elapsed time.
  // Clears automatically when ride is no longer overdue or no assigned ride.
  useEffect(() => {
    const ride = summary?.assigned_ride
    if (!ride?.pickup_datetime) {
      setOverdueSeconds(0)
      if (overdueTimerRef.current) { clearInterval(overdueTimerRef.current); overdueTimerRef.current = null }
      return
    }
    const pickupMs = new Date(ride.pickup_datetime).getTime()
    const nowMs = Date.now()
    const diffSec = Math.floor((nowMs - pickupMs) / 1000)
    if (diffSec <= 0) {
      setOverdueSeconds(0)
      if (overdueTimerRef.current) { clearInterval(overdueTimerRef.current); overdueTimerRef.current = null }
      return
    }
    setOverdueSeconds(diffSec)
    if (overdueTimerRef.current) clearInterval(overdueTimerRef.current)
    overdueTimerRef.current = setInterval(() => {
      setOverdueSeconds(Math.floor((Date.now() - pickupMs) / 1000))
    }, 1000)
    return () => {
      if (overdueTimerRef.current) { clearInterval(overdueTimerRef.current); overdueTimerRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary?.assigned_ride?.booking_id, summary?.assigned_ride?.pickup_datetime])

  // ── GPS: continuous watchPosition for live tracking ──────────────────────
  const gpsWatchRef = useRef<number | null>(null)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported")
      return
    }
    // Start continuous watch immediately
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsError(null)
      },
      (err) => {
        setGpsError(err.message)
        // On permission denied, stop watching
        if (err.code === 1 && gpsWatchRef.current !== null) {
          navigator.geolocation.clearWatch(gpsWatchRef.current)
          gpsWatchRef.current = null
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current)
        gpsWatchRef.current = null
      }
    }
  }, [])

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
        // DEDUP GUARD: record accepted booking_id to block re-render of OfferScreen
        if (summary.active_offer?.booking_id) {
          lastAcceptedBookingIdRef.current = summary.active_offer.booking_id
        }
        setRespondResult("accepted")
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 1500)
      } else {
        setRespondResult(response)
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2000)
      }
    } catch { setResponding(false) }
  }
  const respondOfferDirect = async (bookingId: string, response: "accepted" | "declined") => {
    if (responding) return
    setResponding(true)
    try {
      const res = await fetch("/api/dispatch/respond-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          driver_id: summary?.driver_id,
          response,
        }),
      })
      const data = await res.json()
      if (response === "accepted") {
        // Accept: treat success (2xx) OR 409 'already responded' as accepted.
        // 409 means the offer was already accepted (e.g. double-tap) — safe to proceed.
        // 404 'Offer not found' with booking_id path = offer row missing, but booking
        //     may still be valid — the backend fallback handles this case now.
        // Any other error (500, 410 expired+dispatched) = show as declined/expired.
        const isSuccess = res.ok || res.status === 409
        if (isSuccess) {
          // DEDUP GUARD: record accepted booking_id to block re-render of OfferScreen
          lastAcceptedBookingIdRef.current = bookingId
          setRespondResult("accepted")
          // 2500ms delay: gives DB time to propagate dispatch_status='accepted'
          // before re-fetch. Prevents offer screen from re-appearing during transition.
          setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2500)
        } else if (res.status === 410) {
          // Offer expired and dispatched to network
          setRespondResult("expired")
          setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2500)
        } else {
          // Unexpected error — log and clear
          console.error('[respondOfferDirect] accept failed:', res.status, data?.error)
          setRespondResult(null)
          setResponding(false)
          loadData()
        }
      } else {
        setRespondResult(response)
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2000)
      }
    } catch { setResponding(false) }
  }

  const handleOfferExpired = useCallback(async () => {
    if (respondResult) return
    setRespondResult("expired")
    // SLN: 15-min window expired — call the timeout endpoint to:
    // 1. Mark dispatch_offer.response = 'timeout'
    // 2. Release booking to network pool (clears assigned_driver_id, dispatch_status='offer_pending')
    // This is the real release_to_network_pool — not just a UI dismiss.
    const offerId = summary?.active_offer?.offer_id
    if (offerId) {
      try {
        await fetch('/api/dispatch/respond-offer', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offer_id: offerId }),
        })
      } catch { /* non-blocking: server will process on next poll */ }
    }
    setTimeout(() => { setRespondResult(null); loadData() }, 2500)
  }, [respondResult, loadData, summary?.active_offer?.offer_id])

  // ── GPS: get current position ──────────────────────────────────
  const getGPS = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setGpsCoords(coords)
          setGpsError(null)
          resolve(coords)
        },
        (err) => {
          setGpsError(err.message)
          resolve(null)
        },
        { timeout: 5000, maximumAge: 30000 }
      )
    })
  }, [])

  // ── Haversine distance (meters) between two GPS coords ──────────────────────────────
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  // ── Execute the actual ride transition ────────────────────────────────────
  const executeTransition = async (newStatus: RideStatus, overrideType?: string) => {
    if (!summary?.assigned_ride || transitioning) return
    setTransitioning(true)
    const coords = await getGPS()
    try {
      const res = await fetch("/api/driver/ride-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_id: summary.driver_id,
          new_status: newStatus,
          override_type: overrideType ?? null,
          gps_lat: coords?.lat ?? null,
          gps_lng: coords?.lng ?? null,
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
                ride_mode: ["en_route", "arrived", "in_trip"].includes(newStatus) ? "live_flow" : prev.assigned_ride.ride_mode,
                trip_started_at: newStatus === "in_trip" ? new Date().toISOString() : prev.assigned_ride.trip_started_at,
              },
            }
          })
        }
      }
    } catch {}
    setTransitioning(false)
  }

  // ── Transition with temporal guardrail ──────────────────────
  const transitionRide = async (newStatus: RideStatus) => {
    if (!summary?.assigned_ride || transitioning) return

    // ── CANCEL INTERCEPT (Fases 1-9): show Cancel Reason Modal before cancelling ──
    if (newStatus === "cancelled" || newStatus === "no_show") {
      setCancelReason(newStatus === "no_show" ? "PASSENGER_NO_SHOW" : "")
      setCancelNotes("")
      setCancelStep("reason")
      setCancelResult(null)
      setShowCancelModal(true)
      return
    }

    if (summary.assigned_ride.pickup_datetime) {
      const minutesUntil = (new Date(summary.assigned_ride.pickup_datetime).getTime() - Date.now()) / 60000

      // GUARDRAIL A: early start — driver tries to go en_route but pickup is >90 min away
      if (newStatus === "en_route" && minutesUntil > 90) {
        setPendingTransition(newStatus)
        setShowEarlyStartModal(true)
        return
      }

      // GUARDRAIL B: overdue — driver tries to go en_route but pickup already passed by >30 min
      // Show a warning so driver is aware, but allow them to proceed
      if (newStatus === "en_route" && minutesUntil < -30) {
        const overdue = Math.abs(Math.round(minutesUntil))
        setOverdueMinutes(overdue)
        setShowOverdueModal(true)
        setPendingTransition(newStatus)
        return
      }
    }

    // ── GEOFENCE GUARDRAIL: validate driver proximity for critical state transitions ────────────────────────────────────
    // Actions: arrived (pickup), in_trip (pickup), completed (dropoff)
    // Radius: 300m for arrived/in_trip (pickup), 500m for completed (dropoff)
    // If outside radius: show GeoModal with override option
    // All overrides are persisted in audit_logs with override_type='geo_override'
    if (["arrived", "in_trip", "completed"].includes(newStatus)) {
      const ride = summary.assigned_ride
      const coords = await getGPS()
      if (coords) {
        const isPickupAction = newStatus === "arrived" || newStatus === "in_trip"
        const targetLat = isPickupAction ? ride.pickup_lat : ride.dropoff_lat
        const targetLng = isPickupAction ? ride.pickup_lng : ride.dropoff_lng
        if (targetLat != null && targetLng != null) {
          const distanceMeters = haversineDistance(coords.lat, coords.lng, targetLat, targetLng)
          const allowedRadius = newStatus === "completed" ? 500 : 300 // meters
          if (distanceMeters > allowedRadius) {
            const geoMessages: Record<string, string> = {
              arrived: lang === "es"
                ? `No estás en el punto de recogida. ¿Deseas continuar de todas formas? (${Math.round(distanceMeters)}m de distancia)`
                : `You are not at the exact pickup point. Continue anyway? (${Math.round(distanceMeters)}m away)`,
              in_trip: lang === "es"
                ? `No estás en el punto de recogida. ¿Seguro que deseas iniciar el viaje? (${Math.round(distanceMeters)}m de distancia)`
                : `You are not at the pickup point. Are you sure you want to start the ride? (${Math.round(distanceMeters)}m away)`,
              completed: lang === "es"
                ? `No estás cerca del destino. ¿Seguro que deseas finalizar el viaje? (${Math.round(distanceMeters)}m de distancia)`
                : `You are not near the drop-off point. Are you sure you want to complete the ride? (${Math.round(distanceMeters)}m away)`,
            }
            setGeoModalData({
              action: newStatus,
              message: geoMessages[newStatus] ?? geoMessages.arrived,
              driverLat: coords.lat,
              driverLng: coords.lng,
              targetLat,
              targetLng,
              distanceMeters: Math.round(distanceMeters),
            })
            setPendingTransition(newStatus)
            setShowGeoModal(true)
            return
          }
        }
      }
    }

    await executeTransition(newStatus)
  }

  // ── CANCEL RIDE SUBMISSION (Fases 1-9) ─────────────────────────────────────
  // Calls POST /api/driver/cancel-ride with the structured cancellation data.
  // This replaces the old executeTransition('cancelled') path.
  const submitCancelRide = async (noShowConfirmed?: boolean) => {
    if (!summary?.assigned_ride || !cancelReason) return
    setCancelStep("submitting")
    const coords = await getGPS()
    try {
      const res = await fetch("/api/driver/cancel-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_id: summary.driver_id,
          cancel_reason: cancelReason,
          cancellation_notes: cancelNotes || null,
          passenger_no_show_confirmed: cancelReason === "PASSENGER_NO_SHOW" ? (noShowConfirmed ?? false) : undefined,
          gps_lat: coords?.lat ?? null,
          gps_lng: coords?.lng ?? null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCancelResult({
          success: true,
          responsibility: data.cancel_responsibility,
          payout_status: data.payout_status,
        })
        setCancelStep("done")
        // Reload dashboard after 3s
        setTimeout(() => {
          setShowCancelModal(false)
          setCancelReason("")
          setCancelNotes("")
          setCancelStep("reason")
          setCancelResult(null)
          loadData()
        }, 3000)
      } else {
        setCancelResult({ success: false, message: data.error ?? "Error al cancelar" })
        setCancelStep("done")
      }
    } catch (err: any) {
      setCancelResult({ success: false, message: "Error de red. Intenta de nuevo." })
      setCancelStep("done")
    }
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

  // ── Driver recovery action handler ──────────────────────────────
  const reportAction = async (
    action: "return_to_dispatch" | "report_incomplete" | "request_correction" | "reject_ride",
    missingFields?: string[],
    note?: string
  ) => {
    if (!summary?.assigned_ride || reporting) return
    setReporting(true)
    setReportResult(null)
    try {
      const res = await fetch("/api/driver/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_code: driverCode,
          action,
          missing_fields: missingFields ?? [],
          note: note ?? null,
        }),
      })
      const data = await res.json()
      setReportResult({ action, success: !data.error })
      if (!data.error && (action === "return_to_dispatch" || action === "reject_ride")) {
        // Ride was returned to dispatch — reload dashboard after 2s
        setTimeout(() => loadData(), 2000)
      }
    } catch {
      setReportResult({ action, success: false })
    }
    setReporting(false)
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

  // ── NEW RIDE ALERT MODAL ───────────────────────────────────────────────
  if (showNewRideAlert && newRideAlertData) {
    const pickupFormatted = newRideAlertData.pickup_time
      ? new Date(newRideAlertData.pickup_time).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : lang === "es" ? "Hora por confirmar" : "Time TBD"
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-6 z-[100]"
        style={{ backgroundColor: "#000", paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
        {/* Top badge */}
        <div className="mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase animate-pulse"
          style={{ backgroundColor: GOLD + "20", color: GOLD, border: `1px solid ${GOLD}60` }}>
          {lang === "es" ? "NUEVA ASIGNACIÓN" : "NEW ASSIGNMENT"}
        </div>
        {/* Pulsing icon ring */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: GOLD + "30", transform: "scale(1.4)" }} />
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD + "15", border: `2px solid ${GOLD}` }}>
            <span className="text-3xl">🚗</span>
          </div>
        </div>
        {/* Title */}
        <div className="text-center mb-5">
          <div className="text-2xl font-semibold text-white mb-1">
            {lang === "es" ? "¡Nuevo Viaje Asignado!" : "New Ride Assigned!"}
          </div>
          <div className="text-sm" style={{ color: GOLD + "cc" }}>
            {lang === "es" ? "Se te ha asignado un nuevo servicio" : "A new ride has been assigned to you"}
          </div>
        </div>
        {/* Ride card with pulsing gold border */}
        <div className="w-full max-w-sm rounded-2xl overflow-hidden mb-6 animate-pulse"
          style={{ background: "#111", border: `2px solid ${GOLD}`, boxShadow: `0 0 24px ${GOLD}40` }}>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5 text-lg">↑</span>
              <div>
                <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: GOLD + "80" }}>{lang === "es" ? "Recogida" : "Pickup"}</div>
                <div className="text-sm font-medium text-white">{newRideAlertData.pickup}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5 text-lg">↓</span>
              <div>
                <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: GOLD + "80" }}>{lang === "es" ? "Destino" : "Dropoff"}</div>
                <div className="text-sm font-medium text-white">{newRideAlertData.dropoff}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${GOLD}20` }}>
              <div className="text-xs text-zinc-500">{lang === "es" ? "Fecha/Hora" : "Pickup Time"}</div>
              <div className="text-xs text-zinc-300">{pickupFormatted}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">{lang === "es" ? "Tarifa" : "Fare"}</div>
              <div className="text-xl font-bold" style={{ color: GOLD }}>${newRideAlertData.fare.toFixed(0)}</div>
            </div>
          </div>
        </div>
        {/* Primary CTA — full width, high contrast */}
        <button
          onClick={() => { setShowNewRideAlert(false); setNewRideAlertData(null) }}
          className="w-full max-w-sm py-5 rounded-2xl text-base font-bold text-black transition-all active:scale-95"
          style={{ backgroundColor: GOLD, fontSize: 17, letterSpacing: "0.05em" }}>
          {lang === "es" ? "Ver Detalles del Viaje" : "View Ride Details"}
        </button>
        <button
          onClick={() => { setShowNewRideAlert(false); setNewRideAlertData(null) }}
          className="mt-4 text-sm py-2" style={{ color: "#555" }}>
          {lang === "es" ? "Cerrar" : "Dismiss"}
        </button>
      </div>
    )
  }

  // ── REFERRAL SHARE MODAL ──────────────────────────────────────────
  if (showReferralModal && summary) {
    const referralUrl = `${BASE_URL}/?ref=${summary.driver_code}`
    // SLN RULE: outbound invite/share message is always in English by default.
    // This is a client-facing message sent via WhatsApp/SMS/email to potential clients.
    // It must NOT use the driver's UI language (lang) — clients may speak any language.
    // Rule: client.language ?? booking.language ?? 'en'
    // Since we don't have client context here, default to English always.
    const shareText = `Book your luxury ride with Sottovento! Use my personal link: ${referralUrl}`

    const handleCopyReferral = async () => {
      try {
        await navigator.clipboard.writeText(referralUrl)
        setReferralCopied(true)
        setTimeout(() => setReferralCopied(false), 2500)
      } catch {
        // fallback
        const el = document.createElement("textarea")
        el.value = referralUrl
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
        setReferralCopied(true)
        setTimeout(() => setReferralCopied(false), 2500)
      }
    }

    const handleNativeShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Sottovento Luxury Ride",
            text: shareText,
            url: referralUrl,
          })
        } catch { /* user cancelled */ }
      }
    }

    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    // SLN RULE: email subject also in English (client-facing, not driver-facing)
    const emailUrl = `mailto:?subject=${encodeURIComponent("Book your luxury ride with Sottovento")}&body=${encodeURIComponent(shareText)}`

    return (
      <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[90]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0px)" }}
        onClick={() => setShowReferralModal(false)}>
        <div
          className="w-full max-w-lg bg-zinc-900 rounded-t-2xl border-t border-zinc-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-800">
            <div className="text-sm font-semibold">
              {lang === "es" ? "Compartir mi enlace de referido" : lang === "ht" ? "Pataje lyen referans mwen" : "Share My Referral Link"}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {lang === "es" ? "Cada cliente que reserves queda atribuido a ti" : "Every client you bring is permanently attributed to you"}
            </div>
          </div>
          {/* Referral URL display */}
          <div className="mx-4 mt-4 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 text-xs text-zinc-300 truncate font-mono">{referralUrl}</div>
            <button
              onClick={handleCopyReferral}
              className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              style={referralCopied ? { background: "#16a34a", color: "#fff" } : { background: GOLD, color: "#000" }}>
              {referralCopied ? (lang === "es" ? "✓ Copiado" : "✓ Copied") : (lang === "es" ? "Copiar" : "Copy")}
            </button>
          </div>
          {/* Share options */}
          <div className="grid grid-cols-2 gap-3 px-4 mt-4 pb-6">
            <a href={smsUrl}
              className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 transition">
              <span className="text-xl">💬</span>
              <div>
                <div className="text-sm font-medium">SMS</div>
                <div className="text-xs text-zinc-500">{lang === "es" ? "Enviar por mensaje" : "Send via text"}</div>
              </div>
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 transition">
              <span className="text-xl">📱</span>
              <div>
                <div className="text-sm font-medium">WhatsApp</div>
                <div className="text-xs text-zinc-500">{lang === "es" ? "Enviar por WhatsApp" : "Send via WhatsApp"}</div>
              </div>
            </a>
            <a href={emailUrl}
              className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 transition">
              <span className="text-xl">✉️</span>
              <div>
                <div className="text-sm font-medium">{lang === "es" ? "Correo" : "Email"}</div>
                <div className="text-xs text-zinc-500">{lang === "es" ? "Enviar por email" : "Send via email"}</div>
              </div>
            </a>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button onClick={handleNativeShare}
                className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 transition w-full text-left">
                <span className="text-xl">📤</span>
                <div>
                  <div className="text-sm font-medium">{lang === "es" ? "Compartir" : "Share"}</div>
                  <div className="text-xs text-zinc-500">{lang === "es" ? "Más opciones" : "More options"}</div>
                </div>
              </button>
            )}
          </div>
          {/* Close button */}
          <button
            onClick={() => setShowReferralModal(false)}
            className="w-full py-4 text-sm text-zinc-500 border-t border-zinc-800">
            {lang === "es" ? "Cerrar" : lang === "ht" ? "Femen" : "Close"}
          </button>
        </div>
      </div>
    )
  }

  // ── GEOFENCE OVERRIDE MODAL ─────────────────────────────────────────────────────────────────────────────────
  // Shown when driver is outside allowed radius for arrived/start_trip/complete_trip
  if (showGeoModal && geoModalData) {
    const actionLabels: Record<string, string> = {
      arrived:   lang === "es" ? "Llegada al punto de recogida" : "Arrived at Pickup",
      in_trip:   lang === "es" ? "Inicio del viaje" : "Start Trip",
      completed: lang === "es" ? "Finalizar viaje" : "Complete Ride",
    }
    const actionLabel = actionLabels[geoModalData.action] ?? geoModalData.action
    const distanceText = geoModalData.distanceMeters >= 1000
      ? `${(geoModalData.distanceMeters / 1000).toFixed(1)} km`
      : `${geoModalData.distanceMeters} m`
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 px-6 z-50"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-orange-500/40 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="text-2xl">📍</div>
            <div>
              <div className="text-sm font-semibold text-orange-400">
                {lang === "es" ? "Fuera del área permitida" : "Outside Allowed Area"}
              </div>
              <div className="text-xs text-zinc-500">{actionLabel}</div>
            </div>
          </div>
          {/* Body */}
          <div className="px-5 py-4">
            <div className="text-sm text-zinc-300 mb-3">{geoModalData.message}</div>
            <div className="bg-orange-500/10 rounded-lg px-3 py-2 mb-4 space-y-1">
              <div className="text-xs text-orange-400/80">
                {lang === "es" ? `Distancia al punto esperado: ` : `Distance to expected point: `}
                <span className="font-semibold">{distanceText}</span>
              </div>
              <div className="text-xs text-zinc-500">
                {lang === "es"
                  ? "Si confirmas, la acción quedará registrada con tus coordenadas GPS actuales."
                  : "If you confirm, the action will be logged with your current GPS coordinates."}
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="px-5 pb-5 space-y-2">
            <button
              onClick={() => {
                setShowGeoModal(false)
                if (pendingTransition) {
                  executeTransition(pendingTransition, "geo_override")
                  setPendingTransition(null)
                  setGeoModalData(null)
                }
              }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold border border-orange-500/60 text-orange-400 transition-all active:scale-95">
              {lang === "es" ? "Confirmar de todas formas" : "Confirm Anyway"}
            </button>
            <button
              onClick={() => {
                setShowGeoModal(false)
                setPendingTransition(null)
                setGeoModalData(null)
              }}
              className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm transition-all active:scale-95">
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── EARLY START MODAL (temporal guardrail) ──────────────────────────────────────────────────
  if (showEarlyStartModal && summary?.assigned_ride) {
    const pickupTime = summary.assigned_ride.pickup_datetime
      ? new Date(summary.assigned_ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "scheduled time"
    const pickupDate = summary.assigned_ride.pickup_datetime
      ? new Date(summary.assigned_ride.pickup_datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      : ""
    const minutesUntil = summary.assigned_ride.pickup_datetime
      ? Math.round((new Date(summary.assigned_ride.pickup_datetime).getTime() - Date.now()) / 60000)
      : null

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 px-6 z-50"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-amber-500/40 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="text-sm font-semibold text-amber-400">
                {lang === "es" ? "Inicio anticipado" : "Early Start Warning"}
              </div>
              <div className="text-xs text-zinc-500">
                {lang === "es" ? "Este servicio aún no corresponde" : "This service is not yet scheduled"}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <div className="text-sm text-zinc-300 mb-3">
              {lang === "es"
                ? `Pickup programado para ${pickupDate} a las ${pickupTime}.`
                : `Pickup scheduled for ${pickupDate} at ${pickupTime}.`}
            </div>
            {minutesUntil !== null && (
              <div className="text-xs text-zinc-500 mb-4">
                {lang === "es"
                  ? `Faltan ${minutesUntil > 60 ? `${Math.floor(minutesUntil/60)}h ${minutesUntil%60}m` : `${minutesUntil} min`} para el pickup.`
                  : `${minutesUntil > 60 ? `${Math.floor(minutesUntil/60)}h ${minutesUntil%60}m` : `${minutesUntil} min`} until pickup.`}
              </div>
            )}
            <div className="text-xs text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2 mb-4">
              {lang === "es"
                ? "El inicio anticipado quedará registrado en el historial de auditoría."
                : "Early start will be logged in the audit history."}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-2">
            <button
              onClick={() => {
                setShowEarlyStartModal(false)
                if (pendingTransition) {
                  executeTransition(pendingTransition, "early_start")
                  setPendingTransition(null)
                }
              }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold border border-amber-500/60 text-amber-400 transition-all active:scale-95">
              {lang === "es" ? "Continuar manualmente" : "Continue Manually"}
            </button>
            <button
              onClick={() => {
                setShowEarlyStartModal(false)
                setPendingTransition(null)
              }}
              className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm transition-all active:scale-95">
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── OVERDUE MODAL (pickup already passed by >30 min) ──────────────────
  if (showOverdueModal) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 px-6 z-50"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-red-500/40 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="text-2xl">🔴</div>
            <div>
              <div className="text-sm font-semibold text-red-400">
                {lang === "es" ? "Servicio con retraso" : "Overdue Pickup"}
              </div>
              <div className="text-xs text-zinc-500">
                {lang === "es" ? "El horario de recogida ya pasó" : "Scheduled pickup time has passed"}
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="px-5 py-4">
            <div className="text-sm text-zinc-300 mb-3">
              {lang === "es"
                ? `El pickup estaba programado hace ${overdueMinutes > 60 ? `${Math.floor(overdueMinutes/60)}h ${overdueMinutes%60}m` : `${overdueMinutes} min`}.`
                : `Pickup was scheduled ${overdueMinutes > 60 ? `${Math.floor(overdueMinutes/60)}h ${overdueMinutes%60}m` : `${overdueMinutes} min`} ago.`}
            </div>
            <div className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2 mb-4">
              {lang === "es"
                ? "Notifica al pasajero y al despacho antes de continuar."
                : "Notify the passenger and dispatch before proceeding."}
            </div>
          </div>
          {/* Actions */}
          <div className="px-5 pb-5 space-y-2">
            <button
              onClick={() => {
                setShowOverdueModal(false)
                if (pendingTransition) {
                  executeTransition(pendingTransition, "overdue_start")
                  setPendingTransition(null)
                }
              }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold border border-red-500/60 text-red-400 transition-all active:scale-95">
              {lang === "es" ? "Continuar de todas formas" : "Continue Anyway"}
            </button>
            <button
              onClick={() => {
                setShowOverdueModal(false)
                setPendingTransition(null)
              }}
              className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm transition-all active:scale-95">
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CANCEL REASON MODAL ──────────────────────────────────────────────────────
  if (showCancelModal) {
    const CANCEL_REASONS = [
      { key: "PASSENGER_NO_SHOW",  label: lang === "es" ? "Pasajero no se presentó"   : lang === "ht" ? "Pasaje pa parèt"        : "Passenger No-Show",      icon: "🚶" },
      { key: "PASSENGER_REQUESTED",label: lang === "es" ? "Pasajero solicitó cancelar" : lang === "ht" ? "Pasaje mande kanselasyon" : "Passenger Requested",    icon: "📞" },
      { key: "VEHICLE_BREAKDOWN",  label: lang === "es" ? "Falla mecánica del vehículo": lang === "ht" ? "Machin kraze"            : "Vehicle Breakdown",       icon: "🔧" },
      { key: "SAFETY_CONCERN",     label: lang === "es" ? "Preocupación de seguridad"  : lang === "ht" ? "Pwoblèm sekirite"        : "Safety Concern",          icon: "🛡️" },
      { key: "WRONG_ADDRESS",      label: lang === "es" ? "Dirección incorrecta"       : lang === "ht" ? "Adrès mal"               : "Wrong Address",           icon: "📍" },
      { key: "DISPATCH_INSTRUCTION",label: lang === "es" ? "Instrucción de despacho"   : lang === "ht" ? "Enstriksyon dispach"     : "Dispatch Instruction",    icon: "📻" },
      { key: "OTHER",              label: lang === "es" ? "Otro motivo"                : lang === "ht" ? "Lòt rezon"               : "Other",                   icon: "💬" },
    ]

    // ── STEP: no_show_confirm ──────────────────────────────────────────────────
    if (cancelStep === "no_show_confirm") {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 px-6 z-[200]"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-red-500/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="text-2xl">🚶</div>
              <div>
                <div className="text-sm font-semibold text-red-400">
                  {lang === "es" ? "Confirmar No-Show" : lang === "ht" ? "Konfime No-Show" : "Confirm No-Show"}
                </div>
                <div className="text-xs text-zinc-500">
                  {lang === "es" ? "Pasajero no se presentó en el punto de recogida" : lang === "ht" ? "Pasaje pa t parèt nan pwen ranmase a" : "Passenger did not appear at pickup location"}
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-sm text-zinc-300 mb-3">
                {lang === "es"
                  ? "¿Esperaste al menos 10 minutos en el punto de recogida y el pasajero no apareció?"
                  : lang === "ht"
                  ? "Èske ou te tann omwen 10 minit nan pwen ranmase a epi pasaje a pa parèt?"
                  : "Did you wait at least 10 minutes at the pickup location and the passenger did not appear?"}
              </div>
              <div className="text-xs text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2 mb-4">
                {lang === "es"
                  ? "Esta acción quedará registrada con timestamp GPS y será revisada por despacho."
                  : lang === "ht"
                  ? "Aksyon sa a pral anrejistre ak timestamp GPS epi dispach pral revize li."
                  : "This action will be logged with GPS timestamp and reviewed by dispatch."}
              </div>
            </div>
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => submitCancelRide(true)}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-red-600 text-white transition-all active:scale-95">
                {lang === "es" ? "Sí, confirmar No-Show" : lang === "ht" ? "Wi, konfime No-Show" : "Yes, Confirm No-Show"}
              </button>
              <button
                onClick={() => setCancelStep("reason")}
                className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm transition-all active:scale-95">
                {lang === "es" ? "Volver" : lang === "ht" ? "Retounen" : "Go Back"}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // ── STEP: submitting ───────────────────────────────────────────────────────
    if (cancelStep === "submitting") {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 z-[200]">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <div className="text-white text-sm">
            {lang === "es" ? "Registrando cancelación..." : lang === "ht" ? "Anrejistre kanselasyon..." : "Logging cancellation..."}
          </div>
        </div>
      )
    }

    // ── STEP: done ─────────────────────────────────────────────────────────────
    if (cancelStep === "done" && cancelResult) {
      const isSuccess = cancelResult.success
      const isDriverFault = cancelResult.responsibility === "driver"
      const isNoShow = cancelReason === "PASSENGER_NO_SHOW"
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 px-6 z-[200]">
          <div className="text-5xl mb-4">{isSuccess ? (isNoShow ? "🚶" : isDriverFault ? "⚠️" : "✅") : "❌"}</div>
          <div className="text-xl font-semibold text-white mb-2">
            {isSuccess
              ? (lang === "es" ? "Cancelación registrada" : lang === "ht" ? "Kanselasyon anrejistre" : "Cancellation Logged")
              : (lang === "es" ? "Error al cancelar" : lang === "ht" ? "Erè pou kanselasyon" : "Cancellation Error")}
          </div>
          {isSuccess && cancelResult.responsibility && (
            <div className={`text-xs px-3 py-1.5 rounded-full mb-3 font-medium ${
              cancelResult.responsibility === "driver"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : cancelResult.responsibility === "passenger"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-zinc-700 text-zinc-400 border border-zinc-600"
            }`}>
              {cancelResult.responsibility === "driver"
                ? (lang === "es" ? "Responsabilidad: Conductor" : "Responsibility: Driver")
                : cancelResult.responsibility === "passenger"
                ? (lang === "es" ? "Responsabilidad: Pasajero" : "Responsibility: Passenger")
                : (lang === "es" ? "Revisión pendiente" : "Pending Review")}
            </div>
          )}
          {isSuccess && cancelResult.payout_status && (
            <div className="text-xs text-zinc-400 mb-2">
              {lang === "es" ? "Estado de pago:" : "Payout status:"}{" "}
              <span className="text-zinc-200 font-medium">{cancelResult.payout_status}</span>
            </div>
          )}
          {!isSuccess && (
            <div className="text-sm text-red-400 mb-4">{cancelResult.message}</div>
          )}
          <div className="text-xs text-zinc-500 mt-2">
            {lang === "es" ? "Redirigiendo..." : lang === "ht" ? "Redirijman..." : "Redirecting..."}
          </div>
        </div>
      )
    }

    // ── STEP: reason (default) ─────────────────────────────────────────────────
    return (
      <div className="fixed inset-0 flex flex-col bg-zinc-950 z-[200] overflow-y-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <button
            onClick={() => {
              setShowCancelModal(false)
              setCancelReason("")
              setCancelNotes("")
              setCancelStep("reason")
              setCancelResult(null)
            }}
            className="text-zinc-400 text-xl leading-none active:scale-95 transition-transform">
            ←
          </button>
          <div>
            <div className="text-sm font-semibold text-white">
              {lang === "es" ? "Motivo de cancelación" : lang === "ht" ? "Rezon kanselasyon" : "Cancellation Reason"}
            </div>
            <div className="text-xs text-zinc-500">
              {lang === "es" ? "Selecciona el motivo para continuar" : lang === "ht" ? "Chwazi rezon pou kontinye" : "Select a reason to continue"}
            </div>
          </div>
        </div>

        {/* Reason list */}
        <div className="px-4 py-3 space-y-2 flex-1">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setCancelReason(r.key)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                cancelReason === r.key
                  ? "border-amber-500 bg-amber-500/10 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300"
              }`}>
              <span className="text-xl">{r.icon}</span>
              <span className="text-sm font-medium">{r.label}</span>
              {cancelReason === r.key && <span className="ml-auto text-amber-400 text-base">✓</span>}
            </button>
          ))}

          {/* Free-text notes for OTHER */}
          {cancelReason === "OTHER" && (
            <div className="mt-2">
              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder={lang === "es" ? "Describe el motivo..." : lang === "ht" ? "Dekri rezon an..." : "Describe the reason..."}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-amber-500/60"
              />
            </div>
          )}
        </div>

        {/* Confirm button */}
        <div className="px-4 pb-8 pt-3 sticky bottom-0 bg-zinc-950 border-t border-zinc-800">
          <button
            disabled={!cancelReason || (cancelReason === "OTHER" && !cancelNotes.trim())}
            onClick={() => {
              if (cancelReason === "PASSENGER_NO_SHOW") {
                setCancelStep("no_show_confirm")
              } else {
                submitCancelRide()
              }
            }}
            className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: cancelReason && !(cancelReason === "OTHER" && !cancelNotes.trim()) ? "#b8972a" : undefined, color: "white" }}>
            {lang === "es" ? "Confirmar cancelación" : lang === "ht" ? "Konfime kanselasyon" : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    )
  }

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
  // DEDUP GUARD: suppress OfferScreen if this booking was already accepted in this session.
  // Prevents race condition where backend hasn't propagated status='accepted' yet.
  const isOfferAlreadyAccepted = summary.active_offer?.booking_id != null &&
    summary.active_offer.booking_id === lastAcceptedBookingIdRef.current
  if (summary.active_offer && !respondResult && !isOfferAlreadyAccepted) {
    return (
      <>
        {/* ── ALERT LAYER: Persistent red banner above OfferScreen ──────────────────── */}
        {/* Always visible while offer is active, z-[500] to float above OfferScreen */}
        <div
          className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 animate-pulse"
          style={{
            backgroundColor: "#dc2626",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: "10px",
            boxShadow: "0 4px 24px #dc262680",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white text-base">🔴</span>
            <span className="text-white font-bold text-sm tracking-wide">
              {offerAlertCount > 1
                ? (lang === "es" ? `⚠️ NUEVA SOLICITUD (${offerAlertCount})` : `⚠️ NEW REQUEST (${offerAlertCount})`)
                : (lang === "es" ? "⚠️ NUEVA SOLICITUD" : "⚠️ NEW RIDE REQUEST")}
            </span>
          </div>
          <div className="text-white text-xs font-semibold bg-white/20 rounded-lg px-3 py-1">
            {lang === "es" ? "Activa" : "Active"}
          </div>
        </div>
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
      </>
    )
  }

  // ════════════════════════════════════════════════════════════
  // PRIORITY 2: RIDE FLOW SCREEN
  // Strict re-entry rules:
  //   offer_pending  → OfferScreen only (driver must accept before entering flow)
  //   en_route       → RideFlowScreen (live, resumable)
  //   arrived        → RideFlowScreen (live, resumable)
  //   in_trip        → RideFlowScreen (live, resumable)
  //   accepted       → RideFlowScreen in pre-trip (assigned) view only
  //   assigned       → RideFlowScreen in pre-trip (assigned) view only
  //   completed      → NEVER shown here (excluded by backend query)
  //   upcoming       → stays in dashboard Upcoming tab
  // ════════════════════════════════════════════════════════════
  if (summary.assigned_ride && summary.assigned_ride.ride_mode !== "upcoming") {
    // GUARD: never render RideFlowScreen for finalized rides (safety net)
    if (["completed", "cancelled", "archived", "no_show"].includes(summary.assigned_ride.status)) {
      // This should never happen if backend is correct, but discard silently
      // and fall through to dashboard
    } else if (!respondResult &&
      (summary.assigned_ride.status === "offer_pending" || summary.assigned_ride.ride_mode === "offer_pending") &&
      // DEDUP GUARD: suppress OfferScreen if this booking was already accepted in this session
      summary.assigned_ride.booking_id !== lastAcceptedBookingIdRef.current) {
      // OFFER_PENDING: show offer screen, driver must explicitly accept before entering flow
      // GUARD: !respondResult prevents OfferScreen from re-rendering during the accept/decline
      // transition window (between setRespondResult(null) and loadData() completing).
      return (
        <OfferScreen
          offer={{
            offer_id: "direct_" + summary.assigned_ride.booking_id,
            booking_id: summary.assigned_ride.booking_id,
            pickup_location: summary.assigned_ride.pickup_location,
            dropoff_location: summary.assigned_ride.dropoff_location,
            pickup_datetime: summary.assigned_ride.pickup_datetime,
            vehicle_type: summary.assigned_ride.vehicle_type,
            total_price: summary.assigned_ride.total_price,
            expires_at: summary.assigned_ride.offer_expires_at ?? null,
            dispatch_status: "offer_pending",
            client_name: summary.assigned_ride.client_name,
            bookings_count: summary.assigned_ride.bookings_count
          }}
          driverName={summary.driver_name}
          lang={lang}
          onLang={setLangAndSave}
          onAccept={() => respondOfferDirect(summary.assigned_ride!.booking_id, "accepted")}
          onDecline={() => respondOfferDirect(summary.assigned_ride!.booking_id, "declined")}
          onExpired={() => {}}
          responding={responding}
          t={t}
        />
      )
    } else if (["accepted", "assigned", "en_route", "arrived", "in_trip"].includes(summary.assigned_ride.status)) {
      // RESUMABLE: only these statuses may enter RideFlowScreen
      // 'accepted' and 'assigned' enter in pre-trip view (no live flow buttons active)
      // 'en_route', 'arrived', 'in_trip' enter in live flow view
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
        gpsCoords={gpsCoords}
        gpsError={gpsError}
        onReport={reportAction}
        reporting={reporting}
        reportResult={reportResult}
        rideUpdatedByDispatch={rideUpdatedByDispatch}
        overdueSeconds={overdueSeconds}
        t={t}
      />
      )
    }
  }

  // ════════════════════════════════════════════════════════════
  // PRIORITY 3: DASHBOARD (with tabs)
  // ══════════════════════════════════════════════════════════════
  const upcomingCount = summary.upcoming_rides?.length ?? 0
  const completedCount = summary.completed_rides?.length ?? 0

  return (
    <div className="min-h-screen bg-black text-white pb-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>

      {/* ── ALERT LAYER: Persistent top banner ──────────────────────────────────── */}
      {/* Visible until driver accepts or declines the offer */}
      {showOfferBanner && (
        <div
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-3 animate-pulse"
          style={{
            backgroundColor: "#dc2626",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            boxShadow: "0 4px 24px #dc262680",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">&#x1F534;</span>
            <span className="text-white font-bold text-sm tracking-wide">
              {offerAlertCount > 1
                ? (lang === "es" ? `⚠️ NUEVA SOLICITUD (${offerAlertCount})` : `⚠️ NEW REQUEST (${offerAlertCount})`)
                : (lang === "es" ? "⚠️ NUEVA SOLICITUD" : "⚠️ NEW RIDE REQUEST")}
            </span>
          </div>
          <button
            onClick={() => setShowOfferAlertModal(true)}
            className="text-white text-xs font-semibold bg-white/20 rounded-lg px-3 py-1.5 active:scale-95 transition-all"
          >
            {lang === "es" ? "Ver" : "View"}
          </button>
        </div>
      )}

      {/* ── ALERT LAYER: Foreground modal (auto-opens on new offer) ───────────────── */}
      {showOfferAlertModal && summary.active_offer && (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6"
          style={{
            backgroundColor: "rgba(0,0,0,0.92)",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          }}
        >
          {/* Pulsing red ring */}
          <div className="relative mb-5">
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: "#dc262640", transform: "scale(1.5)" }}
            />
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#dc262615", border: "2px solid #dc2626" }}
            >
              <span className="text-3xl">&#x1F534;</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-white mb-1">
              {lang === "es" ? "¡Nueva Solicitud!" : "New Ride Request!"}
            </div>
            <div className="text-sm text-red-400">
              {lang === "es" ? "Revisa la oferta antes de que expire" : "Review the offer before it expires"}
            </div>
          </div>

          {/* Offer card */}
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden mb-6"
            style={{ background: "#111", border: "2px solid #dc2626", boxShadow: "0 0 24px #dc262640" }}
          >
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5 text-lg">↑</span>
                <div>
                  <div className="text-xs uppercase tracking-wider mb-0.5 text-zinc-500">
                    {lang === "es" ? "Recogida" : "Pickup"}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {summary.active_offer.pickup_location}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-400 mt-0.5 text-lg">↓</span>
                <div>
                  <div className="text-xs uppercase tracking-wider mb-0.5 text-zinc-500">
                    {lang === "es" ? "Destino" : "Dropoff"}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {summary.active_offer.dropoff_location}
                  </div>
                </div>
              </div>
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: "1px solid #dc262630" }}
              >
                <div className="text-xs text-zinc-500">
                  {lang === "es" ? "Tarifa" : "Fare"}
                </div>
                <div className="text-xl font-bold text-white">
                  ${summary.active_offer.total_price.toFixed(0)}
                </div>
              </div>
              {offerAlertCount > 1 && (
                <div
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: "#dc262615" }}
                >
                  <span className="text-red-400 text-xs font-bold">
                    {lang === "es"
                      ? `${offerAlertCount} solicitudes pendientes`
                      : `${offerAlertCount} pending requests`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CTA buttons */}
          <button
            onClick={() => setShowOfferAlertModal(false)}
            className="w-full max-w-sm py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-95 mb-3"
            style={{ backgroundColor: "#dc2626", fontSize: 16, letterSpacing: "0.04em" }}
          >
            {lang === "es" ? "Ver Oferta Completa" : "View Full Offer"}
          </button>
          <button
            onClick={() => { setShowOfferAlertModal(false); setShowOfferBanner(false) }}
            className="text-sm py-2 text-zinc-600"
          >
            {lang === "es" ? "Descartar alerta" : "Dismiss alert"}
          </button>
        </div>
      )}

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

      {/* ── TABS ── */}
      {/* Safe-area horizontal padding prevents tabs from touching screen edges on notch/Dynamic Island devices */}
      <div
        className="flex border-b border-zinc-800 mt-4"
        style={{
          paddingLeft:  "max(env(safe-area-inset-left),  16px)",
          paddingRight: "max(env(safe-area-inset-right), 16px)",
        }}
      >
        {([
          { key: "overview",  label: "Overview",  badge: null },
          { key: "upcoming",  label: lang === "es" ? "Próximos" : "Upcoming",  badge: upcomingCount > 0 ? upcomingCount : null },
          { key: "completed", label: lang === "es" ? "Completados" : "Completed", badge: null },
          { key: "earnings",  label: lang === "es" ? "Ganancias" : "Earnings",  badge: null },
        ] as { key: "overview" | "upcoming" | "completed" | "earnings"; label: string; badge: number | null }[]).map((tab) => (
          <button key={tab.key}
            onClick={() => setDashTab(tab.key)}
            className="relative pb-2 pt-1 flex-1 text-xs font-medium uppercase tracking-widest transition-all text-center"
            style={{ color: dashTab === tab.key ? GOLD : "#6b7280", borderBottom: dashTab === tab.key ? `2px solid ${GOLD}` : "2px solid transparent" }}>
            {tab.label}
            {tab.badge !== null && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: GOLD, color: "#000" }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {dashTab === "overview" && (
        <div>
          {/* Metrics */}
          <div className="px-4 mt-4 grid grid-cols-2 gap-3">
            {[
              { label: t.totalClients, value: summary.total_clients, icon: "👥", color: GOLD },
              { label: offerAlertCount > 0 ? (lang === "es" ? `🔴 SOLICITUD (${offerAlertCount})` : `🔴 REQUEST (${offerAlertCount})`) : t.pendingOffers, value: offerAlertCount > 0 ? offerAlertCount : summary.pending_offers, icon: offerAlertCount > 0 ? "🔴" : "⏳", color: offerAlertCount > 0 ? "#dc2626" : (summary.pending_offers > 0 ? "#f87171" : "#6b7280") },
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
            <button
              onClick={() => setShowReferralModal(true)}
              className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition text-left">
              <div>
                <div className="text-sm font-medium">{t.referralLabel}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{t.referralSub}</div>
              </div>
              <span style={{ color: GOLD }}>📤</span>
            </button>
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
      )}

      {/* ── TAB: UPCOMING ── */}
      {dashTab === "upcoming" && (
        <div className="px-4 mt-4">
          {upcomingCount === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <div className="text-zinc-500 text-sm">{lang === "es" ? "No hay viajes próximos" : "No upcoming rides"}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.upcoming_rides.map((ride) => {
                const pickupDate = ride.pickup_datetime
                  ? new Date(ride.pickup_datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""
                const pickupTime = ride.pickup_datetime
                  ? new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""
                const minutesUntil = ride.pickup_datetime
                  ? Math.round((new Date(ride.pickup_datetime).getTime() - Date.now()) / 60000) : null
                const isNearWindow = minutesUntil !== null && minutesUntil <= 120 // 2h operational window
                const isExpanded = expandedRideId === ride.booking_id

                return (
                  <div key={ride.booking_id}
                    className="rounded-xl border bg-zinc-900 overflow-hidden"
                    style={{ borderColor: isNearWindow ? GOLD + "60" : "#27272a" }}>
                    {isNearWindow && (
                      <div className="px-4 py-2 text-xs font-semibold flex items-center gap-2"
                        style={{ backgroundColor: GOLD + "15", color: GOLD }}>
                        <span className="animate-pulse">●</span>
                        {lang === "es" ? `Activación en ${minutesUntil} min` : `Activates in ${minutesUntil} min`}
                      </div>
                    )}
                    {/* Header row — always visible, tap to expand */}
                    <div className="px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedRideId(isExpanded ? null : ride.booking_id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{ride.pickup_location}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">→ {ride.dropoff_location}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-lg font-bold" style={{ color: GOLD }}>${ride.total_price.toFixed(0)}</div>
                          <div className="text-zinc-500 text-xs">{isExpanded ? "▲" : "▼"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-zinc-400">{pickupDate}</span>
                        <span className="text-xs font-medium text-white">{pickupTime}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{ride.vehicle_type}</span>
                        {minutesUntil !== null && (
                          <span className="text-xs ml-auto" style={{ color: isNearWindow ? GOLD : "#6b7280" }}>
                            {minutesUntil > 60 ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m` : `${minutesUntil}m`}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-800">
                        <div className="mt-3 space-y-2">
                          {ride.client_name && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{lang === "es" ? "Cliente" : "Client"}</span>
                              <span className="text-xs text-white">{ride.client_name}</span>
                            </div>
                          )}
                          {ride.client_phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{lang === "es" ? "Teléfono" : "Phone"}</span>
                              <a href={`tel:${ride.client_phone}`} className="text-xs" style={{ color: GOLD }}>{ride.client_phone}</a>
                            </div>
                          )}
                          {ride.flight_number && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{lang === "es" ? "Vuelo" : "Flight"}</span>
                              <span className="text-xs text-white font-mono">{ride.flight_number}</span>
                            </div>
                          )}
                          {ride.passengers && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{lang === "es" ? "Pasajeros" : "Passengers"}</span>
                              <span className="text-xs text-white">{ride.passengers}</span>
                            </div>
                          )}
                          {ride.luggage && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{lang === "es" ? "Equipaje" : "Luggage"}</span>
                              <span className="text-xs text-white">{ride.luggage}</span>
                            </div>
                          )}
                          {ride.notes && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{lang === "es" ? "Notas" : "Notes"}</span>
                              <span className="text-xs text-zinc-300">{ride.notes}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-zinc-500 w-20 flex-shrink-0">Booking ID</span>
                            <span className="text-xs font-mono text-zinc-400">{ride.booking_id.slice(0, 8).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COMPLETED ── */}
      {dashTab === "completed" && (
        <div className="px-4 mt-4">
          {completedCount === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-zinc-500 text-sm">
                {lang === "es" ? "No hay viajes completados" : lang === "ht" ? "Pa gen vwayaj fèt" : "No completed rides yet"}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {summary.completed_rides.map((ride) => {
                const isExpanded = expandedCompletedId === ride.booking_id
                const pickupDate = ride.pickup_datetime
                  ? new Date(ride.pickup_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""
                const pickupTime = ride.pickup_datetime
                  ? new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""
                const isNoShow = ride.status === "no_show"
                const fareColor = isNoShow ? "#f87171" : "#4ade80"

                // Payout status badge
                const payoutBadge: Record<string, { label: string; color: string }> = {
                  pending:   { label: lang === "es" ? "⏳ Pago pendiente" : "⏳ Pending payout",    color: "#f59e0b" },
                  batched:   { label: lang === "es" ? "📦 En lote de pago" : "📦 In payout batch",  color: "#60a5fa" },
                  paid:      { label: lang === "es" ? "✅ Transferido"      : "✅ Transferred",       color: "#4ade80" },
                  completed: { label: lang === "es" ? "✅ Completado"       : "✅ Completed",         color: "#4ade80" },
                }
                const payout = payoutBadge[ride.payout_status ?? "pending"] ?? payoutBadge.pending

                return (
                  <div key={ride.booking_id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    {/* CARD HEADER — always visible */}
                    <button
                      onClick={() => setExpandedCompletedId(isExpanded ? null : ride.booking_id)}
                      className="w-full px-4 py-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{ride.pickup_location}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">→ {ride.dropoff_location}</div>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <div className="text-base font-bold" style={{ color: fareColor }}>
                            {isNoShow ? "No Show" : `+$${ride.total_price.toFixed(0)}`}
                          </div>
                          <div className="text-xs" style={{ color: payout.color }}>{payout.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-zinc-400">{pickupDate}</span>
                        {pickupTime && <span className="text-xs text-zinc-500">{pickupTime}</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{ride.vehicle_type}</span>
                        <span className="text-xs text-zinc-600 font-mono ml-auto">{ride.booking_id.slice(0, 8)}…</span>
                        <span className="text-xs text-zinc-500 ml-1">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* EXPANDED DETAIL */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-800 pt-3 space-y-3">
                        {/* Passenger info */}
                        {(ride.client_name || ride.client_phone) && (
                          <div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                              {lang === "es" ? "Pasajero" : "Passenger"}
                            </div>
                            {ride.client_name && <div className="text-sm text-white">{ride.client_name}</div>}
                            {ride.client_phone && (
                              <a href={`tel:${ride.client_phone}`} className="text-sm" style={{ color: "#60a5fa" }}>
                                {ride.client_phone}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Route detail */}
                        <div>
                          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                            {lang === "es" ? "Ruta" : "Route"}
                          </div>
                          <div className="text-xs text-zinc-300">
                            <span className="text-green-400">●</span> {ride.pickup_location}
                          </div>
                          <div className="text-xs text-zinc-300 mt-0.5">
                            <span className="text-red-400">●</span> {ride.dropoff_location}
                          </div>
                        </div>

                        {/* Trip details grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-zinc-800 rounded-lg p-2">
                            <div className="text-xs text-zinc-500">{lang === "es" ? "Fecha" : "Date"}</div>
                            <div className="text-xs text-white mt-0.5">{pickupDate}</div>
                          </div>
                          <div className="bg-zinc-800 rounded-lg p-2">
                            <div className="text-xs text-zinc-500">{lang === "es" ? "Hora" : "Time"}</div>
                            <div className="text-xs text-white mt-0.5">{pickupTime || "—"}</div>
                          </div>
                          <div className="bg-zinc-800 rounded-lg p-2">
                            <div className="text-xs text-zinc-500">{lang === "es" ? "Vehículo" : "Vehicle"}</div>
                            <div className="text-xs text-white mt-0.5">{ride.vehicle_type}</div>
                          </div>
                          {ride.flight_number && (
                            <div className="bg-zinc-800 rounded-lg p-2">
                              <div className="text-xs text-zinc-500">{lang === "es" ? "Vuelo" : "Flight"}</div>
                              <div className="text-xs text-white mt-0.5">{ride.flight_number}</div>
                            </div>
                          )}
                          {ride.passengers != null && (
                            <div className="bg-zinc-800 rounded-lg p-2">
                              <div className="text-xs text-zinc-500">{lang === "es" ? "Pasajeros" : "Passengers"}</div>
                              <div className="text-xs text-white mt-0.5">{ride.passengers}</div>
                            </div>
                          )}
                          {ride.luggage != null && (
                            <div className="bg-zinc-800 rounded-lg p-2">
                              <div className="text-xs text-zinc-500">{lang === "es" ? "Equipaje" : "Luggage"}</div>
                              <div className="text-xs text-white mt-0.5">{ride.luggage} {lang === "es" ? "piezas" : "pieces"}</div>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {ride.notes && (
                          <div className="bg-zinc-800 rounded-lg p-2">
                            <div className="text-xs text-zinc-500 mb-1">{lang === "es" ? "Notas" : "Notes"}</div>
                            <div className="text-xs text-zinc-300">{ride.notes}</div>
                          </div>
                        )}

                        {/* Earnings breakdown */}
                        <div className="border border-zinc-700 rounded-lg p-3">
                          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                            {lang === "es" ? "Desglose de pago" : "Earnings breakdown"}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-xs text-zinc-400">{lang === "es" ? "Tarifa total" : "Total fare"}</span>
                              <span className="text-xs font-medium text-white">${ride.total_price.toFixed(2)}</span>
                            </div>
                            {ride.sln_commission != null && (
                              <div className="flex justify-between">
                                <span className="text-xs text-zinc-400">{lang === "es" ? "Comisión SLN" : "SLN commission"}</span>
                                <span className="text-xs text-red-400">−${ride.sln_commission.toFixed(2)}</span>
                              </div>
                            )}
                            {ride.source_earnings != null && ride.source_earnings > 0 && (
                              <div className="flex justify-between">
                                <span className="text-xs text-zinc-400">{lang === "es" ? "Comisión fuente" : "Source commission"}</span>
                                <span className="text-xs text-red-400">−${ride.source_earnings.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-zinc-700 pt-1.5 mt-1">
                              <span className="text-xs font-medium" style={{ color: "#c9a84c" }}>
                                {lang === "es" ? "Tus ganancias" : "Your earnings"}
                              </span>
                              <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
                                ${ride.driver_earnings != null ? ride.driver_earnings.toFixed(2) : ride.total_price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payout status */}
                        <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: "#1a1a1a" }}>
                          <span className="text-xs text-zinc-400">{lang === "es" ? "Estado de pago" : "Payout status"}</span>
                          <span className="text-xs font-medium" style={{ color: payout.color }}>{payout.label}</span>
                        </div>

                        {/* Booking reference */}
                        <div className="text-center">
                          <span className="text-xs text-zinc-600">
                            {lang === "es" ? "Ref:" : "Ref:"} <span className="font-mono">{ride.booking_id.slice(0, 12)}…</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: EARNINGS ── */}
      {dashTab === "earnings" && (
        <div className="px-4 mt-4">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xl mb-1">💰</div>
              <div className="text-xl font-light" style={{ color: GOLD }}>${summary.month_earnings.toFixed(2)}</div>
              <div className="text-xs text-zinc-400 mt-1">{t.monthEarnings}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xl mb-1">📈</div>
              <div className="text-xl font-light" style={{ color: "#a78bfa" }}>${summary.lifetime_earnings.toFixed(2)}</div>
              <div className="text-xs text-zinc-400 mt-1">{t.lifetimeEarnings}</div>
            </div>
          </div>
          <Link href={`/driver/${driverCode}/earnings`}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition">
            <div>
              <div className="text-sm font-medium">{t.earningsLabel}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{t.earningsSub}</div>
            </div>
            <span className="text-zinc-400">→</span>
          </Link>
          <Link href={`/driver/${driverCode}/source-clients`}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 mt-3 transition">
            <div>
              <div className="text-sm font-medium">{t.capturedClients}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{t.capturedClientsSub}</div>
            </div>
            <span className="text-zinc-400">→</span>
          </Link>
        </div>
      )}
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

  // ── Repeating alert sound — plays on mount and every 8s until dismissed ──
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playOfferBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      // Triple-beep pattern: urgent, attention-grabbing
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime)
        gain.gain.setValueAtTime(0.5, ctx.currentTime + startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)
        osc.start(ctx.currentTime + startTime)
        osc.stop(ctx.currentTime + startTime + duration)
      }
      playTone(1047, 0.00, 0.18)  // C6
      playTone(1319, 0.22, 0.18)  // E6
      playTone(1568, 0.44, 0.30)  // G6 — longer final note
    } catch {}
  }, [])

  useEffect(() => {
    if (expired || responding) return
    // Play immediately on mount
    playOfferBeep()
    // Repeat every 8 seconds while offer is active
    alertIntervalRef.current = setInterval(() => {
      playOfferBeep()
      // Vibrate on repeat too
      try { if (navigator.vibrate) navigator.vibrate([150, 80, 150]) } catch {}
    }, 8000)
    return () => {
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.offer_id]) // only re-run when a new offer arrives

  // Stop repeating when driver responds or offer expires
  useEffect(() => {
    if ((expired || responding) && alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current)
      alertIntervalRef.current = null
    }
  }, [expired, responding])

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

  // Flashing border state for urgent visual pulse
  const [flashOn, setFlashOn] = useState(true)
  useEffect(() => {
    if (expired || responding) return
    const id = setInterval(() => setFlashOn(v => !v), 600)
    return () => clearInterval(id)
  }, [expired, responding])

  return (
    <div className="fixed inset-0 flex flex-col"
      style={{
        backgroundColor: "#000",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        // Flashing border: alternates between gold and transparent
        boxShadow: flashOn && !expired && !responding
          ? `inset 0 0 0 3px ${GOLD}, inset 0 0 40px ${GOLD}22`
          : "none",
        transition: "box-shadow 0.3s ease",
      }}>

      {/* ── URGENT ALERT BANNER ── */}
      {!expired && !responding && (
        <div
          className="flex items-center justify-center gap-3 px-4 py-2.5 flex-shrink-0"
          style={{
            backgroundColor: flashOn ? GOLD : "#1a1200",
            transition: "background-color 0.3s ease",
          }}>
          <span className="text-lg">🔔</span>
          <span className="text-sm font-black tracking-widest uppercase"
            style={{ color: flashOn ? "#000" : GOLD }}>
            {t.newRideOffer}
          </span>
          <span className="text-lg">🔔</span>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0"
        style={{ borderColor: expired ? "#27272a" : `${GOLD}40` }}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: expired ? "#71717a" : GOLD }} />
          <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: expired ? "#71717a" : GOLD }}>
            {expired ? (lang === "es" ? "Oferta Expirada" : "Offer Expired") : t.newRideOffer}
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

        {/* Countdown — always visible, prominent */}
        <div className="mt-3 flex-shrink-0 rounded-2xl px-4 py-3"
          style={{
            background: hasExpiry ? `${timerColor}12` : "#111",
            border: `1px solid ${hasExpiry ? timerColor + "40" : "#27272a"}`,
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest"
              style={{ color: hasExpiry ? timerColor : "#71717a" }}>
              {t.timeRemaining}
            </span>
            <span
              className="font-mono font-black tabular-nums"
              style={{
                color: timerColor,
                fontSize: hasExpiry && secondsLeft <= 20 ? 28 : 24,
                // Pulse when under 20s
                animation: hasExpiry && secondsLeft <= 20 && !expired ? "pulse 0.5s infinite" : "none",
              }}>
              {hasExpiry ? `${mm}:${ss}` : (lang === "es" ? "En espera" : "Awaiting")}
            </span>
          </div>
          {hasExpiry && (
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: timerColor }} />
            </div>
          )}
          {!hasExpiry && (
            <div className="text-xs text-zinc-600 text-center">
              {lang === "es" ? "Responde lo antes posible" : "Please respond as soon as possible"}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex-shrink-0 space-y-3">
          <button
            onClick={onAccept}
            disabled={responding || expired}
            className="w-full rounded-2xl text-xl font-black tracking-wider transition-all active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: expired ? "#27272a" : GOLD,
              color: expired ? "#71717a" : "#000",
              padding: "20px 0",
              boxShadow: !expired && !responding ? `0 0 24px ${GOLD}60` : "none",
              fontSize: 20,
              letterSpacing: "0.08em",
            }}>
            {responding ? (lang === "es" ? "Procesando..." : "Processing...") : t.accept}
          </button>
          <button
            onClick={onDecline}
            disabled={responding || expired}
            className="w-full py-4 rounded-2xl border text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{
              borderColor: "#dc262660",
              color: "#f87171",
              backgroundColor: "#dc262608",
            }}>
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
  ride, driverName, driverId, lang, onLang, onTransition, transitioning, onSendSMS, smsSending, smsSent, gpsCoords, gpsError, onReport, reporting, reportResult, rideUpdatedByDispatch, overdueSeconds, t,
}: {
  ride: ActiveRide; driverName: string; driverId: string; lang: Lang
  onLang: (l: Lang) => void; onTransition: (s: RideStatus) => void
  transitioning: boolean
  onSendSMS: (type: "arrived" | "en_route") => void
  smsSending: boolean; smsSent: boolean
  gpsCoords: { lat: number; lng: number } | null
  gpsError: string | null
  onReport: (action: "return_to_dispatch" | "report_incomplete" | "request_correction" | "reject_ride", missingFields?: string[], note?: string) => void
  reporting: boolean
  reportResult: { action: string; success: boolean } | null
  rideUpdatedByDispatch: boolean
  overdueSeconds: number
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
    accepted: {
      headerLabel: t.assignedRide,
      primaryLabel: t.enRouteBtn,
      primaryAction: "en_route",
      showNavigate: true,
      navigateUrl: mapsPickupUrl,
      showContact: true,
    },
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
    offer_pending: {
      headerLabel: t.assignedRide,
      primaryLabel: t.enRouteBtn,
      primaryAction: "en_route",
      showNavigate: true,
      navigateUrl: mapsPickupUrl,
      showContact: true,
    },
  }

  const cfg = stateConfig[ride.status] ?? stateConfig.accepted
  const steps: RideStatus[] = ["accepted", "en_route", "arrived", "in_trip", "completed"]
  const currentIdx = steps.indexOf(ride.status === "assigned" ? "accepted" : ride.status)

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

      {/* ── Context Badges (Scheduled time, Ride window, GPS) ──────── */}
      {(() => {
        const minutesUntil = ride.pickup_datetime
          ? Math.round((new Date(ride.pickup_datetime).getTime() - Date.now()) / 60000)
          : null
        const windowState = ride.ride_mode ?? (minutesUntil !== null
          ? minutesUntil <= 0 ? "live_flow" : minutesUntil <= 90 ? "active_window" : "upcoming"
          : "live_flow")
        const windowColor = windowState === "live_flow" ? "#a78bfa" : windowState === "active_window" ? GOLD : "#6b7280"
        const windowLabel = windowState === "live_flow"
          ? (lang === "es" ? "En ejecución" : "Live")
          : windowState === "active_window"
          ? (lang === "es" ? "Ventana activa" : "Active Window")
          : (lang === "es" ? "Próximo" : "Upcoming")
        const gpsReady = !!gpsCoords && !gpsError
        return (
          <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
            {/* Scheduled time badge */}
            {ride.pickup_datetime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 text-xs text-zinc-300">
                <span style={{ color: GOLD }}>🕐</span>
                <span>{new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                {minutesUntil !== null && minutesUntil > 0 && (
                  <span className="text-zinc-500">
                    ({minutesUntil > 60 ? `${Math.floor(minutesUntil/60)}h ${minutesUntil%60}m` : `${minutesUntil}m`})
                  </span>
                )}
              </div>
            )}
            {/* Ride window status badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ backgroundColor: windowColor + "15", color: windowColor }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: windowColor }} />
              {windowLabel}
            </div>
            {/* GPS readiness badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
              gpsReady ? "bg-green-500/10 text-green-400" : "bg-zinc-800/80 text-zinc-500"
            }`}>
              <span>{gpsReady ? "📍" : "📍"}</span>
              <span>{gpsReady ? (lang === "es" ? "GPS listo" : "GPS Ready") : (lang === "es" ? "Sin GPS" : "No GPS")}</span>
            </div>
            {/* Overdue live badge (Fase 3) — only when pickup has passed and ride not yet in_trip */}
            {overdueSeconds > 0 && ride.status !== "in_trip" && ride.status !== "completed" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs animate-pulse"
                style={{ backgroundColor: "#dc262620", color: "#ef4444", border: "1px solid #dc262640" }}>
                <span>🔴</span>
                <span className="font-bold">
                  {lang === "es" ? "Retraso" : "Overdue"}{" "}
                  {overdueSeconds >= 3600
                    ? `${Math.floor(overdueSeconds/3600)}h ${Math.floor((overdueSeconds%3600)/60)}m`
                    : overdueSeconds >= 60
                    ? `${Math.floor(overdueSeconds/60)}m ${overdueSeconds%60}s`
                    : `${overdueSeconds}s`}
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Client Profile Strip (TOP PRIORITY — always visible) ────── */}
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

        {/* ── OPERATIONAL BRIEFING CARD ── */}
        <div className="rounded-2xl border overflow-hidden mb-4"
          style={{ borderColor: theme.primary + "30", backgroundColor: "#0f0f0f" }}>

          {/* ─ Section: Pickup/Dropoff addresses ─ */}
          <div className="px-5 pt-4 pb-3">
            <div className="mb-3">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {t.pickup}
              </div>
              <div className="text-base font-medium text-white leading-snug">{ride.pickup_location}</div>
              {ride.pickup_zone && (
                <div className="text-xs text-zinc-500 mt-0.5">{ride.pickup_zone}</div>
              )}
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
              <div className="text-base font-medium text-white leading-snug">{ride.dropoff_location}</div>
              {ride.dropoff_zone && (
                <div className="text-xs text-zinc-500 mt-0.5">{ride.dropoff_zone}</div>
              )}
            </div>
          </div>

          {/* ─ Section: Date / Time / Vehicle / Fare grid ─ */}
          <div className="grid grid-cols-4 divide-x border-t"
            style={{ borderColor: theme.primary + "20" }}>
            <div className="px-3 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.pickup}</div>
              <div className="text-xs font-medium text-white">{pickupDate || "—"}</div>
              <div className="text-xs text-zinc-300 font-semibold">{pickupTime || "—"}</div>
            </div>
            <div className="px-3 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.vehicle}</div>
              <div className="text-xs font-medium text-white leading-tight">{ride.vehicle_type}</div>
            </div>
            <div className="px-3 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.passengers}</div>
              <div className="text-sm font-medium text-white">{ride.passengers ?? "—"}</div>
            </div>
            <div className="px-3 py-3">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.fare}</div>
              <div className="text-lg font-bold" style={{ color: GOLD }}>${ride.total_price.toFixed(0)}</div>
            </div>
          </div>

          {/* ─ Section: Passenger info ─ */}
          <div className="px-5 py-3 border-t" style={{ borderColor: theme.primary + "20" }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.passenger}</div>
                <div className="text-sm font-semibold text-white truncate">{ride.client_name ?? "—"}</div>
              </div>
              {ride.client_phone && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.passengerPhone}</div>
                  <a href={`tel:${ride.client_phone}`}
                    className="text-sm font-medium truncate block"
                    style={{ color: theme.primary }}>
                    {ride.client_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ─ Section: Service type + Flight info (airport rides) ─ */}
          {(ride.service_type || ride.flight_number) && (
            <div className="px-5 py-3 border-t" style={{ borderColor: theme.primary + "20" }}>
              <div className="grid grid-cols-2 gap-3">
                {ride.service_type && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.serviceType}</div>
                    <div className="text-xs font-bold px-2 py-0.5 rounded-full inline-block"
                      style={{ backgroundColor: theme.primary + "20", color: theme.primary, border: `1px solid ${theme.primary}40` }}>
                      {ride.service_type === "meet_greet" ? t.meetGreet
                        : ride.service_type === "curbside" ? t.curbside
                        : t.transfer}
                    </div>
                  </div>
                )}
                {ride.flight_number && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.flightNumber}</div>
                    <div className="text-sm font-bold text-white">{ride.flight_number}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ Section: Notes ─ */}
          {ride.notes && (
            <div className="px-5 py-3 border-t" style={{ borderColor: theme.primary + "20" }}>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.notes}</div>
              <div className="text-sm text-zinc-300 leading-relaxed">{ride.notes}</div>
            </div>
          )}

          {/* ─ Elapsed time (in_trip only) ─ */}
          {cfg.showElapsed && (
            <div className="px-5 py-3 border-t flex items-center justify-between"
              style={{ borderColor: theme.primary + "30", backgroundColor: theme.primary + "08" }}>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">{t.elapsedTime}</div>
              <div className="text-xl font-mono font-bold tabular-nums" style={{ color: theme.primary }}>{elapsed}</div>
            </div>
          )}

          {/* ─ Booking ID ─ */}
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
      {(() => {
        // READINESS GUARDRAIL: only for en_route transition (accepted/assigned states)
        // Critical fields: pickup_address + pickup_datetime (must have to operate)
        // Optional fields: client_name, client_phone (warn but don't block)
        const isEnRouteAction = cfg.primaryAction === "en_route"
        const gpsReady = !!gpsCoords && !gpsError
        const hasPickupAddress = !!(ride.pickup_location && ride.pickup_location !== "TBD")
        const hasPassengerInfo = !!(ride.client_name && ride.client_phone)
        const hasPickupTime = !!ride.pickup_datetime
        // dataReady only requires critical fields (address + time) — passenger info is optional
        const dataReady = hasPickupAddress && hasPickupTime
        const fullyReady = dataReady && gpsReady
        const partiallyReady = dataReady && !gpsReady // data ok but no GPS

        return (
          <div className="px-4 flex-shrink-0 space-y-2">
            {/* Dispatch live sync banner: shown when admin updated the booking */}
            {rideUpdatedByDispatch && (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2"
                style={{ backgroundColor: "#14532d", color: "#86efac", border: "1px solid #16a34a60" }}>
                <span>✅</span>
                <span>{lang === "ht" ? "Despacho mete enfòmasyon yo" : lang === "es" ? "Despacho actualizó el viaje" : "Dispatch updated your ride"}</span>
              </div>
            )}

            {/* Readiness warning banner (en_route only, when not fully ready) */}
            {isEnRouteAction && !fullyReady && (
              <div className="rounded-xl px-4 py-2.5 text-xs leading-relaxed"
                style={{ backgroundColor: "#7c2d12", color: "#fca5a5", border: "1px solid #dc262640" }}>
                {!dataReady ? t.readinessWarning : t.gpsRequiredWarning}
              </div>
            )}

            {/* OPERATIONAL WINDOW GUARD:
               active_window  → ride is scheduled but not yet within 2h. Show scheduled card.
               operational_window_open / live_flow → show primary action button.
            */}
            {isEnRouteAction && ride.ride_mode === "active_window" ? (
              // Scheduled state: ride accepted but not yet in operational window
              <div className="rounded-2xl border px-5 py-4 text-center"
                style={{ borderColor: GOLD + "30", backgroundColor: "#0f0f00" }}>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                  {lang === "es" ? "Viaje programado" : lang === "ht" ? "Vwayaj pwograme" : "Scheduled Ride"}
                </div>
                {ride.pickup_datetime && (
                  <div className="text-2xl font-bold mb-1" style={{ color: GOLD }}>
                    {new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                )}
                {ride.minutes_until_pickup !== null && ride.minutes_until_pickup !== undefined && (
                  <div className="text-sm text-zinc-400">
                    {ride.minutes_until_pickup > 60
                      ? `${Math.floor(ride.minutes_until_pickup / 60)}h ${ride.minutes_until_pickup % 60}m ${lang === "es" ? "para el servicio" : "until pickup"}`
                      : `${ride.minutes_until_pickup}m ${lang === "es" ? "para el servicio" : "until pickup"}`
                    }
                  </div>
                )}
                <div className="text-xs text-zinc-600 mt-2">
                  {lang === "es"
                    ? "Los controles operacionales se activarán 2 horas antes del servicio"
                    : lang === "ht"
                    ? "Kontwòl operasyonèl yo pral aktive 2 è anvan sèvis la"
                    : "Operational controls activate 2 hours before pickup"}
                </div>
              </div>
            ) : cfg.primaryAction ? (
              <button
                onClick={() => cfg.primaryAction && onTransition(cfg.primaryAction)}
                disabled={transitioning || (isEnRouteAction && !dataReady)}
                className="w-full py-5 rounded-2xl text-lg font-bold transition-all active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor: isEnRouteAction && !fullyReady && dataReady
                    ? "#78716c"  // muted amber when GPS missing but data ok
                    : theme.primary,
                  color: theme.primary === "#f59e0b" || theme.primary === GOLD || theme.primary === "#4ade80" ? "#000" : "#fff"
                }}>
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

            {/* ── Recovery actions: only visible when data is incomplete ── */}
            {isEnRouteAction && !dataReady && (
              <div className="pt-2 border-t border-zinc-800/60 space-y-2">

                {/* ── POST-ACTION CONFIRMATION SCREEN ── */}
                {reportResult?.success ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="text-4xl">
                      {reportResult.action === "reject_ride" ? "🚫" :
                       reportResult.action === "return_to_dispatch" ? "↩️" :
                       reportResult.action === "report_incomplete" ? "📋" : "✏️"}
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-semibold text-base mb-1">
                        {reportResult.action === "reject_ride" ? t.rideRejected :
                         reportResult.action === "return_to_dispatch" ? t.returnedToDispatch :
                         t.reportSent}
                      </div>
                      <div className="text-zinc-500 text-xs mt-1">
                        {reportResult.action === "return_to_dispatch" || reportResult.action === "reject_ride"
                          ? (lang === "es" ? "Volviendo al panel en unos segundos..." : lang === "ht" ? "Retounen nan panèl nan kèk segonn..." : "Returning to dashboard in a moment...")
                          : (lang === "es" ? "El admin fue notificado. Espera la corrección." : lang === "ht" ? "Admin avize. Tann koreksyon an." : "Admin has been notified. Wait for correction.")}
                      </div>
                    </div>
                    {/* Only show back button for report/correction (not dispatch/reject which auto-redirect) */}
                    {(reportResult.action === "report_incomplete" || reportResult.action === "request_correction") && (
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95"
                        style={{ backgroundColor: "#1c1917", color: GOLD, border: `1px solid ${GOLD}50` }}>
                        {lang === "es" ? "← Volver al panel" : lang === "ht" ? "← Retounen nan panèl" : "← Back to Dashboard"}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-zinc-500 text-center font-medium uppercase tracking-widest pb-1">
                      {t.recoveryTitle}
                    </div>

                    {/* Error feedback */}
                    {reportResult && !reportResult.success && (
                      <div className="text-xs text-center py-2 rounded-xl text-red-400 bg-red-900/30">
                        {t.actionFailed}
                      </div>
                    )}

                    {/* Return to Dispatch */}
                    <button
                      onClick={() => onReport("return_to_dispatch", getMissingFields(), undefined)}
                      disabled={reporting}
                      className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                      style={{ backgroundColor: "#1c1917", color: "#f59e0b", border: "1px solid #f59e0b50" }}>
                      {reporting ? "..." : t.returnToDispatch}
                    </button>

                    {/* Report Incomplete Data */}
                    <button
                      onClick={() => onReport("report_incomplete", getMissingFields(), undefined)}
                      disabled={reporting}
                      className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                      style={{ backgroundColor: "#1c1917", color: "#ef4444", border: "1px solid #ef444450" }}>
                      {reporting ? "..." : t.reportIncomplete}
                    </button>

                    {/* Request Correction */}
                    <button
                      onClick={() => onReport("request_correction", getMissingFields(), undefined)}
                      disabled={reporting}
                      className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                      style={{ backgroundColor: "#1c1917", color: "#a78bfa", border: "1px solid #a78bfa50" }}>
                      {reporting ? "..." : t.requestCorrection}
                    </button>

                    {/* Reject Ride — only when critical data missing */}
                    {(!hasPickupTime || !hasPickupAddress || !hasPassengerInfo) && (
                      <button
                        onClick={() => onReport("reject_ride", getMissingFields(), undefined)}
                        disabled={reporting}
                        className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                        style={{ backgroundColor: "#450a0a", color: "#fca5a5", border: "1px solid #ef444440" }}>
                        {reporting ? "..." : t.rejectRide}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )

  function getMissingFields(): string[] {
    const missing: string[] = []
    if (!ride.pickup_datetime) missing.push("pickup_time")
    if (!ride.pickup_location || ride.pickup_location === "TBD") missing.push("pickup_address")
    if (!ride.client_phone) missing.push("passenger_phone")
    if (!ride.client_name) missing.push("passenger_name")
    return missing
  }
}
