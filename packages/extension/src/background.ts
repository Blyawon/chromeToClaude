import {
  DAEMON_BASE_URL,
  TOKEN_STORAGE_KEY,
  type EnqueuePayload,
  type HealthResponse,
} from "@chrome-to-claude/shared";

// Keep screenshot payloads small enough to fit comfortably inside the daemon's
// 20 MB body cap even after base64 + JSON overhead. Above this, we downsample
// the crop rather than sending a giant blob.
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;
const MIN_DOWNSCALE = 0.25;

async function getToken(): Promise<string | null> {
  const obj = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
  const v = obj[TOKEN_STORAGE_KEY];
  return typeof v === "string" && v.length ? v : null;
}

async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
}

async function ensurePaired(): Promise<string | null> {
  let token = await getToken();
  if (token) return token;
  try {
    const res = await fetch(`${DAEMON_BASE_URL}/pair`, { method: "POST" });
    if (!res.ok) return null;
    const body = (await res.json()) as { token: string };
    token = body.token;
    await setToken(token);
    return token;
  } catch {
    return null;
  }
}

async function checkHealth(): Promise<{ ok: boolean; error?: string; data?: HealthResponse }> {
  try {
    const res = await fetch(`${DAEMON_BASE_URL}/health`);
    if (!res.ok) return { ok: false, error: `status ${res.status}` };
    const data = (await res.json()) as HealthResponse;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err instanceof Error ? err.message : err) };
  }
}

async function captureElementScreenshot(
  tabId: number,
  box: { x: number; y: number; w: number; h: number },
  dpr: number,
): Promise<string | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId == null) return null;
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    return await cropDataUrl(dataUrl, box, dpr);
  } catch (err) {
    console.debug("[chrome-to-claude] screenshot capture failed:", err);
    return null;
  }
}

async function cropDataUrl(
  dataUrl: string,
  box: { x: number; y: number; w: number; h: number },
  dpr: number,
): Promise<string | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    // Clamp DPR so a malicious or bogus `window.devicePixelRatio` can't blow
    // up source coords past the bitmap bounds.
    const scale = Math.max(0.1, Math.min(4, dpr > 0 ? dpr : 1));
    const sx = Math.max(0, Math.floor(box.x * scale));
    const sy = Math.max(0, Math.floor(box.y * scale));
    const sw = Math.max(1, Math.min(bitmap.width - sx, Math.floor(box.w * scale)));
    const sh = Math.max(1, Math.min(bitmap.height - sy, Math.floor(box.h * scale)));

    let downscale = 1;
    for (let attempt = 0; attempt < 4; attempt++) {
      const dw = Math.max(1, Math.round(sw * downscale));
      const dh = Math.max(1, Math.round(sh * downscale));
      const canvas = new OffscreenCanvas(dw, dh);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
      const outBlob = await canvas.convertToBlob({ type: "image/png" });
      // If the PNG is small enough, return it; else shrink by half and retry.
      if (outBlob.size <= MAX_SCREENSHOT_BYTES || downscale <= MIN_DOWNSCALE) {
        const buf = await outBlob.arrayBuffer();
        return arrayBufferToBase64(buf);
      }
      downscale *= 0.5;
    }
    return null;
  } catch (err) {
    console.debug("[chrome-to-claude] screenshot crop failed:", err);
    return null;
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function enqueue(
  tabId: number,
  incoming: EnqueuePayload,
  dpr: number,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const token = await ensurePaired();
  if (!token) {
    return {
      ok: false,
      error: "daemon offline or pairing failed — run `chrome-to-claude start`",
    };
  }

  // Don't mutate the caller's payload — construct a local copy and attach
  // the screenshot there.
  let screenshot = incoming.screenshotPng;
  if (!screenshot && incoming.boundingBox) {
    screenshot = await captureElementScreenshot(tabId, incoming.boundingBox, dpr);
  }
  const payload: EnqueuePayload = { ...incoming, screenshotPng: screenshot };

  try {
    const res = await fetch(`${DAEMON_BASE_URL}/enqueue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-auth-token": token,
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      await chrome.storage.local.remove(TOKEN_STORAGE_KEY);
      return { ok: false, error: "auth failed — try re-pairing from the extension options" };
    }
    if (!res.ok) {
      return { ok: false, error: `bridge returned ${res.status}` };
    }
    const body = (await res.json()) as { id: string };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: String(err instanceof Error ? err.message : err) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab?.id) {
    sendResponse({ ok: false, error: "no tab" });
    return false;
  }
  const tabId = sender.tab.id;
  if (msg?.type === "check-health") {
    checkHealth().then(sendResponse);
    return true;
  }
  if (msg?.type === "enqueue") {
    const dpr = typeof msg.dpr === "number" && msg.dpr > 0 ? msg.dpr : 1;
    enqueue(tabId, msg.payload as EnqueuePayload, dpr).then(sendResponse);
    return true;
  }
  return false;
});

async function togglePickerForActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "toggle-picker" }).catch(() => {});
}

chrome.action.onClicked.addListener(() => {
  void togglePickerForActiveTab();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-picker") void togglePickerForActiveTab();
});
