import { useEffect, useRef, useState, useCallback } from "react";
import Pusher, { Channel } from "pusher-js";
import { roomClient } from "@/api/client";

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
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel>(null);
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const isCleaningUpRef = useRef(false);

  // Keep remoteStreamsRef in sync with remoteStreams state
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const sendSignal = useCallback(
    async (signal: SignalData) => {
      try {
        const response = await roomClient.webrtc.signal.$post({
          json: {
            roomId,
            ...signal,
          },
        });

        if (!response.ok) {
          console.error(
            `Failed to send ${signal.type} signal:`,
            response.status,
          );
        }
      } catch (error) {
        console.error("Failed to send signal:", error);
      }
    },
    [roomId],
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

      const trackInfo = localStream?.getTracks().map((t) => t.kind) || [];
      console.log(
        `🔄 [${userId}] Renegotiating with ${peersRef.current.size} peer(s), my tracks: [${trackInfo.join(", ")}]`,
      );

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
          `🎥 [${userId}] Received ${event.track.kind} from peer ${peerId}`,
        );

        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          setRemoteStreams((prev) => {
            if (prev.get(peerId) === remoteStream) return prev;
            const newMap = new Map(prev);
            newMap.set(peerId, remoteStream);
            return newMap;
          });
        } else {
          // Fallback for browsers that don't populate event.streams
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            const existingStream = newMap.get(peerId);
            const tracks = existingStream ? existingStream.getTracks() : [];

            if (!tracks.some((t) => t.id === event.track.id)) {
              const newStream = new MediaStream([...tracks, event.track]);
              newMap.set(peerId, newStream);
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
        console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
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
      if (
        localStreamRef.current &&
        localStreamRef.current.getTracks().length > 0
      ) {
        const addedTracks: string[] = [];
        localStreamRef.current.getTracks().forEach((track) => {
          const transceiver = transceivers.find(
            (t) => t.receiver.track.kind === track.kind && !t.sender.track,
          );
          if (transceiver) {
            transceiver.sender.replaceTrack(track);
            addedTracks.push(track.kind);
          }
        });
        console.log(
          `✅ [${userId}] Answerer added tracks to ${from}: [${addedTracks.join(", ")}]`,
        );
      } else {
        console.log(
          `⏸️  [${userId}] Answerer has no local stream when processing offer from ${from}`,
        );
      }

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

      const peerIds = allPeerIds.filter(
        (id: string) => id !== userId && !peersRef.current.has(id),
      );

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
          `🟢 [${userId}] I am ANSWERER, waiting for offer from ${peersWaitingFor[0]}`,
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

  // Poll for signals from the server
  const pollSignals = useCallback(async () => {
    if (isCleaningUpRef.current) return;

    try {
      const response = await roomClient.webrtc.signals[":roomId"][
        ":userId"
      ].$get({ param: { roomId, userId } });
      if (response.ok && !isCleaningUpRef.current) {
        const res = await response.json();
        const { signals } = res;

        for (const signal of signals as any[]) {
          if (isCleaningUpRef.current) break;

          if (signal.type === "offer") {
            await handleOffer(signal.data, signal.from);
          } else if (signal.type === "answer") {
            await handleAnswer(signal.data, signal.from);
          } else if (signal.type === "ice-candidate") {
            await handleIceCandidate(signal.data, signal.from);
          }
        }
      }
    } catch (error) {
      if (!isCleaningUpRef.current) {
        console.error("Failed to poll signals:", error);
      }
    }
  }, [roomId, userId, handleOffer, handleAnswer, handleIceCandidate]);

  // Setup Pusher for real-time notifications and signal polling
  useEffect(() => {
    if (!userId) {
      console.log("Skipping Pusher setup: userId is empty");
      return;
    }

    console.log(`Setting up Pusher for room=${roomId}, userId=${userId}`);
    isCleaningUpRef.current = false;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    // Subscribe to public room channel
    const channel = pusher.subscribe(`room-${roomId}`);
    console.log(`Subscribed to Pusher channel: room-${roomId}`);

    // Listen for signal notifications (Pusher just tells us to poll)
    channel.bind(
      "webrtc-signal-notification",
      (notification: { to: string; from: string }) => {
        console.log(
          `[Pusher notification] to=${notification.to}, from=${notification.from}, myUserId=${userId}`,
        );
        // Only poll if this notification is for us and we're not cleaning up
        if (notification.to === userId && !isCleaningUpRef.current) {
          console.log(`[Pusher notification] Polling for signals...`);
          pollSignals();
        } else {
          console.log(
            `[Pusher notification] Ignoring (not for me or cleaning up)`,
          );
        }
      },
    );

    pusherRef.current = pusher;
    channelRef.current = channel;

    // Poll immediately on mount
    pollSignals();

    return () => {
      // Mark as cleaning up to prevent new operations
      isCleaningUpRef.current = true;

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

      // Cleanup Pusher
      try {
        channel.unbind_all();
        channel.unsubscribe();
      } catch (e) {
        console.warn("Error cleaning up Pusher channel:", e);
      }

      // Disconnect Pusher with a small delay to ensure cleanup completes
      setTimeout(() => {
        try {
          if (pusher.connection.state !== "disconnected") {
            pusher.disconnect();
          }
        } catch (e) {
          console.warn("Error disconnecting Pusher:", e);
        }
      }, 100);

      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [roomId, userId, pollSignals]);

  return {
    messages,
    connectedPeers: Array.from(connectedPeers),
    sendMessage,
    remoteStreams,
  };
}
