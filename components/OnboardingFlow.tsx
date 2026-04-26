"use client";

import { useMemo, useState } from "react";

const VALUE_OPTIONS = [
  "Growth opportunities",
  "Work-life balance",
  "Compensation",
  "Meaningful impact",
  "Autonomy & ownership",
  "Team culture",
  "Learning & mentorship",
  "Stability",
];

const ROLE_GROUPS: { category: string; roles: string[] }[] = [
  {
    category: "Engineering",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "DevOps / Platform",
      "Mobile Engineer",
      "QA / Test Engineer",
    ],
  },
  {
    category: "Product & Design",
    roles: [
      "Product Manager",
      "Product Designer",
      "UX Researcher",
      "UI Designer",
    ],
  },
  {
    category: "Data & AI",
    roles: ["Data Scientist", "Data Analyst", "ML Engineer", "Data Engineer"],
  },
  {
    category: "Leadership",
    roles: ["Engineering Manager", "Tech Lead", "Director", "VP Engineering"],
  },
];

const LOCATIONS = [
  "Remote (US only)",
  "Remote (worldwide)",
  "San Francisco Bay Area",
  "New York City",
  "Seattle",
  "Austin",
  "Boston",
  "Los Angeles",
  "Chicago",
  "London",
  "Berlin",
  "Amsterdam",
  "Toronto",
  "Hybrid / flexible",
];

const LEVEL_OPTIONS = [
  { id: "intern", label: "Intern" },
  { id: "junior", label: "Junior" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
  { id: "staff", label: "Staff / Principal" },
  { id: "director_plus", label: "Director+" },
] as const;

const SALARY_MIN = 40_000;
const SALARY_MAX = 300_000;
const SALARY_STEP = 5_000;

function formatSalary(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [salary, setSalary] = useState<number | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [finished, setFinished] = useState(false);

  const progressPercent = Math.round(((step + 1) / 5) * 100);

  const filteredRoleGroups = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return ROLE_GROUPS;
    return ROLE_GROUPS.map((g) => ({
      category: g.category,
      roles: g.roles.filter(
        (r) =>
          r.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
      ),
    })).filter((g) => g.roles.length > 0);
  }, [roleSearch]);

  const canContinue =
    step === 0
      ? values.length >= 1 && values.length <= 3
      : step === 1
        ? roles.length >= 1
        : step === 2
          ? locations.length >= 1
          : step === 3
            ? level !== null
            : salary !== null;

  function toggleValue(v: string) {
    setValues((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      if (prev.length >= 3) return prev;
      return [...prev, v];
    });
  }

  function toggleRole(r: string) {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  function toggleLocation(loc: string) {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((x) => x !== loc) : [...prev, loc]
    );
  }

  function addCustomLocation() {
    const trimmed = customLocationInput.trim();
    if (!trimmed) return;
    setLocations((prev) => {
      if (prev.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
    setCustomLocationInput("");
  }

  function handleContinue() {
    if (!canContinue) return;
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    setFinished(true);
  }

  if (finished) {
    return (
      <div className="min-h-0 text-slate-900">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-2xl text-teal-700">
            ✓
          </div>
          <h1 className="text-2xl font-bold tracking-tight">You&apos;re all set</h1>
          <p className="mt-2 text-slate-600">
            Your preferences have been saved. You can refine them anytime from the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 text-slate-900">
      <div className="mx-auto max-w-xl px-4 pb-8 pt-2 sm:px-6">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600">Step {step + 1} of 5</span>
            <span className="tabular-nums font-medium text-teal-700">{progressPercent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-soft sm:p-8">
          {step === 0 && (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                What do you value in a role?
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Choose up to three that matter most to you right now.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {VALUE_OPTIONS.map((option) => {
                  const selected = values.includes(option);
                  const atMax = values.length >= 3 && !selected;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={atMax}
                      onClick={() => toggleValue(option)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        selected
                          ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                          : atMax
                            ? "cursor-not-allowed border-slate-200 text-slate-400"
                            : "border-slate-200 bg-white hover:border-teal-300",
                      ].join(" ")}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                What roles are you interested in?
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Search and select any roles that fit your goals.
              </p>
              <label className="mt-6 block">
                <span className="sr-only">Search roles</span>
                <input
                  type="search"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search by role or category…"
                  className="input-simplify"
                />
              </label>
              <div className="mt-6 max-h-[min(360px,50vh)] space-y-6 overflow-y-auto pr-1">
                {filteredRoleGroups.map((group) => (
                  <div key={group.category}>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-700">
                      {group.category}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {group.roles.map((role) => {
                        const selected = roles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRole(role)}
                            className={[
                              "rounded-lg border px-3 py-1.5 text-left text-sm font-medium transition-colors",
                              selected
                                ? "border-teal-500 bg-teal-50 text-teal-900"
                                : "border-slate-200 bg-slate-50 hover:border-teal-200",
                            ].join(" ")}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredRoleGroups.length === 0 && (
                  <p className="text-sm text-slate-500">No roles match that search.</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Where would you like to work?
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Select all locations you&apos;d consider.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={customLocationInput}
                  onChange={(e) => setCustomLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomLocation();
                    }
                  }}
                  placeholder="Add your own location"
                  className="input-simplify"
                />
                <button type="button" onClick={addCustomLocation} className="btn-secondary sm:whitespace-nowrap">
                  Add location
                </button>
              </div>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {LOCATIONS.map((loc) => {
                  const checked = locations.includes(loc);
                  const id = `loc-${loc.replace(/\s+/g, "-")}`;
                  return (
                    <li key={loc}>
                      <label
                        htmlFor={id}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                          checked
                            ? "border-teal-500 bg-teal-50/50"
                            : "border-slate-200 hover:border-slate-300",
                        ].join(" ")}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLocation(loc)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                        />
                        <span>{loc}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {locations.some((loc) => !LOCATIONS.includes(loc)) && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Custom locations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {locations
                      .filter((loc) => !LOCATIONS.includes(loc))
                      .map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => toggleLocation(loc)}
                          className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:border-teal-300"
                          title="Remove location"
                        >
                          {loc} ×
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                What level are you looking for?
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Pick the seniority band that best matches your search.
              </p>
              <fieldset className="mt-6 space-y-2">
                <legend className="sr-only">Seniority level</legend>
                {LEVEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors",
                      level === opt.id
                        ? "border-teal-500 bg-teal-50/50"
                        : "border-slate-200 hover:border-slate-300",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={opt.id}
                      checked={level === opt.id}
                      onChange={() => setLevel(opt.id)}
                      className="h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                What is your minimum salary?
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Drag to set the floor you&apos;re aiming for (USD, full-time).
                {salary === null && (
                  <span className="mt-1 block font-medium text-amber-800">
                    Move the slider to confirm your minimum.
                  </span>
                )}
              </p>
              <div className="mt-8">
                <div className="mb-6 text-center">
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                    {salary === null ? "…" : formatSalary(salary)}
                  </span>
                  <span className="ml-2 text-sm text-slate-500">/ year minimum</span>
                </div>
                <input
                  type="range"
                  min={SALARY_MIN}
                  max={SALARY_MAX}
                  step={SALARY_STEP}
                  value={salary ?? SALARY_MIN}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-600"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{formatSalary(SALARY_MIN)}</span>
                  <span>{formatSalary(SALARY_MAX)}</span>
                </div>
              </div>
            </>
          )}

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              type="button"
              disabled={!canContinue}
              onClick={handleContinue}
              className={[
                "w-full rounded-xl py-3 text-sm font-semibold transition-colors",
                canContinue
                  ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              Save and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
