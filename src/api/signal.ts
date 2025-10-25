import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

export const signalRoute = new Hono().get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send("Hello from server!");
      },
      onClose: () => {
        console.log("Connection closed");
      },
    };
  }),
);
