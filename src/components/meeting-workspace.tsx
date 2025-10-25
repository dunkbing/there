"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard";
import { Video, Mic, MicOff, VideoOff, Pencil } from "lucide-react";
import type { RoomMemberWithRelations } from "@/lib/schemas";

interface MeetingWorkspaceProps {
  members: RoomMemberWithRelations[];
  currentUserId: string;
  localStream: MediaStream | null;
  onStreamChange: (stream: MediaStream | null) => void;
  remoteStreams: Map<string, MediaStream>;
}

export function MeetingWorkspace({
  members,
  currentUserId,
  localStream,
  onStreamChange,
  remoteStreams,
}: MeetingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(
    new Map(),
  );

  useEffect(() => {
    // Update video element when stream changes
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      if (videoElement && videoElement.srcObject !== stream) {
        console.log("Attaching remote stream for peer", peerId);
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount, not when stream changes

  const toggleMic = async () => {
    try {
      if (isMicOn) {
        // Turn off microphone - stop and remove audio tracks
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach((track) => {
            track.stop();
            localStream.removeTrack(track);
          });
          onStreamChange(new MediaStream(localStream.getTracks()));
        }
        setIsMicOn(false);
      } else {
        // Turn on microphone
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (localStream) {
          // Add to existing stream
          localStream.addTrack(audioTrack);
          onStreamChange(new MediaStream(localStream.getTracks()));
        } else {
          // Create new stream
          const newStream = new MediaStream([audioTrack]);
          onStreamChange(newStream);
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
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach((track) => {
            track.stop();
            localStream.removeTrack(track);
          });
          onStreamChange(new MediaStream(localStream.getTracks()));
        }
        setIsVideoOn(false);
      } else {
        // Turn on camera
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (localStream) {
          // Add to existing stream
          localStream.addTrack(videoTrack);
          // Trigger re-render by creating new stream reference
          onStreamChange(new MediaStream(localStream.getTracks()));
        } else {
          // Create new stream
          const newStream = new MediaStream([videoTrack]);
          onStreamChange(newStream);
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

                  // Get peer ID for remote streams (use userId if available, otherwise member id)
                  const peerId = member.user?.id || member.id;
                  const hasRemoteStream =
                    !isCurrentUser && remoteStreams.has(peerId);
                  const hasVideo = isCurrentUser ? isVideoOn : hasRemoteStream;

                  return (
                    <div
                      key={member.id}
                      className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
                    >
                      {hasVideo ? (
                        // Show video for current user or remote peer
                        <video
                          ref={(el) => {
                            if (isCurrentUser) {
                              // @ts-ignore
                              videoRef.current = el;
                            } else {
                              // Store remote video refs
                              if (el) {
                                remoteVideoRefs.current.set(peerId, el);
                              } else {
                                remoteVideoRefs.current.delete(peerId);
                              }
                            }
                          }}
                          autoPlay
                          playsInline
                          muted={isCurrentUser}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // Show name label for users with camera off
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
                      {hasVideo && (
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
