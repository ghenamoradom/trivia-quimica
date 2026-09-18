import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { all } from "@/lib/db";
import type { AttemptRow } from "@/lib/attempts";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");

  const users = await all<{
    id: string;
    document_id: string;
    first_name: string;
    last_name1: string;
    last_name2: string;
    sex: string;
    course: string;
    created_at: string;
  }>(
    course
      ? "SELECT id, document_id, first_name, last_name1, last_name2, sex, course, created_at FROM users WHERE role = 'student' AND course = $1 ORDER BY course, last_name1"
      : "SELECT id, document_id, first_name, last_name1, last_name2, sex, course, created_at FROM users WHERE role = 'student' ORDER BY course, last_name1",
    course ? [course] : []
  );

  const attempts = await all<AttemptRow>("SELECT * FROM attempts");
  const byUser = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const list = byUser.get(a.user_id) || [];
    list.push(a);
    byUser.set(a.user_id, list);
  }

  const rows = users.map((u) => {
    const uAttempts = byUser.get(u.id) || [];
    const get = (lvl: number) => uAttempts.find((a) => a.level === lvl) || null;
    return {
      id: u.id,
      documentId: u.document_id,
      fullName: `${u.first_name} ${u.last_name1} ${u.last_name2}`,
      sex: u.sex,
      course: u.course,
      createdAt: u.created_at,
      l1: get(1),
      l2: get(2),
      l3: get(3),
      totalScore: uAttempts.reduce((s, a) => s + (a.status !== "in_progress" ? a.score : 0), 0),
    };
  });

  return NextResponse.json({ rows });
}
