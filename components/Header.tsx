interface HeaderProps {
  companyCount?: number;
  lastUpdated?: string | null;
}

export function Header({ companyCount, lastUpdated }: HeaderProps) {
  return (
    <header className="border-b border-neutral-100">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">
              Max for Mätch
            </h1>
            <p className="text-xs text-neutral-400">
              Deep-Tech Startup Entdeckung
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-400">
            {companyCount !== undefined && (
              <span className="tabular-nums">
                {companyCount} Unternehmen
              </span>
            )}
            {lastUpdated && (
              <span>
                Aktualisiert {formatRelativeTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}
