export type SlotType = "ES" | "EN" | "MOM";

export type LevelConfig = {
  level: 1 | 2 | 3;
  name: string;
  timeLimitMs: number;
  weightNormal: number;
  weightEnglish: number;
  weightMom: number;
  bonus: number;
  slots: SlotType[];
  bankKeyEs: "Q" | "Q2" | "Q3";
  bankKeyEn: "Q_EN" | "Q2_EN" | "Q3_EN";
  bankKeyMom: "MOM" | "MOM2" | "MOM3";
  soundtrack: string; // expected filename under /public/audio/
  soundtrackLabel: string;
};

export const LEVELS: Record<1 | 2 | 3, LevelConfig> = {
  1: {
    level: 1,
    name: "The Matter and the Molecule of the Month Project",
    timeLimitMs: 6 * 60 * 1000,
    weightNormal: 1,
    weightEnglish: 3,
    weightMom: 2,
    bonus: 1,
    slots: ["ES", "ES", "ES", "MOM", "EN", "ES", "ES", "ES", "ES", "MOM"],
    bankKeyEs: "Q",
    bankKeyEn: "Q_EN",
    bankKeyMom: "MOM",
    soundtrack: "level1.mp3",
    soundtrackLabel: "Mario Bros. – Underground",
  },
  2: {
    level: 2,
    name: "The Molecule of the Month and the Chemistry Universe",
    timeLimitMs: 5 * 60 * 1000,
    weightNormal: 2,
    weightEnglish: 5,
    weightMom: 3,
    bonus: 2,
    slots: ["ES", "ES", "ES", "MOM", "EN", "ES", "ES", "ES", "EN", "MOM"],
    bankKeyEs: "Q2",
    bankKeyEn: "Q2_EN",
    bankKeyMom: "MOM2",
    soundtrack: "level2.mp3",
    soundtrackLabel: "Top Gear Soundtrack – Track 1",
  },
  3: {
    level: 3,
    name: "30 Years of Molecules",
    timeLimitMs: 3 * 60 * 1000,
    weightNormal: 3,
    weightEnglish: 5,
    weightMom: 3,
    bonus: 4,
    slots: ["ES", "ES", "ES", "MOM", "EN", "ES", "ES", "EN", "EN", "MOM"],
    bankKeyEs: "Q3",
    bankKeyEn: "Q3_EN",
    bankKeyMom: "MOM3",
    soundtrack: "level3.mp3",
    soundtrackLabel: "Donkey Kong Country – Aquatic Ambience",
  },
};

export function maxScoreForLevel(level: 1 | 2 | 3): number {
  const cfg = LEVELS[level];
  const esCount = cfg.slots.filter((s) => s === "ES").length;
  const enCount = cfg.slots.filter((s) => s === "EN").length;
  const momCount = cfg.slots.filter((s) => s === "MOM").length;
  return esCount * cfg.weightNormal + enCount * cfg.weightEnglish + momCount * cfg.weightMom + cfg.bonus;
}
