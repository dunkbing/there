import { db } from "@/lib/db";
import { rooms, roomMembers, roomSettings } from "@/lib/schemas";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/rooms - Get user's rooms
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.createdBy, session.user.id));

    return NextResponse.json(userRooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 },
    );
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const { name, description, isPublic } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 },
      );
    }

    let userId: string | null = null;

    if (session?.user) {
      userId = session.user.id;
    } else {
      // For anonymous users, we'll create a temporary user
      // In a real app, you might want to handle this differently
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Create room
    const newRoom = await db
      .insert(rooms)
      .values({
        name,
        description: description || null,
        createdBy: userId,
        isPublic: isPublic ?? true,
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

    return NextResponse.json(newRoom[0]);
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 },
    );
  }
}
