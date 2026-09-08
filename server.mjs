import { createServer } from "node:http";

import next from "next";

/*
 * A thin HTTP server in front of Next.
 *
 * It exists for one reason: Next's route handlers receive a Fetch Request,
 * which has headers but no socket, so there is no way to ask "who connected?"
 * from inside a handler. The PHP backend this app replaces read REMOTE_ADDR,
 * which the web server filled in and no client could forge. This restores the
 * same guarantee by stamping the peer address onto the request before Next
 * sees it — and, crucially, deleting any value the client tried to send under
 * the same name first.
 *
 * When a real proxy is terminating connections, TRUST_PROXY=1 hands authority
 * back to its forwarding headers instead. When it is not set, those headers are
 * stripped, because an unproxied deployment that believes X-Forwarded-For lets
 * any visitor choose the address recorded against their own result.
 */

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dir = process.env.NEXT_DIR || process.cwd();

const trustProxy = !["0", "false", "no", "off", "", undefined].includes(
  process.env.TRUST_PROXY?.trim().toLowerCase()
);

/** Kept in step with PEER_HEADER in lib/server/client-ip.ts. */
const PEER_HEADER = "x-speedtest-peer";
const FORWARDING_HEADERS = ["x-forwarded-for", "x-real-ip", "x-client-ip", "cf-connecting-ipv6"];

const app = next({ dev, hostname, port, dir });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  // Always removed first: this header is ours to set, never the client's.
  delete req.headers[PEER_HEADER];

  if (!trustProxy) {
    for (const header of FORWARDING_HEADERS) delete req.headers[header];
  }

  const peer = req.socket.remoteAddress;
  if (peer) req.headers[PEER_HEADER] = peer;

  handle(req, res);
});

/*
 * The measurement endpoints hold connections open for the length of a test and
 * push a great deal through them, so the idle and header timeouts sit well
 * clear of a run. headersTimeout must stay above keepAliveTimeout, or Node
 * closes sockets it was otherwise still willing to reuse.
 */
server.keepAliveTimeout = 72_000;
server.headersTimeout = 75_000;

server.listen(port, hostname, () => {
  console.log(
    `> Ready on http://${hostname}:${port}` +
      (trustProxy ? " (trusting upstream forwarding headers)" : "")
  );
});
