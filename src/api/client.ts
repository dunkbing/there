import { hc } from "hono/client";
import type { RoomType } from "./room";

export const roomClient = hc<RoomType>(process.env.NEXT_PUBLIC_API_URL!);

// const res = await roomClient.rooms[':id'].$get({ param: { id: "24fef581-36c1-4302-a312-7ed6d8073c2b" } });
// const room = await res.json();
// console.log({ room });
