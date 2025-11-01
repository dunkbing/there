"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";

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
    <Card className="backdrop-blur-xl border bg-white rounded-2xl p-4 flex flex-col h-[500px]">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Chat</h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-black/10 rounded-lg p-3">
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
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <Button
          onClick={sendMessage}
          size={"icon"}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
