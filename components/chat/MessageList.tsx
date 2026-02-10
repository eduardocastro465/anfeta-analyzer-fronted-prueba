"use client";

import { MessageItem } from "./MessageItem";
import { MessageListProps } from "@/lib/types";
import { TypingIndicator } from "./Taskspanelcontent";

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
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Lista de mensajes */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          theme={theme}
          onVoiceMessageClick={onVoiceMessageClick}
        />
      ))}

      {/* Indicador de typing */}
      {isTyping && <TypingIndicator theme={theme} />}
    </div>
  );
}
