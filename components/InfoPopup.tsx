"use client";

import { useState, useEffect, useRef } from "react";

export function InfoPopup() {
  const [isExpanded, setIsExpanded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={popupRef}>
      {isExpanded ? (
        <div
          className="bg-white rounded-xl shadow-xl border border-neutral-200 p-5 w-[33vw] min-w-[300px] max-w-[500px] max-h-[80vh] overflow-y-auto transition-all duration-200"
        >
          <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
            <p>
              Zunächst möchte ich mich herzlich dafür bedanken, dass ihr euch die Zeit nehmt, meine Bewerbung zu lesen und diese Seite zu öffnen.
            </p>
            <p>
              Mir ist bewusst, dass sich eure Ausschreibungen in erster Linie an MINT-Studierende richten, und nicht unbedingt an einen klassischen BWL-Studenten. Dennoch bin ich überzeugt, dass ein Praktikum bei Mätch VC für beide Seiten einen außergewöhnlichen Mehrwert bieten kann.
            </p>
            <p>
              Nachdem ich eure Ausschreibung gelesen hatte, war ich von der Idee, bei euch zu arbeiten, so begeistert, dass ich mich unmittelbar daran gemacht habe, diese Webseite zu bauen. Sie soll euch, und eurem Team konkret zeigen, wie groß meine Motivation und Eigeninitiative sind, Teil von Mätch VC zu werden.
            </p>
            <p>
              Die Seite nutzt eine Handelsregister-API, um aktuelle Unternehmensneugründungen anhand relevanter WZ2025-Codes zu filtern. Anschließend wird jede Firma über einen API-Call an das Gemini-3-Flash-Modell analysiert und speziell im Hinblick auf euren Deep-Tech-Investmentfokus eingeordnet.
            </p>
            <p>
              Mir ist natürlich bewusst, dass dieses kleine Mini-Projekt, das innerhalb eines Tages entstanden ist, keinen vollwertigen VC-Analyseprozess ersetzt (man sollte auf jeden Fall Filter für Firmen etc. einbauen). Es ist vielmehr als spielerische, aber ernst gemeinte Demonstration gedacht, aber vielleicht ja sogar als Tool, das für euch in Ansätzen tatsächlich nützlich sein könnte, falls ich mein Praktikum bei euch absolvieren darf.
            </p>
            <p>
              In der Umsetzung war ich durch meine eigenen Ressourcen als student natürlich ein bisschen limitiert. Meine nächsten gedanklichen Schritte wären unter anderem gewesen, gezielt nach Stealth-Startups über LinkedIn-Profile zu suchen, weitere technische Signale einzubeziehen und für jede positiv indizierte Firma eine deutlich tiefere Due Diligence durchzuführen.
            </p>
            <p>
              Die hier dargestellten Ergebnisse basieren ausschließlich auf der Formulierung des jeweiligen Handelsregistereintrags, insbesondere auf der dort beschriebenen Geschäftstätigkeit der GmbH. Sie stellen somit lediglich einen ersten, sehr frühen Filter dar; nicht mehr, aber auch nicht weniger.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="bg-white rounded-lg shadow-lg border border-neutral-200 px-4 py-6 cursor-pointer hover:shadow-xl transition-all duration-200"
          onClick={() => setIsExpanded(true)}
        >
          <p className="text-neutral-600 text-sm">Persönliche Notiz von Max</p>
        </div>
      )}
    </div>
  );
}
