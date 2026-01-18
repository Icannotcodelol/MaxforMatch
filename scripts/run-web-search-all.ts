import fs from "fs";
import dotenv from "dotenv";
import type { CacheData, TriageCategory, Flag } from "../lib/types";

dotenv.config({ path: ".env.local" });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview:online";

const TRIAGE_PROMPT_WITH_SEARCH = `Du bist ein erfahrener VC-Analyst bei Mätch VC (Stuttgart). Mätch investiert ausschließlich in:
- Industrial Deep-Tech (Sensoren, Robotik, Automation, Fertigung)
- Sustainability (Cleantech, Energie, Kreislaufwirtschaft)
- Enterprise Software mit technischer Tiefe (NICHT generische SaaS)

Triagiere dieses Unternehmen:

Name: {name}
Stadt: {city}
Handelsregister-Gegenstand: {purpose}

═══════════════════════════════════════════════════════════════
WEB-RECHERCHE
═══════════════════════════════════════════════════════════════

Suche nach: "{name} {city}"

SUCHE NACH (in dieser Reihenfolge):
1. Unternehmenswebsite → Was ist das tatsächliche Produkt/Service?
2. Pressemitteilungen, News, Startup-Datenbanken (Crunchbase, Dealroom, Startupdetector, Gründerszene)
3. Wissenschaftliche Publikationen oder Patente der Gründer
4. Förderungen (EXIST, BMBF, EU-Grants)

HINWEIS: LinkedIn ist oft nicht abrufbar – überspringe es falls blockiert.

WIE WEB-FINDINGS DIE TRIAGE BEEINFLUSSEN:
- Website zeigt konkretes Hardware-Produkt oder technische Details → tendiere zu 🟢
- Website zeigt "Wir beraten Unternehmen...", "Agentur", "Workshops" → 🔴
- Gründer haben PhD in relevantem Feld, kommen von Fraunhofer/Max-Planck/Uni/Bosch/Siemens → 🟢 Signal
- Fraunhofer Spin-off oder Uni Spin-off → starkes 🟢 Signal
- EXIST-Förderung oder andere Forschungsförderung gefunden → starkes 🟢 Signal
- Keine Website gefunden → NICHT automatisch negativ (kann Stealth oder sehr früh sein)
- Website zeigt etwas anderes als der Handelsregister-Gegenstand → VERTRAUE DER WEBSITE

═══════════════════════════════════════════════════════════════
KATEGORIEN
═══════════════════════════════════════════════════════════════

🟢 INTERESSANT (selten - vielleicht 1 von 10)
Mindestens eines dieser Kriterien:
- Eigenes Hardware-Produkt (Sensor, Gerät, Maschine, Chip, Messgerät)
- Echte technische Innovation (neuer Algorithmus, Verfahren, Material, Prozess)
- Deep-Tech-Software (ML-Infrastruktur, Simulation, CAD/CAM, Robotik-Steuerung, Embedded Systems)
- Biotech/Medtech mit eigenem Produkt (Diagnostik, Therapeutika, Medizingerät)

UND:
- Klarer Anwendungsbereich (Automotive, Medizin, Fertigung, Energie, Aerospace, etc.)
- Fokus auf Entwicklung/Produktion/Forschung, NICHT auf Dienstleistungen

🟡 UNKLAR (häufig)
- Könnte interessant sein, aber zu wenig Informationen online
- Handelsregister klingt vielversprechend, aber keine Website zur Bestätigung
- Mix aus Produkt und Dienstleistung – unklar was der Fokus ist
- "Software" oder "KI" ohne Spezifik – könnte Deep-Tech sein, könnte Agentur sein

🔴 UNWAHRSCHEINLICH (häufig)
- Holding, Vermögensverwaltung, Beteiligungen
- Beratung, Consulting, Agentur, Workshops, Schulungen
- IT-Dienstleistungen, Implementierung, Systemintegration, Wartung
- Handel, Import/Export, Vertrieb ohne eigene Produktentwicklung
- Generische SaaS für nicht-technische Anwendungen (HR, Marketing, Sales, CRM, Retail)
- Energie-Installation, PV-Montage, Anlagenbetrieb (≠ Energie-Tech)
- Web-/App-Entwicklung als Dienstleistung

═══════════════════════════════════════════════════════════════
ENTSCHEIDUNGSREGELN (STRIKT)
═══════════════════════════════════════════════════════════════

1. IGNORIERE DEN FIRMENNAMEN
   - "KI", "AI", "Tech", "Innovation", "Digital" im Namen bedeutet NICHTS
   - "Deutsches Institut für..." mit vagem Gegenstand = wahrscheinlich Consulting
   - Bewerte NUR anhand von Gegenstand + Web-Findings

2. DIENSTLEISTUNG DOMINIERT
   - Gegenstand enthält "Beratung" + "Entwicklung" → 🔴 (Dienstleister mit Tech-Anstrich)
   - Gegenstand enthält "Workshops", "Schulungen", "Trainings" → 🔴
   - Gegenstand enthält "Implementierung", "Inbetriebnahme", "Integration" → 🔴
   - Website zeigt Dienstleistungsfokus → 🔴 (auch wenn Gegenstand anders klingt)

3. HOLDINGS/SHELLS IMMER ROT
   - "Halten und Verwalten von Beteiligungen" → 🔴
   - "Verwaltung eigenen Vermögens" → 🔴
   - "Erwerb und Veräußerung von Anteilen" → 🔴

4. GENERISCHE SOFTWARE ≠ DEEP-TECH
   - HR-Software, Recruiting, Personalmanagement → 🔴
   - CRM, Sales-Tools, Marketing-Automation → 🔴
   - Retail-Software, Kassensysteme, E-Commerce → 🔴
   - "Software für [Branche]" ohne technische Tiefe → 🔴

5. ECHTE DEEP-TECH-SOFTWARE ERFORDERT
   - Simulation, CAD/CAM, FEM, CFD → 🟢
   - ML-Infrastruktur, Training Pipelines, MLOps → 🟢
   - Robotik-Steuerung, Motion Planning, SLAM → 🟢
   - Embedded Systems, Firmware, Real-Time-Systems → 🟢
   - Computer Vision für industrielle Anwendung → 🟢
   - Sensorik-Software, Signalverarbeitung → 🟢

6. ENERGIE: TECH VS. INSTALLATION
   - "Entwicklung von Batteriespeichern/Brennstoffzellen/Wechselrichtern" → 🟢
   - "Installation von PV-Anlagen", "Betrieb von Solarparks" → 🔴
   - "Energieberatung" → 🔴

7. WEB-FINDINGS ÜBERSCHREIBEN HANDELSREGISTER
   - Wenn die Website eindeutig zeigt was sie machen, vertraue der Website
   - Beispiel: HR sagt "Softwareentwicklung", Website zeigt "Wir bauen LIDAR-Sensoren" → 🟢

═══════════════════════════════════════════════════════════════
BEISPIELE
═══════════════════════════════════════════════════════════════

BEISPIEL 1:
Name: "Nodar Sensor GmbH"
Gegenstand: "Entwicklung im Bereich 3D-Sensortechnologie für Automotive"
Web: Website zeigt eigenes LIDAR-Produkt für autonomes Fahren
→ 🟢 (Konkretes Hardware-Produkt, klarer Anwendungsbereich, Entwicklungsfokus)

BEISPIEL 2:
Name: "DIIF-KI Deutsches Institut für Künstliche Intelligenz GmbH"
Gegenstand: "Forschung im Bereich KI und angrenzender Disziplinen"
Web: Website zeigt "KI-Beratung und Workshops für Unternehmen"
→ 🔴 (Trotz beeindruckendem Namen: Website entlarvt es als Beratung/Schulung)

BEISPIEL 3:
Name: "TechSolutions GmbH"
Gegenstand: "Entwicklung von Sensoren für industrielle Messtechnik"
Web: Keine Website gefunden
→ 🟡 (Gegenstand klingt vielversprechend, aber ohne Web-Bestätigung unklar)

BEISPIEL 4:
Name: "work.mate GmbH"
Gegenstand: "Entwicklung und Vertrieb von Software für den Personalbereich"
Web: Website zeigt HR-Software für Mittelstand
→ 🔴 (HR-SaaS ist kein Deep-Tech, auch wenn es "Entwicklung" enthält)

BEISPIEL 5:
Name: "InnoKI GmbH"
Gegenstand: "Entwicklung von KI-Lösungen sowie Beratung und Workshops"
Web: Website bestätigt Consulting-Fokus
→ 🔴 (Mix aus Entwicklung + Beratung/Workshops = Dienstleister)

═══════════════════════════════════════════════════════════════
ANTWORTFORMAT
═══════════════════════════════════════════════════════════════

Antworte AUSSCHLIESSLICH mit diesem JSON, kein anderer Text:
{
  "triage": "green" | "unclear" | "red",
  "flags": [
    {"type": "green" | "red", "text": "Spezifisches Signal aus Gegenstand oder Web-Recherche"}
  ],
  "webFindings": "Was du online gefunden hast: Website-Inhalt, News, oder 'Keine relevanten Informationen gefunden'"
}

REGELN FÜR FLAGS:
- Maximal 3 Flags
- Flags müssen SPEZIFISCH sein (nicht "Klingt interessant" sondern "Eigenes Hardware-Produkt: 3D-Sensoren")
- Zitiere konkrete Begriffe aus dem Gegenstand oder der Website
- Bei 🟡 sollten sowohl green als auch red Flags vorhanden sein, die die Unsicherheit erklären`;

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
      "X-Title": "Max for Mätch - Web Search",
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

  console.log(`\nStarting web search triage for ${data.startups.length} companies...\n`);
  console.log("Estimated cost: ~$5.60\n");
  console.log("=".repeat(70));

  let processed = 0;
  let changed = 0;
  let errors = 0;

  const oldStats = { ...data.stats };

  for (const startup of data.startups) {
    processed++;
    const oldTriage = startup.triage;

    process.stdout.write(`[${processed}/${data.startups.length}] ${startup.name.substring(0, 40).padEnd(40)} `);

    try {
      const result = await triageWithWebSearch(
        {
          name: startup.name,
          city: startup.city,
          businessPurpose: startup.businessPurpose,
        },
        OPENROUTER_API_KEY
      );

      // Update startup data
      startup.triage = result.triage;
      startup.flags = result.flags;
      (startup as any).webFindings = result.webFindings;
      startup.lastUpdated = new Date().toISOString();

      const emoji = result.triage === "green" ? "🟢" : result.triage === "unclear" ? "🟡" : "🔴";

      if (result.triage !== oldTriage) {
        changed++;
        const oldEmoji = oldTriage === "green" ? "🟢" : oldTriage === "unclear" ? "🟡" : "🔴";
        console.log(`${oldEmoji}→${emoji} CHANGED`);
      } else {
        console.log(`${emoji}`);
      }

      // Save every 10 companies
      if (processed % 10 === 0) {
        // Recalculate stats
        data.stats = {
          green: data.startups.filter(s => s.triage === "green").length,
          unclear: data.startups.filter(s => s.triage === "unclear").length,
          red: data.startups.filter(s => s.triage === "red").length,
        };
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
        console.log(`   [Saved checkpoint at ${processed}]`);
      }

      // Rate limit - 800ms between requests
      await new Promise(r => setTimeout(r, 800));

    } catch (error) {
      errors++;
      console.log(`❌ Error: ${(error as Error).message.substring(0, 50)}`);

      // Mark as unclear on error
      startup.triage = "unclear";
      startup.flags = [{ type: "yellow", text: "Web-Analyse fehlgeschlagen" }];

      // Wait longer on error (might be rate limit)
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Final save
  data.stats = {
    green: data.startups.filter(s => s.triage === "green").length,
    unclear: data.startups.filter(s => s.triage === "unclear").length,
    red: data.startups.filter(s => s.triage === "red").length,
  };
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));

  console.log("\n" + "=".repeat(70));
  console.log("\nDone!");
  console.log(`Processed: ${processed}`);
  console.log(`Changed: ${changed}`);
  console.log(`Errors: ${errors}`);
  console.log("\nOld stats:", oldStats);
  console.log("New stats:", data.stats);
  console.log("\nCache saved to:", cachePath);
}

main().catch(console.error);
