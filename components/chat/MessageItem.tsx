import type { Message } from '@/lib/types';

interface MessageItemProps {
  message: Message;
  theme: 'light' | 'dark';
  onVoiceMessageClick: (voiceText: string) => void;
}

export function MessageItem({
  message,
  theme,
  onVoiceMessageClick,
}: MessageItemProps) {
  const getMessageStyles = () => {
    switch (message.type) {
      case 'user':
        return 'bg-[#6841ea] text-white justify-end';
      case 'bot':
        return theme === 'dark'
          ? 'bg-[#2a2a2a] text-white justify-start'
          : 'bg-gray-100 text-gray-900 justify-start';
      case 'voice':
        return `cursor-pointer hover:opacity-90 transition justify-start ${
          theme === 'dark' ? 'bg-[#252527]' : 'bg-blue-50'
        }`;
      default:
        return theme === 'dark'
          ? 'bg-[#2a2a2a] text-gray-300 justify-start'
          : 'bg-gray-100 text-gray-700 justify-start';
    }
  };

  return (
    <div className={`flex animate-in slide-in-from-bottom-2 duration-300 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${getMessageStyles()}`}
        onClick={
          message.type === 'voice' && message.voiceText
            ? () => onVoiceMessageClick(message.voiceText!)
            : undefined
        }
      >
        {message.content}
        {message.type === 'voice' &&
          Date.now() - message.timestamp.getTime() < 2000 && (
            <div className="flex gap-1 mt-2">
              <div
                className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
      </div>
    </div>
  );
}