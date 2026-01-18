"use client";

import type { Startup, Flag, TriageCategory } from "@/lib/types";

interface StartupCardProps {
  startup: Startup;
}

const triageConfig: Record<TriageCategory, { emoji: string; label: string; bg: string }> = {
  green: { emoji: "🟢", label: "Interessant", bg: "bg-emerald-50" },
  unclear: { emoji: "🟡", label: "Unklar", bg: "bg-amber-50" },
  red: { emoji: "🔴", label: "Unwahrscheinlich", bg: "bg-red-50" },
};

export function StartupCard({ startup }: StartupCardProps) {
  const config = triageConfig[startup.triage];

  // Group flags by type
  const greenFlags = startup.flags.filter((f) => f.type === "green");
  const yellowFlags = startup.flags.filter((f) => f.type === "yellow");
  const redFlags = startup.flags.filter((f) => f.type === "red");

  return (
    <div className={`rounded-lg p-5 border border-neutral-200 ${config.bg} transition-all duration-150 hover:shadow-md`}>
      {/* Kopfzeile: Name + Triage */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-medium text-neutral-900 leading-tight">
            {startup.name}
          </h3>
          <p className="text-sm text-neutral-500 mt-0.5">
            {startup.city}
            {startup.state && `, ${startup.state}`}
            <span className="mx-1.5 text-neutral-300">·</span>
            {formatDate(startup.registrationDate)}
          </p>
        </div>
        <span className="text-lg" title={config.label}>{config.emoji}</span>
      </div>

      {/* Unternehmensgegenstand - DER HELD */}
      <p className="text-sm text-neutral-700 leading-relaxed mb-4">
        {startup.businessPurpose}
      </p>

      {/* Flags */}
      {startup.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {greenFlags.map((flag, i) => (
            <FlagChip key={`g-${i}`} flag={flag} />
          ))}
          {yellowFlags.map((flag, i) => (
            <FlagChip key={`y-${i}`} flag={flag} />
          ))}
          {redFlags.map((flag, i) => (
            <FlagChip key={`r-${i}`} flag={flag} />
          ))}
        </div>
      )}

      {/* Badges (Spin-off enrichment) */}
      {startup.badges && startup.badges.length > 0 && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-200/50">
          {startup.badges.map((badge, i) => (
            <span
              key={i}
              className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Fußzeile */}
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-200/50">
        <span>{startup.registerType} {startup.registerNumber}</span>
        <span>{startup.legalForm}</span>
      </div>
    </div>
  );
}

function FlagChip({ flag }: { flag: Flag }) {
  const colorClasses = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border ${colorClasses[flag.type]}`}
      title={flag.category}
    >
      {flag.text}
    </span>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}
