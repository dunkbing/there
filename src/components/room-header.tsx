"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Globe, Lock } from "lucide-react";
import { type SelectRoom } from "@/lib/schemas";

interface RoomHeaderProps {
  room: SelectRoom;
}

export function RoomHeader({ room }: RoomHeaderProps) {
  const router = useRouter();
  const roomUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${room.id}`;

  const copyRoomLink = () => {
    navigator.clipboard.writeText(roomUrl);
    // You could add a toast notification here
  };

  return (
    <header className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border-b border-white/20 dark:border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{room.name}</h1>
                {room.public ? (
                  <Globe className="w-4 h-4 text-primary" />
                ) : (
                  <Lock className="w-4 h-4 text-accent" />
                )}
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground">
                  {room.description}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={copyRoomLink}
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
          >
            <Copy className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>
    </header>
  );
}
