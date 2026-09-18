import rawBank from "@/data/bank.json";

export type MCQuestion = {
  topic: string;
  q: string;
  opts: string[];
  correct: number;
  img?: string;
  table?: string;
};

export type MomEntry = {
  mes: string;
  name: string[];
  svg: string;
  note: string | null;
  url: string;
};

type Bank = {
  Q: MCQuestion[];
  Q_EN: MCQuestion[];
  Q2: MCQuestion[];
  Q2_EN: MCQuestion[];
  Q3: MCQuestion[];
  Q3_EN: MCQuestion[];
  MOM: MomEntry[];
  MOM2: MomEntry[];
  MOM3: MomEntry[];
};

export const bank = rawBank as unknown as Bank;

export function momName(entry: MomEntry): string {
  return entry.name.join(" ");
}
