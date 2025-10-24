"use client";

import { useEffect, useState } from "react";
import { Users, Lock, Globe } from "lucide-react";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
}

export function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch("/api/rooms");
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        console.error("Failed to fetch rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 animate-pulse"
          >
            <div className="h-6 bg-white/10 rounded mb-4" />
            <div className="h-4 bg-white/10 rounded mb-4" />
            <div className="h-10 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No rooms yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <Link key={room.id} href={`/room/${room.id}`}>
          <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 hover:bg-white/20 dark:hover:bg-white/10 transition-all cursor-pointer h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold flex-1">{room.name}</h3>
              {room.isPublic ? (
                <Globe className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-accent" />
              )}
            </div>
            {room.description && (
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                {room.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {room.memberCount} member{room.memberCount !== 1 ? "s" : ""}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
