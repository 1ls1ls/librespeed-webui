import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { dataDir } from "./paths";

/*
 * Share ids.
 *
 * Sequential row ids would let anyone walk /result/1, /result/2 and read every
 * measurement the instance has ever taken. LibreSpeed solves this with a
 * reversible 32-bit scramble keyed by a per-installation salt, and this is a
 * faithful port of it: same bit operations, same base-36 encoding, same
 * seven-character output. Keeping the algorithm identical means a database
 * migrated from a PHP LibreSpeed install keeps handing out the same share links
 * it always did, provided the salt comes across with it.
 *
 * It is a scramble, not a cipher. It stops enumeration; it is not a secret and
 * must never be used to protect anything that actually needs protecting.
 */

const SALT_FILE = path.join(dataDir(), "id-salt.json");

let cachedSalt: number | null = null;

function generateSalt(): number {
  return randomBytes(4).readUInt32BE(0);
}

/**
 * Resolves the installation's salt, preferring an explicit environment value so
 * that a horizontally scaled deployment can share one without a shared volume.
 * Otherwise it is generated once and persisted next to the database.
 */
function getSalt(): number {
  if (cachedSalt !== null) return cachedSalt;

  const fromEnv = process.env.SPEEDTEST_ID_SALT;
  if (fromEnv) {
    const parsed = Number(fromEnv.startsWith("0x") ? fromEnv : Number(fromEnv));
    if (Number.isFinite(parsed)) {
      cachedSalt = parsed >>> 0;
      return cachedSalt;
    }
    console.warn("[ids] SPEEDTEST_ID_SALT is not a number; falling back to the salt file");
  }

  try {
    if (existsSync(SALT_FILE)) {
      const parsed = JSON.parse(readFileSync(SALT_FILE, "utf8")) as { salt?: number };
      if (typeof parsed.salt === "number" && Number.isFinite(parsed.salt)) {
        cachedSalt = parsed.salt >>> 0;
        return cachedSalt;
      }
    }
  } catch (err) {
    console.warn("[ids] salt file unreadable, generating a new one:", err);
  }

  const salt = generateSalt();
  try {
    mkdirSync(path.dirname(SALT_FILE), { recursive: true });
    writeFileSync(SALT_FILE, JSON.stringify({ salt }), { mode: 0o600 });
  } catch (err) {
    // A read-only data directory is survivable for the lifetime of the process,
    // but every restart would then invalidate previously issued links.
    console.warn("[ids] could not persist the salt; share links will not survive a restart:", err);
  }
  cachedSalt = salt;
  return salt;
}

/** The reversible 32-bit permutation: swap halves, swap adjacent bits, xor. */
function permute(value: number, decode: boolean): number {
  const salt = getSalt();
  let id = value >>> 0;

  if (decode) {
    id = (id ^ salt) >>> 0;
    id = (((id & 0xaaaaaaaa) >>> 1) | ((id & 0x55555555) << 1)) >>> 0;
    id = (((id & 0x0000ffff) << 16) | ((id & 0xffff0000) >>> 16)) >>> 0;
    return id;
  }

  id = (((id & 0x0000ffff) << 16) | ((id & 0xffff0000) >>> 16)) >>> 0;
  id = (((id & 0xaaaaaaaa) >>> 1) | ((id & 0x55555555) << 1)) >>> 0;
  return (id ^ salt) >>> 0;
}

export function obfuscationEnabled(): boolean {
  const raw = process.env.SPEEDTEST_OBFUSCATE_IDS;
  if (raw === undefined || raw === "") return true;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

/** Row id -> public share id. */
export function encodeId(rowId: number): string {
  if (!obfuscationEnabled()) return String(rowId);
  // The +1 mirrors upstream, which shifts off zero so row 0 still encodes.
  return permute(rowId + 1, false).toString(36).padStart(7, "0");
}

/** Public share id -> row id, or null when the id is not well formed. */
export function decodeId(shareId: string): number | null {
  const trimmed = shareId.trim();
  if (!trimmed) return null;

  if (!obfuscationEnabled()) {
    const plain = Number(trimmed);
    return Number.isInteger(plain) && plain >= 0 ? plain : null;
  }

  if (!/^[0-9a-z]{1,8}$/i.test(trimmed)) return null;
  const parsed = parseInt(trimmed, 36);
  if (!Number.isFinite(parsed)) return null;

  const rowId = permute(parsed, true) - 1;
  return Number.isInteger(rowId) && rowId >= 0 ? rowId : null;
}
