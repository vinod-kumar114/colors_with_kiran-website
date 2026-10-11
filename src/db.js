/**
 * Database layer — libSQL / SQLite.
 *
 * Works in two modes from the SAME code and the SAME SQL:
 *
 *   LOCAL   DATABASE_URL=file:./data/colorswithkiran.db   (your own computer)
 *   CLOUD   DATABASE_URL=libsql://xxx.turso.io            (Turso, for Vercel)
 *           DATABASE_AUTH_TOKEN=...
 *
 * Why this exists: Vercel runs "serverless", which means there is no permanent
 * disk. A file-based database cannot survive there. Turso is SQLite served over
 * HTTP, so the exact same tables and queries keep working.
 *
 * Everything here is async (HTTP cannot be synchronous), so every caller must
 * `await`. That is the only behavioural difference from the old better-sqlite3
 * version — the SQL itself is unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');

/** True when running inside a Vercel serverless function. */
export const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/* ------------------------------------------------------------ local paths */
/*
 * Only meaningful for the local/self-hosted mode. On Vercel the filesystem is
 * read-only, so these are never written to.
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data');

export const UPLOAD_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(PUBLIC_DIR, 'uploads');

export const FULL_DIR = path.join(UPLOAD_DIR, 'full');
export const THUMB_DIR = path.join(UPLOAD_DIR, 'thumb');

/** Create the local folders — skipped on a read-only serverless filesystem. */
export function ensureLocalDirs() {
  if (IS_SERVERLESS) return false;
  try {
    for (const dir of [DATA_DIR, UPLOAD_DIR, FULL_DIR, THUMB_DIR]) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------- connection */

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  `file:${path.join(DATA_DIR, 'colorswithkiran.db')}`;

const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

export const IS_FILE_DB = DATABASE_URL.startsWith('file:');

if (IS_FILE_DB) ensureLocalDirs();

let _client = null;

async function client() {
  if (_client) return _client;

  if (IS_FILE_DB) {
    // Local file database — uses the native driver. Never loaded on Vercel.
    const { createClient } = await import('@libsql/client');
    _client = createClient({ url: DATABASE_URL });
  } else {
    // Remote (Turso). The /web build is pure HTTP with no native bindings,
    // which is exactly what a serverless function needs.
    const { createClient } = await import('@libsql/client/web');
    _client = createClient({ url: DATABASE_URL, authToken: AUTH_TOKEN });
  }
  return _client;
}

/* ------------------------------------------------------------- row shape */
/*
 * libSQL returns array-like Row objects. Converting to plain objects keeps
 * `{...row}`, `Object.entries(row)` and EJS templates behaving exactly as they
 * did with better-sqlite3.
 */
function plain(row) {
  if (!row) return row;
  const out = {};
  for (const key of Object.keys(row)) {
    const v = row[key];
    out[key] = typeof v === 'bigint' ? Number(v) : v;
  }
  return out;
}

/* ------------------------------------------------------------- query API */

export const sql = {
  /** One row, or undefined. */
  async get(query, params = []) {
    const c = await client();
    const rs = await c.execute({ sql: query, args: params });
    return rs.rows.length ? plain(rs.rows[0]) : undefined;
  },

  /** All rows as plain objects. */
  async all(query, params = []) {
    const c = await client();
    const rs = await c.execute({ sql: query, args: params });
    return rs.rows.map(plain);
  },

  /** INSERT / UPDATE / DELETE. Mirrors better-sqlite3's return shape. */
  async run(query, params = []) {
    const c = await client();
    const rs = await c.execute({ sql: query, args: params });
    return {
      changes: Number(rs.rowsAffected || 0),
      lastInsertRowid:
        rs.lastInsertRowid === undefined || rs.lastInsertRowid === null
          ? null
          : Number(rs.lastInsertRowid),
    };
  },

  /** Run several statements atomically. Replaces db.transaction(). */
  async batch(statements) {
    const list = statements
      .filter(Boolean)
      .map((s) => (Array.isArray(s) ? { sql: s[0], args: s[1] || [] } : s));
    if (!list.length) return [];
    const c = await client();
    return c.batch(list, 'write');
  },

  /** Multiple statements in one string (schema creation). */
  async script(text) {
    const c = await client();
    return c.executeMultiple(text);
  },
};

/* --------------------------------------------------------------- schema */

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS designs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  caption     TEXT DEFAULT '',
  price_type  TEXT NOT NULL DEFAULT 'starting',
  price_value TEXT DEFAULT '',
  placement   TEXT NOT NULL DEFAULT 'portfolio',
  is_featured INTEGER NOT NULL DEFAULT 0,
  image       TEXT DEFAULT '',
  thumb       TEXT DEFAULT '',
  width       INTEGER DEFAULT 0,
  height      INTEGER DEFAULT 0,
  taken_on    TEXT DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  deleted_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  service    TEXT NOT NULL,
  price_text TEXT NOT NULL DEFAULT '',
  note       TEXT DEFAULT '',
  is_active  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  review     TEXT NOT NULL,
  event_type TEXT DEFAULT '',
  photo      TEXT DEFAULT '',
  rating     INTEGER NOT NULL DEFAULT 5,
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  phone          TEXT DEFAULT '',
  whatsapp       TEXT DEFAULT '',
  event_type     TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  preferred_time TEXT DEFAULT '',
  location       TEXT DEFAULT '',
  category       TEXT DEFAULT '',
  people_count   TEXT DEFAULT '',
  message        TEXT DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'new',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change   INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_designs_cat      ON designs(category_id);
CREATE INDEX IF NOT EXISTS idx_designs_place    ON designs(placement, deleted_at);
CREATE INDEX IF NOT EXISTS idx_designs_featured ON designs(is_featured, deleted_at);
CREATE INDEX IF NOT EXISTS idx_inq_status       ON inquiries(status, created_at);
`;

let _schemaReady = null;

/** Idempotent. Safe to call on every cold start. */
export function initSchema() {
  if (!_schemaReady) {
    _schemaReady = (async () => {
      await sql.script(SCHEMA);
    })().catch((e) => {
      _schemaReady = null; // allow a retry on the next request
      throw e;
    });
  }
  return _schemaReady;
}

/* ---------------------------------------------------------------- helpers */

export function slugify(text, fallback = 'item') {
  const s = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return s || fallback;
}

/** Return a slug that does not yet exist in `table` (ignoring row `exceptId`). */
export async function uniqueSlug(table, text, exceptId = null) {
  const base = slugify(text);
  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const hit = await sql.get(
      `SELECT id FROM ${table} WHERE slug = ? AND id IS NOT ?`,
      [candidate, exceptId]
    );
    if (!hit) return candidate;
    candidate = `${base}-${n++}`;
  }
}

export async function nextSortOrder(table, where = '1=1', params = []) {
  const row = await sql.get(
    `SELECT COALESCE(MAX(sort_order), 0) + 10 AS n FROM ${table} WHERE ${where}`,
    params
  );
  return row?.n ?? 10;
}
