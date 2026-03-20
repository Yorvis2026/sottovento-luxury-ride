export type ZoneId =
  | "MCO"
  | "DISNEY"
  | "UNIVERSAL_IDRIVE"
  | "DOWNTOWN"
  | "KISSIMMEE"
  | "NORTH_ORLANDO"
  | "SFB"
  | "PORT_CANAVERAL"
  | "KENNEDY"
  | "TAMPA"
  | "CLEARWATER"
  | "MIAMI"
  | "LAKE_NONA";

export const ZONES: { id: ZoneId; label: string }[] = [
  { id: "MCO",             label: "MCO Airport" },
  { id: "DISNEY",          label: "Disney / Lake Buena Vista" },
  { id: "UNIVERSAL_IDRIVE",label: "Universal / I-Drive / Convention Center" },
  { id: "DOWNTOWN",        label: "Downtown Orlando / Dr. Phillips / Mall at Millenia" },
  { id: "KISSIMMEE",       label: "Kissimmee / Celebration / Reunion" },
  { id: "NORTH_ORLANDO",   label: "Winter Park / Maitland / Lake Mary / Longwood" },
  { id: "LAKE_NONA",       label: "Lake Nona / Medical City" },
  { id: "SFB",             label: "Sanford (SFB) Airport" },
  { id: "PORT_CANAVERAL",  label: "Port Canaveral" },
  { id: "KENNEDY",         label: "Kennedy Space Center / Cape Canaveral" },
  { id: "TAMPA",           label: "Tampa / Downtown Tampa" },
  { id: "CLEARWATER",      label: "Clearwater Beach" },
  { id: "MIAMI",           label: "Miami / Miami Beach" },
];

/** Map from URL ?package= param to ZoneId */
export const PACKAGE_TO_ZONE: Record<string, ZoneId> = {
  mco:         "MCO",
  disney:      "DISNEY",
  universal:   "UNIVERSAL_IDRIVE",
  downtown:    "DOWNTOWN",
  kissimmee:   "KISSIMMEE",
  north:       "NORTH_ORLANDO",
  sfb:         "SFB",
  port:        "PORT_CANAVERAL",
  kennedy:     "KENNEDY",
  tampa:       "TAMPA",
  clearwater:  "CLEARWATER",
  miami:       "MIAMI",
  lakenona:    "LAKE_NONA",
  lake_nona:   "LAKE_NONA",
};
