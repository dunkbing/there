"use client";

import { Button } from "@/components/ui/button";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { X } from "lucide-react";

interface FocusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FocusDialog({ isOpen, onClose }: FocusDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative m-6 w-[480px] backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-4">
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

        <div className="space-y-4">
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
