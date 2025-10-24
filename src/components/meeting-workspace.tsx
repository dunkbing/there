"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Copy,
  Share2,
  Video,
  MessageSquare,
  Users,
  Send,
  Mic,
  MicOff,
  VideoOff,
  Phone,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

export function MeetingWorkspace() {
  const [roomId, setRoomId] = useState(
    "focus-" + Math.random().toString(36).substr(2, 9),
  );
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [activeTab, setActiveTab] = useState<"info" | "chat" | "video">("info");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = () => {
    if (chatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: "You",
        text: chatInput,
        timestamp: new Date(),
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatInput("");
    }
  };

  const startVideoCall = async () => {
    try {
      if (!isInCall) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setIsInCall(true);
        setParticipants(2);

        // Simulate receiving a participant
        setTimeout(() => {
          const joinMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: "System",
            text: "A participant joined the call",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, joinMessage]);
        }, 1000);
      } else {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (
            videoRef.current.srcObject as MediaStream
          ).getTracks();
          tracks.forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
        setIsInCall(false);
        setParticipants(1);
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Unable to access camera/microphone. Please check permissions.");
    }
  };

  const toggleMic = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (
        videoRef.current.srcObject as MediaStream
      ).getAudioTracks();
      tracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (
        videoRef.current.srcObject as MediaStream
      ).getVideoTracks();
      tracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "info"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Room Info
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "chat"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Chat
        </button>
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
      </div>

      {/* Room Info Tab */}
      {activeTab === "info" && (
        <Card className="bg-gradient-to-br from-card to-secondary/10 border-border p-6">
          <h2 className="text-2xl font-bold mb-6">Meeting Workspace</h2>

          <div className="space-y-6">
            {/* Room ID */}
            <div>
              <label className="block text-sm font-medium mb-2">Room ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  readOnly
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
                />
                <Button
                  onClick={copyRoomLink}
                  variant="outline"
                  className="gap-2 bg-transparent"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Share Link */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}?room=${roomId}`}
                  readOnly
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm truncate"
                />
                <Button
                  onClick={copyRoomLink}
                  variant="outline"
                  className="gap-2 bg-transparent"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            {/* Participants */}
            <div className="p-4 bg-secondary/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold">
                  {participants} participant{participants !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Invite others to join your focus session
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setActiveTab("video")}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <Video className="w-4 h-4" />
                Start Video
              </Button>
              <Button
                onClick={() => setActiveTab("chat")}
                variant="outline"
                className="gap-2 bg-transparent"
              >
                <MessageSquare className="w-4 h-4" />
                Open Chat
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Share2 className="w-4 h-4" />
                Share Screen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <Card className="bg-card border-border p-6 flex flex-col h-96">
          <h3 className="text-lg font-semibold mb-4">Chat</h3>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-secondary/5 rounded-lg p-4">
            {chatMessages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No messages yet. Start chatting!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {msg.sender}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={sendMessage}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Video Tab */}
      {activeTab === "video" && (
        <div className="space-y-4">
          <Card className="bg-card border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Video Call</h3>

            {/* Video Preview */}
            <div className="bg-black rounded-lg overflow-hidden mb-4 aspect-video flex items-center justify-center">
              {isInCall ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Camera is off</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={startVideoCall}
                className={`gap-2 ${isInCall ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}`}
              >
                {isInCall ? (
                  <>
                    <Phone className="w-4 h-4" />
                    End Call
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Start Call
                  </>
                )}
              </Button>

              {isInCall && (
                <>
                  <Button
                    onClick={toggleMic}
                    variant="outline"
                    className={`gap-2 ${!isMicOn ? "bg-destructive/10 text-destructive" : ""}`}
                  >
                    {isMicOn ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <MicOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    onClick={toggleVideo}
                    variant="outline"
                    className={`gap-2 ${!isVideoOn ? "bg-destructive/10 text-destructive" : ""}`}
                  >
                    {isVideoOn ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <VideoOff className="w-4 h-4" />
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Participants */}
            <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
              <p className="text-sm font-medium mb-2">
                Participants: {participants}
              </p>
              <p className="text-xs text-muted-foreground">
                {isInCall
                  ? "You are in a call"
                  : "Start a call to invite others"}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-primary/5 border border-primary/20 p-6">
        <p className="text-sm text-foreground">
          <span className="font-semibold">Pro Tip:</span> Use the meeting
          workspace to stay accountable with friends or colleagues. Share your
          room link and focus together!
        </p>
      </Card>
    </div>
  );
}
