import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import Pusher from "pusher";
import { db } from "@/lib/db";
import { rooms, roomMembers, roomSettings } from "@/lib/schemas";
import { getSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";
import { cacheClient } from "@/lib/cache";

export const roomRoute = new Hono();

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// GET /api/rooms - Get user's rooms
roomRoute.get("/rooms", async (c) => {
  try {
    const session = await getSession();

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.createdBy, session.user.id));

    return c.json(userRooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return c.json({ error: "Failed to fetch rooms" }, 500);
  }
});

// POST /api/rooms - Create a new room
roomRoute.post("/rooms", async (c) => {
  try {
    const session = await getSession();
    const { name, description, isPublic } = await c.req.json();

    if (!name) {
      return c.json({ error: "Room name is required" }, 400);
    }

    let userId: string | null = null;

    if (session?.user) {
      userId = session.user.id;
    }
    // Create room
    const newRoom = await db
      .insert(rooms)
      .values({
        name,
        description: description || null,
        createdBy: userId,
        public: isPublic ?? true,
      })
      .returning();

    // Create default room settings
    await db.insert(roomSettings).values({
      roomId: newRoom[0].id,
    });

    return c.json(newRoom[0]);
  } catch (error) {
    console.error("Failed to create room:", error);
    return c.json({ error: "Failed to create room" }, 500);
  }
});

// GET /api/rooms/:id - Get room details
roomRoute.get("/rooms/:id", async (c) => {
  try {
    const roomId = c.req.param("id");

    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
      with: {
        creator: true,
        members: {
          with: {
            user: true,
          },
        },
        settings: true,
      },
    });

    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }

    return c.json(room);
  } catch (error) {
    console.error("Failed to fetch room:", error);
    return c.json({ error: "Failed to fetch room" }, 500);
  }
});

// PUT /api/rooms/:id - Update room settings
roomRoute.put("/rooms/:id", async (c) => {
  try {
    const roomId = c.req.param("id");
    const {
      pomodoroWorkDuration,
      pomodoroBreakDuration,
      ambientSound,
      musicUrl,
    } = await c.req.json();

    const settings = await db
      .update(roomSettings)
      .set({
        pomodoroWorkDuration,
        pomodoroBreakDuration,
        ambientSound,
        musicUrl,
      })
      .where(eq(roomSettings.roomId, roomId))
      .returning();

    return c.json(settings[0]);
  } catch (error) {
    console.error("Failed to update room settings:", error);
    return c.json({ error: "Failed to update room settings" }, 500);
  }
});

// GET /api/rooms/:id/members - Get room members
roomRoute.get("/rooms/:id/members", async (c) => {
  try {
    const roomId = c.req.param("id");

    const members = await db.query.roomMembers.findMany({
      where: eq(roomMembers.roomId, roomId),
      with: {
        user: true,
      },
    });

    return c.json(members);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return c.json({ error: "Failed to fetch members" }, 500);
  }
});

// POST /api/rooms/join - Join a room
roomRoute.post("/rooms/join", async (c) => {
  try {
    const { roomId, guestName, guestId } = await c.req.json();
    const session = await getSession();

    if (!roomId) {
      return c.json({ error: "Room ID is required" }, 400);
    }

    // Check if room exists
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });

    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }

    // Add member to room
    if (session?.user) {
      // Authenticated user
      const existingMember = await db.query.roomMembers.findFirst({
        where: and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, session.user.id),
        ),
      });

      if (!existingMember) {
        await db.insert(roomMembers).values({
          roomId,
          userId: session.user.id,
          role: "member",
        });
      }
    } else if (guestId) {
      // Anonymous user with guest ID - check if already in room
      const existingGuest = await db.query.roomMembers.findFirst({
        where: and(eq(roomMembers.roomId, roomId), eq(roomMembers.id, guestId)),
      });

      if (!existingGuest) {
        // Check if this guest ID exists but update their name
        await db.insert(roomMembers).values({
          id: guestId,
          roomId,
          guestName: guestName || "Guest",
          role: "member",
        });
      }
    } else {
      // Anonymous user without guest ID (new guest)
      const newMember = await db
        .insert(roomMembers)
        .values({
          roomId,
          guestName: guestName || "Guest",
          role: "member",
        })
        .returning();

      return c.json({ success: true, guestId: newMember[0].id });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to join room:", error);
    return c.json({ error: "Failed to join room" }, 500);
  }
});

// POST /api/rooms/leave - Leave a room
roomRoute.post("/rooms/leave", async (c) => {
  try {
    const { roomId, guestId } = await c.req.json();
    const session = await getSession();

    if (!roomId) {
      return c.json({ error: "Room ID is required" }, 400);
    }

    // Remove member from room
    if (session?.user) {
      // Authenticated user
      await db
        .delete(roomMembers)
        .where(
          and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.userId, session.user.id),
          ),
        );
    } else if (guestId) {
      // Anonymous user with guest ID
      await db
        .delete(roomMembers)
        .where(
          and(eq(roomMembers.roomId, roomId), eq(roomMembers.id, guestId)),
        );
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to leave room:", error);
    return c.json({ error: "Failed to leave room" }, 500);
  }
});

// POST /api/webrtc/signal - Send WebRTC signal
roomRoute.post("/webrtc/signal", async (c) => {
  try {
    const signal = await c.req.json();
    const { roomId, to, type, data, from } = signal;

    console.log(
      `[API] Received signal: roomId=${roomId}, to=${to}, from=${from}, type=${type}`,
    );

    if (!roomId || !to) {
      console.error(`[API] Validation failed: roomId=${roomId}, to=${to}`);
      return c.json(
        {
          error: "Room ID and recipient are required",
          received: { roomId, to, from, type },
        },
        400,
      );
    }

    // Store signal in Redis queue for the recipient
    const queueKey = `signal_queue:${roomId}:${to}`;
    const signalData = JSON.stringify({
      type,
      data,
      from,
      to,
      timestamp: Date.now(),
    });

    // Add signal to the end of the list
    await cacheClient.rpush(queueKey, signalData);

    // Keep queue size reasonable (last 50 signals)
    // LTRIM keeps elements from -50 to -1 (last 50 elements)
    await cacheClient.ltrim(queueKey, -50, -1);

    // Set expiration on the queue (1 hour)
    await cacheClient.expire(queueKey, 3600);

    // Notify via Pusher that a signal is ready (small notification only)
    const channel = `room-${roomId}`;
    try {
      await pusher.trigger(channel, "webrtc-signal-notification", {
        to,
        from,
      });
    } catch (pusherError) {
      console.warn("Pusher notification failed (non-critical):", pusherError);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to send signal:", error);
    return c.json({ error: "Failed to send signal" }, 500);
  }
});

// GET /api/webrtc/signals/:roomId/:userId - Poll for pending signals
roomRoute.get("/webrtc/signals/:roomId/:userId", async (c) => {
  try {
    const roomId = c.req.param("roomId");
    const userId = c.req.param("userId");
    const queueKey = `signal_queue:${roomId}:${userId}`;

    // Get all signals from Redis list
    const rawSignals = await cacheClient.lrange(queueKey, 0, -1);

    // Parse JSON signals
    const signals = rawSignals.map((signal: string) => JSON.parse(signal));

    // Clear the queue after retrieving
    await cacheClient.del(queueKey);

    return c.json({ signals });
  } catch (error) {
    console.error("Failed to fetch signals:", error);
    return c.json({ error: "Failed to fetch signals" }, 500);
  }
});

roomRoute.get(
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
