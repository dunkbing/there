"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard";
import { Video, Mic, MicOff, VideoOff, Phone, Pencil } from "lucide-react";

export function MeetingWorkspace() {
  const [participants, setParticipants] = useState(1);
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

      {/* Whiteboard Tab */}
      {activeTab === "whiteboard" && (
        <div className="space-y-4">
          <Whiteboard />
        </div>
      )}
    </div>
  );
}
