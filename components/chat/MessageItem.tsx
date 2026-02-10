"use client";

import type { Message } from "@/lib/types";
import { Bot, User, Mic, Sparkles } from "lucide-react";
import { useMemo } from "react";

interface MessageItemProps {
  message: Message;
  theme: "light" | "dark";
  onVoiceMessageClick: (voiceText: string) => void;
}

export function MessageItem({
  message,
  theme,
  onVoiceMessageClick,
}: MessageItemProps) {
  // ========== VALORES COMPUTADOS ==========
  const messageStyles = useMemo(() => {
    const baseStyles =
      "rounded-xl px-3.5 py-2.5 min-w-[140px] backdrop-blur-sm transition-all duration-300";

    switch (message.type) {
      case "user":
        return `${baseStyles} bg-gradient-to-br from-[#6841ea] to-[#8b5cf6] text-white ml-auto max-w-[80%] shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30`;

      case "bot":
        return theme === "dark"
          ? `${baseStyles} bg-gradient-to-br from-[#2a2a2a] to-[#333333] text-white max-w-[80%] border border-white/5 shadow-lg hover:border-white/10`
          : `${baseStyles} bg-gradient-to-br from-white to-gray-50 text-gray-900 max-w-[80%] border border-gray-200/80 shadow-md hover:shadow-lg`;

      case "voice":
        return `${baseStyles} cursor-pointer transition-all duration-300 max-w-[80%] group ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#1f1f23] to-[#2a2a2f] border-2 border-[#6841ea]/40 hover:border-[#6841ea]/70 shadow-lg shadow-purple-900/20 hover:shadow-xl hover:shadow-purple-900/30"
            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300/60 hover:border-blue-400 shadow-md hover:shadow-lg"
        } hover:scale-[1.02]`;

      case "system":
        return `${baseStyles} ${
          theme === "dark"
            ? "bg-gradient-to-r from-[#1a1a1a]/80 to-[#1f1f1f]/80 text-gray-400 border border-white/5"
            : "bg-gradient-to-r from-gray-100/80 to-gray-50/80 text-gray-600 border border-gray-200/50"
        } italic text-sm max-w-[80%]`;

      default:
        return `${baseStyles} ${
          theme === "dark"
            ? "bg-[#2a2a2a] text-gray-300"
            : "bg-gray-100 text-gray-700"
        } max-w-[80%]`;
    }
  }, [message.type, theme]);

  const Icon = useMemo(() => {
    switch (message.type) {
      case "user":
        return User;
      case "bot":
        return Bot;
      case "voice":
        return Mic;
      default:
        return null;
    }
  }, [message.type]);

  const isRecentVoice = useMemo(
    () =>
      message.type === "voice" &&
      Date.now() - message.timestamp.getTime() < 2000,
    [message.type, message.timestamp],
  );

  const handleClick = useMemo(
    () =>
      message.type === "voice" && message.voiceText
        ? () => onVoiceMessageClick(message.voiceText!)
        : undefined,
    [message.type, message.voiceText, onVoiceMessageClick],
  );

  // ========== RENDER ==========
  return (
    <div
      className={`flex animate-in slide-in-from-bottom-3 fade-in duration-500 ${
        message.type === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div className="flex flex-col gap-1 max-w-full">
        {/* Avatar y nombre para mensajes no-user */}
        {message.type !== "user" && message.type !== "system" && Icon && (
          <div className="flex items-center gap-1.5 px-0.5">
            <div
              className={`p-1 rounded-lg ${
                message.type === "bot"
                  ? "bg-gradient-to-br from-[#6841ea] to-[#8b5cf6]"
                  : "bg-gradient-to-br from-blue-500 to-indigo-500"
              } shadow-md`}
            >
              <Icon className="w-3 h-3 text-white" />
            </div>
            <span
              className={`text-[10px] font-semibold ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {message.type === "bot" ? "Asistente" : "Mensaje de voz"}
            </span>
          </div>
        )}

        {/* CONTENEDOR PRINCIPAL DEL MENSAJE */}
        <div className={messageStyles} onClick={handleClick}>
          {/* Contenido del mensaje */}
          <div className="flex items-start gap-2">
            {/* Icono decorativo solo para bot */}
            {message.type === "bot" && (
              <Sparkles className="w-3.5 h-3.5 text-[#6841ea] mt-0.5 shrink-0 animate-pulse" />
            )}
            
            {/* Contenido principal */}
            <div className="flex-1 min-w-0">
              <MessageContent content={message.content} theme={theme} />
              
              {/* Indicador de voz reciente */}
              {isRecentVoice && <VoiceIndicator />}
              
              {/* Timestamp */}
              {message.type !== "system" && (
                <Timestamp
                  timestamp={message.timestamp}
                  isUser={message.type === "user"}
                  theme={theme}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== COMPONENTES AUXILIARES ==========
interface MessageContentProps {
  content: string | React.ReactNode;
  theme: "light" | "dark";
}

function MessageContent({ content, theme }: MessageContentProps) {
  if (typeof content === "string") {
    return (
      <p
        className={`text-sm leading-relaxed whitespace-pre-wrap break-words font-medium ${
          theme === "dark" ? "text-gray-100" : "text-gray-800"
        }`}
      >
        {content}
      </p>
    );
  }
  return <div className="text-sm font-medium">{content}</div>;
}

function VoiceIndicator() {
  return (
    <div className="flex gap-1.5 mt-2 items-center">
      <div className="flex gap-1">
        {[0, 100, 200].map((delay) => (
          <div
            key={delay}
            className="w-0.5 h-2.5 bg-gradient-to-t from-[#6841ea] to-[#8b5cf6] rounded-full animate-pulse"
            style={{
              animationDelay: `${delay}ms`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
      <span className="text-[9px] text-[#6841ea] font-semibold animate-pulse">
        Procesando voz...
      </span>
    </div>
  );
}

interface TimestampProps {
  timestamp: Date;
  isUser: boolean;
  theme: "light" | "dark";
}

function Timestamp({ timestamp, isUser, theme }: TimestampProps) {
  const timeString = useMemo(
    () =>
      timestamp.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [timestamp],
  );

  return (
    <p
      className={`text-[10px] mt-1.5 font-semibold tracking-wide ${
        isUser
          ? "text-white/70 text-right"
          : theme === "dark"
          ? "text-gray-500"
          : "text-gray-400"
      }`}
    >
      {timeString}
    </p>
  );
}