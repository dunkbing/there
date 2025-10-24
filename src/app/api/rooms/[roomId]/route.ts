import { db } from "@/lib/db";
import { rooms, roomSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/rooms/[roomId] - Get room details
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } },
) {
  try {
    const { roomId } = params;

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
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to fetch room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 },
    );
  }
}

// PUT /api/rooms/[roomId] - Update room settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { roomId: string } },
) {
  try {
    const { roomId } = params;
    const {
      pomodoroWorkDuration,
      pomodoroBreakDuration,
      ambientSound,
      musicUrl,
    } = await request.json();

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

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error("Failed to update room settings:", error);
    return NextResponse.json(
      { error: "Failed to update room settings" },
      { status: 500 },
    );
  }
}
