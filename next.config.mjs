/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * Deliberately NOT output: "standalone".
   *
   * Standalone prunes node_modules down to exactly what Next's own generated
   * server.js reaches, and server.mjs here takes a different path into Next —
   * one whose modules get pruned away, so a standalone build crashes on boot
   * with MODULE_NOT_FOUND. That custom server is not optional decoration: it is
   * the only place a request's TCP peer address is visible, and without it
   * every result would be stored against an unknown client unless a reverse
   * proxy were mandatory. A larger image is the right trade for that.
   *
   * If you would rather have the smaller image: turn standalone on, drop
   * server.mjs, run Next's own server, put a proxy in front that sets
   * X-Real-IP, and set TRUST_PROXY=1.
   */

  /*
   * Serving from a subdirectory, e.g. https://intra.example/speedtest. Next
   * bakes this in while compiling, so it is a build argument rather than a
   * runtime setting like everything else here.
   */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,

  /*
   * Response compression is off on purpose.
   *
   * The download test streams cryptographically random bytes, which are
   * incompressible by construction. Running them through gzip would burn CPU on
   * every measured byte and put a compressor, not the network, on the critical
   * path — the measurement would then report the server's gzip throughput
   * rather than the link's. Nothing else this app serves is large enough for
   * compression to matter.
   */
  compress: false,

  poweredByHeader: false,
  reactStrictMode: true,

  // Native modules must stay external: they cannot be bundled by webpack.
  serverExternalPackages: ["better-sqlite3", "maxmind", "pg", "mysql2"],

  async headers() {
    return [
      {
        // Nothing under /api is ever cacheable: the measurement endpoints must
        // hit the network every time, and a cached result would be a wrong one.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          // Tells nginx not to buffer the streamed garbage response; without it
          // a reverse proxy can swallow the stream and distort the measurement.
          { key: "X-Accel-Buffering", value: "no" },
        ],
      },
      {
        // The LibreSpeed worker is versioned by the app, not by the browser.
        source: "/librespeed/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
