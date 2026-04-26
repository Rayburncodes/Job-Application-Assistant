const MAX_APPLY_URL = 2048;

/**
 * Optional apply link to the employer’s application flow.
 * Empty string → null. Throws if a non-empty value is not a valid http(s) URL.
 */
export function parseApplyUrlForCreate(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new Error("applyUrl must be a string when provided.");
  }
  const t = raw.trim();
  if (!t) return null;
  if (t.length > MAX_APPLY_URL) {
    throw new Error(`applyUrl must be at most ${MAX_APPLY_URL} characters.`);
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new Error("applyUrl must be a valid http(s) URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("applyUrl must use http or https.");
  }
  return t;
}
