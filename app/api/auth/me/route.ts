import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  sessionCookieBase,
  verifySessionToken,
} from "@/lib/auth-session";
import { logApiRequest, logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  userPublicForClient,
  userPublicWithResumePdfSelect,
} from "@/lib/user-public";

export async function GET(request: NextRequest) {
  logApiRequest(request);

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const userId = await verifySessionToken(token);
    if (!userId) {
      const res = NextResponse.json({ user: null });
      res.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieBase(), maxAge: 0 });
      return res;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userPublicWithResumePdfSelect,
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: userPublicForClient(user) });
  } catch (e) {
    logError("api.auth.me", e);
    return NextResponse.json({ error: "Could not load session." }, { status: 500 });
  }
}
