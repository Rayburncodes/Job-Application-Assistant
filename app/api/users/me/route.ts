import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  validateSkillsPayload,
  validateWorkHistoryPayload,
} from "@/lib/profile-data";
import { parseGitHubUrl, parseLinkedInUrl } from "@/lib/social-urls";
import {
  MAX_RESUME_TEXT_CHARS,
  validateResumeTextPayload,
} from "@/lib/resume-text";
import {
  userPublicForClient,
  userPublicWithResumePdfSelect,
} from "@/lib/user-public";

export async function PATCH(request: NextRequest) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.users.me.PATCH invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const hasSkills = Object.prototype.hasOwnProperty.call(b, "skills");
  const hasWorkHistory = Object.prototype.hasOwnProperty.call(b, "workHistory");
  const hasLinkedin = Object.prototype.hasOwnProperty.call(b, "linkedinUrl");
  const hasGithub = Object.prototype.hasOwnProperty.call(b, "githubUrl");
  const hasResumeText = Object.prototype.hasOwnProperty.call(b, "resumeText");

  if (!hasSkills && !hasWorkHistory && !hasLinkedin && !hasGithub && !hasResumeText) {
    return NextResponse.json(
      {
        error:
          "Provide skills, workHistory, resumeText, linkedinUrl, and/or githubUrl to update.",
      },
      { status: 400 }
    );
  }

  const data: {
    skills?: object;
    workHistory?: object;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    resumeText?: string | null;
    resumePdf?: null;
  } = {};

  if (hasSkills) {
    const skills = validateSkillsPayload(b.skills);
    if (skills === null) {
      return NextResponse.json(
        { error: "skills must be an array of strings (max 80, each ≤ 120 characters)." },
        { status: 400 }
      );
    }
    data.skills = skills;
  }

  if (hasWorkHistory) {
    const workHistory = validateWorkHistoryPayload(b.workHistory);
    if (workHistory === null) {
      return NextResponse.json(
        {
          error:
            "workHistory must be an array of { company, title, employmentType?, startDate?, endDate?, description? } (max 25 roles).",
        },
        { status: 400 }
      );
    }
    data.workHistory = workHistory;
  }

  if (hasLinkedin) {
    const parsed = parseLinkedInUrl(b.linkedinUrl);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    data.linkedinUrl = parsed.url;
  }

  if (hasGithub) {
    const parsed = parseGitHubUrl(b.githubUrl);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    data.githubUrl = parsed.url;
  }

  if (hasResumeText) {
    const resumeText = validateResumeTextPayload(b.resumeText);
    if (resumeText === null) {
      return NextResponse.json(
        {
          error: `resumeText must be a string with at most ${MAX_RESUME_TEXT_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }
    const trimmed = resumeText.trim();
    data.resumeText = trimmed === "" ? null : resumeText;
    if (trimmed === "") {
      data.resumePdf = null;
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: sessionUserId },
      data,
      select: userPublicWithResumePdfSelect,
    });
    return NextResponse.json({ user: userPublicForClient(user) });
  } catch (e) {
    logError("api.users.me.PATCH", e);
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
