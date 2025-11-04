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
    <div className="fixed inset-0  flex items-center justify-center z-50 p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="backdrop-blur-xl bg-background border rounded-2xl  max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Join Room</h2>
          <Button size={"icon"} variant={"ghost"} onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Room ID</label>
            <Input
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Name
              <span className="text-muted-foreground"> (optional)</span>
            </label>
            <Input
              placeholder="Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
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
