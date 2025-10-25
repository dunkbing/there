"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard";
import { Video, Mic, MicOff, VideoOff, Pencil } from "lucide-react";
import type { RoomMemberWithRelations } from "@/lib/schemas";

interface MeetingWorkspaceProps {
  roomId: string;
  members: RoomMemberWithRelations[];
  currentUserId: string;
}

export function MeetingWorkspace({
  members,
  currentUserId,
}: MeetingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Update video element when stream changes
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount, not when stream changes

  const toggleMic = async () => {
    try {
      if (isMicOn) {
        // Turn off microphone - stop and remove audio tracks
        if (stream) {
          const audioTracks = stream.getAudioTracks();
          audioTracks.forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });
        }
        setIsMicOn(false);
      } else {
        // Turn on microphone
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (stream) {
          // Add to existing stream
          stream.addTrack(audioTrack);
        } else {
          // Create new stream
          const newStream = new MediaStream([audioTrack]);
          setStream(newStream);
        }
        setIsMicOn(true);
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  const toggleVideo = async () => {
    try {
      if (isVideoOn) {
        // Turn off camera - stop and remove video tracks
        if (stream) {
          const videoTracks = stream.getVideoTracks();
          videoTracks.forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });
        }
        setIsVideoOn(false);
      } else {
        // Turn on camera
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (stream) {
          // Add to existing stream
          stream.addTrack(videoTrack);
          // Trigger re-render by creating new stream reference
          setStream(new MediaStream(stream.getTracks()));
        } else {
          // Create new stream
          const newStream = new MediaStream([videoTrack]);
          setStream(newStream);
        }
        setIsVideoOn(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("video")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "video"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video className="w-4 h-4 inline mr-2" />
          Video
        </button>
        <button
          onClick={() => setActiveTab("whiteboard")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "whiteboard"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="w-4 h-4 inline mr-2" />
          Whiteboard
        </button>
      </div>

      {/* Video Tab */}
      {activeTab === "video" && (
        <div className="space-y-4">
          <Card className="bg-card border-border p-6">
            {/* Video Grid */}
            <div className="bg-black rounded-lg overflow-hidden mb-4 aspect-video p-4">
              <div
                className={`grid gap-4 h-full ${
                  members.length === 1
                    ? "grid-cols-1"
                    : members.length === 2
                      ? "grid-cols-2"
                      : members.length <= 4
                        ? "grid-cols-2 grid-rows-2"
                        : members.length <= 6
                          ? "grid-cols-3 grid-rows-2"
                          : "grid-cols-3 grid-rows-3"
                }`}
              >
                {members.map((member) => {
                  const isCurrentUser =
                    member.user?.id === currentUserId ||
                    member.id === currentUserId;
                  const memberName =
                    member.user?.name || member.guestName || "Guest";
                  const initials = (
                    member.user?.name?.[0] ||
                    member.guestName?.[0] ||
                    "?"
                  ).toUpperCase();

                  return (
                    <div
                      key={member.id}
                      className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
                    >
                      {isCurrentUser && isVideoOn ? (
                        // Show video for current user if camera is on
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // Show name label for users with camera off or other members
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-2xl font-semibold">
                            {initials}
                          </div>
                          <p className="text-white font-medium">{memberName}</p>
                          {isCurrentUser && (
                            <p className="text-xs text-gray-400">(You)</p>
                          )}
                        </div>
                      )}

                      {/* Name tag at bottom */}
                      {isCurrentUser && isVideoOn && (
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                          <p className="text-white text-sm font-medium">
                            {memberName} {isCurrentUser && "(You)"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={toggleMic}
                variant="outline"
                className={`gap-2 ${!isMicOn ? "bg-destructive/10 text-destructive border-destructive" : ""}`}
              >
                {isMicOn ? (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Microphone</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Microphone</span>
                  </>
                )}
              </Button>
              <Button
                onClick={toggleVideo}
                variant="outline"
                className={`gap-2 ${!isVideoOn ? "bg-destructive/10 text-destructive border-destructive" : ""}`}
              >
                {isVideoOn ? (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Camera</span>
                  </>
                ) : (
                  <>
                    <VideoOff className="w-4 h-4" />
                    <span>Camera</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Whiteboard Tab */}
      {activeTab === "whiteboard" && (
        <div className="space-y-4">
          <Whiteboard />
        </div>
      )}
    </div>
  );
}
