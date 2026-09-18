import path from "node:path";
import fs from "node:fs";

type Row = Record<string, unknown>;

const DATABASE_URL = process.env.DATABASE_URL || "";
const IS_PG = /^postgres(ql)?:\/\//.test(DATABASE_URL);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  document_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name1 TEXT NOT NULL,
  last_name2 TEXT NOT NULL,
  sex TEXT NOT NULL,
  course TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  status TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  started_at TEXT,
  finished_at TEXT,
  questions_json TEXT,
  answers_json TEXT,
  UNIQUE(user_id, level)
);
`;

// ---------------------------------------------------------------------------
// Postgres driver (production / Supabase)
// ---------------------------------------------------------------------------
let pgPoolPromise: Promise<import("pg").Pool> | null = null;

async function getPgPool() {
  if (!pgPoolPromise) {
    pgPoolPromise = (async () => {
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      });
      await pool.query(SCHEMA_SQL);
      return pool;
    })();
  }
  return pgPoolPromise;
}

// ---------------------------------------------------------------------------
// SQLite driver (local development, zero setup)
// ---------------------------------------------------------------------------
// Uses better-sqlite3 rather than the built-in node:sqlite module: Next.js's
// Turbopack production bundler currently mishandles bare "node:sqlite"
// references in server route chunks (throws "Unsupported external type Url
// for commonjs reference" at runtime even though the build succeeds).
// better-sqlite3 ships prebuilt native binaries and is on Next's own
// serverExternalPackages allowlist, so it bundles cleanly.
import type BetterSqlite3 from "better-sqlite3";

type SqliteHandle = {
  db: BetterSqlite3.Database;
};

const globalForDb = globalThis as unknown as { __sqliteHandle?: SqliteHandle };

function getSqliteHandle(): SqliteHandle {
  if (!globalForDb.__sqliteHandle) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as typeof BetterSqlite3;
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "local.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA_SQL);
    globalForDb.__sqliteHandle = { db };
  }
  return globalForDb.__sqliteHandle;
}

function pgPlaceholdersToSqlite(sql: string): string {
  return sql.replace(/\$(\d+)/g, "?");
}

// ---------------------------------------------------------------------------
// Unified API: all() for reads, run() for writes
// ---------------------------------------------------------------------------
export async function all<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (IS_PG) {
    const pool = await getPgPool();
    const res = await pool.query(sql, params);
    return res.rows as T[];
  }
  const { db } = getSqliteHandle();
  const stmt = db.prepare(pgPlaceholdersToSqlite(sql));
  return stmt.all(...(params as never[])) as T[];
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  if (IS_PG) {
    const pool = await getPgPool();
    await pool.query(sql, params);
    return;
  }
  const { db } = getSqliteHandle();
  const stmt = db.prepare(pgPlaceholdersToSqlite(sql));
  stmt.run(...(params as never[]));
}

export async function one<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows[0] ?? null;
}

export function driverName() {
  return IS_PG ? "postgres" : "sqlite";
}
