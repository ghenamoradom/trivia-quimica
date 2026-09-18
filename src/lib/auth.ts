import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { all, run, one } from "./db";
import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const COOKIE_NAME = "quimica_session";
const ADMIN_DOCUMENT_ID = process.env.ADMIN_USERNAME || "ghenamoradom";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "B@ttousai_d3st4j4d0r";

export type UserRow = {
  id: string;
  document_id: string;
  password_hash: string;
  first_name: string;
  last_name1: string;
  last_name2: string;
  sex: string;
  course: string;
  role: string;
  created_at: string;
};

export type SessionUser = {
  id: string;
  documentId: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  sex: string;
  course: string;
  role: string;
};

function toSessionUser(u: UserRow): SessionUser {
  return {
    id: u.id,
    documentId: u.document_id,
    firstName: u.first_name,
    lastName1: u.last_name1,
    lastName2: u.last_name2,
    sex: u.sex,
    course: u.course,
    role: u.role,
  };
}

let adminSeeded = false;
export async function ensureAdminSeeded() {
  if (adminSeeded) return;
  const existing = await one<UserRow>("SELECT * FROM users WHERE document_id = $1", [ADMIN_DOCUMENT_ID]);
  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await run(
      `INSERT INTO users (id, document_id, password_hash, first_name, last_name1, last_name2, sex, course, role, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [crypto.randomUUID(), ADMIN_DOCUMENT_ID, hash, "Administrador", "Trivia", "Química", "F", "-", "admin", new Date().toISOString()]
    );
  }
  adminSeeded = true;
}

export async function findUserByDocumentId(documentId: string): Promise<UserRow | null> {
  return one<UserRow>("SELECT * FROM users WHERE document_id = $1", [documentId]);
}

export async function createUser(input: {
  documentId: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  sex: string;
  course: string;
}): Promise<SessionUser> {
  const passwordHash = await bcrypt.hash(input.documentId, 10);
  const id = crypto.randomUUID();
  await run(
    `INSERT INTO users (id, document_id, password_hash, first_name, last_name1, last_name2, sex, course, role, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'student',$9)`,
    [id, input.documentId, passwordHash, input.firstName, input.lastName1, input.lastName2, input.sex, input.course, new Date().toISOString()]
  );
  const row = await one<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return toSessionUser(row!);
}

export async function verifyLogin(documentId: string, password: string): Promise<SessionUser | null> {
  await ensureAdminSeeded();
  const row = await findUserByDocumentId(documentId);
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  return toSessionUser(row);
}

export function signSessionToken(user: SessionUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
}

export async function setSessionCookie(user: SessionUser) {
  const token = signSessionToken(user);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
    const row = await one<UserRow>("SELECT * FROM users WHERE id = $1", [payload.sub]);
    if (!row) return null;
    return toSessionUser(row);
  } catch {
    return null;
  }
}

export const COURSE_LIST: string[] = (() => {
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

export function courseGrade(course: string): number {
  const n = parseInt(course.split("-")[0], 10);
  return Number.isFinite(n) ? n : 999;
}

export function isValidDocumentId(documentId: string): boolean {
  return /^[0-9]{4,15}$/.test(documentId);
}

export { all };
