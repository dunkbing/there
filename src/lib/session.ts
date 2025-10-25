import { headers } from "next/headers";
import { auth } from "./auth";
import type { Context } from "hono";

// Next.js-specific session helper (for Next.js API routes and server components)
export async function getSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session;
}

// Hono-specific session helper (for Hono routes)
export async function getSessionFromContext(c: Context) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  return session;
}
