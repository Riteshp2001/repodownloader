// app/api/trending/route.ts
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(
      "https://ghapi.huchen.dev/repositories?since=daily"
    );
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch trending repos" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
