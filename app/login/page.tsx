"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Falsches Passwort");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcfb] flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <h1 className="text-base font-semibold text-neutral-900">
            Max for Mätch
          </h1>
          <p className="text-xs text-neutral-400">
            Deep-Tech Startup Entdeckung
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-md
                         text-sm text-neutral-900 placeholder:text-neutral-400
                         focus:border-neutral-300 transition-colors"
              placeholder="Passwort"
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-neutral-900 hover:bg-neutral-800
                       rounded-md text-sm text-white font-medium
                       transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Weiter"}
          </button>
        </form>

        <p className="text-xs text-neutral-400 mt-8">
          Entwickelt von Max Henkes
        </p>
      </div>
    </div>
  );
}
