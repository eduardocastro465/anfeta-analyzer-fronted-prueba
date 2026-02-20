"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import { MessageListProps } from "@/lib/types";
import { TypingIndicator } from "./PanelReporteTareasTarde";

interface ExtendedMessageListProps extends MessageListProps {
  onVoiceMessageClick?: (voiceText: string) => void;
}

export function MessageList({
  messages,
  isTyping,
  theme,
  onVoiceMessageClick,
  scrollRef,
}: ExtendedMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, isTyping]);
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 space-y-3 sm:space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          theme={theme}
          onVoiceMessageClick={onVoiceMessageClick}
        />
      ))}
      <div ref={bottomRef} />

      {isTyping && <TypingIndicator theme={theme} />}
    </div>
  );
}
