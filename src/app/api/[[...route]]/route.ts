import { Hono } from "hono";
import { handle } from "hono/vercel";
import { db } from "@/lib/db";
import { rooms, roomMembers, roomSettings } from "@/lib/schemas";
import { getSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";

const app = new Hono().basePath("/api");

// GET /api/rooms - Get user's rooms
app.get("/rooms", async (c) => {
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
app.post("/rooms", async (c) => {
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

    // Add creator as member
    await db.insert(roomMembers).values({
      roomId: newRoom[0].id,
      userId,
      role: "creator",
    });

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
app.get("/rooms/:id", async (c) => {
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
app.put("/rooms/:id", async (c) => {
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
app.get("/rooms/:id/members", async (c) => {
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
app.post("/rooms/join", async (c) => {
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
        where: and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.id, guestId),
        ),
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
      const newMember = await db.insert(roomMembers).values({
        roomId,
        guestName: guestName || "Guest",
        role: "member",
      }).returning();

      return c.json({ success: true, guestId: newMember[0].id });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to join room:", error);
    return c.json({ error: "Failed to join room" }, 500);
  }
});

// WebRTC Signaling - In-memory storage for signals
const signalQueue = new Map<string, any[]>();

// POST /api/webrtc/signal - Send WebRTC signal
app.post("/webrtc/signal", async (c) => {
  try {
    const signal = await c.req.json();
    const { roomId, to } = signal;

    if (!roomId) {
      return c.json({ error: "Room ID is required" }, 400);
    }

    // Store signal for the recipient
    const key = `${roomId}:${to}`;
    if (!signalQueue.has(key)) {
      signalQueue.set(key, []);
    }
    signalQueue.get(key)!.push(signal);

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to send signal:", error);
    return c.json({ error: "Failed to send signal" }, 500);
  }
});

// GET /api/webrtc/signal - Get pending signals
app.get("/webrtc/signal", async (c) => {
  try {
    const roomId = c.req.query("roomId");
    const userId = c.req.query("userId");

    if (!roomId || !userId) {
      return c.json({ error: "Room ID and User ID are required" }, 400);
    }

    const key = `${roomId}:${userId}`;
    const signals = signalQueue.get(key) || [];

    // Clear signals after retrieval
    signalQueue.delete(key);

    return c.json(signals);
  } catch (error) {
    console.error("Failed to get signals:", error);
    return c.json({ error: "Failed to get signals" }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
