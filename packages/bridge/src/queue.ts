import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type {
  EnqueuePayload,
  Selection,
  SelectionStatus,
} from "@chrome-to-claude/shared";
import { ensureConfigDir, DB_PATH } from "./paths.ts";

export const DEFAULT_PAGE_SIZE = 50;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let db: Database.Database | null = null;

function open(): Database.Database {
  if (db) return db;
  ensureConfigDir();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS selections (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_status_created
      ON selections(status, created_at DESC);
  `);
  return db;
}

export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
    } catch {}
    db = null;
  }
}

export function enqueue(payload: EnqueuePayload): Selection {
  const conn = open();
  const selection: Selection = {
    ...payload,
    id: randomUUID(),
    createdAt: Date.now(),
    status: "pending",
  };
  conn
    .prepare("INSERT INTO selections (id, created_at, status, payload) VALUES (?, ?, ?, ?)")
    .run(selection.id, selection.createdAt, selection.status, JSON.stringify(selection));
  // Opportunistic retention sweep: each enqueue drops applied/delivered
  // rows older than 30 days. Keeps the DB from growing unbounded without a
  // background job.
  sweepOld();
  return selection;
}

function rowToSelection(row: { payload: string }): Selection {
  return JSON.parse(row.payload) as Selection;
}

export function getById(id: string): Selection | null {
  const conn = open();
  const row = conn.prepare("SELECT payload FROM selections WHERE id = ?").get(id) as
    | { payload: string }
    | undefined;
  return row ? rowToSelection(row) : null;
}

export function listPending(limit = DEFAULT_PAGE_SIZE): Selection[] {
  const conn = open();
  const rows = conn
    .prepare(
      "SELECT payload FROM selections WHERE status = 'pending' ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit) as { payload: string }[];
  return rows.map(rowToSelection);
}

export function getLatestPending(): Selection | null {
  const list = listPending(1);
  return list[0] ?? null;
}

export function setStatus(id: string, status: SelectionStatus): Selection | null {
  const conn = open();
  const current = getById(id);
  if (!current) return null;
  const updated: Selection = { ...current, status };
  conn
    .prepare("UPDATE selections SET status = ?, payload = ? WHERE id = ?")
    .run(status, JSON.stringify(updated), id);
  return updated;
}

export function clearAll(): number {
  const conn = open();
  const result = conn.prepare("DELETE FROM selections").run();
  return result.changes;
}

export function queueSize(): number {
  const conn = open();
  const row = conn
    .prepare("SELECT COUNT(*) AS n FROM selections WHERE status = 'pending'")
    .get() as { n: number };
  return row.n;
}

function sweepOld(): void {
  const conn = open();
  const cutoff = Date.now() - RETENTION_MS;
  conn
    .prepare(
      "DELETE FROM selections WHERE status IN ('applied', 'delivered', 'cancelled') AND created_at < ?",
    )
    .run(cutoff);
}
