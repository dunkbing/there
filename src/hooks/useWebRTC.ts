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
}

export function useWebRTC(
  roomId: string,
  userId: string,
  userName: string,
  members: Member[] = []
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

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
      if (pc.connectionState === "connected") {
        setConnectedPeers((prev) => new Set(prev).add(peerId));
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setConnectedPeers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(peerId);
          return newSet;
        });
      }
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [userId]);

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

  const setupDataChannel = useCallback((channel: RTCDataChannel, peerId: string) => {
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
  }, []);

  const createOffer = async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    const channel = pc.createDataChannel("chat");
    setupDataChannel(channel, peerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendSignal({
      type: "offer",
      data: offer,
      from: userId,
      to: peerId,
    });
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    const pc = createPeerConnection(from);

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel, from);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

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
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    const pc = peersRef.current.get(from);
    if (pc && pc.signalingState === "have-local-offer") {
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
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
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

  const pollSignals = useCallback(async () => {
    try {
      const response = await fetch(`/api/webrtc/signal?roomId=${roomId}&userId=${userId}`);
      if (response.ok) {
        const signals: SignalData[] = await response.json();

        for (const signal of signals) {
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
      console.error("Failed to poll signals:", error);
    }
  }, [roomId, userId]);

  const sendMessage = useCallback((text: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: userName,
      text,
      timestamp: new Date(),
    };

    // Add to local messages
    setMessages((prev) => [...prev, message]);

    // Broadcast to all connected peers
    const messageStr = JSON.stringify(message);
    dataChannelsRef.current.forEach((channel) => {
      if (channel.readyState === "open") {
        channel.send(messageStr);
      }
    });
  }, [userName]);

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

  // Start polling for signals
  useEffect(() => {
    pollingIntervalRef.current = setInterval(() => {
      pollSignals();
    }, 5000); // Poll every 5 seconds instead of 2

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Cleanup peer connections
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      dataChannelsRef.current.clear();
      pendingIceCandidatesRef.current.clear();
    };
  }, [pollSignals]);

  return {
    messages,
    connectedPeers: Array.from(connectedPeers),
    sendMessage,
  };
}
