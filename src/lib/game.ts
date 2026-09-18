import { bank, momName, type MCQuestion, type MomEntry } from "./bank";
import { LEVELS, type LevelConfig } from "./levelConfig";

export type QuestionInstance = {
  slot: number; // 1-10
  type: "ES" | "EN" | "MOM";
  points: number;
  topic?: string;
  prompt: string;
  img?: string;
  table?: string;
  options: string[];
  correctIndex: number; // index into `options`, server-only, never sent to client before answering
  bankIndex: number;
  momMonth?: string;
};

export type PublicQuestion = Omit<QuestionInstance, "correctIndex" | "bankIndex">;

export function stripForClient(q: QuestionInstance): PublicQuestion {
  const { correctIndex, bankIndex, ...rest } = q;
  void correctIndex;
  void bankIndex;
  return rest;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleIndices(size: number, count: number, exclude: Set<number> = new Set()): number[] {
  const pool: number[] = [];
  for (let i = 0; i < size; i++) if (!exclude.has(i)) pool.push(i);
  return shuffle(pool).slice(0, count);
}

function buildMcInstance(slot: number, type: "ES" | "EN", q: MCQuestion, bankIndex: number, points: number): QuestionInstance {
  const optionOrder = shuffle(q.opts.map((_, i) => i));
  const options = optionOrder.map((i) => q.opts[i]);
  const correctIndex = optionOrder.indexOf(q.correct);
  return {
    slot,
    type,
    points,
    topic: q.topic,
    prompt: q.q,
    img: q.img,
    table: q.table,
    options,
    correctIndex,
    bankIndex,
  };
}

function buildMomInstance(slot: number, entry: MomEntry, bankIndex: number, momBank: MomEntry[], points: number): QuestionInstance {
  const correctName = momName(entry);
  const distractorPool = momBank.map((_, i) => i).filter((i) => i !== bankIndex);
  const distractorIdx = shuffle(distractorPool).slice(0, 3);
  const distractorNames = distractorIdx.map((i) => momName(momBank[i]));
  const optionTexts = shuffle([correctName, ...distractorNames]);
  const correctIndex = optionTexts.indexOf(correctName);
  return {
    slot,
    type: "MOM",
    points,
    prompt: "¿Cuál es el nombre de esta molécula? / What is the name of this molecule?",
    img: entry.svg,
    options: optionTexts,
    correctIndex,
    bankIndex,
    momMonth: entry.mes,
  };
}

export function generateQuestionSet(level: 1 | 2 | 3): QuestionInstance[] {
  const cfg: LevelConfig = LEVELS[level];
  const esBank = bank[cfg.bankKeyEs];
  const enBank = bank[cfg.bankKeyEn];
  const momBank = bank[cfg.bankKeyMom];

  const esNeeded = cfg.slots.filter((s) => s === "ES").length;
  const enNeeded = cfg.slots.filter((s) => s === "EN").length;
  const momNeeded = cfg.slots.filter((s) => s === "MOM").length;

  const esIndices = sampleIndices(esBank.length, esNeeded);
  // English questions must not repeat a topic index already used in Spanish for this same attempt
  const enIndices = sampleIndices(enBank.length, enNeeded, new Set(esIndices));
  const momIndices = sampleIndices(momBank.length, momNeeded);

  let esPtr = 0;
  let enPtr = 0;
  let momPtr = 0;

  const instances: QuestionInstance[] = cfg.slots.map((type, i) => {
    const slot = i + 1;
    if (type === "ES") {
      const bankIndex = esIndices[esPtr++];
      return buildMcInstance(slot, "ES", esBank[bankIndex], bankIndex, cfg.weightNormal);
    }
    if (type === "EN") {
      const bankIndex = enIndices[enPtr++];
      return buildMcInstance(slot, "EN", enBank[bankIndex], bankIndex, cfg.weightEnglish);
    }
    const bankIndex = momIndices[momPtr++];
    return buildMomInstance(slot, momBank[bankIndex], bankIndex, momBank, cfg.weightMom);
  });

  return instances;
}

export type AnswerRecord = {
  slot: number;
  selectedIndex: number | null;
  correct: boolean;
  pointsEarned: number;
  answeredAt: string;
};

export function gradeAttempt(questions: QuestionInstance[], answers: AnswerRecord[], level: 1 | 2 | 3) {
  const cfg = LEVELS[level];
  const bySlot = new Map(answers.map((a) => [a.slot, a]));
  let score = 0;
  let correctCount = 0;
  let answeredCount = 0;
  for (const q of questions) {
    const a = bySlot.get(q.slot);
    if (a && a.selectedIndex !== null) {
      answeredCount++;
      if (a.correct) {
        score += q.points;
        correctCount++;
      }
    }
  }
  const allCorrect = correctCount === questions.length && answeredCount === questions.length;
  if (allCorrect) score += cfg.bonus;
  return { score, correctCount, answeredCount, allCorrect };
}
