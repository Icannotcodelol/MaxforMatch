/**
 * Script to pull deep-tech companies from Handelsregister using WZ2025 codes
 * Run with: npx tsx scripts/pull-wz-data.ts
 */

import fs from "fs";
import path from "path";
import {
  fetchDeepTechByWZCodes,
  transformCompany,
  MUST_WZ_CODES,
} from "../lib/sources/handelsregister-ai";
import { getSpinoffEnrichment } from "../lib/sources/spinoffs";
import { triageWithLLMRetry } from "../lib/llm-scoring";
import type { Startup, CacheData, TriageCategory } from "../lib/types";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const HANDELSREGISTER_API_KEY = process.env.HANDELSREGISTER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!HANDELSREGISTER_API_KEY || !OPENROUTER_API_KEY) {
  console.error("Missing API keys in .env.local");
  process.exit(1);
}

async function main() {
  const startTime = Date.now();
  console.log("🚀 Starting deep-tech company pull...\n");
  console.log(`Using ${MUST_WZ_CODES.length} WZ2025 codes:`);
  MUST_WZ_CODES.forEach((wz) => console.log(`  - ${wz.code}: ${wz.description}`));
  console.log("");

  // 1. Fetch companies from all WZ codes
  console.log("📥 Fetching companies from Handelsregister.ai...\n");
  const rawCompanies = await fetchDeepTechByWZCodes(HANDELSREGISTER_API_KEY!, {
    maxCompaniesPerCode: 150, // Get more per code to ensure coverage
    registrationDateFrom: "2025-01-01",
  });

  console.log(`\n✅ Fetched ${rawCompanies.length} unique companies\n`);

  // 2. Triage each company with LLM
  console.log("🤖 Starting LLM triage...\n");
  const triagedStartups: Startup[] = [];
  let greenCount = 0;
  let unclearCount = 0;
  let redCount = 0;

  for (let i = 0; i < rawCompanies.length; i++) {
    const company = rawCompanies[i];
    const transformed = transformCompany(company);

    const progress = `[${i + 1}/${rawCompanies.length}]`;
    process.stdout.write(`${progress} ${company.name.substring(0, 50).padEnd(50)} `);

    try {
      const llmResult = await triageWithLLMRetry(
        {
          name: transformed.name,
          legalForm: transformed.legalForm,
          city: transformed.city,
          state: transformed.state,
          businessPurpose: transformed.businessPurpose,
        },
        OPENROUTER_API_KEY!
      );

      // Check for spin-off enrichment
      const enrichment = getSpinoffEnrichment(company.name);
      const flags = [...llmResult.flags];
      let triage = llmResult.triage;

      if (enrichment) {
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

      // Update counts and display
      if (triage === "green") {
        greenCount++;
        console.log("🟢");
      } else if (triage === "unclear") {
        unclearCount++;
        console.log("🟡");
      } else {
        redCount++;
        console.log("🔴");
      }

      // Rate limiting: 400ms between LLM calls
      if (i < rawCompanies.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (error) {
      console.log("❌ Error");
      console.error(`  Failed to triage: ${error}`);
    }

    // Progress summary every 50 companies
    if ((i + 1) % 50 === 0) {
      console.log(`\n📊 Progress: ${greenCount} 🟢 | ${unclearCount} 🟡 | ${redCount} 🔴\n`);
    }
  }

  // 3. Sort: green first, then unclear, then red
  const triageOrder: Record<TriageCategory, number> = {
    green: 0,
    unclear: 1,
    red: 2,
  };

  triagedStartups.sort((a, b) => {
    const orderDiff = triageOrder[a.triage] - triageOrder[b.triage];
    if (orderDiff !== 0) return orderDiff;
    const aGreen = a.flags.filter((f) => f.type === "green").length;
    const bGreen = b.flags.filter((f) => f.type === "green").length;
    return bGreen - aGreen;
  });

  // 4. Calculate stats
  const stats = {
    green: triagedStartups.filter((s) => s.triage === "green").length,
    unclear: triagedStartups.filter((s) => s.triage === "unclear").length,
    red: triagedStartups.filter((s) => s.triage === "red").length,
  };

  // 5. Save to cache
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

  const duration = Math.round((Date.now() - startTime) / 1000);

  // 6. Final summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ COMPLETE!\n");
  console.log(`⏱️  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log(`📊 Total companies: ${triagedStartups.length}`);
  console.log(`   🟢 Green (interesting): ${stats.green}`);
  console.log(`   🟡 Unclear (review): ${stats.unclear}`);
  console.log(`   🔴 Red (unlikely): ${stats.red}`);
  console.log(`\n💾 Saved to: ${cachePath}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
