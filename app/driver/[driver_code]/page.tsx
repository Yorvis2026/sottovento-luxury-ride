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
  // DEDUP GUARD: track the last booking_id that was accepted by this driver.
  // After acceptance, block any offer screen for this booking_id until the backend
  // confirms status='accepted' (prevents race condition re-render of OfferScreen).
  const lastAcceptedBookingIdRef = useRef<string | null>(null)

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

      if (rideChanged || (offerChanged && hadNoOffer)) {
        playAlert()
        // Vibrate if supported (pattern: 3 pulses)
        try { if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]) } catch {}
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
        if (rideChanged && activeRide && activeRide.status !== "offer_pending" && activeRide.ride_mode !== "offer_pending") {
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

  // ── GPS: continuous watchPosition for live tracking ────────────────────
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

  const handleOfferExpired = useCallback(() => {
    if (respondResult) return
    setRespondResult("expired")
    setTimeout(() => { setRespondResult(null); loadData() }, 2500)
  }, [respondResult, loadData])

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

  // ── Execute the actual ride transition ────────────────────────────
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

    await executeTransition(newStatus)
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
    const shareText = lang === "es"
      ? `¡Reserva tu viaje de lujo con Sottovento! Usa mi enlace personalizado: ${referralUrl}`
      : lang === "ht"
      ? `Rezève vwayaj luksi ou ak Sottovento! Itilize lyen pèsonèl mwen: ${referralUrl}`
      : `Book your luxury ride with Sottovento! Use my personal link: ${referralUrl}`

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
    const emailUrl = `mailto:?subject=${encodeURIComponent(lang === "es" ? "Reserva tu viaje de lujo" : "Book your luxury ride")}&body=${encodeURIComponent(shareText)}`

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

  // ── EARLY START MODAL (temporal guardrail) ──────────────────────────────
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

  // ── COMPLETION OVERLAY (v5 — shows +$amount) ──────────────────────
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
            expires_at: null,
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
                const isNearWindow = minutesUntil !== null && minutesUntil <= 40
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
  ride, driverName, driverId, lang, onLang, onTransition, transitioning, onSendSMS, smsSending, smsSent, gpsCoords, gpsError, onReport, reporting, reportResult, rideUpdatedByDispatch, t,
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
               active_window  → ride is scheduled but not yet within 40 min. Show scheduled card.
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
                    ? "Los controles operacionales se activarán 40 min antes del servicio"
                    : lang === "ht"
                    ? "Kontwòl operasyonèl yo pral aktive 40 min anvan sèvis la"
                    : "Operational controls activate 40 min before pickup"}
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
