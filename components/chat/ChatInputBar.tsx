// components/chat/ChatInputBar.tsx
import React from "react";
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
  const isInteractionDisabled =
    !canUserType || isSpeaking || isLoadingIA || isTranscribing;

  const getPlaceholder = () => {
    if (isTranscribing) return "Transcribiendo...";
    if (isSpeaking) return "Asistente hablando...";
    if (!canUserType) return "Analizando...";
    if (chatMode === "ia") return "Pregunta sobre tus tareas...";
    return "Escribe tu mensaje...";
  };

  const audioLevelPercent = Math.min((audioLevel / 100) * 100, 100);

  const getAudioBarColor = () => {
    if (audioLevel < 10)
      return theme === "dark" ? "bg-gray-600" : "bg-gray-300";
    if (audioLevel < 30) return "bg-yellow-500";
    if (audioLevel < 60) return "bg-green-500";
    return "bg-green-600";
  };

  return (
    <div
      className={`
        sticky bottom-0 left-0 right-0 z-10 
        border-t
        ${
          theme === "dark"
            ? "bg-[#101010] border-[#2a2a2a]"
            : "bg-white border-gray-200"
        }
      `}
    >
      <div className="max-w-5xl mx-auto px-2 sm:px-3 py-2">
        {/* ✅ CONTENEDOR CON ALTURA ABSOLUTA FIJA */}
        <div className="h-16 sm:h-[72px] mb-2 relative overflow-hidden">
          {/* Estado: Grabando */}
          <div
            className={`
              absolute inset-0 flex items-center
              transition-opacity duration-200
              ${isRecording ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            `}
          >
            <div
              className={`
                w-full rounded-xl overflow-hidden
                ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-red-500/15 to-orange-500/15 border border-red-500/30"
                    : "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
                }
              `}
            >
              {/* Header */}
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-red-600 truncate">
                    Grabando
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* Nivel de audio */}
                  <div className="hidden xs:flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <div
                          key={bar}
                          className={`w-0.5 sm:w-1 rounded-full transition-all duration-75 ${
                            audioLevel > bar * 20
                              ? "h-3 sm:h-4 bg-green-500"
                              : "h-1.5 sm:h-2 bg-gray-400 opacity-30"
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-mono ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {Math.round(audioLevel)}
                    </span>
                  </div>

                  {/* Botón cancelar */}
                  <button
                    onClick={onCancelRecording}
                    className={`
                      flex items-center gap-1 sm:gap-1.5 
                      px-2 sm:px-2.5 py-1 
                      rounded-lg 
                      text-[10px] sm:text-xs 
                      font-medium transition-all
                      ${
                        theme === "dark"
                          ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300"
                          : "bg-red-100 hover:bg-red-200 text-red-700"
                      }
                    `}
                  >
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </button>
                </div>
              </div>

              {/* Barra de nivel de audio */}
              <div className="px-3 sm:px-4 pb-1.5 sm:pb-2">
                <div
                  className={`w-full h-1.5 sm:h-2 rounded-full overflow-hidden ${
                    theme === "dark" ? "bg-gray-800/50" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-100 ease-out ${getAudioBarColor()} shadow-sm`}
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

          {/* Estado: Transcribiendo */}
          <div
            className={`
              absolute inset-0 flex items-center
              transition-opacity duration-200
              ${isTranscribing ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            `}
          >
            <div
              className={`
                w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg 
                flex items-center gap-2 sm:gap-3 
                ${
                  theme === "dark"
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-blue-50 border border-blue-200"
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-blue-600 truncate block">
                  Procesando audio...
                </span>
                <div className="flex gap-1 mt-1">
                  <div
                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Estado: Hablando */}
          <div
            className={`
              absolute inset-0 flex items-center
              transition-opacity duration-200
              ${isSpeaking ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            `}
          >
            <div
              className={`
                w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg 
                flex items-center gap-2 sm:gap-3 
                ${
                  theme === "dark"
                    ? "bg-purple-500/10 border border-purple-500/20"
                    : "bg-purple-50 border border-purple-200"
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-purple-600 truncate block">
                  Asistente respondiendo
                </span>
                <div className="flex gap-1 mt-1">
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                  <div
                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Estado: Modo IA */}
          <div
            className={`
              absolute inset-0 flex items-center
              transition-opacity duration-200
              ${chatMode === "ia" && !isRecording && !isTranscribing && !isSpeaking ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            `}
          >
            <div
              className={`
                w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg 
                flex items-center gap-2 sm:gap-3 
                ${
                  theme === "dark"
                    ? "bg-[#6841ea]/10 border border-[#6841ea]/20"
                    : "bg-purple-50 border border-purple-200"
                }
              `}
            >
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#6841ea] flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-[#6841ea] truncate flex-1">
                Modo Asistente IA
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#6841ea]/20 text-[9px] sm:text-[10px] font-semibold text-[#6841ea] uppercase tracking-wide flex-shrink-0">
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
            disabled={isInteractionDisabled}
            className={`
              flex-1 h-10 sm:h-12 
              border rounded-lg 
              text-sm sm:text-base
              focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] 
              transition-all
              ${
                theme === "dark"
                  ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea] disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:cursor-not-allowed"
                  : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              }
            `}
          />

          {/* Botón de modo IA */}
          {onToggleChatMode && (
            <Button
              type="button"
              onClick={onToggleChatMode}
              disabled={isInteractionDisabled}
              className={`
                h-10 w-10 sm:h-12 sm:w-12 
                p-0 rounded-lg transition-all
                ${
                  chatMode === "ia"
                    ? "bg-[#6841ea] hover:bg-[#5a36d4] text-white"
                    : theme === "dark"
                      ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-400 hover:text-white border border-[#353535]"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
                } 
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title={
                isSpeaking
                  ? "Espera a que termine de hablar"
                  : chatMode === "ia"
                    ? "Desactivar IA"
                    : "Activar IA"
              }
            >
              <Bot
                className={`w-4 h-4 sm:w-5 sm:h-5 ${chatMode === "ia" ? "text-white" : ""}`}
              />
            </Button>
          )}

          {/* Botón de micrófono */}
          <Button
            type="button"
            onClick={isRecording ? onCancelRecording : onStartRecording}
            disabled={isTranscribing || isSpeaking || isLoadingIA}
            className={`
              relative 
              h-10 w-10 sm:h-11 sm:w-11 
              rounded-full p-0
              transition-shadow duration-200
              ${
                isRecording
                  ? "bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/40"
                  : "bg-gradient-to-br from-[#6841ea] to-[#5a36d4] hover:shadow-lg hover:shadow-[#6841ea]/40"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={isRecording ? "Cancelar grabación" : "Grabar audio"}
          >
            {isRecording ? (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-orange-500/40" />
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
              </>
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white relative z-10" />
            )}
          </Button>

          {/* Botón de enviar */}
          <Button
            type="submit"
            disabled={!userInput.trim() || isInteractionDisabled}
            className="
              h-10 w-10 sm:h-12 sm:w-12 
              p-0 
              bg-[#6841ea] hover:bg-[#5a36d4] 
              text-white rounded-lg 
              disabled:opacity-50 disabled:cursor-not-allowed 
              transition-all
            "
            title={
              isSpeaking ? "Espera a que termine de hablar" : "Enviar mensaje"
            }
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
