"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Copy, Share2, Users } from "lucide-react";

interface RoomInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoomInfoDialog({ isOpen, onClose }: RoomInfoDialogProps) {
  const [roomId, setRoomId] = useState(
    "focus-" + Math.random().toString(36).substr(2, 9),
  );
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState(1);

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative m-6 w-[480px] backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-4">
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

        <div className="space-y-6">
          {/* Room ID */}
          <div>
            <label className="block text-sm font-medium mb-2">Room ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                readOnly
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-foreground font-mono text-sm"
              />
              <Button
                onClick={copyRoomLink}
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent border-white/20"
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
              <input
                type="text"
                value={`${window.location.origin}?room=${roomId}`}
                readOnly
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-foreground text-sm truncate"
              />
              <Button
                onClick={copyRoomLink}
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent border-white/20"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Participants */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">
                {participants} participant{participants !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Invite others to join your focus session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
