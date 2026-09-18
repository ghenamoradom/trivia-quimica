import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/admin";
import { all } from "@/lib/db";
import type { AttemptRow } from "@/lib/attempts";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const users = await all<{
    document_id: string;
    first_name: string;
    last_name1: string;
    last_name2: string;
    sex: string;
    course: string;
    created_at: string;
  }>("SELECT document_id, first_name, last_name1, last_name2, sex, course, created_at FROM users WHERE role = 'student' ORDER BY course, last_name1");

  const attempts = await all<AttemptRow & { document_id: string }>(
    `SELECT a.*, u.document_id FROM attempts a JOIN users u ON u.id = a.user_id`
  );
  const byDoc = new Map<string, (AttemptRow & { document_id: string })[]>();
  for (const a of attempts) {
    const list = byDoc.get(a.document_id) || [];
    list.push(a);
    byDoc.set(a.document_id, list);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resultados");
  ws.columns = [
    { header: "Documento", key: "doc", width: 14 },
    { header: "Nombres", key: "first", width: 16 },
    { header: "Apellido 1", key: "l1n", width: 14 },
    { header: "Apellido 2", key: "l2n", width: 14 },
    { header: "Sexo", key: "sex", width: 8 },
    { header: "Curso", key: "course", width: 8 },
    { header: "Nivel 1 - Estado", key: "n1s", width: 18 },
    { header: "Nivel 1 - Puntaje", key: "n1p", width: 14 },
    { header: "Nivel 1 - Tiempo (s)", key: "n1t", width: 16 },
    { header: "Nivel 2 - Estado", key: "n2s", width: 18 },
    { header: "Nivel 2 - Puntaje", key: "n2p", width: 14 },
    { header: "Nivel 2 - Tiempo (s)", key: "n2t", width: 16 },
    { header: "Nivel 3 - Estado", key: "n3s", width: 18 },
    { header: "Nivel 3 - Puntaje", key: "n3p", width: 14 },
    { header: "Nivel 3 - Tiempo (s)", key: "n3t", width: 16 },
    { header: "Puntaje Total", key: "total", width: 14 },
    { header: "Tiempo Total (s)", key: "totalT", width: 16 },
    { header: "Fecha registro", key: "created", width: 20 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const u of users) {
    const uAttempts = byDoc.get(u.document_id) || [];
    const get = (lvl: number) => uAttempts.find((a) => a.level === lvl) || null;
    const l1 = get(1), l2 = get(2), l3 = get(3);
    const statusLabel = (s?: string) =>
      s === "completed_in_time" ? "Completado a tiempo" : s === "completed_timeout" ? "Completado (tiempo agotado)" : s === "in_progress" ? "En progreso" : "No iniciado";
    const total = [l1, l2, l3].reduce((s, a) => s + (a && a.status !== "in_progress" ? a.score : 0), 0);
    const totalT = [l1, l2, l3].reduce((s, a) => s + (a?.duration_ms ? a.duration_ms / 1000 : 0), 0);

    ws.addRow({
      doc: u.document_id,
      first: u.first_name,
      l1n: u.last_name1,
      l2n: u.last_name2,
      sex: u.sex === "F" ? "Femenino" : "Masculino",
      course: u.course,
      n1s: statusLabel(l1?.status),
      n1p: l1?.status !== "in_progress" ? l1?.score ?? "" : "",
      n1t: l1?.duration_ms ? Math.round(l1.duration_ms / 100) / 10 : "",
      n2s: statusLabel(l2?.status),
      n2p: l2?.status !== "in_progress" ? l2?.score ?? "" : "",
      n2t: l2?.duration_ms ? Math.round(l2.duration_ms / 100) / 10 : "",
      n3s: statusLabel(l3?.status),
      n3p: l3?.status !== "in_progress" ? l3?.score ?? "" : "",
      n3t: l3?.duration_ms ? Math.round(l3.duration_ms / 100) / 10 : "",
      total,
      totalT: Math.round(totalT * 10) / 10,
      created: u.created_at,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="resultados_trivia_quimica.xlsx"`,
    },
  });
}
