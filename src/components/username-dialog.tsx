"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UsernameDialogProps {
  isOpen: boolean;
  onSubmit: (username: string) => void;
}

export function UsernameDialog({ isOpen, onSubmit }: UsernameDialogProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-[110] w-[400px] backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Join the Room
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your name to join this focus session
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2"
            >
              Your Name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
          >
            Join Room
          </Button>
        </form>
      </div>
    </div>
  );
}
