import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { userPublicSelect } from "@/lib/user-public";

function toJsonValue(value: unknown, defaultValue: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (value === undefined || value === null) return defaultValue;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (typeof value === "object" && value !== null)
  ) {
    return value as Prisma.InputJsonValue;
  }
  return defaultValue;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.users.POST invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logApiRequest(request, body);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const { name, email, workHistory, skills } = body as Record<string, unknown>;

  const nameStr = typeof name === "string" ? name.trim() : "";
  const emailStr = typeof email === "string" ? email.trim() : "";

  if (!nameStr) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!emailStr) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: nameStr,
        email: emailStr,
        workHistory: toJsonValue(workHistory, {}),
        skills: toJsonValue(skills, {}),
      },
      select: userPublicSelect,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    logError("api.users.POST prisma", e);
    throw e;
  }
}

export async function GET(request: NextRequest) {
  logApiRequest(request);

  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId.trim() },
      select: userPublicSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (e) {
    logError("api.users.GET prisma", e);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
