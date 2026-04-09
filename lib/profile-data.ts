export const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance / self-employed" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
  { value: "volunteer", label: "Volunteer" },
] as const;

const EMPLOYMENT_TYPE_VALUES = new Set<string>([
  "",
  ...EMPLOYMENT_TYPES.map((t) => t.value),
]);

export function normalizeEmploymentType(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  return EMPLOYMENT_TYPE_VALUES.has(t) ? t : "";
}

export function employmentTypeLabel(value: string): string | null {
  const v = normalizeEmploymentType(value);
  if (!v) return null;
  const row = EMPLOYMENT_TYPES.find((t) => t.value === v);
  return row?.label ?? null;
}

export type WorkHistoryEntry = {
  company: string;
  title: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  description: string;
};

const MAX_SKILLS = 80;
const MAX_SKILL_LEN = 120;
const MAX_ROLES = 25;
const MAX_FIELD = 200;
const MAX_DESC = 4000;

export function parseSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}

export function parseWorkHistory(raw: unknown): WorkHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const company = typeof o.company === "string" ? o.company.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!company || !title) continue;
    out.push({
      company,
      title,
      employmentType: normalizeEmploymentType(o.employmentType),
      startDate: typeof o.startDate === "string" ? o.startDate.trim() : "",
      endDate: typeof o.endDate === "string" ? o.endDate.trim() : "",
      description: typeof o.description === "string" ? o.description.trim() : "",
    });
  }
  return out;
}

export function validateSkillsPayload(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const out: string[] = [];
  for (const x of input) {
    if (typeof x !== "string") return null;
    const t = x.trim();
    if (!t) continue;
    if (t.length > MAX_SKILL_LEN) return null;
    out.push(t);
  }
  if (out.length > MAX_SKILLS) return null;
  return out;
}

export function validateWorkHistoryPayload(input: unknown): WorkHistoryEntry[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_ROLES) return null;
  const out: WorkHistoryEntry[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const o = item as Record<string, unknown>;
    const company = typeof o.company === "string" ? o.company.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!company || !title) return null;
    if (company.length > MAX_FIELD || title.length > MAX_FIELD) return null;
    const startDate = typeof o.startDate === "string" ? o.startDate.trim() : "";
    const endDate = typeof o.endDate === "string" ? o.endDate.trim() : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    const employmentType = normalizeEmploymentType(o.employmentType);
    if (startDate.length > MAX_FIELD || endDate.length > MAX_FIELD) return null;
    if (description.length > MAX_DESC) return null;
    out.push({ company, title, employmentType, startDate, endDate, description });
  }
  return out;
}
