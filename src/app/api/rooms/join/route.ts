import { db } from "@/lib/db";
import { rooms, roomMembers } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// POST /api/rooms/join - Join a room
export async function POST(request: NextRequest) {
  try {
    const { roomId, guestName } = await request.json();
    const session = await getSession();

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 },
      );
    }

    // Check if room exists
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
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
    } else {
      // Anonymous user
      await db.insert(roomMembers).values({
        roomId,
        guestName: guestName || "Guest",
        role: "member",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to join room:", error);
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
