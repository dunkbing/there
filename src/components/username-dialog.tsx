"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";

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

      <div className="relative z-[110] w-[400px] backdrop-blur-xl bg-background border  rounded-2xl  shadow-2xl">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Join the Room
          </h2>
          <p className="text-sm text-muted-foreground ">
            Enter your name to join this focus session
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2"
            >
              Your Name
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 w-full bg-foreground/5 border border-foreground/10  px-4 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            disabled={!username}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Join Room
          </Button>
        </form>
      </div>
    </div>
  );
}
