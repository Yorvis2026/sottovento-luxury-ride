export type ZoneId =
  | "MCO"
  | "DISNEY"
  | "UNIVERSAL_IDRIVE"
  | "DOWNTOWN"
  | "KISSIMMEE"
  | "NORTH_ORLANDO"
  | "SFB"
  | "PORT_CANAVERAL";

export const ZONES: { id: ZoneId; label: string }[] = [
  { id: "MCO", label: "MCO Airport" },
  { id: "DISNEY", label: "Disney / Lake Buena Vista" },
  { id: "UNIVERSAL_IDRIVE", label: "Universal / I-Drive / Convention Center" },
  { id: "DOWNTOWN", label: "Downtown Orlando / Dr. Phillips / Mall at Millenia" },
  { id: "KISSIMMEE", label: "Kissimmee / Celebration / Reunion" },
  { id: "NORTH_ORLANDO", label: "Winter Park / Maitland / Lake Mary / Longwood" },
  { id: "SFB", label: "Sanford (SFB) Airport" },
  { id: "PORT_CANAVERAL", label: "Port Canaveral" },
];
