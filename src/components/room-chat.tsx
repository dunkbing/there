"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Input } from "./ui/input";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface RoomChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export function RoomChat({
  messages: chatMessages,
  onSendMessage,
}: RoomChatProps) {
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = useCallback(() => {
    if (chatInput.trim()) {
      onSendMessage(chatInput);
      setChatInput("");
    }
  }, [chatInput, onSendMessage]);

  return (
    <div className="  flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-black/5 rounded-lg p-3">
        {chatMessages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
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
                  {new Date(msg.timestamp).toLocaleTimeString([], {
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
        <Input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <Button
          onClick={sendMessage}
          size={"icon"}
          className="bg-primary aspect-square h-full hover:bg-primary/90"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
