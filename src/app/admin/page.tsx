"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const COURSE_LIST: string[] = (() => {
  const list: string[] = [];
  const grades: [number, number][] = [[6, 5], [7, 5], [8, 4], [9, 4], [10, 3], [11, 2]];
  for (const [grade, maxGroup] of grades) for (let g = 1; g <= maxGroup; g++) list.push(`${grade}-${g}`);
  return list;
})();

type Overview = {
  totalRegistered: number;
  completedAllInTime: number;
  completedAllNotInTime: number;
  startedNeverFinished: number;
  avgScoreFemale: number | null;
  avgScoreMale: number | null;
  byCourse: { course: string; count: number; avgScore: number | null }[];
};

type AttemptLite = { status: string; score: number; duration_ms: number | null } | null;

type UserRow = {
  id: string;
  documentId: string;
  fullName: string;
  sex: string;
  course: string;
  l1: AttemptLite;
  l2: AttemptLite;
  l3: AttemptLite;
  totalScore: number;
};

function fmtTime(ms: number | null) {
  if (!ms) return "—";
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const rem = (s - m * 60).toFixed(1);
  return `${m}:${rem.padStart(4, "0")}`;
}

function fmtStatus(s?: string) {
  if (s === "completed_in_time") return "A tiempo";
  if (s === "completed_timeout") return "Tiempo agotado";
  if (s === "in_progress") return "En progreso";
  return "No iniciado";
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [courseFilter, setCourseFilter] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/me").then((r) => r.json());
      if (!me.user || me.user.role !== "admin") {
        router.push("/");
        return;
      }
      setChecking(false);
      const ov = await fetch("/api/admin/overview").then((r) => r.json());
      setOverview(ov);
    })();
  }, [router]);

  useEffect(() => {
    if (checking) return;
    const qs = courseFilter ? `?course=${encodeURIComponent(courseFilter)}` : "";
    fetch(`/api/admin/users${qs}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.rows));
  }, [checking, courseFilter]);

  const sorted = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => b.totalScore - a.totalScore);
  }, [users]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (checking) return <main className="flex-1 flex items-center justify-center text-[#5B655F]">Verificando...</main>;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Panel de administrador</h1>
          <p className="text-sm text-[#5B655F]">Trivia Química — IE Juan XXIII</p>
        </div>
        <button onClick={logout} className="text-sm border border-[#DAD3C4] rounded-lg px-3 py-1.5 bg-white">
          Cerrar sesión
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Registrados" value={overview.totalRegistered} />
          <Stat label="Completaron a tiempo" value={overview.completedAllInTime} />
          <Stat label="Completaron sin tiempo" value={overview.completedAllNotInTime} />
          <Stat label="Iniciaron y no terminaron" value={overview.startedNeverFinished} />
          <Stat label="Promedio mujeres" value={overview.avgScoreFemale !== null ? overview.avgScoreFemale.toFixed(1) : "N/D"} />
          <Stat label="Promedio hombres" value={overview.avgScoreMale !== null ? overview.avgScoreMale.toFixed(1) : "N/D"} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <a href="/api/admin/export/xlsx" className="text-sm bg-[#2F6E5C] text-white rounded-lg px-4 py-2 font-semibold">
          ⬇ Exportar todo a Excel
        </a>
        <a href="/api/admin/export/pdf" className="text-sm bg-[#4A6FA5] text-white rounded-lg px-4 py-2 font-semibold">
          ⬇ Exportar estadísticas + Top 10 a PDF
        </a>
        <select
          className="text-sm border border-[#DAD3C4] rounded-lg px-3 py-2 ml-auto"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">Todos los cursos</option>
          {COURSE_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {overview && (
        <details className="mb-4 bg-white border border-[#DAD3C4] rounded-xl p-4">
          <summary className="cursor-pointer font-semibold text-sm">Promedio por curso</summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
            {overview.byCourse.map((c) => (
              <div key={c.course} className="border border-[#EFEAE0] rounded-lg px-3 py-2">
                <p className="font-semibold">{c.course}</p>
                <p className="text-[#5B655F]">{c.count} estudiante(s)</p>
                <p>Promedio: {c.avgScore !== null ? c.avgScore.toFixed(1) : "N/D"}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="bg-white border border-[#DAD3C4] rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-[#EFEAE0] text-left">
            <tr>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Curso</th>
              <th className="px-3 py-2">Sexo</th>
              <th className="px-3 py-2">Nivel 1</th>
              <th className="px-3 py-2">Nivel 2</th>
              <th className="px-3 py-2">Nivel 3</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id} className="border-t border-[#EFEAE0]">
                <td className="px-3 py-2">{u.documentId}</td>
                <td className="px-3 py-2">{u.fullName}</td>
                <td className="px-3 py-2">{u.course}</td>
                <td className="px-3 py-2">{u.sex === "F" ? "F" : "M"}</td>
                <td className="px-3 py-2 text-xs">{u.l1 ? `${fmtStatus(u.l1.status)} · ${u.l1.status !== "in_progress" ? u.l1.score : "—"} pts · ${fmtTime(u.l1.duration_ms)}` : "No iniciado"}</td>
                <td className="px-3 py-2 text-xs">{u.l2 ? `${fmtStatus(u.l2.status)} · ${u.l2.status !== "in_progress" ? u.l2.score : "—"} pts · ${fmtTime(u.l2.duration_ms)}` : "No iniciado"}</td>
                <td className="px-3 py-2 text-xs">{u.l3 ? `${fmtStatus(u.l3.status)} · ${u.l3.status !== "in_progress" ? u.l3.score : "—"} pts · ${fmtTime(u.l3.duration_ms)}` : "No iniciado"}</td>
                <td className="px-3 py-2 text-right font-bold">{u.totalScore}</td>
              </tr>
            ))}
            {users && users.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-[#5B655F]">Sin resultados para este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-[#DAD3C4] rounded-xl p-4">
      <p className="text-xs text-[#5B655F]">{label}</p>
      <p className="text-2xl font-bold text-[#2F6E5C]">{value}</p>
    </div>
  );
}
