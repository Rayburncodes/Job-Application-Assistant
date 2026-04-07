"use client";

import { useMemo, useState } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";

type TailoredAnswerProps = {
  userId?: string;
  jobDescription: string;
};

const PRESET_QUESTIONS = [
  { id: "why_fit", text: "Why are you a good fit?" },
  { id: "biggest_strength", text: "What is your biggest strength?" },
  { id: "about_yourself", text: "Tell me about yourself" },
] as const;

const FEATURE_TAILORED_ANSWER = "tailored_answer";
const RATING_UP = 1;
const RATING_DOWN = 0;

const CUSTOM_VALUE = "custom";

export function TailoredAnswer({ userId: userIdProp, jobDescription }: TailoredAnswerProps) {
  const { profile } = useUserProfile();
  const userId = userIdProp ?? profile?.id ?? "";

  const [presetKey, setPresetKey] = useState<string>(PRESET_QUESTIONS[0].id);
  const [customQuestion, setCustomQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [feedbackVote, setFeedbackVote] = useState<"up" | "down" | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const effectiveQuestion = useMemo(() => {
    if (presetKey === CUSTOM_VALUE) return customQuestion.trim();
    const preset = PRESET_QUESTIONS.find((p) => p.id === presetKey);
    return preset?.text ?? "";
  }, [presetKey, customQuestion]);

  const canSubmit = jobDescription.trim().length > 0 && effectiveQuestion.length > 0;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setIsEditing(false);
    setFeedbackVote(null);
    setCopyDone(false);
    try {
      const res = await fetch("/api/generate/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          jobDescription: jobDescription.trim(),
          question: effectiveQuestion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not generate answer");
        return;
      }
      if (typeof data.answer !== "string") {
        setError("Invalid response from server");
        return;
      }
      setAnswer(data.answer);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAnswer() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      console.error("Copy failed");
    }
  }

  async function sendFeedback(positive: boolean) {
    if (!answer || !effectiveQuestion) return;
    setFeedbackBusy(true);
    try {
      const comment = `Q: ${effectiveQuestion}\n\nA: ${answer}`;
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          featureUsed: FEATURE_TAILORED_ANSWER,
          rating: positive ? RATING_UP : RATING_DOWN,
          comment,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(data.error ?? res.statusText);
        return;
      }
      setFeedbackVote(positive ? "up" : "down");
    } catch {
      console.error("Feedback request failed");
    } finally {
      setFeedbackBusy(false);
    }
  }

  if (!userId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">Profile needed</p>
        <p className="mt-1 text-amber-900/90">
          Load your account on <strong>Dashboard</strong> to draft personalized answers.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="question-preset"
          className="block text-sm font-semibold text-slate-800"
        >
          Application question
        </label>
        <select
          id="question-preset"
          value={presetKey}
          onChange={(e) => setPresetKey(e.target.value)}
          className="input-simplify"
        >
          {PRESET_QUESTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.text}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>Custom question…</option>
        </select>
      </div>

      {presetKey === CUSTOM_VALUE && (
        <div className="space-y-2">
          <label htmlFor="custom-question" className="sr-only">
            Custom question
          </label>
          <textarea
            id="custom-question"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            rows={3}
            placeholder="Type your question…"
            className="input-simplify resize-y"
          />
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={submit}
        className="btn-primary"
      >
        {loading ? "Generating…" : "Generate answer"}
      </button>

      {jobDescription.trim().length === 0 && (
        <p className="text-sm font-medium text-amber-800">
          Add a job description above to unlock tailored drafts.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {answer !== null && (
        <div className="card-simplify space-y-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copyAnswer} className="btn-secondary">
              {copyDone ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing((e) => !e)}
              className="btn-secondary"
            >
              {isEditing ? "Done editing" : "Edit"}
            </button>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={feedbackBusy}
                onClick={() => sendFeedback(true)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                  feedbackVote === "up"
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-white hover:border-teal-200"
                } disabled:opacity-50`}
                aria-label="Helpful"
                title="Helpful"
              >
                👍
              </button>
              <button
                type="button"
                disabled={feedbackBusy}
                onClick={() => sendFeedback(false)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                  feedbackVote === "down"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } disabled:opacity-50`}
                aria-label="Not helpful"
                title="Not helpful"
              >
                👎
              </button>
            </div>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            readOnly={!isEditing}
            rows={12}
            className={`input-simplify min-h-[240px] ${
              isEditing ? "bg-white" : "cursor-default bg-slate-50"
            }`}
            aria-label="Generated answer"
          />
        </div>
      )}
    </div>
  );
}
