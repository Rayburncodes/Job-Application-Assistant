import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-password";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  sessionCookieBase,
  signSessionToken,
} from "@/lib/auth-session";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { userPublicSelect } from "@/lib/user-public";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.auth.login invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logApiRequest(request, body);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const username =
    typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { username },
      select: { ...userPublicSelect, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const publicUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      workHistory: user.workHistory,
      skills: user.skills,
      createdAt: user.createdAt,
    };
    let token: string;
    try {
      token = await signSessionToken(publicUser.id);
    } catch (e) {
      logError("api.auth.login signSessionToken", e);
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }
    const res = NextResponse.json({ user: publicUser });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      ...sessionCookieBase(),
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch (e) {
    logError("api.auth.login", e);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
