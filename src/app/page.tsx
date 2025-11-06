"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { RoomList } from "@/components/room-list";
import { JoinRoomDialog } from "@/components/join-room-dialog";
import { CreateRoomDialog } from "@/components/create-room-dialog";
import { AuthHeader } from "@/components/auth-header";
import { Button } from "@/components/ui/button";
import {
  Plus,
  LogIn,
  Users,
  Timer,
  Music,
  Video,
  MessageSquare,
  Sparkles,
  Zap,
  Target,
} from "lucide-react";

export default function Home() {
  const { data: session, isPending } = useSession();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isPending) {
    return (
      <main className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground animate-pulse">
            Loading your workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative ">
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-[#0a0a0f] via-[#111122] to-[#0f1018]" />
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[180px]" />
        <div className="absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[160px]" />
        <div className="absolute top-[200px] right-[200px] w-[400px] h-[400px] bg-pink-500/20 rounded-full blur-[160px]" />

        <div
          className="absolute inset-0 opacity-[0.1] mix-blend-overlay"
          style={{
            backgroundImage: 'url("/images/Grain.png")',
            backgroundRepeat: "repeat",

            backgroundSize: "cover",
          }}
        />
      </div>

      {/* Header */}
      <AuthHeader />

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Enhanced Hero Section */}
        <div className="mb-20 text-center relative">
          <div className="inline-flex items-center gap-2 bg-background/20  border border-primary/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="text-sm font-medium text-primary">
              Boost Your Productivity
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 ">
            Focus Together
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            Create collaborative focus rooms with integrated pomodoro timers,
            ambient sounds, and real-time video chat. Stay productive with your
            team.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-3 justify-center items-center max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <div className="inline-flex items-center gap-2 text-accent bg-white border border-white/10 rounded-full px-4 py-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Real-time Sync</span>
            </div>
            <div className="inline-flex items-center gap-2 text-accent bg-white border border-white/10 rounded-full px-4 py-2 text-sm">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Collaborative</span>
            </div>
            <div className="inline-flex items-center gap-2 text-accent bg-white border border-white/10 rounded-full px-4 py-2 text-sm">
              <Target className="w-4 h-4 text-green-500" />
              <span>Focus-Driven</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {session?.user ? (
          // Logged in view - enhanced room list
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <div>
                <h2 className="text-3xl font-semibold mb-2">Your Rooms</h2>
                <p className="text-muted-foreground">
                  Manage and join your focus sessions
                </p>
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="lg"
                className="gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create New Room
              </Button>
            </div>
            <RoomList />
          </div>
        ) : (
          // Not logged in view - enhanced welcome
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="backdrop-blur-xl bg-linear-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-12 text-center space-y-8 shadow-2xl">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Get Started Today</h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Join an existing room or create a new one to start
                  collaborating with your team in focused work sessions
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  onClick={() => setJoinDialogOpen(true)}
                  variant="outline"
                  size="lg"
                  className="gap-2 backdrop-blur-sm bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <LogIn className="w-5 h-5" />
                  Join Existing Room
                </Button>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size="lg"
                  className="gap-2  shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Create Your Room
                </Button>
              </div>
            </div>

            {/* Enhanced feature grid */}
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-center">
                Powerful Features
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="group backdrop-blur-xl bg-linear-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-105 hover:border-primary/30">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">
                    Collaborative Focus
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Work together with your team in real-time focus sessions.
                    See who's online and stay connected.
                  </p>
                </div>

                <div className="group backdrop-blur-xl bg-linear-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 hover:shadow-xl hover:shadow-accent/10 transition-all duration-300 hover:scale-105 hover:border-accent/30">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Timer className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">
                    Integrated Tools
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pomodoro timer, ambient sounds, and music player all
                    seamlessly integrated in one interface.
                  </p>
                </div>

                <div className="group backdrop-blur-xl bg-linear-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 hover:shadow-xl hover:shadow-secondary/10 transition-all duration-300 hover:scale-105 hover:border-secondary/30">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Video className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Video & Chat</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect with WebRTC video calls and real-time messaging.
                    Stay in sync effortlessly.
                  </p>
                </div>
              </div>

              {/* Additional features row */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="backdrop-blur-xl bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                  <Music className="w-6 h-6 text-orange-500 mb-3" />
                  <h4 className="font-medium mb-2">Ambient Sounds</h4>
                  <p className="text-sm text-muted-foreground">
                    Curated soundscapes to enhance concentration
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                  <MessageSquare className="w-6 h-6 text-pink-500 mb-3" />
                  <h4 className="font-medium mb-2">Real-time Chat</h4>
                  <p className="text-sm text-muted-foreground">
                    Instant messaging without breaking your flow
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-linear-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
                  <Target className="w-6 h-6 text-cyan-500 mb-3" />
                  <h4 className="font-medium mb-2">Focus Sessions</h4>
                  <p className="text-sm text-muted-foreground">
                    Structured work intervals for maximum productivity
                  </p>
                </div>
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
