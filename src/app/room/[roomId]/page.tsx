"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { SoundSelector } from "@/components/sound-selector";
import { MusicPlayer } from "@/components/music-player";
import { ThemeSelector } from "@/components/theme-selector";
import { RoomHeader } from "@/components/room-header";
import { RoomMembers } from "@/components/room-members";
import { Button } from "@/components/ui/button";
import { Volume2, Music, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Room {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  members: Array<{
    id: string;
    guestName: string | null;
    user: { name: string | null; email: string } | null;
  }>;
  settings: Array<{
    pomodoroWorkDuration: number;
    pomodoroBreakDuration: number;
    ambientSound: string;
    musicUrl: string | null;
  }>;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("focus");
  const [soundSelectorOpen, setSoundSelectorOpen] = useState(false);
  const [musicPlayerOpen, setMusicPlayerOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);

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

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl grid w-full grid-cols-2 mb-8">
                <TabsTrigger
                  value="focus"
                  className="transition-all duration-300 ease-out"
                >
                  Focus
                </TabsTrigger>
                <TabsTrigger
                  value="collaborate"
                  className="transition-all duration-300 ease-out"
                >
                  Collaborate
                </TabsTrigger>
              </TabsList>

              {/* Focus Tab - Pomodoro Timer */}
              <TabsContent value="focus" className="space-y-6">
                <PomodoroTimer />
              </TabsContent>

              {/* Collaborate Tab - Video/Chat */}
              <TabsContent value="collaborate" className="space-y-6">
                <MeetingWorkspace />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Room Members */}
          <div className="lg:col-span-1">
            <RoomMembers members={room.members} />
          </div>
        </div>
      </div>

      {/* Feature Controls */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-40">
        <Button
          onClick={() => setSoundSelectorOpen(true)}
          className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all hover:scale-110"
          title="Ambient Sounds"
        >
          <Volume2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setMusicPlayerOpen(true)}
          className="rounded-full w-12 h-12 p-0 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all hover:scale-110"
          title="Music Player"
        >
          <Music className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setThemeSelectorOpen(true)}
          className="rounded-full w-12 h-12 p-0 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg transition-all hover:scale-110"
          title="Change Theme"
        >
          <Palette className="w-5 h-5" />
        </Button>
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
    </main>
  );
}
