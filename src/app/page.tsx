"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const COURSE_LIST: string[] = (() => {
  const list: string[] = [];
  const grades: [number, number][] = [
    [6, 5],
    [7, 5],
    [8, 4],
    [9, 4],
    [10, 3],
    [11, 2],
  ];
  for (const [grade, maxGroup] of grades) {
    for (let g = 1; g <= maxGroup; g++) list.push(`${grade}-${g}`);
  }
  return list;
})();

type LeaderRow = {
  rank: number;
  fullName: string;
  course: string;
  totalScore: number;
  totalDurationMs: number;
};

function fmtTime(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const rem = (s - m * 60).toFixed(1);
  return `${m}:${rem.padStart(4, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [top10, setTop10] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginDoc, setLoginDoc] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regDoc, setRegDoc] = useState("");
  const [regFirst, setRegFirst] = useState("");
  const [regLast1, setRegLast1] = useState("");
  const [regLast2, setRegLast2] = useState("");
  const [regSex, setRegSex] = useState("");
  const [regCourse, setRegCourse] = useState("");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setTop10(d.rows))
      .catch(() => setTop10([]));
  }, []);

  async function afterAuth() {
    const me = await fetch("/api/me").then((r) => r.json());
    if (!me.user) return;
    if (me.user.role === "admin") {
      router.push("/admin");
      return;
    }
    const levels: { level: number; status: string }[] = me.levels;
    const next = levels.find((l) => l.status === "not_started" || l.status === "in_progress");
    if (next) router.push(`/game/level/${next.level}`);
    else router.push("/resultados");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: loginDoc.trim(), password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        return;
      }
      await afterAuth();
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: regDoc.trim(),
          firstName: regFirst.trim(),
          lastName1: regLast1.trim(),
          lastName2: regLast2.trim(),
          sex: regSex,
          course: regCourse,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro.");
        return;
      }
      await afterAuth();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 grid gap-8 md:grid-cols-2">
      <section>
        <h1 className="text-2xl md:text-3xl font-bold text-[#1E2422]">Trivia Química</h1>
        <p className="text-sm text-[#5B655F] mt-1 mb-6">
          IE Juan XXIII · 3 niveles progresivos basados en el proyecto Molecule of the Month
        </p>

        <div className="flex gap-2 mb-4 bg-[#EFEAE0] p-1 rounded-lg w-fit">
          <button
            id="tab-login"
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-semibold ${tab === "login" ? "bg-white shadow" : "text-[#5B655F]"}`}
            onClick={() => { setTab("login"); setError(""); }}
          >
            Continuar mi partida
          </button>
          <button
            id="tab-register"
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-semibold ${tab === "register" ? "bg-white shadow" : "text-[#5B655F]"}`}
            onClick={() => { setTab("register"); setError(""); }}
          >
            Registrarme
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm bg-[#FBE9E6] text-[#8a3226] border border-[#C24B3F]/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3 bg-white border border-[#DAD3C4] rounded-xl p-5">
            <div>
              <label htmlFor="login-doc" className="block text-sm font-semibold mb-1">Usuario (documento de identidad)</label>
              <input
                id="login-doc"
                className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2"
                value={loginDoc}
                onChange={(e) => setLoginDoc(e.target.value)}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="block text-sm font-semibold mb-1">Contraseña</label>
              <input
                id="login-pass"
                type="password"
                className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#2F6E5C] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60"
            >
              {loading ? "Ingresando..." : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3 bg-white border border-[#DAD3C4] rounded-xl p-5">
            <div>
              <label htmlFor="reg-course" className="block text-sm font-semibold mb-1">Curso</label>
              <select
                id="reg-course"
                className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2"
                value={regCourse}
                onChange={(e) => setRegCourse(e.target.value)}
                required
              >
                <option value="">Selecciona tu curso</option>
                {COURSE_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="reg-first" className="block text-sm font-semibold mb-1">Nombres</label>
                <input id="reg-first" className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2" value={regFirst} onChange={(e) => setRegFirst(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-last1" className="block text-sm font-semibold mb-1">Primer apellido</label>
                  <input id="reg-last1" className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2" value={regLast1} onChange={(e) => setRegLast1(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="reg-last2" className="block text-sm font-semibold mb-1">Segundo apellido</label>
                  <input id="reg-last2" className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2" value={regLast2} onChange={(e) => setRegLast2(e.target.value)} required />
                </div>
              </div>
            </div>
            <div>
              <span className="block text-sm font-semibold mb-1">Sexo</span>
              <div className="flex gap-4 text-sm">
                <label htmlFor="reg-sex-m" className="flex items-center gap-1.5">
                  <input id="reg-sex-m" type="radio" name="sex" value="M" checked={regSex === "M"} onChange={() => setRegSex("M")} required /> Masculino
                </label>
                <label htmlFor="reg-sex-f" className="flex items-center gap-1.5">
                  <input id="reg-sex-f" type="radio" name="sex" value="F" checked={regSex === "F"} onChange={() => setRegSex("F")} /> Femenino
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="reg-doc" className="block text-sm font-semibold mb-1">Documento de identidad (solo números)</label>
              <input
                id="reg-doc"
                className="w-full border border-[#DAD3C4] rounded-lg px-3 py-2"
                value={regDoc}
                onChange={(e) => setRegDoc(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                required
              />
              <p className="text-xs text-[#5B655F] mt-1">
                Este número será tu usuario. Tu contraseña será el mismo número de documento — no la olvides.
              </p>
            </div>
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#2F6E5C] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Registrarme y comenzar"}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-1">🏆 Top 10 — Mejores puntajes</h2>
        <p className="text-xs text-[#5B655F] mb-4">Suma de los 3 niveles. Empates: puntaje, tiempo total, tiempo N3, N2, N1, curso.</p>
        <div className="bg-white border border-[#DAD3C4] rounded-xl overflow-hidden">
          {top10 === null && <div className="p-4 text-sm text-[#5B655F]">Cargando...</div>}
          {top10 !== null && top10.length === 0 && (
            <div className="p-4 text-sm text-[#5B655F]">Aún nadie ha completado los 3 niveles.</div>
          )}
          {top10 && top10.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-[#EFEAE0] text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Estudiante</th>
                  <th className="px-3 py-2">Curso</th>
                  <th className="px-3 py-2 text-right">Puntos</th>
                  <th className="px-3 py-2 text-right">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((r) => (
                  <tr key={r.rank} className="border-t border-[#EFEAE0]">
                    <td className="px-3 py-2 font-semibold">{r.rank}</td>
                    <td className="px-3 py-2">{r.fullName}</td>
                    <td className="px-3 py-2">{r.course}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.totalScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtTime(r.totalDurationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
