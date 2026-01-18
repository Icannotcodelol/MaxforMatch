import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  fetchDeepTechByWZCodes,
  transformCompany,
} from "@/lib/sources/handelsregister-ai";
import { getSpinoffEnrichment } from "@/lib/sources/spinoffs";
import { shouldScore } from "@/lib/pre-filter";
import { triageWithLLMRetry } from "@/lib/llm-scoring";
import type { Startup, CacheData, TriageCategory } from "@/lib/types";

export const maxDuration = 300; // 5 minutes max for Vercel

export async function POST(request: Request) {
  const startTime = Date.now();

  // Verify CRON secret (optional security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handelsregisterKey = process.env.HANDELSREGISTER_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!handelsregisterKey || !openrouterKey) {
    return NextResponse.json(
      { error: "Missing API keys" },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch deep-tech companies using WZ2025 industry codes
    console.log("Fetching deep-tech companies by WZ2025 codes...");
    const rawCompanies = await fetchDeepTechByWZCodes(handelsregisterKey, {
      maxCompaniesPerCode: 50, // Limit per code for cron (full pull via script)
      registrationDateFrom: "2025-01-01",
    });
    console.log(`Fetched ${rawCompanies.length} companies`);

    // 2. Limit to max 80 for LLM triage (Vercel timeout constraint)
    const companiesToTriage = rawCompanies.slice(0, 80);
    console.log(`Triaging ${companiesToTriage.length} companies with LLM...`);

    // 4. Triage each company with LLM
    const triagedStartups: Startup[] = [];

    for (let i = 0; i < companiesToTriage.length; i++) {
      const company = companiesToTriage[i];
      const transformed = transformCompany(company);

      console.log(`[${i + 1}/${companiesToTriage.length}] Triaging: ${company.name}`);

      try {
        const llmResult = await triageWithLLMRetry(
          {
            name: transformed.name,
            legalForm: transformed.legalForm,
            city: transformed.city,
            state: transformed.state,
            businessPurpose: transformed.businessPurpose,
          },
          openrouterKey
        );

        // Check for spin-off enrichment
        const enrichment = getSpinoffEnrichment(company.name);
        const flags = [...llmResult.flags];
        let triage = llmResult.triage;

        if (enrichment) {
          // Add enrichment badges as green flags
          if (enrichment.universityAffiliation) {
            flags.push({
              type: "green",
              text: `🎓 ${enrichment.universityAffiliation} Spin-off`,
            });
          }
          if (enrichment.existProject) {
            flags.push({
              type: "green",
              text: "🏛️ EXIST-gefördert",
            });
          }
          // Verified spin-offs override to green
          triage = "green";
        }

        const startup: Startup = {
          ...transformed,
          triage,
          flags,
          source: "handelsregister",
          universityAffiliation: enrichment?.universityAffiliation,
          existProject: enrichment?.existProject,
          badges: enrichment?.badges || [],
          lastUpdated: new Date().toISOString(),
        };

        triagedStartups.push(startup);

        // Rate limiting: 500ms between LLM calls
        if (i < companiesToTriage.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to triage ${company.name}:`, error);
      }
    }

    // 5. Sort: green first, then unclear, then red
    const triageOrder: Record<TriageCategory, number> = {
      green: 0,
      unclear: 1,
      red: 2,
    };

    triagedStartups.sort((a, b) => {
      const orderDiff = triageOrder[a.triage] - triageOrder[b.triage];
      if (orderDiff !== 0) return orderDiff;

      // Within same triage, sort by green flag count
      const aGreen = a.flags.filter((f) => f.type === "green").length;
      const bGreen = b.flags.filter((f) => f.type === "green").length;
      return bGreen - aGreen;
    });

    // 6. Calculate stats
    const stats = {
      green: triagedStartups.filter((s) => s.triage === "green").length,
      unclear: triagedStartups.filter((s) => s.triage === "unclear").length,
      red: triagedStartups.filter((s) => s.triage === "red").length,
    };

    // 7. Save to cache
    const cacheData: CacheData = {
      lastUpdated: new Date().toISOString(),
      totalCompanies: triagedStartups.length,
      stats,
      startups: triagedStartups,
    };

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const cachePath = path.join(dataDir, "cache.json");
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

    const duration = Date.now() - startTime;

    // 8. Return summary
    const enrichedCount = triagedStartups.filter(
      (s) => s.badges && s.badges.length > 0
    ).length;

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      totalFetched: rawCompanies.length,
      totalTriaged: triagedStartups.length,
      enrichedWithSpinoffData: enrichedCount,
      triageDistribution: stats,
    });
  } catch (error) {
    console.error("CRON job failed:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET(request: Request) {
  return POST(request);
}
