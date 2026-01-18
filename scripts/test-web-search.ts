import fs from "fs";
import dotenv from "dotenv";
import type { CacheData, TriageCategory, Flag } from "../lib/types";

dotenv.config({ path: ".env.local" });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Use :online suffix to enable web search
const MODEL = "google/gemini-3-flash-preview:online";

const TRIAGE_PROMPT_WITH_SEARCH = `Du bist ein erfahrener VC-Analyst bei Mätch VC (Stuttgart). Mätch investiert ausschließlich in:
- Industrial Deep-Tech (Sensoren, Robotik, Automation, Fertigung)
- Sustainability (Cleantech, Energie, Kreislaufwirtschaft)
- Enterprise Software mit technischer Tiefe (NICHT generische SaaS)

WICHTIG: Nutze Web-Suche um mehr über dieses Unternehmen herauszufinden! Suche nach:
- Unternehmenswebsite
- LinkedIn Profile der Gründer
- Pressemitteilungen oder News
- Produktinformationen

Triagiere dieses Unternehmen:

Name: {name}
Stadt: {city}
Handelsregister-Gegenstand: {purpose}

═══════════════════════════════════════════════════════════════
KATEGORIEN
═══════════════════════════════════════════════════════════════

🟢 INTERESSANT (selten - vielleicht 1 von 10)
Nur wenn ALLE diese Kriterien erfüllt sind:
- Eigenes Hardware-Produkt (Sensor, Gerät, Maschine, Chip) ODER
- Echte technische Innovation (neuer Algorithmus, Verfahren, Material) ODER
- Deeptech-Software mit klarer technischer Tiefe (ML-Infrastruktur, Simulation, CAD)
- UND: Klarer Anwendungsbereich genannt (Automotive, Medizin, Fertigung, Energie, etc.)
- UND: Fokus auf Entwicklung/Produktion, NICHT auf Dienstleistungen

🟡 UNKLAR (häufig)
- Könnte interessant sein, aber zu wenig Informationen
- Mix aus Produkt und Dienstleistung
- Branche passt, aber keine Produktspezifik

🔴 UNWAHRSCHEINLICH (häufig)
- Holding, Vermögensverwaltung, Beteiligungen
- Beratung, Consulting, Agentur
- IT-Dienstleistungen, Implementierung
- Handel, Import/Export, Vertrieb (ohne eigene Entwicklung)
- Generische SaaS (HR, Marketing, Sales)
- Energie-Installation (PV-Montage)

═══════════════════════════════════════════════════════════════
ANTWORTFORMAT
═══════════════════════════════════════════════════════════════

Antworte NUR mit diesem JSON, nichts anderes:
{
  "triage": "green" | "unclear" | "red",
  "flags": [
    {"type": "green", "text": "Positives Signal"},
    {"type": "red", "text": "Negatives Signal"}
  ],
  "webFindings": "Kurze Zusammenfassung was du online gefunden hast (1-2 Sätze)"
}

Maximal 3 Flags.`;

interface WebSearchResult {
  triage: TriageCategory;
  flags: Flag[];
  webFindings: string;
}

async function triageWithWebSearch(
  company: { name: string; city: string; businessPurpose: string },
  apiKey: string
): Promise<WebSearchResult> {
  const prompt = TRIAGE_PROMPT_WITH_SEARCH
    .replace("{name}", company.name)
    .replace("{city}", company.city)
    .replace("{purpose}", company.businessPurpose);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://maxfor-match.vercel.app",
      "X-Title": "Max for Mätch - Web Search Test",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // Log the raw response for debugging
  console.log("\n  Raw response:", content.substring(0, 200) + "...");

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    triage: ["green", "unclear", "red"].includes(result.triage) ? result.triage : "unclear",
    flags: Array.isArray(result.flags) ? result.flags : [],
    webFindings: result.webFindings || "Keine Web-Ergebnisse",
  };
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const cachePath = "/Users/maxhenkes/Desktop/Programms/MaxforMätch/data/cache.json";
  const data: CacheData = JSON.parse(fs.readFileSync(cachePath, "utf-8"));

  // Pick 5 companies: 2 green, 2 unclear, 1 red for comparison
  const greenCompanies = data.startups.filter(s => s.triage === "green").slice(0, 2);
  const unclearCompanies = data.startups.filter(s => s.triage === "unclear").slice(0, 2);
  const redCompanies = data.startups.filter(s => s.triage === "red").slice(0, 1);

  const testCompanies = [...greenCompanies, ...unclearCompanies, ...redCompanies];

  console.log("Testing web search on 5 companies...\n");
  console.log("=" .repeat(70));

  for (const company of testCompanies) {
    console.log(`\n📍 ${company.name} (${company.city})`);
    console.log(`   Current triage: ${company.triage === "green" ? "🟢" : company.triage === "unclear" ? "🟡" : "🔴"} ${company.triage}`);
    console.log(`   Purpose: ${company.businessPurpose.substring(0, 100)}...`);

    try {
      const result = await triageWithWebSearch(
        {
          name: company.name,
          city: company.city,
          businessPurpose: company.businessPurpose,
        },
        OPENROUTER_API_KEY
      );

      const newEmoji = result.triage === "green" ? "🟢" : result.triage === "unclear" ? "🟡" : "🔴";
      console.log(`\n   NEW triage: ${newEmoji} ${result.triage}`);
      console.log(`   Web findings: ${result.webFindings}`);
      console.log(`   Flags:`);
      for (const flag of result.flags) {
        const flagEmoji = flag.type === "green" ? "  ✅" : flag.type === "red" ? "  ❌" : "  ⚠️";
        console.log(`${flagEmoji} ${flag.text}`);
      }

      // Check if triage changed
      if (result.triage !== company.triage) {
        console.log(`\n   ⚡ TRIAGE CHANGED: ${company.triage} → ${result.triage}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }

    console.log("\n" + "-".repeat(70));

    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n✅ Test complete!");
}

main().catch(console.error);
