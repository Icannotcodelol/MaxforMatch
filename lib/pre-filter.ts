import type { Flag, TriageCategory } from "./types";
import {
  RED_FLAG_KEYWORDS,
  GREEN_FLAG_KEYWORDS,
  UNIVERSITY_CITIES,
} from "./types";

export interface TriageResult {
  shouldProcess: boolean; // false = skip entirely (obvious non-tech)
  triage: TriageCategory;
  flags: Flag[];
}

/**
 * Comprehensive triage system that detects red/green/yellow flags
 * and determines initial triage category WITHOUT calling LLM.
 */
export function triageCompany(company: {
  businessPurpose?: string;
  name?: string;
  city?: string;
}): TriageResult {
  const purpose = (company.businessPurpose || "").toLowerCase();
  const name = (company.name || "").toLowerCase();
  const city = (company.city || "").toLowerCase();
  const flags: Flag[] = [];

  // === HARD SKIP: Obvious non-tech (don't even process) ===
  const hardSkipKeywords = [
    "gastronomie",
    "restaurant",
    "café",
    "bar",
    "imbiss",
    "friseur",
    "kosmetik",
    "beauty",
    "nail",
    "fitness",
    "yoga",
    "wellness",
    "massage",
    "steuerberater",
    "rechtsanwalt",
    "notar",
    "kanzlei",
    "fahrschule",
    "fotograf",
    "reisebüro",
    "handwerk",
    "tischler",
    "schreiner",
    "maler",
    "garten",
    "landschaftsbau",
    "tierarzt",
    "tierpflege",
    "supermarkt",
    "lebensmittel",
    "bäckerei",
    "metzgerei",
    "apotheke",
    "optiker",
    "zahnarzt",
    "arztpraxis",
    "physiotherapie",
    "pflegedienst",
    "bestattung",
    "taxi",
    "umzug",
  ];

  const isHardSkip = hardSkipKeywords.some(
    (kw) => purpose.includes(kw) || name.includes(kw)
  );

  // Skip if too short to evaluate
  if (!purpose || purpose.length < 30) {
    return { shouldProcess: false, triage: "red", flags: [] };
  }

  if (isHardSkip) {
    return { shouldProcess: false, triage: "red", flags: [] };
  }

  // === DETECT RED FLAGS ===
  for (const keyword of RED_FLAG_KEYWORDS) {
    if (purpose.includes(keyword)) {
      flags.push({
        type: "red",
        text: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        category: "Geschäftsmodell",
      });
    }
  }

  // Additional red flag patterns
  if (purpose.includes("aller art") || purpose.includes("jeglicher art")) {
    flags.push({ type: "red", text: '"Aller Art" - zu vage', category: "Sprache" });
  }
  if (purpose.includes("und angrenzende") || purpose.includes("und verwandte")) {
    flags.push({ type: "red", text: "Vage Erweiterung", category: "Sprache" });
  }
  if (purpose.length < 80 && !purpose.includes("entwicklung")) {
    flags.push({ type: "red", text: "Sehr kurzer Gegenstand", category: "Sprache" });
  }

  // === DETECT GREEN FLAGS ===
  for (const { keyword, category } of GREEN_FLAG_KEYWORDS) {
    if (purpose.includes(keyword) || name.includes(keyword)) {
      flags.push({
        type: "green",
        text: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        category,
      });
    }
  }

  // University city proximity
  const uniMatch = UNIVERSITY_CITIES.find((u) => city.includes(u.city));
  if (uniMatch) {
    flags.push({
      type: "green",
      text: `Nähe ${uniMatch.unis[0]}`,
      category: "Standort",
    });
  }

  // Specific product indicators
  if (purpose.includes("api") && (purpose.includes("software") || purpose.includes("dienst"))) {
    flags.push({ type: "green", text: "API-Produkt", category: "Geschäftsmodell" });
  }
  if (purpose.includes("saas") || purpose.includes("software as a service")) {
    flags.push({ type: "green", text: "SaaS", category: "Geschäftsmodell" });
  }
  if (purpose.includes("patent") || purpose.includes("lizenz")) {
    flags.push({ type: "green", text: "IP/Patente", category: "Geschäftsmodell" });
  }
  if (purpose.includes("prototyp") || purpose.includes("versuchsanlage")) {
    flags.push({ type: "green", text: "Prototyp-Phase", category: "Stadium" });
  }

  // Specific deep-tech domains in name
  const deepTechNamePatterns = [
    "tech",
    "labs",
    "robotics",
    "systems",
    "dynamics",
    "ai",
    "bio",
    "med",
    "quantum",
    "nano",
    "aero",
  ];
  for (const pattern of deepTechNamePatterns) {
    if (name.includes(pattern)) {
      flags.push({
        type: "yellow",
        text: `"${pattern}" im Namen`,
        category: "Name",
      });
      break; // Only one name flag
    }
  }

  // === DETECT YELLOW FLAGS (ambiguous) ===
  const ambiguousTerms = [
    "entwicklung",
    "forschung",
    "innovation",
    "digital",
    "software",
    "technologie",
    "lösung",
    "plattform",
    "system",
  ];

  for (const term of ambiguousTerms) {
    if (purpose.includes(term)) {
      // Only flag as yellow if not already green-flagged for specifics
      const alreadyGreen = flags.some(
        (f) => f.type === "green" && f.text.toLowerCase().includes(term)
      );
      if (!alreadyGreen) {
        flags.push({
          type: "yellow",
          text: `"${term.charAt(0).toUpperCase() + term.slice(1)}" ohne Spezifik`,
          category: "Sprache",
        });
        break; // Only one yellow language flag
      }
    }
  }

  // === DETERMINE TRIAGE CATEGORY ===
  const greenCount = flags.filter((f) => f.type === "green").length;
  const redCount = flags.filter((f) => f.type === "red").length;
  const yellowCount = flags.filter((f) => f.type === "yellow").length;

  let triage: TriageCategory;

  // Strong red flags dominate
  if (redCount >= 2 && greenCount === 0) {
    triage = "red";
  }
  // Strong green flags dominate
  else if (greenCount >= 2 && redCount === 0) {
    triage = "green";
  }
  // Single strong green flag (hardware, specific tech)
  else if (greenCount >= 1 && redCount === 0) {
    triage = "green";
  }
  // Mixed signals or only yellow
  else if (greenCount > 0 && redCount > 0) {
    triage = "unclear";
  }
  // Only red flags
  else if (redCount > 0 && greenCount === 0) {
    triage = "red";
  }
  // Only yellow or no flags
  else {
    triage = "unclear";
  }

  // Deduplicate flags
  const uniqueFlags = flags.filter(
    (flag, index, self) =>
      index === self.findIndex((f) => f.text === flag.text && f.type === flag.type)
  );

  return {
    shouldProcess: true,
    triage,
    flags: uniqueFlags,
  };
}

/**
 * Legacy function for backwards compatibility
 * Returns true if company should be processed at all
 */
export function shouldScore(company: {
  businessPurpose?: string;
  name?: string;
}): boolean {
  return triageCompany(company).shouldProcess;
}
