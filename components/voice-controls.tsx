import { Volume2 } from "lucide-react";
import { useState } from "react";

export const SpeedControlHeader = ({ rate, changeRate, isSpeaking, theme }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} disabled={isSpeaking} className="...">
        <Volume2 className="w-4 h-4" />
        <span className="text-xs">{rate.toFixed(1)}x</span>
      </button>
         {isOpen && (
        <div
          className={`absolute right-0 top-12 w-56 rounded-lg border p-3 shadow-lg z-50 ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Velocidad</span>
                <span className="text-[#6841ea]">{rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => changeRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-[#6841ea]/30 to-[#6841ea] rounded-lg appearance-none cursor-pointer accent-[#6841ea] disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Lenta</span>
                <span>Normal</span>
                <span>Rápida</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2a2a2a]">
              <button
                onClick={() => {
                  changeRate(0.8);
                  setIsOpen(false);
                }}
              ></button>
              <button
                onClick={() => {
                  changeRate(1.2);
                  setIsOpen(false);
                }}
              ></button>
              <button
                onClick={() => {
                  changeRate(1.6);
                  setIsOpen(false);
                }}
              ></button>
              <button
                onClick={() => {
                  changeRate(2);
                  setIsOpen(false);
                }}
              ></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
