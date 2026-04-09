const MAX_URL_LEN = 2048;

function normalizeHostname(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** True if host is linkedin.com or a *.linkedin.com subdomain. */
function isLinkedInHostname(host: string): boolean {
  const h = normalizeHostname(host);
  return h === "linkedin.com" || h.endsWith(".linkedin.com");
}

/** True if host is github.com or a *.github.com subdomain. */
function isGitHubHostname(host: string): boolean {
  const h = normalizeHostname(host);
  return h === "github.com" || h.endsWith(".github.com");
}

export type SocialUrlResult = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * Validates and normalizes a LinkedIn profile URL, or null if empty.
 */
export function parseLinkedInUrl(raw: unknown): SocialUrlResult {
  if (raw === undefined || raw === null) return { ok: true, url: null };
  if (typeof raw !== "string") return { ok: false, error: "LinkedIn URL must be text." };
  const t = raw.trim();
  if (!t) return { ok: true, url: null };
  if (t.length > MAX_URL_LEN) return { ok: false, error: "LinkedIn URL is too long." };
  let s = t;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: "LinkedIn URL is not valid." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "LinkedIn URL must use http or https." };
  }
  if (!isLinkedInHostname(u.hostname)) {
    return { ok: false, error: "LinkedIn URL must be on linkedin.com." };
  }
  u.protocol = "https:";
  return { ok: true, url: u.toString() };
}

/**
 * Validates and normalizes a GitHub profile URL, or null if empty.
 */
export function parseGitHubUrl(raw: unknown): SocialUrlResult {
  if (raw === undefined || raw === null) return { ok: true, url: null };
  if (typeof raw !== "string") return { ok: false, error: "GitHub URL must be text." };
  const t = raw.trim();
  if (!t) return { ok: true, url: null };
  if (t.length > MAX_URL_LEN) return { ok: false, error: "GitHub URL is too long." };
  let s = t;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: "GitHub URL is not valid." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "GitHub URL must use http or https." };
  }
  if (!isGitHubHostname(u.hostname)) {
    return { ok: false, error: "GitHub URL must be on github.com." };
  }
  u.protocol = "https:";
  return { ok: true, url: u.toString() };
}
