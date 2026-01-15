// components/ChatButton.tsx
"use client"

import { useState } from "react"
import { MessageCircle, Sparkles } from "lucide-react"

export function FloatingChatButton() {
  // Solo mostrar si NO estamos dentro de /chat
  if (typeof window !== "undefined" && window.location.pathname === "/chat") {
    return null
  }

  const [isHovered, setIsHovered] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)
  const [showChatButton, setShowChatButton] = useState(true)

  const openChat = () => {
    const chatWindow = window.open(
      "/chat",
      "chatbot",
      "width=450,height=700,resizable=yes"
    )

    if (chatWindow) {
      setShowChatButton(false)
    }
  }


  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isPulsing && (
        <>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 opacity-20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 opacity-30 animate-pulse" />
        </>
      )}
      <button
        onClick={openChat}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group"
        aria-label="Abrir asistente de chat"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center gap-3 pl-5 pr-6 py-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 rounded-full shadow-2xl hover:shadow-violet-400/50 dark:hover:shadow-violet-600/50 transition-all duration-300 transform hover:scale-105 active:scale-95">
          <div className="relative">
            <MessageCircle
              className={`w-6 h-6 text-white transition-all duration-300 ${
                isHovered ? "scale-110 rotate-12" : ""
              }`}
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </div>

          <span className="text-white font-semibold text-base whitespace-nowrap">
            Abrir asistente
          </span>

          <Sparkles
            className={`w-4 h-4 text-yellow-300 transition-all duration-300 ${
              isHovered ? "opacity-100 rotate-180 scale-110" : "opacity-0 scale-50"
            }`}
          />
        </div>

        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-white/20 rounded-full blur-md" />
      </button>
    </div>
  )
}
