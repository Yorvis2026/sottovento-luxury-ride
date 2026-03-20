"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

// ============================================================
// /driver/[driver_code] — SLN Driver Panel v3
//
// States:
//   CALM     — no active offer, shows dashboard
//   OFFER    — active offer DOMINATES full screen (no dashboard)
//   ASSIGNED — confirmed ride details
//
// Offer trigger: dispatch_offers.status = 'pending'
//   OR bookings.dispatch_status IN (
//     'awaiting_driver_response',
//     'awaiting_source_owner',
//     'awaiting_sln_member'
//   )
// ============================================================

const GOLD = "#C8A96A"
const POLL_INTERVAL = 5000 // 5 seconds

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
    assignedRide: "Ride Assigned",
    route: "Route",
    pickup: "Pickup",
    vehicle: "Vehicle",
    fare: "Fare",
    navigate: "Navigate",
    contact: "Contact",
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
    offerExpired: "Offer Expired",
    offerExpiredSub: "Dispatching to next driver...",
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
    clientPhone: "Phone",
    rideDetails: "Ride Details",
    noClientInfo: "Client info unavailable",
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
    assignedRide: "Viaje Asignado",
    route: "Ruta",
    pickup: "Recogida",
    vehicle: "Vehículo",
    fare: "Tarifa",
    navigate: "Navegar",
    contact: "Contactar",
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
    offerExpired: "Oferta Expirada",
    offerExpiredSub: "Enviando al siguiente conductor...",
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
    clientPhone: "Teléfono",
    rideDetails: "Detalles del Viaje",
    noClientInfo: "Info del cliente no disponible",
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
    assignedRide: "Vwayaj Asiyen",
    route: "Wout",
    pickup: "Pran",
    vehicle: "Machin",
    fare: "Pri",
    navigate: "Navige",
    contact: "Kontakte",
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
    offerExpired: "Òf Ekspire",
    offerExpiredSub: "Voye bay pwochen chofè...",
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
    clientPhone: "Telefòn",
    rideDetails: "Detay Vwayaj",
    noClientInfo: "Info kliyan pa disponib",
  },
}

// ─── TYPES ────────────────────────────────────────────────────
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
}

interface AssignedRide {
  booking_id: string
  pickup_location: string
  dropoff_location: string
  pickup_datetime: string | null
  vehicle_type: string
  total_price: number
  client_name?: string | null
  client_phone?: string | null
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
  assigned_ride: AssignedRide | null
}

const BASE_URL = "https://www.sottoventoluxuryride.com"

// ─── COUNTDOWN HOOK ───────────────────────────────────────────
function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0)

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(999) // no expiry = show max
      return
    }
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

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function DriverDashboardByCode() {
  const params = useParams()
  const router = useRouter()
  const driverCode = (params?.driver_code as string)?.toUpperCase()

  const [lang, setLang] = useState<Lang>("en")
  const [summary, setSummary] = useState<DriverSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [responding, setResponding] = useState(false)
  const [respondResult, setRespondResult] = useState<"accepted" | "declined" | "expired" | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const t = T[lang]
  const tabletUrl = driverCode ? `${BASE_URL}/tablet/${driverCode}` : ""

  // Persist driver code
  useEffect(() => {
    if (!driverCode) return
    try { localStorage.setItem("sottovento_driver_code", driverCode) } catch {}
  }, [driverCode])

  // Detect saved language
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

  // ── Load driver data ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!driverCode) return
    try {
      const res = await fetch(`/api/driver/me?code=${encodeURIComponent(driverCode)}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }
      const d = data.driver
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
        assigned_ride: d.assigned_ride ?? null,
      })
      setLoading(false)
    } catch {
      setError("Failed to load driver data")
      setLoading(false)
    }
  }, [driverCode])

  // Initial load + polling
  useEffect(() => {
    loadData()
    pollRef.current = setInterval(loadData, POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadData])

  // ── Respond to offer ─────────────────────────────────────────
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
        // Navigate to assigned ride screen after 1.5s
        setTimeout(() => {
          setRespondResult(null)
          setResponding(false)
          loadData()
        }, 1500)
      } else {
        setRespondResult(response)
        setTimeout(() => {
          setRespondResult(null)
          setResponding(false)
          loadData()
        }, 2000)
      }
    } catch {
      setResponding(false)
    }
  }

  // ── Handle offer expiry ──────────────────────────────────────
  const handleOfferExpired = useCallback(() => {
    if (respondResult) return // already responded
    setRespondResult("expired")
    setTimeout(() => {
      setRespondResult(null)
      loadData()
    }, 2500)
  }, [respondResult, loadData])

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
      <div
        className="min-h-screen bg-black text-white flex items-center justify-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="text-center">
          <div className="text-zinc-500 text-sm mb-3">{t.loading}</div>
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────
  if (error || !summary) {
    return (
      <div
        className="min-h-screen bg-black text-white flex items-center justify-center px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white font-medium mb-2">{t.driverNotFound}</div>
          <div className="text-zinc-400 text-sm mb-4">{error ?? "Unknown error"}</div>
          <div className="text-zinc-500 text-xs">{t.contactAdmin}</div>
        </div>
      </div>
    )
  }

  // ── OFFER STATE — full screen dominant, NO dashboard ─────────
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

  // ── RESPOND RESULT OVERLAY ───────────────────────────────────
  if (respondResult) {
    const isAccepted = respondResult === "accepted"
    const isDeclined = respondResult === "declined"
    const isExpired = respondResult === "expired"
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{
          backgroundColor: isAccepted ? "#052e16" : "#0a0a0a",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="text-6xl mb-5">
          {isAccepted ? "✅" : isDeclined ? "✖️" : "⏰"}
        </div>
        <div className="text-2xl font-light text-white mb-2">
          {isAccepted ? t.acceptedTitle : isDeclined ? t.declinedTitle : t.expiredTitle}
        </div>
        <div className="text-sm text-zinc-400">
          {isAccepted ? t.acceptedSub : isDeclined ? t.declinedSub : t.expiredSub}
        </div>
      </div>
    )
  }

  // ── ASSIGNED STATE ───────────────────────────────────────────
  if (summary.assigned_ride) {
    return (
      <AssignedScreen
        ride={summary.assigned_ride}
        driverName={summary.driver_name}
        driverCode={summary.driver_code}
        lang={lang}
        onLang={setLangAndSave}
        t={t}
      />
    )
  }

  // ── CALM STATE — dashboard ───────────────────────────────────
  return (
    <div
      className="min-h-screen bg-black text-white pb-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{t.network}</div>
          <h1 className="text-base font-light tracking-wide">{t.driverDashboard}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            {(["en", "es", "ht"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLangAndSave(l)}
                className="px-2 py-1 text-xs uppercase tracking-widest transition-all"
                style={{
                  backgroundColor: lang === l ? GOLD : "transparent",
                  color: lang === l ? "#000" : "#6b7280",
                  fontWeight: lang === l ? 600 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium" style={{ color: GOLD }}>
              {summary.driver_name}
            </div>
            <div
              className="text-xs px-2 py-0.5 rounded-full inline-block mt-0.5"
              style={{
                backgroundColor: summary.driver_status === "active" ? "#14532d" : "#7f1d1d",
                color: summary.driver_status === "active" ? "#4ade80" : "#f87171",
              }}
            >
              {summary.driver_status === "active" ? t.youAreOnline : t.youAreOffline}
            </div>
          </div>
        </div>
      </div>

      {/* Calm status banner */}
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
              <button
                onClick={copyLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 transition shrink-0"
              >
                {copied ? t.copied : t.copy}
              </button>
              <a
                href={tabletUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 transition shrink-0"
              >
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
        <Link
          href={`/driver/${driverCode}/source-clients`}
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition"
        >
          <div>
            <div className="text-sm font-medium">{t.capturedClients}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{t.capturedClientsSub}</div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>
        <Link
          href={`/driver/${driverCode}/earnings`}
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition"
        >
          <div>
            <div className="text-sm font-medium">{t.earningsLabel}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{t.earningsSub}</div>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>
        <Link
          href={`/?ref=${summary.driver_code}`}
          target="_blank"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition"
        >
          <div>
            <div className="text-sm font-medium">{t.referralLabel}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{t.referralSub}</div>
          </div>
          <span style={{ color: GOLD }}>↗</span>
        </Link>
      </div>

      {/* Source ownership info */}
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

// ─────────────────────────────────────────────────────────────
// OFFER SCREEN — full screen priority mode
// No dashboard visible. Offer overrides entire UI.
// ─────────────────────────────────────────────────────────────
function OfferScreen({
  offer,
  driverName,
  lang,
  onLang,
  onAccept,
  onDecline,
  onExpired,
  responding,
  t,
}: {
  offer: ActiveOffer
  driverName: string
  lang: Lang
  onLang: (l: Lang) => void
  onAccept: () => void
  onDecline: () => void
  onExpired: () => void
  responding: boolean
  t: Record<string, string>
}) {
  const secondsLeft = useCountdown(offer.expires_at)
  const hasExpiry = !!offer.expires_at
  const expired = hasExpiry && secondsLeft === 0

  // Auto-trigger expiry callback
  const expiredRef = useRef(false)
  useEffect(() => {
    if (expired && !expiredRef.current && !responding) {
      expiredRef.current = true
      onExpired()
    }
  }, [expired, responding, onExpired])

  // Dynamic timer color
  const timerColor =
    !hasExpiry ? "#ffffff" :
    secondsLeft > 60 ? "#ffffff" :
    secondsLeft > 20 ? "#f59e0b" :
    "#ef4444"

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")

  // Max seconds for progress bar (default 90s)
  const maxSeconds = hasExpiry
    ? Math.max(90, Math.ceil((new Date(offer.expires_at!).getTime() - Date.now()) / 1000) + secondsLeft)
    : 90
  const progressPct = hasExpiry ? Math.min(100, (secondsLeft / maxSeconds) * 100) : 100

  // Format pickup datetime
  const pickupDate = offer.pickup_datetime
    ? new Date(offer.pickup_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : ""
  const pickupTime = offer.pickup_datetime
    ? new Date(offer.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : ""

  return (
    <div
      className="fixed inset-0 flex flex-col bg-black"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: GOLD }}>
            {t.newRideOffer}
          </span>
          {offer.is_source_offer && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "#1c1400", color: GOLD, border: `1px solid ${GOLD}` }}
            >
              {t.sourceOffer}
            </span>
          )}
          {offer.offer_round && offer.offer_round > 1 && (
            <span className="text-xs text-zinc-500">
              {t.round} {offer.offer_round}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            {(["en", "es", "ht"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onLang(l)}
                className="px-2 py-1 text-xs uppercase tracking-widest transition-all"
                style={{
                  backgroundColor: lang === l ? GOLD : "transparent",
                  color: lang === l ? "#000" : "#6b7280",
                  fontWeight: lang === l ? 600 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500 hidden sm:block">{driverName}</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden">

        {/* Route — largest element */}
        <div className="flex-1 flex flex-col justify-center min-h-0">

          {/* Pickup */}
          <div className="mb-1">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              {t.pickup}
            </div>
            <div className="text-2xl font-light text-white leading-tight">
              {offer.pickup_location}
            </div>
          </div>

          {/* Arrow divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="text-zinc-600 text-lg">↓</div>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Dropoff */}
          <div className="mb-5">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              {t.route}
            </div>
            <div className="text-2xl font-light text-white leading-tight">
              {offer.dropoff_location}
            </div>
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
              <div className="text-xl font-bold" style={{ color: GOLD }}>
                ${offer.total_price.toFixed(0)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Countdown timer ── */}
        <div className="flex flex-col items-center py-4 flex-shrink-0">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t.timeRemaining}</div>
          <div
            className="text-6xl font-mono font-bold tabular-nums transition-colors duration-300"
            style={{ color: timerColor }}
          >
            {hasExpiry ? `${mm}:${ss}` : "—"}
          </div>
          {/* Progress bar */}
          {hasExpiry && (
            <div className="w-full h-2 bg-zinc-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: timerColor,
                  boxShadow: `0 0 8px ${timerColor}60`,
                }}
              />
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3 flex-shrink-0">
          {/* Decline — secondary, smaller */}
          <button
            onClick={onDecline}
            disabled={responding || expired}
            className="flex-none px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-300 text-base font-medium transition-all active:scale-95 disabled:opacity-40"
            style={{ minWidth: "100px" }}
          >
            {t.decline}
          </button>

          {/* Accept — primary, dominant */}
          <button
            onClick={onAccept}
            disabled={responding || expired}
            className="flex-1 py-5 rounded-2xl text-black text-xl font-bold tracking-wide transition-all active:scale-95 disabled:opacity-40"
            style={{
              backgroundColor: responding ? "#a08040" : GOLD,
              boxShadow: responding ? "none" : `0 0 24px ${GOLD}60`,
            }}
          >
            {responding ? "..." : t.accept}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ASSIGNED SCREEN — confirmed ride details
// ─────────────────────────────────────────────────────────────
function AssignedScreen({
  ride,
  driverName,
  driverCode,
  lang,
  onLang,
  t,
}: {
  ride: AssignedRide
  driverName: string
  driverCode: string
  lang: Lang
  onLang: (l: Lang) => void
  t: Record<string, string>
}) {
  const pickupDate = ride.pickup_datetime
    ? new Date(ride.pickup_datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : ""
  const pickupTime = ride.pickup_datetime
    ? new Date(ride.pickup_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : ""

  const mapsUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(ride.pickup_location)}`

  return (
    <div
      className="min-h-screen bg-black text-white pb-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Sottovento Network</div>
          <h1 className="text-base font-light tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" style={{ boxShadow: "0 0 6px #4ade80" }} />
            {t.assignedRide}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            {(["en", "es", "ht"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onLang(l)}
                className="px-2 py-1 text-xs uppercase tracking-widest transition-all"
                style={{
                  backgroundColor: lang === l ? GOLD : "transparent",
                  color: lang === l ? "#000" : "#6b7280",
                  fontWeight: lang === l ? 600 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="text-sm font-medium" style={{ color: GOLD }}>{driverName}</div>
        </div>
      </div>

      {/* Ride details card */}
      <div className="mx-4 mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">{t.rideDetails}</div>

          {/* Route */}
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
              {t.route}
            </div>
            <div className="text-lg font-light text-white">{ride.dropoff_location}</div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 divide-x divide-zinc-800">
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

        {/* Client info */}
        {(ride.client_name || ride.client_phone) && (
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t.clientName}</div>
            {ride.client_name && <div className="text-sm font-medium text-white">{ride.client_name}</div>}
            {ride.client_phone && (
              <a
                href={`tel:${ride.client_phone}`}
                className="text-sm mt-1 inline-block"
                style={{ color: GOLD }}
              >
                {ride.client_phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 mt-4 flex gap-3">
        <a
          href={mapsUrl}
          className="flex-1 py-4 rounded-2xl text-center text-base font-semibold transition-all active:scale-95"
          style={{ backgroundColor: GOLD, color: "#000" }}
        >
          {t.navigate}
        </a>
        {ride.client_phone && (
          <a
            href={`tel:${ride.client_phone}`}
            className="flex-none px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-300 text-base font-medium transition-all active:scale-95"
          >
            {t.contact}
          </a>
        )}
      </div>
    </div>
  )
}
