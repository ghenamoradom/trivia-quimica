import { all } from "./db";
import { buildLeaderboard, type AttemptRow } from "./attempts";
import { getSessionUser } from "./auth";

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export type AdminOverview = {
  totalRegistered: number;
  completedAllInTime: number;
  completedAllNotInTime: number;
  startedNeverFinished: number;
  avgScoreFemale: number | null;
  avgScoreMale: number | null;
  byCourse: { course: string; count: number; avgScore: number | null }[];
};

export async function computeOverview(): Promise<AdminOverview> {
  const users = await all<{ id: string; sex: string; course: string }>(
    "SELECT id, sex, course FROM users WHERE role = 'student'"
  );
  const attempts = await all<AttemptRow>("SELECT * FROM attempts");
  const byUser = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const list = byUser.get(a.user_id) || [];
    list.push(a);
    byUser.set(a.user_id, list);
  }

  let completedAllInTime = 0;
  let completedAllNotInTime = 0;
  let startedNeverFinished = 0;
  const femaleScores: number[] = [];
  const maleScores: number[] = [];
  const courseMap = new Map<string, { count: number; scores: number[] }>();

  for (const u of users) {
    const uAttempts = byUser.get(u.id) || [];
    const totalScore = uAttempts.reduce((s, a) => s + (a.status !== "in_progress" ? a.score : 0), 0);
    const allThreeDone = [1, 2, 3].every((lvl) => {
      const a = uAttempts.find((x) => x.level === lvl);
      return a && a.status !== "in_progress";
    });
    const anyInTime = uAttempts.some((a) => a.status === "completed_in_time");
    const anyTimeout = uAttempts.some((a) => a.status === "completed_timeout");

    if (allThreeDone) {
      if (anyTimeout) completedAllNotInTime++;
      else completedAllInTime++;
    } else if (uAttempts.length > 0) {
      startedNeverFinished++;
    }
    void anyInTime;

    if (allThreeDone) {
      if (u.sex === "F") femaleScores.push(totalScore);
      if (u.sex === "M") maleScores.push(totalScore);
    }

    const c = courseMap.get(u.course) || { count: 0, scores: [] };
    c.count++;
    if (allThreeDone) c.scores.push(totalScore);
    courseMap.set(u.course, c);
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

  return {
    totalRegistered: users.length,
    completedAllInTime,
    completedAllNotInTime,
    startedNeverFinished,
    avgScoreFemale: avg(femaleScores),
    avgScoreMale: avg(maleScores),
    byCourse: [...courseMap.entries()]
      .map(([course, v]) => ({ course, count: v.count, avgScore: avg(v.scores) }))
      .sort((a, b) => a.course.localeCompare(b.course, undefined, { numeric: true })),
  };
}

export async function fullLeaderboard() {
  return buildLeaderboard({ throughLevel: 3 });
}
