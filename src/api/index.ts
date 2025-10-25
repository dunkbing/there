import { Hono } from "hono";
import { roomRoute } from "@/api/room";
import { websocket } from "hono/bun";

const app = new Hono();

app.route("/api", roomRoute);

if (require.main === module) {
  Bun.serve({
    fetch: app.fetch,
    websocket,
    port: 8080,
  });
}
