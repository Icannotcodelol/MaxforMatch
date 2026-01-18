import fs from "fs";
import path from "path";

export interface VerifiedSpinoff {
  name: string;
  university: string;
  city: string;
  founded: number;
  sector: string;
  existFunded: boolean;
  notes?: string;
}

interface SpinoffData {
  spinoffs: VerifiedSpinoff[];
}

let cachedSpinoffs: VerifiedSpinoff[] | null = null;

/**
 * Load verified spin-offs from the curated JSON file
 */
export function loadVerifiedSpinoffs(): VerifiedSpinoff[] {
  if (cachedSpinoffs) return cachedSpinoffs;

  try {
    const filePath = path.join(process.cwd(), "data", "verified-spinoffs.json");
    const content = fs.readFileSync(filePath, "utf-8");
    const data: SpinoffData = JSON.parse(content);
    cachedSpinoffs = data.spinoffs;
    return cachedSpinoffs;
  } catch (error) {
    console.error("Failed to load verified spinoffs:", error);
    return [];
  }
}

/**
 * Find a matching spin-off by company name
 * Uses fuzzy matching to handle variations like "GmbH", "AG", etc.
 */
export function findSpinoffMatch(companyName: string): VerifiedSpinoff | null {
  const spinoffs = loadVerifiedSpinoffs();
  const normalizedName = normalizeName(companyName);

  for (const spinoff of spinoffs) {
    const normalizedSpinoff = normalizeName(spinoff.name);

    // Exact match after normalization
    if (normalizedName === normalizedSpinoff) {
      return spinoff;
    }

    // Check if company name contains the spin-off name
    if (normalizedName.includes(normalizedSpinoff)) {
      return spinoff;
    }

    // Check if spin-off name contains the company name (for shorter names)
    if (normalizedSpinoff.includes(normalizedName) && normalizedName.length > 4) {
      return spinoff;
    }
  }

  return null;
}

/**
 * Normalize company name for matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*(gmbh|ag|se|ug|kg|ohg|e\.v\.|mbh|co\.|&\s*co\.?)\s*/gi, "")
    .replace(/[^a-z0-9äöüß]/g, "")
    .trim();
}

/**
 * Get enrichment data for a company if it's a known spin-off
 */
export function getSpinoffEnrichment(companyName: string): {
  universityAffiliation?: string;
  existProject?: string;
  badges: string[];
  bonusPoints: number;
} | null {
  const match = findSpinoffMatch(companyName);

  if (!match) return null;

  const badges: string[] = [];
  let bonusPoints = 0;

  // Add university badge
  badges.push(`🎓 ${match.university}`);
  bonusPoints += 15;

  // Add EXIST badge if funded
  if (match.existFunded) {
    badges.push("🏛️ EXIST");
    bonusPoints += 10;
  }

  return {
    universityAffiliation: match.university,
    existProject: match.existFunded ? match.name : undefined,
    badges,
    bonusPoints,
  };
}
