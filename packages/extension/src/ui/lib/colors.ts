export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// Accept either comma-separated or space-separated rgb() / rgba() — modern
// browsers return the space form from `getComputedStyle` on some sites.
const RGB_COMMA_RE =
  /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*([\d.]+%?))?\s*\)$/;
const RGB_SPACE_RE =
  /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/;

// Use a canvas 2D context to normalize any CSS color (keywords, hsl, modern
// color()/lab) without touching the host page's DOM. Canvas silently ignores
// invalid values, so we probe with two distinct sentinels and compare — if
// the value was rejected, both sentinels remain, and resultA !== resultB.
let colorResolver: CanvasRenderingContext2D | null = null;
const SENTINEL_A = "#010203";
const SENTINEL_B = "#0a0b0c";

function normalizeViaBrowser(raw: string): string | null {
  try {
    if (!colorResolver) {
      if (typeof document === "undefined") return null;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      colorResolver = ctx;
    }
    colorResolver.fillStyle = SENTINEL_A;
    colorResolver.fillStyle = raw;
    const resultA = String(colorResolver.fillStyle);
    colorResolver.fillStyle = SENTINEL_B;
    colorResolver.fillStyle = raw;
    const resultB = String(colorResolver.fillStyle);
    if (resultA !== resultB) return null;
    return resultA;
  } catch {
    return null;
  }
}

export function parseColor(raw: string): RGBA | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (t === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (HEX_RE.test(t)) return parseHex(t);

  const commaMatch = t.match(RGB_COMMA_RE);
  if (commaMatch) return fromRgbMatch(commaMatch);
  const spaceMatch = t.match(RGB_SPACE_RE);
  if (spaceMatch) return fromRgbMatch(spaceMatch);

  // Last resort: let the browser normalize keywords (`red`, `navy`,
  // `currentColor`) and modern formats (hsl, lab, color(...)) into rgb().
  const normalized = normalizeViaBrowser(raw);
  if (normalized) {
    const m = normalized.match(RGB_COMMA_RE) ?? normalized.match(RGB_SPACE_RE);
    if (m) return fromRgbMatch(m);
  }
  return null;
}

function fromRgbMatch(m: RegExpMatchArray): RGBA {
  return {
    r: clamp255(parseFloat(m[1])),
    g: clamp255(parseFloat(m[2])),
    b: clamp255(parseFloat(m[3])),
    a: m[4] != null ? parseAlpha(m[4]) : 1,
  };
}

function parseAlpha(raw: string): number {
  if (raw.endsWith("%")) return clamp01(parseFloat(raw) / 100);
  return clamp01(parseFloat(raw));
}

function parseHex(hex: string): RGBA {
  const h = hex.slice(1);
  const expand = (s: string) => (s.length === 1 ? s + s : s);
  if (h.length === 3 || h.length === 4) {
    const [r, g, b, a] = h.split("").map(expand);
    return {
      r: parseInt(r, 16),
      g: parseInt(g, 16),
      b: parseInt(b, 16),
      a: a ? parseInt(a, 16) / 255 : 1,
    };
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function toHex(c: RGBA, withAlpha = false): string {
  const p = (n: number) => Math.round(clamp255(n)).toString(16).padStart(2, "0");
  const base = `#${p(c.r)}${p(c.g)}${p(c.b)}`;
  if (!withAlpha) return base;
  return base + p(c.a * 255);
}

export function toCss(c: RGBA): string {
  if (c.a === 1) return toHex(c);
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${round3(c.a)})`;
}

export function isGradient(css: string): boolean {
  const t = css.trim().toLowerCase();
  return (
    t.startsWith("linear-gradient(") ||
    t.startsWith("radial-gradient(") ||
    t.startsWith("conic-gradient(") ||
    t.startsWith("repeating-linear-gradient(") ||
    t.startsWith("repeating-radial-gradient(")
  );
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, n));
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
