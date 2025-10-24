"use client";

import { RoomMemberWithRelations } from "@/lib/schemas";
import { Users } from "lucide-react";

interface RoomMembersProps {
  members: RoomMemberWithRelations[];
}

export function RoomMembers({ members }: RoomMembersProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" />
        <h2 className="font-semibold">Members ({members.length})</h2>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold">
              {(
                member.user?.name?.[0] ||
                member.guestName?.[0] ||
                "?"
              ).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.user?.name || member.guestName || "Guest"}
              </p>
              {member.user?.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.user.email}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
