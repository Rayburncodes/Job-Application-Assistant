import { ApplicationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { parseApplyUrlForCreate } from "@/lib/application-apply-url";
import { getSessionUserId } from "@/lib/auth-session";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const MAX_TITLE = 200;
const MAX_COMPANY = 200;
const MAX_DESCRIPTION = 80_000;

const STATUS_VALUES = new Set<string>(Object.values(ApplicationStatus));

function serializeApplication(row: {
  id: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  applyUrl: string | null;
  status: ApplicationStatus;
  appliedAt: Date;
}) {
  return {
    id: row.id,
    jobTitle: row.jobTitle,
    company: row.company,
    jobDescription: row.jobDescription,
    applyUrl: row.applyUrl,
    status: row.status,
    appliedAt: row.appliedAt.toISOString(),
  };
}

async function getOwnedApplication(sessionUserId: string, id: string) {
  return prisma.application.findFirst({
    where: { id, userId: sessionUserId },
    select: {
      id: true,
      jobTitle: true,
      company: true,
      jobDescription: true,
      applyUrl: true,
      status: true,
      appliedAt: true,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.users.me.applications.[id].PATCH invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const existing = await getOwnedApplication(sessionUserId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const b = body as Record<string, unknown>;
  const data: {
    jobTitle?: string;
    company?: string;
    jobDescription?: string;
    applyUrl?: string | null;
    status?: ApplicationStatus;
    appliedAt?: Date;
  } = {};

  if (Object.prototype.hasOwnProperty.call(b, "jobTitle")) {
    const jobTitle = typeof b.jobTitle === "string" ? b.jobTitle.trim() : "";
    if (!jobTitle || jobTitle.length > MAX_TITLE) {
      return NextResponse.json(
        { error: `jobTitle must be a non-empty string of at most ${MAX_TITLE} characters.` },
        { status: 400 }
      );
    }
    data.jobTitle = jobTitle;
  }

  if (Object.prototype.hasOwnProperty.call(b, "company")) {
    const company = typeof b.company === "string" ? b.company.trim() : "";
    if (!company || company.length > MAX_COMPANY) {
      return NextResponse.json(
        { error: `company must be a non-empty string of at most ${MAX_COMPANY} characters.` },
        { status: 400 }
      );
    }
    data.company = company;
  }

  if (Object.prototype.hasOwnProperty.call(b, "jobDescription")) {
    const jobDescription = typeof b.jobDescription === "string" ? b.jobDescription.trim() : "";
    if (!jobDescription || jobDescription.length > MAX_DESCRIPTION) {
      return NextResponse.json(
        {
          error: `jobDescription must be a non-empty string of at most ${MAX_DESCRIPTION.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }
    data.jobDescription = jobDescription;
  }

  if (Object.prototype.hasOwnProperty.call(b, "status")) {
    const statusRaw = typeof b.status === "string" ? b.status.trim() : "";
    if (!STATUS_VALUES.has(statusRaw)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = statusRaw as ApplicationStatus;
  }

  if (Object.prototype.hasOwnProperty.call(b, "applyUrl")) {
    try {
      data.applyUrl = parseApplyUrlForCreate(b.applyUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid applyUrl.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  if (Object.prototype.hasOwnProperty.call(b, "appliedAt")) {
    if (b.appliedAt === null) {
      return NextResponse.json({ error: "appliedAt cannot be null." }, { status: 400 });
    }
    if (typeof b.appliedAt !== "string" || !b.appliedAt.trim()) {
      return NextResponse.json({ error: "appliedAt must be a non-empty ISO date string." }, { status: 400 });
    }
    const parsed = new Date(b.appliedAt.trim());
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "appliedAt must be a valid date." }, { status: 400 });
    }
    data.appliedAt = parsed;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      {
        error:
          "Provide at least one of jobTitle, company, jobDescription, applyUrl, status, appliedAt.",
      },
      { status: 400 }
    );
  }

  try {
    const row = await prisma.application.update({
      where: { id },
      data,
      select: {
        id: true,
        jobTitle: true,
        company: true,
        jobDescription: true,
        applyUrl: true,
        status: true,
        appliedAt: true,
      },
    });
    return NextResponse.json({ application: serializeApplication(row) });
  } catch (e) {
    logError("api.users.me.applications.[id].PATCH", e);
    return NextResponse.json({ error: "Could not update application." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await getOwnedApplication(sessionUserId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.application.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("api.users.me.applications.[id].DELETE", e);
    return NextResponse.json({ error: "Could not delete application." }, { status: 500 });
  }
}
