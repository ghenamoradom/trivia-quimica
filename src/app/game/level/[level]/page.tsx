"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PublicQuestion = {
  slot: number;
  type: "ES" | "EN" | "MOM";
  points: number;
  topic?: string;
  prompt: string;
  img?: string;
  table?: string;
  options: string[];
  momMonth?: string;
};

type AnswerRecord = {
  slot: number;
  selectedIndex: number | null;
  correct: boolean;
  pointsEarned: number;
};

type LeaderRow = {
  rank: number;
  userId: string;
  fullName: string;
  course: string;
  totalScore: number;
  totalDurationMs: number;
};

const LEVEL_META: Record<number, { name: string; soundtrack: string; soundtrackLabel: string; timeLabel: string }> = {
  1: { name: "The Matter and the Molecule of the Month Project", soundtrack: "/audio/level1.mp3", soundtrackLabel: "Mario Bros. – Underground", timeLabel: "6:00" },
  2: { name: "The Molecule of the Month and the Chemistry Universe", soundtrack: "/audio/level2.mp3", soundtrackLabel: "Top Gear Soundtrack – Track 1", timeLabel: "5:00" },
  3: { name: "30 Years of Molecules", soundtrack: "/audio/level3.mp3", soundtrackLabel: "Donkey Kong Country – Aquatic Ambience", timeLabel: "3:00" },
};

function fmtCountdown(ms: number) {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = (total - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}

function fmtTime(ms: number) {
  return fmtCountdown(ms);
}

export default function LevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: levelRaw } = use(params);
  const level = Number(levelRaw) as 1 | 2 | 3;
  const router = useRouter();
  const meta = LEVEL_META[level];

  const [state, setState] = useState<"loading" | "error" | "playing" | "finished">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});
  const [currentSlot, setCurrentSlot] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctIndex: number } | null>(null);
  const [runningScore, setRunningScore] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeLimitMs, setTimeLimitMs] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [finalResult, setFinalResult] = useState<{ status: string; score: number; durationMs: number } | null>(null);
  const [ranking, setRanking] = useState<LeaderRow[] | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishingRef = useRef(false);

  const doFinish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const res = await fetch(`/api/game/${level}/finish`, { method: "POST" });
    const data = await res.json();
    setFinalResult({ status: data.status, score: data.score, durationMs: data.durationMs });
    setState("finished");
  }, [level]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meRes = await fetch("/api/me");
      const me = await meRes.json();
      if (!me.user) {
        router.push("/");
        return;
      }
      const res = await fetch(`/api/game/${level}/start`, { method: "POST" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setErrorMsg(data.error || "No se pudo iniciar el nivel.");
        setState("error");
        return;
      }
      if (data.finished) {
        setFinalResult({ status: data.status, score: data.score, durationMs: data.durationMs });
        setState("finished");
        return;
      }
      setQuestions(data.questions);
      setTimeLimitMs(data.timeLimitMs);
      setRemaining(data.remainingMs);
      setDeadline(Date.now() + data.remainingMs);
      const answerMap: Record<number, AnswerRecord> = {};
      let score = 0;
      for (const a of data.answers as AnswerRecord[]) {
        answerMap[a.slot] = a;
        score += a.pointsEarned;
      }
      setAnswers(answerMap);
      setRunningScore(score);
      const firstUnanswered = data.questions.find((q: PublicQuestion) => !(q.slot in answerMap));
      setCurrentSlot(firstUnanswered ? firstUnanswered.slot : data.questions[data.questions.length - 1].slot);
      setState("playing");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Countdown ticker
  useEffect(() => {
    if (state !== "playing" || deadline === null) return;
    const id = setInterval(() => {
      const rem = deadline - Date.now();
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(id);
        doFinish();
      }
    }, 100);
    return () => clearInterval(id);
  }, [state, deadline, doFinish]);

  // Live ranking (levels 2 and 3 only)
  useEffect(() => {
    if (level === 1 || state !== "playing") return;
    const through = level === 2 ? 1 : 2;
    const load = () => {
      fetch(`/api/leaderboard?through=${through}`)
        .then((r) => r.json())
        .then((d) => setRanking(d.rows))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [level, state]);

  function toggleSound() {
    const el = audioRef.current;
    if (!el) return;
    if (soundOn) {
      el.pause();
      setSoundOn(false);
    } else {
      el.play().catch(() => {});
      setSoundOn(true);
    }
  }

  async function submitAnswer(idx: number) {
    if (feedback || answers[currentSlot]) return;
    setSelected(idx);
    const res = await fetch(`/api/game/${level}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: currentSlot, selectedIndex: idx }),
    });
    const data = await res.json();
    if (data.finished) {
      setFinalResult({ status: data.status, score: data.score, durationMs: data.durationMs });
      setState("finished");
      return;
    }
    setFeedback({ correct: data.correct, correctIndex: data.correctIndex });
    setRunningScore(data.runningScore);
    setAnswers((prev) => ({
      ...prev,
      [currentSlot]: { slot: currentSlot, selectedIndex: idx, correct: data.correct, pointsEarned: data.pointsEarned },
    }));
  }

  function goNext() {
    setFeedback(null);
    setSelected(null);
    const idx = questions.findIndex((q) => q.slot === currentSlot);
    if (idx === questions.length - 1) {
      doFinish();
    } else {
      setCurrentSlot(questions[idx + 1].slot);
    }
  }

  if (state === "loading") {
    return <main className="flex-1 flex items-center justify-center text-[#5B655F]">Cargando nivel...</main>;
  }

  if (state === "error") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[#8a3226] font-semibold">{errorMsg}</p>
        <button className="bg-[#2F6E5C] text-white px-4 py-2 rounded-lg" onClick={() => router.push("/")}>
          Volver al inicio
        </button>
      </main>
    );
  }

  if (state === "finished" && finalResult) {
    const nextLevel = level < 3 ? level + 1 : null;
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center py-10">
        <h1 className="text-2xl font-bold">¡Nivel {level} terminado!</h1>
        <p className="text-[#5B655F]">{meta.name}</p>
        <div className="bg-white border border-[#DAD3C4] rounded-xl p-6 w-full max-w-sm">
          <p className="text-sm text-[#5B655F]">Puntaje obtenido</p>
          <p className="text-4xl font-extrabold text-[#2F6E5C]">{finalResult.score}</p>
          <p className="text-sm text-[#5B655F] mt-3">Tiempo usado: {fmtTime(finalResult.durationMs)}</p>
          <p className="text-xs mt-1 text-[#5B655F]">
            {finalResult.status === "completed_timeout" ? "Se agotó el tiempo antes de terminar." : "Completado dentro del tiempo."}
          </p>
        </div>
        {nextLevel ? (
          <button className="bg-[#2F6E5C] text-white px-5 py-2.5 rounded-lg font-semibold" onClick={() => router.push(`/game/level/${nextLevel}`)}>
            Comenzar Nivel {nextLevel} →
          </button>
        ) : (
          <button className="bg-[#2F6E5C] text-white px-5 py-2.5 rounded-lg font-semibold" onClick={() => router.push("/resultados")}>
            Ver mis resultados
          </button>
        )}
      </main>
    );
  }

  const q = questions.find((x) => x.slot === currentSlot);
  const progressPct = timeLimitMs ? Math.max(0, Math.min(100, (remaining / timeLimitMs) * 100)) : 100;
  const urgent = progressPct < 20;

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-[1fr_260px]">
      <audio ref={audioRef} src={meta.soundtrack} loop onError={() => setSoundOn(false)} />
      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-bold text-lg">Nivel {level}</h1>
            <p className="text-xs text-[#5B655F]">{meta.name}</p>
          </div>
          <button onClick={toggleSound} className="text-xs border border-[#DAD3C4] rounded-lg px-3 py-1.5 bg-white">
            {soundOn ? "🔈 Silenciar" : "🔊 Activar música"}
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold">Pregunta {questions.findIndex((x) => x.slot === currentSlot) + 1} / {questions.length}</span>
            <span className={`font-mono font-bold ${urgent ? "text-[#C24B3F]" : "text-[#2F6E5C]"}`}>⏱ {fmtCountdown(remaining)}</span>
          </div>
          <div className="h-2 rounded-full bg-[#EFEAE0] overflow-hidden">
            <div
              className={`h-full transition-[width] duration-100 ${urgent ? "bg-[#C24B3F]" : "bg-[#2F6E5C]"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm bg-[#E4F1EA] text-[#215243] font-semibold px-3 py-1 rounded-full">
            Puntaje actual: {runningScore}
          </span>
          {q && (
            <span className="text-xs uppercase font-bold tracking-wide text-[#5B655F]">
              {q.type === "MOM" ? "Molecule of the Month" : q.type === "EN" ? "English" : q.topic}
              {" · "}
              {q.points} pts
            </span>
          )}
        </div>

        {q && (
          <div className="bg-white border border-[#DAD3C4] rounded-2xl p-5 md:p-8 min-h-[380px] flex flex-col gap-5">
            {q.momMonth && <div className="text-xs font-bold text-[#2F6E5C]">Molecule of the Month · {q.momMonth}</div>}
            {q.type === "MOM" && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src="/images/mom-trivia.jpg"
                  alt="Molecule of the Month Trivia"
                  loading="lazy"
                  className="w-full max-w-[200px] rounded-xl shadow-sm object-contain"
                />
                <p className="text-xs text-center text-[#6e5a1e] bg-[#FBF0DD] border border-[#EAD9A0] rounded-lg px-3 py-2 max-w-md">
                  💡 Pista: busca la estructura de esta molécula en las carteleras de la pared del salón.
                </p>
              </div>
            )}
            {q.type === "EN" && (
              <div className="flex justify-center">
                <img
                  src="/images/english-day.jpg"
                  alt="English Day Juan XXIII"
                  loading="lazy"
                  className="w-full max-w-[200px] rounded-xl shadow-sm object-contain"
                />
              </div>
            )}
            {q.img && <div className="q-figure flex justify-center" dangerouslySetInnerHTML={{ __html: q.img }} />}
            {q.table && <div dangerouslySetInnerHTML={{ __html: q.table }} />}
            <p className="text-xl font-semibold leading-snug">{q.prompt}</p>
            <div className="flex flex-col gap-2.5">
              {q.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrectAnswer = feedback && i === feedback.correctIndex;
                const isWrongSelected = feedback && isSelected && !feedback.correct;
                return (
                  <button
                    key={i}
                    disabled={!!feedback}
                    onClick={() => submitAnswer(i)}
                    className={`text-left border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
                      isCorrectAnswer
                        ? "border-[#2F6E5C] bg-[#E4F1EA]"
                        : isWrongSelected
                        ? "border-[#C24B3F] bg-[#FBE9E6]"
                        : "border-[#DAD3C4] bg-white hover:bg-[#F6F3EC]"
                    }`}
                  >
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#EFEAE0] text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {feedback && (
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${feedback.correct ? "text-[#215243]" : "text-[#8a3226]"}`}>
                  {feedback.correct ? "¡Correcto!" : "Incorrecto."}
                </span>
                <button onClick={goNext} className="bg-[#2F6E5C] text-white px-4 py-2 rounded-lg text-sm font-semibold">
                  {questions.findIndex((x) => x.slot === currentSlot) === questions.length - 1 ? "Finalizar nivel" : "Siguiente →"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        {level > 1 && (
          <div className="bg-white border border-[#DAD3C4] rounded-xl p-4">
            <h2 className="text-sm font-bold mb-2">
              Ranking {level === 2 ? "tras Nivel 1" : "tras Niveles 1 y 2"}
            </h2>
            {!ranking && <p className="text-xs text-[#5B655F]">Cargando...</p>}
            {ranking && (
              <ol className="space-y-1 text-xs">
                {ranking.slice(0, 10).map((r) => (
                  <li key={r.userId} className="flex justify-between">
                    <span>{r.rank}. {r.fullName.split(" ")[0]}</span>
                    <span className="font-semibold">{r.totalScore}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        <div className="bg-white border border-[#DAD3C4] rounded-xl p-4 text-xs text-[#5B655F]">
          <p className="font-semibold mb-1">🎵 {meta.soundtrackLabel}</p>
          <p>Activa el sonido con el botón de arriba (los navegadores bloquean el audio automático).</p>
        </div>
      </aside>
    </main>
  );
}
