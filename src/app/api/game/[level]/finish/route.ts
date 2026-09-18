import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAttempt } from "@/lib/attempts";
import { parseLevel, autoFinish } from "@/lib/gameServer";

export async function POST(_req: Request, context: { params: Promise<{ level: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { level: levelRaw } = await context.params;
  const level = parseLevel(levelRaw);
  if (!level) return NextResponse.json({ error: "Nivel inválido." }, { status: 400 });

  const attempt = await getAttempt(user.id, level);
  if (!attempt) return NextResponse.json({ error: "No has iniciado este nivel." }, { status: 404 });

  if (attempt.status !== "in_progress") {
    return NextResponse.json({ finished: true, status: attempt.status, score: attempt.score, durationMs: attempt.duration_ms });
  }

  const result = await autoFinish(attempt, level);
  return NextResponse.json({ finished: true, ...result });
}
