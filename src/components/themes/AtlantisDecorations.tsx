import React from 'react';

export const AtlantisDecorations: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Deep Ocean Sun Rays from Surface */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-cyan-400/20 via-teal-500/10 to-transparent blur-3xl" />
      
      {/* Caustic light patterns */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-300/10 rounded-full blur-2xl animate-aurora" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-teal-300/10 rounded-full blur-2xl animate-aurora" style={{ animationDelay: '3s' }} />

      {/* Rising Bioluminescent Bubbles */}
      <div className="absolute left-[12%] animate-bubble-1">
        <div className="w-4 h-4 rounded-full border border-cyan-300/80 bg-cyan-200/30 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
      </div>
      <div className="absolute left-[38%] animate-bubble-2">
        <div className="w-6 h-6 rounded-full border border-cyan-200/70 bg-cyan-100/20 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
      </div>
      <div className="absolute right-[22%] animate-bubble-3">
        <div className="w-5 h-5 rounded-full border border-teal-300/80 bg-teal-200/30 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
      </div>
      <div className="absolute right-[8%] animate-bubble-1" style={{ animationDelay: '4s' }}>
        <div className="w-3.5 h-3.5 rounded-full border border-cyan-300/80 bg-cyan-100/30" />
      </div>

      {/* Bioluminescent Jellyfish Floating in Mid-depths */}
      <div className="absolute top-24 left-[15%] opacity-60 animate-camel-bob">
        <svg width="48" height="64" viewBox="0 0 48 64" fill="none">
          {/* Bell */}
          <path
            d="M8 30 C 8 12, 40 12, 40 30 C 40 34, 34 36, 24 36 C 14 36, 8 34, 8 30 Z"
            fill="url(#jellyGrad1)"
            opacity="0.85"
          />
          {/* Inner Glow */}
          <ellipse cx="24" cy="24" rx="10" ry="8" fill="#67e8f9" opacity="0.6" />
          {/* Tentacles */}
          <path d="M14 36 Q 12 48, 16 60" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M20 36 Q 24 50, 22 64" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 36 Q 26 50, 29 64" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 36 Q 36 48, 32 60" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="jellyGrad1" x1="24" y1="12" x2="24" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#0891b2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Small Jellyfish Right */}
      <div className="absolute top-36 right-[18%] opacity-50 animate-camel-bob" style={{ animationDelay: '1.5s' }}>
        <svg width="36" height="48" viewBox="0 0 48 64" fill="none">
          <path d="M8 30 C 8 12, 40 12, 40 30 C 40 34, 34 36, 24 36 C 14 36, 8 34, 8 30 Z" fill="#38bdf8" opacity="0.75" />
          <path d="M16 36 Q 14 48, 18 58" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 36 Q 26 50, 24 60" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M32 36 Q 34 48, 30 58" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Sunken Atlantis Ruins & Coral Reef at Seabed */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full">
        <svg
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Deep Ocean Floor Trench */}
          <path
            d="M0 160 C 260 120, 520 180, 780 140 C 1040 100, 1260 170, 1440 130 L 1440 240 L 0 240 Z"
            fill="url(#atlantisDeepGrad)"
            opacity="0.8"
          />

          {/* Seabed Foreground */}
          <path
            d="M0 200 C 300 170, 600 220, 950 185 C 1200 160, 1360 210, 1440 195 L 1440 240 L 0 240 Z"
            fill="url(#atlantisForeGrad)"
          />

          <defs>
            <linearGradient id="atlantisDeepGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e7490" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#083344" />
            </linearGradient>
            <linearGradient id="atlantisForeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#155e75" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
          </defs>
        </svg>

        {/* Sunken Atlantis Ancient Greek Columns on Left */}
        <div className="absolute bottom-4 left-6 sm:left-14 w-28 h-36 opacity-75">
          <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
            {/* Column 1 Base & Shaft */}
            <rect x="20" y="30" width="16" height="85" fill="#164e63" rx="2" />
            <rect x="16" y="24" width="24" height="8" fill="#0891b2" rx="2" />
            <rect x="14" y="110" width="28" height="8" fill="#0891b2" rx="2" />
            {/* Fluting lines */}
            <line x1="24" y1="32" x2="24" y2="108" stroke="#0e7490" strokeWidth="2" />
            <line x1="28" y1="32" x2="28" y2="108" stroke="#0e7490" strokeWidth="2" />
            <line x1="32" y1="32" x2="32" y2="108" stroke="#0e7490" strokeWidth="2" />

            {/* Broken Column 2 */}
            <rect x="60" y="60" width="16" height="55" fill="#164e63" rx="2" />
            <path d="M58 60 L 68 52 L 78 60 Z" fill="#0e7490" />
            <rect x="56" y="110" width="24" height="8" fill="#0891b2" rx="2" />
            <line x1="64" y1="62" x2="64" y2="108" stroke="#0e7490" strokeWidth="2" />
            <line x1="72" y1="62" x2="72" y2="108" stroke="#0e7490" strokeWidth="2" />

            {/* Coral growing on column */}
            <path d="M12 95 Q 6 88, 10 82 Q 16 85, 14 92" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M14 95 Q 18 86, 22 90" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* Sea Fan Corals & Kelp on Right */}
        <div className="absolute bottom-4 right-8 sm:right-16 w-28 h-32 opacity-70">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            {/* Kelp fronds swaying */}
            <path d="M30 100 Q 25 70, 35 50 Q 42 30, 36 10" stroke="#059669" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M45 100 Q 52 75, 42 55 Q 36 35, 48 18" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Branching Coral */}
            <path d="M70 100 Q 65 75, 75 60 Q 60 50, 62 38" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M75 60 Q 88 52, 85 36" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M75 60 Q 76 45, 80 32" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
};
