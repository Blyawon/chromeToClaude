import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  DAEMON_HOST,
  DAEMON_PORT,
  type EnqueuePayload,
  type HealthResponse,
  type PairResponse,
  isValidSelectionId,
  validateEnqueuePayload,
} from "@chrome-to-claude/shared";
import { verifyOrigin, verifyToken, rotateToken, loadOrRotateToken } from "./auth.ts";
import {
  clearAll,
  enqueue,
  getById,
  getLatestPending,
  listPending,
  queueSize,
  setStatus,
} from "./queue.ts";

const VERSION = "0.1.0";
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB (selections carry base64 screenshots)
const REQUEST_TIMEOUT_MS = 30_000;
const HEADERS_TIMEOUT_MS = 10_000;

function corsHeaders(origin: string | undefined): Record<string, string> {
  // Only echo back origins we actually accept; otherwise omit the header so
  // the browser blocks by default instead of us trusting an arbitrary origin.
  const allow = verifyOrigin(origin) ? origin! : "null";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-auth-token",
    "access-control-max-age": "600",
  };
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

function unauthorized(
  res: ServerResponse,
  reason: string,
  extraHeaders: Record<string, string> = {},
): void {
  sendJson(res, 401, { error: "unauthorized", reason }, extraHeaders);
}

async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const body = await readBody(req);
  if (!body) return {} as T;
  return JSON.parse(body) as T;
}

function gateExtension(req: IncomingMessage): string | null {
  if (!verifyOrigin(req.headers.origin as string | undefined)) return "bad_origin";
  const token = req.headers["x-auth-token"];
  if (!verifyToken(typeof token === "string" ? token : null)) return "bad_token";
  return null;
}

function gateLoopback(req: IncomingMessage): string | null {
  const origin = req.headers.origin as string | undefined;
  if (origin && !verifyOrigin(origin)) return "bad_origin";
  const token = req.headers["x-auth-token"];
  if (!verifyToken(typeof token === "string" ? token : null)) return "bad_token";
  return null;
}

export function startHttpServer() {
  loadOrRotateToken();

  const server = createServer(async (req, res) => {
    const origin = req.headers.origin as string | undefined;
    const cors = corsHeaders(origin);

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, cors);
        res.end();
        return;
      }

      const url = new URL(req.url ?? "/", `http://${DAEMON_HOST}:${DAEMON_PORT}`);
      const path = url.pathname;

      if (path === "/health" && req.method === "GET") {
        const body: HealthResponse = { ok: true, version: VERSION, queueSize: queueSize() };
        sendJson(res, 200, body, cors);
        return;
      }

      if (path === "/pair" && req.method === "POST") {
        if (!verifyOrigin(origin)) return unauthorized(res, "bad_origin", cors);
        const token = loadOrRotateToken();
        const body: PairResponse = { token };
        sendJson(res, 200, body, cors);
        return;
      }

      if (path === "/pair/rotate" && req.method === "POST") {
        if (!verifyOrigin(origin)) return unauthorized(res, "bad_origin", cors);
        const token = rotateToken();
        const body: PairResponse = { token };
        sendJson(res, 200, body, cors);
        return;
      }

      if (path === "/enqueue" && req.method === "POST") {
        const reason = gateExtension(req);
        if (reason) return unauthorized(res, reason, cors);
        const payload = await readJson<unknown>(req);
        const validation = validateEnqueuePayload(payload);
        if (!validation.ok) {
          sendJson(res, 400, { error: "invalid_payload", reason: validation.error }, cors);
          return;
        }
        const stored = enqueue(payload as EnqueuePayload);
        sendJson(res, 200, { id: stored.id }, cors);
        return;
      }

      if (path === "/queue" && req.method === "GET") {
        const reason = gateLoopback(req);
        if (reason) return unauthorized(res, reason, cors);
        sendJson(res, 200, { selections: listPending() }, cors);
        return;
      }

      if (path === "/latest" && req.method === "GET") {
        const reason = gateLoopback(req);
        if (reason) return unauthorized(res, reason, cors);
        sendJson(res, 200, { selection: getLatestPending() }, cors);
        return;
      }

      if (path.startsWith("/selection/") && req.method === "GET") {
        const reason = gateLoopback(req);
        if (reason) return unauthorized(res, reason, cors);
        const id = decodeURIComponent(path.slice("/selection/".length));
        if (!isValidSelectionId(id)) {
          return sendJson(res, 400, { error: "invalid_id" }, cors);
        }
        const sel = getById(id);
        if (!sel) return sendJson(res, 404, { error: "not_found" }, cors);
        sendJson(res, 200, { selection: sel }, cors);
        return;
      }

      if (path === "/mark-applied" && req.method === "POST") {
        const reason = gateLoopback(req);
        if (reason) return unauthorized(res, reason, cors);
        const { id } = await readJson<{ id: string }>(req);
        if (!isValidSelectionId(id)) {
          return sendJson(res, 400, { error: "invalid_id" }, cors);
        }
        const updated = setStatus(id, "applied");
        if (!updated) return sendJson(res, 404, { error: "not_found" }, cors);
        sendJson(res, 200, { ok: true }, cors);
        return;
      }

      if (path === "/mark-delivered" && req.method === "POST") {
        const reason = gateLoopback(req);
        if (reason) return unauthorized(res, reason, cors);
        const { id } = await readJson<{ id: string }>(req);
        if (!isValidSelectionId(id)) {
          return sendJson(res, 400, { error: "invalid_id" }, cors);
        }
        const updated = setStatus(id, "delivered");
        if (!updated) return sendJson(res, 404, { error: "not_found" }, cors);
        sendJson(res, 200, { ok: true }, cors);
        return;
      }

      if (path === "/clear" && req.method === "POST") {
        const reason = gateLoopback(req);
        if (reason) return unauthorized(res, reason, cors);
        const removed = clearAll();
        sendJson(res, 200, { removed }, cors);
        return;
      }

      sendJson(res, 404, { error: "not_found" }, cors);
    } catch (err) {
      // Log full detail locally; don't leak paths / sql error text to clients.
      console.error("[bridge] server error:", err);
      sendJson(res, 500, { error: "internal" }, cors);
    }
  });

  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;

  return new Promise<ReturnType<typeof createServer>>((resolve, reject) => {
    server.once("error", reject);
    server.listen(DAEMON_PORT, DAEMON_HOST, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}
