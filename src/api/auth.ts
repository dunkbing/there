import { Hono } from "hono";
import { auth } from "@/lib/auth";

export const authRoute = new Hono({
  strict: false,
});

// Handle all POST and GET requests to /auth/* routes
authRoute.on(["POST", "GET"], "/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authRoute;
