"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  useUserProfile,
  type UserProfile,
} from "@/contexts/user-profile-context";
import { DateDigitsInput } from "@/components/DateDigitsInput";
import {
  parseLinkedInUrl,
  parseGitHubUrl,
  type SocialUrlResult,
} from "@/lib/social-urls";
import {
  EMPLOYMENT_TYPES,
  employmentTypeLabel,
  parseSkills,
  parseWorkHistory,
  type WorkHistoryEntry,
} from "@/lib/profile-data";

function emptyRole(): WorkHistoryEntry {
  return {
    company: "",
    title: "",
    employmentType: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

function syncFromProfile(profile: UserProfile) {
  const workHistory = parseWorkHistory(profile.workHistory);
  return {
    skills: parseSkills(profile.skills),
    workHistory,
    linkedinUrl: profile.linkedinUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
  };
}

function shiftExpandedIndicesAfterRemove(
  expanded: Set<number>,
  removedIndex: number
): Set<number> {
  const next = new Set<number>();
  expanded.forEach((i) => {
    if (i === removedIndex) return;
    next.add(i < removedIndex ? i : i - 1);
  });
  return next;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function SocialUrlRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  parseUrl,
  expanded,
  dirty,
  onExpand,
  onCollapse,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  parseUrl: (raw: unknown) => SocialUrlResult;
  expanded: boolean;
  /** When true, keep the editor open until the value is saved (matches server). */
  dirty: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const trimmed = value.trim();
  const parsed = parseUrl(value);
  const href = parsed.ok ? parsed.url : null;
  const showCollapsed = trimmed.length > 0 && !expanded;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {showCollapsed ? (
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:border-slate-300">
          {href && !dirty ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-slate-50 hover:underline"
            >
              <span className="truncate" title={href}>
                {label}
              </span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onExpand}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
              aria-label={`Edit ${label}`}
            >
              <span className="truncate font-medium text-slate-800">{label}</span>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  dirty
                    ? "bg-amber-50 text-amber-800"
                    : href
                      ? "bg-slate-100 text-slate-600"
                      : "bg-amber-50 text-amber-800",
                ].join(" ")}
              >
                {dirty ? "Unsaved" : href ? "Saved" : "Fix"}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onExpand}
            aria-label={`Expand to edit ${label}`}
            className="flex shrink-0 items-center justify-center border-l border-slate-200 bg-slate-50/80 px-3 text-slate-600 hover:bg-slate-100"
          >
            <ChevronDown className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {trimmed ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCollapse}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label={`Collapse ${label}`}
              >
                <ChevronUp className="h-4 w-4" />
                Collapse
              </button>
            </div>
          ) : null}
          <input
            id={id}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-simplify py-2.5 text-sm"
            placeholder={placeholder}
            autoComplete="url"
            maxLength={2048}
          />
        </div>
      )}
    </div>
  );
}

export function ProfileEditor() {
  const { profile, refreshProfile } = useUserProfile();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [roles, setRoles] = useState<WorkHistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skillsSavedFlash, setSkillsSavedFlash] = useState(false);
  const [expandedRoleIndices, setExpandedRoleIndices] = useState<Set<number>>(
    () => new Set()
  );
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [linkedinSocialExpanded, setLinkedinSocialExpanded] = useState(false);
  const [githubSocialExpanded, setGithubSocialExpanded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const { skills: s, workHistory: w, linkedinUrl: li, githubUrl: gh } = syncFromProfile(profile);
    setSkills(s);
    setRoles(w.length ? w : []);
    setLinkedinUrl(li);
    setGithubUrl(gh);
    setLinkedinSocialExpanded(false);
    setGithubSocialExpanded(false);
    setSkillDraft("");
    setMessage(null);
    setError(null);
    setExpandedRoleIndices(new Set());
    setResumeModalOpen(false);
  }, [profile]);

  useEffect(() => {
    if (!resumeModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setResumeModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resumeModalOpen]);

  useEffect(() => {
    if (!skillsSavedFlash) return;
    const t = window.setTimeout(() => setSkillsSavedFlash(false), 2200);
    return () => window.clearTimeout(t);
  }, [skillsSavedFlash]);

  if (!profile) return null;

  const linkedinDirty =
    linkedinUrl.trim() !== (profile.linkedinUrl ?? "").trim();
  const githubDirty = githubUrl.trim() !== (profile.githubUrl ?? "").trim();

  async function uploadResumePdf(file: File) {
    setResumeUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/resume", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not upload resume.");
        return;
      }
      await refreshProfile();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setResumeUploading(false);
    }
  }

  function onResumeFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void uploadResumePdf(file);
  }

  async function deleteResumePdf() {
    setError(null);
    setResumeModalOpen(false);
    try {
      const res = await fetch("/api/users/me/resume", { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not delete resume.");
        return;
      }
      await refreshProfile();
    } catch {
      setError("Network error. Try again.");
    }
  }

  function addSkill() {
    const t = skillDraft.trim();
    if (!t) return;
    if (skills.includes(t)) {
      setSkillDraft("");
      return;
    }
    if (skills.length >= 80) return;
    setSkills((prev) => [...prev, t]);
    setSkillDraft("");
  }

  function removeSkill(index: number) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function addRole() {
    setRoles((prev) => [...prev, emptyRole()]);
  }

  function toggleRoleExpanded(index: number) {
    setExpandedRoleIndices((old) => {
      const next = new Set(old);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function updateRole(index: number, patch: Partial<WorkHistoryEntry>) {
    setRoles((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function removeRole(index: number) {
    setRoles((prev) => prev.filter((_, i) => i !== index));
    setExpandedRoleIndices((prev) => shiftExpandedIndicesAfterRemove(prev, index));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const workHistory = roles.filter((r) => r.company.trim() && r.title.trim());
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          skills,
          workHistory,
          linkedinUrl: linkedinUrl.trim(),
          githubUrl: githubUrl.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      await refreshProfile();
      setMessage("Saved.");
      setSkillsSavedFlash(true);
      setExpandedRoleIndices(new Set());
      setLinkedinSocialExpanded(false);
      setGithubSocialExpanded(false);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 border-t border-slate-100 pt-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-800">Resume</h2>
        <p className="mt-1 text-xs text-slate-500">
          Upload a PDF; it is stored on your account. Click the resume row to preview it. Replace or
          delete anytime. Text is also extracted for Resume Analyzer (&quot;Load saved resume&quot;).
        </p>
        <input
          ref={resumeFileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,application/pdf"
          onChange={onResumeFileChange}
          disabled={saving || resumeUploading}
          tabIndex={-1}
          aria-hidden
        />
        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          {profile.hasResumePdf ? (
            <>
              <button
                type="button"
                onClick={() => setResumeModalOpen(true)}
                className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-slate-50"
              >
                <span>Resume</span>
                <span className="text-xs font-medium text-slate-400">View PDF</span>
              </button>
              <button
                type="button"
                disabled={saving || resumeUploading}
                onClick={() => resumeFileInputRef.current?.click()}
                className="btn-secondary min-h-[44px] px-4 py-2 text-xs font-semibold"
              >
                {resumeUploading ? "Uploading…" : "Replace PDF"}
              </button>
              <button
                type="button"
                disabled={saving || resumeUploading}
                onClick={() => void deleteResumePdf()}
                className="btn-secondary min-h-[44px] px-4 py-2 text-xs font-semibold text-red-800 hover:border-red-200 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={saving || resumeUploading}
              onClick={() => resumeFileInputRef.current?.click()}
              className="btn-secondary min-h-[44px] px-4 py-2 text-xs font-semibold"
            >
              {resumeUploading ? "Uploading…" : "Import PDF"}
            </button>
          )}
        </div>
      </section>

      {resumeModalOpen && profile.hasResumePdf ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => setResumeModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-modal-title"
            className="flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 id="resume-modal-title" className="text-sm font-semibold text-slate-900">
                Your resume
              </h3>
              <button
                type="button"
                onClick={() => setResumeModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <iframe
              title="Resume PDF preview"
              src="/api/users/me/resume"
              className="m-0 min-h-[min(70vh,600px)] w-full flex-1 border-0 bg-slate-100"
            />
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-slate-800">Social profiles</h2>
        <p className="mt-1 text-xs text-slate-500">
          Optional. URLs must be on linkedin.com or github.com (https added if missing).
        </p>
        <div className="mt-3 space-y-4">
          <SocialUrlRow
            id="profile-linkedin"
            label="LinkedIn"
            value={linkedinUrl}
            onChange={setLinkedinUrl}
            placeholder="https://www.linkedin.com/in/your-profile"
            parseUrl={parseLinkedInUrl}
            expanded={linkedinSocialExpanded}
            dirty={linkedinDirty}
            onExpand={() => setLinkedinSocialExpanded(true)}
            onCollapse={() => setLinkedinSocialExpanded(false)}
          />
          <SocialUrlRow
            id="profile-github"
            label="GitHub"
            value={githubUrl}
            onChange={setGithubUrl}
            placeholder="https://github.com/your-username"
            parseUrl={parseGitHubUrl}
            expanded={githubSocialExpanded}
            dirty={githubDirty}
            onExpand={() => setGithubSocialExpanded(true)}
            onCollapse={() => setGithubSocialExpanded(false)}
          />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Skills</h2>
            <p className="mt-1 text-xs text-slate-500">
              Used for resume analysis and answer drafts. Add one at a time.
            </p>
          </div>
          {skills.length > 0 && (
            <span className="text-[11px] font-medium tabular-nums text-slate-400">
              {skills.length} saved
            </span>
          )}
        </div>

        <div
          className={[
            "mt-3 rounded-2xl border bg-white transition-[box-shadow,ring] duration-300",
            skills.length > 0
              ? "border-slate-200/90 p-4 shadow-sm"
              : "border-dashed border-slate-200 px-4 py-8 text-center",
            skillsSavedFlash ? "ring-2 ring-teal-400/35 shadow-md shadow-teal-900/5" : "",
          ].join(" ")}
        >
          {skills.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {skills.map((s, i) => (
                <li key={`${s}-${i}`} className="group">
                  <span className="inline-flex max-w-full items-center gap-0.5 rounded-lg border border-slate-200/95 bg-slate-50/80 pl-3 pr-1 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-white">
                    <span className="truncate" title={s}>
                      {s}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSkill(i)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      aria-label={`Remove ${s}`}
                    >
                      <span className="text-lg leading-none" aria-hidden>
                        ×
                      </span>
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No skills yet. Add some below.</p>
          )}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Add skill
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="input-simplify flex-1 py-2.5 text-sm"
              placeholder="e.g. TypeScript, stakeholder communication…"
              maxLength={120}
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={!skillDraft.trim() || skills.length >= 80}
              className="btn-secondary shrink-0 py-2.5"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      <section>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Work history</h2>
          <p className="mt-1 text-xs text-slate-500">
            Company and job title are required for each role. Dates use day/month/year (e.g. 01/06/2024).
          </p>
          <div className="mt-3">
            <button type="button" onClick={addRole} className="btn-secondary py-2 text-xs">
              Add role
            </button>
          </div>
        </div>

        {roles.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">No roles yet. Use “Add role” to start.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {roles.map((role, index) => {
              const expanded = expandedRoleIndices.has(index);
              const titleLine = role.title.trim() || "New role";
              const companyLine = role.company.trim() || "Add company & title";
              const typeLine = employmentTypeLabel(role.employmentType);
              const endLabel = role.endDate.trim() || "Present";
              const dateLine =
                role.startDate.trim() || role.endDate.trim()
                  ? `${role.startDate.trim() || "…"} - ${endLabel}`
                  : null;

              return (
                <li key={index}>
                  {!expanded ? (
                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md">
                      <button
                        type="button"
                        onClick={() => toggleRoleExpanded(index)}
                        aria-expanded={false}
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                      >
                        <ChevronDown className="shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{titleLine}</p>
                          <p className="truncate text-xs text-slate-500">{companyLine}</p>
                          {typeLine && (
                            <p className="truncate text-[11px] font-medium text-slate-500">{typeLine}</p>
                          )}
                          {dateLine && (
                            <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-slate-400">
                              {dateLine}
                            </p>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRole(index)}
                        className="shrink-0 border-l border-slate-100 px-3 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm">
                      <div className="flex items-stretch border-b border-slate-200 bg-white/90">
                        <button
                          type="button"
                          onClick={() => toggleRoleExpanded(index)}
                          aria-expanded
                          className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left"
                        >
                          <ChevronUp className="shrink-0 text-slate-500" />
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {role.title.trim() || "Role"} · {role.company.trim() || "Company"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRole(index)}
                          className="shrink-0 border-l border-slate-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Company
                            </label>
                            <input
                              className="input-simplify py-2.5 text-sm"
                              value={role.company}
                              onChange={(e) => updateRole(index, { company: e.target.value })}
                              placeholder="Acme Inc."
                              maxLength={200}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Job title
                            </label>
                            <input
                              className="input-simplify py-2.5 text-sm"
                              value={role.title}
                              onChange={(e) => updateRole(index, { title: e.target.value })}
                              placeholder="Software Engineer"
                              maxLength={200}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label
                              htmlFor={`role-${index}-employment`}
                              className="mb-1 block text-xs font-semibold text-slate-700"
                            >
                              Employment type
                            </label>
                            <select
                              id={`role-${index}-employment`}
                              className="input-simplify w-full py-2.5 text-sm"
                              value={role.employmentType}
                              onChange={(e) =>
                                updateRole(index, { employmentType: e.target.value })
                              }
                            >
                              <option value="">Select type</option>
                              {EMPLOYMENT_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor={`role-${index}-start`}
                              className="mb-1 block text-xs font-semibold text-slate-700"
                            >
                              Start date (optional)
                            </label>
                            <DateDigitsInput
                              id={`role-${index}-start`}
                              value={role.startDate}
                              onChange={(v) => updateRole(index, { startDate: v })}
                              placeholder="DD/MM/YYYY"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`role-${index}-end`}
                              className="mb-1 block text-xs font-semibold text-slate-700"
                            >
                              End date (optional)
                            </label>
                            <DateDigitsInput
                              id={`role-${index}-end`}
                              value={role.endDate}
                              onChange={(v) => updateRole(index, { endDate: v })}
                              placeholder="DD/MM/YYYY"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                              Leave blank for <span className="font-medium text-slate-500">Present</span>.
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Description (optional)
                          </label>
                          <textarea
                            className="input-simplify min-h-[80px] resize-y text-sm"
                            value={role.description}
                            onChange={(e) => updateRole(index, { description: e.target.value })}
                            placeholder="Key wins, stack, scope…"
                            maxLength={4000}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {message && <span className="text-sm font-medium text-teal-800">{message}</span>}
        {error && <span className="text-sm font-medium text-red-800">{error}</span>}
      </div>
    </div>
  );
}
