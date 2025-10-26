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
  const [trackStateCounter, setTrackStateCounter] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(
    new Map(),
  );

  // Initialize WebRTC for chat and video
  const { messages, sendMessage, remoteStreams, streamUpdateCounter } =
    useWebRTC(roomId, currentUserId, currentUserName, localStream, onUserLeft);

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
    console.log(
      `[Component] Updating remote streams, count: ${remoteStreams.size}, update: ${streamUpdateCounter}`,
    );
    console.log(`[Component] Remote stream peer IDs:`, Array.from(remoteStreams.keys()));

    // Listen to track events to trigger re-renders when tracks change state
    const trackEventHandlers = new Map<MediaStreamTrack, () => void>();

    remoteStreams.forEach((stream, peerId) => {
      // Add listeners to all tracks
      stream.getTracks().forEach((track) => {
        const handler = () => {
          console.log(`[Component] Track state changed for ${peerId}:`, {
            kind: track.kind,
            readyState: track.readyState,
            enabled: track.enabled,
          });
          // Force re-render by updating counter
          setTrackStateCounter(c => c + 1);
        };

        track.addEventListener('ended', handler);
        track.addEventListener('mute', handler);
        track.addEventListener('unmute', handler);
        trackEventHandlers.set(track, handler);
      });
    });

    // Cleanup function to remove listeners
    const cleanup = () => {
      trackEventHandlers.forEach((handler, track) => {
        track.removeEventListener('ended', handler);
        track.removeEventListener('mute', handler);
        track.removeEventListener('unmute', handler);
      });
      trackEventHandlers.clear();
    };

    remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      const tracks = stream.getTracks();
      const videoTrack = stream.getVideoTracks()[0];
      console.log(`[Component] Remote stream for ${peerId}:`, {
        hasTracks: tracks.length > 0,
        tracks: tracks.map((t) => `${t.kind}(${t.readyState})`),
        hasVideoElement: !!videoElement,
        currentSrcObject: videoElement?.srcObject === stream ? 'same' : 'different',
        videoElementReadyState: videoElement?.readyState,
        videoElementPaused: videoElement?.paused,
        videoTrackSettings: videoTrack?.getSettings(),
        streamActive: stream.active,
        streamId: stream.id,
      });

      if (videoElement) {
        // Add error event listeners
        videoElement.onerror = (e) => {
          console.error(`[Component] Video element error for ${peerId}:`, e, {
            error: videoElement.error,
            networkState: videoElement.networkState,
            readyState: videoElement.readyState,
          });
        };

        videoElement.onstalled = () => {
          console.warn(`[Component] Video stalled for ${peerId}`);
        };

        videoElement.onsuspend = () => {
          console.warn(`[Component] Video suspended for ${peerId}`);
        };

        // Check if stream is inactive (all tracks ended)
        const hasLiveTracks = stream.getVideoTracks().some(t => t.readyState === 'live');

        if (!stream.active || !hasLiveTracks) {
          // Stream has no active tracks - clear the video element
          if (videoElement.srcObject) {
            console.log(`[Component] Clearing srcObject for ${peerId} (stream inactive)`);
            videoElement.srcObject = null;
          }
        } else if (videoElement.srcObject !== stream) {
          // Always set srcObject to ensure it's up to date
          console.log(`[Component] Setting srcObject for ${peerId}`, {
            streamId: stream.id,
            streamActive: stream.active,
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              id: t.id,
              readyState: t.readyState,
              enabled: t.enabled,
              muted: t.muted,
            }))
          });
          videoElement.srcObject = stream;

          // Wait for metadata to load, then play
          const onLoadedMetadata = () => {
            console.log(`[Component] Metadata loaded for ${peerId}, playing video`);
            videoElement.play().then(() => {
              console.log(`[Component] ✅ Video playing for ${peerId}`, {
                readyState: videoElement.readyState,
                paused: videoElement.paused,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
              });
            }).catch((e) => {
              console.error(`[Component] Failed to play video for ${peerId}:`, e);
            });
          };

          videoElement.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });

          // Also try to play immediately in case metadata is already loaded
          if (videoElement.readyState >= 1) {
            console.log(`[Component] Metadata already loaded for ${peerId}, playing immediately`);
            videoElement.play().then(() => {
              console.log(`[Component] ✅ Video playing for ${peerId} (immediate)`, {
                readyState: videoElement.readyState,
                paused: videoElement.paused,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
              });
            }).catch((e) => {
              console.error(`[Component] Failed to play video for ${peerId}:`, e);
            });
          }
        } else {
          // Even if srcObject is the same, ensure video is playing
          if (videoElement.paused) {
            console.log(`[Component] Video paused, attempting to play for ${peerId}`);
            videoElement.play().then(() => {
              console.log(`[Component] ✅ Resumed video for ${peerId}`, {
                readyState: videoElement.readyState,
                paused: videoElement.paused,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
              });
            }).catch((e) => {
              console.error(`[Component] Failed to play video for ${peerId}:`, e);
            });
          }
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

    return cleanup;
  }, [remoteStreams, streamUpdateCounter, trackStateCounter]);

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
          // If no tracks remain, set to null; otherwise create new stream
          const remainingTracks = localStream.getTracks();
          setLocalStream(remainingTracks.length > 0 ? new MediaStream(remainingTracks) : null);
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
            // Add to existing stream
            const newStream = new MediaStream([...localStream.getTracks(), audioTrack]);
            setLocalStream(newStream);
          } else {
            // Create new stream
            const newStream = new MediaStream([audioTrack]);
            setLocalStream(newStream);
          }
          setIsMicOn(true);
        }
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
          // If no tracks remain, set to null; otherwise create new stream
          const remainingTracks = localStream.getTracks();
          setLocalStream(remainingTracks.length > 0 ? new MediaStream(remainingTracks) : null);
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
            // Add to existing stream
            const newStream = new MediaStream([...localStream.getTracks(), videoTrack]);
            setLocalStream(newStream);
          } else {
            // Create new stream
            const newStream = new MediaStream([videoTrack]);
            setLocalStream(newStream);
          }
          setIsVideoOn(true);
        }
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
                  // For peer identification: use user.id for authenticated users, guestId for guests
                  const peerId = member.user?.id || member.guestId || member.userId || member.id;

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
                        // Check if stream has any video tracks that are live and enabled
                        const hasLiveTrack = videoTracks.some((t) => t.readyState === "live" && t.enabled);
                        // Also check if stream is active (has at least one track that's not ended)
                        const isStreamActive = remoteStream.active;
                        return hasLiveTrack && isStreamActive && videoTracks.length > 0;
                      })()
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
