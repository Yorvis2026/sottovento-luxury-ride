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
// BUG A FIX: Reduced from 5000ms to 3000ms to improve real-time offer detection.
// The previous 5s interval caused up to 5s delay before a new offer appeared.
// 3s is a good balance between responsiveness and server load.
const POLL_INTERVAL = 3000
// BUG E FIX: Secondary poll interval for offer expiration detection.
// The cron expire-driver-offers runs every ~30s. We poll at 20s to catch
// expirations before the driver's countdown timer fires, ensuring the UI
// reflects the server state without requiring a manual refresh.
const EXPIRY_POLL_INTERVAL = 20000

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
    newRideOffer: "NEW RIDE REQUEST",
    timeRemaining: "Accept within",
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
    newRideOffer: "NUEVA SOLICITUD",
    timeRemaining: "Aceptar en",
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
    newRideOffer: "NOUVO SÈVIS",
    timeRemaining: "Aksepte nan",
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
  // Bloque 1: Driver Exit / At-Risk fields
  at_risk_flagged_at?: string | null
  driver_exit_reason?: string | null
  driver_exit_at?: string | null
  driver_exit_case?: string | null
  // Bloque 2: Post-Accept Guardrail fields
  risk_source?: string | null
  auto_escalated_at?: string | null
  auto_escalation_case?: string | null
  accepted_at?: string | null
  is_at_risk?: boolean
  // BM6: SLA Protection fields
  sla_protection_level?: string | null
  sla_current_state?: string | null
  sla_window_start?: string | null
  sla_window_end?: string | null
  sla_critical_threshold?: number | null
  sla_high_risk_threshold?: number | null
  sla_monitoring_threshold?: number | null
  driver_im_on_my_way?: boolean | null
  driver_im_on_my_way_at?: string | null
  dispatcher_override_required?: boolean | null
  reassignment_count?: number | null
  last_system_action?: string | null
  // BM8: Airport Intelligence fields
  airport_code?: string | null
  airline_code?: string | null
  terminal_code?: string | null
  gate_info?: string | null
  baggage_claim_zone?: string | null
  airport_intelligence_status?: string | null
  airport_phase?: string | null
  airport_monitoring_enabled?: boolean | null
  airport_irregularity_flag?: boolean | null
  scheduled_arrival_at?: string | null
  estimated_arrival_at?: string | null
  actual_arrival_at?: string | null
  flight_delay_minutes?: number | null
  operational_pickup_target_at?: string | null
  operational_driver_release_at?: string | null
  // BM8 LIVE-FIRST validation fields
  flight_validation_status?: string | null
  flight_validation_message?: string | null
  manual_flight_review_required?: boolean | null
  flight_provider_used?: string | null
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

interface CancelledRide {
  booking_id: string
  status: string
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  cancelled_at: string | null
  vehicle_type: string
  total_price: number
  cancel_reason?: string | null
  cancelled_by_type?: string | null
  cancel_stage?: string | null
  affects_driver_metrics?: boolean
  affects_payout?: boolean
  cancellation_fee?: number
  client_name?: string | null
}

interface ExpiredOffer {
  booking_id: string
  round_number: number
  offer_status: string
  sent_at: string | null
  responded_at: string | null
  notes: string | null
  created_at: string
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  vehicle_type: string
  total_price: number
}

interface DriverSummary {
  driver_id: string
  driver_name: string
  driver_code: string
  driver_status: string
  availability_status: 'offline' | 'available' | 'busy'
  total_clients: number
  month_earnings: number
  lifetime_earnings: number
  pending_offers: number
  completed_rides_count: number
  active_offer: ActiveOffer | null
  assigned_ride: ActiveRide | null
  upcoming_rides: UpcomingRide[]
  completed_rides: CompletedRide[]
  cancelled_rides: CancelledRide[]
  expired_offers: ExpiredOffer[]
  expired_offers_count: number
  // BM5: Driver Reliability Score Engine
  reliability_score?: number
  driver_tier?: string
  legal_affiliation_type?: string
  acceptance_rate?: number
  completion_rate?: number
  driver_cancel_rate?: number
  fallback_response_rate?: number
  on_time_score?: number
  dispatch_response_score?: number
  driver_score_total?: number
  driver_score_tier?: string
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
  // ── Active Mode: cached ride state for instant re-entry after screen sleep ──
  // Initialized from localStorage so the correct screen renders immediately
  // without waiting for the first server fetch.
  const [cachedRide, setCachedRide] = useState<{
    booking_id: string
    status: string
    ride_mode: string | null
    pickup_location: string
    dropoff_location: string
    total_price: number
    pickup_datetime: string | null
    client_name: string
    cached_at?: string
  } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(`sln_active_ride_${driverCode}`)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      // Only use cache if it's an operational state (not completed/cancelled)
      const OPERATIONAL = ['accepted', 'assigned', 'en_route', 'arrived', 'in_trip', 'offer_pending']
      if (OPERATIONAL.includes(parsed.status)) return parsed
      return null
    } catch { return null }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // ── Availability Engine ──────────────────────────────────────────
  const [availabilityToggling, setAvailabilityToggling] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [responding, setResponding] = useState(false)
  const [respondResult, setRespondResult] = useState<"accepted" | "declined" | "expired" | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [completedFare, setCompletedFare] = useState<number | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [dashTab, setDashTab] = useState<"overview" | "upcoming" | "completed" | "cancelled" | "earnings">("overview")
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
  // ── Driver recovery actions ──────────────────────────────
  const [reporting, setReporting] = useState(false)
  const [reportResult, setReportResult] = useState<{ action: string; success: boolean } | null>(null)
  // ── Driver Exit Modal (Bloque 1) ─────────────────────────
  // Shown when driver taps "No puedo realizar este servicio"
  const [showDriverExitModal, setShowDriverExitModal] = useState(false)
  const [driverExitReason, setDriverExitReason] = useState<string>("")
  const [driverExitComment, setDriverExitComment] = useState<string>("")
  const [driverExitSubmitting, setDriverExitSubmitting] = useState(false)
  const [driverExitResult, setDriverExitResult] = useState<{ success: boolean; case: string; new_status: string } | null>(null)
  // ── BM11: Release Ride Modal (Driver Post-Accept Release Flow) ───────────
  // Shown when driver taps "No puedo realizar este viaje" (pre-execution only)
  // Separate from driver-exit: this is a clean release, not an incident report.
  const [showReleaseRideModal, setShowReleaseRideModal] = useState(false)
  const [releaseRideReason, setReleaseRideReason] = useState<string>("")
  const [releaseRideSubmitting, setReleaseRideSubmitting] = useState(false)
  const [releaseRideResult, setReleaseRideResult] = useState<{ success: boolean; admin_alert: string | null; message: string } | null>(null)
    // ── BM6: SLA Protection state ─────────────────────
  const [sendingImOnMyWay, setSendingImOnMyWay] = useState(false)
  const [imOnMyWaySent, setImOnMyWaySent] = useState(false)
  // ── BM8 Annex: Airport Load Awareness ────────────────────
  const [airportLoad, setAirportLoad] = useState<{
    airport_code: string
    arrivals_next_60m: number
    arrivals_next_120m: number
    airport_load_level: 'low' | 'moderate' | 'high' | 'peak'
    terminal_congestion_hint: string | null
    delay_pressure_index: number
    source: string
  } | null>(null)
  // ── Fallback Offer Modal (Bloque Maestro 3) ───────────────────────
  // Shown when a fallback pool offer arrives (another driver failed)
  const [showFallbackOfferModal, setShowFallbackOfferModal] = useState(false)
  const [fallbackOfferData, setFallbackOfferData] = useState<{
    offer_id: string
    booking_id: string
    pickup_location: string
    dropoff_location: string
    pickup_datetime: string | null
    vehicle_type: string
    total_price: number
    expires_at: string
    fallback_case_level: string
    fallback_priority_level: string
    passengers: number | null
    notes: string | null
    flight_number: string | null
    client_name: string | null
  } | null>(null)
  const [fallbackOfferCountdown, setFallbackOfferCountdown] = useState<number>(120)
  const fallbackCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [fallbackOfferSubmitting, setFallbackOfferSubmitting] = useState(false)
  const prevFallbackOfferIdRef = useRef<string | null>(null)
  // ── Upcoming ride detail expand ───────────────────────────────────────────────
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
  // FIX C — DEDUP GUARD: Set of offer_ids already alerted in this session
  // Prevents re-alert on every polling refresh while same offer is active
  // but allows alerting for second, third, etc. offers in the same session
  const seenOfferIdsRef = useRef<Set<string>>(new Set())
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

  // FIX B — Distinct urgent alert for reassignment/fallback offers (offer_round > 1)
  // Descending 4-tone pattern repeated twice — clearly different from standard alert
  const playUrgentAlert = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const playTone = (freq: number, startTime: number, duration: number, vol = 0.65) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime)
        gain.gain.setValueAtTime(vol, ctx.currentTime + startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration)
        osc.start(ctx.currentTime + startTime)
        osc.stop(ctx.currentTime + startTime + duration)
      }
      // Descending urgent pattern: G6 → E6 → C6 → G5, repeated twice
      playTone(1568, 0.00, 0.14) // G6
      playTone(1319, 0.17, 0.14) // E6
      playTone(1047, 0.34, 0.14) // C6
      playTone(784,  0.51, 0.25) // G5 — low final note
      playTone(1568, 0.85, 0.14) // G6 repeat
      playTone(1319, 1.02, 0.14) // E6
      playTone(1047, 1.19, 0.14) // C6
      playTone(784,  1.36, 0.30) // G5
    } catch {}
  }, [])

  // ── Dashboard banner: repeat audio + vibration every 5s while banner is active ──
  // This fires when the driver is on the DASHBOARD (not on OfferScreen) and has a pending offer.
  // The OfferScreen has its own independent alert loop (playOfferBeep).
  const dashboardAlertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (showOfferBanner) {
      // Play immediately
      playAlert()
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]) } catch {}
      // Repeat every 5 seconds
      dashboardAlertIntervalRef.current = setInterval(() => {
        playAlert()
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]) } catch {}
      }, 5000)
    } else {
      // Clear when banner is dismissed
      if (dashboardAlertIntervalRef.current) {
        clearInterval(dashboardAlertIntervalRef.current)
        dashboardAlertIntervalRef.current = null
      }
    }
    return () => {
      if (dashboardAlertIntervalRef.current) {
        clearInterval(dashboardAlertIntervalRef.current)
        dashboardAlertIntervalRef.current = null
      }
    }
  }, [showOfferBanner, playAlert])

  // ── BM8 Annex: Airport Load fetch (non-blocking) ─────────────
  const loadAirportLoad = useCallback(async (airportCode: string) => {
    try {
      const r = await fetch(`/api/admin/airport-load?airport_code=${encodeURIComponent(airportCode)}`, { cache: 'no-store' })
      if (r.ok) { const d = await r.json(); setAirportLoad(d) }
    } catch { /* non-blocking */ }
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

      // ── ALERT LAYER: detect ANY new offer not yet seen in this session ──────────────────────
      // FIX A: Fire on EVERY new offer_id, not just the first one in the session.
      // FIX C: seenOfferIdsRef prevents duplicate alerts on polling refresh
      //        while the same offer is still active (no re-alert on every 5s poll).
      const isNewUnseenOffer = newOfferId !== null && !seenOfferIdsRef.current.has(newOfferId)
      if (isNewUnseenOffer) {
        // Mark as seen immediately to prevent duplicate on next poll cycle
        seenOfferIdsRef.current.add(newOfferId)
        // 1. Persistent top banner
        setShowOfferBanner(true)
        // 2. Increment counter (supports multiple offers in session)
        setOfferAlertCount((c) => c + 1)
        // 3. Foreground modal (auto-opens)
        setShowOfferAlertModal(true)
        // 4. Vibration: urgent triple-pulse pattern per spec
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]) } catch {}
        // 5. FIX A: Sound fires immediately on new offer detection
        //    FIX B: Distinct urgent pattern for reassignment offers (offer_round > 1)
        const offerRound = d.active_offer?.offer_round ?? 1
        if (offerRound > 1) {
          // Reassignment/urgent offer — stronger descending alert
          playUrgentAlert()
          try { if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300, 100, 300]) } catch {}
        } else {
          playAlert()
        }
      }

      // Clear banner and counter when offer disappears (accepted/declined/expired)
      if (!d.active_offer && prevOfferIdRef.current !== null) {
        setShowOfferBanner(false)
        setOfferAlertCount(0)
        setShowOfferAlertModal(false)
      }

      if (rideChanged || isNewUnseenOffer) {
        if (!isNewUnseenOffer) playAlert() // avoid double-play when both conditions true
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

      // ── Fallback Offer Detection (Bloque Maestro 3) ──────────────────────
      const newFallbackOfferId = d.fallback_offer?.offer_id ?? null
      const fallbackOfferChanged = newFallbackOfferId !== null && newFallbackOfferId !== prevFallbackOfferIdRef.current
      if (fallbackOfferChanged && d.fallback_offer) {
        const fo = d.fallback_offer
        setFallbackOfferData({
          offer_id: fo.offer_id,
          booking_id: fo.booking_id,
          pickup_location: fo.pickup_location ?? 'TBD',
          dropoff_location: fo.dropoff_location ?? 'TBD',
          pickup_datetime: fo.pickup_datetime ?? null,
          vehicle_type: fo.vehicle_type ?? 'Sedan',
          total_price: fo.total_price ?? 0,
          expires_at: fo.expires_at,
          fallback_case_level: fo.fallback_case_level ?? 'A',
          fallback_priority_level: fo.fallback_priority_level ?? 'normal',
          passengers: fo.passengers ?? null,
          notes: fo.notes ?? null,
          flight_number: fo.flight_number ?? null,
          client_name: fo.client_name ?? null,
        })
        // Compute countdown from expires_at
        const secsLeft = Math.max(0, Math.round((new Date(fo.expires_at).getTime() - Date.now()) / 1000))
        setFallbackOfferCountdown(secsLeft)
        setShowFallbackOfferModal(true)
        // Start countdown timer
        if (fallbackCountdownRef.current) clearInterval(fallbackCountdownRef.current)
        fallbackCountdownRef.current = setInterval(() => {
          setFallbackOfferCountdown(prev => {
            if (prev <= 1) {
              clearInterval(fallbackCountdownRef.current!)
              setShowFallbackOfferModal(false)
              setFallbackOfferData(null)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        // FIX B: Fallback offers are always urgent — use distinct urgent alert
        // FIX A: Removed visibilityState guard — sound fires immediately on detection
        try { playUrgentAlert() } catch {}
        try { if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300, 100, 300]) } catch {}
      }
      // Clear fallback offer modal when offer disappears
      if (!d.fallback_offer && prevFallbackOfferIdRef.current !== null) {
        setShowFallbackOfferModal(false)
        setFallbackOfferData(null)
        if (fallbackCountdownRef.current) clearInterval(fallbackCountdownRef.current)
      }
      prevFallbackOfferIdRef.current = newFallbackOfferId

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
      // ── BM8 Annex: Trigger airport load if ride is airport type ──
      if (activeRide) {
        const combined = ((activeRide.pickup_location ?? '') + ' ' + (activeRide.dropoff_location ?? '')).toLowerCase()
        const isAirportRide = combined.includes('airport') || combined.includes('mco') || combined.includes('mia') || combined.includes('fll') || !!activeRide.airport_code
        if (isAirportRide) {
          loadAirportLoad(activeRide.airport_code ?? 'MCO')
        } else {
          setAirportLoad(null)
        }
      } else {
        setAirportLoad(null)
      }

      setSummary({
        driver_id: d.id,
        driver_name: d.full_name,
        driver_code: d.driver_code,
        driver_status: d.driver_status,
        availability_status: (d.availability_status ?? 'offline') as 'offline' | 'available' | 'busy',
        total_clients: d.stats?.total_clients ?? 0,
        month_earnings: d.stats?.month_earnings ?? 0,
        lifetime_earnings: d.stats?.lifetime_earnings ?? 0,
        pending_offers: d.stats?.pending_offers ?? 0,
        completed_rides_count: d.stats?.completed_rides_count ?? 0,
        active_offer: d.active_offer ?? null,
        assigned_ride: activeRide,
        upcoming_rides: d.upcoming_rides ?? [],
        completed_rides: d.completed_rides ?? [],
        cancelled_rides: d.cancelled_rides ?? [],
        expired_offers: d.expired_offers ?? [],
        expired_offers_count: d.stats?.expired_offers_count ?? (d.expired_offers?.length ?? 0),
        // BM5: Driver Reliability Score Engine
        reliability_score: d.reliability_score ?? undefined,
        driver_tier: d.driver_tier ?? undefined,
        legal_affiliation_type: d.legal_affiliation_type ?? undefined,
        acceptance_rate: d.acceptance_rate ?? undefined,
        completion_rate: d.completion_rate ?? undefined,
        driver_cancel_rate: d.driver_cancel_rate ?? undefined,
        fallback_response_rate: d.fallback_response_rate ?? undefined,
        on_time_score: d.on_time_score ?? undefined,
        dispatch_response_score: d.dispatch_response_score ?? undefined,
        driver_score_total: d.driver_score_total ?? undefined,
        driver_score_tier: d.driver_score_tier ?? undefined,
      })
      // ── Active Mode: persist ride state to localStorage for instant re-entry ──
      // On screen sleep / app re-open, the cached state is read before the first fetch
      // so the driver sees the correct operational screen immediately.
      try {
        const OPERATIONAL = ['accepted', 'assigned', 'en_route', 'arrived', 'in_trip', 'offer_pending']
        const cacheKey = `sln_active_ride_${driverCode}`
        if (activeRide && OPERATIONAL.includes(activeRide.status)) {
          const cachePayload = {
            booking_id: activeRide.booking_id,
            status: activeRide.status,
            ride_mode: activeRide.ride_mode ?? null,
            pickup_location: activeRide.pickup_location,
            dropoff_location: activeRide.dropoff_location,
            total_price: activeRide.total_price,
            pickup_datetime: activeRide.pickup_datetime ?? null,
            client_name: activeRide.client_name ?? "",
            cached_at: new Date().toISOString(),
          }
          localStorage.setItem(cacheKey, JSON.stringify(cachePayload))
          setCachedRide(cachePayload)
        } else {
          // Clear cache when ride is no longer operational
          localStorage.removeItem(cacheKey)
          setCachedRide(null)
        }
      } catch {}
      setLoading(false)
    } catch {
      setError("Failed to load driver data")
      setLoading(false)
    }
  }, [driverCode, playAlert])

  useEffect(() => {
    loadData()
    pollRef.current = setInterval(loadData, POLL_INTERVAL)
    // ── Availability Engine: panel open → available ───────────────────────────────────────
    // When the driver opens the panel, set availability_status = 'available'
    // so they are eligible to receive dispatch offers.
    // Fire-and-forget: does NOT block render or polling.
    if (driverCode) {
      fetch('/api/driver/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_code: driverCode, status: 'available' }),
      }).catch(() => {})
    }
    // ── Availability Engine: panel close → offline ───────────────────────────────────────
    // When the driver closes the panel (tab close, navigation away), set offline.
    // Uses pagehide (more reliable than beforeunload on Safari/iOS).
    const handlePageHide = () => {
      if (driverCode) {
        // Use sendBeacon for reliable delivery on page unload
        const payload = JSON.stringify({ driver_code: driverCode, status: 'offline' })
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          navigator.sendBeacon('/api/driver/availability', blob)
        } else {
          fetch('/api/driver/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {})
        }
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [loadData, driverCode])
  // ── Visibility: immediate loadData + re-available when driver returns to app tab ──────────────
  // Ensures offer appears instantly when driver opens the PWA from background.
  // Without this, the driver would wait up to POLL_INTERVAL (5s) to see a new offer.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData()
        // Re-set available when driver returns to the tab (unless busy with a ride)
        if (driverCode) {
          fetch('/api/driver/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driver_code: driverCode, status: 'available' }),
          }).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData, driverCode])
  // ── Heartbeat: trigger server-side cron every 30s while panel is visible ─
  // BUG E FIX: Reduced from 60s to 30s to match the cron expire-driver-offers cadence.
  // This ensures that when an offer expires server-side, the UI reflects it within 30s
  // without requiring a manual refresh. The EXPIRY_POLL_INTERVAL (20s) loadData call
  // below will pick up the server state change.
  // Fire-and-forget — does NOT block render, does NOT affect UX.
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetch('/api/cron/expire-driver-offers', { method: 'GET' }).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(heartbeat)
  }, [])
  // ── BUG E FIX: Expiry sync poll — loadData every 20s to catch server-side expirations ──
  // The main POLL_INTERVAL (3s) handles active offer detection.
  // This secondary interval ensures that when the cron expires an offer server-side,
  // the UI syncs within 20s even if the driver's countdown timer hasn't fired yet.
  // This is the 'polling liviano' option specified in BM11 BUG E.
  const expiryPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    // Only activate when driver has an active offer (no need to poll otherwise)
    if (summary?.active_offer) {
      expiryPollRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadData()
        }
      }, EXPIRY_POLL_INTERVAL)
    } else {
      if (expiryPollRef.current) {
        clearInterval(expiryPollRef.current)
        expiryPollRef.current = null
      }
    }
    return () => {
      if (expiryPollRef.current) {
        clearInterval(expiryPollRef.current)
        expiryPollRef.current = null
      }
    }
  }, [summary?.active_offer, loadData])
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

  // ── Availability Engine: manual toggle ──────────────────────────────────────────
  // Driver can manually toggle between available and offline.
  // Cannot toggle to offline while a ride is in progress (busy state).
  const toggleAvailability = async () => {
    if (!summary || availabilityToggling) return
    // Cannot manually toggle if busy (ride in progress)
    if (summary.availability_status === 'busy') return
    const newStatus = summary.availability_status === 'available' ? 'offline' : 'available'
    setAvailabilityToggling(true)
    setAvailabilityError(null)
    try {
      const res = await fetch('/api/driver/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_code: summary.driver_code, status: newStatus }),
      })
      const data = await res.json()
      if (data.error) {
        setAvailabilityError(data.error)
        setTimeout(() => setAvailabilityError(null), 4000)
      } else {
        // Optimistically update local state
        setSummary((prev) => prev ? { ...prev, availability_status: newStatus as 'offline' | 'available' | 'busy' } : prev)
      }
    } catch {
      setAvailabilityError('Failed to update availability')
      setTimeout(() => setAvailabilityError(null), 4000)
    }
    setAvailabilityToggling(false)
  }

  // ── Driver Exit: submit exit reason and call driver-exit endpoint ──────────
  const submitDriverExit = async () => {
    if (!summary?.assigned_ride || !driverExitReason || driverExitSubmitting) return
    setDriverExitSubmitting(true)
    setDriverExitResult(null)
    try {
      const res = await fetch('/api/driver/driver-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_code: summary.driver_code,
          exit_reason: driverExitReason.toLowerCase(),
          exit_comment: driverExitComment || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setDriverExitResult({ success: false, case: 'error', new_status: data.error })
      } else {
        setDriverExitResult({ success: true, case: data.case ?? 'A', new_status: data.new_status ?? 'driver_issue' })
        // Clear localStorage cache so driver doesn't re-enter this ride
        try { localStorage.removeItem('sln_active_ride') } catch {}
        // Reload after 2.5s to return to dashboard
        setTimeout(() => {
          setShowDriverExitModal(false)
          setDriverExitReason('')
          setDriverExitComment('')
          setDriverExitResult(null)
          loadData()
        }, 2500)
      }
    } catch {
      setDriverExitResult({ success: false, case: 'error', new_status: 'Network error. Try again.' })
    }
    setDriverExitSubmitting(false)
  }

  // ── BM11: Submit Release Ride ────────────────────────────────────────
  // Calls POST /api/driver/release-ride with booking_id, driver_id, reason.
  // On success: optimistically clears assigned_ride from local state.
  const submitReleaseRide = async () => {
    if (!summary?.assigned_ride || !summary?.driver_id || !releaseRideReason || releaseRideSubmitting) return
    setReleaseRideSubmitting(true)
    setReleaseRideResult(null)
    try {
      const res = await fetch('/api/driver/release-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: summary.assigned_ride.booking_id,
          driver_id: summary.driver_id,
          reason: releaseRideReason,
        }),
      })
      const data = await res.json()
      if (data.error) {
        // CASO C: live execution block — show incident report button
        if (data.blocked_reason === 'live_execution') {
          setReleaseRideResult({
            success: false,
            admin_alert: null,
            message: lang === 'es'
              ? 'El viaje ya está en ejecución. Usa “Reportar incidencia”.'
              : 'Ride is in live execution. Use “Report Incident” instead.',
          })
        } else {
          setReleaseRideResult({ success: false, admin_alert: null, message: data.error })
        }
      } else {
        setReleaseRideResult({
          success: true,
          admin_alert: data.admin_alert ?? null,
          message: data.message ?? 'Ride released.',
        })
        // BM11: Optimistic update — clear assigned_ride immediately
        setSummary(prev => prev ? { ...prev, assigned_ride: null } : prev)
        try { localStorage.removeItem('sln_active_ride') } catch {}
        // Reload after 2.5s to return to clean dashboard
        setTimeout(() => {
          setShowReleaseRideModal(false)
          setReleaseRideReason('')
          setReleaseRideResult(null)
          loadData()
        }, 2500)
      }
    } catch {
      setReleaseRideResult({ success: false, admin_alert: null, message: 'Network error. Try again.' })
    }
    setReleaseRideSubmitting(false)
  }

  const respondOffer = async (response: "accepted" | "declined") => {
    if (!summary?.active_offer || responding) return
    setResponding(true)
    // BUG C + D FIX: Optimistic local state update.
    // Instead of waiting for the next poll cycle (up to 3s), we update the local
    // summary state immediately after the API call succeeds.
    // - Accept: clear active_offer, move offer data to assigned_ride optimistically.
    // - Decline: clear active_offer, increment expired_offers_count.
    // The subsequent loadData() call will reconcile with the server state.
    const capturedOffer = summary.active_offer
    try {
      const res = await fetch("/api/dispatch/respond-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: capturedOffer.offer_id,
          driver_id: summary.driver_id,
          response,
        }),
      })
      const data = await res.json()
      if (response === "accepted" && !data.error) {
        // DEDUP GUARD: record accepted booking_id to block re-render of OfferScreen
        if (capturedOffer.booking_id) {
          lastAcceptedBookingIdRef.current = capturedOffer.booking_id
        }
        // BUG C FIX: Optimistic accept — clear active_offer and move ride to assigned_ride.
        // This makes the UI transition instant without waiting for the next poll.
        setSummary((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            active_offer: null,
            // Build a minimal assigned_ride from the offer data so the dashboard
            // immediately shows the ride in the Upcoming tab.
            assigned_ride: prev.assigned_ride ?? {
              booking_id: capturedOffer.booking_id,
              status: 'accepted',
              dispatch_status: 'assigned',
              pickup_location: capturedOffer.pickup_location,
              dropoff_location: capturedOffer.dropoff_location,
              pickup_datetime: capturedOffer.pickup_datetime,
              vehicle_type: capturedOffer.vehicle_type,
              total_price: capturedOffer.total_price,
              ride_mode: 'upcoming',
              client_name: capturedOffer.client_name ?? null,
              updated_at: new Date().toISOString(),
            } as any,
          }
        })
        setShowOfferBanner(false)
        setOfferAlertCount(0)
        setShowOfferAlertModal(false)
        setRespondResult("accepted")
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 1500)
      } else if (response === "declined") {
        // BUG D FIX: Optimistic decline — clear active_offer and increment expired_offers_count.
        setSummary((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            active_offer: null,
            expired_offers_count: (prev.expired_offers_count ?? 0) + 1,
          }
        })
        setShowOfferBanner(false)
        setOfferAlertCount(0)
        setShowOfferAlertModal(false)
        setRespondResult(response)
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2000)
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
          // BUG C FIX: Optimistic accept for respondOfferDirect path.
          // The assigned_ride is already in summary (it's the source of the offer_pending).
          // We just need to update its status to 'accepted' and clear the offer_pending mode.
          setSummary((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              assigned_ride: prev.assigned_ride ? {
                ...prev.assigned_ride,
                status: 'accepted',
                dispatch_status: 'assigned',
                ride_mode: 'upcoming',
              } : prev.assigned_ride,
            }
          })
          setShowOfferBanner(false)
          setOfferAlertCount(0)
          setShowOfferAlertModal(false)
          setRespondResult("accepted")
          // 2500ms delay: gives DB time to propagate dispatch_status='accepted'
          // before re-fetch. Prevents offer screen from re-appearing during transition.
          setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2500)
        } else if (res.status === 410) {
          // Offer expired and dispatched to network
          // BUG D FIX: Optimistic expire — clear assigned_ride offer_pending mode.
          setSummary((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              assigned_ride: null,
              expired_offers_count: (prev.expired_offers_count ?? 0) + 1,
            }
          })
          setShowOfferBanner(false)
          setOfferAlertCount(0)
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
        // BUG D FIX: Optimistic decline for respondOfferDirect path.
        // Clear the offer_pending assigned_ride and increment expired_offers_count.
        setSummary((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            assigned_ride: null,
            expired_offers_count: (prev.expired_offers_count ?? 0) + 1,
          }
        })
        setShowOfferBanner(false)
        setOfferAlertCount(0)
        setShowOfferAlertModal(false)
        setRespondResult(response)
        setTimeout(() => { setRespondResult(null); setResponding(false); loadData() }, 2000)
      }
    } catch { setResponding(false) }
  }

  const handleOfferExpired = useCallback(async () => {
    if (respondResult) return
    setRespondResult("expired")
    // BUG E FIX: Optimistic expiry — clear active_offer and increment expired_offers_count.
    // When the driver's countdown timer fires (reaches 0), we immediately update the local
    // state so the UI reflects the expiration without waiting for the next poll cycle.
    // The server call below confirms the expiry server-side.
    setSummary((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        active_offer: null,
        expired_offers_count: (prev.expired_offers_count ?? 0) + 1,
      }
    })
    setShowOfferBanner(false)
    setOfferAlertCount(0)
    setShowOfferAlertModal(false)
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
          // Clear localStorage cache immediately on completion — ride is done
          try {
            const cacheKey = `sln_active_ride_${driverCode}`
            localStorage.removeItem(cacheKey)
          } catch {}
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

  // ── Loading / Active Mode Re-entry ──────────────────────────────────────────
  // ACTIVE MODE: if we have a cached operational ride, show the ride console
  // immediately while the server fetch completes in the background.
  // This eliminates the loading spinner flash on screen re-activation.
  if (loading) {
    const OPERATIONAL_CACHED = cachedRide && ['accepted', 'assigned', 'en_route', 'arrived', 'in_trip'].includes(cachedRide.status)
    if (OPERATIONAL_CACHED && cachedRide) {
      // Show a minimal ride control console immediately from cached data
      const statusLabel: Record<string, string> = {
        accepted: lang === 'es' ? 'Asignado' : 'Assigned',
        assigned: lang === 'es' ? 'Asignado' : 'Assigned',
        en_route: lang === 'es' ? 'En camino' : 'En Route',
        arrived: lang === 'es' ? 'Llegaste' : 'Arrived',
        in_trip: lang === 'es' ? 'En viaje' : 'In Trip',
      }
      return (
        <div className="min-h-screen bg-black text-white flex flex-col"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          {/* Syncing indicator */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: GOLD }} />
              <span className="text-xs text-zinc-400">{lang === 'es' ? 'Sincronizando...' : 'Syncing...'}</span>
            </div>
            <div className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: GOLD + '20', color: GOLD }}>
              {statusLabel[cachedRide.status] ?? cachedRide.status.toUpperCase()}
            </div>
          </div>
          {/* Ride info from cache */}
          <div className="flex-1 px-5 py-6 space-y-5">
            <div className="text-center mb-2">
              <div className="text-2xl font-bold" style={{ color: GOLD }}>
                ${cachedRide.total_price.toFixed(0)}
              </div>
              <div className="text-sm text-zinc-400 mt-1">{cachedRide.client_name}</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{lang === 'es' ? 'Recogida' : 'Pickup'}</div>
                <div className="text-sm font-medium text-white">{cachedRide.pickup_location}</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{lang === 'es' ? 'Destino' : 'Dropoff'}</div>
                <div className="text-sm font-medium text-white">{cachedRide.dropoff_location}</div>
              </div>
            </div>
            {cachedRide.pickup_datetime && (
              <div className="text-center text-sm text-zinc-400">
                {new Date(cachedRide.pickup_datetime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            )}
          </div>
          {/* Loading indicator at bottom */}
          <div className="px-5 pb-8 text-center">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
            <div className="text-xs text-zinc-600">{lang === 'es' ? 'Cargando controles...' : 'Loading controls...'}</div>
          </div>
        </div>
      )
    }
    // Default loading spinner (no cached ride)
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

  // ── FALLBACK OFFER MODAL (Bloque Maestro 3) ──────────────────────────────
  // Full-screen urgent modal with 2-minute countdown
  if (showFallbackOfferModal && fallbackOfferData) {
    const fo = fallbackOfferData
    const pickupFormatted = fo.pickup_datetime
      ? new Date(fo.pickup_datetime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : lang === "es" ? "Hora por confirmar" : "Time TBD"
    const ORANGE = "#FF6B00"
    const RED = "#FF2D2D"
    const caseColors: Record<string, string> = { A: GOLD, B: ORANGE, C: RED }
    const caseColor = caseColors[fo.fallback_case_level] ?? ORANGE
    const caseLabel: Record<string, string> = {
      A: lang === "es" ? "REASIGNACIÓN URGENTE" : "URGENT REASSIGNMENT",
      B: lang === "es" ? "REASIGNACIÓN CRÍTICA" : "CRITICAL REASSIGNMENT",
      C: lang === "es" ? "FALLA CRÍTICA DE CONDUCTOR" : "CRITICAL DRIVER FAILURE",
    }
    const countdownMins = Math.floor(fallbackOfferCountdown / 60)
    const countdownSecs = fallbackOfferCountdown % 60
    const countdownStr = `${countdownMins}:${String(countdownSecs).padStart(2, "0")}`
    const isExpiring = fallbackOfferCountdown <= 30

    const handleFallbackAccept = async () => {
      if (!fo || fallbackOfferSubmitting) return
      setFallbackOfferSubmitting(true)
      try {
        const res = await fetch("/api/dispatch/respond-fallback-offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offer_id: fo.offer_id,
            driver_code: driverCode,
            response: "accepted",
          }),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          if (fallbackCountdownRef.current) clearInterval(fallbackCountdownRef.current)
          setShowFallbackOfferModal(false)
          setFallbackOfferData(null)
          prevFallbackOfferIdRef.current = null
          setNewRideAlertData({
            pickup: fo.pickup_location,
            dropoff: fo.dropoff_location,
            fare: fo.total_price,
            pickup_time: fo.pickup_datetime,
          })
          setShowNewRideAlert(true)
        } else {
          alert(data.error ?? (lang === "es" ? "Error al aceptar la oferta" : "Error accepting offer"))
        }
      } catch (err) {
        alert(lang === "es" ? "Error de red" : "Network error")
      } finally {
        setFallbackOfferSubmitting(false)
      }
    }

    const handleFallbackDecline = async () => {
      if (!fo || fallbackOfferSubmitting) return
      setFallbackOfferSubmitting(true)
      try {
        await fetch("/api/dispatch/respond-fallback-offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offer_id: fo.offer_id,
            driver_code: driverCode,
            response: "declined",
          }),
        })
      } catch {}
      if (fallbackCountdownRef.current) clearInterval(fallbackCountdownRef.current)
      setShowFallbackOfferModal(false)
      setFallbackOfferData(null)
      setFallbackOfferSubmitting(false)
    }

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-5 z-[110]"
        style={{ backgroundColor: "#000", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        {/* Urgency badge */}
        <div className="mb-3 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase animate-pulse"
          style={{ backgroundColor: caseColor + "25", color: caseColor, border: `1px solid ${caseColor}70` }}>
          {caseLabel[fo.fallback_case_level] ?? "FALLBACK OFFER"}
        </div>
        {/* Pulsing alert ring */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: caseColor + "30", transform: "scale(1.5)" }} />
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: caseColor + "15", border: `2px solid ${caseColor}` }}>
            <span className="text-3xl">🚨</span>
          </div>
        </div>
        {/* Title */}
        <div className="text-center mb-3">
          <div className="text-xl font-bold text-white mb-1">
            {lang === "es" ? "Oferta de Reasignación" : "Reassignment Offer"}
          </div>
          <div className="text-xs" style={{ color: caseColor + "cc" }}>
            {lang === "es" ? "El conductor original no pudo completar este servicio" : "The original driver could not complete this ride"}
          </div>
        </div>
        {/* Countdown timer */}
        <div className="mb-4 flex flex-col items-center">
          <div className={`text-4xl font-black tabular-nums ${isExpiring ? "animate-pulse" : ""}`}
            style={{ color: isExpiring ? RED : caseColor }}>
            {countdownStr}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {lang === "es" ? "tiempo restante" : "time remaining"}
          </div>
        </div>
        {/* Ride details card */}
        <div className="w-full max-w-sm rounded-2xl overflow-hidden mb-5"
          style={{ background: "#111", border: `1.5px solid ${caseColor}60`, boxShadow: `0 0 20px ${caseColor}30` }}>
          <div className="px-4 py-3 space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-0.5">↑</span>
              <div>
                <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: caseColor + "80" }}>{lang === "es" ? "Recogida" : "Pickup"}</div>
                <div className="text-sm font-medium text-white">{fo.pickup_location}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">↓</span>
              <div>
                <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: caseColor + "80" }}>{lang === "es" ? "Destino" : "Dropoff"}</div>
                <div className="text-sm font-medium text-white">{fo.dropoff_location}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${caseColor}20` }}>
              <div className="text-xs text-zinc-500">{lang === "es" ? "Fecha/Hora" : "Pickup Time"}</div>
              <div className="text-xs text-zinc-300">{pickupFormatted}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">{lang === "es" ? "Tarifa" : "Fare"}</div>
              <div className="text-xl font-bold" style={{ color: caseColor }}>${fo.total_price.toFixed(0)}</div>
            </div>
            {fo.passengers && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">{lang === "es" ? "Pasajeros" : "Passengers"}</div>
                <div className="text-xs text-zinc-300">{fo.passengers}</div>
              </div>
            )}
            {fo.flight_number && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">{lang === "es" ? "Vuelo" : "Flight"}</div>
                <div className="text-xs text-zinc-300">{fo.flight_number}</div>
              </div>
            )}
          </div>
        </div>
        {/* Accept CTA */}
        <button
          onClick={handleFallbackAccept}
          disabled={fallbackOfferSubmitting || fallbackOfferCountdown === 0}
          className="w-full max-w-sm py-4 rounded-2xl text-base font-black text-white transition-all active:scale-95 disabled:opacity-50 mb-3"
          style={{ backgroundColor: caseColor, fontSize: 16, letterSpacing: "0.04em" }}>
          {fallbackOfferSubmitting
            ? (lang === "es" ? "Aceptando..." : "Accepting...")
            : (lang === "es" ? "✓ Aceptar Servicio" : "✓ Accept Ride")}
        </button>
        {/* Decline */}
        <button
          onClick={handleFallbackDecline}
          disabled={fallbackOfferSubmitting}
          className="text-sm py-2 disabled:opacity-50"
          style={{ color: "#555" }}>
          {lang === "es" ? "No puedo aceptar" : "Cannot accept"}
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

     // ── BM11: RELEASE RIDE MODAL (Driver Post-Accept Release Flow) ──────────────
  // Pre-execution only: driver releases ride before en_route/arrived/in_trip.
  // Shows confirm modal with reason selection and HIGH_PRIORITY alert if pickup < 60min.
  if (showReleaseRideModal && summary?.assigned_ride) {
    const RELEASE_REASONS = [
      { key: 'cannot_make_it',      label: lang === 'es' ? 'No puedo llegar a tiempo'     : 'Cannot arrive on time',       icon: '⏰' },
      { key: 'accepted_by_mistake', label: lang === 'es' ? 'Acepté por error'              : 'Accepted by mistake',          icon: '📍' },
      { key: 'vehicle_issue',       label: lang === 'es' ? 'Problema con el vehículo'     : 'Vehicle issue',                icon: '🔧' },
      { key: 'personal_emergency',  label: lang === 'es' ? 'Emergencia personal'           : 'Personal emergency',           icon: '🚨' },
      { key: 'other',               label: lang === 'es' ? 'Otro motivo'                   : 'Other reason',                 icon: '💬' },
    ]
    const rideStatus = summary.assigned_ride.status ?? ''
    const isLiveExecution = ['en_route', 'arrived', 'in_trip'].includes(rideStatus)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 px-6 z-[300]"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-red-500/40 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="text-2xl">🚫</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-400">
                {lang === 'es' ? 'No puedo realizar este viaje' : 'Cannot Complete This Ride'}
              </div>
              <div className="text-xs text-zinc-500">
                {isLiveExecution
                  ? (lang === 'es' ? 'El viaje ya está en ejecución' : 'Ride is already in execution')
                  : (lang === 'es' ? 'El viaje será reasignado a otro conductor' : 'This ride will be reassigned to another driver')}
              </div>
            </div>
            <button onClick={() => { setShowReleaseRideModal(false); setReleaseRideReason(''); setReleaseRideResult(null) }}
              className="text-zinc-500 hover:text-zinc-300 text-lg p-1">✕</button>
          </div>
          {/* Result state */}
          {releaseRideResult ? (
            <div className="px-5 py-8 text-center">
              {releaseRideResult.success ? (
                <>
                  <div className="text-4xl mb-3">✅</div>
                  <div className="text-sm font-semibold text-green-400 mb-1">
                    {lang === 'es' ? 'Viaje liberado' : 'Ride released'}
                  </div>
                  {releaseRideResult.admin_alert === 'HIGH_PRIORITY' && (
                    <div className="text-xs text-red-400 mb-2">
                      {lang === 'es' ? '⚠️ Alerta de alta prioridad enviada al despacho' : '⚠️ High priority alert sent to dispatch'}
                    </div>
                  )}
                  <div className="text-xs text-zinc-400">
                    {lang === 'es' ? 'Volviendo al panel...' : 'Returning to dashboard...'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">❌</div>
                  <div className="text-sm font-semibold text-red-400 mb-2">{releaseRideResult.message}</div>
                  {/* CASO C: live execution — show incident report button */}
                  {releaseRideResult.message?.includes('ejecución') || releaseRideResult.message?.includes('execution') ? (
                    <button
                      onClick={() => { setShowReleaseRideModal(false); setReleaseRideReason(''); setReleaseRideResult(null); setShowDriverExitModal(true) }}
                      className="mt-2 w-full py-3 rounded-xl text-sm font-bold bg-orange-500 text-black">
                      {lang === 'es' ? '⚠️ Reportar incidencia' : '⚠️ Report Incident'}
                    </button>
                  ) : (
                    <button onClick={() => setReleaseRideResult(null)}
                      className="mt-3 text-xs text-zinc-400 underline">
                      {lang === 'es' ? 'Intentar de nuevo' : 'Try again'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : isLiveExecution ? (
            /* CASO C: ride is in live execution — block release, show incident report */
            <div className="px-5 py-6 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-sm font-semibold text-orange-400 mb-2">
                {lang === 'es' ? 'Liberación bloqueada' : 'Release blocked'}
              </div>
              <div className="text-xs text-zinc-400 mb-4">
                {lang === 'es'
                  ? 'El viaje ya está en ejecución. No puedes liberarlo en este estado. Usa “Reportar incidencia” para notificar al despacho.'
                  : 'The ride is already in live execution. Use “Report Incident” to notify dispatch.'}
              </div>
              <button
                onClick={() => { setShowReleaseRideModal(false); setReleaseRideReason(''); setShowDriverExitModal(true) }}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-orange-500 text-black">
                {lang === 'es' ? '⚠️ Reportar incidencia' : '⚠️ Report Incident'}
              </button>
              <button
                onClick={() => { setShowReleaseRideModal(false); setReleaseRideReason('') }}
                className="mt-2 w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm">
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          ) : (
            /* Pre-execution: show reason selection + confirm */
            <>
              <div className="px-5 py-3 space-y-2">
                {RELEASE_REASONS.map(r => (
                  <button key={r.key}
                    onClick={() => setReleaseRideReason(r.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      releaseRideReason === r.key
                        ? 'border-red-500/60 bg-red-500/10 text-red-300'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                    }`}>
                    <span className="text-lg">{r.icon}</span>
                    <span className="text-sm font-medium">{r.label}</span>
                    {releaseRideReason === r.key && <span className="ml-auto text-red-400">✓</span>}
                  </button>
                ))}
              </div>
              <div className="px-5 pb-5 space-y-2">
                <button
                  onClick={submitReleaseRide}
                  disabled={!releaseRideReason || releaseRideSubmitting}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    releaseRideReason && !releaseRideSubmitting
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}>
                  {releaseRideSubmitting
                    ? (lang === 'es' ? 'Liberando viaje...' : 'Releasing ride...')
                    : (lang === 'es' ? 'Confirmar — liberar viaje' : 'Confirm — release ride')}
                </button>
                <button
                  onClick={() => { setShowReleaseRideModal(false); setReleaseRideReason('') }}
                  className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm transition-all active:scale-95">
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

   // ── DRIVER EXIT MODAL (Bloque 1) ────────────────────────────
  if (showDriverExitModal && summary?.assigned_ride) {
    const EXIT_REASONS = [
      { key: "VEHICLE_BREAKDOWN",   label: lang === "es" ? "Falla mecánica del vehículo" : lang === "ht" ? "Machin kraze"              : "Vehicle Breakdown",        icon: "🔧" },
      { key: "PERSONAL_EMERGENCY",  label: lang === "es" ? "Emergencia personal"         : lang === "ht" ? "Ijans pèsonèl"             : "Personal Emergency",       icon: "🚨" },
      { key: "SAFETY_CONCERN",      label: lang === "es" ? "Preocupación de seguridad"   : lang === "ht" ? "Pwoblèm sekirite"           : "Safety Concern",           icon: "🛡️" },
      { key: "WRONG_ASSIGNMENT",    label: lang === "es" ? "Asignación incorrecta"       : lang === "ht" ? "Asiyasyon mal"             : "Wrong Assignment",         icon: "📍" },
      { key: "PASSENGER_ISSUE",     label: lang === "es" ? "Problema con el pasajero"    : lang === "ht" ? "Pwoblèm ak pasaje"          : "Passenger Issue",          icon: "👤" },
      { key: "DISPATCH_INSTRUCTION",label: lang === "es" ? "Instrucción de despacho"     : lang === "ht" ? "Enstriksyon dispach"        : "Dispatch Instruction",     icon: "📻" },
      { key: "OTHER",               label: lang === "es" ? "Otro motivo"                 : lang === "ht" ? "Lòt rezon"                  : "Other",                    icon: "💬" },
    ]
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 px-6 z-[300]"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-orange-500/40 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-orange-400">
                {lang === "es" ? "No puedo realizar este servicio" : lang === "ht" ? "Mwen pa ka fè sèvis sa" : "Cannot Complete This Ride"}
              </div>
              <div className="text-xs text-zinc-500">
                {lang === "es" ? "Selecciona el motivo para notificar al despacho" : lang === "ht" ? "Chwazi rezon pou notifye dispach" : "Select reason to notify dispatch"}
              </div>
            </div>
            <button onClick={() => setShowDriverExitModal(false)}
              className="text-zinc-500 hover:text-zinc-300 text-lg p-1">✕</button>
          </div>
          {/* Result state */}
          {driverExitResult ? (
            <div className="px-5 py-8 text-center">
              {driverExitResult.success ? (
                <>
                  <div className="text-4xl mb-3">✅</div>
                  <div className="text-sm font-semibold text-green-400 mb-1">
                    {lang === "es" ? "Despacho notificado" : "Dispatch notified"}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {lang === "es" ? "Volviendo al panel..." : "Returning to dashboard..."}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">❌</div>
                  <div className="text-sm font-semibold text-red-400 mb-1">
                    {driverExitResult.new_status}
                  </div>
                  <button onClick={() => setDriverExitResult(null)}
                    className="mt-3 text-xs text-zinc-400 underline">
                    {lang === "es" ? "Intentar de nuevo" : "Try again"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Reason selection */}
              <div className="px-5 py-3 space-y-2 max-h-64 overflow-y-auto">
                {EXIT_REASONS.map(r => (
                  <button key={r.key}
                    onClick={() => setDriverExitReason(r.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      driverExitReason === r.key
                        ? 'border-orange-500/60 bg-orange-500/10 text-orange-300'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                    }`}>
                    <span className="text-lg">{r.icon}</span>
                    <span className="text-sm font-medium">{r.label}</span>
                    {driverExitReason === r.key && <span className="ml-auto text-orange-400">✓</span>}
                  </button>
                ))}
              </div>
              {/* Optional comment */}
              <div className="px-5 pb-3">
                <textarea
                  value={driverExitComment}
                  onChange={e => setDriverExitComment(e.target.value)}
                  placeholder={lang === "es" ? "Comentario adicional (opcional)" : "Additional comment (optional)"}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 resize-none h-16 focus:outline-none focus:border-orange-500/60"
                />
              </div>
              {/* Actions */}
              <div className="px-5 pb-5 space-y-2">
                <button
                  onClick={submitDriverExit}
                  disabled={!driverExitReason || driverExitSubmitting}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    driverExitReason && !driverExitSubmitting
                      ? 'bg-orange-500 text-black hover:bg-orange-400'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}>
                  {driverExitSubmitting
                    ? (lang === "es" ? "Enviando..." : "Sending...")
                    : (lang === "es" ? "Notificar al despacho" : lang === "ht" ? "Notifye dispach" : "Notify Dispatch")}
                </button>
                <button
                  onClick={() => { setShowDriverExitModal(false); setDriverExitReason(''); setDriverExitComment('') }}
                  className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm transition-all active:scale-95">
                  {lang === "es" ? "Cancelar" : "Cancel"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── CANCEL REASON MODAL ────────────────────────────────────────────
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
        {/* ── ALERT LAYER: Persistent red banner above OfferScreen ────────────────── */}
        {/* z-[500] floats above OfferScreen (z-auto) — always visible, cannot be scrolled away */}
        {/* This banner is redundant with OfferScreen's own banner but provides belt-and-suspenders */}
        {/* coverage for any edge case where OfferScreen is partially obscured */}
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
        onDriverExit={() => {
          setDriverExitReason('')
          setDriverExitComment('')
          setDriverExitResult(null)
          setShowDriverExitModal(true)
        }}
        onReleaseRide={() => {
          setReleaseRideReason('')
          setReleaseRideResult(null)
          setShowReleaseRideModal(true)
        }}
      />
      )
    }
  }

  // ════════════════════════════════════════════════════════════
  // PRIORITY 3: DASHBOARD (with tabs)
  // ════════════════════════════════════════════════════════════
  // BUG B FIX: upcomingCount must include the assigned_ride if it's in 'upcoming' mode.
  // Previously, upcomingCount only counted summary.upcoming_rides[] (future rides >120min).
  // If the assigned_ride was accepted/assigned and in 'upcoming' ride_mode, it was NOT
  // counted in the badge, causing the Upcoming tab to show 0 even though a ride existed.
  const assignedRideIsUpcoming = summary.assigned_ride?.ride_mode === 'upcoming' ||
    (summary.assigned_ride?.status === 'accepted' && !['en_route','arrived','in_trip'].includes(summary.assigned_ride?.status ?? ''))
  const upcomingCount = (summary.upcoming_rides?.length ?? 0) + (assignedRideIsUpcoming ? 1 : 0)
  const completedCount = summary.completed_rides?.length ?? 0
  // BUG B FIX: activeOfferCount is the reactive badge for the Overview tab.
  // It recalculates on every render from summary.active_offer (set by loadData).
  // This ensures the badge updates immediately after accept/reject/expire without
  // waiting for the next poll cycle.
  const activeOfferCount = summary.active_offer ? 1 : 0

  return (
    <div className="min-h-screen bg-black text-white pb-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>

      {/* ── ALERT LAYER: Persistent top banner ────────────────────────────────────── */}
      {/* Visible until driver accepts or declines the offer */}
      {showOfferBanner && (
        <div
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4"
          style={{
            backgroundColor: "#dc2626",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: "10px",
            boxShadow: "0 6px 32px #dc262699",
            animation: "bannerPulse 1s ease-in-out infinite",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white text-xl">🔔</span>
            <div>
              <div className="text-white font-black text-sm tracking-widest uppercase">
                {offerAlertCount > 1
                  ? (lang === "es" ? `NUEVA SOLICITUD (${offerAlertCount})` : lang === "ht" ? `NOUVO SÈVIS (${offerAlertCount})` : `NEW RIDE REQUEST (${offerAlertCount})`)
                  : (lang === "es" ? "NUEVA SOLICITUD" : lang === "ht" ? "NOUVO SÈVIS" : "NEW RIDE REQUEST")}
              </div>
              <div className="text-red-200 text-xs mt-0.5">
                {lang === "es" ? "Toca para ver la oferta" : lang === "ht" ? "Klike pou wè òf la" : "Tap to view offer"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowOfferAlertModal(true)}
            className="text-black text-xs font-black bg-white rounded-lg px-4 py-2 active:scale-95 transition-all uppercase tracking-wide"
          >
            {lang === "es" ? "VER" : lang === "ht" ? "WÈ" : "VIEW"}
          </button>
        </div>
      )}

      {/* ── ALERT LAYER: Foreground modal (auto-opens on new offer) ─────────────────── */}
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
              {/* Live countdown in the modal */}
              {summary.active_offer.expires_at && (() => {
                const expiresAt = new Date(summary.active_offer.expires_at).getTime()
                const now = Date.now()
                const secsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000))
                const mm = String(Math.floor(secsLeft / 60)).padStart(2, "0")
                const ss = String(secsLeft % 60).padStart(2, "0")
                const isUrgent = secsLeft <= 30
                return (
                  <div
                    className="flex items-center justify-between pt-2"
                    style={{ borderTop: "1px solid #dc262630" }}
                  >
                    <span className="text-xs uppercase tracking-widest"
                      style={{ color: isUrgent ? "#ef4444" : "#71717a" }}>
                      {lang === "es" ? "Aceptar en" : lang === "ht" ? "Aksepte nan" : "Accept within"}
                    </span>
                    <span className="font-mono font-black text-xl"
                      style={{
                        color: isUrgent ? "#ef4444" : "#f59e0b",
                        animation: isUrgent ? "pulse 0.5s infinite" : "none",
                      }}>
                      {mm}:{ss}
                    </span>
                  </div>
                )
              })()}
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
          <div className="flex flex-col items-end gap-1.5">
            <div className="text-sm font-medium" style={{ color: GOLD }}>{summary.driver_name}</div>
            {/* ── Availability Toggle (Uber-style) ────────────────────────────────────────── */}
            {/* States: available (green), offline (red), busy (amber — system-controlled) */}
            <button
              onClick={toggleAvailability}
              disabled={availabilityToggling || summary.availability_status === 'busy'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor:
                  summary.availability_status === 'available' ? '#14532d' :
                  summary.availability_status === 'busy'      ? '#78350f' :
                  '#1c1c1e',
                border: '1px solid',
                borderColor:
                  summary.availability_status === 'available' ? '#16a34a' :
                  summary.availability_status === 'busy'      ? '#d97706' :
                  '#3f3f46',
                opacity: availabilityToggling ? 0.6 : 1,
                cursor: summary.availability_status === 'busy' ? 'not-allowed' : 'pointer',
              }}
              title={summary.availability_status === 'busy' ? 'Busy — complete your ride first' : 'Toggle availability'}
            >
              {/* Toggle pill */}
              <div className="relative w-8 h-4 rounded-full transition-all"
                style={{
                  backgroundColor:
                    summary.availability_status === 'available' ? '#22c55e' :
                    summary.availability_status === 'busy'      ? '#f59e0b' :
                    '#52525b',
                }}>
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                  style={{
                    left: summary.availability_status === 'available' || summary.availability_status === 'busy' ? '17px' : '2px',
                  }} />
              </div>
              {/* Label */}
              <span className="text-xs font-semibold tracking-wide"
                style={{
                  color:
                    summary.availability_status === 'available' ? '#4ade80' :
                    summary.availability_status === 'busy'      ? '#fbbf24' :
                    '#71717a',
                }}>
                {availabilityToggling ? '...' :
                  summary.availability_status === 'available' ? (lang === 'es' ? 'Disponible' : 'Available') :
                  summary.availability_status === 'busy'      ? (lang === 'es' ? 'En Viaje' : 'On Ride') :
                  (lang === 'es' ? 'Inactivo' : 'Offline')}
              </span>
            </button>
            {/* Error toast */}
            {availabilityError && (
              <div className="text-xs text-red-400 mt-0.5 max-w-32 text-right">{availabilityError}</div>
            )}
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
          // BUG B FIX: Show activeOfferCount badge on Overview tab.
          // When a new offer arrives, the Overview tab now shows a badge (1) so the driver
          // knows there's a pending offer even if they're on a different tab.
          // The badge clears immediately when the offer is accepted/declined/expired
          // because activeOfferCount is derived from summary.active_offer (reactive).
          { key: "overview",  label: "Overview",  badge: activeOfferCount > 0 ? activeOfferCount : null },
          { key: "upcoming",  label: lang === "es" ? "Próximos" : "Upcoming",  badge: upcomingCount > 0 ? upcomingCount : null },
          { key: "completed", label: lang === "es" ? "Completados" : "Completed", badge: null },
          // BUG C FIX: Show expired_offers_count in the Cancelled tab badge.
          // expired_offers are rendered inside the cancelled tab but the badge only
          // counted cancelled_rides, so drivers had no visual cue that expired offers existed.
          { key: "cancelled", label: lang === "es" ? "Cancelados" : "Cancelled",
            badge: ((summary?.cancelled_rides?.length ?? 0) + (summary?.expired_offers_count ?? 0)) > 0
              ? (summary?.cancelled_rides?.length ?? 0) + (summary?.expired_offers_count ?? 0)
              : null },
          { key: "earnings",  label: lang === "es" ? "Ganancias" : "Earnings",  badge: null },
        ] as { key: "overview" | "upcoming" | "completed" | "cancelled" | "earnings"; label: string; badge: number | null }[]).map((tab) => (
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

          {/* BM5: Driver Reliability Score Card */}
          {(summary.reliability_score != null || summary.driver_tier != null) && (
            <div className="px-4 mt-5">
              <div className="text-xs text-zinc-500 uppercase tracking-widest px-1 mb-2">
                {lang === "es" ? "Mi Puntaje de Confiabilidad" : lang === "ht" ? "Nòt Fyabilite Mwen" : "My Reliability Score"}
              </div>
              <div className="rounded-xl border bg-zinc-900 overflow-hidden" style={{ borderColor: summary.reliability_score != null && summary.reliability_score >= 85 ? "#c9a84c" : summary.reliability_score != null && summary.reliability_score >= 70 ? "#22c55e" : summary.reliability_score != null && summary.reliability_score >= 55 ? "#38bdf8" : "#3f3f46" }}>
                {/* Header row */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-800">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">DRS · Sottovento Reliability Engine</div>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold" style={{ color: summary.reliability_score != null && summary.reliability_score >= 85 ? "#c9a84c" : summary.reliability_score != null && summary.reliability_score >= 70 ? "#4ade80" : summary.reliability_score != null && summary.reliability_score >= 55 ? "#38bdf8" : summary.reliability_score != null && summary.reliability_score >= 40 ? "#f59e0b" : "#f87171" }}>
                        {summary.reliability_score ?? "—"}
                      </span>
                      <span className="text-zinc-500 text-sm">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {summary.driver_tier && (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{
                        background: summary.driver_tier === "ELITE" ? "#1a0a2e" : summary.driver_tier === "PREMIUM" ? "#052e16" : summary.driver_tier === "STANDARD" ? "#0c2340" : summary.driver_tier === "RESTRICTED" ? "#3b0000" : "#3b2200",
                        color: summary.driver_tier === "ELITE" ? "#c9a84c" : summary.driver_tier === "PREMIUM" ? "#4ade80" : summary.driver_tier === "STANDARD" ? "#38bdf8" : summary.driver_tier === "RESTRICTED" ? "#f87171" : "#f59e0b"
                      }}>{summary.driver_tier}</span>
                    )}
                    {summary.legal_affiliation_type && (
                      <div className="text-xs mt-1" style={{ color: summary.legal_affiliation_type === "SOTTOVENTO_LEGAL_FLEET" ? "#c9a84c" : summary.legal_affiliation_type === "PARTNER_LEGAL_FLEET" ? "#38bdf8" : "#6b7280" }}>
                        {summary.legal_affiliation_type === "SOTTOVENTO_LEGAL_FLEET" ? "SLN LEGAL FLEET" : summary.legal_affiliation_type === "PARTNER_LEGAL_FLEET" ? "PARTNER LEGAL" : "GENERAL NETWORK"}
                      </div>
                    )}
                  </div>
                </div>
                {/* Metrics grid */}
                <div className="grid grid-cols-2 divide-x divide-y divide-zinc-800">
                  {[
                    { label: lang === "es" ? "Aceptación" : "Acceptance", value: summary.acceptance_rate, good: 0.85, warn: 0.70, format: "pct" },
                    { label: lang === "es" ? "Completación" : "Completion", value: summary.completion_rate, good: 0.95, warn: 0.85, format: "pct" },
                    { label: lang === "es" ? "Tasa de Cancelación" : "Cancel Rate", value: summary.driver_cancel_rate, good: 0.05, warn: 0.10, format: "pct", inverse: true },
                    { label: lang === "es" ? "Puntualidad" : "On-Time", value: summary.on_time_score, good: 0.90, warn: 0.75, format: "pct" },
                    { label: lang === "es" ? "Resp. Despacho" : "Dispatch Resp.", value: summary.dispatch_response_score, good: 0.90, warn: 0.75, format: "pct" },
                    { label: lang === "es" ? "Resp. Fallback" : "Fallback Resp.", value: summary.fallback_response_rate, good: 0.80, warn: 0.60, format: "pct" },
                  ].map((m) => {
                    const v = m.value
                    const color = v == null ? "#6b7280" : m.inverse ? (v <= m.good ? "#4ade80" : v <= m.warn ? "#f59e0b" : "#f87171") : (v >= m.good ? "#4ade80" : v >= m.warn ? "#f59e0b" : "#f87171")
                    return (
                      <div key={m.label} className="px-4 py-3">
                        <div className="text-xs text-zinc-500 mb-1">{m.label}</div>
                        <div className="text-base font-semibold" style={{ color }}>
                          {v != null ? `${Math.round(v * 100)}%` : "—"}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
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

          {/* ── BM16: FUTURE SCHEDULE SECTION ──────────────────────────── */}
          {/* Shows rides accepted/assigned with pickup_at > 120min, up to 72h ahead */}
          {/* Separate from upcoming_rides (operational) — read-only, grouped by date */}
          {(summary?.driver as any)?.future_bookings?.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>📆 {lang === "es" ? "Agenda Futura" : "Future Schedule"}</div>
                <div className="flex-1 h-px bg-zinc-800" />
                <div className="text-xs text-zinc-500">{lang === "es" ? "Hasta 72h" : "Up to 72h"}</div>
              </div>
              {/* Group by date */}
              {(() => {
                const futureRides = (summary?.driver as any)?.future_bookings ?? [];
                const grouped: Record<string, any[]> = {};
                for (const ride of futureRides) {
                  const dateKey = ride.pickup_datetime
                    ? new Date(ride.pickup_datetime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                    : "TBD";
                  if (!grouped[dateKey]) grouped[dateKey] = [];
                  grouped[dateKey].push(ride);
                }
                return Object.entries(grouped).map(([dateLabel, rides]) => (
                  <div key={dateLabel} className="mb-4">
                    <div className="text-xs text-zinc-500 font-medium mb-2 px-1">{dateLabel}</div>
                    <div className="space-y-2">
                      {rides.map((ride: any) => {
                        const pickupTime = ride.pickup_datetime
                          ? new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
                        const hoursUntil = ride.hours_until_pickup ?? Math.round((ride.minutes_until_pickup ?? 0) / 60);
                        const hasConflict = ride.has_schedule_conflict === true;
                        return (
                          <div key={ride.booking_id}
                            className="rounded-xl border bg-zinc-900 overflow-hidden"
                            style={{ borderColor: hasConflict ? "#f87171" : "#27272a" }}>
                            {hasConflict && (
                              <div className="px-3 py-1.5 text-xs font-semibold flex items-center gap-2"
                                style={{ backgroundColor: "#f8717115", color: "#f87171" }}>
                                ⚠️ {lang === "es" ? "Posible conflicto de horario" : "Possible schedule conflict"}
                              </div>
                            )}
                            <div className="px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">{ride.pickup_location}</div>
                                  <div className="text-xs text-zinc-500 mt-0.5">→ {ride.dropoff_location}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-base font-bold" style={{ color: GOLD }}>${ride.total_price?.toFixed(0) ?? '0'}</div>
                                  <div className="text-xs text-zinc-500 mt-0.5">{pickupTime}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{ride.vehicle_type ?? 'Sedan'}</span>
                                {ride.passengers && (
                                  <span className="text-xs text-zinc-500">👥 {ride.passengers}</span>
                                )}
                                <span className="text-xs ml-auto text-zinc-500">
                                  {hoursUntil > 0 ? `${hoursUntil}h` : ''} {lang === "es" ? "restantes" : "away"}
                                </span>
                              </div>
                              {ride.flight_number && (
                                <div className="mt-1.5 text-xs text-zinc-500">
                                  ✈️ {ride.flight_number}
                                </div>
                              )}
                              <div className="mt-1.5 text-xs text-zinc-700 font-mono">{ride.booking_id?.slice(0, 8).toUpperCase()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
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

      {/* ── TAB: CANCELLED ── */}
      {dashTab === "cancelled" && (
        <div className="px-4 mt-4 pb-8">
          {/* ── Cancel Stats Summary ── */}
          {summary.cancelled_rides && summary.cancelled_rides.length > 0 && (() => {
            const rides = summary.cancelled_rides
            const byClient = rides.filter(r => r.cancelled_by_type === "client").length
            const byDriver = rides.filter(r => r.cancelled_by_type === "driver").length
            const byAdmin  = rides.filter(r => r.cancelled_by_type === "admin").length
            const bySystem = rides.filter(r => !["client","driver","admin"].includes(r.cancelled_by_type ?? "")).length
            const totalFee = rides.reduce((s, r) => s + (r.cancellation_fee ?? 0), 0)
            const affectsPayout = rides.filter(r => r.affects_payout).length
            return (
              <div className="mb-5">
                {/* Count + attribution grid */}
                <div className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-2">
                  {lang === "es" ? "Resumen de cancelaciones" : "Cancellation Summary"}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">{rides.length}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{lang === "es" ? "Total cancelados" : "Total Cancelled"}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: totalFee > 0 ? "#4ade80" : "#6b7280" }}>
                      ${totalFee.toFixed(0)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{lang === "es" ? "Fees recibidos" : "Cancellation Fees"}</div>
                  </div>
                </div>
                {/* Attribution breakdown */}
                <div className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-2">
                  {lang === "es" ? "Atribución de cancelación" : "Cancel Attribution"}
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    { label: lang === "es" ? "Cliente" : "Client", value: byClient, color: "#fbbf24" },
                    { label: lang === "es" ? "Conductor" : "Driver", value: byDriver, color: "#f87171" },
                    { label: "Admin", value: byAdmin, color: "#a78bfa" },
                    { label: lang === "es" ? "Sistema" : "System", value: bySystem, color: "#6b7280" },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-center">
                      <div className="text-lg font-bold" style={{ color: item.value > 0 ? item.color : "#444" }}>{item.value}</div>
                      <div className="text-xs text-zinc-600 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
                {/* Payout impact */}
                {affectsPayout > 0 && (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 mb-3">
                    <div className="text-xs font-semibold text-red-400 mb-0.5">
                      ⚠️ {lang === "es" ? "Impacto en pago" : "Payout Impact"}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {affectsPayout} {lang === "es"
                        ? `cancelación${affectsPayout > 1 ? "es" : ""} afecta${affectsPayout > 1 ? "n" : ""} tu pago`
                        : `cancellation${affectsPayout > 1 ? "s" : ""} affect${affectsPayout > 1 ? "" : "s"} your payout`}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Ride History ── */}
          <div className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-2">
            {lang === "es" ? "Historial de cancelaciones" : "Cancellation History"}
          </div>
          {!summary.cancelled_rides || summary.cancelled_rides.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-zinc-500 text-sm">
                {lang === "es" ? "No hay viajes cancelados" : "No cancelled rides"}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.cancelled_rides.map((ride) => {
                const cancelDate = ride.cancelled_at
                  ? new Date(ride.cancelled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""
                const cancelTime = ride.cancelled_at
                  ? new Date(ride.cancelled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""
                const byType = ride.cancelled_by_type ?? "system"
                const byTypeColor: Record<string, string> = {
                  client: "#fbbf24", driver: "#f87171", admin: "#a78bfa", system: "#6b7280"
                }
                const byTypeLabel: Record<string, string> = {
                  client: lang === "es" ? "Por Cliente" : "By Client",
                  driver: lang === "es" ? "Por Conductor" : "By Driver",
                  admin: lang === "es" ? "Por Admin" : "By Admin",
                  system: lang === "es" ? "Sistema" : "System",
                }
                const stageLabel: Record<string, string> = {
                  before_assignment: lang === "es" ? "Antes de asignar" : "Before Assignment",
                  assigned: lang === "es" ? "Asignado" : "Assigned",
                  in_progress: lang === "es" ? "En progreso" : "In Progress",
                  post_driver_issue: lang === "es" ? "Post incidencia" : "Post Driver Issue",
                }
                return (
                  <div key={ride.booking_id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{ride.pickup_location}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">→ {ride.dropoff_location}</div>
                          {ride.client_name && (
                            <div className="text-xs text-zinc-600 mt-0.5">👤 {ride.client_name}</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-zinc-500">${ride.total_price.toFixed(0)}</div>
                          <div className="text-xs mt-0.5" style={{ color: byTypeColor[byType] ?? "#6b7280" }}>
                            {byTypeLabel[byType] ?? byType}
                          </div>
                          {(ride.cancellation_fee ?? 0) > 0 && (
                            <div className="text-xs mt-0.5 text-green-400">+${(ride.cancellation_fee ?? 0).toFixed(0)} fee</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {cancelDate && <span className="text-xs text-zinc-400">{cancelDate}</span>}
                        {cancelTime && <span className="text-xs text-zinc-500">{cancelTime}</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{ride.vehicle_type}</span>
                        {ride.cancel_stage && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500">
                            {stageLabel[ride.cancel_stage] ?? ride.cancel_stage}
                          </span>
                        )}
                        {ride.affects_payout && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/40 text-red-400">⚠️ payout</span>
                        )}
                        <span className="text-xs text-zinc-600 font-mono ml-auto">{ride.booking_id.slice(0, 8)}…</span>
                      </div>
                      {ride.cancel_reason && (
                        <div className="mt-2 text-xs text-zinc-500 italic">
                          "{ride.cancel_reason}"
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* ── Expired Offers History ── */}
          {summary.expired_offers && summary.expired_offers.length > 0 && (
            <div className="mt-6">
              <div className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-2">
                {lang === "es" ? "Ofertas expiradas / rechazadas" : "Expired / Declined Offers"}
              </div>
              <div className="space-y-2">
                {summary.expired_offers.map((offer, idx) => {
                  const offerDate = offer.sent_at
                    ? new Date(offer.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""
                  const offerTime = offer.sent_at
                    ? new Date(offer.sent_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""
                  const isExpired = offer.offer_status === "offer_expired"
                  return (
                    <div key={`${offer.booking_id}-${idx}`}
                      className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 overflow-hidden">
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-300 truncate">{offer.pickup_location}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">→ {offer.dropoff_location}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-zinc-600">${offer.total_price.toFixed(0)}</div>
                            <div className={`text-xs mt-0.5 ${isExpired ? "text-orange-500" : "text-red-400"}`}>
                              {isExpired
                                ? (lang === "es" ? "Expirada" : "Expired")
                                : (lang === "es" ? "Rechazada" : "Declined")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {offerDate && <span className="text-xs text-zinc-500">{offerDate}</span>}
                          {offerTime && <span className="text-xs text-zinc-600">{offerTime}</span>}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{offer.vehicle_type}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-600">
                            {lang === "es" ? "Ronda" : "Round"} {offer.round_number}
                          </span>
                          <span className="text-xs text-zinc-700 font-mono ml-auto">{offer.booking_id.slice(0, 8)}…</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
    // Repeat every 5 seconds while offer is active (dispatcher-grade alert)
    alertIntervalRef.current = setInterval(() => {
      playOfferBeep()
      // Vibrate on repeat too — urgent double-pulse pattern
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]) } catch {}
    }, 5000)
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

      {/* FIX F — URGENT ALERT BANNER: enhanced with round badge and reassignment indicator */}
      {!expired && !responding && (
        <div
          className="flex items-center justify-center gap-3 px-4 flex-shrink-0"
          style={{
            backgroundColor: flashOn
              ? (offer.offer_round && offer.offer_round > 1 ? "#7c3aed" : "#dc2626")
              : (offer.offer_round && offer.offer_round > 1 ? "#4c1d95" : "#7f1d1d"),
            transition: "background-color 0.25s ease",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: "10px",
            boxShadow: flashOn
              ? (offer.offer_round && offer.offer_round > 1 ? "0 4px 32px #7c3aed99" : "0 4px 32px #dc262699")
              : "0 2px 8px #00000040",
          }}>
          <span className="text-xl animate-bounce">
            {offer.offer_round && offer.offer_round > 1 ? "⚡" : "🔔"}
          </span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-black tracking-widest uppercase"
              style={{ color: "#fff", fontSize: 15, letterSpacing: "0.12em" }}>
              {offer.offer_round && offer.offer_round > 1
                ? (lang === "es" ? "REASIGNACIÓN URGENTE" : lang === "ht" ? "REASIÈNMAN IJANS" : "URGENT REASSIGNMENT")
                : t.newRideOffer}
            </span>
            {offer.offer_round && offer.offer_round > 1 && (
              <span className="text-xs font-semibold" style={{ color: "#c4b5fd", letterSpacing: "0.08em" }}>
                {lang === "es" ? `Ronda ${offer.offer_round} de despacho` : `Dispatch Round ${offer.offer_round}`}
              </span>
            )}
          </div>
          <span className="text-xl animate-bounce">
            {offer.offer_round && offer.offer_round > 1 ? "⚡" : "🔔"}
          </span>
        </div>
      )}
      {/* Expired banner */}
      {expired && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 flex-shrink-0"
          style={{ backgroundColor: "#27272a", paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", paddingBottom: "10px" }}>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            {lang === "es" ? "Oferta Expirada" : lang === "ht" ? "Òf Ekspire" : "Offer Expired"}
          </span>
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
            <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ backgroundColor: "#4c1d95", color: "#c4b5fd", border: "1px solid #7c3aed" }}>
              {t.round} {offer.offer_round} ⚡
            </span>
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
              {hasExpiry && !expired ? t.timeRemaining : (expired ? (lang === "es" ? "Expirado" : lang === "ht" ? "Ekspire" : "Expired") : t.timeRemaining)}
            </span>
            <span
              className="font-mono font-black tabular-nums"
              style={{
                color: timerColor,
                fontSize: hasExpiry && secondsLeft <= 20 ? 32 : 26,
                // Pulse when under 20s
                animation: hasExpiry && secondsLeft <= 20 && !expired ? "pulse 0.5s infinite" : "none",
                textShadow: hasExpiry && secondsLeft <= 30 && !expired ? `0 0 12px ${timerColor}80` : "none",
              }}>
              {hasExpiry ? `${mm}:${ss}` : (lang === "es" ? "En espera" : lang === "ht" ? "Ap tann" : "Awaiting")}
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
  ride, driverName, driverId, lang, onLang, onTransition, transitioning, onSendSMS, smsSending, smsSent, gpsCoords, gpsError, onReport, reporting, reportResult, rideUpdatedByDispatch, overdueSeconds, t, onDriverExit, onReleaseRide,
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
  onDriverExit: () => void
  onReleaseRide: () => void
}) {
  const elapsed = useElapsed(ride.trip_started_at ?? null)
  const theme = STATE_THEME[ride.status] ?? STATE_THEME.assigned
  const isRepeat = (ride.bookings_count ?? 0) > 1
  // Active Mode: detail section is collapsed by default on mobile for console-first UX
  // Driver sees the action button immediately without scrolling
  const [showDetails, setShowDetails] = useState(false)

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
                  {/* DELAY FIX: >4h overdue = show coherent label, not absurd number */}
                  {overdueSeconds > 4 * 3600
                    ? (lang === "es" ? "Hora de recogida vencida" : lang === "ht" ? "Lè ranmase a pase" : "Pickup window expired")
                    : overdueSeconds >= 3600
                    ? `${lang === "es" ? "Retraso" : "Overdue"} ${Math.floor(overdueSeconds/3600)}h ${Math.floor((overdueSeconds%3600)/60)}m`
                    : overdueSeconds >= 60
                    ? `${lang === "es" ? "Retraso" : "Overdue"} ${Math.floor(overdueSeconds/60)}m ${overdueSeconds%60}s`
                    : `${lang === "es" ? "Retraso" : "Overdue"} ${overdueSeconds}s`}
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

          {/* ─ Details toggle button ─ */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full px-5 py-2.5 border-t flex items-center justify-between text-xs font-medium transition-all active:opacity-70"
            style={{ borderColor: theme.primary + "20", color: theme.primary }}>
            <span>{showDetails ? (lang === 'es' ? '▲ Ocultar detalles' : '▲ Hide details') : (lang === 'es' ? '▼ Ver detalles del pasajero' : '▼ Passenger & trip details')}</span>
            <span className="text-zinc-600">{ride.client_name ?? ''}</span>
          </button>

          {/* ─ Section: Passenger info (collapsible) ─ */}
          {showDetails && (
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
          )}

          {/* ─ Section: Service type + Flight info (airport rides) ─ */}
          {showDetails && (ride.service_type || ride.flight_number) && (
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
          {showDetails && ride.notes && (
            <div className="px-5 py-3 border-t" style={{ borderColor: theme.primary + "20" }}>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.notes}</div>
              <div className="text-sm text-zinc-300 leading-relaxed">{ride.notes}</div>
            </div>
          )}

          {/* ─ Elapsed time (in_trip only) ─ — always visible */}
          {cfg.showElapsed && (
            <div className="px-5 py-3 border-t flex items-center justify-between"
              style={{ borderColor: theme.primary + "30", backgroundColor: theme.primary + "08" }}>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">{t.elapsedTime}</div>
              <div className="text-xl font-mono font-bold tabular-nums" style={{ color: theme.primary }}>{elapsed}</div>
            </div>
          )}

          {/* ─ Booking ID (collapsible) ─ */}
          {showDetails && (
          <div className="px-5 py-2 border-t border-zinc-800/50">
            <div className="text-xs text-zinc-600 font-mono truncate">
              {t.bookingId}: {ride.booking_id.slice(0, 8)}...
            </div>
          </div>
          )}
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
            )

            {/* ── BM11: Release Ride Button (pre-execution only) ─────────────────────── */}
            {/* Visible ONLY for accepted/assigned (pre-execution) — clean release flow */}
            {(ride.status === "accepted" || ride.status === "assigned") && (
              <button
                onClick={onReleaseRide}
                disabled={transitioning}
                className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                style={{ border: "1px solid #ef4444", color: "#ef4444", backgroundColor: "transparent" }}>
                {lang === "es" ? "🚫 No puedo realizar este viaje" : lang === "ht" ? "🚫 Mwen pa ka fè vwayaj sa" : "🚫 Cannot Take This Ride"}
              </button>
            )}

            {/* ── SECONDARY: Report Incident / Cannot Complete (Bloque 1) ────────────── */}
            {/* Visible for en_route / arrived states (live execution) — incident report flow */}
            {(ride.status === "en_route" || ride.status === "arrived") && (
              <button
                onClick={onDriverExit}
                disabled={transitioning}
                className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
                style={{ border: "1px solid #f97316", color: "#f97316", backgroundColor: "transparent" }}>
                {lang === "es" ? "⚠️ Reportar incidencia" : lang === "ht" ? "⚠️ Rapò ensidan" : "⚠️ Report Incident"}
              </button>
            )}
            {/* ── AT-RISK BANNER (Bloque 2: Post-Accept Guardrail) ──────────────────── */}
            {/* Shown when the guardrail has auto-escalated this ride */}
            {(ride.is_at_risk || ride.at_risk_flagged_at) && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: "#7c2d1230", border: "1px solid #f9731660", animation: "bannerPulse 1.5s ease-in-out infinite" }}>
                <span className="text-xl flex-shrink-0">🚨</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-orange-400">
                    {lang === "es" ? "Alerta de Despacho" : lang === "ht" ? "Alèt Dispach" : "Dispatch Alert"}
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    {ride.auto_escalation_case === 'C'
                      ? (lang === "es"
                          ? "Reasignación crítica en curso. Confirma tu estado inmediatamente."
                          : lang === "ht"
                          ? "Reasiyasyon kritik an kous. Konfime eta ou imedyatman."
                          : "Critical reassignment in progress. Confirm your status immediately.")
                      : ride.auto_escalation_case === 'B'
                      ? (lang === "es"
                          ? "Reasignación urgente iniciada. El despacho está monitoreando."
                          : lang === "ht"
                          ? "Reasiyasyon ijans kòmanse. Dispach ap surveye."
                          : "Urgent reassignment initiated. Dispatch is monitoring.")
                      : (lang === "es"
                          ? "El despacho está monitoreando este servicio. Confirma tu estado."
                          : lang === "ht"
                          ? "Dispach ap surveye sèvis sa. Konfime eta ou."
                          : "Dispatch is monitoring this ride. Please confirm your status.")}
                  </div>
                  {ride.risk_source === 'post_accept_guardrail' && (
                    <div className="text-xs text-orange-500/70 mt-1 font-mono">
                      {lang === "es" ? "Guardrail automático activado" : lang === "ht" ? "Gad otomatik aktive" : "Auto-guardrail triggered"}
                      {ride.auto_escalation_case ? ` · Case ${ride.auto_escalation_case}` : ""}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── BM8: AIRPORT INTELLIGENCE BANNER ───────────────────────────── */}
            {ride.airport_monitoring_enabled && (() => {
              const phase = ride.airport_phase
              const status = ride.airport_intelligence_status
              const isIrregular = ride.airport_irregularity_flag
              const isDelayed = status === 'delayed' || (ride.flight_delay_minutes && ride.flight_delay_minutes > 0)
              const isLanded = status === 'landed' || phase === 'baggage_claim' || phase === 'at_gate'
              const isPassengerReady = phase === 'passenger_ready' || phase === 'pickup_window_active'
              const delayMin = ride.flight_delay_minutes ?? 0
              const terminal = ride.terminal_code
              const gate = ride.gate_info
              const baggage = ride.baggage_claim_zone
              const effectiveArrival = ride.actual_arrival_at ?? ride.estimated_arrival_at ?? ride.scheduled_arrival_at
              const arrivalTime = effectiveArrival ? new Date(effectiveArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
              const operationalPickup = ride.operational_pickup_target_at
                ? new Date(ride.operational_pickup_target_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : null
              const releaseAt = ride.operational_driver_release_at
                ? new Date(ride.operational_driver_release_at)
                : null
              const now = new Date()
              const releaseWindowOpen = releaseAt ? now >= releaseAt : true
              // Banner colors
              const validationStatus = ride.flight_validation_status
              const isValidationPending = validationStatus === 'not_found' || validationStatus === 'invalid_format' || validationStatus === 'provider_unavailable' || validationStatus === 'pending_customer_update'
              const manualReviewRequired = ride.manual_flight_review_required
              const airportBg = isIrregular ? '#3b000030' : isPassengerReady ? '#00200a30' : isLanded ? '#00150a30' : isDelayed ? '#3b220030' : isValidationPending ? '#2a1a0030' : '#0a0a2030'
              const airportBorder = isIrregular ? '#f87171' : isPassengerReady ? '#4ade80' : isLanded ? '#34d399' : isDelayed ? '#f59e0b' : isValidationPending ? '#fb923c' : '#6366f1'
              const airportTextColor = isIrregular ? '#f87171' : isPassengerReady ? '#4ade80' : isLanded ? '#34d399' : isDelayed ? '#f59e0b' : isValidationPending ? '#fb923c' : '#818cf8'
              const airportIcon = isIrregular ? '🚨' : isPassengerReady ? '✅' : isLanded ? '🛬' : isDelayed ? '⏱️' : isValidationPending ? '⚠️' : '✈️'
              const airportTitle = isIrregular
                ? (lang === 'es' ? 'IRREGULARIDAD DE VUELO' : 'FLIGHT IRREGULARITY')
                : isPassengerReady
                ? (lang === 'es' ? 'PASAJERO LISTO PARA PICKUP' : 'PASSENGER READY FOR PICKUP')
                : isLanded
                ? (lang === 'es' ? 'VUELO ATERRIZÓ — BAGGAGE CLAIM' : 'FLIGHT LANDED — BAGGAGE CLAIM')
                : isDelayed
                ? (lang === 'es' ? 'VUELO DEMORADO' : 'FLIGHT DELAYED')
                : isValidationPending
                ? (lang === 'es' ? 'INFORMACIÓN DE VUELO PENDIENTE' : 'FLIGHT INFORMATION PENDING VALIDATION')
                : (lang === 'es' ? 'MONITOREO AEROPORTUARIO ACTIVO' : 'AIRPORT MONITORING ACTIVE')
              const airportMsg = isIrregular
                ? (lang === 'es'
                  ? 'El vuelo tiene una irregularidad. Espera instrucciones del despacho antes de proceder.'
                  : 'Flight has an irregularity. Await dispatch instructions before proceeding.')
                : isPassengerReady
                ? (lang === 'es'
                  ? `El pasajero está listo para el pickup.${terminal ? ` Terminal ${terminal}.` : ''}${baggage ? ` Baggage Claim: ${baggage}.` : ''} Puedes proceder.`
                  : `Passenger is ready for pickup.${terminal ? ` Terminal ${terminal}.` : ''}${baggage ? ` Baggage Claim: ${baggage}.` : ''} You may proceed.`)
                : isLanded
                ? (lang === 'es'
                  ? `El vuelo aterrizó${arrivalTime ? ` a las ${arrivalTime}` : ''}.${terminal ? ` Terminal ${terminal}.` : ''}${baggage ? ` Baggage Claim: ${baggage}.` : ''} Espera confirmación de pasajero listo.`
                  : `Flight landed${arrivalTime ? ` at ${arrivalTime}` : ''}.${terminal ? ` Terminal ${terminal}.` : ''}${baggage ? ` Baggage Claim: ${baggage}.` : ''} Awaiting passenger ready confirmation.`)
                : isDelayed
                ? (lang === 'es'
                  ? `Vuelo demorado ${delayMin} min.${operationalPickup ? ` Nuevo pickup estimado: ${operationalPickup}.` : ''} El despacho ajustó tu ventana de servicio.`
                  : `Flight delayed ${delayMin} min.${operationalPickup ? ` New estimated pickup: ${operationalPickup}.` : ''} Dispatch has adjusted your service window.`)
                : isValidationPending
                ? (lang === 'es'
                  ? 'Los detalles del vuelo requieren revisión. Por favor verifica con el pasajero si es necesario. La reserva sigue activa.'
                  : 'Flight details require review. Please verify with passenger if needed. Reservation remains active.')
                : (lang === 'es'
                  ? `Monitoreo de vuelo activo.${arrivalTime ? ` Llegada estimada: ${arrivalTime}.` : ''}${terminal ? ` Terminal ${terminal}.` : ''}`
                  : `Flight monitoring active.${arrivalTime ? ` Estimated arrival: ${arrivalTime}.` : ''}${terminal ? ` Terminal ${terminal}.` : ''}`)
              return (
                <div className="flex flex-col gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: airportBg, border: `1px solid ${airportBorder}60` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{airportIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: airportTextColor }}>{airportTitle}</div>
                      <div className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{airportMsg}</div>
                      {ride.flight_number && (
                        <div className="text-xs mt-1 font-mono" style={{ color: `${airportTextColor}99` }}>
                          {ride.flight_number}{ride.airline_code ? ` · ${ride.airline_code}` : ''}{ride.airport_code ? ` · ${ride.airport_code}` : ''}
                        </div>
                      )}
                      {isValidationPending && (
                        <div className="text-xs mt-1 px-2 py-1 rounded" style={{ backgroundColor: '#fb923c20', color: '#fb923c', border: '1px solid #fb923c40' }}>
                          {lang === 'es'
                            ? '⚠️ Información de vuelo pendiente de validación'
                            : '⚠️ Flight information pending validation'}
                        </div>
                      )}
                      {manualReviewRequired && (
                        <div className="text-xs mt-1" style={{ color: '#fb923c99' }}>
                          {lang === 'es'
                            ? 'Revisión manual requerida por despacho'
                            : 'Manual review required by dispatch'}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* BM8: I'm On My Way — controlled by driver release window */}
                  {!imOnMyWaySent && isPassengerReady && releaseWindowOpen && (
                    <button
                      onClick={async () => {
                        setSendingImOnMyWay(true)
                        try {
                          const r = await fetch('/api/admin/driver-im-on-my-way', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ booking_id: ride.booking_id, driver_code: summary?.driver_code })
                          })
                          if (r.ok) setImOnMyWaySent(true)
                        } catch { }
                        finally { setSendingImOnMyWay(false) }
                      }}
                      disabled={sendingImOnMyWay}
                      className="w-full py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: airportBorder, color: '#000', opacity: sendingImOnMyWay ? 0.7 : 1 }}
                    >
                      {sendingImOnMyWay
                        ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                        : (lang === 'es' ? '🚗 Estoy en Camino al Aeropuerto' : '🚗 On My Way to Airport')}
                    </button>
                  )}
                  {!imOnMyWaySent && !isPassengerReady && !isIrregular && (
                    <div className="text-center text-xs py-1.5 rounded-lg" style={{ backgroundColor: '#ffffff10', color: '#9ca3af' }}>
                      {lang === 'es' ? '⏳ Esperando confirmación de pasajero listo' : '⏳ Awaiting passenger ready confirmation'}
                    </div>
                  )}
                  {imOnMyWaySent && (
                    <div className="text-center text-xs py-1" style={{ color: '#4ade80' }}>
                      ✅ {lang === 'es' ? 'Despacho notificado. ¡Gracias!' : 'Dispatch notified. Thank you!'}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* ── BM8 ANNEX: AIRPORT LOAD AWARENESS WIDGET ──────────────────────── */}
            {airportLoad && (() => {
              const loadLevel = airportLoad.airport_load_level
              const loadColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
                low:      { bg: '#0a1a0a30', border: '#4ade80', text: '#4ade80', label: lang === 'es' ? 'Bajo' : 'Low' },
                moderate: { bg: '#1a1a0030', border: '#facc15', text: '#facc15', label: lang === 'es' ? 'Moderado' : 'Moderate' },
                high:     { bg: '#1a0a0030', border: '#f97316', text: '#f97316', label: lang === 'es' ? 'Alto' : 'High' },
                peak:     { bg: '#2a000030', border: '#f87171', text: '#f87171', label: lang === 'es' ? 'Pico' : 'Peak' },
              }
              const c = loadColors[loadLevel] ?? loadColors.moderate
              return (
                <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: c.bg, border: `1px solid ${c.border}40` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold" style={{ color: c.text }}>
                      ✈️ {airportLoad.airport_code} {lang === 'es' ? 'Actividad Aeroportuaria' : 'Airport Activity'}
                    </div>
                    <div className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${c.border}20`, color: c.text }}>
                      {c.label}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                    <span>{lang === 'es' ? 'Llegadas próx. 60 min' : 'Arrivals next 60 min'}</span>
                    <span className="font-mono" style={{ color: c.text }}>{airportLoad.arrivals_next_60m}</span>
                    <span>{lang === 'es' ? 'Llegadas próx. 120 min' : 'Arrivals next 120 min'}</span>
                    <span className="font-mono" style={{ color: c.text }}>{airportLoad.arrivals_next_120m}</span>
                  </div>
                  {airportLoad.terminal_congestion_hint && (
                    <div className="text-xs mt-0.5" style={{ color: `${c.text}99` }}>
                      {airportLoad.terminal_congestion_hint}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── BM6: SLA PROTECTION BANNER ────────────────────────────────────── */}
            {ride.sla_current_state && ride.sla_current_state !== 'none' && !ride.driver_im_on_my_way && (() => {
              const isCritical = ride.sla_current_state === 'sla_critical'
              const isHighRisk = ride.sla_current_state === 'sla_high_risk'
              const minsLeft = ride.minutes_until_pickup ?? null
              const bannerBg = isCritical ? '#3b000030' : isHighRisk ? '#3b220030' : '#1a150030'
              const bannerBorder = isCritical ? '#f87171' : isHighRisk ? '#f59e0b' : '#c9a84c'
              const bannerTextColor = isCritical ? '#f87171' : isHighRisk ? '#f59e0b' : '#c9a84c'
              const bannerIcon = isCritical ? '🚨' : isHighRisk ? '⚠️' : '🛡️'
              const bannerTitle = isCritical
                ? (lang === 'es' ? 'ALERTA CRÍTICA DE SLA' : 'CRITICAL SLA ALERT')
                : isHighRisk
                ? (lang === 'es' ? 'RIESGO ALTO DE SLA' : 'HIGH RISK SLA WARNING')
                : (lang === 'es' ? 'MONITOREO SLA ACTIVO' : 'SLA MONITORING ACTIVE')
              const bannerMsg = isCritical
                ? (lang === 'es'
                  ? `¡Servicio en riesgo crítico! ${minsLeft !== null ? `Solo ${Math.round(minsLeft)} minutos para el pickup.` : ''} Confirma tu posición inmediatamente.`
                  : `Ride at critical risk! ${minsLeft !== null ? `Only ${Math.round(minsLeft)} min to pickup.` : ''} Confirm your position immediately.`)
                : isHighRisk
                ? (lang === 'es'
                  ? `Servicio bajo monitoreo urgente. ${minsLeft !== null ? `${Math.round(minsLeft)} minutos para el pickup.` : ''} El despacho está al tanto.`
                  : `Ride under urgent monitoring. ${minsLeft !== null ? `${Math.round(minsLeft)} min to pickup.` : ''} Dispatch is aware.`)
                : (lang === 'es'
                  ? `Este servicio está bajo protección SLA activa. Mantén tu estado actualizado.`
                  : `This ride is under active SLA protection. Keep your status updated.`)
              return (
                <div className="flex flex-col gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: bannerBg, border: `1px solid ${bannerBorder}60`, animation: isCritical ? 'bannerPulse 1s ease-in-out infinite' : undefined }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{bannerIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: bannerTextColor }}>{bannerTitle}</div>
                      <div className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{bannerMsg}</div>
                      {ride.sla_protection_level && (
                        <div className="text-xs mt-1 font-mono" style={{ color: `${bannerTextColor}99` }}>
                          SLA Level: {ride.sla_protection_level}
                          {ride.reassignment_count && ride.reassignment_count > 0 ? ` · Reassigned ×${ride.reassignment_count}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* I'm On My Way button */}
                  {!imOnMyWaySent && (
                    <button
                      onClick={async () => {
                        setSendingImOnMyWay(true)
                        try {
                          const r = await fetch('/api/admin/driver-im-on-my-way', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ booking_id: ride.booking_id, driver_code: summary?.driver_code })
                          })
                          if (r.ok) setImOnMyWaySent(true)
                        } catch { }
                        finally { setSendingImOnMyWay(false) }
                      }}
                      disabled={sendingImOnMyWay}
                      className="w-full py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: bannerBorder, color: isCritical ? '#fff' : '#000', opacity: sendingImOnMyWay ? 0.7 : 1 }}
                    >
                      {sendingImOnMyWay
                        ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                        : (lang === 'es' ? "🚗 Estoy en Camino" : "🚗 I'm On My Way")}
                    </button>
                  )}
                  {imOnMyWaySent && (
                    <div className="text-center text-xs py-1" style={{ color: '#4ade80' }}>
                      ✅ {lang === 'es' ? 'Despacho notificado. ¡Gracias!' : 'Dispatch notified. Thank you!'}
                    </div>
                  )}
                </div>
              )
            })()}

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
