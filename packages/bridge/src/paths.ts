import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export const CONFIG_DIR = join(homedir(), ".chrome-to-claude");
export const TOKEN_PATH = join(CONFIG_DIR, "token");
export const DB_PATH = join(CONFIG_DIR, "queue.db");
export const PID_PATH = join(CONFIG_DIR, "daemon.pid");

export function ensureConfigDir(): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}
