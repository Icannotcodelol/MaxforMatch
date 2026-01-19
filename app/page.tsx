"use client";

import { useState, useEffect, useMemo } from "react";
import { FilterBar } from "@/components/FilterBar";
import { StartupCard } from "@/components/StartupCard";
import { Header } from "@/components/Header";
import { InfoPopup } from "@/components/InfoPopup";
import type { Startup, FilterState, CacheData } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";

export default function Home() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [stats, setStats] = useState({ green: 0, unclear: 0, red: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/data");
        const data: CacheData = await res.json();
        setStartups(data.startups || []);
        setLastUpdated(data.lastUpdated);
        setStats(data.stats || { green: 0, unclear: 0, red: 0 });
      } catch (error) {
        console.error("Failed to load startups:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredStartups = useMemo(() => {
    const filtered = startups.filter((startup) => {
      // Triage filter
      if (filters.triageFilter !== "all" && startup.triage !== filters.triageFilter) {
        return false;
      }

      // Search
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesName = startup.name.toLowerCase().includes(search);
        const matchesPurpose = startup.businessPurpose.toLowerCase().includes(search);
        const matchesCity = startup.city.toLowerCase().includes(search);
        if (!matchesName && !matchesPurpose && !matchesCity) return false;
      }

      // Only with green flags
      if (filters.showOnlyWithGreenFlags) {
        const hasGreenFlags = startup.flags.some((f) => f.type === "green");
        if (!hasGreenFlags) return false;
      }

      // University only
      if (filters.universityOnly) {
        const hasUniFlag = startup.flags.some(
          (f) => f.type === "green" && f.category === "Standort"
        );
        if (!hasUniFlag && !startup.universityAffiliation) return false;
      }

      // EXIST only
      if (filters.existOnly && !startup.existProject) return false;

      return true;
    });

    // Apply sorting
    if (filters.sortBy === "newest") {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.registrationDate).getTime();
        const dateB = new Date(b.registrationDate).getTime();
        return dateB - dateA; // Newest first
      });
    }

    return filtered;
  }, [startups, filters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F2EF]">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg h-48 animate-pulse bg-neutral-100"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EF]">
      <Header companyCount={startups.length} lastUpdated={lastUpdated} />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          stats={stats}
          filteredCount={filteredStartups.length}
        />

        {filteredStartups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">Keine Unternehmen entsprechen deinen Filtern</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStartups.map((startup) => (
              <StartupCard key={startup.id} startup={startup} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-100 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <p className="text-xs text-neutral-400">
            Entwickelt von Max Henkes für Mätch VC
          </p>
        </div>
      </footer>

      <InfoPopup />
    </div>
  );
}
