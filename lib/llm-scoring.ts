import type { LLMTriageResult, Flag, TriageCategory } from "./types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const TRIAGE_PROMPT = `Du bist ein erfahrener VC-Analyst bei Mätch VC (Stuttgart). Mätch investiert ausschließlich in:
- Industrial Deep-Tech (Sensoren, Robotik, Automation, Fertigung)
- Sustainability (Cleantech, Energie, Kreislaufwirtschaft)
- Enterprise Software mit technischer Tiefe (NICHT generische SaaS)

Triagiere dieses Unternehmen:

Name: {name}
Gegenstand: {purpose}

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

Beispiele für 🟢:
- "Entwicklung und Produktion von LIDAR-Sensoren für autonome Fahrzeuge"
- "Herstellung von Batteriespeichersystemen für industrielle Anwendungen"
- "Entwicklung von Messgeräten für die Halbleiterfertigung"

🟡 UNKLAR (häufig)
- Könnte interessant sein, aber Gegenstand ist zu vage
- Mix aus Produkt und Dienstleistung
- "Software" ohne klaren technischen Tiefgang
- Branche passt, aber keine Produktspezifik

Beispiele für 🟡:
- "Entwicklung von Softwarelösungen im Bereich Künstliche Intelligenz"
- "Entwicklung und Vertrieb von Automatisierungslösungen"

🔴 UNWAHRSCHEINLICH (häufig)
- Holding, Vermögensverwaltung, Beteiligungen
- Beratung, Consulting, Agentur
- IT-Dienstleistungen, Implementierung, Wartung
- Workshops, Schulungen, Trainings
- Handel, Import/Export, Vertrieb (ohne eigene Entwicklung)
- Installation, Montage, Inbetriebnahme
- Generische SaaS für nicht-technische Branchen (HR, Marketing, Sales, Retail)
- Energie-Installation (PV-Montage, Anlagenbetrieb)

═══════════════════════════════════════════════════════════════
ENTSCHEIDUNGSREGELN (STRIKT BEFOLGEN)
═══════════════════════════════════════════════════════════════

1. IGNORIERE DEN FIRMENNAMEN KOMPLETT
   - "Deutsches Institut für KI" mit vagem Gegenstand = 🔴 oder 🟡
   - "XY GmbH" mit konkretem Hardware-Produkt = 🟢

2. DIENSTLEISTUNG SCHLÄGT PRODUKT
   - Enthält "Beratung" + "Entwicklung" → 🔴 (Dienstleister mit Tech-Anstrich)
   - Enthält "Workshops" oder "Schulungen" → 🔴
   - Enthält "Implementierung" oder "Inbetriebnahme" → 🔴
   - Enthält "IT-Dienstleistungen" → 🔴

3. HOLDINGS SIND IMMER ROT
   - "Halten und Verwalten von Beteiligungen" → 🔴
   - "Verwaltung eigenen Vermögens" → 🔴
   - "Erwerb und Veräußerung von Anteilen" → 🔴

4. GENERISCHE SOFTWARE IST NICHT DEEP-TECH
   - "Software für den Personalbereich" → 🔴 (HR SaaS, nicht deep-tech)
   - "Software für Kfz-Werkstätten" → 🔴 (Vertical SaaS, nicht deep-tech)
   - "Software für Einzelhandel" → 🔴
   - "CRM", "ERP", "Marketing-Software" → 🔴

5. DEEP-TECH SOFTWARE ERFORDERT TECHNISCHE TIEFE
   - Muss einen dieser Bereiche betreffen: Simulation, CAD/CAM, ML-Infrastruktur,
     Robotik-Steuerung, Embedded Systems, Halbleiter-Design, Bildverarbeitung für
     industrielle Anwendungen, Sensorik-Software
   - NICHT: Webapps, Mobile Apps, SaaS für Business-Prozesse

6. ENERGIE: UNTERSCHEIDE TECH VS. INSTALLATION
   - "Entwicklung von Batteriespeichersystemen" → 🟢 (Produkt)
   - "Installation von PV-Anlagen" → 🔴 (Handwerk)
   - "Betrieb von Energieparks" → 🔴 (Infrastruktur)

7. "INNOVATIVE LÖSUNGEN" = KEINE INFORMATION
   - Buzzwords ohne Substanz → 🟡 bestenfalls
   - "Innovative Softwarelösungen" → 🟡
   - "Modernste Technologien" → 🟡

8. KURZER GEGENSTAND = SKEPTISCH SEIN
   - Weniger als 100 Zeichen ohne Spezifik → 🟡 oder 🔴

═══════════════════════════════════════════════════════════════
ANTWORTFORMAT
═══════════════════════════════════════════════════════════════

Antworte NUR mit diesem JSON, nichts anderes:
{
  "triage": "green" | "unclear" | "red",
  "flags": [
    {"type": "green", "text": "Positives Signal (z.B. 'Konkretes Hardware-Produkt: Sensoren')"},
    {"type": "red", "text": "Negatives Signal (z.B. 'Enthält Beratungsdienstleistungen')"}
  ]
}

Maximal 3 Flags. Flags müssen spezifisch sein und auf den Gegenstand verweisen.`;

async function callOpenRouter(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://max-for-maetch.vercel.app",
      "X-Title": "Max for Mätch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export async function triageWithLLM(
  company: {
    name: string;
    legalForm: string;
    city: string;
    state: string;
    businessPurpose: string;
  },
  apiKey: string
): Promise<LLMTriageResult> {
  const prompt = TRIAGE_PROMPT
    .replace("{name}", company.name)
    .replace("{purpose}", company.businessPurpose);

  try {
    const response = await callOpenRouter(prompt, apiKey);

    // Extract JSON from response (may be wrapped in ```json)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate triage category
    const validTriage: TriageCategory[] = ["green", "unclear", "red"];
    const triage: TriageCategory = validTriage.includes(result.triage)
      ? result.triage
      : "unclear";

    // Parse flags
    const flags: Flag[] = [];
    if (Array.isArray(result.flags)) {
      for (const flag of result.flags) {
        if (flag.type && flag.text) {
          flags.push({
            type: ["green", "yellow", "red"].includes(flag.type) ? flag.type : "yellow",
            text: flag.text,
          });
        }
      }
    }

    return { triage, flags };
  } catch (error) {
    console.error(`LLM triage failed for ${company.name}:`, error);

    return {
      triage: "unclear",
      flags: [{ type: "yellow", text: "LLM-Analyse fehlgeschlagen" }],
    };
  }
}

export async function triageWithLLMRetry(
  company: {
    name: string;
    legalForm: string;
    city: string;
    state: string;
    businessPurpose: string;
  },
  apiKey: string,
  maxRetries: number = 3
): Promise<LLMTriageResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await triageWithLLM(company, apiKey);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(
          `Retry ${attempt + 1}/${maxRetries} for ${company.name}, waiting ${waitTime}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`All retries failed for ${company.name}:`, lastError);
  return {
    triage: "unclear",
    flags: [{ type: "yellow", text: "LLM-Analyse fehlgeschlagen" }],
  };
}
