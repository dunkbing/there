"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause } from "lucide-react";

interface MusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MusicPlayer({ isOpen, onClose }: MusicPlayerProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedUrl, setSavedUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("youtubeUrl") || "";
    }
    return "";
  });

  const handleSave = () => {
    if (youtubeUrl.trim()) {
      setSavedUrl(youtubeUrl);
      localStorage.setItem("youtubeUrl", youtubeUrl);
      setYoutubeUrl("");
    }
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const extractVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = savedUrl ? extractVideoId(savedUrl) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative m-6 w-80 backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Music Player</h3>
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
          {/* YouTube URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              YouTube URL
            </label>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-foreground placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
            >
              Save URL
            </Button>
          </div>

          {/* Video Preview */}
          {videoId && (
            <div className="space-y-3">
              <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
              </div>

              <Button
                onClick={handlePlay}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 transition-all duration-300"
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

              <Button
                onClick={() => {
                  setSavedUrl("");
                  localStorage.removeItem("youtubeUrl");
                }}
                variant="outline"
                className="w-full border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                Clear URL
              </Button>
            </div>
          )}

          {!videoId && (
            <div className="text-center py-8">
              <p className="text-sm text-white/60">
                Enter a YouTube URL to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
