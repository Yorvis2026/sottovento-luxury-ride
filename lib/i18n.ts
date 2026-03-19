// ============================================================
// Sottovento Luxury Network — i18n Translation System
// Languages: English (en) | Spanish (es)
// ============================================================

export type Lang = "en" | "es"

const translations = {
  en: {
    // Auth
    adminPassword: "Admin Password",
    incorrectPassword: "Incorrect password. Try again.",
    enterPassword: "Enter Panel",
    logout: "Logout",

    // Header
    slnLabel: "Sottovento Luxury Network",
    adminPanel: "Admin Panel",

    // Tabs
    tabDashboard: "Dashboard",
    tabBookings: "Bookings",
    tabDispatch: "Dispatch",
    tabDrivers: "Drivers",
    tabCompanies: "Companies",
    tabLeads: "Leads",
    tabCrown: "Crown Moment",
    tabFinance: "Finance",
    tabSettings: "Settings",

    // Common
    refresh: "Refresh",
    loading: "Loading...",
    noData: "No data available",
    cancel: "Cancel",
    creating: "Creating...",
    assign: "Assign",
    activate: "Activate",
    deactivate: "Deactivate",
    copyLink: "Copy Link",

    // Dashboard
    dashTitle: "Operations Dashboard",
    dashSubtitle: "Real-time overview of Sottovento Luxury Network",
    dashToday: "TODAY",
    dashWeek: "THIS WEEK",
    dashMonth: "THIS MONTH",
    dashBookings: "bookings",
    dashActiveDrivers: "ACTIVE DRIVERS",
    dashMembers: "network members",
    dashTotalLeads: "TOTAL LEADS",
    dashCaptured: "captured",
    dashBookingStatuses: "Booking Statuses",
    dashLeadsBySource: "Leads by Source",
    dashRecentBookings: "Recent Bookings",
    dashNoBookings: "No bookings yet",
    dashNoLeads: "No leads yet",
    dashUnknownClient: "Unknown client",

    // Bookings
    bookTitle: "Bookings Management",
    bookSubtitle: "View and manage all ride bookings",
    bookNoBookings: "No bookings found",
    bookClient: "Client",
    bookAccept: "Accept",
    bookCancel: "Cancel",
    bookInProgress: "In Progress",
    bookComplete: "Complete",

    // Dispatch
    dispTitle: "Dispatch Engine",
    dispSubtitle: "Automated driver assignment system",
    dispFlowTitle: "Dispatch Flow",
    dispStep1Label: "Booking Received",
    dispStep1Desc: "New booking enters the queue. System validates pickup/dropoff zones.",
    dispStep2Label: "Driver Pool Selection",
    dispStep2Desc: "Eligible active drivers are selected. SMS offer sent with 120s timeout.",
    dispStep3Label: "Assignment Confirmed",
    dispStep3Desc: "First driver to accept is assigned. Booking status → accepted.",
    dispRulesTitle: "Critical Rules",
    dispRule1: "Driver must be active and eligible to receive offers",
    dispRule2: "Offer expires after 120 seconds — next driver in pool",
    dispRule3: "Only one driver assigned per booking",
    dispRule4: "Manual override available from Bookings tab",
    dispRule5: "Completed bookings trigger commission calculation",
    dispPendingTitle: "Pending Manual Assignment",
    dispNoPending: "No bookings pending assignment",

    // Drivers
    drvTitle: "Driver Management",
    drvSubtitle: "Manage the SLN driver network",
    drvAddDriver: "+ Add Driver",
    drvNewDriver: "New Driver",
    drvFullName: "Full Name",
    drvPhone: "Phone",
    drvEmail: "Email (optional)",
    drvCode: "Driver Code",
    drvCreateDriver: "Create Driver",
    drvCreated: "Driver created successfully:",
    drvError: "Error:",
    drvNetworkError: "Network error:",
    drvRequiredFields: "Name, phone and driver code are required",
    drvNoDrivers: "No drivers registered yet",
    drvAdded: "Added",

    // Status
    statusActive: "ACTIVE",
    statusInactive: "INACTIVE",

    // Companies
    compTitle: "Companies",
    compSubtitle: "Sottovento Luxury Network brand ecosystem",
    compFlagship: "FLAGSHIP BRAND",
    compPartner: "PARTNER BRAND",
    compActiveMembers: "ACTIVE MEMBERS",
    compAssignments: "Driver Assignments",
    compAssignmentsDesc: "active drivers are currently assigned to",
    compFuture: "Multi-brand assignment coming in a future update.",

    // Leads
    leadsTitle: "Leads Management",
    leadsSubtitle: "Track and convert all captured leads",
    leadsNoLeads: "No leads captured yet",
    leadsPackage: "Package",
    leadsDriver: "Driver",
    leadsContact: "Mark Contacted",
    leadsBooked: "Mark Booked",
    leadsLost: "Mark Lost",

    // Crown Moment
    crownTitle: "Crown Moment",
    crownSubtitle: "Photo experience analytics and lead conversion",
    crownToday: "TODAY",
    crownWeek: "THIS WEEK",
    crownMonth: "THIS MONTH",
    crownTotal: "TOTAL PHOTOS",
    crownConverted: "CONVERTED",
    crownConvRate: "Conversion Rate (Crown → Booking)",
    crownConvDesc: "of Crown Moment leads converted to bookings",
    crownRecentTitle: "Recent Crown Moment Leads",
    crownNoLeads: "No Crown Moment leads yet",
    crownFailed: "Failed to load Crown Moment data",

    // Finance
    finTitle: "Finance & Commissions",
    finSubtitle: "Revenue tracking and driver commission management",
    finTotalRevenue: "TOTAL REVENUE",
    finMonthRevenue: "THIS MONTH",
    finDriverEarnings: "DRIVER EARNINGS",
    finPlatformEarnings: "PLATFORM EARNINGS",
    finTopDrivers: "Top Drivers by Earnings",
    finNoCommissions: "No commissions recorded yet",
    finRides: "rides",
    finTotalEarnings: "total earnings",
    finRecentCommissions: "Recent Commissions",
    finNoRecent: "No recent commissions",
    finUnassigned: "Unassigned",
    finBooking: "Booking",
    finFailed: "Failed to load finance data",

    // Settings
    settTitle: "System Settings",
    settSubtitle: "Configuration and infrastructure overview",
    settDispatch: "DISPATCH CONFIGURATION",
    settOfferTimeout: "Offer Timeout",
    settPoolTimeout: "Pool Timeout",
    settMaxRounds: "Max Rounds",
    settFallback: "Fallback",
    settFallbackVal: "Manual assignment",
    settCommissions: "COMMISSION SPLIT",
    settExecutor: "Executor Driver",
    settSource: "Source Driver",
    settPlatform: "Platform (SLN)",
    settCrown: "CROWN MOMENT CONFIG",
    settDiscountCode: "Discount Code",
    settReferral: "Referral Reward",
    settPhotoStorage: "Photo Storage",
    settEmailProvider: "Email Provider",
    settInfra: "INFRASTRUCTURE",
    settHosting: "Hosting",
    settDatabase: "Database",
    settSMS: "SMS",
    settPayments: "Payments",
    settFramework: "Framework",
    settDomain: "Domain",
    settSMSTest: "SMS TEST",
    settPhoneNumber: "Phone Number",
    settSending: "Sending...",
    settSendSMS: "Send Test SMS",
    settSMSNumber: "SMS Number",
    settSMSService: "Service Name",
    settA2P: "A2P 10DLC Status",
    settTollFree: "Toll-Free",
  },
  es: {
    // Auth
    adminPassword: "Contraseña de Administrador",
    incorrectPassword: "Contraseña incorrecta. Intenta de nuevo.",
    enterPassword: "Ingresar al Panel",
    logout: "Cerrar Sesión",

    // Header
    slnLabel: "Sottovento Luxury Network",
    adminPanel: "Panel de Administración",

    // Tabs
    tabDashboard: "Dashboard",
    tabBookings: "Reservas",
    tabDispatch: "Despacho",
    tabDrivers: "Conductores",
    tabCompanies: "Empresas",
    tabLeads: "Leads",
    tabCrown: "Crown Moment",
    tabFinance: "Finanzas",
    tabSettings: "Configuración",

    // Common
    refresh: "Actualizar",
    loading: "Cargando...",
    noData: "Sin datos disponibles",
    cancel: "Cancelar",
    creating: "Creando...",
    assign: "Asignar",
    activate: "Activar",
    deactivate: "Desactivar",
    copyLink: "Copiar Link",

    // Dashboard
    dashTitle: "Dashboard de Operaciones",
    dashSubtitle: "Vista en tiempo real de Sottovento Luxury Network",
    dashToday: "HOY",
    dashWeek: "ESTA SEMANA",
    dashMonth: "ESTE MES",
    dashBookings: "reservas",
    dashActiveDrivers: "CONDUCTORES ACTIVOS",
    dashMembers: "miembros de la red",
    dashTotalLeads: "LEADS TOTALES",
    dashCaptured: "capturados",
    dashBookingStatuses: "Estados de Reservas",
    dashLeadsBySource: "Leads por Fuente",
    dashRecentBookings: "Reservas Recientes",
    dashNoBookings: "Sin reservas aún",
    dashNoLeads: "Sin leads aún",
    dashUnknownClient: "Cliente desconocido",

    // Bookings
    bookTitle: "Gestión de Reservas",
    bookSubtitle: "Ver y gestionar todas las reservas de viajes",
    bookNoBookings: "No se encontraron reservas",
    bookClient: "Cliente",
    bookAccept: "Aceptar",
    bookCancel: "Cancelar",
    bookInProgress: "En Progreso",
    bookComplete: "Completar",

    // Dispatch
    dispTitle: "Motor de Despacho",
    dispSubtitle: "Sistema automatizado de asignación de conductores",
    dispFlowTitle: "Flujo de Despacho",
    dispStep1Label: "Reserva Recibida",
    dispStep1Desc: "Nueva reserva entra a la cola. El sistema valida zonas de recogida/destino.",
    dispStep2Label: "Selección de Pool de Conductores",
    dispStep2Desc: "Se seleccionan conductores activos elegibles. Se envía SMS con tiempo límite de 120s.",
    dispStep3Label: "Asignación Confirmada",
    dispStep3Desc: "El primer conductor en aceptar queda asignado. Estado de reserva → aceptada.",
    dispRulesTitle: "Reglas Críticas",
    dispRule1: "El conductor debe estar activo y elegible para recibir ofertas",
    dispRule2: "La oferta expira después de 120 segundos — siguiente conductor en el pool",
    dispRule3: "Solo un conductor asignado por reserva",
    dispRule4: "Anulación manual disponible desde la pestaña Reservas",
    dispRule5: "Las reservas completadas activan el cálculo de comisiones",
    dispPendingTitle: "Pendientes de Asignación Manual",
    dispNoPending: "No hay reservas pendientes de asignación",

    // Drivers
    drvTitle: "Gestión de Conductores",
    drvSubtitle: "Administra la red de conductores SLN",
    drvAddDriver: "+ Agregar Conductor",
    drvNewDriver: "Nuevo Conductor",
    drvFullName: "Nombre Completo",
    drvPhone: "Teléfono",
    drvEmail: "Email (opcional)",
    drvCode: "Código de Conductor",
    drvCreateDriver: "Crear Conductor",
    drvCreated: "Conductor creado exitosamente:",
    drvError: "Error:",
    drvNetworkError: "Error de red:",
    drvRequiredFields: "Nombre, teléfono y código de conductor son requeridos",
    drvNoDrivers: "No hay conductores registrados aún",
    drvAdded: "Agregado",

    // Status
    statusActive: "ACTIVO",
    statusInactive: "INACTIVO",

    // Companies
    compTitle: "Empresas",
    compSubtitle: "Ecosistema de marcas de Sottovento Luxury Network",
    compFlagship: "MARCA PRINCIPAL",
    compPartner: "MARCA ASOCIADA",
    compActiveMembers: "MIEMBROS ACTIVOS",
    compAssignments: "Asignaciones de Conductores",
    compAssignmentsDesc: "conductores activos están asignados actualmente a",
    compFuture: "Asignación multi-marca disponible en una próxima actualización.",

    // Leads
    leadsTitle: "Gestión de Leads",
    leadsSubtitle: "Rastrea y convierte todos los leads capturados",
    leadsNoLeads: "No hay leads capturados aún",
    leadsPackage: "Paquete",
    leadsDriver: "Conductor",
    leadsContact: "Marcar Contactado",
    leadsBooked: "Marcar Reservado",
    leadsLost: "Marcar Perdido",

    // Crown Moment
    crownTitle: "Crown Moment",
    crownSubtitle: "Analíticas de experiencia fotográfica y conversión de leads",
    crownToday: "HOY",
    crownWeek: "ESTA SEMANA",
    crownMonth: "ESTE MES",
    crownTotal: "FOTOS TOTALES",
    crownConverted: "CONVERTIDOS",
    crownConvRate: "Tasa de Conversión (Crown → Reserva)",
    crownConvDesc: "de los leads Crown Moment se convirtieron en reservas",
    crownRecentTitle: "Leads Recientes de Crown Moment",
    crownNoLeads: "Sin leads de Crown Moment aún",
    crownFailed: "Error al cargar datos de Crown Moment",

    // Finance
    finTitle: "Finanzas y Comisiones",
    finSubtitle: "Seguimiento de ingresos y gestión de comisiones",
    finTotalRevenue: "INGRESOS TOTALES",
    finMonthRevenue: "ESTE MES",
    finDriverEarnings: "GANANCIAS CONDUCTORES",
    finPlatformEarnings: "GANANCIAS PLATAFORMA",
    finTopDrivers: "Mejores Conductores por Ganancias",
    finNoCommissions: "Sin comisiones registradas aún",
    finRides: "viajes",
    finTotalEarnings: "ganancias totales",
    finRecentCommissions: "Comisiones Recientes",
    finNoRecent: "Sin comisiones recientes",
    finUnassigned: "Sin asignar",
    finBooking: "Reserva",
    finFailed: "Error al cargar datos financieros",

    // Settings
    settTitle: "Configuración del Sistema",
    settSubtitle: "Configuración y resumen de infraestructura",
    settDispatch: "CONFIGURACIÓN DE DESPACHO",
    settOfferTimeout: "Tiempo Límite de Oferta",
    settPoolTimeout: "Tiempo Límite de Pool",
    settMaxRounds: "Rondas Máximas",
    settFallback: "Fallback",
    settFallbackVal: "Asignación manual",
    settCommissions: "DISTRIBUCIÓN DE COMISIONES",
    settExecutor: "Conductor Ejecutor",
    settSource: "Conductor Fuente",
    settPlatform: "Plataforma (SLN)",
    settCrown: "CONFIGURACIÓN CROWN MOMENT",
    settDiscountCode: "Código de Descuento",
    settReferral: "Recompensa por Referido",
    settPhotoStorage: "Almacenamiento de Fotos",
    settEmailProvider: "Proveedor de Email",
    settInfra: "INFRAESTRUCTURA",
    settHosting: "Hosting",
    settDatabase: "Base de Datos",
    settSMS: "SMS",
    settPayments: "Pagos",
    settFramework: "Framework",
    settDomain: "Dominio",
    settSMSTest: "PRUEBA DE SMS",
    settPhoneNumber: "Número de Teléfono",
    settSending: "Enviando...",
    settSendSMS: "Enviar SMS de Prueba",
    settSMSNumber: "Número SMS",
    settSMSService: "Nombre del Servicio",
    settA2P: "Estado A2P 10DLC",
    settTollFree: "Número Gratuito",
  },
} as const

export type TranslationKey = keyof typeof translations.en

export function getTranslation(lang: Lang, key: TranslationKey): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key
}

export function saveLang(lang: Lang) {
  if (typeof window !== "undefined") {
    localStorage.setItem("sln_lang", lang)
  }
}

export function loadLang(): Lang {
  if (typeof window === "undefined") return "en"
  const saved = localStorage.getItem("sln_lang") as Lang | null
  if (saved === "en" || saved === "es") return saved
  // Auto-detect from browser language
  const browserLang = navigator.language?.toLowerCase() ?? ""
  if (browserLang.startsWith("es")) return "es"
  return "en"
}
