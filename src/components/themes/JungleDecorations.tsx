import React from 'react';

export const JungleDecorations: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Tropical Canopy Mist & Sunlight Rays */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl" />
      <div className="absolute top-8 left-10 w-72 h-72 rounded-full bg-lime-400/10 blur-2xl" />

      {/* Hanging Tropical Vines from Top Corners */}
      <div className="absolute top-0 left-4 sm:left-12 opacity-75">
        <svg width="60" height="120" viewBox="0 0 60 120" fill="none">
          <path d="M20 0 Q 35 40, 15 80 Q 25 100, 20 120" stroke="#065f46" strokeWidth="3" fill="none" />
          {/* Leaves on vine */}
          <path d="M22 25 Q 38 20, 36 32 Q 24 35, 22 25 Z" fill="#047857" />
          <path d="M18 55 Q 5 50, 6 62 Q 18 64, 18 55 Z" fill="#10b981" />
          <path d="M16 85 Q 32 80, 30 92 Q 18 95, 16 85 Z" fill="#059669" />
        </svg>
      </div>

      <div className="absolute top-0 right-4 sm:right-16 opacity-70">
        <svg width="50" height="100" viewBox="0 0 50 100" fill="none">
          <path d="M30 0 Q 15 35, 35 70 Q 20 85, 28 100" stroke="#065f46" strokeWidth="2.5" fill="none" />
          <path d="M28 20 Q 42 16, 40 28 Q 28 30, 28 20 Z" fill="#10b981" />
          <path d="M25 50 Q 10 46, 12 58 Q 24 60, 25 50 Z" fill="#047857" />
        </svg>
      </div>

      {/* Glowing Fireflies */}
      <div className="absolute top-28 left-[18%] animate-firefly-1">
        <div className="w-2.5 h-2.5 rounded-full bg-lime-300 shadow-[0_0_10px_#a3e635]" />
      </div>
      <div className="absolute top-44 left-[40%] animate-firefly-2">
        <div className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
      </div>
      <div className="absolute top-20 right-[22%] animate-firefly-3">
        <div className="w-3 h-3 rounded-full bg-amber-300 shadow-[0_0_12px_#fde047]" />
      </div>
      <div className="absolute top-48 right-[10%] animate-firefly-1" style={{ animationDelay: '2s' }}>
        <div className="w-2 h-2 rounded-full bg-lime-300 shadow-[0_0_8px_#bef264]" />
      </div>

      {/* Rainforest Floor & Monstera Aroid Leaves at Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full">
        <svg
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Back Canopy Layer */}
          <path
            d="M0 160 C 260 120, 520 180, 780 135 C 1040 90, 1260 170, 1440 125 L 1440 240 L 0 240 Z"
            fill="url(#jungleBackGrad)"
          />

          {/* Fore Canopy Layer */}
          <path
            d="M0 200 C 300 165, 620 220, 940 175 C 1200 145, 1360 205, 1440 190 L 1440 240 L 0 240 Z"
            fill="url(#jungleForeGrad)"
          />

          <defs>
            <linearGradient id="jungleBackGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#065f46" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <linearGradient id="jungleForeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
          </defs>
        </svg>

        {/* Large Monstera Leaf on Left */}
        <div className="absolute bottom-2 left-6 sm:left-14 w-32 h-36 opacity-85">
          <svg viewBox="0 0 100 120" fill="none" className="w-full h-full drop-shadow-md">
            {/* Monstera Deliciosa Leaf with fenestrations */}
            <path
              d="M50 115 Q 48 60, 50 15 C 65 18, 85 35, 90 60 C 94 80, 80 100, 50 115 Z"
              fill="#047857"
            />
            <path
              d="M50 115 Q 48 60, 50 15 C 35 18, 15 35, 10 60 C 6 80, 20 100, 50 115 Z"
              fill="#059669"
            />
            {/* Midrib */}
            <line x1="50" y1="15" x2="50" y2="115" stroke="#10b981" strokeWidth="2.5" />
            {/* Fenestration Cutouts */}
            <ellipse cx="68" cy="45" rx="5" ry="12" fill="#022c22" transform="rotate(35 68 45)" />
            <ellipse cx="72" cy="72" rx="5" ry="10" fill="#022c22" transform="rotate(45 72 72)" />
            <ellipse cx="32" cy="45" rx="5" ry="12" fill="#022c22" transform="rotate(-35 32 45)" />
            <ellipse cx="28" cy="72" rx="5" ry="10" fill="#022c22" transform="rotate(-45 28 72)" />
          </svg>
        </div>

        {/* Toucan on Branch on Right */}
        <div className="absolute bottom-5 right-8 sm:right-20 opacity-85 animate-camel-bob">
          <svg width="55" height="50" viewBox="0 0 70 65" fill="none">
            {/* Branch */}
            <path d="M0 50 Q 35 48, 70 52" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
            {/* Toucan Body */}
            <ellipse cx="40" cy="35" rx="14" ry="18" fill="#0f172a" />
            <circle cx="44" cy="24" r="8" fill="#f8fafc" />
            {/* Large Yellow/Orange Beak */}
            <path d="M48 20 Q 68 18, 64 28 Q 50 30, 46 26 Z" fill="#f59e0b" />
            <path d="M60 21 Q 68 18, 64 28 Z" fill="#ef4444" />
            <circle cx="42" cy="22" r="2" fill="#0f172a" />
            {/* Tail feathers */}
            <path d="M26 42 L 18 58 L 24 58 Z" fill="#0f172a" />
          </svg>
        </div>
      </div>
    </div>
  );
};
