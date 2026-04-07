import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth-password";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  sessionCookieBase,
  signSessionToken,
} from "@/lib/auth-session";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { userPublicSelect } from "@/lib/user-public";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    logError("api.auth.register invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  logApiRequest(request, body);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const usernameRaw = typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";

  if (!USERNAME_RE.test(usernameRaw)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3–32 characters and use only letters, numbers, or underscores.",
      },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: usernameRaw,
        passwordHash,
        name,
        email,
        workHistory: {},
        skills: {},
      },
      select: userPublicSelect,
    });

    let token: string;
    try {
      token = await signSessionToken(user.id);
    } catch (e) {
      logError("api.auth.register signSessionToken", e);
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      ...sessionCookieBase(),
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const fields = e.meta?.target as string[] | undefined;
      const field = fields?.[0] ?? "field";
      return NextResponse.json(
        { error: `That ${field} is already taken. Try another.` },
        { status: 409 }
      );
    }
    logError("api.auth.register", e);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
