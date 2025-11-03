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

      <div className="relative z-70 w-[480px] backdrop-blur-xl bg-background border rounded-2xl  shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-foreground">Room Info</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {/* Room ID */}
          <div>
            <label className="block text-sm font-medium mb-2">Room ID</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={roomId}
                readOnly
                className="flex-1 bg-foreground/5  border border-foreground/10  px-4 py-2 text-sm text-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              />
              <Button
                onClick={copyRoomLink}
                variant="outline"
                className={cn(
                  "gap-2 hover:bg-foreground/5 transition",
                  copied &&
                    "text-green-500 hover:text-green-500 border-green-500"
                )}
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium mb-2">Share Link</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={`${window.location.origin}?room=${roomId}`}
                readOnly
                className="flex-1 bg-foreground/5  border border-foreground/10  px-4 py-2 text-sm text-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              />
              <Button
                onClick={copyRoomLink}
                variant="outline"
                className="gap-2 hover:bg-foreground/5"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Participants */}
          <Card className="p-4 bg-foreground/5 rounded-lg border ">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">
                {participants} participant{participants !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Invite others to join your focus session
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
