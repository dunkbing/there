"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { roomClient } from "@/api/client";

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
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Guest");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatSendMessage, setChatSendMessage] = useState<
    (text: string) => void
  >(() => () => {});
  const previousMembersRef = useRef<string[]>([]);
  const joiningRef = useRef(false);
  const roomRef = useRef(room);

  // Keep roomRef in sync with room
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Set current user ID and name from session or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUserId(
        session?.user?.id || localStorage.getItem(`guestId_${roomId}`) || "",
      );
      setCurrentUserName(
        session?.user?.name || localStorage.getItem("guestUsername") || "Guest",
      );
    }
  }, [session, roomId]);

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

  // Fetch room data immediately on mount (don't wait for session)
  useEffect(() => {
    const fetchRoom = async () => {
      console.time(`[RoomPage ${roomId}] Room fetch`);
      try {
        const response = await roomClient.rooms[":id"].$get({
          param: { id: roomId },
        });
        console.timeEnd(`[RoomPage ${roomId}] Room fetch`);

        if (response.ok) {
          const data = await response.json();
          console.log(
            `[RoomPage ${roomId}] Room data loaded:`,
            data.name,
            `(${data.members?.length || 0} members)`,
          );
          setRoom(data);
          // Initialize previous members list
          previousMembersRef.current =
            data.members?.map((m: any) => m.id) || [];
        } else {
          console.error(
            `[RoomPage ${roomId}] Room fetch failed with status:`,
            response.status,
          );
        }
      } catch (error) {
        console.error(`[RoomPage ${roomId}] Failed to fetch room:`, error);
      } finally {
        setLoading(false);
        console.log(`[RoomPage ${roomId}] Loading state set to false`);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (room?.name) {
      document.title = `${room.name} - Focus Room`;
    }
  }, [room]);

  const leaveRoom = async () => {
    try {
      const guestId = localStorage.getItem(`guestId_${roomId}`);
      await roomClient.rooms.leave.$post({ json: { roomId, guestId } });
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  const joinRoom = async (guestName: string) => {
    // Prevent duplicate join requests (especially in React Strict Mode)
    if (joiningRef.current) {
      return;
    }

    try {
      joiningRef.current = true;

      // Get existing guest ID from localStorage
      const guestId = localStorage.getItem(`guestId_${roomId}`);

      const response = await roomClient.rooms.join.$post({
        json: {
          roomId,
          guestName,
          guestId,
        },
      });

      if (response.ok) {
        const result = await response.json();

        // Store and update guest ID
        if ("guestId" in result) {
          localStorage.setItem(`guestId_${roomId}`, result.guestId as string);
          // Update current user ID with the guestId (new or existing)
          setCurrentUserId(result.guestId as string);
        }

        setHasJoinedRoom(true);
        // Refresh room data to update members list
        const roomResponse = await roomClient.rooms[":id"].$get({
          param: { id: roomId },
        });
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
    } finally {
      joiningRef.current = false;
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

  const handleChatUpdate = useCallback(
    (messages: any[], sendMessage: (text: string) => void) => {
      setChatMessages(messages);
      setChatSendMessage(() => sendMessage);
    },
    [],
  );

  const handleUserJoined = useCallback(
    async (joinedUserId: string) => {
      console.log(`[RoomPage ${roomId}] User joined:`, joinedUserId);

      // Refresh room data to update member list
      const response = await roomClient.rooms[":id"].$get({
        param: { id: roomId },
      });

      if (response.ok) {
        response.json().then((data) => {
          setRoom(data);
          previousMembersRef.current =
            data.members?.map((m: any) => m.id) || [];

          // Find the new member and show toast
          const newMember = data.members?.find(
            (m: any) =>
              m.user?.id === joinedUserId ||
              m.userId === joinedUserId ||
              m.guestId === joinedUserId ||
              m.id === joinedUserId,
          );
          if (newMember) {
            const memberName =
              newMember.user?.name || newMember.guestName || "A user";
            toast.success(`${memberName} joined the room`);
          }
        });
      }
    },
    [roomId],
  );

  const handleUserLeft = useCallback(
    (leftUserId: string) => {
      // If leftUserId is empty, it means we should just refetch without showing toast
      if (leftUserId) {
        // Find the member who left using the ref to avoid dependency
        const leftMember = roomRef.current?.members?.find(
          (m) =>
            m.user?.id === leftUserId ||
            m.userId === leftUserId ||
            m.guestId === leftUserId ||
            m.id === leftUserId,
        );
        if (leftMember) {
          const memberName =
            leftMember.user?.name || leftMember.guestName || "A user";
          toast.info(`${memberName} left the room`);
        }
      }

      // Refresh room data to update member list
      roomClient.rooms[":id"]
        .$get({
          param: { id: roomId },
        })
        .then((response) => {
          if (response.ok) {
            response.json().then((data) => {
              setRoom(data);
              previousMembersRef.current =
                data.members?.map((m: any) => m.id) || [];
            });
          }
        });
    },
    [roomId],
  );

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

  // Show skeleton loader with page structure while loading
  if (loading) {
    return <Skeleton />;
  }

  if (!room) {
    return (
      <main className="h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Room not found</p>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
          >
            Go back home
          </Button>
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
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              roomId={roomId}
              onChatUpdate={handleChatUpdate}
              onUserLeft={handleUserLeft}
              onUserJoined={handleUserJoined}
            />
          </div>

          {/* Sidebar - Room Members & Chat */}
          <div className="lg:col-span-1 space-y-6">
            <RoomMembers
              members={room.members || []}
              currentUserId={currentUserId}
            />
            <RoomChat messages={chatMessages} onSendMessage={chatSendMessage} />
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

function Skeleton() {
  return (
    <main className="h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Skeleton Header */}
      <div className="border-b bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 bg-muted/20 rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted/10 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Skeleton Content */}
      <div className="container mx-auto px-4 py-6 relative z-10 flex-1 min-h-0">
        <div className="grid lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-3">
            <div className="h-full bg-card/50 backdrop-blur-sm border rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="h-32 bg-card/50 backdrop-blur-sm border rounded-lg animate-pulse" />
            <div className="h-96 bg-card/50 backdrop-blur-sm border rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-full px-4 py-2 shadow-2xl flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/60 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading room...</span>
        </div>
      </div>
    </main>
  );
}
