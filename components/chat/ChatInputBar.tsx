// components/chat/ChatInputBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Bot, Volume2 } from "lucide-react";

interface ChatInputBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onVoiceClick: () => void;
  isRecording: boolean;
  canUserType: boolean;
  theme: "light" | "dark";
  inputRef: React.RefObject<HTMLInputElement | null>;
  chatMode?: "normal" | "ia";
  onToggleChatMode?: () => void;
  isSpeaking?: boolean; // ✅ Nueva prop
}

export function ChatInputBar({
  userInput,
  setUserInput,
  onSubmit,
  onVoiceClick,
  isRecording,
  canUserType,
  theme,
  inputRef,
  chatMode = "normal",
  onToggleChatMode,
  isSpeaking = false, // ✅ Nueva prop con valor por defecto
}: ChatInputBarProps) {
  // ✅ Determinar si se puede interactuar
  const isInteractionDisabled = !canUserType || isSpeaking;

  const getPlaceholder = () => {
    if (isSpeaking) return "El asistente está hablando...";
    if (!canUserType) return "Obteniendo análisis...";
    if (chatMode === "ia") return "Pregunta al asistente sobre tus tareas...";
    return "Escribe tu pregunta o comentario...";
  };

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-10 border-t ${
        theme === "dark"
          ? "bg-[#101010] border-[#2a2a2a]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="max-w-5xl mx-auto p-3">
        {/* Indicador de modo IA */}
        {chatMode === "ia" && !isSpeaking && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
              theme === "dark"
                ? "bg-[#6841ea]/10 border border-[#6841ea]/20"
                : "bg-purple-50 border border-purple-200"
            }`}
          >
            <Bot className="w-4 h-4 text-[#6841ea]" />
            <span className="text-xs font-medium text-[#6841ea]">
              Modo Asistente IA Activado
            </span>
          </div>
        )}

        {/* ✅ Indicador cuando el bot está hablando */}
        {isSpeaking && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
              theme === "dark"
                ? "bg-blue-500/10 border border-blue-500/20"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-500">
              El asistente está hablando...
            </span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            type="text"
            placeholder={getPlaceholder()}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isInteractionDisabled} // ✅ Bloqueado si está hablando
            className={`flex-1 h-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] transition-all ${
              theme === "dark"
                ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea] disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:cursor-not-allowed"
                : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            }`}
          />

          {/* Botón de modo IA */}
          {onToggleChatMode && (
            <Button
              type="button"
              onClick={onToggleChatMode}
              disabled={isInteractionDisabled} // ✅ Bloqueado si está hablando
              className={`h-12 w-12 p-0 rounded-lg transition-all ${
                chatMode === "ia"
                  ? "bg-[#6841ea] hover:bg-[#5a36d4] text-white"
                  : theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-400 hover:text-white border border-[#353535]"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={
                isSpeaking
                  ? "Espera a que termine de hablar"
                  : chatMode === "ia"
                    ? "Desactivar IA"
                    : "Activar IA"
              }
            >
              <Bot
                className={`w-5 h-5 ${chatMode === "ia" ? "text-white" : ""}`}
              />
            </Button>
          )}

          {/* Botón de voz */}
          <Button
            type="button"
            onClick={onVoiceClick}
            disabled={isInteractionDisabled} // ✅ Bloqueado si está hablando
            className={`h-12 w-12 p-0 rounded-lg transition-all ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-[#6841ea] hover:bg-[#5a36d4]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={
              isSpeaking
                ? "Espera a que termine de hablar"
                : isRecording
                  ? "Detener reconocimiento de voz"
                  : "Iniciar reconocimiento de voz"
            }
          >
            {isRecording ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                <MicOff className="w-5 h-5 text-white relative z-10" />
              </div>
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </Button>

          {/* Botón de enviar */}
          <Button
            type="submit"
            disabled={!userInput.trim() || isInteractionDisabled} // ✅ Bloqueado si está hablando
            className="h-12 w-12 p-0 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={
              isSpeaking ? "Espera a que termine de hablar" : "Enviar mensaje"
            }
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
