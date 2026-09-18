import { NextResponse } from "next/server";
import { requireAdmin, computeOverview } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const overview = await computeOverview();
  return NextResponse.json(overview);
}
