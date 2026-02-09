import React from "react";
import Image from "next/image";
import { PictureInPicture, Minimize2, Moon, Sun, LogOut } from "lucide-react";
import { SpeedControlHeader } from "./voice-controls";
import { HeaderProps } from "@/lib/types";

export const ChatHeader: React.FC<HeaderProps> = ({
  isInPiPWindow,
  theme,
  toggleTheme,
  displayName,
  colaborador,
  rate,
  changeRate,
  isSpeaking,
  isPiPMode,
  openPiPWindow,
  closePiPWindow,
  setShowLogoutDialog,
}) => {
  // RENDERIZADO PARA MODO VENTANA FLOTANTE (PiP)
  if (isInPiPWindow) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-20 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}
      >
        <div className="max-w-full mx-auto p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#252527]" : "bg-gray-100"}`}
              >
                <Image
                  src="/icono.webp"
                  alt="Chat"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
              <h2 className="text-sm font-bold truncate">Anfeta Asistente</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className={`w-7 h-7 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                {theme === "light" ? (
                  <Moon className="w-3 h-3" />
                ) : (
                  <Sun className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => window.close()}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700"
              >
                <span className="text-white text-xs font-bold">✕</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDERIZADO PARA MODO NORMAL
  return (
    <>
      {/* Header Principal */}
      <div className=" top-0 left0 right-0 z-20">
        <div
          className={`absolute top-0 left-0 right-0 h-25 bg-gradient-to-b ${
            theme === "dark"
              ? "from-[#101010]/90 via-[#101010]/90 to-transparent"
              : "from-white/70 via-white/40 to-transparent"
          }`}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center justify-between px-4 ">
            <div className="flex items-center gap-3">
              <div className="rounded-full flex items-center justify-center animate-tilt">
                <Image
                  src="/icono.webp"
                  alt="Chat"
                  width={80}
                  height={80}
                  className="rounded-full drop-shadow-[0_0_16px_rgba(168,139,255,0.9)]"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold">Asistente</h1>
                <p
                  className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                >
                  {displayName} • {colaborador.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SpeedControlHeader
                rate={rate}
                changeRate={changeRate}
                isSpeaking={isSpeaking}
                theme={theme}
              />

              <button
                onClick={isPiPMode ? closePiPWindow : openPiPWindow}
                disabled={isInPiPWindow}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isPiPMode
                    ? "bg-red-600"
                    : theme === "dark"
                      ? "bg-[#2a2a2a]"
                      : "bg-gray-100"
                }`}
              >
                {isPiPMode ? (
                  <Minimize2 className="w-4 h-4 text-white" />
                ) : (
                  <PictureInPicture className="w-4 h-4 text-[#6841ea]" />
                )}
              </button>

              <button
                onClick={toggleTheme}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4 text-gray-700" />
                ) : (
                  <Sun className="w-4 h-4 text-gray-300" />
                )}
              </button>

              <button
                onClick={() => setShowLogoutDialog(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === "dark" ? "bg-[#2a2a2a] text-gray-300" : "bg-gray-100 text-gray-700"}`}
              >
                <LogOut className="w-4 h-4 mr-2 inline" /> Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
