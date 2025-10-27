"use client";

import { createContext, useContext } from "react";
import type { RoomMemberWithRelations } from "@/lib/schemas";

export type MainContentType = "default" | "screen-share" | "whiteboard";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

export interface MeetingControls {
  isMicOn: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  mainContent: MainContentType;
  toggleMic: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleWhiteboard: () => void;
}

export interface RoomContextValue {
  roomId: string;
  members: RoomMemberWithRelations[];
  currentUserId: string;
  currentUserName: string;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  setChatSender: (sender: (text: string) => void) => void;
  updateChatMessages: (messages: ChatMessage[]) => void;
  meetingControls: MeetingControls | null;
  registerMeetingControls: (controls: MeetingControls | null) => void;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoomContext(): RoomContextValue {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoomContext must be used within a RoomContext.Provider");
  }
  return context;
}
