import type { EnqueuePayload } from "@chrome-to-claude/shared";

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

// MV3 service workers get torn down aggressively. Without a cap, if the SW
// dies mid-request, `sendMessage` resolves to `undefined` via
// `chrome.runtime.lastError` but worst case its promise can stall behind a
// slow awaken. Force a hard timeout so the UI always makes forward progress.
const HEALTH_TIMEOUT_MS = 5_000;
const ENQUEUE_TIMEOUT_MS = 30_000;

async function sendWithTimeout<T>(
  message: unknown,
  timeoutMs: number,
  timeoutValue: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(timeoutValue), timeoutMs);
  });
  try {
    const result = (await Promise.race([
      chrome.runtime.sendMessage(message) as Promise<T>,
      timeout,
    ])) as T;
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkDaemonHealth(): Promise<{ ok: boolean; error?: string }> {
  const res = await sendWithTimeout<{ ok: boolean; error?: string } | undefined>(
    { type: "check-health" },
    HEALTH_TIMEOUT_MS,
    { ok: false, error: "timeout" },
  );
  return res ?? { ok: false, error: "no response" };
}

export async function sendToDaemon(payload: EnqueuePayload): Promise<SendResult> {
  const res = await sendWithTimeout<SendResult | undefined>(
    {
      type: "enqueue",
      payload,
      dpr: window.devicePixelRatio || 1,
    },
    ENQUEUE_TIMEOUT_MS,
    { ok: false, error: "timeout" },
  );
  return res ?? { ok: false, error: "no response" };
}
