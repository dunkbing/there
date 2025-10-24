"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard";
import { Video, Mic, MicOff, VideoOff, Pencil } from "lucide-react";

export function MeetingWorkspace() {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard">("video");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const toggleMic = async () => {
    try {
      if (!stream) {
        // Request microphone permission
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Merge with existing video stream if available
        if (videoRef.current?.srcObject) {
          const existingStream = videoRef.current.srcObject as MediaStream;
          const audioTrack = newStream.getAudioTracks()[0];
          existingStream.addTrack(audioTrack);
          setStream(existingStream);
        } else {
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
          setStream(newStream);
        }

        setIsMicOn(true);
      } else {
        // Toggle existing microphone
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const newState = !isMicOn;
          audioTracks.forEach((track) => {
            track.enabled = newState;
          });
          setIsMicOn(newState);
        } else {
          // No audio track, request permission
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          const audioTrack = audioStream.getAudioTracks()[0];
          stream.addTrack(audioTrack);
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
      if (!stream) {
        // Request camera permission
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setStream(newStream);
        setIsVideoOn(true);
      } else {
        // Toggle existing video
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
          const newState = !isVideoOn;
          videoTracks.forEach((track) => {
            track.enabled = newState;
          });
          setIsVideoOn(newState);
        } else {
          // No video track, request permission
          const videoStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
          const videoTrack = videoStream.getVideoTracks()[0];
          stream.addTrack(videoTrack);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
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
            <h3 className="text-lg font-semibold mb-4">Video Call</h3>

            {/* Video Preview */}
            <div className="bg-black rounded-lg overflow-hidden mb-4 aspect-video flex items-center justify-center relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Camera is off</p>
                  </div>
                </div>
              )}
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
