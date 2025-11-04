"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { roomClient } from "@/api/client";

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomDialog({ isOpen, onClose }: CreateRoomDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await roomClient.rooms.$post({
        json: {
          name,
          description,
          isPublic,
        },
      });

      if (response.ok) {
        const { id } = await response.json();
        router.push(`/room/${id}`);
        onClose();
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="backdrop-blur-xl bg-background  border  rounded-2xl max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">Create Room</h2>
          <Button size={"icon"} variant={"ghost"} onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Room Name
              <span className="text-muted-foreground "> (optional)</span>
            </label>
            <Input
              placeholder="Leave empty to auto-generate a cool name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Description
              <span className="text-muted-foreground"> (optional)</span>
            </label>
            <Input
              placeholder="Enter room description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            <label
              htmlFor="public"
              className="text-sm font-medium cursor-pointer"
            >
              Make room public
            </label>
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </div>
    </div>
  );
}
