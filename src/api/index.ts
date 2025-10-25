import { Hono } from "hono";
import { roomRoute } from "@/api/room";
import { authRoute } from "@/api/auth";
import { websocket } from "hono/bun";
import { cors } from "hono/cors";
import { configs } from "@/lib/configs";
import { signalRoute } from "./signal";
import { logger } from "hono/logger";

const api = new Hono();
api.route("/auth", authRoute);
api.route("/", roomRoute);
api.route("/signal", signalRoute);

const app = new Hono({
  strict: false,
});

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: configs.corsOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  }),
);

// Mount routes
app.route("/api", api);

if (require.main === module) {
  Bun.serve({
    fetch: app.fetch,
    websocket,
    port: 8080,
  });
}

export type AppType = typeof app;
