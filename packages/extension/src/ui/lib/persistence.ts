export interface HostPrefs {
  width?: number;
  position?: { x: number; y: number };
  sectionOpen?: Record<string, boolean>;
}

const STORAGE_KEY = "chrome-to-claude:v3";

interface StoreShape {
  byHost: Record<string, HostPrefs>;
  global: { recentColors?: string[] };
}

const EMPTY_STORE: StoreShape = { byHost: {}, global: {} };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateHostPrefs(v: unknown): HostPrefs | null {
  if (!v || typeof v !== "object") return null;
  const raw = v as Record<string, unknown>;
  const out: HostPrefs = {};
  if (isFiniteNumber(raw.width)) out.width = raw.width;
  if (raw.position && typeof raw.position === "object") {
    const pos = raw.position as Record<string, unknown>;
    if (isFiniteNumber(pos.x) && isFiniteNumber(pos.y)) {
      out.position = { x: pos.x, y: pos.y };
    }
  }
  if (raw.sectionOpen && typeof raw.sectionOpen === "object") {
    const so = raw.sectionOpen as Record<string, unknown>;
    const safe: Record<string, boolean> = {};
    for (const [k, val] of Object.entries(so)) {
      if (typeof val === "boolean") safe[k] = val;
    }
    out.sectionOpen = safe;
  }
  return out;
}

function validateStore(v: unknown): StoreShape {
  if (!v || typeof v !== "object") return { byHost: {}, global: {} };
  const raw = v as Record<string, unknown>;
  const byHost: Record<string, HostPrefs> = {};
  if (raw.byHost && typeof raw.byHost === "object") {
    for (const [host, prefs] of Object.entries(raw.byHost as Record<string, unknown>)) {
      const valid = validateHostPrefs(prefs);
      if (valid) byHost[host] = valid;
    }
  }
  const global: StoreShape["global"] = {};
  if (raw.global && typeof raw.global === "object") {
    const g = raw.global as Record<string, unknown>;
    if (Array.isArray(g.recentColors)) {
      global.recentColors = g.recentColors.filter((c): c is string => typeof c === "string");
    }
  }
  return { byHost, global };
}

async function read(): Promise<StoreShape> {
  try {
    const obj = await chrome.storage.local.get(STORAGE_KEY);
    return validateStore(obj[STORAGE_KEY]);
  } catch {
    return { ...EMPTY_STORE, byHost: {}, global: {} };
  }
}

async function write(s: StoreShape): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: s });
  } catch {}
}

function hostOf(url = location.href): string {
  try {
    return new URL(url).host || "local";
  } catch {
    return "local";
  }
}

export async function loadHostPrefs(): Promise<HostPrefs> {
  const s = await read();
  return s.byHost[hostOf()] ?? {};
}

export async function patchHostPrefs(patch: Partial<HostPrefs>): Promise<void> {
  const s = await read();
  const host = hostOf();
  s.byHost[host] = { ...s.byHost[host], ...patch };
  await write(s);
}

export async function pushRecentColor(color: string, max = 8): Promise<string[]> {
  const s = await read();
  const list = s.global.recentColors ?? [];
  const next = [color, ...list.filter((c) => c !== color)].slice(0, max);
  s.global.recentColors = next;
  await write(s);
  return next;
}

export async function getRecentColors(): Promise<string[]> {
  const s = await read();
  return s.global.recentColors ?? [];
}
