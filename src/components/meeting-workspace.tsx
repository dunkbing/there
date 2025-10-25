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
}

export function MeetingWorkspace({
  members,
  currentUserId,
  currentUserName,
  roomId,
  onChatUpdate,
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
  const { messages, sendMessage, remoteStreams } = useWebRTC(
    roomId,
    currentUserId,
    currentUserName,
    members,
    localStream,
  );

  // Expose chat data to parent component
  useEffect(() => {
    if (onChatUpdate) {
      onChatUpdate(messages, sendMessage);
    }
  }, [messages, sendMessage, onChatUpdate]);

  // Reduced logging - only log significant changes
  useEffect(() => {
    console.log(
      `[MeetingWorkspace] Remote streams: ${remoteStreams.size}, Members: ${members.length}`,
    );
  }, [remoteStreams.size, members.length]);

  useEffect(() => {
    // Update video element when stream changes
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote streams to video elements and listen for track changes
  useEffect(() => {
    const trackListeners = new Map<MediaStreamTrack, () => void>();

    remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      if (videoElement) {
        // Always update srcObject to ensure fresh stream reference
        if (videoElement.srcObject !== stream) {
          console.log(
            "Attaching remote stream for peer",
            peerId,
            "with",
            stream.getTracks().length,
            "tracks",
          );
          videoElement.srcObject = stream;

          // Force play in case it was paused
          videoElement.play().catch((e) => {
            console.log("Video play failed (may be muted):", e);
          });
        }

        // Check if stream has active video tracks
        const hasActiveVideo = stream
          .getVideoTracks()
          .some((t) => t.readyState === "live");
        console.log(`Peer ${peerId} has active video:`, hasActiveVideo);
      }

      // Listen for track changes to force re-render
      const onTrackChange = () => {
        console.log(`Track state changed for peer ${peerId}`);
      };

      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", onTrackChange);
        track.addEventListener("mute", onTrackChange);
        track.addEventListener("unmute", onTrackChange);
        trackListeners.set(track, onTrackChange);
      });

      // Listen for track add/remove on stream
      stream.addEventListener("addtrack", onTrackChange);
      stream.addEventListener("removetrack", onTrackChange);
    });

    // Remove streams for peers that are no longer in remoteStreams
    remoteVideoRefs.current.forEach((videoElement, peerId) => {
      if (videoElement && !remoteStreams.has(peerId)) {
        console.log("Removing stream for peer", peerId);
        videoElement.srcObject = null;
      }
    });

    // Cleanup listeners
    return () => {
      trackListeners.forEach((listener, track) => {
        track.removeEventListener("ended", listener);
        track.removeEventListener("mute", listener);
        track.removeEventListener("unmute", listener);
      });
    };
  }, [remoteStreams]);

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
        console.log("[toggleVideo] Turning OFF camera");
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          console.log(
            `[toggleVideo] Stopping ${videoTracks.length} video tracks`,
          );
          videoTracks.forEach((track) => {
            track.stop();
            localStream.removeTrack(track);
          });
          const newStream = new MediaStream(localStream.getTracks());
          console.log(
            `[toggleVideo] New stream has ${newStream.getTracks().length} tracks`,
          );
          setLocalStream(newStream);
        }
        setIsVideoOn(false);
      } else {
        // Turn on camera
        console.log("[toggleVideo] Turning ON camera");
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        console.log(
          `[toggleVideo] Got video track: ${videoTrack.id}, state: ${videoTrack.readyState}`,
        );

        if (localStream) {
          // Add to existing stream
          localStream.addTrack(videoTrack);
          // Trigger re-render by creating new stream reference
          const newStream = new MediaStream(localStream.getTracks());
          console.log(
            `[toggleVideo] Added video to existing stream, now has ${newStream.getTracks().length} tracks:`,
            newStream.getTracks().map((t) => `${t.kind}:${t.id}`),
          );
          setLocalStream(newStream);
        } else {
          // Create new stream
          const newStream = new MediaStream([videoTrack]);
          console.log(
            `[toggleVideo] Created new stream with ${newStream.getTracks().length} tracks`,
          );
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

                  // Log only when stream lookup fails
                  if (
                    !isCurrentUser &&
                    !remoteStream &&
                    remoteStreams.size > 0
                  ) {
                    console.warn(
                      `[MeetingWorkspace] Missing stream for peer ${peerId}, available: [${Array.from(remoteStreams.keys())}]`,
                    );
                  }

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
