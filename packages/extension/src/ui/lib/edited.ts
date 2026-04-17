export function isEdited(value: string, baseline: string | null | undefined): boolean {
  if (baseline == null) return false;
  return value.trim() !== baseline.trim();
}

export function useEdited(value: string, baseline: string | null | undefined): boolean {
  return isEdited(value, baseline);
}
