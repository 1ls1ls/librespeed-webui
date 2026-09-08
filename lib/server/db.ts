import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";

import { dataDir } from "./paths";

/*
 * Telemetry storage.
 *
 * The table is deliberately the one LibreSpeed has always used —
 * speedtest_users, same eleven columns, same text typing for the measurements —
 * so an existing PHP LibreSpeed database can be pointed at this app and keep
 * working, and so anything already built against that schema (dashboards,
 * exports, the stats page) still reads. The storage engine is swappable because
 * the deployments this targets range from a single SQLite file on an intranet
 * box to a shared Postgres.
 */

export interface TelemetryInput {
  ip: string;
  ispinfo: string;
  extra: string;
  ua: string;
  lang: string;
  dl: string;
  ul: string;
  ping: string;
  jitter: string;
  log: string;
}

export interface TelemetryRow extends TelemetryInput {
  id: number;
  /** Normalised to ISO 8601 regardless of what the backend stores. */
  timestamp: string;
}

interface Store {
  insert(row: TelemetryInput): Promise<number>;
  getById(id: number): Promise<TelemetryRow | null>;
  recent(limit: number): Promise<TelemetryRow[]>;
}

export type DbType = "sqlite" | "postgres" | "mysql";

export function dbType(): DbType {
  const raw = (process.env.SPEEDTEST_DB_TYPE || "sqlite").toLowerCase();
  if (raw === "postgres" || raw === "postgresql" || raw === "pg") return "postgres";
  if (raw === "mysql" || raw === "mariadb") return "mysql";
  return "sqlite";
}

const COLUMNS = "id, timestamp, ip, ispinfo, extra, ua, lang, dl, ul, ping, jitter, log";

/**
 * Backends disagree about the timestamp type: SQLite hands back a UTC string
 * with no zone marker, while pg and mysql2 hand back a Date. Normalising here
 * means everything downstream — the API, the result page, the share image —
 * sees one format.
 */
function normaliseTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    // "2026-09-08 14:22:31" is UTC in every schema shipped here, but Date.parse
    // reads a bare datetime as local time, so the zone has to be made explicit.
    const bare = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
    const parsed = new Date(bare ? `${value.replace(" ", "T")}Z` : value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    return value;
  }
  return new Date().toISOString();
}

function toRow(raw: Record<string, unknown>): TelemetryRow {
  const text = (key: string) => (raw[key] == null ? "" : String(raw[key]));
  return {
    id: Number(raw.id),
    timestamp: normaliseTimestamp(raw.timestamp),
    ip: text("ip"),
    ispinfo: text("ispinfo"),
    extra: text("extra"),
    ua: text("ua"),
    lang: text("lang"),
    dl: text("dl"),
    ul: text("ul"),
    ping: text("ping"),
    jitter: text("jitter"),
    log: text("log"),
  };
}

/* ------------------------------------------------------------------ SQLite */

function createSqliteStore(): Store {
  // Required lazily so that a Postgres deployment never pays for loading the
  // native module, and so a missing build of it is not fatal for that case.
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");

  const file = process.env.SPEEDTEST_DB_PATH || path.join(dataDir(), "telemetry.db");
  mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  // WAL lets the read path (result pages, share images) run concurrently with
  // inserts, which matters when several browsers finish a test at once.
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS speedtest_users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip        TEXT NOT NULL,
      ispinfo   TEXT,
      extra     TEXT,
      ua        TEXT NOT NULL,
      lang      TEXT NOT NULL,
      dl        TEXT,
      ul        TEXT,
      ping      TEXT,
      jitter    TEXT,
      log       TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_speedtest_users_timestamp
      ON speedtest_users (timestamp DESC);
  `);

  const insertStmt = db.prepare(
    `INSERT INTO speedtest_users (ip, ispinfo, extra, ua, lang, dl, ul, ping, jitter, log)
     VALUES (@ip, @ispinfo, @extra, @ua, @lang, @dl, @ul, @ping, @jitter, @log)`
  );
  const byIdStmt = db.prepare(`SELECT ${COLUMNS} FROM speedtest_users WHERE id = ?`);
  const recentStmt = db.prepare(
    `SELECT ${COLUMNS} FROM speedtest_users ORDER BY id DESC LIMIT ?`
  );

  return {
    async insert(row) {
      return Number(insertStmt.run(row).lastInsertRowid);
    },
    async getById(id) {
      const found = byIdStmt.get(id) as Record<string, unknown> | undefined;
      return found ? toRow(found) : null;
    },
    async recent(limit) {
      return (recentStmt.all(limit) as Record<string, unknown>[]).map(toRow);
    },
  };
}

/* -------------------------------------------------------------- PostgreSQL */

function createPostgresStore(): Store {
  const { Pool } = require("pg") as typeof import("pg");

  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.SPEEDTEST_DB_HOST || "localhost",
        port: Number(process.env.SPEEDTEST_DB_PORT || 5432),
        user: process.env.SPEEDTEST_DB_USER,
        password: process.env.SPEEDTEST_DB_PASSWORD,
        database: process.env.SPEEDTEST_DB_NAME || "speedtest_telemetry",
      });

  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS speedtest_users (
      id        SERIAL PRIMARY KEY,
      timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
      ip        TEXT NOT NULL,
      ispinfo   TEXT,
      extra     TEXT,
      ua        TEXT NOT NULL,
      lang      TEXT NOT NULL,
      dl        TEXT,
      ul        TEXT,
      ping      TEXT,
      jitter    TEXT,
      log       TEXT
    )
  `);

  return {
    async insert(row) {
      await ready;
      const result = await pool.query<{ id: number }>(
        `INSERT INTO speedtest_users (ip, ispinfo, extra, ua, lang, dl, ul, ping, jitter, log)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [row.ip, row.ispinfo, row.extra, row.ua, row.lang, row.dl, row.ul, row.ping, row.jitter, row.log]
      );
      return result.rows[0].id;
    },
    async getById(id) {
      await ready;
      const result = await pool.query(
        `SELECT ${COLUMNS} FROM speedtest_users WHERE id = $1`,
        [id]
      );
      return result.rows[0] ? toRow(result.rows[0]) : null;
    },
    async recent(limit) {
      await ready;
      const result = await pool.query(
        `SELECT ${COLUMNS} FROM speedtest_users ORDER BY id DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(toRow);
    },
  };
}

/* -------------------------------------------------------------- MySQL ---- */

function createMysqlStore(): Store {
  const mysql = require("mysql2/promise") as typeof import("mysql2/promise");

  const pool = process.env.DATABASE_URL
    ? mysql.createPool(process.env.DATABASE_URL)
    : mysql.createPool({
        host: process.env.SPEEDTEST_DB_HOST || "localhost",
        port: Number(process.env.SPEEDTEST_DB_PORT || 3306),
        user: process.env.SPEEDTEST_DB_USER,
        password: process.env.SPEEDTEST_DB_PASSWORD,
        database: process.env.SPEEDTEST_DB_NAME || "speedtest_telemetry",
        waitForConnections: true,
        connectionLimit: 10,
      });

  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS speedtest_users (
      id        INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip        TEXT NOT NULL,
      ispinfo   TEXT,
      extra     TEXT,
      ua        TEXT NOT NULL,
      lang      TEXT NOT NULL,
      dl        TEXT,
      ul        TEXT,
      ping      TEXT,
      jitter    TEXT,
      log       LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  return {
    async insert(row) {
      await ready;
      const [result] = await pool.query(
        `INSERT INTO speedtest_users (ip, ispinfo, extra, ua, lang, dl, ul, ping, jitter, log)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.ip, row.ispinfo, row.extra, row.ua, row.lang, row.dl, row.ul, row.ping, row.jitter, row.log]
      );
      return (result as { insertId: number }).insertId;
    },
    async getById(id) {
      await ready;
      const [rows] = await pool.query(`SELECT ${COLUMNS} FROM speedtest_users WHERE id = ?`, [id]);
      const list = rows as Record<string, unknown>[];
      return list[0] ? toRow(list[0]) : null;
    },
    async recent(limit) {
      await ready;
      const [rows] = await pool.query(
        `SELECT ${COLUMNS} FROM speedtest_users ORDER BY id DESC LIMIT ?`,
        [limit]
      );
      return (rows as Record<string, unknown>[]).map(toRow);
    },
  };
}

/*
 * One store per process. Next re-evaluates modules across route handlers but
 * keeps module state within a process, and in development it discards them on
 * every recompile — hence the global, which stops a hot reload from leaking a
 * new SQLite handle or connection pool on each edit.
 */
declare global {
  // eslint-disable-next-line no-var
  var __speedtestStore: Store | undefined;
}

export function getStore(): Store {
  if (!globalThis.__speedtestStore) {
    const type = dbType();
    try {
      globalThis.__speedtestStore =
        type === "postgres"
          ? createPostgresStore()
          : type === "mysql"
            ? createMysqlStore()
            : createSqliteStore();
    } catch (err) {
      throw new Error(
        `Could not initialise the ${type} telemetry store. ` +
          (type === "sqlite"
            ? "Check that SPEEDTEST_DATA_DIR is writable."
            : `Install the driver (${type === "postgres" ? "pg" : "mysql2"}) and check the connection settings.`) +
          `\nCause: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return globalThis.__speedtestStore;
}
