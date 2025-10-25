import { Hono } from "hono";
import { handle } from "hono/vercel";
import { roomRoute } from "@/api/room";

const app = new Hono().basePath("/api");

app.route("", roomRoute);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
