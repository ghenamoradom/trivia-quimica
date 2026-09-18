import { all, one, run } from "./db";
import { courseGrade } from "./auth";
import crypto from "node:crypto";
import type { QuestionInstance, AnswerRecord } from "./game";

export type AttemptStatus = "in_progress" | "completed_in_time" | "completed_timeout";

export type AttemptRow = {
  id: string;
  user_id: string;
  level: number;
  status: AttemptStatus;
  score: number;
  duration_ms: number | null;
  started_at: string | null;
  finished_at: string | null;
  questions_json: string | null;
  answers_json: string | null;
};

export async function getAttempt(userId: string, level: number): Promise<AttemptRow | null> {
  return one<AttemptRow>("SELECT * FROM attempts WHERE user_id = $1 AND level = $2", [userId, level]);
}

export async function getUserAttempts(userId: string): Promise<AttemptRow[]> {
  return all<AttemptRow>("SELECT * FROM attempts WHERE user_id = $1 ORDER BY level ASC", [userId]);
}

export async function createInProgressAttempt(userId: string, level: number, questions: QuestionInstance[]): Promise<AttemptRow> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await run(
    `INSERT INTO attempts (id, user_id, level, status, score, duration_ms, started_at, finished_at, questions_json, answers_json)
     VALUES ($1,$2,$3,'in_progress',0,NULL,$4,NULL,$5,'[]')`,
    [id, userId, level, startedAt, JSON.stringify(questions)]
  );
  return (await one<AttemptRow>("SELECT * FROM attempts WHERE id = $1", [id]))!;
}

export async function saveAnswer(attemptId: string, answers: AnswerRecord[]) {
  await run("UPDATE attempts SET answers_json = $1 WHERE id = $2", [JSON.stringify(answers), attemptId]);
}

export async function finishAttempt(
  attemptId: string,
  status: AttemptStatus,
  score: number,
  durationMs: number,
  answers: AnswerRecord[]
) {
  await run(
    `UPDATE attempts SET status = $1, score = $2, duration_ms = $3, finished_at = $4, answers_json = $5 WHERE id = $6`,
    [status, score, durationMs, new Date().toISOString(), JSON.stringify(answers), attemptId]
  );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type LeaderRow = {
  userId: string;
  documentId: string;
  fullName: string;
  course: string;
  sex: string;
  totalScore: number;
  totalDurationMs: number;
  l1: { score: number; durationMs: number; status: string } | null;
  l2: { score: number; durationMs: number; status: string } | null;
  l3: { score: number; durationMs: number; status: string } | null;
  finishedAllLevels: boolean;
};

export async function buildLeaderboard(opts: { throughLevel?: 1 | 2 | 3 } = {}): Promise<LeaderRow[]> {
  const users = await all<{
    id: string;
    document_id: string;
    first_name: string;
    last_name1: string;
    last_name2: string;
    course: string;
    sex: string;
    role: string;
  }>("SELECT id, document_id, first_name, last_name1, last_name2, course, sex, role FROM users WHERE role = 'student'");

  const attempts = await all<AttemptRow>("SELECT * FROM attempts");
  const byUser = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const list = byUser.get(a.user_id) || [];
    list.push(a);
    byUser.set(a.user_id, list);
  }

  const throughLevel = opts.throughLevel ?? 3;

  const rows: LeaderRow[] = [];
  for (const u of users) {
    const uAttempts = byUser.get(u.id) || [];
    const get = (lvl: number) => uAttempts.find((a) => a.level === lvl) || null;
    const l1a = get(1);
    const l2a = get(2);
    const l3a = get(3);

    const isDone = (a: AttemptRow | null) => !!a && a.status !== "in_progress";

    const levelsToCount = [1, 2, 3].filter((l) => l <= throughLevel);
    const relevantAttempts = [l1a, l2a, l3a].filter((a, idx) => a && levelsToCount.includes(idx + 1));

    // Only include users who have at least finished the levels up to `throughLevel`
    const requiredDone = levelsToCount.every((l) => isDone(l === 1 ? l1a : l === 2 ? l2a : l3a));
    if (!requiredDone) continue;

    const totalScore = relevantAttempts.reduce((sum, a) => sum + (a?.score || 0), 0);
    const totalDurationMs = relevantAttempts.reduce((sum, a) => sum + (a?.duration_ms || 0), 0);

    rows.push({
      userId: u.id,
      documentId: u.document_id,
      fullName: `${u.first_name} ${u.last_name1} ${u.last_name2}`,
      course: u.course,
      sex: u.sex,
      totalScore,
      totalDurationMs,
      l1: l1a ? { score: l1a.score, durationMs: l1a.duration_ms || 0, status: l1a.status } : null,
      l2: l2a ? { score: l2a.score, durationMs: l2a.duration_ms || 0, status: l2a.status } : null,
      l3: l3a ? { score: l3a.score, durationMs: l3a.duration_ms || 0, status: l3a.status } : null,
      finishedAllLevels: isDone(l1a) && isDone(l2a) && isDone(l3a),
    });
  }

  rows.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.totalDurationMs !== b.totalDurationMs) return a.totalDurationMs - b.totalDurationMs;
    const l3a = a.l3?.durationMs ?? Infinity;
    const l3b = b.l3?.durationMs ?? Infinity;
    if (l3a !== l3b) return l3a - l3b;
    const l2a = a.l2?.durationMs ?? Infinity;
    const l2b = b.l2?.durationMs ?? Infinity;
    if (l2a !== l2b) return l2a - l2b;
    const l1a = a.l1?.durationMs ?? Infinity;
    const l1b = b.l1?.durationMs ?? Infinity;
    if (l1a !== l1b) return l1a - l1b;
    return courseGrade(a.course) - courseGrade(b.course);
  });

  return rows;
}
