"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LevelSummary = { level: number; status: string; score: number | null };

function fmtStatus(s: string) {
  if (s === "completed_in_time") return "Completado a tiempo";
  if (s === "completed_timeout") return "Completado (se agotó el tiempo)";
  if (s === "in_progress") return "En progreso";
  return "No iniciado";
}

export default function ResultadosPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<LevelSummary[] | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/me").then((r) => r.json());
      if (!me.user) {
        router.push("/");
        return;
      }
      setUserId(me.user.id);
      setLevels(me.levels);
      const lb = await fetch("/api/leaderboard?all=1").then((r) => (r.ok ? r.json() : { rows: [] })).catch(() => ({ rows: [] }));
      const mine = lb.rows?.find((r: { userId: string }) => r.userId === me.user.id);
      setRank(mine ? mine.rank : null);
    })();
  }, [router]);

  if (!levels) return <main className="flex-1 flex items-center justify-center text-[#5B655F]">Cargando...</main>;

  const total = levels.reduce((s, l) => s + (l.score ?? 0), 0);
  const allDone = levels.every((l) => l.status !== "not_started" && l.status !== "in_progress");

  return (
    <main className="flex-1 w-full max-w-lg mx-auto px-4 py-10 text-center">
      <h1 className="text-2xl font-bold mb-1">Tus resultados</h1>
      <p className="text-[#5B655F] text-sm mb-6">Trivia Química — IE Juan XXIII</p>

      <div className="bg-white border border-[#DAD3C4] rounded-2xl p-6 mb-6">
        <p className="text-sm text-[#5B655F]">Puntaje total</p>
        <p className="text-5xl font-extrabold text-[#2F6E5C]">{total}</p>
        {rank && allDone && <p className="text-sm mt-2">Posición en el ranking general: <b>#{rank}</b></p>}
      </div>

      <div className="space-y-2 text-left">
        {levels.map((l) => (
          <div key={l.level} className="bg-white border border-[#DAD3C4] rounded-xl px-4 py-3 flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Nivel {l.level}</p>
              <p className="text-xs text-[#5B655F]">{fmtStatus(l.status)}</p>
            </div>
            <p className="text-lg font-bold">{l.score ?? "—"}</p>
          </div>
        ))}
      </div>

      {!allDone && (
        <button
          className="mt-6 bg-[#2F6E5C] text-white px-5 py-2.5 rounded-lg font-semibold"
          onClick={() => {
            const next = levels.find((l) => l.status === "not_started" || l.status === "in_progress");
            if (next) router.push(`/game/level/${next.level}`);
          }}
        >
          Continuar jugando
        </button>
      )}
    </main>
  );
}
