// Subscriber list, kept in a SQLite file outside the release folders so it
// survives every deploy. Single writer (one node process), so no pooling.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PATH = process.env.SUBSCRIBERS_DB ?? '/var/lib/portfolio/subscribers.db';

let db: DatabaseSync | undefined;

function open(): DatabaseSync {
  if (db) return db;

  mkdirSync(dirname(PATH), { recursive: true });
  db = new DatabaseSync(PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      confirmed_at INTEGER,
      unsubscribed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS subscribers_token ON subscribers (token);
  `);
  return db;
}

export type Subscriber = {
  email: string;
  token: string;
  confirmed_at: number | null;
  unsubscribed_at: number | null;
};

/** Returns 'already' when the address is confirmed, otherwise arms a new token. */
export function beginVerification(email: string, token: string): 'pending' | 'already' {
  const database = open();
  const row = database
    .prepare('SELECT confirmed_at, unsubscribed_at FROM subscribers WHERE email = ?')
    .get(email) as { confirmed_at: number | null; unsubscribed_at: number | null } | undefined;

  if (row?.confirmed_at && !row.unsubscribed_at) return 'already';

  database
    .prepare(
      `INSERT INTO subscribers (email, token, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         token = excluded.token,
         created_at = excluded.created_at,
         confirmed_at = NULL,
         unsubscribed_at = NULL`,
    )
    .run(email, token, Date.now());

  return 'pending';
}

export function byToken(token: string): Subscriber | undefined {
  return open().prepare('SELECT * FROM subscribers WHERE token = ?').get(token) as Subscriber | undefined;
}

export function confirm(email: string): void {
  open().prepare('UPDATE subscribers SET confirmed_at = ? WHERE email = ?').run(Date.now(), email);
}

export function unsubscribe(email: string): void {
  open().prepare('UPDATE subscribers SET unsubscribed_at = ? WHERE email = ?').run(Date.now(), email);
}

export function confirmedCount(): number {
  const row = open()
    .prepare('SELECT COUNT(*) AS n FROM subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL')
    .get() as { n: number } | undefined;
  return row?.n ?? 0;
}
