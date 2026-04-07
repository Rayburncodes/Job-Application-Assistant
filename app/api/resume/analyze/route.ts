import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `You are a career and resume analyst. You MUST respond with ONLY a single JSON object, with no markdown, no code fences, and no text before or after the JSON.

The JSON object MUST use exactly these keys with these types:
- "matchScore": a number from 0 to 100 indicating how well the candidate fits the job
- "strengths": an array of strings (resume strengths relative to the job)
- "gaps": an array of strings (gaps or weaknesses vs the job)
- "suggestions": an array of strings (concrete improvements to the resume or positioning)

Do not include any other keys.`;

type AnalysisResult = {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
};

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  if (typeof o.matchScore !== "number" || Number.isNaN(o.matchScore)) return false;
  const stringArrays: (keyof AnalysisResult)[] = ["strengths", "gaps", "suggestions"];
  for (const key of stringArrays) {
    if (!Array.isArray(o[key]) || !(o[key] as unknown[]).every((item) => typeof item === "string")) {
      return false;
    }
  }
  return true;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse model output as JSON");
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.resume.analyze.POST invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logApiRequest(request, body);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const { userId, resumeText, jobDescription } = body as Record<string, unknown>;

  const userIdStr = typeof userId === "string" ? userId.trim() : "";
  const resumeStr = typeof resumeText === "string" ? resumeText.trim() : "";
  const jobStr = typeof jobDescription === "string" ? jobDescription.trim() : "";

  if (!userIdStr) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!resumeStr) {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
  }
  if (!jobStr) {
    return NextResponse.json({ error: "jobDescription is required" }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: userIdStr } });
  } catch (e) {
    logError("api.resume.analyze.POST load user", e);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI is not configured" }, { status: 500 });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const userContext = [
      `Candidate name: ${user.name}`,
      `Email: ${user.email}`,
      `Profile workHistory (JSON): ${JSON.stringify(user.workHistory)}`,
      `Profile skills (JSON): ${JSON.stringify(user.skills)}`,
    ].join("\n");

    const userMessage = [
      userContext,
      "",
      "--- Resume text ---",
      resumeStr,
      "",
      "--- Job description ---",
      jobStr,
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(content);
    } catch (e) {
      logError("api.resume.analyze.POST parse model JSON", e);
      return NextResponse.json({ error: "Could not parse model output" }, { status: 500 });
    }
    if (!isAnalysisResult(parsed)) {
      return NextResponse.json({ error: "Invalid analysis shape from model" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    logError("api.resume.analyze.POST openai or pipeline", e);
    return NextResponse.json({ error: "Resume analysis failed" }, { status: 500 });
  }
}
