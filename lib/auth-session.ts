import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "job-assistant-token";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or too short. Set it in .env (at least 16 characters)."
      );
    }
    console.warn(
      "[auth] AUTH_SECRET not set; using insecure dev fallback. Set AUTH_SECRET in .env for real security."
    );
    return new TextEncoder().encode("dev-insecure-change-me!");
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieBase() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
