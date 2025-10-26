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
  onUserLeft?: (userId: string) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [streamUpdateCounter, setStreamUpdateCounter] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);

  // Update local stream ref
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//localhost:8080/api/signal/ws?clientId=${userId}&room=${roomId}`;
    console.log(`[WS] Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected, sending join");
      ws.send(JSON.stringify({ type: "join", clientId: userId }));
    };

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      const { type, clientId: peerId } = data;

      console.log(`[WS] Received ${type} from ${peerId}`);

      // Get or create peer connection
      let pc = peersRef.current[peerId];
      if (!pc && type !== "disconnect") {
        console.log(`[WebRTC] Creating peer connection for ${peerId}`);
        pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local stream tracks (if available)
        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks();
          console.log(`[WebRTC] Adding ${tracks.length} local tracks for ${peerId}:`, tracks.map(t => t.kind));
          for (const track of tracks) {
            pc.addTrack(track, localStreamRef.current);
          }
        } else {
          console.log(`[WebRTC] No local stream available when creating peer for ${peerId}`);
        }

        // Handle remote tracks
        // Store stream reference per peer to detect when it changes
        const streamRefs = new Map<string, MediaStream>();

        pc.ontrack = (event) => {
          console.log(`[WebRTC] 🎥 Received ${event.track.kind} track from ${peerId}`, {
            trackId: event.track.id,
            trackState: event.track.readyState,
            streamCount: event.streams?.length || 0,
          });

          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            let stream = newMap.get(peerId);

            // If peer sent us a stream, use it
            if (event.streams && event.streams[0]) {
              const peerStream = event.streams[0];

              // Check if this is a different stream than what we had before
              const previousStream = streamRefs.get(peerId);
              if (!previousStream || previousStream !== peerStream) {
                console.log(`[WebRTC] New stream from ${peerId} with ${peerStream.getTracks().length} tracks:`,
                  peerStream.getTracks().map(t => `${t.kind}(${t.readyState})`));
                streamRefs.set(peerId, peerStream);
                newMap.set(peerId, peerStream);
              } else {
                console.log(`[WebRTC] Track added to existing stream for ${peerId}, total tracks: ${peerStream.getTracks().length}`);
                // Stream is the same, but trigger React update anyway
                newMap.set(peerId, peerStream);
              }
            } else {
              // Fallback: create our own stream and add the track
              if (!stream) {
                stream = new MediaStream();
                console.log(`[WebRTC] Creating new remote stream for ${peerId}`);
              }

              if (!stream.getTrackById(event.track.id)) {
                stream.addTrack(event.track);
                console.log(`[WebRTC] ✅ Added ${event.track.kind} track to remote stream for ${peerId}`);
              }

              console.log(`[WebRTC] Remote stream for ${peerId} now has ${stream.getTracks().length} tracks:`,
                stream.getTracks().map(t => `${t.kind}(${t.readyState})`));

              newMap.set(peerId, stream);
            }

            return newMap;
          });

          // Force React update even if stream object is the same
          setStreamUpdateCounter(c => c + 1);
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC] Peer ${peerId} connection state: ${pc.connectionState}`);
        };

        peersRef.current[peerId] = pc;
      }

      switch (type) {
        case "join": {
          // Someone joined - create data channel and offer
          console.log(`[WebRTC] Sending offer to ${peerId}`);

          // Create data channel for chat (offerer creates it)
          const dataChannel = pc.createDataChannel("chat");
          dataChannel.onopen = () => {
            console.log(`[WebRTC] Data channel opened with ${peerId}`);
            dataChannelsRef.current.set(peerId, dataChannel);
          };
          dataChannel.onmessage = (event) => {
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
              console.error("Failed to parse chat message:", error);
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              ws.send(
                JSON.stringify({
                  type: "offer",
                  data: event.candidate.toJSON(),
                  clientId: peerId,
                }),
              );
            }
          };

          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);

          const senderTracks = pc.getSenders().map(s => s.track?.kind || 'none');
          console.log(`[WebRTC] Created offer for ${peerId} with tracks:`, senderTracks);

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
          console.log(`[WebRTC] Received ${isRenegotiation ? 'renegotiation' : 'initial'} offer from ${peerId}, sending answer`);

          // Ensure we have our local tracks in the peer connection before answering
          // (applies to both initial offers and renegotiation)
          if (localStreamRef.current) {
            const existingSenders = pc.getSenders();
            const existingTrackKinds = existingSenders.map(s => s.track?.kind).filter(Boolean);
            const localTrackKinds = localStreamRef.current.getTracks().map(t => t.kind);

            console.log(`[WebRTC] Checking tracks before answer - existing:`, existingTrackKinds, `local:`, localTrackKinds);

            // Add any local tracks that aren't already in the peer connection
            for (const track of localStreamRef.current.getTracks()) {
              const hasSenderForTrack = existingSenders.some(s => s.track?.id === track.id);
              if (!hasSenderForTrack) {
                console.log(`[WebRTC] Adding missing ${track.kind} track before creating answer`);
                pc.addTrack(track, localStreamRef.current);
              }
            }
          } else {
            console.log(`[WebRTC] ⚠️ No local stream when answering offer from ${peerId}`);
          }

          // Handle data channel (answerer receives it)
          pc.ondatachannel = (event) => {
            const dataChannel = event.channel;
            dataChannel.onopen = () => {
              console.log(`[WebRTC] Data channel opened with ${peerId}`);
              dataChannelsRef.current.set(peerId, dataChannel);
            };
            dataChannel.onmessage = (event) => {
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
                console.error("Failed to parse chat message:", error);
              }
            };
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              ws.send(
                JSON.stringify({
                  type: "answer",
                  data: event.candidate.toJSON(),
                  clientId: peerId,
                }),
              );
            }
          };

          const offerDescription = new RTCSessionDescription(data.data);
          await pc.setRemoteDescription(offerDescription);

          const answerDescription = await pc.createAnswer();
          await pc.setLocalDescription(answerDescription);

          const senderTracks = pc.getSenders().map(s => s.track?.kind || 'none');
          console.log(`[WebRTC] Created answer for ${peerId} with tracks:`, senderTracks);

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
          // Received answer
          console.log(`[WebRTC] Received answer from ${peerId}`);
          if (!pc.currentRemoteDescription && data.data) {
            const answerDescription = new RTCSessionDescription(data.data);
            await pc.setRemoteDescription(answerDescription);
          }
          break;
        }

        case "offer": {
          // ICE candidate from offerer
          if (data.data) {
            const candidate = new RTCIceCandidate(data.data);
            await pc.addIceCandidate(candidate);
          }
          break;
        }

        case "answer": {
          // ICE candidate from answerer
          if (data.data) {
            const candidate = new RTCIceCandidate(data.data);
            await pc.addIceCandidate(candidate);
          }
          break;
        }

        case "disconnect": {
          console.log(`[WebRTC] Peer ${peerId} disconnected`);
          if (peersRef.current[peerId]) {
            peersRef.current[peerId].close();
            delete peersRef.current[peerId];
          }
          dataChannelsRef.current.delete(peerId);
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
          });
          if (onUserLeft) {
            onUserLeft(peerId);
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
    };

    return () => {
      // Cleanup
      ws.close();
      Object.values(peersRef.current).forEach((pc) => {
        pc.close();
      });
      peersRef.current = {};
      dataChannelsRef.current.clear();
    };
  }, [roomId, userId, onUserLeft]);

  // Update tracks on existing peer connections when localStream changes
  useEffect(() => {
    if (Object.keys(peersRef.current).length === 0) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    console.log("[WebRTC] Local stream changed, updating tracks on existing peers");

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
            console.log(`[WebRTC] Replacing ${kind} track for peer ${peerId}`);
            sender.replaceTrack(newTrack || null).catch((e) => {
              console.error(`Failed to replace ${kind} track for peer ${peerId}:`, e);
            });
          }
        } else if (newTrack && localStream) {
          // No sender for this kind - add track (requires renegotiation)
          console.log(`[WebRTC] Adding new ${kind} track to peer ${peerId}`);
          pc.addTrack(newTrack, localStream);
          needsRenegotiation = true;
        }
      });

      // If we added new tracks, renegotiate
      if (needsRenegotiation) {
        try {
          console.log(`[WebRTC] Renegotiating with peer ${peerId} due to new tracks`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          const senderTracks = pc.getSenders().map(s => ({
            kind: s.track?.kind || 'none',
            id: s.track?.id.substring(0, 8) || 'none'
          }));
          console.log(`[WebRTC] Renegotiation offer to ${peerId} includes tracks:`, senderTracks);

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
          console.error(`[WebRTC] Failed to renegotiate with peer ${peerId}:`, error);
        }
      }
    });
  }, [localStream]);

  return {
    messages,
    connectedPeers: Object.keys(peersRef.current),
    sendMessage,
    remoteStreams,
    streamUpdateCounter, // Force re-renders when tracks are added to streams
  };
}
