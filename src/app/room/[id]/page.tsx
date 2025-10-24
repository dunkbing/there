"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { SoundSelector } from "@/components/sound-selector";
import { MusicPlayer } from "@/components/music-player";
import { ThemeSelector } from "@/components/theme-selector";
import { FocusDialog } from "@/components/focus-dialog";
import { RoomInfoDialog } from "@/components/room-info-dialog";
import { UsernameDialog } from "@/components/username-dialog";
import { RoomHeader } from "@/components/room-header";
import { RoomMembers } from "@/components/room-members";
import { RoomChat } from "@/components/room-chat";
import { Button } from "@/components/ui/button";
import { Volume2, Music, Palette, Timer, Info } from "lucide-react";
import type { RoomWithRelations } from "@/lib/schemas";
import { useSession } from "@/lib/auth-client";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const [room, setRoom] = useState<RoomWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundSelectorOpen, setSoundSelectorOpen] = useState(false);
  const [musicPlayerOpen, setMusicPlayerOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [roomInfoOpen, setRoomInfoOpen] = useState(false);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const previousMembersRef = useRef<string[]>([]);

  // Disable body scroll on mount, re-enable on unmount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
          // Initialize previous members list
          previousMembersRef.current =
            data.members?.map((m: any) => m.id) || [];
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

  // Poll for room updates to keep members list fresh
  useEffect(() => {
    if (!room || !hasJoinedRoom) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();

          // Check for members who left
          if (previousMembersRef.current.length > 0) {
            const currentMemberIds = data.members.map((m: any) => m.id);
            const leftMembers = previousMembersRef.current.filter(
              (prevId) => !currentMemberIds.includes(prevId),
            );

            // Show toast for each member who left
            leftMembers.forEach((leftMemberId) => {
              const leftMember = room.members?.find(
                (m) => m.id === leftMemberId,
              );
              if (leftMember) {
                const memberName = leftMember.guestName || "Guest";
                toast.info(`${memberName} left the room`);
              }
            });
          }

          // Update previous members list
          previousMembersRef.current = data.members.map((m: any) => m.id);

          setRoom(data);
        }
      } catch (error) {
        console.error("Failed to poll room data:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [room, hasJoinedRoom, roomId]);

  const leaveRoom = async () => {
    try {
      const guestId = localStorage.getItem(`guestId_${roomId}`);

      await fetch("/api/rooms/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          guestId,
        }),
      });
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  const joinRoom = async (guestName: string) => {
    try {
      // Get existing guest ID from localStorage
      const guestId = localStorage.getItem(`guestId_${roomId}`);

      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          guestName,
          guestId,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Store guest ID if this is a new guest
        if (result.guestId && !guestId) {
          localStorage.setItem(`guestId_${roomId}`, result.guestId);
        }

        setHasJoinedRoom(true);
        // Refresh room data to update members list
        const roomResponse = await fetch(`/api/rooms/${roomId}`);
        if (roomResponse.ok) {
          const data = await roomResponse.json();
          setRoom(data);
          // Update previous members list after joining
          previousMembersRef.current =
            data.members?.map((m: any) => m.id) || [];
        }
      }
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  // Auto-join authenticated users
  useEffect(() => {
    if (!sessionLoading && session?.user && room && !hasJoinedRoom) {
      // Authenticated user - join without guest name
      joinRoom("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, session, room, hasJoinedRoom]);

  // Check if guest needs to enter username
  useEffect(() => {
    if (!sessionLoading && !session?.user && room && !hasJoinedRoom) {
      const storedUsername = localStorage.getItem("guestUsername");
      if (!storedUsername) {
        setShowUsernameDialog(true);
      } else {
        // Auto-join with stored username
        joinRoom(storedUsername);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, session, room, hasJoinedRoom]);

  const handleUsernameSubmit = (username: string) => {
    localStorage.setItem("guestUsername", username);
    setShowUsernameDialog(false);
    joinRoom(username);
  };

  // Handle disconnect when user leaves the room
  useEffect(() => {
    if (!hasJoinedRoom) return;

    // Handle page unload (tab close, navigation, refresh)
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable disconnect on page unload
      const guestId = localStorage.getItem(`guestId_${roomId}`);
      const blob = new Blob([JSON.stringify({ roomId, guestId })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/rooms/leave", blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasJoinedRoom, roomId]);

  if (loading || sessionLoading) {
    return (
      <main className="h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Room not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Room Header */}
      <RoomHeader room={room} />

      <div className="container mx-auto px-4 py-6 relative z-10 flex-1 min-h-0">
        <div className="grid lg:grid-cols-4 gap-6 h-full">
          {/* Main Content - Meeting Workspace */}
          <div className="lg:col-span-3 space-y-6">
            <MeetingWorkspace
              members={room.members || []}
              currentUserId={
                session?.user?.id ||
                localStorage.getItem(`guestId_${roomId}`) ||
                ""
              }
            />
          </div>

          {/* Sidebar - Room Members & Chat */}
          <div className="lg:col-span-1 space-y-6">
            <RoomMembers
              members={room.members || []}
              currentUserId={
                session?.user?.id ||
                localStorage.getItem(`guestId_${roomId}`) ||
                ""
              }
            />
            <RoomChat
              roomId={roomId}
              userId={
                session?.user?.id ||
                localStorage.getItem(`guestId_${roomId}`) ||
                ""
              }
              userName={
                session?.user?.name ||
                localStorage.getItem("guestUsername") ||
                "Guest"
              }
              members={room.members || []}
            />
          </div>
        </div>
      </div>

      {/* Feature Controls - Floating Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60">
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
      <UsernameDialog
        isOpen={showUsernameDialog}
        onSubmit={handleUsernameSubmit}
      />
    </main>
  );
}
