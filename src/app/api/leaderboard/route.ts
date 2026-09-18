import { NextRequest, NextResponse } from "next/server";
import { buildLeaderboard } from "@/lib/attempts";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const through = Number(searchParams.get("through") || 3) as 1 | 2 | 3;
  const wantsAll = searchParams.get("all") === "1";

  if (wantsAll) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  }

  const rows = await buildLeaderboard({ throughLevel: through });
  const limited = wantsAll ? rows : rows.slice(0, 10);
  return NextResponse.json({
    rows: limited.map((r, i) => ({ rank: i + 1, ...r })),
  });
}
