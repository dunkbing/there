"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard";
import { Video, Mic, MicOff, VideoOff, Pencil } from "lucide-react";
import type { RoomMemberWithRelations } from "@/lib/schemas";
import { useWebRTC } from "@/hooks/useWebRTC";

interface MeetingWorkspaceProps {
  members: RoomMemberWithRelations[];
  currentUserId: string;
  currentUserName: string;
  roomId: string;
  onChatUpdate?: (messages: any[], sendMessage: (text: string) => void) => void;
  onUserLeft?: (userId: string) => void;
}

export function MeetingWorkspace({
  members,
  currentUserId,
  currentUserName,
  roomId,
  onChatUpdate,
  onUserLeft,
}: MeetingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(
    new Map(),
  );

  // Initialize WebRTC for chat and video
  const { messages, sendMessage, remoteStreams, streamUpdateCounter } = useWebRTC(
    roomId,
    currentUserId,
    currentUserName,
    members,
    localStream,
    onUserLeft,
  );

  // Expose chat data to parent component
  useEffect(() => {
    if (onChatUpdate) {
      onChatUpdate(messages, sendMessage);
    }
  }, [messages, sendMessage, onChatUpdate]);


  useEffect(() => {
    // Update video element when stream changes
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote streams to video elements
  useEffect(() => {
    console.log(`[Component] Updating remote streams, count: ${remoteStreams.size}, update: ${streamUpdateCounter}`);

    remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      const tracks = stream.getTracks();
      console.log(`[Component] Remote stream for ${peerId}:`, {
        hasTracks: tracks.length > 0,
        tracks: tracks.map(t => `${t.kind}(${t.readyState})`),
        hasVideoElement: !!videoElement,
        currentSrcObject: videoElement?.srcObject === stream ? 'same' : 'different',
      });

      if (videoElement) {
        // Always set srcObject to ensure it's up to date
        if (videoElement.srcObject !== stream) {
          console.log(`[Component] Setting srcObject for ${peerId}`);
          videoElement.srcObject = stream;
        }

        // Ensure video is playing
        if (videoElement.paused) {
          videoElement.play().catch((e) => {
            console.error(`[Component] Failed to play video for ${peerId}:`, e);
          });
        }
      }
    });

    // Remove streams for peers that are no longer in remoteStreams
    remoteVideoRefs.current.forEach((videoElement, peerId) => {
      if (videoElement && !remoteStreams.has(peerId)) {
        console.log(`[Component] Removing stream for ${peerId}`);
        videoElement.srcObject = null;
      }
    });
  }, [remoteStreams, streamUpdateCounter]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

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
          setLocalStream(new MediaStream(localStream.getTracks()));
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
          setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
          // Create new stream
          const newStream = new MediaStream([audioTrack]);
          setLocalStream(newStream);
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
          const newStream = new MediaStream(localStream.getTracks());
          setLocalStream(newStream);
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
          const newStream = new MediaStream(localStream.getTracks());
          setLocalStream(newStream);
        } else {
          // Create new stream
          const newStream = new MediaStream([videoTrack]);
          setLocalStream(newStream);
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
                    member.userId === currentUserId ||
                    member.id === currentUserId;
                  const memberName =
                    member.user?.name || member.guestName || "Guest";
                  const initials = (
                    member.user?.name?.[0] ||
                    member.guestName?.[0] ||
                    "?"
                  ).toUpperCase();

                  const peerId = member.user?.id || member.userId || member.id;

                  // Check if remote peer has active video track
                  const remoteStream = !isCurrentUser
                    ? remoteStreams.get(peerId)
                    : null;

                  const hasRemoteVideo = remoteStream
                    ? remoteStream
                        .getVideoTracks()
                        .some((t) => t.readyState === "live")
                    : false;

                  const hasVideo = isCurrentUser ? isVideoOn : hasRemoteVideo;

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
                          muted
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
