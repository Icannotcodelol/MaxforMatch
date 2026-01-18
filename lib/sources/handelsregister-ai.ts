import type {
  HandelsregisterCompany,
  HandelsregisterSearchResponse,
} from "../types";

const API_BASE = "https://handelsregister.ai/api/v1";

// MUST search WZ2025 codes - high signal deep-tech categories
const MUST_WZ_CODES: { code: string; description: string }[] = [
  // Industrial deep-tech
  { code: "28.99.1", description: "Industrieroboter" },
  { code: "28.41.0", description: "Werkzeugmaschinen" },
  { code: "28.12.0", description: "Hydraulik/Pneumatik" },
  { code: "26.51.1", description: "Mess/Kontroll-Instrumente" },
  { code: "26.51.3", description: "Prüfmaschinen" },
  { code: "26.70.1", description: "Optische Instrumente" },
  { code: "26.12.0", description: "Leiterplatten" },
  { code: "26.11.9", description: "Elektronische Bauelemente" },
  // Cleantech
  { code: "27.20.0", description: "Batterien/Akkumulatoren" },
  { code: "26.11.1", description: "Solarzellen/Solarmodule" },
  { code: "27.11.2", description: "Transformatoren/Stromrichter" },
  { code: "27.12.0", description: "Elektrizitätsverteilung" },
  { code: "28.21.2", description: "Wärmepumpen" },
  // Deep-tech software
  { code: "62.10.4", description: "KI/ML Entwicklung" },
  { code: "58.29.0", description: "Sonstige Software" },
  // R&D and Aerospace
  { code: "72.10.2", description: "Ingenieur-F&E" },
  { code: "30.31.0", description: "Luft-/Raumfahrzeugbau" },
];

// Legacy search queries (kept for backward compatibility)
const SEARCH_QUERIES = [
  "Software GmbH",
  "Tech GmbH",
  "Technologie GmbH",
  "KI GmbH",
  "AI GmbH",
  "Robotik GmbH",
  "Automation GmbH",
  "Data GmbH",
  "Biotech GmbH",
  "Medtech GmbH",
  "Sensor GmbH",
  "Digital GmbH",
  "Cyber GmbH",
  "Cloud GmbH",
  "Energie GmbH",
  "Innovation GmbH",
  "Labs GmbH",
  "Research GmbH",
];

export async function searchCompanies(
  query: string,
  apiKey: string,
  limit: number = 10
): Promise<HandelsregisterSearchResponse> {
  const url = `${API_BASE}/search-organizations?q=${encodeURIComponent(query)}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Handelsregister API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function fetchCompanyDetails(
  entityId: string,
  apiKey: string
): Promise<HandelsregisterCompany | null> {
  const url = `${API_BASE}/fetch-organization?q=${entityId}`;

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch details for ${entityId}: ${response.status}`);
    return null;
  }

  return response.json();
}

/**
 * Fetch recent tech-related companies from Handelsregister.ai
 * Uses multiple search queries and deduplicates results
 */
export async function fetchRecentTechCompanies(
  apiKey: string,
  options: {
    maxCompanies?: number;
    queriesPerSearch?: number;
    minRegistrationDate?: Date;
  } = {}
): Promise<HandelsregisterCompany[]> {
  const {
    maxCompanies = 50,
    queriesPerSearch = 5,
    minRegistrationDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
  } = options;

  const seenIds = new Set<string>();
  const companies: HandelsregisterCompany[] = [];

  // Use a subset of queries to conserve credits
  const queriesToUse = SEARCH_QUERIES.slice(0, queriesPerSearch);

  for (const query of queriesToUse) {
    if (companies.length >= maxCompanies) break;

    try {
      console.log(`Searching: ${query}`);
      const response = await searchCompanies(query, apiKey, 20);

      for (const company of response.results) {
        // Skip if already seen
        if (seenIds.has(company.entity_id)) continue;
        seenIds.add(company.entity_id);

        // Skip if no business purpose
        if (!company.purpose || company.purpose.length < 30) continue;

        // Skip if too old
        if (company.registration_date) {
          const regDate = new Date(company.registration_date);
          if (regDate < minRegistrationDate) continue;
        }

        // Skip non-HRB (corporations only)
        if (company.registration?.register_type !== "HRB") continue;

        companies.push(company);

        if (companies.length >= maxCompanies) break;
      }

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }

  console.log(`Found ${companies.length} unique companies`);
  return companies;
}

/**
 * Transform Handelsregister company to our internal format (partial)
 */
export function transformCompany(company: HandelsregisterCompany) {
  return {
    id: company.entity_id,
    name: company.name,
    legalForm: company.legal_form || "GmbH",
    city: company.address?.city || "Unbekannt",
    state: company.address?.state || "",
    registrationDate: company.registration_date || "",
    businessPurpose: company.purpose || "",
    registerType: company.registration?.register_type || "HRB",
    registerNumber: company.registration?.register_number || "",
  };
}

/**
 * Search companies by WZ2025 industry code with date filtering
 */
export async function searchByWZCode(
  wzCode: string,
  apiKey: string,
  options: {
    limit?: number;
    registrationDateFrom?: string;
  } = {}
): Promise<HandelsregisterSearchResponse> {
  const { limit = 100, registrationDateFrom = "2025-01-01" } = options;

  const params = new URLSearchParams();
  params.set("filters[industry_code]", wzCode);
  params.set("filters[industry_scheme]", "WZ2025");
  params.set("filters[registration_date_from]", registrationDateFrom);
  params.set("limit", limit.toString());

  const url = `${API_BASE}/search-organizations?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Handelsregister API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch deep-tech companies using WZ2025 industry codes
 * This is the preferred method - uses official industry classification
 */
export async function fetchDeepTechByWZCodes(
  apiKey: string,
  options: {
    maxCompaniesPerCode?: number;
    registrationDateFrom?: string;
    wzCodes?: { code: string; description: string }[];
  } = {}
): Promise<HandelsregisterCompany[]> {
  const {
    maxCompaniesPerCode = 100,
    registrationDateFrom = "2025-01-01",
    wzCodes = MUST_WZ_CODES,
  } = options;

  const seenIds = new Set<string>();
  const companies: HandelsregisterCompany[] = [];

  for (const wz of wzCodes) {
    try {
      console.log(`Fetching WZ ${wz.code} (${wz.description})...`);

      const response = await searchByWZCode(wz.code, apiKey, {
        limit: maxCompaniesPerCode,
        registrationDateFrom,
      });

      let added = 0;
      for (const company of response.results) {
        // Skip if already seen (dedup across WZ codes)
        if (seenIds.has(company.entity_id)) continue;
        seenIds.add(company.entity_id);

        // Skip if no business purpose
        if (!company.purpose || company.purpose.length < 30) continue;

        companies.push(company);
        added++;
      }

      console.log(`  Found ${response.total} total, added ${added} new (${companies.length} total)`);

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error fetching WZ ${wz.code}:`, error);
    }
  }

  console.log(`Fetched ${companies.length} unique deep-tech companies`);
  return companies;
}

export { MUST_WZ_CODES };
