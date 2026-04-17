import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { isValidExtensionOrigin } from "@chrome-to-claude/shared";
import { ensureConfigDir, TOKEN_PATH } from "./paths.ts";

let cachedToken: string | null = null;

export function rotateToken(): string {
  ensureConfigDir();
  const token = randomBytes(32).toString("hex");
  writeFileSync(TOKEN_PATH, token, { mode: 0o600 });
  cachedToken = token;
  return token;
}

export function loadOrRotateToken(): string {
  if (cachedToken) return cachedToken;
  if (existsSync(TOKEN_PATH)) {
    cachedToken = readFileSync(TOKEN_PATH, "utf8").trim();
    if (cachedToken.length >= 32) return cachedToken;
  }
  return rotateToken();
}

export function verifyToken(provided: string | null | undefined): boolean {
  if (!provided) return false;
  const expected = loadOrRotateToken();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Stricter than `startsWith("chrome-extension://")`: requires a well-formed
// 32-char a-p extension ID, so a random local process can't hand us a
// malformed Origin header and still pass the gate.
export function verifyOrigin(origin: string | null | undefined): boolean {
  return isValidExtensionOrigin(origin);
}
