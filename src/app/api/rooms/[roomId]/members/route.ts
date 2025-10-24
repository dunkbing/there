import { db } from "@/lib/db";
import { roomMembers } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/rooms/[roomId]/members - Get room members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;

    const members = await db.query.roomMembers.findMany({
      where: eq(roomMembers.roomId, roomId),
      with: {
        user: true,
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}
