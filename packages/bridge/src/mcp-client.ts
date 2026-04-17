import {
  DAEMON_BASE_URL,
  type Selection,
  type SelectionSummary,
} from "@chrome-to-claude/shared";
import { loadOrRotateToken } from "./auth.ts";

type DaemonError = {
  kind: "daemon_offline" | "http_error" | "not_found";
  message: string;
};

export class DaemonUnavailableError extends Error {
  constructor(public detail: DaemonError) {
    super(detail.message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = loadOrRotateToken();
  let res: Response;
  try {
    res = await fetch(`${DAEMON_BASE_URL}${path}`, {
      ...init,
      headers: {
        "x-auth-token": token,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    throw new DaemonUnavailableError({
      kind: "daemon_offline",
      message: `bridge daemon not reachable at ${DAEMON_BASE_URL} — run \`chrome-to-claude start\` in a terminal. (${String(err)})`,
    });
  }
  if (res.status === 404) {
    throw new DaemonUnavailableError({ kind: "not_found", message: "not found" });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DaemonUnavailableError({
      kind: "http_error",
      message: `bridge returned ${res.status}: ${text}`,
    });
  }
  return (await res.json()) as T;
}

export async function listPending(): Promise<SelectionSummary[]> {
  const body = await call<{ selections: Selection[] }>("/queue?pending=1");
  return body.selections.map(summarize);
}

export async function getSelection(id: string): Promise<Selection | null> {
  try {
    const body = await call<{ selection: Selection }>(`/selection/${encodeURIComponent(id)}`);
    return body.selection;
  } catch (err) {
    if (err instanceof DaemonUnavailableError && err.detail.kind === "not_found") {
      return null;
    }
    throw err;
  }
}

export async function getLatest(): Promise<Selection | null> {
  const body = await call<{ selection: Selection | null }>("/latest");
  return body.selection;
}

export async function markApplied(id: string): Promise<void> {
  await call("/mark-applied", { method: "POST", body: JSON.stringify({ id }) });
}

export async function markDelivered(id: string): Promise<void> {
  await call("/mark-delivered", { method: "POST", body: JSON.stringify({ id }) });
}

export async function clearAll(): Promise<number> {
  const body = await call<{ removed: number }>("/clear", { method: "POST" });
  return body.removed;
}

function summarize(s: Selection): SelectionSummary {
  return {
    id: s.id,
    createdAt: s.createdAt,
    url: s.url,
    title: s.title,
    prompt: s.prompt,
    componentName:
      s.framework.type !== "none" ? s.framework.componentName : undefined,
    sourceFile:
      s.framework.type !== "none" ? s.framework.sourceFile : undefined,
    status: s.status,
  };
}
