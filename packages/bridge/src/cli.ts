#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { DAEMON_BASE_URL } from "@chrome-to-claude/shared";
import { PID_PATH } from "./paths.ts";
import { loadOrRotateToken, rotateToken } from "./auth.ts";
import { runDaemon } from "./daemon.ts";

async function cmdStatus(): Promise<number> {
  try {
    const res = await fetch(`${DAEMON_BASE_URL}/health`);
    const body = (await res.json()) as { ok: boolean; version: string; queueSize: number };
    console.log(`daemon running at ${DAEMON_BASE_URL}`);
    console.log(`  version: ${body.version}`);
    console.log(`  pending: ${body.queueSize}`);
    return 0;
  } catch {
    console.log(`daemon NOT running at ${DAEMON_BASE_URL}`);
    if (existsSync(PID_PATH)) {
      console.log(`  stale pid file: ${PID_PATH} (contents: ${readFileSync(PID_PATH, "utf8")})`);
    }
    return 1;
  }
}

function cmdPair(): number {
  const token = loadOrRotateToken();
  console.log(token);
  return 0;
}

function cmdRotate(): number {
  const token = rotateToken();
  console.log(token);
  return 0;
}

async function cmdClear(): Promise<number> {
  const token = loadOrRotateToken();
  try {
    const res = await fetch(`${DAEMON_BASE_URL}/clear`, {
      method: "POST",
      headers: { "x-auth-token": token },
    });
    if (!res.ok) {
      console.error(`failed: ${res.status}`);
      return 1;
    }
    const body = (await res.json()) as { removed: number };
    console.log(`removed ${body.removed} selections`);
    return 0;
  } catch (err) {
    console.error(`daemon offline (${String(err instanceof Error ? err.message : err)})`);
    return 1;
  }
}

function usage(): void {
  console.log(`chrome-to-claude — Chrome → MCP bridge

Usage:
  chrome-to-claude start       start the daemon (foreground)
  chrome-to-claude status      check whether the daemon is running
  chrome-to-claude pair        print the pairing token (for extension setup)
  chrome-to-claude rotate      rotate the token
  chrome-to-claude clear       clear all queued selections
  chrome-to-claude mcp         run the MCP stdio shim (used by Claude clients)
`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case "start":
      await runDaemon();
      return;
    case "status":
      process.exit(await cmdStatus());
    case "pair":
      process.exit(cmdPair());
    case "rotate":
      process.exit(cmdRotate());
    case "clear":
      process.exit(await cmdClear());
    case "mcp":
      await import("./mcp-stdio.ts");
      return;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      usage();
      process.exit(0);
    default:
      console.error(`unknown command: ${cmd}\n`);
      usage();
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
