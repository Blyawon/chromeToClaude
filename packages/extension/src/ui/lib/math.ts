const MATH_PATTERN = /^[-+*/().\s\d]+$/;
const NUMERIC_PATTERN = /^-?\d*\.?\d+/;
const UNIT_PATTERN = /[a-z%]+$/i;

export type ParsedNumeric = {
  value: number;
  unit: string;
};

export function splitNumericUnit(raw: string, fallbackUnit = "px"): ParsedNumeric | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const numMatch = trimmed.match(NUMERIC_PATTERN);
  if (!numMatch) return null;
  const value = parseFloat(numMatch[0]);
  if (!Number.isFinite(value)) return null;
  const unitMatch = trimmed.match(UNIT_PATTERN);
  const unit = unitMatch ? unitMatch[0] : fallbackUnit;
  return { value, unit };
}

export function parseNumericExpression(
  raw: string,
  opts: { fallbackUnit?: string } = {},
): ParsedNumeric | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fallbackUnit = opts.fallbackUnit ?? "px";

  const unitMatch = trimmed.match(UNIT_PATTERN);
  const unit = unitMatch ? unitMatch[0] : fallbackUnit;
  const expr = unitMatch ? trimmed.slice(0, -unitMatch[0].length).trim() : trimmed;

  if (!expr) return null;
  if (!MATH_PATTERN.test(expr)) {
    const simple = splitNumericUnit(trimmed, fallbackUnit);
    return simple;
  }

  try {
    const value = new Function(`"use strict"; return (${expr});`)();
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return { value, unit };
  } catch {
    return null;
  }
}

export function formatNumeric(value: number, unit: string): string {
  const rounded = Math.round(value * 1000) / 1000;
  return `${rounded}${unit}`;
}
