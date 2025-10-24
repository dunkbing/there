"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { RoomList } from "@/components/room-list";
import { JoinRoomDialog } from "@/components/join-room-dialog";
import { CreateRoomDialog } from "@/components/create-room-dialog";
import { AuthHeader } from "@/components/auth-header";
import { Button } from "@/components/ui/button";
import { Plus, LogIn } from "lucide-react";

export default function Home() {
  const { data: session, isPending } = useSession();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isPending) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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

      {/* Header */}
      <AuthHeader />

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-3">
            Focus Together
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create collaborative focus rooms with integrated pomodoro timers,
            ambient sounds, and real-time video chat
          </p>
        </div>

        {/* Main Content */}
        {session?.user ? (
          // Logged in view - show room list
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Rooms</h2>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Create Room
              </Button>
            </div>
            <RoomList />
          </div>
        ) : (
          // Not logged in view - show welcome with join/create options
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-12 text-center space-y-6">
              <h2 className="text-2xl font-semibold">Get Started</h2>
              <p className="text-muted-foreground">
                Join an existing room or create a new one to start collaborating
                with your team
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setJoinDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Join Room
                </Button>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Create Room
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-2">Collaborative Focus</h3>
                <p className="text-sm text-muted-foreground">
                  Work together with your team in real-time focus sessions
                </p>
              </div>
              <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-2">Integrated Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Pomodoro timer, ambient sounds, and music all in one place
                </p>
              </div>
              <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold mb-2">Video & Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with WebRTC video calls and real-time messaging
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <JoinRoomDialog
        isOpen={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
      />
      <CreateRoomDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </main>
  );
}
