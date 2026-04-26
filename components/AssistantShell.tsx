"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ResumeAnalyzer } from "@/components/ResumeAnalyzer";
import { TailoredAnswer } from "@/components/TailoredAnswer";
import { JobApplicationsPanel } from "@/components/JobApplicationsPanel";

type Section = "dashboard" | "onboarding" | "jobListing" | "resume" | "answer";

type DashboardTab = "profile" | "applied";

type AuthMode = "login" | "register";

const SECTIONS_REQUIRING_AUTH: Section[] = ["onboarding", "jobListing", "resume", "answer"];

const NAV: { id: Section; label: string; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", hint: "Profile & overview" },
  { id: "onboarding", label: "Onboarding", hint: "Preferences" },
  { id: "jobListing", label: "Open jobs", hint: "Not applied yet" },
  { id: "resume", label: "Resume Analyzer", hint: "ATS-style match" },
  { id: "answer", label: "Answer Generator", hint: "Application Q&A" },
];

function AppHeader() {
  const { profile, clearProfile, status } = useUserProfile();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-lg font-black text-white shadow-md shadow-teal-500/25">
            J
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Job Assistant</p>
            <p className="text-[11px] font-medium text-slate-500">Your search, simplified</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {profile && (
            <span className="hidden max-w-[140px] truncate text-xs text-slate-600 sm:inline">
              @{profile.username ?? profile.email.split("@")[0]}
            </span>
          )}
          {profile ? (
            <button
              type="button"
              onClick={() => void clearProfile()}
              className="btn-secondary py-2 text-xs font-semibold"
            >
              Sign out
            </button>
          ) : (
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              {status === "loading" ? "…" : "Sign in to save"}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function DashboardPanel() {
  const { profile, status, refreshProfile } = useUserProfile();
  const [dashTab, setDashTab] = useState<DashboardTab>("profile");
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Could not sign in.");
        return;
      }
      const sessionUser =
        data &&
        typeof data === "object" &&
        "user" in data &&
        data.user &&
        typeof data.user === "object"
          ? (data.user as Record<string, unknown>)
          : null;
      const hydrated = await refreshProfile(sessionUser);
      setPassword("");
      if (!hydrated) {
        setFormError(
          "Signed in, but your profile could not be loaded. Refresh the page, or start Postgres (from repo root: npm run docker:up) and check DATABASE_URL in job-assistant/.env."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Could not create account.");
        return;
      }
      const sessionUser =
        data &&
        typeof data === "object" &&
        "user" in data &&
        data.user &&
        typeof data.user === "object"
          ? (data.user as Record<string, unknown>)
          : null;
      const hydrated = await refreshProfile(sessionUser);
      setPassword("");
      if (!hydrated) {
        setFormError(
          "Account created, but your profile could not be loaded. Refresh the page, or start Postgres (from repo root: npm run docker:up) and check DATABASE_URL in job-assistant/.env."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 text-base text-slate-600">
          Create an account or sign in. One profile powers resume analysis and tailored answers.
        </p>
      </div>

      {profile ? (
        <div className="card-simplify space-y-5 shadow-card">
          <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDashTab("profile")}
              className={[
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                dashTab === "profile"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setDashTab("applied")}
              className={[
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                dashTab === "applied"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Jobs applied
            </button>
          </div>

          {dashTab === "profile" ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Your profile
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{profile.name}</p>
                  {profile.username && (
                    <p className="text-sm font-medium text-slate-700">@{profile.username}</p>
                  )}
                  <p className="text-sm text-slate-600">{profile.email}</p>
                  {(profile.linkedinUrl || profile.githubUrl) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.linkedinUrl && (
                        <a
                          href={profile.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800"
                        >
                          LinkedIn
                        </a>
                      )}
                      {profile.githubUrl && (
                        <a
                          href={profile.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800"
                        >
                          GitHub
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <ProfileEditor />
            </>
          ) : (
            <JobApplicationsPanel bucket="applied" />
          )}
        </div>
      ) : (
        <div className="card-simplify shadow-card">
          <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setFormError(null);
              }}
              className={[
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                mode === "login"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setFormError(null);
              }}
              className={[
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                mode === "register"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Create account
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-username" className="mb-1 block text-sm font-semibold text-slate-800">
                  Username
                </label>
                <input
                  id="login-username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-simplify"
                  placeholder="your_username"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-simplify"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy || status === "loading"}
                className="btn-primary w-full"
              >
                {busy ? "Signing in…" : "Log in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reg-username" className="mb-1 block text-sm font-semibold text-slate-800">
                  Username
                </label>
                <input
                  id="reg-username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-simplify"
                  placeholder="letters, numbers, underscore (3-32)"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="mb-1 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-simplify"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="reg-name" className="mb-1 block text-sm font-semibold text-slate-800">
                  Full name
                </label>
                <input
                  id="reg-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-simplify"
                  placeholder="Alex Morgan"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="mb-1 block text-sm font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-simplify"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy || status === "loading"}
                className="btn-primary w-full"
              >
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          {formError && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              {formError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantShell() {
  const { profile, status } = useUserProfile();
  const [section, setSection] = useState<Section>("dashboard");
  const [jobDescription, setJobDescription] = useState("");
  const [navMinimized, setNavMinimized] = useState(false);

  const navItems = useMemo(
    () => (profile ? NAV : NAV.filter((item) => item.id === "dashboard")),
    [profile]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (profile) return;
    if (SECTIONS_REQUIRING_AUTH.includes(section)) {
      setSection("dashboard");
    }
  }, [profile, status, section]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f8] text-slate-900">
      <AppHeader />

      <div className="flex min-h-0 flex-1 items-start">
        <aside
          className={[
            "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white md:flex",
            navMinimized ? "w-16" : "w-64 lg:w-72",
          ].join(" ")}
        >
          <div className={navMinimized ? "p-3" : "p-4"}>
            <div className="flex items-center justify-between gap-2">
              {!navMinimized && (
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Navigate
                </p>
              )}
              <button
                type="button"
                onClick={() => setNavMinimized((v) => !v)}
                className={[
                  "rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50",
                  navMinimized ? "w-full" : "",
                ].join(" ")}
                aria-label={navMinimized ? "Expand navigation" : "Minimize navigation"}
                title={navMinimized ? "Expand" : "Minimize"}
              >
                {navMinimized ? "›" : "‹"}
              </button>
            </div>
            {!navMinimized && !profile && status !== "loading" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Sign in on the dashboard to unlock onboarding, open jobs, resume analysis, and answer
                drafts.
              </p>
            )}
          </div>
          <nav
            className={navMinimized ? "flex flex-col gap-1 px-2 pb-6" : "flex flex-col gap-1 px-3 pb-6"}
            aria-label="Main"
          >
            {navMinimized
              ? null
              : navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={[
                      "group flex flex-col rounded-xl px-3 py-3 text-left transition-all",
                      section === item.id
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span
                      className={[
                        "mt-0.5 text-xs",
                        section === item.id
                          ? "text-teal-100"
                          : "text-slate-400 group-hover:text-slate-500",
                      ].join(" ")}
                    >
                      {item.hint}
                    </span>
                  </button>
                ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col md:border-l md:border-transparent">
          <nav
            className="border-b border-slate-200 bg-white px-3 py-2.5 md:hidden"
            aria-label="Main sections"
          >
            <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={[
                    "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                    section === item.id
                      ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:max-w-4xl lg:px-8 lg:py-10">
              {section === "dashboard" && <DashboardPanel />}
              {section === "onboarding" && <OnboardingFlow />}
              {section === "jobListing" && (
                <div className="space-y-6">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Open jobs</h1>
                  <JobApplicationsPanel bucket="listings" />
                </div>
              )}
              {section === "resume" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                      Resume Analyzer
                    </h1>
                    <p className="mt-2 max-w-2xl text-base text-slate-600">
                      Paste a job description and import or paste your resume (PDF or text) to get a
                      match-style score, strengths, gaps, and fixes. Similar energy to ATS checks and
                      keyword tools.
                    </p>
                  </div>
                  <ResumeAnalyzer />
                </div>
              )}
              {section === "answer" && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                      Answer Generator
                    </h1>
                    <p className="mt-2 max-w-2xl text-base text-slate-600">
                      Answer screening questions with drafts tailored to the role and your profile.
                      Less typing, more focus on what to send.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="answer-job-desc"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Job description
                    </label>
                    <textarea
                      id="answer-job-desc"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={8}
                      placeholder="Paste the full job posting here…"
                      className="input-simplify min-h-[180px] resize-y"
                    />
                  </div>
                  <TailoredAnswer jobDescription={jobDescription} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
