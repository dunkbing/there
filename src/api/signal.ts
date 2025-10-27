import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";
import { db } from "@/lib/db";
import { roomMembers } from "@/lib/schemas";
import { and, eq, or } from "drizzle-orm";

interface RoomMember {
  userId: string;
  userName: string;
  ws: WSContext;
}

// Track rooms and their members
const rooms = new Map<string, Map<string, RoomMember>>();

// Helper function to remove member from database
async function removeMemberFromDatabase(roomId: string, userId: string) {
  try {
    await db
      .delete(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          or(eq(roomMembers.userId, userId), eq(roomMembers.guestId, userId)),
        ),
      );
    console.log(`[DB] Removed member ${userId} from room ${roomId}`);
  } catch (error) {
    console.error(
      `[DB] Failed to remove member ${userId} from room ${roomId}:`,
      error,
    );
  }
}

export const signalRoute = new Hono().get(
  "/ws",
  upgradeWebSocket((c) => {
    // Extract clientId and room from URL query params
    const url = new URL(c.req.url);
    const clientId = url.searchParams.get("clientId") || "";
    const roomId = url.searchParams.get("room") || "";

    return {
      onOpen(event, ws) {
        console.log(`[WS] Client ${clientId} connected`);
      },

      async onMessage(event, ws) {
        try {
          const message = JSON.parse(event.data.toString());
          const { type, ...data } = message;

          // Create room if it doesn't exist
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }

          const room = rooms.get(roomId)!;

          // Register client on first message (handles reconnects)
          if (!room.has(clientId)) {
            room.set(clientId, { userId: clientId, userName: clientId, ws });
            console.log(
              `[WS] ✅ Client ${clientId} registered in room ${roomId}. Room now has ${room.size} members:`,
              Array.from(room.keys()),
            );
          } else {
            // Update WebSocket reference if reconnecting
            const existingMember = room.get(clientId)!;
            existingMember.ws = ws;
          }

          switch (type) {
            case "join": {
              // Check if user exists in database, if not add them (handles reconnection)
              const existingMember = await db.query.roomMembers.findFirst({
                where: and(
                  eq(roomMembers.roomId, roomId),
                  or(
                    eq(roomMembers.userId, clientId),
                    eq(roomMembers.guestId, clientId),
                  ),
                ),
              });

              if (!existingMember) {
                console.log(
                  `[WS] User ${clientId} not in database, re-adding (reconnection)...`,
                );
                // Try to determine if this is a guest or authenticated user
                // We'll add as guest since we don't have session info here
                await db.insert(roomMembers).values({
                  roomId,
                  guestId: clientId,
                  guestName: "Guest",
                  role: "member",
                });
                console.log(`[WS] Re-added user ${clientId} to room ${roomId}`);

                // Notify all members to refetch since we re-added this user
                room.forEach((member, memberId) => {
                  if (member.ws.readyState !== 1) return;
                  try {
                    member.ws.send(
                      JSON.stringify({
                        type: "refetch-members",
                        roomId: roomId,
                      }),
                    );
                  } catch (e) {
                    console.error(
                      `[WS] Failed to send refetch-members to ${memberId}:`,
                      e,
                    );
                  }
                });
              }

              // Notify others that this client joined
              console.log(
                `[WS] Broadcasting join from ${clientId} to other ${room.size - 1} members`,
              );
              room.forEach((member, memberId) => {
                if (memberId === clientId) return;
                if (member.ws.readyState !== 1) return; // OPEN

                try {
                  member.ws.send(
                    JSON.stringify({
                      type: "join",
                      clientId: clientId,
                    }),
                  );
                } catch (e) {
                  console.error(`[WS] Failed to send join to ${memberId}:`, e);
                }
              });
              break;
            }

            case "call-offer":
            case "call-answer":
            case "offer":
            case "answer": {
              // Forward WebRTC signals to specific peer
              const targetId = data.clientId;
              const targetMember = room.get(targetId);

              if (!targetMember) {
                console.error(
                  `[WS] Target ${targetId} not found in room. Available:`,
                  Array.from(room.keys()),
                );
                return;
              }

              if (targetMember.ws.readyState !== 1) {
                console.error(
                  `[WS] Target ${targetId} WebSocket not open (state: ${targetMember.ws.readyState})`,
                );
                return;
              }

              try {
                targetMember.ws.send(
                  JSON.stringify({
                    type,
                    data: data.data,
                    clientId: clientId,
                  }),
                );
                console.log(
                  `[WS] ✅ Forwarded ${type} from ${clientId} to ${targetId}`,
                );
              } catch (e) {
                console.error(
                  `[WS] ❌ Failed to forward ${type} to ${targetId}:`,
                  e,
                );
              }
              break;
            }

            case "disconnect": {
              // Handle explicit disconnect message from client
              console.log(`[WS] Received explicit disconnect from ${clientId}`);

              // Remove client from database
              await removeMemberFromDatabase(roomId, clientId);

              // Remove client from in-memory room
              room.delete(clientId);
              console.log(
                `[WS] Removed ${clientId} from room ${roomId}, ${room.size} members remaining`,
              );

              // Broadcast to all other members to refetch member list
              room.forEach((member, memberId) => {
                if (member.ws.readyState !== 1) return;
                try {
                  member.ws.send(
                    JSON.stringify({
                      type: "refetch-members",
                      roomId: roomId,
                    }),
                  );
                  console.log(
                    `[WS] ✅ Sent refetch-members notification to ${memberId}`,
                  );
                } catch (e) {
                  console.error(
                    `[WS] Failed to send refetch-members to ${memberId}:`,
                    e,
                  );
                }
              });

              // Clean up empty rooms
              if (room.size === 0) {
                rooms.delete(roomId);
                console.log(`[WS] Deleted empty room ${roomId}`);
              }
              break;
            }

            default:
              console.warn(`[WS] Unknown message type: ${type}`);
          }
        } catch (error) {
          console.error("[WS] Error processing message:", error);
        }
      },

      onClose: async () => {
        console.log(`[WS] Client ${clientId} disconnected from room ${roomId}`);

        // Remove client from database
        await removeMemberFromDatabase(roomId, clientId);

        const room = rooms.get(roomId);
        if (room) {
          room.delete(clientId);
          console.log(
            `[WS] Removed ${clientId} from room ${roomId}, ${room.size} members remaining`,
          );

          // Notify others to refetch member list
          room.forEach((member, memberId) => {
            if (member.ws.readyState !== 1) return;
            try {
              member.ws.send(
                JSON.stringify({
                  type: "refetch-members",
                  roomId: roomId,
                }),
              );
              console.log(
                `[WS] ✅ Sent refetch-members notification to ${memberId}`,
              );
            } catch (e) {
              console.error(
                `[WS] Failed to send refetch-members to ${memberId}:`,
                e,
              );
            }
          });

          // Clean up empty rooms
          if (room.size === 0) {
            rooms.delete(roomId);
            console.log(`[WS] Deleted empty room ${roomId}`);
          }
        }
      },

      onError: (event, ws) => {
        console.error("[WS] Error:", event);
      },
    };
  }),
);
