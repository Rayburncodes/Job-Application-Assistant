import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `You are helping a job seeker draft application materials. Write a clear, professional answer to the question they were asked.

Use the candidate profile and job description to tailor the answer: align tone with the role, draw on their real experience and skills from the profile, and stay truthful (do not invent employers, degrees, or achievements).

Respond with plain text only: no JSON, no markdown code fences, and no preamble like "Here is your answer:".`;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.generate.answer.POST invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logApiRequest(request, body);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const { userId, jobDescription, question } = body as Record<string, unknown>;

  const userIdStr = typeof userId === "string" ? userId.trim() : "";
  const jobStr = typeof jobDescription === "string" ? jobDescription.trim() : "";
  const questionStr = typeof question === "string" ? question.trim() : "";

  if (!userIdStr) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!jobStr) {
    return NextResponse.json({ error: "jobDescription is required" }, { status: 400 });
  }
  if (!questionStr) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: userIdStr } });
  } catch (e) {
    logError("api.generate.answer.POST load user", e);
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
    const profile = [
      `Candidate name: ${user.name}`,
      `Profile workHistory (JSON): ${JSON.stringify(user.workHistory)}`,
      `Profile skills (JSON): ${JSON.stringify(user.skills)}`,
    ].join("\n");

    const userMessage = [
      profile,
      "",
      "--- Job description ---",
      jobStr,
      "",
      "--- Question to answer ---",
      questionStr,
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.5,
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (e) {
    logError("api.generate.answer.POST openai or pipeline", e);
    return NextResponse.json({ error: "Answer generation failed" }, { status: 500 });
  }
}
