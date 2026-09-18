import { getSessionUser } from "@/lib/auth";
import { getAttempt, createInProgressAttempt, saveAnswer, finishAttempt, type AttemptRow } from "@/lib/attempts";
import { generateQuestionSet, gradeAttempt, stripForClient, type QuestionInstance, type AnswerRecord } from "@/lib/game";
import { LEVELS } from "@/lib/levelConfig";

export function parseLevel(raw: string): 1 | 2 | 3 | null {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export async function requireStudent() {
  const user = await getSessionUser();
  if (!user) return { error: "No autenticado.", status: 401 as const };
  return { user };
}

export async function checkPrerequisite(userId: string, level: 1 | 2 | 3): Promise<string | null> {
  if (level === 1) return null;
  const prev = await getAttempt(userId, level - 1);
  if (!prev || prev.status === "in_progress") {
    return `Debes completar el Nivel ${level - 1} antes de comenzar el Nivel ${level}.`;
  }
  return null;
}

export function questionsFromAttempt(attempt: AttemptRow): QuestionInstance[] {
  return JSON.parse(attempt.questions_json || "[]");
}

export function answersFromAttempt(attempt: AttemptRow): AnswerRecord[] {
  return JSON.parse(attempt.answers_json || "[]");
}

export function remainingMs(attempt: AttemptRow, level: 1 | 2 | 3): number {
  const cfg = LEVELS[level];
  if (!attempt.started_at) return cfg.timeLimitMs;
  const elapsed = Date.now() - new Date(attempt.started_at).getTime();
  return Math.max(0, cfg.timeLimitMs - elapsed);
}

export async function startOrResumeLevel(userId: string, level: 1 | 2 | 3) {
  const cfg = LEVELS[level];
  let attempt = await getAttempt(userId, level);

  if (!attempt) {
    const questions = generateQuestionSet(level);
    attempt = await createInProgressAttempt(userId, level, questions);
  }

  if (attempt.status !== "in_progress") {
    return {
      status: attempt.status,
      score: attempt.score,
      durationMs: attempt.duration_ms,
      finished: true as const,
    };
  }

  const remaining = remainingMs(attempt, level);
  if (remaining <= 0) {
    const result = await autoFinish(attempt, level);
    return { ...result, finished: true as const };
  }

  const questions = questionsFromAttempt(attempt);
  const answers = answersFromAttempt(attempt);
  return {
    finished: false as const,
    attemptId: attempt.id,
    levelName: cfg.name,
    timeLimitMs: cfg.timeLimitMs,
    remainingMs: remaining,
    questions: questions.map(stripForClient),
    answers,
  };
}

export async function autoFinish(attempt: AttemptRow, level: 1 | 2 | 3) {
  const cfg = LEVELS[level];
  const questions = questionsFromAttempt(attempt);
  const answers = answersFromAttempt(attempt);
  const elapsed = attempt.started_at ? Date.now() - new Date(attempt.started_at).getTime() : cfg.timeLimitMs;
  const durationMs = Math.min(elapsed, cfg.timeLimitMs);
  const status = elapsed >= cfg.timeLimitMs ? "completed_timeout" : "completed_in_time";
  const { score } = gradeAttempt(questions, answers, level);
  await finishAttempt(attempt.id, status, score, durationMs, answers);
  return { status, score, durationMs };
}
