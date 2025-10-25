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
    if (!name.trim()) return;

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Create Room</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Room Name</label>
            <Input
              placeholder="Enter room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/10 border-white/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Description (optional)
            </label>
            <Input
              placeholder="Enter room description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/10 border-white/20 focus:border-primary"
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
            disabled={!name.trim() || loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </div>
    </div>
  );
}
