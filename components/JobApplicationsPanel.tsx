"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type JobApplicationRow = {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  applyUrl: string | null;
  status: string;
  appliedAt: string;
};

export type JobApplicationsBucket = "listings" | "applied";

const STATUS_OPTIONS = [
  "NOT_SUBMITTED",
  "SUBMITTED",
  "RECEIVED_RESPONSE",
  "INTERVIEW_REQUESTED",
  "ONSITE_REQUESTED",
  "REJECTED",
  "OFFER",
] as const;

/** Statuses allowed when adding from Jobs applied (already-applied pipeline, not open-only). */
const CREATE_STATUS_OPTIONS_APPLIED = STATUS_OPTIONS.filter(
  (s): s is Exclude<(typeof STATUS_OPTIONS)[number], "NOT_SUBMITTED"> => s !== "NOT_SUBMITTED"
);

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function extractLocationFromDescription(description: string): string {
  const line = description
    .split("\n")
    .find((l) => l.trim().toLowerCase().startsWith("location:"));
  if (!line) return "";
  return line.replace(/^location:\s*/i, "").trim();
}

function normalizeDescriptionForDisplay(description: string, applyUrl: string | null): string {
  if (!applyUrl) return description;
  return description
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^open this link to review full posting and apply:/i.test(t)) return false;
      return t !== applyUrl;
    })
    .join("\n")
    .trim();
}

function emptyForm(bucket: JobApplicationsBucket) {
  return {
    jobTitle: "",
    company: "",
    jobDescription: "",
    applyUrl: "",
    status:
      bucket === "listings"
        ? ("NOT_SUBMITTED" as (typeof STATUS_OPTIONS)[number])
        : ("SUBMITTED" as (typeof STATUS_OPTIONS)[number]),
    appliedAtLocal: toDatetimeLocalValue(new Date().toISOString()),
  };
}

type JobApplicationsPanelProps = {
  bucket: JobApplicationsBucket;
};

export function JobApplicationsPanel({ bucket }: JobApplicationsPanelProps) {
  const idPrefix = bucket === "listings" ? "jl" : "ja";
  const copy =
    bucket === "listings"
      ? {
          listHeading: "Open jobs (not applied yet)",
          empty: "No open jobs saved yet. Paste an apply or job posting link below.",
          removeConfirm: "Remove this open job?",
        }
      : {
          addHeading: "Log a job you already applied for",
          addButton: "Add applied job",
          listHeading: "Applications you sent",
          empty:
            "No applications logged yet. Add one after you apply, or open an Open job, edit it, and set status to Submitted.",
          removeConfirm: "Remove this application?",
        };

  const [items, setItems] = useState<JobApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingsFilter, setListingsFilter] = useState("");
  const [listingsLocationFilter, setListingsLocationFilter] = useState("");
  const [form, setForm] = useState(() => emptyForm(bucket));
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(() => emptyForm(bucket));

  useEffect(() => {
    setForm(emptyForm(bucket));
    setEditDraft(emptyForm(bucket));
    setEditingId(null);
    setListingsFilter("");
    setListingsLocationFilter("");
  }, [bucket]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/users/me/applications?bucket=${encodeURIComponent(bucket)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load data.");
        setItems([]);
        return;
      }
      const list = Array.isArray(data.applications) ? data.applications : [];
      setItems(list as JobApplicationRow[]);
    } catch {
      setError("Network error.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateApplied(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const appliedAt = new Date(form.appliedAtLocal).toISOString();
      const res = await fetch("/api/users/me/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobTitle: form.jobTitle.trim(),
          company: form.company.trim(),
          jobDescription: form.jobDescription.trim(),
          status: form.status,
          appliedAt,
          applyUrl: form.applyUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setForm(emptyForm("applied"));
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (bucket !== "listings") return items;
    const q = listingsFilter.trim().toLowerCase();
    const lq = listingsLocationFilter.trim().toLowerCase();
    return items.filter((row) => {
      const haystack = `${row.jobTitle} ${row.company} ${row.jobDescription}`.toLowerCase();
      const loc = extractLocationFromDescription(row.jobDescription).toLowerCase();
      const matchesKeyword = !q || haystack.includes(q);
      const matchesLocation = !lq || loc.includes(lq);
      return matchesKeyword && matchesLocation;
    });
  }, [bucket, items, listingsFilter, listingsLocationFilter]);

  function startEdit(row: JobApplicationRow) {
    setEditingId(row.id);
    setEditDraft({
      jobTitle: row.jobTitle,
      company: row.company,
      jobDescription: row.jobDescription,
      applyUrl: row.applyUrl ?? "",
      status: (STATUS_OPTIONS.includes(row.status as (typeof STATUS_OPTIONS)[number])
        ? row.status
        : bucket === "listings"
          ? "NOT_SUBMITTED"
          : "SUBMITTED") as (typeof STATUS_OPTIONS)[number],
      appliedAtLocal: toDatetimeLocalValue(row.appliedAt),
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const appliedAt = new Date(editDraft.appliedAtLocal).toISOString();
      const res = await fetch(`/api/users/me/applications/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobTitle: editDraft.jobTitle.trim(),
          company: editDraft.company.trim(),
          jobDescription: editDraft.jobDescription.trim(),
          status: editDraft.status,
          appliedAt,
          applyUrl: editDraft.applyUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update.");
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(copy.removeConfirm)) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/me/applications/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not delete.");
        return;
      }
      if (editingId === id) setEditingId(null);
      await load();
    } catch {
      setError("Network error.");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {bucket === "listings" ? (
        <div className="space-y-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5">
          <label htmlFor="jl-filter" className="block text-xs font-semibold text-slate-700">
            Filter open jobs
          </label>
          <input
            id="jl-filter"
            value={listingsFilter}
            onChange={(e) => setListingsFilter(e.target.value)}
            className="input-simplify"
            placeholder="e.g. frontend, data engineer, product manager"
          />
          <label htmlFor="jl-location-filter" className="mt-2 block text-xs font-semibold text-slate-700">
            Filter by location
          </label>
          <input
            id="jl-location-filter"
            value={listingsLocationFilter}
            onChange={(e) => setListingsLocationFilter(e.target.value)}
            className="input-simplify"
            placeholder="e.g. United States, Europe, Remote"
          />
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleCreateApplied(e)}
          className="space-y-4 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5"
        >
          <p className="text-sm font-semibold text-slate-900">{copy.addHeading}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label htmlFor={`${idPrefix}-title`} className="mb-1 block text-xs font-semibold text-slate-700">
                Job title
              </label>
              <input
                id={`${idPrefix}-title`}
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="input-simplify"
                placeholder="Senior Software Engineer"
                required
              />
            </div>
            <div className="sm:col-span-1">
              <label htmlFor={`${idPrefix}-company`} className="mb-1 block text-xs font-semibold text-slate-700">
                Company
              </label>
              <input
                id={`${idPrefix}-company`}
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="input-simplify"
                placeholder="Acme Corp"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-desc`} className="mb-1 block text-xs font-semibold text-slate-700">
              Job description
            </label>
            <textarea
              id={`${idPrefix}-desc`}
              value={form.jobDescription}
              onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
              rows={5}
              className="input-simplify min-h-[120px] resize-y"
              placeholder="Paste the full job posting…"
              required
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-apply-url`} className="mb-1 block text-xs font-semibold text-slate-700">
              Apply link <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id={`${idPrefix}-apply-url`}
              type="url"
              inputMode="url"
              value={form.applyUrl}
              onChange={(e) => setForm((f) => ({ ...f, applyUrl: e.target.value }))}
              className="input-simplify"
              placeholder="https://"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${idPrefix}-status`} className="mb-1 block text-xs font-semibold text-slate-700">
                Status
              </label>
              <select
                id={`${idPrefix}-status`}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as (typeof STATUS_OPTIONS)[number],
                  }))
                }
                className="input-simplify"
              >
                {CREATE_STATUS_OPTIONS_APPLIED.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-applied`} className="mb-1 block text-xs font-semibold text-slate-700">
                Applied / updated date
              </label>
              <input
                id={`${idPrefix}-applied`}
                type="datetime-local"
                value={form.appliedAtLocal}
                onChange={(e) => setForm((f) => ({ ...f, appliedAtLocal: e.target.value }))}
                className="input-simplify"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : copy.addButton}
          </button>
        </form>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">{copy.listHeading}</p>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : filteredItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            {bucket === "listings" && listingsFilter.trim()
              ? "No open jobs match your filter."
              : bucket === "listings" && listingsLocationFilter.trim()
                ? "No open jobs match that location."
              : copy.empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredItems.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
              >
                {editingId === row.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Job title</label>
                        <input
                          value={editDraft.jobTitle}
                          onChange={(e) => setEditDraft((d) => ({ ...d, jobTitle: e.target.value }))}
                          className="input-simplify"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Company</label>
                        <input
                          value={editDraft.company}
                          onChange={(e) => setEditDraft((d) => ({ ...d, company: e.target.value }))}
                          className="input-simplify"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Job description</label>
                      <textarea
                        value={editDraft.jobDescription}
                        onChange={(e) => setEditDraft((d) => ({ ...d, jobDescription: e.target.value }))}
                        rows={4}
                        className="input-simplify min-h-[100px] resize-y"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Apply link <span className="font-normal text-slate-500">(optional)</span>
                      </label>
                      <input
                        type="url"
                        inputMode="url"
                        value={editDraft.applyUrl}
                        onChange={(e) => setEditDraft((d) => ({ ...d, applyUrl: e.target.value }))}
                        className="input-simplify"
                        placeholder="https://"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                        <select
                          value={editDraft.status}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              status: e.target.value as (typeof STATUS_OPTIONS)[number],
                            }))
                          }
                          className="input-simplify"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {statusLabel(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Date</label>
                        <input
                          type="datetime-local"
                          value={editDraft.appliedAtLocal}
                          onChange={(e) => setEditDraft((d) => ({ ...d, appliedAtLocal: e.target.value }))}
                          className="input-simplify"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void saveEdit()} disabled={saving} className="btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{row.jobTitle}</p>
                        <p className="text-sm font-medium text-slate-600">{row.company}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {bucket === "listings"
                            ? "Not applied yet"
                            : statusLabel(row.status)}
                          {" · "}
                          {new Date(row.appliedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {normalizeDescriptionForDisplay(row.jobDescription, row.applyUrl)}
                    </p>
                    {row.applyUrl ? (
                      <a
                        href={row.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block break-all text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                      >
                        {row.applyUrl}
                      </a>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {row.applyUrl ? (
                          <a
                            href={row.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary py-2 text-xs font-semibold"
                          >
                            Apply
                          </a>
                        ) : null}
                        <button type="button" onClick={() => startEdit(row)} className="btn-secondary py-2 text-xs">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
