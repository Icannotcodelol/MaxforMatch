import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CacheData } from "@/lib/types";

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), "data", "cache.json");

    if (!fs.existsSync(cachePath)) {
      // Return empty data if cache doesn't exist yet
      const emptyData: CacheData = {
        lastUpdated: new Date().toISOString(),
        totalCompanies: 0,
        stats: { green: 0, unclear: 0, red: 0 },
        startups: [],
      };
      return NextResponse.json(emptyData);
    }

    const cacheContent = fs.readFileSync(cachePath, "utf-8");
    const data: CacheData = JSON.parse(cacheContent);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading cache:", error);
    return NextResponse.json(
      { error: "Failed to read data" },
      { status: 500 }
    );
  }
}
