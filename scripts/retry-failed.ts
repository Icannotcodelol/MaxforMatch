import fs from "fs";
import path from "path";
import { triageWithLLMRetry } from "../lib/llm-scoring";
import type { CacheData } from "../lib/types";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function main() {
  const cachePath = path.join(process.cwd(), "data", "cache.json");
  const data: CacheData = JSON.parse(fs.readFileSync(cachePath, "utf-8"));

  const failedCompanies = data.startups.filter(s =>
    s.flags.some(f => f.text.includes("fehlgeschlagen"))
  );

  console.log("Re-triaging " + failedCompanies.length + " failed companies...\n");

  for (const startup of failedCompanies) {
    console.log("Triaging: " + startup.name);

    try {
      const result = await triageWithLLMRetry(
        {
          name: startup.name,
          legalForm: startup.legalForm,
          city: startup.city,
          state: startup.state,
          businessPurpose: startup.businessPurpose,
        },
        OPENROUTER_API_KEY!
      );

      const index = data.startups.findIndex(s => s.id === startup.id);
      if (index !== -1) {
        data.startups[index].triage = result.triage;
        data.startups[index].flags = result.flags;
        const emoji = result.triage === "green" ? "🟢" : result.triage === "unclear" ? "🟡" : "🔴";
        console.log("  -> " + emoji + " " + result.triage);
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.log("  -> ❌ Failed again");
    }
  }

  // Recalculate stats
  data.stats = {
    green: data.startups.filter(s => s.triage === "green").length,
    unclear: data.startups.filter(s => s.triage === "unclear").length,
    red: data.startups.filter(s => s.triage === "red").length,
  };

  // Save
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
  console.log("\nSaved updated cache.json");
  console.log("Stats: " + data.stats.green + " green | " + data.stats.unclear + " unclear | " + data.stats.red + " red");
}

main().catch(console.error);
