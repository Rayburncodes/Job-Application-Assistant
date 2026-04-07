"use client";

import { useState, type FormEvent } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ResumeAnalyzer } from "@/components/ResumeAnalyzer";
import { TailoredAnswer } from "@/components/TailoredAnswer";

type Section = "dashboard" | "onboarding" | "resume" | "answer";

type AuthMode = "login" | "register";

const NAV: { id: Section; label: string; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", hint: "Profile & overview" },
  { id: "onboarding", label: "Onboarding", hint: "Preferences" },
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
      await refreshProfile();
      setPassword("");
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
      await refreshProfile();
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 text-base text-slate-600">
          Create an account or sign in. One profile powers resume analysis and tailored answers.
        </p>
      </div>

      {profile ? (
        <div className="card-simplify space-y-5 shadow-card">
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
            </div>
          </div>
          <div className="grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-800">Skills</p>
              <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(profile.skills, null, 2)}
              </pre>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Work history</p>
              <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(profile.workHistory, null, 2)}
              </pre>
            </div>
          </div>
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
                  placeholder="letters, numbers, underscore (3–32)"
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
  const [section, setSection] = useState<Section>("dashboard");
  const [jobDescription, setJobDescription] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f8] text-slate-900">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex lg:w-72">
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Navigate
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-3 pb-6" aria-label="Main">
            {NAV.map((item) => (
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
                    section === item.id ? "text-teal-100" : "text-slate-400 group-hover:text-slate-500",
                  ].join(" ")}
                >
                  {item.hint}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col md:border-l md:border-transparent">
          <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <label htmlFor="section-mobile" className="sr-only">
              Section
            </label>
            <select
              id="section-mobile"
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
              className="input-simplify py-2.5 text-sm font-medium"
            >
              {NAV.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:max-w-4xl lg:px-8 lg:py-10">
              {section === "dashboard" && <DashboardPanel />}
              {section === "onboarding" && <OnboardingFlow />}
              {section === "resume" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                      Resume Analyzer
                    </h1>
                    <p className="mt-2 max-w-2xl text-base text-slate-600">
                      Paste a job description and your resume to get a match-style score, strengths,
                      gaps, and fixes. Similar energy to ATS checks and keyword tools.
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
