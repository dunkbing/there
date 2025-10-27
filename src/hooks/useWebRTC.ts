import { useEffect, useRef, useState, useCallback } from "react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface Member {
  id: string;
  userId?: string | null;
  user?: {
    id: string;
    name?: string | null;
  };
  guestName?: string | null;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(
  roomId: string,
  userId: string,
  userName: string,
  localStream: MediaStream | null = null,
  screenStream: MediaStream | null = null,
  onUserLeft?: (userId: string) => void,
  onUserJoined?: (userId: string) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<
    Map<string, MediaStream>
  >(new Map());
  const [streamUpdateCounter, setStreamUpdateCounter] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);
  const peersSharingScreenRef = useRef<Set<string>>(new Set());

  // Track intervals and event listeners for cleanup
  const statsIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const trackCleanupRef = useRef<Map<string, () => void>>(new Map());

  // Update local stream ref
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Update screen stream ref
  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // Cleanup function for a specific peer
  const cleanupPeer = useCallback((peerId: string) => {
    // Clear stats interval
    const interval = statsIntervalsRef.current.get(peerId);
    if (interval) {
      clearInterval(interval);
      statsIntervalsRef.current.delete(peerId);
    }

    // Remove track event listeners
    const cleanup = trackCleanupRef.current.get(peerId);
    if (cleanup) {
      cleanup();
      trackCleanupRef.current.delete(peerId);
    }

    // Close peer connection
    const pc = peersRef.current[peerId];
    if (pc) {
      pc.close();
      delete peersRef.current[peerId];
    }

    // Remove data channel
    dataChannelsRef.current.delete(peerId);

    // Remove from screen sharing set
    peersSharingScreenRef.current.delete(peerId);

    // Remove streams
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
    setRemoteScreenStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        sender: userName,
        text,
        timestamp: new Date(),
      };

      // Add to local messages
      setMessages((prev) => [...prev, message]);

      // Send to all peers
      const messageStr = JSON.stringify(message);
      dataChannelsRef.current.forEach((channel, peerId) => {
        if (channel.readyState === "open") {
          try {
            channel.send(messageStr);
          } catch (error) {
            console.error(`Failed to send message to peer ${peerId}:`, error);
          }
        }
      });
    },
    [userName],
  );

  // Setup WebSocket and WebRTC
  useEffect(() => {
    if (!userId) return;
    if (wsRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//localhost:8080/api/signal/ws?clientId=${userId}&room=${roomId}`;
    console.log(`[WS] Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WS] Connected successfully");
      const joinMsg = { type: "join", clientId: userId };
      console.log("[WS] Sending join:", joinMsg);
      ws.send(JSON.stringify(joinMsg));
      wsRef.current = ws;
    };

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      const { type, clientId: peerId } = data;

      console.log(`[WS] Received ${type} from ${peerId}`);

      // Get or create peer connection
      let pc = peersRef.current[peerId];
      if (!pc && type !== "disconnect") {
        console.log(
          `[WebRTC] Creating peer connection for ${peerId} with ICE servers:`,
          ICE_SERVERS,
        );
        pc = new RTCPeerConnection(ICE_SERVERS);
        console.log(
          `[WebRTC] Peer connection created, initial ICE gathering state: ${pc.iceGatheringState}, connection state: ${pc.connectionState}`,
        );

        // Add local stream tracks (if available)
        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks();
          console.log(
            `[WebRTC] Adding ${tracks.length} local tracks for ${peerId}:`,
            tracks.map((t) => t.kind),
          );
          for (const track of tracks) {
            pc.addTrack(track, localStreamRef.current);
          }
        } else {
          console.log(
            `[WebRTC] No local stream available when creating peer for ${peerId}`,
          );
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
          const trackId = `${peerId}-${event.track.id}`;

          // Store cleanup functions for this track
          const trackEventHandlers: Array<() => void> = [];
          console.log(
            `[WebRTC] 🎥 Received ${event.track.kind} track from ${peerId}`,
            {
              trackId: event.track.id,
              trackState: event.track.readyState,
              trackEnabled: event.track.enabled,
              trackMuted: event.track.muted,
              streamCount: event.streams?.length || 0,
              transceiverDirection: event.transceiver?.direction,
              transceiverCurrentDirection: event.transceiver?.currentDirection,
              receiverTrackId: event.receiver?.track?.id,
            },
          );

          // Listen for unmute event to detect when track starts producing media
          const handleUnmute = () => {
            console.log(`[WebRTC] ✅ Track unmuted for ${peerId}:`, {
              kind: event.track.kind,
              trackId: event.track.id,
              readyState: event.track.readyState,
              enabled: event.track.enabled,
            });

            // Check if this peer is sharing screen
            const isScreenShare = peersSharingScreenRef.current.has(peerId);
            const targetStreamsState = isScreenShare
              ? setRemoteScreenStreams
              : setRemoteStreams;
            const streamType = isScreenShare ? "screen share" : "camera";

            // Add stream now that track is unmuted
            targetStreamsState((prev) => {
              const newMap = new Map(prev);
              let stream = newMap.get(peerId);

              // If peer sent us a stream, use it
              if (event.streams && event.streams[0]) {
                const peerStream = event.streams[0];
                console.log(
                  `[WebRTC] Adding ${streamType} stream for ${peerId} after unmute with ${peerStream.getTracks().length} tracks:`,
                  peerStream
                    .getTracks()
                    .map((t) => `${t.kind}(${t.readyState})`),
                );
                newMap.set(peerId, peerStream);
              } else {
                // Fallback: create our own stream and add the track
                if (!stream) {
                  stream = new MediaStream();
                  console.log(
                    `[WebRTC] Creating new remote ${streamType} stream for ${peerId} after unmute`,
                  );
                }

                if (!stream.getTrackById(event.track.id)) {
                  stream.addTrack(event.track);
                  console.log(
                    `[WebRTC] ✅ Added ${event.track.kind} track to remote ${streamType} stream for ${peerId}`,
                  );
                }

                newMap.set(peerId, stream);
              }

              return newMap;
            });

            // Start stats monitoring now that track is unmuted
            if (event.track.kind === "video" && !statsIntervalsRef.current.has(trackId)) {
              console.log(
                `[WebRTC] Starting stats monitoring for ${peerId} after unmute`,
              );
              const interval = setInterval(async () => {
                if (event.track.readyState === "ended") {
                  clearInterval(interval);
                  statsIntervalsRef.current.delete(trackId);
                  return;
                }

                // If track becomes muted again, stop monitoring
                if (event.track.muted) {
                  console.log(
                    `[WebRTC] Track is now muted for ${peerId}, stopping stats monitoring`,
                  );
                  clearInterval(interval);
                  statsIntervalsRef.current.delete(trackId);
                  return;
                }

                const stats = await pc.getStats();
                let foundInboundRtp = false;
                let currentFramesReceived = 0;

                stats.forEach((report) => {
                  if (
                    report.type === "inbound-rtp" &&
                    report.kind === "video"
                  ) {
                    foundInboundRtp = true;
                    currentFramesReceived = report.framesReceived || 0;

                    console.log(`[WebRTC] Video stats for ${peerId}:`, {
                      bytesReceived: report.bytesReceived,
                      framesReceived: report.framesReceived,
                      framesDecoded: report.framesDecoded,
                      framesDropped: report.framesDropped,
                      trackMuted: event.track.muted,
                      trackEnabled: event.track.enabled,
                      trackReadyState: event.track.readyState,
                    });

                    // Check if frames have stopped being received
                    if (
                      currentFramesReceived === lastFramesReceived &&
                      currentFramesReceived > 0
                    ) {
                      noDataCounter++;
                      console.warn(
                        `[WebRTC] No new frames for ${peerId} (${noDataCounter * 2}s)`,
                      );

                      if (noDataCounter >= 2) {
                        console.log(
                          `[WebRTC] Stream appears dead for ${peerId}, removing...`,
                        );
                        clearInterval(interval);
                        statsIntervalsRef.current.delete(trackId);

                        setRemoteStreams((prev) => {
                          const newMap = new Map(prev);
                          newMap.delete(peerId);
                          return newMap;
                        });
                        setStreamUpdateCounter((c) => c + 1);
                      }
                    } else {
                      noDataCounter = 0;
                    }

                    lastFramesReceived = currentFramesReceived;
                  }
                });

                if (!foundInboundRtp) {
                  console.warn(
                    `[WebRTC] No inbound-rtp video stats found for ${peerId}`,
                    {
                      totalReports: stats.size,
                      trackMuted: event.track.muted,
                      trackReadyState: event.track.readyState,
                      trackId: event.track.id,
                    },
                  );
                }
              }, 2000);
              statsIntervalsRef.current.set(trackId, interval);
            }

            // Trigger stream update to re-render components
            setStreamUpdateCounter((c) => c + 1);
          };
          event.track.addEventListener("unmute", handleUnmute);
          trackEventHandlers.push(() => event.track.removeEventListener("unmute", handleUnmute));

          const handleMute = async () => {
            console.log(`[WebRTC] ⚠️ Track muted for ${peerId}:`, {
              kind: event.track.kind,
              trackId: event.track.id,
            });

            // Log stats when track mutes to see if any bytes were received
            const stats = await pc.getStats(event.track);
            stats.forEach((report) => {
              if (report.type === "inbound-rtp" && report.kind === "video") {
                console.log(`[WebRTC] Stats at mute time for ${peerId}:`, {
                  bytesReceived: report.bytesReceived,
                  packetsReceived: report.packetsReceived,
                  framesReceived: report.framesReceived,
                });
              }
            });

            // Remove stream when track becomes muted (camera turned off)
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              const removed = newMap.delete(peerId);
              if (removed) {
                console.log(
                  `[WebRTC] Removed stream for ${peerId} due to muted track`,
                );
              }
              return newMap;
            });

            setStreamUpdateCounter((c) => c + 1);
          };
          event.track.addEventListener("mute", handleMute);
          trackEventHandlers.push(() => event.track.removeEventListener("mute", handleMute));

          // Listen for track ending to remove stream
          const handleEnded = () => {
            console.log(`[WebRTC] ❌ Track ended for ${peerId}:`, {
              kind: event.track.kind,
              trackId: event.track.id,
            });

            // Remove the stream if all tracks have ended
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              const stream = newMap.get(peerId);

              if (stream) {
                const activeTracks = stream
                  .getTracks()
                  .filter((t) => t.readyState === "live");
                if (activeTracks.length === 0) {
                  console.log(
                    `[WebRTC] Removing stream for ${peerId} (all tracks ended)`,
                  );
                  newMap.delete(peerId);
                  setStreamUpdateCounter((c) => c + 1);
                }
              }

              return newMap;
            });
          };
          event.track.addEventListener("ended", handleEnded);
          trackEventHandlers.push(() => event.track.removeEventListener("ended", handleEnded));

          // Store cleanup function for this peer's tracks
          const existingCleanup = trackCleanupRef.current.get(peerId);
          trackCleanupRef.current.set(peerId, () => {
            if (existingCleanup) existingCleanup();
            trackEventHandlers.forEach(cleanup => cleanup());
          });

          // Log track stats continuously to monitor byte flow (only if track is not initially muted)
          let lastFramesReceived = 0;
          let noDataCounter = 0;

          // Only start stats monitoring if track is not muted (has actual media)
          if (!event.track.muted && event.track.kind === "video") {
            const interval = setInterval(async () => {
              if (event.track.readyState === "ended") {
                clearInterval(interval);
                statsIntervalsRef.current.delete(trackId);
                return;
              }

              // If track becomes muted, stop monitoring
              if (event.track.muted) {
                console.log(
                  `[WebRTC] Track is now muted for ${peerId}, stopping stats monitoring`,
                );
                clearInterval(interval);
                statsIntervalsRef.current.delete(trackId);
                return;
              }

              // Get ALL stats from peer connection (not just track stats)
              const stats = await pc.getStats();
              let foundInboundRtp = false;
              const allReportTypes: string[] = [];
              const receivers: any[] = [];
              let currentFramesReceived = 0;

              stats.forEach((report) => {
                allReportTypes.push(report.type);

                // Log receiver information
                if (report.type === "inbound-rtp" && report.kind === "video") {
                  foundInboundRtp = true;
                  currentFramesReceived = report.framesReceived || 0;

                  console.log(`[WebRTC] Video stats for ${peerId}:`, {
                    bytesReceived: report.bytesReceived,
                    framesReceived: report.framesReceived,
                    framesDecoded: report.framesDecoded,
                    framesDropped: report.framesDropped,
                    trackMuted: event.track.muted,
                    trackEnabled: event.track.enabled,
                    trackReadyState: event.track.readyState,
                  });

                  // Check if frames have stopped being received
                  if (
                    currentFramesReceived === lastFramesReceived &&
                    currentFramesReceived > 0
                  ) {
                    noDataCounter++;
                    console.warn(
                      `[WebRTC] No new frames for ${peerId} (${noDataCounter * 2}s)`,
                    );

                    // If no new frames for 4 seconds, consider stream dead (fallback if data channel signal fails)
                    if (noDataCounter >= 2) {
                      console.log(
                        `[WebRTC] Stream appears dead for ${peerId}, removing...`,
                      );
                      clearInterval(interval);
                      statsIntervalsRef.current.delete(trackId);

                      // Remove the stream
                      setRemoteStreams((prev) => {
                        const newMap = new Map(prev);
                        newMap.delete(peerId);
                        return newMap;
                      });
                      setStreamUpdateCounter((c) => c + 1);
                    }
                  } else {
                    noDataCounter = 0;
                  }

                  lastFramesReceived = currentFramesReceived;
                }

                // Collect receiver info
                if (report.type === "track" && report.kind === "video") {
                  receivers.push({
                    trackIdentifier: report.trackIdentifier,
                    remoteSource: report.remoteSource,
                    ended: report.ended,
                    framesReceived: report.framesReceived,
                  });
                }
              });

              if (!foundInboundRtp) {
                console.warn(
                  `[WebRTC] No inbound-rtp video stats found for ${peerId}`,
                  {
                    totalReports: stats.size,
                    reportTypes: Array.from(new Set(allReportTypes)),
                    receivers: receivers,
                    trackMuted: event.track.muted,
                    trackReadyState: event.track.readyState,
                    trackId: event.track.id,
                  },
                );
              }
            }, 2000);
            statsIntervalsRef.current.set(trackId, interval);
          } else {
            console.log(
              `[WebRTC] Track is muted for ${peerId}, skipping stats monitoring`,
            );
          }

          // Only add stream if track is not muted (has actual media)
          if (!event.track.muted) {
            // Check if this peer is sharing screen
            const isScreenShare = peersSharingScreenRef.current.has(peerId);
            const targetStreamsState = isScreenShare
              ? setRemoteScreenStreams
              : setRemoteStreams;
            const streamType = isScreenShare ? "screen share" : "camera";

            targetStreamsState((prev) => {
              const newMap = new Map(prev);
              let stream = newMap.get(peerId);

              // If peer sent us a stream, use it
              if (event.streams && event.streams[0]) {
                const peerStream = event.streams[0];
                console.log(
                  `[WebRTC] Adding ${streamType} stream from ${peerId} with ${peerStream.getTracks().length} tracks:`,
                  peerStream
                    .getTracks()
                    .map((t) => `${t.kind}(${t.readyState})`),
                );
                newMap.set(peerId, peerStream);
              } else {
                // Fallback: create our own stream and add the track
                if (!stream) {
                  stream = new MediaStream();
                  console.log(
                    `[WebRTC] Creating new remote ${streamType} stream for ${peerId}`,
                  );
                }

                if (!stream.getTrackById(event.track.id)) {
                  stream.addTrack(event.track);
                  console.log(
                    `[WebRTC] ✅ Added ${event.track.kind} track to remote ${streamType} stream for ${peerId}`,
                  );
                }

                console.log(
                  `[WebRTC] Remote ${streamType} stream for ${peerId} now has ${stream.getTracks().length} tracks:`,
                  stream.getTracks().map((t) => `${t.kind}(${t.readyState})`),
                );

                newMap.set(peerId, stream);
              }

              return newMap;
            });

            // Force React update even if stream object is the same
            setStreamUpdateCounter((c) => c + 1);
          } else {
            console.log(
              `[WebRTC] Track is muted for ${peerId}, not adding to remoteStreams (waiting for unmute)`,
            );
          }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
          console.log(
            `[WebRTC] Peer ${peerId} connection state: ${pc.connectionState}`,
          );
          if (pc.connectionState === "failed") {
            console.error(`[WebRTC] Connection to ${peerId} failed!`);
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log(
            `[WebRTC] Peer ${peerId} ICE connection state: ${pc.iceConnectionState}`,
          );
          if (pc.iceConnectionState === "failed") {
            console.error(`[WebRTC] ICE connection to ${peerId} failed!`);
          }
        };

        pc.onicegatheringstatechange = () => {
          console.log(
            `[WebRTC] Peer ${peerId} ICE gathering state: ${pc.iceGatheringState}`,
          );
        };

        peersRef.current[peerId] = pc;
      }

      switch (type) {
        case "join": {
          // Someone joined - create data channel and offer
          console.log(`[WebRTC] Sending offer to ${peerId}`);

          // Notify parent that a user joined
          if (onUserJoined) {
            onUserJoined(peerId);
          }

          // Create data channel for chat (offerer creates it)
          const dataChannel = pc.createDataChannel("chat");
          dataChannel.onopen = () => {
            console.log(`[WebRTC] Data channel opened with ${peerId}`);
            dataChannelsRef.current.set(peerId, dataChannel);
          };
          dataChannel.onmessage = (event) => {
            console.log(
              `[WebRTC] Received data channel message from ${peerId}:`,
              event.data.substring(0, 100),
            );
            try {
              const message = JSON.parse(event.data);

              // Handle control messages
              if (message.type === "track-removed") {
                console.log(
                  `[WebRTC] 🔴 Received track-removed signal from ${peerId} for ${message.kind}`,
                );

                // Remove the stream immediately
                setRemoteStreams((prev) => {
                  const newMap = new Map(prev);
                  const removed = newMap.delete(peerId);
                  console.log(`[WebRTC] Stream removal result:`, {
                    removed,
                    remainingPeers: Array.from(newMap.keys()),
                  });
                  return newMap;
                });
                setStreamUpdateCounter((c) => c + 1);
              } else if (message.type === "screen-share-started") {
                console.log(
                  `[WebRTC] 📺 Peer ${peerId} started screen sharing`,
                );
                // Mark peer as sharing screen
                peersSharingScreenRef.current.add(peerId);
                // Screen stream will be added via ontrack event
                setStreamUpdateCounter((c) => c + 1);
              } else if (message.type === "screen-share-stopped") {
                console.log(
                  `[WebRTC] 📺 Peer ${peerId} stopped screen sharing`,
                );
                // Mark peer as not sharing screen
                peersSharingScreenRef.current.delete(peerId);
                // Remove screen share stream
                setRemoteScreenStreams((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(peerId);
                  return newMap;
                });
                setStreamUpdateCounter((c) => c + 1);
              } else {
                // Handle chat messages
                setMessages((prev) => [
                  ...prev,
                  {
                    ...message,
                    timestamp: new Date(message.timestamp),
                  },
                ]);
              }
            } catch (error) {
              console.error(
                "Failed to parse data channel message:",
                error,
                event.data,
              );
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              console.log(
                `[WebRTC] Sending ICE candidate to ${peerId}:`,
                event.candidate.candidate.substring(0, 50),
              );
              ws.send(
                JSON.stringify({
                  type: "offer",
                  data: event.candidate.toJSON(),
                  clientId: peerId,
                }),
              );
            } else {
              console.log(`[WebRTC] ICE gathering complete for ${peerId}`);
            }
          };

          const offerDescription = await pc.createOffer();
          console.log(
            `[WebRTC] Created offer for ${peerId}, setting local description...`,
          );
          await pc.setLocalDescription(offerDescription);
          console.log(
            `[WebRTC] Local description set for ${peerId}, ICE gathering state: ${pc.iceGatheringState}`,
          );

          const senderTracks = pc
            .getSenders()
            .map((s) => s.track?.kind || "none");
          console.log(`[WebRTC] Offer for ${peerId} has tracks:`, senderTracks);

          ws.send(
            JSON.stringify({
              type: "call-offer",
              data: {
                sdp: offerDescription.sdp,
                type: offerDescription.type,
              },
              clientId: peerId,
            }),
          );
          break;
        }

        case "call-offer": {
          // Received offer - handle data channel and send answer
          const isRenegotiation = pc.currentRemoteDescription !== null;
          console.log(
            `[WebRTC] Received ${isRenegotiation ? "renegotiation" : "initial"} offer from ${peerId}, sending answer`,
          );

          // Ensure we have our local tracks in the peer connection before answering
          // (applies to both initial offers and renegotiation)
          if (localStreamRef.current) {
            const existingSenders = pc.getSenders();
            const existingTrackKinds = existingSenders
              .map((s) => s.track?.kind)
              .filter(Boolean);
            const localTrackKinds = localStreamRef.current
              .getTracks()
              .map((t) => t.kind);

            console.log(
              `[WebRTC] Checking tracks before answer - existing:`,
              existingTrackKinds,
              `local:`,
              localTrackKinds,
            );

            // Add any local tracks that aren't already in the peer connection
            for (const track of localStreamRef.current.getTracks()) {
              const hasSenderForTrack = existingSenders.some(
                (s) => s.track?.id === track.id,
              );
              if (!hasSenderForTrack) {
                console.log(
                  `[WebRTC] Adding missing ${track.kind} track before creating answer`,
                );
                pc.addTrack(track, localStreamRef.current);
              }
            }
          } else {
            console.log(
              `[WebRTC] ⚠️ No local stream when answering offer from ${peerId}`,
            );
          }

          // Handle data channel (answerer receives it)
          pc.ondatachannel = (event) => {
            const dataChannel = event.channel;
            dataChannel.onopen = () => {
              console.log(`[WebRTC] Data channel opened with ${peerId}`);
              dataChannelsRef.current.set(peerId, dataChannel);
            };
            dataChannel.onmessage = (event) => {
              console.log(
                `[WebRTC] Received data channel message from ${peerId}:`,
                event.data.substring(0, 100),
              );
              try {
                const message = JSON.parse(event.data);

                // Handle control messages
                if (message.type === "track-removed") {
                  console.log(
                    `[WebRTC] 🔴 Received track-removed signal from ${peerId} for ${message.kind}`,
                  );

                  // Remove the stream immediately
                  setRemoteStreams((prev) => {
                    const newMap = new Map(prev);
                    const removed = newMap.delete(peerId);
                    console.log(`[WebRTC] Stream removal result:`, {
                      removed,
                      remainingPeers: Array.from(newMap.keys()),
                    });
                    return newMap;
                  });
                  setStreamUpdateCounter((c) => c + 1);
                } else if (message.type === "screen-share-started") {
                  console.log(
                    `[WebRTC] 📺 Peer ${peerId} started screen sharing`,
                  );
                  // Mark peer as sharing screen
                  peersSharingScreenRef.current.add(peerId);
                  // Screen stream will be added via ontrack event
                  setStreamUpdateCounter((c) => c + 1);
                } else if (message.type === "screen-share-stopped") {
                  console.log(
                    `[WebRTC] 📺 Peer ${peerId} stopped screen sharing`,
                  );
                  // Mark peer as not sharing screen
                  peersSharingScreenRef.current.delete(peerId);
                  // Remove screen share stream
                  setRemoteScreenStreams((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(peerId);
                    return newMap;
                  });
                  setStreamUpdateCounter((c) => c + 1);
                } else {
                  // Handle chat messages
                  setMessages((prev) => [
                    ...prev,
                    {
                      ...message,
                      timestamp: new Date(message.timestamp),
                    },
                  ]);
                }
              } catch (error) {
                console.error(
                  "Failed to parse data channel message:",
                  error,
                  event.data,
                );
              }
            };
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              console.log(
                `[WebRTC] Sending ICE candidate to ${peerId}:`,
                event.candidate.candidate.substring(0, 50),
              );
              ws.send(
                JSON.stringify({
                  type: "answer",
                  data: event.candidate.toJSON(),
                  clientId: peerId,
                }),
              );
            } else {
              console.log(`[WebRTC] ICE gathering complete for ${peerId}`);
            }
          };

          const offerDescription = new RTCSessionDescription(data.data);
          console.log(`[WebRTC] Setting remote description for ${peerId}...`);
          await pc.setRemoteDescription(offerDescription);
          console.log(`[WebRTC] Remote description set for ${peerId}`);

          // Log transceivers to check their configuration
          const transceivers = pc.getTransceivers();
          console.log(
            `[WebRTC] Transceivers for ${peerId}:`,
            transceivers.map((t) => ({
              mid: t.mid,
              direction: t.direction,
              currentDirection: t.currentDirection,
              receiver: {
                trackId: t.receiver?.track?.id,
                trackKind: t.receiver?.track?.kind,
                trackMuted: t.receiver?.track?.muted,
              },
              sender: {
                trackId: t.sender?.track?.id,
                trackKind: t.sender?.track?.kind,
              },
            })),
          );

          // Ensure transceivers are properly configured before creating answer
          // This is critical for renegotiation when new tracks are added
          transceivers.forEach((transceiver) => {
            // If we have a receiver but no sender, ensure direction allows receiving
            if (transceiver.receiver && transceiver.receiver.track) {
              if (!transceiver.sender?.track) {
                // We're only receiving, not sending - set to recvonly
                if (
                  transceiver.direction !== "recvonly" &&
                  transceiver.direction !== "sendrecv"
                ) {
                  console.log(
                    `[WebRTC] Setting transceiver direction to recvonly for ${peerId} (was ${transceiver.direction})`,
                  );
                  transceiver.direction = "recvonly";
                }
              }
            }
          });

          const answerDescription = await pc.createAnswer();
          console.log(
            `[WebRTC] Created answer for ${peerId}, setting local description...`,
          );
          await pc.setLocalDescription(answerDescription);
          console.log(
            `[WebRTC] Local description set for ${peerId}, ICE gathering state: ${pc.iceGatheringState}`,
          );

          // Log transceivers AFTER setLocalDescription to see negotiated directions
          const transceiversAfter = pc.getTransceivers();
          console.log(
            `[WebRTC] Transceivers AFTER setLocalDescription for ${peerId}:`,
            transceiversAfter.map((t) => ({
              mid: t.mid,
              direction: t.direction,
              currentDirection: t.currentDirection,
              receiver: {
                trackId: t.receiver?.track?.id,
                trackMuted: t.receiver?.track?.muted,
              },
            })),
          );

          const senderTracks = pc
            .getSenders()
            .map((s) => s.track?.kind || "none");
          console.log(
            `[WebRTC] Answer for ${peerId} has tracks:`,
            senderTracks,
          );

          ws.send(
            JSON.stringify({
              type: "call-answer",
              data: {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
              },
              clientId: peerId,
            }),
          );
          break;
        }

        case "call-answer": {
          // Received answer (from initial connection or renegotiation)
          console.log(`[WebRTC] Received answer from ${peerId}`);
          if (data.data) {
            const answerDescription = new RTCSessionDescription(data.data);
            console.log(
              `[WebRTC] Setting remote description (answer) for ${peerId}`,
            );
            await pc.setRemoteDescription(answerDescription);
            console.log(
              `[WebRTC] Remote description (answer) set for ${peerId}, signaling state: ${pc.signalingState}`,
            );
          }
          break;
        }

        case "offer": {
          // ICE candidate from offerer
          if (data.data) {
            console.log(
              `[WebRTC] Received ICE candidate from ${peerId}:`,
              data.data.candidate?.substring(0, 50),
            );
            const candidate = new RTCIceCandidate(data.data);
            await pc.addIceCandidate(candidate);
          }
          break;
        }

        case "answer": {
          // ICE candidate from answerer
          if (data.data) {
            console.log(
              `[WebRTC] Received ICE candidate from ${peerId}:`,
              data.data.candidate?.substring(0, 50),
            );
            const candidate = new RTCIceCandidate(data.data);
            await pc.addIceCandidate(candidate);
          }
          break;
        }

        case "disconnect": {
          console.log(`[WebRTC] Peer ${peerId} disconnected`);
          cleanupPeer(peerId);
          if (onUserLeft) {
            onUserLeft(peerId);
          }
          break;
        }

        case "refetch-members": {
          console.log(`[WebRTC] Received refetch-members notification`);
          // Trigger parent component to refetch member list
          if (onUserLeft) {
            // We don't know which user left, just trigger a refetch
            onUserLeft("");
          }
          break;
        }
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };

    ws.onclose = () => {
      console.log("[WS] Connection closed");
      wsRef.current = null;
    };

    return () => {
      // Cleanup - send disconnect message before closing
      if (ws.readyState === WebSocket.OPEN) {
        console.log("[WS] Sending disconnect message");
        ws.send(
          JSON.stringify({
            type: "disconnect",
            clientId: userId,
          }),
        );
      }

      ws.close();

      // Clean up all peers properly (intervals, event listeners, connections)
      Object.keys(peersRef.current).forEach((peerId) => {
        cleanupPeer(peerId);
      });
    };
  }, [roomId, userId, onUserLeft, cleanupPeer]);

  // Update tracks on existing peer connections when localStream changes
  useEffect(() => {
    if (Object.keys(peersRef.current).length === 0) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    console.log(
      "[WebRTC] Local stream changed, updating tracks on existing peers",
    );

    Object.entries(peersRef.current).forEach(async ([peerId, pc]) => {
      const senders = pc.getSenders();
      const currentTracks = localStream?.getTracks() || [];
      let needsRenegotiation = false;

      // For each track kind (audio/video), update or add
      ["audio", "video"].forEach((kind) => {
        const sender = senders.find((s) => s.track?.kind === kind);
        const newTrack = currentTracks.find((t) => t.kind === kind);

        if (sender) {
          // Sender exists - replace track (no renegotiation needed)
          if (sender.track !== newTrack) {
            console.log(`[WebRTC] Replacing ${kind} track for peer ${peerId}`, {
              oldTrack: sender.track?.id,
              newTrack: newTrack?.id,
              trackState: newTrack?.readyState,
              trackEnabled: newTrack?.enabled,
            });
            sender
              .replaceTrack(newTrack || null)
              .then(() => {
                console.log(
                  `[WebRTC] Successfully replaced ${kind} track for peer ${peerId}`,
                );

                // If track was removed (null), notify peer immediately via data channel
                if (!newTrack) {
                  const dataChannel = dataChannelsRef.current.get(peerId);
                  console.log(
                    `[WebRTC] Track removed, checking data channel for ${peerId}:`,
                    {
                      hasDataChannel: !!dataChannel,
                      readyState: dataChannel?.readyState,
                    },
                  );

                  if (dataChannel && dataChannel.readyState === "open") {
                    console.log(
                      `[WebRTC] Sending track-removed signal to ${peerId} for ${kind}`,
                    );
                    try {
                      dataChannel.send(
                        JSON.stringify({
                          type: "track-removed",
                          kind: kind,
                        }),
                      );
                      console.log(
                        `[WebRTC] ✅ Sent track-removed signal successfully`,
                      );
                    } catch (e) {
                      console.error(
                        `[WebRTC] Failed to send track-removed signal:`,
                        e,
                      );
                    }
                  } else {
                    console.warn(
                      `[WebRTC] Cannot send track-removed signal - data channel not ready`,
                    );
                  }
                } else {
                  // Log sender stats after a delay (only if track exists)
                  setTimeout(async () => {
                    const stats = await pc.getStats(sender.track);
                    stats.forEach((report) => {
                      if (
                        report.type === "outbound-rtp" &&
                        report.kind === kind
                      ) {
                        console.log(
                          `[WebRTC] Sender stats for ${kind} to ${peerId}:`,
                          {
                            bytesSent: report.bytesSent,
                            packetsSent: report.packetsSent,
                            framesSent: report.framesSent,
                          },
                        );
                      }
                    });
                  }, 3000);
                }
              })
              .catch((e) => {
                console.error(
                  `Failed to replace ${kind} track for peer ${peerId}:`,
                  e,
                );
              });
          }
        } else if (newTrack && localStream) {
          // No sender for this kind - add track (requires renegotiation)
          console.log(`[WebRTC] Adding new ${kind} track to peer ${peerId}`, {
            trackId: newTrack.id,
            trackState: newTrack.readyState,
            trackEnabled: newTrack.enabled,
          });
          pc.addTrack(newTrack, localStream);
          needsRenegotiation = true;
        }
      });

      // If we added new tracks, renegotiate
      if (needsRenegotiation) {
        try {
          console.log(
            `[WebRTC] Renegotiating with peer ${peerId} due to new tracks`,
          );
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          const senderTracks = pc.getSenders().map((s) => ({
            kind: s.track?.kind || "none",
            id: s.track?.id.substring(0, 8) || "none",
            trackState: s.track?.readyState,
            trackEnabled: s.track?.enabled,
            trackMuted: s.track?.muted,
          }));
          console.log(
            `[WebRTC] Renegotiation offer to ${peerId} includes tracks:`,
            senderTracks,
          );

          // Log sender stats after renegotiation
          setTimeout(async () => {
            for (const sender of pc.getSenders()) {
              if (sender.track) {
                const stats = await pc.getStats(sender.track);
                stats.forEach((report) => {
                  if (report.type === "outbound-rtp") {
                    console.log(
                      `[WebRTC] Post-renegotiation sender stats for ${sender.track?.kind} to ${peerId}:`,
                      {
                        bytesSent: report.bytesSent,
                        packetsSent: report.packetsSent,
                        framesSent: report.framesSent,
                        trackState: sender.track?.readyState,
                        trackMuted: sender.track?.muted,
                      },
                    );
                  }
                });
              }
            }
          }, 3000);

          wsRef.current?.send(
            JSON.stringify({
              type: "call-offer",
              data: {
                sdp: offer.sdp,
                type: offer.type,
              },
              clientId: peerId,
            }),
          );
          console.log(`[WebRTC] Sent renegotiation offer to ${peerId}`);
        } catch (error) {
          console.error(
            `[WebRTC] Failed to renegotiate with peer ${peerId}:`,
            error,
          );
        }
      }
    });
  }, [localStream]);

  // Update screen share tracks on existing peer connections when screenStream changes
  useEffect(() => {
    if (Object.keys(peersRef.current).length === 0) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    console.log(
      "[WebRTC] Screen stream changed, updating tracks on existing peers",
    );

    Object.entries(peersRef.current).forEach(async ([peerId, pc]) => {
      const senders = pc.getSenders();
      const screenTracks = screenStream?.getTracks() || [];

      // If screen stream exists, notify peers and add tracks
      if (screenStream && screenTracks.length > 0) {
        console.log(`[WebRTC] Adding screen share tracks for peer ${peerId}`);

        // Notify peer that we're starting screen share
        const dataChannel = dataChannelsRef.current.get(peerId);
        if (dataChannel && dataChannel.readyState === "open") {
          dataChannel.send(JSON.stringify({ type: "screen-share-started" }));
        }

        // Add screen tracks to peer connection
        let needsRenegotiation = false;
        for (const track of screenTracks) {
          const existingSender = senders.find((s) => s.track?.id === track.id);
          if (!existingSender && screenStream) {
            console.log(
              `[WebRTC] Adding screen ${track.kind} track to peer ${peerId}`,
            );
            pc.addTrack(track, screenStream);
            needsRenegotiation = true;
          }
        }

        if (needsRenegotiation) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            wsRef.current?.send(
              JSON.stringify({
                type: "call-offer",
                data: { sdp: offer.sdp, type: offer.type },
                clientId: peerId,
              }),
            );
          } catch (error) {
            console.error(
              `[WebRTC] Failed to renegotiate screen share with ${peerId}:`,
              error,
            );
          }
        }
      } else {
        // Screen stream removed - notify peers and remove screen tracks
        console.log(`[WebRTC] Removing screen share tracks for peer ${peerId}`);

        const dataChannel = dataChannelsRef.current.get(peerId);
        if (dataChannel && dataChannel.readyState === "open") {
          dataChannel.send(JSON.stringify({ type: "screen-share-stopped" }));
        }

        // Remove screen share track senders
        for (const sender of senders) {
          if (sender.track && sender.track.contentHint === "detail") {
            // Screen share tracks typically have contentHint "detail"
            sender.replaceTrack(null);
          }
        }
      }
    });
  }, [screenStream]);

  return {
    messages,
    connectedPeers: Object.keys(peersRef.current),
    sendMessage,
    remoteStreams,
    remoteScreenStreams,
    streamUpdateCounter, // Force re-renders when tracks are added to streams
  };
}
