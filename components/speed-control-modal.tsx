"use client";

import { Volume2 } from "lucide-react";

interface SpeedControlModalProps {
  rate: number;
  changeRate: (rate: number) => void;
  theme: "light" | "dark";
}

export const SpeedControlModal = ({
  rate,
  changeRate,
  theme,
}: SpeedControlModalProps) => {
  const speeds = [0.8, 1.0, 1.2, 1.6, 2.0];

  return (
    <div className="flex items-center gap-2">
      <Volume2 className="w-4 h-4 text-[#6841ea] shrink-0" />

      <div className="flex items-center gap-1">
        {speeds.map((speed) => (
          <button
            key={speed}
            onClick={() => changeRate(speed)}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
              Math.abs(rate - speed) < 0.05
                ? "bg-[#6841ea] text-white"
                : theme === "dark"
                  ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {speed.toFixed(1)}x
          </button>
        ))}
      </div>
    </div>
  );
};
