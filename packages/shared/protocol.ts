export const DAEMON_PORT = 47823;
export const DAEMON_HOST = "127.0.0.1";
export const DAEMON_BASE_URL = `http://${DAEMON_HOST}:${DAEMON_PORT}`;

export const TOKEN_STORAGE_KEY = "chrome-to-claude:token";

export type StyleDeltaEntry = {
  property: string;
  oldValue: string;
  newValue: string;
  important: boolean;
};

export type StyleDelta = StyleDeltaEntry[];

export type FrameworkInfo =
  | {
      type: "react" | "vue" | "svelte";
      componentName?: string;
      sourceFile?: string;
      sourceLine?: number;
      sourceColumn?: number;
      props?: Record<string, unknown>;
    }
  | { type: "none" };

export type SelectionStatus = "pending" | "delivered" | "applied" | "cancelled";

export type Selection = {
  id: string;
  createdAt: number;
  url: string;
  title: string;
  selector: string;
  tagName: string;
  classes: string[];
  idAttr: string | null;
  textContent: string;
  outerHTML: string;
  boundingBox: { x: number; y: number; w: number; h: number };
  screenshotPng: string | null;
  framework: FrameworkInfo;
  computedStyles: Record<string, string>;
  styleDelta: StyleDelta;
  prompt: string;
  status: SelectionStatus;
};

export type SelectionSummary = {
  id: string;
  createdAt: number;
  url: string;
  title: string;
  prompt: string;
  componentName?: string;
  sourceFile?: string;
  status: SelectionStatus;
};

export type EnqueuePayload = Omit<Selection, "id" | "createdAt" | "status">;

export type HealthResponse = {
  ok: true;
  version: string;
  queueSize: number;
};

export type PairResponse = {
  token: string;
};

// Chrome extension IDs are 32 lowercase a-p characters.
const EXTENSION_ORIGIN_RE = /^chrome-extension:\/\/[a-p]{32}\/?$/;

export function isValidExtensionOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return EXTENSION_ORIGIN_RE.test(origin);
}

// RFC 4122 UUID (any version). randomUUID() in Node/browsers produces v4.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSelectionId(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_RE.test(id);
}

export interface ValidateResult {
  ok: boolean;
  error?: string;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function validateEnqueuePayload(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "payload not an object" };
  const p = raw as Record<string, unknown>;

  const requiredStrings: Array<keyof EnqueuePayload> = [
    "url",
    "title",
    "selector",
    "tagName",
    "textContent",
    "outerHTML",
    "prompt",
  ];
  for (const k of requiredStrings) {
    if (!isString(p[k])) return { ok: false, error: `${String(k)} must be string` };
  }

  if (!Array.isArray(p.classes) || !p.classes.every(isString)) {
    return { ok: false, error: "classes must be string[]" };
  }

  if (p.idAttr !== null && !isString(p.idAttr)) {
    return { ok: false, error: "idAttr must be string | null" };
  }

  const bb = p.boundingBox as Record<string, unknown> | undefined;
  if (
    !bb ||
    typeof bb !== "object" ||
    !isFiniteNumber(bb.x) ||
    !isFiniteNumber(bb.y) ||
    !isFiniteNumber(bb.w) ||
    !isFiniteNumber(bb.h)
  ) {
    return { ok: false, error: "boundingBox must be {x,y,w,h} of finite numbers" };
  }

  if (p.screenshotPng !== null && !isString(p.screenshotPng)) {
    return { ok: false, error: "screenshotPng must be string | null" };
  }

  const fw = p.framework as Record<string, unknown> | undefined;
  if (!fw || typeof fw !== "object" || !isString(fw.type)) {
    return { ok: false, error: "framework missing" };
  }
  if (!["react", "vue", "svelte", "none"].includes(fw.type)) {
    return { ok: false, error: `framework.type invalid: ${fw.type}` };
  }

  if (!p.computedStyles || typeof p.computedStyles !== "object") {
    return { ok: false, error: "computedStyles must be object" };
  }
  for (const [k, v] of Object.entries(p.computedStyles)) {
    if (!isString(v)) return { ok: false, error: `computedStyles.${k} not string` };
  }

  if (!Array.isArray(p.styleDelta)) return { ok: false, error: "styleDelta must be array" };
  for (let i = 0; i < p.styleDelta.length; i++) {
    const e = p.styleDelta[i] as Record<string, unknown>;
    if (
      !e ||
      !isString(e.property) ||
      !isString(e.oldValue) ||
      !isString(e.newValue) ||
      typeof e.important !== "boolean"
    ) {
      return { ok: false, error: `styleDelta[${i}] malformed` };
    }
  }

  return { ok: true };
}
