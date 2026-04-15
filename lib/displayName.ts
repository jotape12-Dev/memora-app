import { MAX_DISPLAY_NAME_LENGTH } from "../constants/limits";

export function normalizeDisplayName(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
}
