import { ApplicationStatus, type Prisma } from "@prisma/client";
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

export async function GET(request: NextRequest) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bucket = request.nextUrl.searchParams.get("bucket");
  const where: Prisma.ApplicationWhereInput = { userId: sessionUserId };
  if (bucket === "listings") {
    where.status = ApplicationStatus.NOT_SUBMITTED;
  } else if (bucket === "applied") {
    where.status = { not: ApplicationStatus.NOT_SUBMITTED };
  }

  try {
    const rows = await prisma.application.findMany({
      where,
      orderBy: { appliedAt: "desc" },
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
    return NextResponse.json({ applications: rows.map(serializeApplication) });
  } catch (e) {
    logError("api.users.me.applications.GET", e);
    return NextResponse.json({ error: "Could not load applications." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  logApiRequest(request);

  const sessionUserId = await getSessionUserId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.users.me.applications.POST invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const jobTitle = typeof b.jobTitle === "string" ? b.jobTitle.trim() : "";
  const company = typeof b.company === "string" ? b.company.trim() : "";
  const jobDescription = typeof b.jobDescription === "string" ? b.jobDescription.trim() : "";
  const statusRaw = typeof b.status === "string" ? b.status.trim() : "";
  const status = STATUS_VALUES.has(statusRaw) ? (statusRaw as ApplicationStatus) : ApplicationStatus.NOT_SUBMITTED;

  if (!jobTitle || jobTitle.length > MAX_TITLE) {
    return NextResponse.json(
      { error: `jobTitle is required and must be at most ${MAX_TITLE} characters.` },
      { status: 400 }
    );
  }
  if (!company || company.length > MAX_COMPANY) {
    return NextResponse.json(
      { error: `company is required and must be at most ${MAX_COMPANY} characters.` },
      { status: 400 }
    );
  }
  if (!jobDescription || jobDescription.length > MAX_DESCRIPTION) {
    return NextResponse.json(
      { error: `jobDescription is required and must be at most ${MAX_DESCRIPTION.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  let appliedAt = new Date();
  if (typeof b.appliedAt === "string" && b.appliedAt.trim()) {
    const parsed = new Date(b.appliedAt.trim());
    if (!Number.isNaN(parsed.getTime())) {
      appliedAt = parsed;
    }
  }

  let applyUrl: string | null = null;
  try {
    applyUrl = parseApplyUrlForCreate(
      Object.prototype.hasOwnProperty.call(b, "applyUrl") ? b.applyUrl : undefined
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid applyUrl.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const row = await prisma.application.create({
      data: {
        userId: sessionUserId,
        jobTitle,
        company,
        jobDescription,
        applyUrl,
        status,
        appliedAt,
      },
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
    return NextResponse.json({ application: serializeApplication(row) }, { status: 201 });
  } catch (e) {
    logError("api.users.me.applications.POST", e);
    return NextResponse.json({ error: "Could not create application." }, { status: 500 });
  }
}
