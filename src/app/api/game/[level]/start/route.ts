import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseLevel, checkPrerequisite, startOrResumeLevel } from "@/lib/gameServer";

export async function POST(_req: Request, context: { params: Promise<{ level: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ error: "El administrador no juega." }, { status: 403 });

  const { level: levelRaw } = await context.params;
  const level = parseLevel(levelRaw);
  if (!level) return NextResponse.json({ error: "Nivel inválido." }, { status: 400 });

  const prereqError = await checkPrerequisite(user.id, level);
  if (prereqError) return NextResponse.json({ error: prereqError }, { status: 403 });

  const result = await startOrResumeLevel(user.id, level);
  return NextResponse.json(result);
}
