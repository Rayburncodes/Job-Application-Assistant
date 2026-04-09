"use client";

import { useState } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { TextFileImportButton } from "@/components/TextFileImportButton";

type AnalysisResult = {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
};

type ResumeAnalyzerProps = {
  userId?: string;
};

const FEATURE_RESUME_SUGGESTION = "resume_analyzer_suggestion";
const RATING_UP = 1;
const RATING_DOWN = 0;

function scoreTone(score: number) {
  if (score > 75) return "border-emerald-400 text-emerald-800 bg-emerald-50";
  if (score >= 50) return "border-amber-400 text-amber-900 bg-amber-50";
  return "border-red-300 text-red-800 bg-red-50";
}

function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600"
      role="status"
      aria-label="Loading"
    />
  );
}

export function ResumeAnalyzer({ userId: userIdProp }: ResumeAnalyzerProps) {
  const { profile } = useUserProfile();
  const userId = userIdProp ?? profile?.id ?? "";

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [suggestionVote, setSuggestionVote] = useState<
    Record<number, "up" | "down" | undefined>
  >({});
  const [feedbackBusy, setFeedbackBusy] = useState<number | null>(null);

  const canAnalyze = resumeText.trim().length > 0 && jobDescription.trim().length > 0;

  async function analyze() {
    if (!canAnalyze) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestionVote({});
    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Analysis failed");
        return;
      }
      setResult(data as AnalysisResult);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendSuggestionFeedback(suggestion: string, index: number, positive: boolean) {
    setFeedbackBusy(index);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          featureUsed: FEATURE_RESUME_SUGGESTION,
          rating: positive ? RATING_UP : RATING_DOWN,
          comment: suggestion,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(data.error ?? res.statusText);
        return;
      }
      setSuggestionVote((prev) => ({
        ...prev,
        [index]: positive ? "up" : "down",
      }));
    } catch {
      console.error("Feedback request failed");
    } finally {
      setFeedbackBusy(null);
    }
  }

  if (!userId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">Almost there</p>
        <p className="mt-1 text-amber-900/90">
          Open <strong>Dashboard</strong> and load your profile so we can personalize this analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="resume-text" className="text-sm font-semibold text-slate-800">
            Resume
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {profile?.resumeText?.trim() || profile?.hasResumePdf ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const t = (profile.resumeText ?? "").trim();
                  if (!t) {
                    setError(
                      "Your saved PDF has no extractable text. Paste your resume above or try a different PDF."
                    );
                    return;
                  }
                  setResumeText(profile.resumeText ?? "");
                  setError(null);
                }}
                className="btn-secondary py-1.5 text-xs font-semibold"
              >
                Load saved resume
              </button>
            ) : null}
            <TextFileImportButton
              id="resume-file-import"
              onImported={(text) => {
                setResumeText(text);
                setError(null);
              }}
              disabled={loading}
            />
          </div>
        </div>
        <textarea
          id="resume-text"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          placeholder="Paste your resume or import a PDF / .txt / .md file…"
          className="input-simplify min-h-[200px] resize-y"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="job-description" className="block text-sm font-semibold text-slate-800">
          Job description
        </label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={10}
          placeholder="Paste the job description…"
          className="input-simplify min-h-[200px] resize-y"
        />
      </div>

      <button
        type="button"
        disabled={!canAnalyze || loading}
        onClick={analyze}
        className="btn-primary"
      >
        Analyze match
      </button>

      {loading && (
        <div className="flex items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 px-5 py-4">
          <Spinner />
          <p className="text-sm font-semibold text-teal-900">Analyzing your resume…</p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {result && !loading && (
        <div className="card-simplify space-y-8 shadow-card">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div
              className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-4 text-center ${scoreTone(result.matchScore)}`}
            >
              <span className="text-3xl font-bold tabular-nums leading-none">
                {Math.round(result.matchScore)}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-90">
                Match
              </span>
            </div>
            <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-left">
              Your fit score for this posting. Use strengths and gaps to tune what you emphasize before
              you hit submit.
            </p>
          </div>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">Strengths</h3>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-800">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">Gaps</h3>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-800">
              {result.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Suggestions
            </h3>
            <ul className="mt-3 space-y-3">
              {result.suggestions.map((suggestion, index) => {
                const vote = suggestionVote[index];
                const busy = feedbackBusy === index;
                return (
                  <li
                    key={index}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm leading-relaxed text-slate-800">{suggestion}</p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => sendSuggestionFeedback(suggestion, index, true)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          vote === "up"
                            ? "border-teal-500 bg-teal-50 text-teal-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
                        } disabled:opacity-50`}
                      >
                        Helpful
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => sendSuggestionFeedback(suggestion, index, false)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          vote === "down"
                            ? "border-red-300 bg-red-50 text-red-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        } disabled:opacity-50`}
                      >
                        Not helpful
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
