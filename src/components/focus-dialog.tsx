"use client";

import { Button } from "@/components/ui/button";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FocusDialog({ isOpen, onClose }: FocusDialogProps) {
  return (
    <div
      className={cn(
        isOpen ? "flex" : "hidden",
        "fixed inset-0 z-50  items-end justify-center pb-28"
      )}
    >
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-70 w-[480px] backdrop-blur-xl bg-background border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between  p-6 border-b">
          <h2 className="text-lg font-semibold text-foreground">Focus Timer</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
