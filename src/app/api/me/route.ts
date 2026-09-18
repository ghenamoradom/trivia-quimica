import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserAttempts } from "@/lib/attempts";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  const attempts = await getUserAttempts(user.id);
  const summary = [1, 2, 3].map((level) => {
    const a = attempts.find((x) => x.level === level);
    return {
      level,
      status: a?.status || "not_started",
      score: a?.score ?? null,
    };
  });
  return NextResponse.json({ user, levels: summary });
}
