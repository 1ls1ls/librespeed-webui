import "server-only";

import path from "node:path";

/**
 * Writable state (the SQLite file, the id salt) lives here. It is configurable
 * because in a container it must be a mounted volume, while in development the
 * repo's own data/ directory is the convenient place for it.
 */
export function dataDir(): string {
  return process.env.SPEEDTEST_DATA_DIR || path.join(process.cwd(), "data");
}

/**
 * Read-only assets loaded from disk at runtime rather than imported: the GeoIP
 * database and the TTFs the share-image renderer hands to Satori. These are
 * pulled into the standalone build by outputFileTracingIncludes in next.config.
 */
export function assetPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}
