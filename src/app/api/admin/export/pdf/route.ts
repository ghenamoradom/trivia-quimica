import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireAdmin, computeOverview, fullLeaderboard } from "@/lib/admin";

function fmtTime(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const rem = (s - m * 60).toFixed(1);
  return `${m}:${rem.padStart(4, "0")}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const overview = await computeOverview();
  const top10 = (await fullLeaderboard()).slice(0, 10);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(18).text("Trivia Química — Reporte de resultados", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(`Generado: ${new Date().toLocaleString("es-CO")}`, { align: "center" });
  doc.moveDown(1);

  doc.fillColor("#000").fontSize(14).text("Estadísticas principales");
  doc.moveDown(0.4);
  doc.fontSize(11);
  const stat = (label: string, value: string) => doc.text(`${label}: ${value}`);
  stat("Usuarios registrados", String(overview.totalRegistered));
  stat("Completaron los 3 niveles dentro del tiempo", String(overview.completedAllInTime));
  stat("Completaron los 3 niveles, pero no dentro del tiempo", String(overview.completedAllNotInTime));
  stat("Iniciaron pero nunca terminaron el juego", String(overview.startedNeverFinished));
  stat("Promedio de puntos — mujeres", overview.avgScoreFemale !== null ? overview.avgScoreFemale.toFixed(1) : "N/D");
  stat("Promedio de puntos — hombres", overview.avgScoreMale !== null ? overview.avgScoreMale.toFixed(1) : "N/D");
  doc.moveDown(1);

  doc.fontSize(14).text("Resultados por curso");
  doc.moveDown(0.4);
  doc.fontSize(10);
  overview.byCourse.forEach((c) => {
    doc.text(`Curso ${c.course}: ${c.count} estudiante(s) — promedio: ${c.avgScore !== null ? c.avgScore.toFixed(1) : "N/D"}`);
  });
  doc.moveDown(1);

  doc.fontSize(14).text("Top 10 — Mejores puntajes");
  doc.moveDown(0.4);
  doc.fontSize(10);
  top10.forEach((r, i) => {
    doc.text(
      `${i + 1}. ${r.fullName} (${r.course}) — ${r.totalScore} pts — tiempo total ${fmtTime(r.totalDurationMs)}`
    );
  });

  doc.end();
  const buffer = await done;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte_trivia_quimica.pdf"`,
    },
  });
}
