// components/chat/ChatInputBar.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Bot, Volume2, X } from "lucide-react";

interface ChatInputBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onVoiceClick: () => void;
  isRecording: boolean;
  isTranscribing?: boolean;
  audioLevel?: number;
  canUserType: boolean;
  theme: "light" | "dark";
  inputRef: React.RefObject<HTMLInputElement | null>;
  chatMode?: "normal" | "ia";
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onToggleChatMode?: () => void;
  isLoadingIA?: boolean;
  isSpeaking?: boolean;
  onStopRecording?: () => void;
}

export function ChatInputBar({
  userInput,
  setUserInput,
  onSubmit,
  isRecording,
  onStartRecording,
  onCancelRecording,
  isTranscribing = false,
  audioLevel = 0,
  canUserType,
  theme,
  inputRef,
  chatMode = "normal",
  isLoadingIA = false,
  onToggleChatMode,
  isSpeaking = false,
}: ChatInputBarProps) {
  // Validar si el usuario puede escribir
  const isInteractionDisabled =
    !canUserType || isSpeaking || isLoadingIA || isTranscribing;
  const hasTopStatus =
    isRecording || isTranscribing || isSpeaking || chatMode === "ia";
  const [isPendingClick, setIsPendingClick] = useState(false);

  const dark = theme === "dark";

  const getPlaceholder = () => {
    if (isTranscribing) return "Transcribiendo...";
    if (isSpeaking) return "Asistente hablando...";
    if (!canUserType) return "Analizando...";
    if (chatMode === "ia") return "Pregunta sobre tus tareas...";
    return "Escribe tu mensaje...";
  };

  const audioLevelPercent = Math.min((audioLevel / 100) * 100, 100);

  const getAudioBarColor = () => {
    if (audioLevel < 10) return dark ? "bg-gray-600" : "bg-gray-300";
    if (audioLevel < 30) return "bg-yellow-500";
    if (audioLevel < 60) return "bg-green-500";
    return "bg-green-600";
  };

  useEffect(() => {
    if (isLoadingIA || isRecording || isTranscribing) {
      setIsPendingClick(false);
    }
  }, [isLoadingIA, isRecording, isTranscribing]);

  const handleMicClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      onCancelRecording();
    } else {
      setIsPendingClick(true); // ← animación inmediata
      onStartRecording();
    }
  };

  const showLoadingAnim = isPendingClick || isLoadingIA;

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-10 border-t ${dark ? "bg-[#101010] border-[#2a2a2a]" : "bg-white border-gray-200"}`}
    >
      <div className="max-w-5xl mx-auto px-2 sm:px-3 py-2">
        {/* Status area */}
        <div
          className={`${hasTopStatus ? "h-10 sm:h-12 mb-1.5" : "h-0 mb-0"} relative overflow-hidden transition-all duration-200 ease-in-out`}
        >
          {/* Grabando */}
          <div
            className={`absolute inset-0 flex items-center transition-opacity duration-200 ${isRecording ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          >
            <div
              className={`w-full rounded-xl overflow-hidden ${dark ? "bg-gradient-to-r from-red-500/15 to-orange-500/15 border border-red-500/30" : "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"}`}
            >
              <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Mic className="w-3.5 h-3.5 text-red-500" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-red-600 truncate">
                    Grabando
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="hidden xs:flex gap-0.5 items-end">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div
                        key={bar}
                        className={`w-0.5 sm:w-1 rounded-full transition-all duration-75 ${audioLevel > bar * 20 ? "h-3 sm:h-4 bg-green-500" : "h-1.5 bg-gray-400 opacity-30"}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={onCancelRecording}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${dark ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300" : "bg-red-100 hover:bg-red-200 text-red-700"}`}
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </button>
                </div>
              </div>
              <div className="px-3 sm:px-4 pb-1.5">
                <div
                  className={`w-full h-1 rounded-full overflow-hidden ${dark ? "bg-gray-800/50" : "bg-gray-200"}`}
                >
                  <div
                    className={`h-full transition-all duration-100 ease-out ${getAudioBarColor()}`}
                    style={{
                      width: `${audioLevelPercent}%`,
                      boxShadow:
                        audioLevel > 30
                          ? "0 0 8px rgba(34, 197, 94, 0.5)"
                          : "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transcribiendo */}
          <div
            className={`absolute inset-0 flex items-center transition-opacity duration-200 ${isTranscribing ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          >
            <div
              className={`w-full px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 sm:gap-3 ${dark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}
            >
              <div className="relative flex-shrink-0">
                <Volume2 className="w-4 h-4 text-blue-500" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              </div>
              <span className="text-xs font-medium text-blue-600 flex-1">
                Procesando audio...
              </span>
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <div
                    key={d}
                    className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hablando */}
          <div
            className={`absolute inset-0 flex items-center transition-opacity duration-200 ${isSpeaking ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          >
            <div
              className={`w-full px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 sm:gap-3 ${dark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-200"}`}
            >
              <div className="relative flex-shrink-0">
                <Volume2 className="w-4 h-4 text-purple-500" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
              </div>
              <span className="text-xs font-medium text-purple-600 flex-1">
                Asistente respondiendo
              </span>
              <div className="flex gap-1">
                {[0, 0.2, 0.4].map((d) => (
                  <div
                    key={d}
                    className="w-1 h-1 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: `${d}s` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Modo IA */}
          <div
            className={`absolute inset-0 flex items-center transition-opacity duration-200 ${chatMode === "ia" && !isRecording && !isTranscribing && !isSpeaking ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          >
            <div
              className={`w-full px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 sm:gap-3 ${dark ? "bg-[#6841ea]/10 border border-[#6841ea]/20" : "bg-purple-50 border border-purple-200"}`}
            >
              <Bot className="w-4 h-4 text-[#6841ea] flex-shrink-0" />
              <span className="text-xs font-medium text-[#6841ea] flex-1">
                Modo Asistente IA
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#6841ea]/20 text-[9px] font-semibold text-[#6841ea] uppercase tracking-wide">
                Beta
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="flex gap-1.5 sm:gap-2 items-center"
        >
          <Input
            ref={inputRef}
            type="text"
            placeholder={getPlaceholder()}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isInteractionDisabled && !isRecording}
            className={`flex-1 h-10 sm:h-11 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] transition-all ${
              dark
                ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea] disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:cursor-not-allowed"
                : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            }`}
          />

          {onToggleChatMode && (
            <Button
              type="button"
              onClick={onToggleChatMode}
              disabled={isInteractionDisabled}
              title={
                isSpeaking
                  ? "Espera a que termine de hablar"
                  : chatMode === "ia"
                    ? "Desactivar IA"
                    : "Activar IA"
              }
              className={`h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                chatMode === "ia"
                  ? "bg-[#6841ea] hover:bg-[#5a36d4] text-white"
                  : dark
                    ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-400 hover:text-white border border-[#353535]"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
              }`}
            >
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}

          <Button
            type="button"
            onClick={handleMicClick}
            disabled={
              isTranscribing ||
              isSpeaking ||
              isLoadingIA ||
              isInteractionDisabled
            }
            title={isRecording ? "Cancelar grabación" : "Grabar audio"}
            className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-full p-0 transition-shadow duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? "bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/40"
                : "bg-gradient-to-br from-[#6841ea] to-[#5a36d4] hover:shadow-lg hover:shadow-[#6841ea]/40"
            }`}
          >
            {showLoadingAnim ? (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 relative z-10" />
              </>
            ) : isRecording ? (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-orange-500/40" />
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
              </>
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
            )}
          </Button>
          <Button
            type="submit"
            disabled={!userInput.trim() || isInteractionDisabled}
            title={
              isSpeaking ? "Espera a que termine de hablar" : "Enviar mensaje"
            }
            className="h-10 w-10 sm:h-11 sm:w-11 p-0 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
