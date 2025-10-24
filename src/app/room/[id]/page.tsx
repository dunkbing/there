"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { SoundSelector } from "@/components/sound-selector";
import { MusicPlayer } from "@/components/music-player";
import { ThemeSelector } from "@/components/theme-selector";
import { FocusDialog } from "@/components/focus-dialog";
import { RoomInfoDialog } from "@/components/room-info-dialog";
import { RoomHeader } from "@/components/room-header";
import { RoomMembers } from "@/components/room-members";
import { RoomChat } from "@/components/room-chat";
import { Button } from "@/components/ui/button";
import { Volume2, Music, Palette, Timer, Info } from "lucide-react";
import type { RoomWithRelations } from "@/lib/schemas";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const [room, setRoom] = useState<RoomWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundSelectorOpen, setSoundSelectorOpen] = useState(false);
  const [musicPlayerOpen, setMusicPlayerOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [roomInfoOpen, setRoomInfoOpen] = useState(false);

  const closeAllPopups = () => {
    setSoundSelectorOpen(false);
    setMusicPlayerOpen(false);
    setThemeSelectorOpen(false);
    setFocusDialogOpen(false);
    setRoomInfoOpen(false);
  };

  const openSoundSelector = () => {
    closeAllPopups();
    setSoundSelectorOpen(true);
  };

  const openMusicPlayer = () => {
    closeAllPopups();
    setMusicPlayerOpen(true);
  };

  const openThemeSelector = () => {
    closeAllPopups();
    setThemeSelectorOpen(true);
  };

  const openFocusDialog = () => {
    closeAllPopups();
    setFocusDialogOpen(true);
  };

  const openRoomInfo = () => {
    closeAllPopups();
    setRoomInfoOpen(true);
  };

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoom(data);
        }
      } catch (error) {
        console.error("Failed to fetch room:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (room?.name) {
      document.title = `${room.name} - Focus Room`;
    }
  }, [room]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Room not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Room Header */}
      <RoomHeader room={room} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content - Meeting Workspace */}
          <div className="lg:col-span-3 space-y-6">
            <MeetingWorkspace />
          </div>

          {/* Sidebar - Room Members & Chat */}
          <div className="lg:col-span-1 space-y-6">
            <RoomMembers members={room.members || []} />
            <RoomChat />
          </div>
        </div>
      </div>

      {/* Feature Controls - Floating Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-full px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <Button
              onClick={openSoundSelector}
              className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all hover:scale-110"
              title="Ambient Sounds"
            >
              <Volume2 className="w-5 h-5" />
            </Button>
            <Button
              onClick={openMusicPlayer}
              className="rounded-full w-12 h-12 p-0 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all hover:scale-110"
              title="Music Player"
            >
              <Music className="w-5 h-5" />
            </Button>
            <Button
              onClick={openThemeSelector}
              className="rounded-full w-12 h-12 p-0 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg transition-all hover:scale-110"
              title="Change Theme"
            >
              <Palette className="w-5 h-5" />
            </Button>
            <Button
              onClick={openFocusDialog}
              className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all hover:scale-110"
              title="Focus Timer"
            >
              <Timer className="w-5 h-5" />
            </Button>
            <Button
              onClick={openRoomInfo}
              className="rounded-full w-12 h-12 p-0 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg transition-all hover:scale-110"
              title="Room Info"
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Popups */}
      <SoundSelector
        isOpen={soundSelectorOpen}
        onClose={() => setSoundSelectorOpen(false)}
      />
      <MusicPlayer
        isOpen={musicPlayerOpen}
        onClose={() => setMusicPlayerOpen(false)}
      />
      <ThemeSelector
        isOpen={themeSelectorOpen}
        onClose={() => setThemeSelectorOpen(false)}
      />
      <FocusDialog
        isOpen={focusDialogOpen}
        onClose={() => setFocusDialogOpen(false)}
      />
      <RoomInfoDialog
        isOpen={roomInfoOpen}
        onClose={() => setRoomInfoOpen(false)}
      />
    </main>
  );
}
