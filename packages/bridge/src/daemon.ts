import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { DAEMON_BASE_URL } from "@chrome-to-claude/shared";
import { ensureConfigDir, PID_PATH } from "./paths.ts";
import { loadOrRotateToken } from "./auth.ts";
import { startHttpServer } from "./http.ts";
import { closeDatabase } from "./queue.ts";

export async function runDaemon(): Promise<void> {
  ensureConfigDir();
  const token = loadOrRotateToken();

  let server;
  try {
    server = await startHttpServer();
  } catch (err) {
    console.error(`[bridge] failed to bind ${DAEMON_BASE_URL}: ${String(err)}`);
    console.error("[bridge] is another daemon already running on this port?");
    process.exit(1);
  }

  writeFileSync(PID_PATH, String(process.pid));

  let cleaningUp = false;
  const cleanup = () => {
    if (cleaningUp) return;
    cleaningUp = true;
    if (existsSync(PID_PATH)) {
      try {
        unlinkSync(PID_PATH);
      } catch {}
    }
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
    // Fallback in case server.close doesn't drain cleanly.
    setTimeout(() => {
      closeDatabase();
      process.exit(0);
    }, 500).unref();
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  console.log(`[bridge] listening on ${DAEMON_BASE_URL}`);
  console.log(`[bridge] token: ${token}`);
  console.log(`[bridge] pair the extension via its options page.`);
}
