"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { roomClient } from "@/api/client";

interface JoinRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomDialog({ isOpen, onClose }: JoinRoomDialogProps) {
  const [roomId, setRoomId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (!roomId.trim()) return;

    setLoading(true);
    try {
      const response = await roomClient.rooms.join.$post({
        json: {
          roomId,
          guestName: guestName || "Guest",
        },
      });

      if (response.ok) {
        router.push(`/room/${roomId}`);
        onClose();
      }
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Join Room</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Room ID</label>
            <Input
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-white/10 border-white/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Name (optional)
            </label>
            <Input
              placeholder="Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="bg-white/10 border-white/20 focus:border-primary"
            />
          </div>

          <Button
            onClick={handleJoin}
            disabled={!roomId.trim() || loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? "Joining..." : "Join Room"}
          </Button>
        </div>
      </div>
    </div>
  );
}
