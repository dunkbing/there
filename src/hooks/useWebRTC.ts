import { useEffect, useRef, useState, useCallback } from "react";
import Pusher, { Channel } from "pusher-js";

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
}

export function useWebRTC(
  roomId: string,
  userId: string,
  userName: string,
  members: Member[] = [],
  localStream: MediaStream | null = null,
) {
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

  const sendSignal = async (signal: SignalData) => {
    try {
      await fetch("/api/webrtc/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, ...signal }),
      });
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  };

  // Update local stream ref when it changes
  useEffect(() => {
    const previousStream = localStreamRef.current;
    localStreamRef.current = localStream;

    // Renegotiate with all peers when stream changes
    const renegotiateWithPeers = async () => {
      if (!localStream && !previousStream) return; // No change

      for (const [peerId, pc] of peersRef.current.entries()) {
        try {
          // Remove old senders
          const senders = pc.getSenders();
          for (const sender of senders) {
            pc.removeTrack(sender);
          }

          // Add new tracks from the updated stream
          if (localStream) {
            localStream.getTracks().forEach((track) => {
              console.log(`Adding ${track.kind} track to peer ${peerId}`);
              pc.addTrack(track, localStream);
            });
          }

          // Create new offer to renegotiate
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Send the new offer
          await sendSignal({
            type: "offer",
            data: offer,
            from: userId,
            to: peerId,
          });

          console.log(`Renegotiated connection with peer ${peerId}`);
        } catch (error) {
          console.error(`Failed to renegotiate with peer ${peerId}:`, error);
        }
      }
    };

    renegotiateWithPeers();
  }, [localStream, userId]);

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log(
          `Received remote ${event.track.kind} track from ${peerId}`,
          event.streams[0],
        );
        if (event.streams && event.streams[0]) {
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.set(peerId, event.streams[0]);
            console.log(`Updated remote streams map, now has ${newMap.size} peers`);
            return newMap;
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
      channel.onopen = () => {
        console.log("Data channel opened with", peerId);
      };

      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
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
    },
    [],
  );

  const createOffer = async (peerId: string) => {
    console.log(`Creating offer for peer ${peerId}`);
    const pc = createPeerConnection(peerId);
    const channel = pc.createDataChannel("chat");
    setupDataChannel(channel, peerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log(`Sending offer to peer ${peerId}`);
    await sendSignal({
      type: "offer",
      data: offer,
      from: userId,
      to: peerId,
    });
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    from: string,
  ) => {
    console.log(`Received offer from peer ${from}`);
    // Check if we already have a connection with this peer (renegotiation)
    let pc = peersRef.current.get(from);

    if (!pc) {
      // New connection
      console.log(`Creating new peer connection for ${from}`);
      pc = createPeerConnection(from);

      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, from);
      };
    } else {
      console.log(`Renegotiating existing connection with peer ${from}`);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log(`Set remote offer from peer ${from}`);

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

    console.log(`Sending answer to peer ${from}`);
    await sendSignal({
      type: "answer",
      data: answer,
      from: userId,
      to: from,
    });
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    from: string,
  ) => {
    const pc = peersRef.current.get(from);
    if (!pc) {
      console.error(`No peer connection found for ${from}`);
      return;
    }

    if (pc.signalingState === "have-local-offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Set remote answer from peer ${from}`);

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
    } else {
      console.warn(
        `Received answer from ${from} but signaling state is ${pc.signalingState}, expected "have-local-offer"`,
      );
    }
  };

  const handleIceCandidate = async (
    candidate: RTCIceCandidateInit,
    from: string,
  ) => {
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
  };

  const sendMessage = useCallback(
    (text: string) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        sender: userName,
        text,
        timestamp: new Date(),
      };

      // Add to local messages immediately for the sender
      setMessages((prev) => [...prev, message]);

      // Broadcast to all connected peers (they will add it via onmessage)
      const messageStr = JSON.stringify(message);
      dataChannelsRef.current.forEach((channel) => {
        if (channel.readyState === "open") {
          try {
            channel.send(messageStr);
          } catch (error) {
            console.error("Failed to send message:", error);
          }
        }
      });
    },
    [userName],
  );

  const connectToPeers = useCallback(async () => {
    try {
      const peerIds = members
        .map((m: Member) => m.userId || m.id)
        .filter((id: string) => id !== userId && !peersRef.current.has(id));

      // Create offers to new peers
      for (const peerId of peerIds) {
        await createOffer(peerId);
      }
    } catch (error) {
      console.error("Failed to connect to peers:", error);
    }
  }, [members, userId, createOffer]);

  // Connect to peers when members list changes
  useEffect(() => {
    connectToPeers();
  }, [connectToPeers]);

  // Setup Pusher for real-time signaling
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    // Subscribe to public room channel
    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("webrtc-signal", (signal: SignalData & { to: string }) => {
      console.log("signal data", signal.data);
      // Only process signals intended for this user
      if (signal.to !== userId) return;

      if (signal.type === "offer") {
        handleOffer(signal.data, signal.from);
      } else if (signal.type === "answer") {
        handleAnswer(signal.data, signal.from);
      } else if (signal.type === "ice-candidate") {
        handleIceCandidate(signal.data, signal.from);
      }
    });

    pusherRef.current = pusher;
    channelRef.current = channel;

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();

      // Cleanup peer connections
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      dataChannelsRef.current.clear();
      pendingIceCandidatesRef.current.clear();
    };
  }, [roomId, userId]);

  return {
    messages,
    connectedPeers: Array.from(connectedPeers),
    sendMessage,
    remoteStreams,
  };
}
