import { NextRequest, NextResponse } from "next/server";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.feedback.POST invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logApiRequest(request, body);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const { userId, applicationId, featureUsed, rating, comment } = body as Record<string, unknown>;

  const userIdStr = typeof userId === "string" ? userId.trim() : "";
  const applicationIdStr =
    typeof applicationId === "string" && applicationId.trim() ? applicationId.trim() : null;
  const featureStr = typeof featureUsed === "string" ? featureUsed.trim() : "";
  const ratingNum = typeof rating === "number" ? rating : Number(rating);
  const commentStr =
    comment === undefined || comment === null
      ? null
      : typeof comment === "string"
        ? comment
        : null;

  if (!userIdStr && !applicationIdStr) {
    return NextResponse.json(
      { error: "userId or applicationId is required" },
      { status: 400 }
    );
  }
  if (!featureStr) {
    return NextResponse.json({ error: "featureUsed is required" }, { status: 400 });
  }
  if (!Number.isInteger(ratingNum)) {
    return NextResponse.json({ error: "rating must be an integer" }, { status: 400 });
  }

  try {
    if (userIdStr) {
      const user = await prisma.user.findUnique({ where: { id: userIdStr } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    if (applicationIdStr) {
      const app = await prisma.application.findUnique({ where: { id: applicationIdStr } });
      if (!app) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      if (userIdStr && app.userId !== userIdStr) {
        return NextResponse.json({ error: "Application does not belong to this user" }, { status: 403 });
      }
    }

    const record = await prisma.feedback.create({
      data: {
        userId: userIdStr || null,
        applicationId: applicationIdStr,
        featureUsed: featureStr,
        rating: ratingNum,
        comment: commentStr,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    logError("api.feedback.POST", e);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
