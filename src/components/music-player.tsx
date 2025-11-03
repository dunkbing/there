"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, Copy, Youtube } from "lucide-react";

interface MusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MusicPlayer({ isOpen, onClose }: MusicPlayerProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedUrl, setSavedUrl] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("youtubeUrl") || ""
      : ""
  );

  const handleSave = () => {
    if (youtubeUrl.trim()) {
      setSavedUrl(youtubeUrl);
      localStorage.setItem("youtubeUrl", youtubeUrl);
      setYoutubeUrl("");
    }
  };

  const handlePlay = () => setIsPlaying(!isPlaying);

  const extractVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = savedUrl ? extractVideoId(savedUrl) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-28">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Player Container */}
      <div className="relative z-50 w-[380px] rounded-3xl bg-gray-50 border border-foreground/10 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-lg text-foreground">
              Music Player
            </h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Input */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80">
              YouTube URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              />
              <Button
                onClick={handleSave}
                size="icon"
                className=" text-white rounded-lg transition-all"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Video Section */}
          {videoId ? (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=${
                    isPlaying ? 1 : 0
                  }`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setSavedUrl("");
                    localStorage.removeItem("youtubeUrl");
                  }}
                  variant="outline"
                  className=" w-1/3 rounded-lg hover:bg-muted"
                >
                  Clear
                </Button>
                <Button
                  onClick={handlePlay}
                  className="flex-1 rounded-lg  hover:opacity-90  font-medium gap-2 transition-all"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Play
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-white/50 text-sm">
              Paste a YouTube URL to start playing music 🎵
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
