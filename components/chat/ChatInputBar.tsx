// components/chat/ChatInputBar.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, MicOff } from 'lucide-react';

interface ChatInputBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onVoiceClick: () => void;
  isRecording: boolean;
  canUserType: boolean;
  theme: 'light' | 'dark';
   inputRef: React.RefObject<HTMLInputElement | null>;
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
}: ChatInputBarProps) {
  return (
    <div className={`bottom-0 left-0 right-0 z-10 ${theme === 'dark' ? 'bg-[#101010]' : 'bg-white'}`}>
      <div className="max-w-5xl mx-auto p-3">
        <form onSubmit={onSubmit} className="flex gap-4 items-center">
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              canUserType
                ? 'Escribe tu pregunta o comentario...'
                : 'Obteniendo análisis...'
            }
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className={`flex-1 h-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea]'
                : 'bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea]'
            }`}
          />
          <Button
            type="button"
            onClick={onVoiceClick}
            className={`h-12 w-14 p-0 rounded-lg transition-all ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-[#6841ea] hover:bg-[#5a36d4]'
            }`}
            title={
              isRecording
                ? 'Detener reconocimiento de voz'
                : 'Iniciar reconocimiento de voz'
            }
          >
            {isRecording ? (
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                <MicOff className="w-5 h-5 text-white relative z-10" />
              </div>
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </Button>
          <Button
            type="submit"
            disabled={!canUserType || !userInput.trim()}
            className="h-12 px-5 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}