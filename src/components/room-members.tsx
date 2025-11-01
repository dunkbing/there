"use client";

import { RoomMemberWithRelations } from "@/lib/schemas";
import { Users } from "lucide-react";

interface RoomMembersProps {
  members: RoomMemberWithRelations[];
  currentUserId?: string;
}

export function RoomMembers({ members, currentUserId }: RoomMembersProps) {
  return (
    <div className="backdrop-blur-xl">
      <div className="space-y-3">
        {members.map((member) => {
          const peerId =
            member.user?.id || member.guestId || member.userId || member.id;
          const isCurrentUser = peerId === currentUserId;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold">
                {(
                  member.user?.name?.[0] ||
                  member.guestName?.[0] ||
                  "?"
                ).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.user?.name || member.guestName || "Guest"}
                  {isCurrentUser && (
                    <span className="text-muted-foreground"> (You)</span>
                  )}
                </p>
                {member.user?.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
