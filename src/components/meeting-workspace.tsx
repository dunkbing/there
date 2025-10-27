"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard";
import type { RoomMemberWithRelations } from "@/lib/schemas";
import { useWebRTC } from "@/hooks/useWebRTC";

interface MeetingWorkspaceProps {
  members: RoomMemberWithRelations[];
  currentUserId: string;
  currentUserName: string;
  roomId: string;
  onChatUpdate?: (messages: any[], sendMessage: (text: string) => void) => void;
  onUserLeft?: (userId: string) => void;
  onUserJoined?: (userId: string) => void;
  onControlsReady?: (controls: {
    isMicOn: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    mainContent: MainContentType;
    toggleMic: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => void;
    toggleWhiteboard: () => void;
  }) => void;
}

type MainContentType = "default" | "screen-share" | "whiteboard";

export function MeetingWorkspace({
  members,
  currentUserId,
  currentUserName,
  roomId,
  onChatUpdate,
  onUserLeft,
  onUserJoined,
  onControlsReady,
}: MeetingWorkspaceProps) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mainContent, setMainContent] = useState<MainContentType>("default");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [trackStateCounter, setTrackStateCounter] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(
    new Map(),
  );

  // Initialize WebRTC for chat, video, and screen sharing
  const {
    messages,
    sendMessage,
    remoteStreams,
    remoteScreenStreams,
    streamUpdateCounter,
  } = useWebRTC(
    roomId,
    currentUserId,
    currentUserName,
    localStream,
    screenStream,
    onUserLeft,
    onUserJoined,
  );

  // Expose chat data to parent component
  useEffect(() => {
    if (onChatUpdate) {
      onChatUpdate(messages, sendMessage);
    }
  }, [messages, sendMessage, onChatUpdate]);

  // Update local video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update screen share video element
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Auto-switch to screen share when someone (including self) starts sharing
  useEffect(() => {
    if (isScreenSharing || remoteScreenStreams.size > 0) {
      setMainContent("screen-share");
    } else if (mainContent === "screen-share") {
      // Switch back to default when screen sharing stops
      setMainContent("default");
    }
  }, [isScreenSharing, remoteScreenStreams.size]);

  // Attach remote streams to video elements
  useEffect(() => {
    console.log(
      `[Component] Updating remote streams, count: ${remoteStreams.size}, update: ${streamUpdateCounter}`,
    );

    // Listen to track events to trigger re-renders when tracks change state
    const trackEventHandlers = new Map<MediaStreamTrack, () => void>();

    remoteStreams.forEach((stream, peerId) => {
      // Add listeners to all tracks
      stream.getTracks().forEach((track) => {
        const handler = () => {
          setTrackStateCounter((c) => c + 1);
        };

        track.addEventListener("ended", handler);
        track.addEventListener("mute", handler);
        track.addEventListener("unmute", handler);
        trackEventHandlers.set(track, handler);
      });
    });

    // Cleanup function to remove listeners
    const cleanup = () => {
      trackEventHandlers.forEach((handler, track) => {
        track.removeEventListener("ended", handler);
        track.removeEventListener("mute", handler);
        track.removeEventListener("unmute", handler);
      });
      trackEventHandlers.clear();
    };

    remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      if (videoElement && stream.active) {
        if (videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          videoElement.play().catch((e) => {
            console.error(`Failed to play video for ${peerId}:`, e);
          });
        }
      }
    });

    // Remove streams for peers that are no longer in remoteStreams
    remoteVideoRefs.current.forEach((videoElement, peerId) => {
      if (videoElement && !remoteStreams.has(peerId)) {
        videoElement.srcObject = null;
      }
    });

    return cleanup;
  }, [remoteStreams, streamUpdateCounter, trackStateCounter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream, screenStream]);

  const toggleMic = useCallback(async () => {
    try {
      if (isMicOn) {
        // Turn off microphone
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach((track) => {
            track.stop();
            localStream.removeTrack(track);
          });
          const remainingTracks = localStream.getTracks();
          setLocalStream(
            remainingTracks.length > 0
              ? new MediaStream(remainingTracks)
              : null,
          );
        }
        setIsMicOn(false);
      } else {
        // Turn on microphone
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (audioTrack) {
          if (localStream) {
            const newStream = new MediaStream([
              ...localStream.getTracks(),
              audioTrack,
            ]);
            setLocalStream(newStream);
          } else {
            setLocalStream(new MediaStream([audioTrack]));
          }
          setIsMicOn(true);
        }
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  }, [isMicOn, localStream]);

  const toggleVideo = useCallback(async () => {
    try {
      if (isVideoOn) {
        // Turn off camera
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach((track) => {
            track.stop();
            localStream.removeTrack(track);
          });
          const remainingTracks = localStream.getTracks();
          setLocalStream(
            remainingTracks.length > 0
              ? new MediaStream(remainingTracks)
              : null,
          );
        }
        setIsVideoOn(false);
      } else {
        // Turn on camera
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (videoTrack) {
          if (localStream) {
            const newStream = new MediaStream([
              ...localStream.getTracks(),
              videoTrack,
            ]);
            setLocalStream(newStream);
          } else {
            setLocalStream(new MediaStream([videoTrack]));
          }
          setIsVideoOn(true);
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  }, [isVideoOn, localStream]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach((track) => track.stop());
          setScreenStream(null);
        }
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        // Listen for the browser's "Stop sharing" button
        const screenTrack = displayStream.getVideoTracks()[0];
        const handleEnded = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
        screenTrack.addEventListener("ended", handleEnded);

        setScreenStream(displayStream);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("Error accessing screen:", error);
      if (error instanceof Error && error.name !== "NotAllowedError") {
        alert("Unable to share screen. Please check permissions.");
      }
    }
  }, [isScreenSharing, screenStream]);

  const toggleWhiteboard = useCallback(() => {
    if (mainContent === "whiteboard") {
      setMainContent("default");
    } else {
      setMainContent("whiteboard");
    }
  }, [mainContent]);

  // Expose controls to parent component
  useEffect(() => {
    if (onControlsReady) {
      onControlsReady({
        isMicOn,
        isVideoOn,
        isScreenSharing,
        mainContent,
        toggleMic,
        toggleVideo,
        toggleScreenShare,
        toggleWhiteboard,
      });
    }
  }, [
    isMicOn,
    isVideoOn,
    isScreenSharing,
    mainContent,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    toggleWhiteboard,
    onControlsReady,
  ]);

  // Get the peer who is sharing screen (for main content display)
  const screenSharingPeerId = useMemo(
    () =>
      remoteScreenStreams.size > 0
        ? Array.from(remoteScreenStreams.keys())[0]
        : null,
    [remoteScreenStreams],
  );

  const screenSharingMember = useMemo(
    () =>
      screenSharingPeerId
        ? members.find((m) => {
            const peerId = m.user?.id || m.guestId || m.userId || m.id;
            return peerId === screenSharingPeerId;
          })
        : null,
    [screenSharingPeerId, members],
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Left Column - Video Grid */}
      <div className="w-80 shrink-0">
        <Card className="bg-card/50 backdrop-blur-sm border-border p-4 h-full">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Participants ({members.length})
          </h3>
          <div className="space-y-3">
            {members.map((member) => {
              const peerId =
                member.user?.id || member.guestId || member.userId || member.id;
              const isCurrentUser = peerId === currentUserId;
              const memberName =
                member.user?.name || member.guestName || "Guest";
              const initials = (
                member.user?.name?.[0] ||
                member.guestName?.[0] ||
                "?"
              ).toUpperCase();

              // Check if remote peer has active video track
              const remoteStream = !isCurrentUser
                ? remoteStreams.get(peerId)
                : null;

              const hasRemoteVideo = remoteStream
                ? (() => {
                    const videoTracks = remoteStream.getVideoTracks();
                    const hasLiveTrack = videoTracks.some(
                      (t) => t.readyState === "live" && t.enabled && !t.muted,
                    );
                    const isStreamActive = remoteStream.active;
                    return (
                      hasLiveTrack && isStreamActive && videoTracks.length > 0
                    );
                  })()
                : false;

              const hasVideo = isCurrentUser ? isVideoOn : hasRemoteVideo;

              return (
                <div
                  key={member.id}
                  className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center"
                >
                  {hasVideo ? (
                    <video
                      ref={(el) => {
                        if (isCurrentUser) {
                          videoRef.current = el;
                        } else {
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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-lg font-semibold">
                        {initials}
                      </div>
                    </div>
                  )}

                  {/* Name tag */}
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <p className="text-white text-xs font-medium">
                      {memberName} {isCurrentUser && "(You)"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Center - Main Content Area */}
      <div className="flex-1">
        <Card className="bg-card/50 backdrop-blur-sm border-border h-full flex items-center justify-center relative overflow-hidden">
          {/* Default - Current User Avatar */}
          {mainContent === "default" && (
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-5xl font-semibold">
                {currentUserName[0]?.toUpperCase() || "?"}
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-semibold">{currentUserName}</h2>
                <p className="text-muted-foreground mt-2">
                  {isVideoOn || isMicOn || isScreenSharing
                    ? "Connected"
                    : "Enable camera or microphone to join"}
                </p>
              </div>
            </div>
          )}

          {/* Screen Share Display */}
          {mainContent === "screen-share" && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              {isScreenSharing && screenStream ? (
                // Show own screen share
                <div className="relative w-full h-full">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                    <p className="text-white font-medium">
                      You are sharing your screen
                    </p>
                  </div>
                </div>
              ) : screenSharingPeerId &&
                remoteScreenStreams.has(screenSharingPeerId) ? (
                // Show remote screen share
                <div className="relative w-full h-full">
                  <video
                    ref={(el) => {
                      if (el && remoteScreenStreams.has(screenSharingPeerId)) {
                        const stream =
                          remoteScreenStreams.get(screenSharingPeerId);
                        if (stream) {
                          el.srcObject = stream;
                          el.play().catch(console.error);
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                    <p className="text-white font-medium">
                      {screenSharingMember?.user?.name ||
                        screenSharingMember?.guestName ||
                        "Someone"}{" "}
                      is sharing their screen
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Whiteboard */}
          {mainContent === "whiteboard" && (
            <div className="w-full h-full">
              <Whiteboard />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
