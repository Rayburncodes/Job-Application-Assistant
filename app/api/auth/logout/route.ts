import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, sessionCookieBase } from "@/lib/auth-session";
import { logApiRequest } from "@/lib/logger";

export async function POST(request: NextRequest) {
  logApiRequest(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieBase(),
    maxAge: 0,
  });
  return res;
}
