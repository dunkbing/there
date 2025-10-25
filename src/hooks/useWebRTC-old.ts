import { useEffect, useRef, useState, useCallback } from "react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  from: string;
  to?: string;
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

export function useWebRTC(
  roomId: string,
  userId: string,
  userName: string,
  members: Member[] = [],
  localStream: MediaStream | null = null,
  onUserLeft?: (userId: string) => void,
) {
  useEffect(() => {
    console.log(`[useWebRTC] Initialized for room=${roomId}, user=${userId}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const isCleaningUpRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const handleOfferRef = useRef<(offer: RTCSessionDescriptionInit, from: string) => Promise<void>>();
  const handleAnswerRef = useRef<(answer: RTCSessionDescriptionInit, from: string) => Promise<void>>();
  const handleIceCandidateRef = useRef<(candidate: RTCIceCandidateInit, from: string) => Promise<void>>();

  // Keep remoteStreamsRef in sync with remoteStreams state
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const sendSignal = useCallback(
    (signal: SignalData) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected, cannot send signal");
        return;
      }

      try {
        console.log(`📤 [${userId}] Sending ${signal.type} signal to ${signal.to}`);
        wsRef.current.send(
          JSON.stringify({
            type: "signal",
            to: signal.to,
            signalType: signal.type,
            signalData: signal.data,
          }),
        );
      } catch (error) {
        console.error("Failed to send signal:", error);
      }
    },
    [userId],
  );

  // Update local stream ref when it changes
  useEffect(() => {
    const previousStream = localStreamRef.current;
    localStreamRef.current = localStream;

    // Renegotiate with all peers when stream changes
    const renegotiateWithPeers = async () => {
      // Only renegotiate if we have established connections
      if (
        peersRef.current.size === 0 ||
        (!localStream && !previousStream) ||
        isCleaningUpRef.current
      ) {
        return;
      }

      const trackInfo = localStream?.getTracks().map((t) => `${t.kind}:${t.id}`) || [];
      console.log(
        `🔄 [${userId}] Renegotiating with ${peersRef.current.size} peer(s), my tracks: [${trackInfo.join(", ")}]`,
      );
      console.log(`🔄 [${userId}] Peer IDs to renegotiate with:`, Array.from(peersRef.current.keys()));

      for (const [peerId, pc] of peersRef.current.entries()) {
        try {
          // Skip if peer connection is not in a good state
          if (
            pc.signalingState === "closed" ||
            pc.connectionState === "closed"
          ) {
            continue;
          }

          // Only renegotiate if in stable state
          if (pc.signalingState !== "stable") {
            console.log(
              `Skipping renegotiation with ${peerId}, signaling state: ${pc.signalingState}`,
            );
            continue;
          }

          const currentTracks = localStream?.getTracks() || [];
          const transceivers = pc.getTransceivers();

          // Update each transceiver with the appropriate track
          for (const transceiver of transceivers) {
            const kind = transceiver.receiver.track.kind;
            const sender = transceiver.sender;
            const currentTrack = sender.track;
            const newTrack = currentTracks.find((t) => t.kind === kind);

            if (currentTrack && newTrack && newTrack.id !== currentTrack.id) {
              await sender.replaceTrack(newTrack);
            } else if (currentTrack && !newTrack) {
              await sender.replaceTrack(null);
            } else if (!currentTrack && newTrack) {
              await sender.replaceTrack(newTrack);
            }
          }

          // Create new offer to renegotiate
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await sendSignal({
            type: "offer",
            data: offer,
            from: userId,
            to: peerId,
          });
        } catch (error) {
          console.error(`Failed to renegotiate with peer ${peerId}:`, error);
        }
      }
    };

    // Debounce renegotiation to avoid rapid-fire updates
    const timeoutId = setTimeout(renegotiateWithPeers, 100);
    return () => clearTimeout(timeoutId);
  }, [localStream, userId, sendSignal]);

  const createPeerConnection = useCallback(
    (peerId: string, isOfferer: boolean = false) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Only create transceivers if we're the offerer
      // The answerer will get transceivers from the incoming offer
      if (isOfferer) {
        pc.addTransceiver("audio", { direction: "sendrecv" });
        pc.addTransceiver("video", { direction: "sendrecv" });

        // Add local tracks to the transceivers if we have them
        if (localStreamRef.current) {
          const transceivers = pc.getTransceivers();
          localStreamRef.current.getTracks().forEach((track) => {
            const transceiver = transceivers.find(
              (t) => t.receiver.track.kind === track.kind && !t.sender.track,
            );
            if (transceiver) {
              transceiver.sender.replaceTrack(track);
            }
          });
        }
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log(
          `🎥 [${userId}] Received ${event.track.kind} track from peer ${peerId}, track.id: ${event.track.id}, readyState: ${event.track.readyState}`,
        );

        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          console.log(
            `🎥 [${userId}] Storing stream for peer ${peerId}, stream has ${remoteStream.getTracks().length} tracks`,
          );
          setRemoteStreams((prev) => {
            if (prev.get(peerId) === remoteStream) return prev;
            const newMap = new Map(prev);
            newMap.set(peerId, remoteStream);
            console.log(`🎥 [${userId}] Updated remoteStreams, now has ${newMap.size} streams for peers:`, Array.from(newMap.keys()));
            return newMap;
          });
        } else {
          // Fallback for browsers that don't populate event.streams
          console.log(`🎥 [${userId}] No event.streams, using fallback for peer ${peerId}`);
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            const existingStream = newMap.get(peerId);
            const tracks = existingStream ? existingStream.getTracks() : [];

            if (!tracks.some((t) => t.id === event.track.id)) {
              const newStream = new MediaStream([...tracks, event.track]);
              newMap.set(peerId, newStream);
              console.log(`🎥 [${userId}] Updated remoteStreams (fallback), now has ${newMap.size} streams`);
              return newMap;
            }
            return prev;
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to peer via signaling server
          sendSignal({
            type: "ice-candidate",
            data: event.candidate,
            from: userId,
            to: peerId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[${userId}] Peer ${peerId} connection state: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
          setConnectedPeers((prev) => new Set(prev).add(peerId));
          console.log(`Successfully connected to peer ${peerId}`);
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          console.log(`Peer ${peerId} disconnected or failed`);
          setConnectedPeers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(peerId);
            return newSet;
          });
          // Remove remote stream when peer disconnects
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
          });
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [sendSignal, userId],
  );

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel, peerId: string) => {
      console.log(
        `Setting up data channel with peer ${peerId}, state: ${channel.readyState}`,
      );

      channel.onopen = () => {
        console.log(`Data channel opened with peer ${peerId}`);
      };

      channel.onclose = () => {
        console.log(`Data channel closed with peer ${peerId}`);
        dataChannelsRef.current.delete(peerId);
      };

      channel.onerror = (error) => {
        console.error(`Data channel error with peer ${peerId}:`, error);
      };

      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`Received message from peer ${peerId}:`, message.text);
          setMessages((prev) => [
            ...prev,
            {
              ...message,
              timestamp: new Date(message.timestamp),
            },
          ]);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      dataChannelsRef.current.set(peerId, channel);
      console.log(
        `Data channel stored for peer ${peerId}, total channels: ${dataChannelsRef.current.size}`,
      );
    },
    [],
  );

  const createOffer = useCallback(
    async (peerId: string) => {
      const pc = createPeerConnection(peerId, true); // isOfferer = true
      const channel = pc.createDataChannel("chat");
      setupDataChannel(channel, peerId);

      // Log what tracks we're sending in the offer
      const transceivers = pc.getTransceivers();
      const tracksInfo = transceivers.map(
        (t) =>
          `${t.receiver.track.kind}:${t.sender.track ? "HAS_TRACK" : "NO_TRACK"}`,
      );
      console.log(
        `🤝 [${userId}] Creating offer to ${peerId} with tracks: [${tracksInfo.join(", ")}]`,
      );

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendSignal({
        type: "offer",
        data: offer,
        from: userId,
        to: peerId,
      });
    },
    [createPeerConnection, setupDataChannel, sendSignal, userId],
  );

  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, from: string) => {
      // Check if we already have a connection with this peer (renegotiation)
      let pc = peersRef.current.get(from);

      if (!pc) {
        // New connection - we're the answerer
        pc = createPeerConnection(from, false); // isOfferer = false

        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel, from);
        };
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // After setRemoteDescription, transceivers are created from the offer
      // Add our local tracks to the transceivers
      const transceivers = pc.getTransceivers();
      const localTracks = localStreamRef.current?.getTracks() || [];
      const addedTracks: string[] = [];

      // Replace sender tracks with our local tracks
      for (const transceiver of transceivers) {
        const kind = transceiver.receiver.track.kind;
        const localTrack = localTracks.find((t) => t.kind === kind);

        // Always replace the track with what we have locally (or null if nothing)
        await transceiver.sender.replaceTrack(localTrack || null);

        if (localTrack) {
          addedTracks.push(kind);
        }
      }

      console.log(
        `✅ [${userId}] Answerer added tracks to ${from}: [${addedTracks.join(", ") || "none"}]`,
      );

      // Process queued ICE candidates
      const pending = pendingIceCandidatesRef.current.get(from) || [];
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Failed to add queued ICE candidate:", error);
        }
      }
      pendingIceCandidatesRef.current.delete(from);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal({
        type: "answer",
        data: answer,
        from: userId,
        to: from,
      });
    },
    [createPeerConnection, setupDataChannel, sendSignal, userId],
  );

  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit, from: string) => {
      const pc = peersRef.current.get(from);
      if (!pc || pc.signalingState !== "have-local-offer") {
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Process queued ICE candidates
      const pending = pendingIceCandidatesRef.current.get(from) || [];
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Failed to add queued ICE candidate:", error);
        }
      }
      pendingIceCandidatesRef.current.delete(from);
    },
    [],
  );

  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit, from: string) => {
      const pc = peersRef.current.get(from);
      if (pc) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Failed to add ICE candidate:", error);
          }
        } else {
          // Queue until remote description is set
          if (!pendingIceCandidatesRef.current.has(from)) {
            pendingIceCandidatesRef.current.set(from, []);
          }
          pendingIceCandidatesRef.current.get(from)!.push(candidate);
        }
      }
    },
    [],
  );

  // Keep refs updated with latest callback versions
  useEffect(() => {
    handleOfferRef.current = handleOffer;
    handleAnswerRef.current = handleAnswer;
    handleIceCandidateRef.current = handleIceCandidate;
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  const sendMessage = useCallback(
    (text: string) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        sender: userName,
        text,
        timestamp: new Date(),
      };

      console.log(
        `Sending message: "${text}", data channels: ${dataChannelsRef.current.size}`,
      );

      // Add to local messages immediately for the sender
      setMessages((prev) => [...prev, message]);

      // Broadcast to all connected peers (they will add it via onmessage)
      const messageStr = JSON.stringify(message);
      let sentCount = 0;
      dataChannelsRef.current.forEach((channel, peerId) => {
        console.log(`Data channel to ${peerId}: state=${channel.readyState}`);
        if (channel.readyState === "open") {
          try {
            channel.send(messageStr);
            sentCount++;
            console.log(`Message sent to peer ${peerId}`);
          } catch (error) {
            console.error(`Failed to send message to peer ${peerId}:`, error);
          }
        } else {
          console.warn(
            `Cannot send to peer ${peerId}: channel state is ${channel.readyState}`,
          );
        }
      });

      console.log(`Message sent to ${sentCount} peers`);
    },
    [userName],
  );

  const connectToPeers = useCallback(async () => {
    if (isCleaningUpRef.current) return;

    try {
      const allPeerIds = members.map((m: Member) => {
        // Try multiple sources for peer ID, in order of preference
        return m.user?.id || m.userId || m.id;
      });

      console.log(`[connectToPeers] My ID: ${userId}, All peer IDs:`, allPeerIds);

      const peerIds = allPeerIds.filter(
        (id: string) => id !== userId && !peersRef.current.has(id),
      );

      console.log(`[connectToPeers] New peers to connect:`, peerIds);

      // Only create offers to peers with higher IDs (alphabetically)
      // This prevents both peers from creating offers simultaneously
      const peersToOffer = peerIds.filter((peerId: string) => userId < peerId);

      // Create offers to new peers (only if our ID is smaller)
      for (const peerId of peersToOffer) {
        if (!isCleaningUpRef.current) {
          console.log(
            `🔵 [${userId}] I am OFFERER, creating offer to ${peerId}`,
          );
          await createOffer(peerId);
        }
      }

      // Log if we're waiting for offers
      const peersWaitingFor = peerIds.filter(
        (peerId: string) => userId > peerId,
      );
      if (peersWaitingFor.length > 0) {
        console.log(
          `🟢 [${userId}] I am ANSWERER, waiting for offer from ${peersWaitingFor.join(", ")}`,
        );
      }
    } catch (error) {
      console.error("Failed to connect to peers:", error);
    }
  }, [members, userId, createOffer]);

  // Connect to peers when members list changes
  useEffect(() => {
    connectToPeers();
  }, [connectToPeers]);

  // Debug: Log expected vs actual connections every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const expectedPeers = members
        .filter(m => {
          const pId = m.user?.id || m.userId || m.id;
          return pId !== userId;
        })
        .map(m => m.user?.id || m.userId || m.id);

      const actualPeers = Array.from(peersRef.current.keys());
      const missingPeers = expectedPeers.filter(p => !actualPeers.includes(p));

      if (missingPeers.length > 0) {
        console.warn(`⚠️ [${userId}] Missing peer connections to:`, missingPeers);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [userId, members]);

  // Setup WebSocket for real-time signaling and presence
  useEffect(() => {
    if (!userId) {
      console.log("Skipping WebSocket setup: userId is empty");
      return;
    }

    console.log(`Setting up WebSocket for room=${roomId}, userId=${userId}`);
    isCleaningUpRef.current = false;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//localhost:8080/api/signal/ws?clientId=${userId}&room=${roomId}`;
      console.log(`[WS] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WS] Connected, sending join notification`);
        ws.send(
          JSON.stringify({
            type: "join",
            clientId: userId,
          }),
        );
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type } = message;

          console.log(`[WS] Received ${type} message`);

          switch (type) {
            case "room-members": {
              // Initial list of members already in the room
              const { members: existingMembers } = message;
              console.log(
                `[WS] Room has ${existingMembers.length} existing members`,
              );
              // Connect to existing members (filtering handled by connectToPeers)
              break;
            }

            case "user-joined": {
              // New user joined the room
              const { userId: newUserId, userName: newUserName } = message;
              console.log(`[WS] User ${newUserName} (${newUserId}) joined`);
              // connectToPeers will be called by the members change effect
              break;
            }

            case "user-left": {
              // User left the room
              const { userId: leftUserId } = message;
              console.log(`[WS] User ${leftUserId} left`);

              // Notify parent component
              if (onUserLeft) {
                onUserLeft(leftUserId);
              }

              // Clean up peer connection
              const pc = peersRef.current.get(leftUserId);
              if (pc) {
                pc.close();
                peersRef.current.delete(leftUserId);
              }

              // Clean up data channel
              dataChannelsRef.current.delete(leftUserId);

              // Remove from connected peers
              setConnectedPeers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(leftUserId);
                return newSet;
              });

              // Remove remote stream
              setRemoteStreams((prev) => {
                const newMap = new Map(prev);
                newMap.delete(leftUserId);
                return newMap;
              });

              break;
            }

            case "signal": {
              // WebRTC signal from another peer
              const { from, signalType, signalData } = message;

              console.log(`📥 [${userId}] Received ${signalType} signal from ${from}`);

              if (isCleaningUpRef.current) return;

              if (signalType === "offer" && handleOfferRef.current) {
                console.log(`🔵 [${userId}] Processing offer from ${from}`);
                await handleOfferRef.current(signalData, from);
              } else if (signalType === "answer" && handleAnswerRef.current) {
                console.log(`🟢 [${userId}] Processing answer from ${from}`);
                await handleAnswerRef.current(signalData, from);
              } else if (signalType === "ice-candidate" && handleIceCandidateRef.current) {
                console.log(`🧊 [${userId}] Processing ICE candidate from ${from}`);
                await handleIceCandidateRef.current(signalData, from);
              }
              break;
            }

            case "pong": {
              // Heartbeat response
              break;
            }
          }
        } catch (error) {
          console.error("[WS] Error processing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
      };

      ws.onclose = () => {
        console.log("[WS] Connection closed");

        // Only handle close if this is still the current WebSocket
        if (ws !== wsRef.current) {
          console.log("[WS] Ignoring close event from old WebSocket");
          return;
        }

        wsRef.current = null;

        // Attempt to reconnect if not cleaning up
        if (!isCleaningUpRef.current) {
          console.log("[WS] Reconnecting in 2 seconds...");
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectWebSocket();
          }, 2000);
        }
      };
    };

    connectWebSocket();

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      // Mark as cleaning up to prevent new operations
      isCleaningUpRef.current = true;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Clear heartbeat
      clearInterval(heartbeatInterval);

      // Close WebSocket
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.warn("Error closing WebSocket:", e);
        }
        wsRef.current = null;
      }

      // Cleanup peer connections
      peersRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch (e) {
          console.warn("Error closing peer connection:", e);
        }
      });
      peersRef.current.clear();
      dataChannelsRef.current.clear();
      pendingIceCandidatesRef.current.clear();
    };
  }, [roomId, userId, userName]); // Removed handleOffer, handleAnswer, handleIceCandidate - using refs instead

  return {
    messages,
    connectedPeers: Array.from(connectedPeers),
    sendMessage,
    remoteStreams,
  };
}
