import type { NextRequest } from "next/server";

export function timestampPrefix(): string {
  return `[${new Date().toISOString()}]`;
}

export function log(...args: unknown[]): void {
  console.log(timestampPrefix(), ...args);
}

export function logError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(timestampPrefix(), context, { message, stack });
}

export function describeBodyShape(body: unknown): string {
  if (body === undefined) return "none";
  if (body === null) return "null";
  if (Array.isArray(body)) return `array(length=${body.length})`;
  if (typeof body === "object") {
    const keys = Object.keys(body as object).sort();
    return `object(keys=[${keys.join(", ")}])`;
  }
  return typeof body;
}

export function describeQueryShape(searchParams: URLSearchParams): string {
  const keys = Array.from(new Set(Array.from(searchParams.keys()))).sort();
  if (keys.length === 0) return "query(none)";
  return `query(keys=[${keys.join(", ")}])`;
}

export function logApiRequest(request: NextRequest, body?: unknown): void {
  const method = request.method;
  const path = request.nextUrl.pathname;
  const bodyShape =
    method === "GET" || method === "HEAD"
      ? describeQueryShape(request.nextUrl.searchParams)
      : describeBodyShape(body);
  log("api.request", { method, path, bodyShape });
}
