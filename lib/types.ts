// Flag types for triage model
export type FlagType = "green" | "yellow" | "red";

export interface Flag {
  type: FlagType;
  text: string;
  category?: string; // e.g., "Technologie", "Geschäftsmodell", "Standort"
}

export type TriageCategory = "green" | "unclear" | "red";

export interface Startup {
  // Core data from Handelsregister
  id: string;
  name: string;
  legalForm: string;
  city: string;
  state: string;
  registrationDate: string;
  businessPurpose: string;
  registerType: string;
  registerNumber: string;

  // Triage fields (replaces scoring)
  triage: TriageCategory;
  flags: Flag[];

  // Source enrichment
  source: "handelsregister";
  universityAffiliation?: string; // e.g., "TUM", "KIT"
  existProject?: string; // EXIST project name
  badges: string[]; // ['🎓 TUM', '🏛️ EXIST']

  // Metadata
  lastUpdated: string;
}

export interface FilterState {
  search: string;
  triageFilter: TriageCategory | "all";
  showOnlyWithGreenFlags: boolean;
  universityOnly: boolean;
  existOnly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  triageFilter: "all",
  showOnlyWithGreenFlags: false,
  universityOnly: false,
  existOnly: false,
};

export interface CacheData {
  lastUpdated: string;
  totalCompanies: number;
  stats: {
    green: number;
    unclear: number;
    red: number;
  };
  startups: Startup[];
}

// Red flag keywords for pre-filter (skip before LLM)
export const RED_FLAG_KEYWORDS = [
  // Consulting/Services
  "beratung",
  "consulting",
  "agentur",
  "dienstleistung",
  "vermittlung",
  "coaching",
  "training",
  "schulung",
  "workshop",
  // Holding/Asset management
  "vermögensverwaltung",
  "beteiligungsgesellschaft",
  "holding",
  "verwaltung eigenen vermögens",
  // Trade/Retail
  "handel mit",
  "import und export",
  "großhandel",
  "einzelhandel",
  "vertrieb von",
  // Real estate
  "immobilien",
  "grundstücks",
  "hausverwaltung",
  // Food/Hospitality
  "gastronomie",
  "restaurant",
  "catering",
  // Marketing
  "marketing",
  "werbung",
  "pr-agentur",
  "social media",
];

// Green flag keywords for highlighting
export const GREEN_FLAG_KEYWORDS = [
  // Hardware/Physical products
  { keyword: "sensor", category: "Hardware" },
  { keyword: "roboter", category: "Robotik" },
  { keyword: "robotik", category: "Robotik" },
  { keyword: "batterie", category: "Energie" },
  { keyword: "chip", category: "Hardware" },
  { keyword: "halbleiter", category: "Hardware" },
  { keyword: "laser", category: "Hardware" },
  { keyword: "optik", category: "Hardware" },
  { keyword: "antrieb", category: "Hardware" },
  { keyword: "motor", category: "Hardware" },
  { keyword: "drohne", category: "Robotik" },
  { keyword: "satellit", category: "Aerospace" },
  { keyword: "rakete", category: "Aerospace" },
  // Biotech/Medtech
  { keyword: "medizinprodukt", category: "Medtech" },
  { keyword: "diagnostik", category: "Medtech" },
  { keyword: "biotech", category: "Biotech" },
  { keyword: "gentechnik", category: "Biotech" },
  { keyword: "pharma", category: "Biotech" },
  { keyword: "therapeut", category: "Medtech" },
  { keyword: "implant", category: "Medtech" },
  // Energy/Cleantech
  { keyword: "wasserstoff", category: "Energie" },
  { keyword: "solar", category: "Energie" },
  { keyword: "photovoltaik", category: "Energie" },
  { keyword: "windkraft", category: "Energie" },
  { keyword: "brennstoffzelle", category: "Energie" },
  { keyword: "elektrolys", category: "Energie" },
  // Software with specifics
  { keyword: "maschinelles lernen", category: "AI/ML" },
  { keyword: "machine learning", category: "AI/ML" },
  { keyword: "computer vision", category: "AI/ML" },
  { keyword: "bildverarbeitung", category: "AI/ML" },
  { keyword: "spracherkennung", category: "AI/ML" },
  { keyword: "nlp", category: "AI/ML" },
  // Manufacturing
  { keyword: "fertigung", category: "Industrial" },
  { keyword: "produktion von", category: "Industrial" },
  { keyword: "herstellung von", category: "Industrial" },
  { keyword: "3d-druck", category: "Industrial" },
  { keyword: "additive fertigung", category: "Industrial" },
  // Specific domains
  { keyword: "quantencomputer", category: "Hardware" },
  { keyword: "quantentechnologie", category: "Hardware" },
  { keyword: "krypto", category: "Hardware" },
  { keyword: "cybersecurity", category: "Security" },
  { keyword: "verschlüsselung", category: "Security" },
];

// University proximity indicators
export const UNIVERSITY_CITIES = [
  { city: "münchen", unis: ["TUM", "LMU"] },
  { city: "aachen", unis: ["RWTH"] },
  { city: "karlsruhe", unis: ["KIT"] },
  { city: "berlin", unis: ["TU Berlin", "FU Berlin", "HU Berlin"] },
  { city: "stuttgart", unis: ["Uni Stuttgart"] },
  { city: "darmstadt", unis: ["TU Darmstadt"] },
  { city: "dresden", unis: ["TU Dresden"] },
  { city: "erlangen", unis: ["FAU"] },
  { city: "freiburg", unis: ["Uni Freiburg"] },
  { city: "heidelberg", unis: ["Uni Heidelberg"] },
  { city: "garching", unis: ["TUM"] },
  { city: "martinsried", unis: ["LMU"] },
  { city: "ottobrunn", unis: ["TUM/DLR"] },
  { city: "gilching", unis: ["TUM/DLR"] },
  { city: "weßling", unis: ["DLR"] },
];

// Raw response from Handelsregister.ai API
export interface HandelsregisterCompany {
  entity_id: string;
  name: string;
  registration: {
    court: string;
    register_type: string;
    register_number: string;
  };
  address: {
    house_number?: string;
    street?: string;
    postal_code?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  registration_date?: string;
  purpose?: string;
  legal_form?: string;
  status?: string;
}

export interface HandelsregisterSearchResponse {
  results: HandelsregisterCompany[];
  total: number;
  meta: {
    request_credit_cost: number;
    credits_remaining: number;
  };
}

// LLM result for flag extraction
export interface LLMTriageResult {
  triage: TriageCategory;
  flags: Flag[];
}
