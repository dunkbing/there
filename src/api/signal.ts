import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";

interface RoomMember {
  userId: string;
  userName: string;
  ws: WSContext;
}

// Track rooms and their members
const rooms = new Map<string, Map<string, RoomMember>>();

function broadcastToRoom(
  roomId: string,
  message: any,
  excludeUserId?: string,
) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  room.forEach((member, userId) => {
    if (userId !== excludeUserId) {
      try {
        member.ws.send(messageStr);
      } catch (error) {
        console.error(`Failed to send to user ${userId}:`, error);
      }
    }
  });
}

function sendToUser(roomId: string, userId: string, message: any) {
  const room = rooms.get(roomId);
  if (!room) {
    console.error(`[WS sendToUser] Room ${roomId} not found`);
    return;
  }

  const member = room.get(userId);
  if (!member) {
    console.error(`[WS sendToUser] User ${userId} not found in room ${roomId}. Available users:`, Array.from(room.keys()));
    return;
  }

  try {
    const wsState = member.ws.readyState;
    if (wsState !== 1) { // 1 = OPEN
      console.error(`[WS sendToUser] WebSocket to user ${userId} is not OPEN (state: ${wsState})`);
      return;
    }
    member.ws.send(JSON.stringify(message));
    console.log(`[WS sendToUser] ✅ Sent message to ${userId}`);
  } catch (error) {
    console.error(`[WS sendToUser] ❌ Failed to send to user ${userId}:`, error);
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

      onMessage(event, ws) {
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
              Array.from(room.keys())
            );
          } else {
            // Update WebSocket reference if reconnecting
            const existingMember = room.get(clientId)!;
            existingMember.ws = ws;
          }

          switch (type) {
            case "join": {
              // Notify others that this client joined
              console.log(`[WS] Broadcasting join from ${clientId} to other ${room.size - 1} members`);
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
                console.error(`[WS] Target ${targetId} not found in room. Available:`, Array.from(room.keys()));
                return;
              }

              if (targetMember.ws.readyState !== 1) {
                console.error(`[WS] Target ${targetId} WebSocket not open (state: ${targetMember.ws.readyState})`);
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
                console.log(`[WS] ✅ Forwarded ${type} from ${clientId} to ${targetId}`);
              } catch (e) {
                console.error(`[WS] ❌ Failed to forward ${type} to ${targetId}:`, e);
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

      onClose: () => {
        console.log(`[WS] Client ${clientId} disconnected from room ${roomId}`);

        const room = rooms.get(roomId);
        if (room) {
          room.delete(clientId);
          console.log(
            `[WS] Removed ${clientId} from room ${roomId}, ${room.size} members remaining`,
          );

          // Notify others that user left
          room.forEach((member, memberId) => {
            if (member.ws.readyState !== 1) return;
            try {
              member.ws.send(
                JSON.stringify({
                  type: "disconnect",
                  clientId: clientId,
                }),
              );
            } catch (e) {
              console.error(`[WS] Failed to send disconnect to ${memberId}:`, e);
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
