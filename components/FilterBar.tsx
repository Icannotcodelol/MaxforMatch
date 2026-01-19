"use client";

import type { FilterState, TriageCategory, SortOption } from "@/lib/types";

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  stats: {
    green: number;
    unclear: number;
    red: number;
  };
  filteredCount: number;
}

export function FilterBar({
  filters,
  onChange,
  stats,
  filteredCount,
}: FilterBarProps) {
  const totalCount = stats.green + stats.unclear + stats.red;

  const triageOptions: {
    value: TriageCategory | "all";
    label: string;
    count: number;
    emoji: string;
  }[] = [
    { value: "all", label: "Alle", count: totalCount, emoji: "" },
    { value: "green", label: "Interessant", count: stats.green, emoji: "🟢" },
    { value: "unclear", label: "Unklar", count: stats.unclear, emoji: "🟡" },
    { value: "red", label: "Unwahrscheinlich", count: stats.red, emoji: "🔴" },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "default", label: "Standard" },
    { value: "newest", label: "Nach Neusten" },
  ];

  const hasActiveFilters =
    filters.search ||
    filters.triageFilter !== "all" ||
    filters.sortBy !== "default";

  return (
    <div className="space-y-3 mb-6">
      {/* Suche */}
      <input
        type="text"
        placeholder="Suchen nach Name oder Gegenstand..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-md
                   text-sm text-neutral-900 placeholder:text-neutral-400
                   focus:border-neutral-400 focus:outline-none transition-colors"
      />

      {/* Triage-Tabs und Sortierung */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {triageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ ...filters, triageFilter: option.value })}
              className={`
                h-9 px-4 rounded-md text-sm font-medium transition-all
                ${
                  filters.triageFilter === option.value
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }
              `}
            >
              {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
              {option.label}
              <span className="ml-1.5 opacity-60">({option.count})</span>
            </button>
          ))}
        </div>

        {/* Sortierung */}
        <div className="flex gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ ...filters, sortBy: option.value })}
              className={`
                h-9 px-3 rounded-md text-sm font-medium transition-all
                ${
                  filters.sortBy === option.value
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Anzahl */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>
          {filteredCount} von {totalCount} Unternehmen
        </span>
        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                search: "",
                triageFilter: "all",
                showOnlyWithGreenFlags: false,
                universityOnly: false,
                existOnly: false,
                sortBy: "default",
              })
            }
            className="hover:text-neutral-600"
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
