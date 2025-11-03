"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Copy, Share2, Users } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface RoomInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoomInfoDialog({ isOpen, onClose }: RoomInfoDialogProps) {
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState(1);

  useEffect(() => {
    if (!roomId) {
      setRoomId("focus-" + Math.random().toString(36).substr(2, 9));
    }
  }, [roomId]);

  const roomLink =
    typeof window !== "undefined"
      ? `${window.location.origin}?room=${roomId}`
      : "";

  const copyRoomLink = () => {
    try {
      navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.log("Failed to copy: ", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-28">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-70 w-[460px] backdrop-blur-xl bg-background border rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Focus Room Info</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-foreground/5"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Room Details */}
          <section>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Room ID</label>
                <Input
                  onFocus={(e) => e.target.select()}
                  readOnly
                  value={roomId}
                  className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Invite Link</label>
                <Input
                  onFocus={(e) => e.target.select()}
                  readOnly
                  value={roomLink}
                  className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={copyRoomLink}
                  variant="outline"
                  className={cn(
                    "gap-2 hover:bg-foreground/5",
                    copied &&
                      "bg-green-50 text-green-600 hover:text-green-500 border-green-600"
                  )}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                {/* <Button variant="outline" className="gap-2">
                  <Share2 className="w-4 h-4" /> Share
                </Button> */}
              </div>
            </div>
          </section>

          {/* Participants */}
          <section>
            <Card className="p-4 bg-foreground/5 border rounded-xl">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {participants === 1
                    ? "You’re the only participant. Share the link to invite others."
                    : `${participants} participants currently in the room.`}
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
