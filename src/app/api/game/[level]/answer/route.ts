import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAttempt, saveAnswer } from "@/lib/attempts";
import { parseLevel, questionsFromAttempt, answersFromAttempt, remainingMs, autoFinish } from "@/lib/gameServer";
import type { AnswerRecord } from "@/lib/game";

export async function POST(req: NextRequest, context: { params: Promise<{ level: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { level: levelRaw } = await context.params;
  const level = parseLevel(levelRaw);
  if (!level) return NextResponse.json({ error: "Nivel inválido." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const slot = Number(body?.slot);
  const selectedIndex = body?.selectedIndex === null ? null : Number(body?.selectedIndex);
  if (!slot) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const attempt = await getAttempt(user.id, level);
  if (!attempt) return NextResponse.json({ error: "No has iniciado este nivel." }, { status: 404 });
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Este nivel ya fue finalizado.", finished: true, status: attempt.status, score: attempt.score }, { status: 409 });
  }

  const remaining = remainingMs(attempt, level);
  if (remaining <= 0) {
    const result = await autoFinish(attempt, level);
    return NextResponse.json({ finished: true, ...result });
  }

  const questions = questionsFromAttempt(attempt);
  const q = questions.find((x) => x.slot === slot);
  if (!q) return NextResponse.json({ error: "Pregunta no encontrada." }, { status: 404 });

  const correct = selectedIndex !== null && selectedIndex === q.correctIndex;
  const pointsEarned = correct ? q.points : 0;

  const answers = answersFromAttempt(attempt);
  const record: AnswerRecord = {
    slot,
    selectedIndex,
    correct,
    pointsEarned,
    answeredAt: new Date().toISOString(),
  };
  const nextAnswers = [...answers.filter((a) => a.slot !== slot), record];
  await saveAnswer(attempt.id, nextAnswers);

  const runningScore = nextAnswers.reduce((sum, a) => sum + a.pointsEarned, 0);

  return NextResponse.json({
    finished: false,
    correct,
    correctIndex: q.correctIndex,
    pointsEarned,
    runningScore,
    remainingMs: remainingMs(attempt, level),
  });
}
