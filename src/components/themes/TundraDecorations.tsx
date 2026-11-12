import React from 'react';

export const TundraDecorations: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Aurora Borealis Ribbon Waves */}
      <div className="absolute top-0 inset-x-0 h-72 opacity-60 animate-aurora">
        <svg viewBox="0 0 1440 280" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0 60 C 300 140, 600 -20, 900 80 C 1200 180, 1350 40, 1440 70 L 1440 0 L 0 0 Z"
            fill="url(#auroraGrad1)"
          />
          <path
            d="M0 100 C 350 30, 700 160, 1050 50 C 1250 0, 1380 90, 1440 60 L 1440 0 L 0 0 Z"
            fill="url(#auroraGrad2)"
            opacity="0.7"
          />
          <defs>
            <linearGradient id="auroraGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="0.5" stopColor="#34d399" stopOpacity="0.6" />
              <stop offset="1" stopColor="#818cf8" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="auroraGrad2" x1="1" y1="0" x2="0" y2="1">
              <stop stopColor="#a78bfa" stopOpacity="0.7" />
              <stop offset="0.5" stopColor="#2dd4bf" stopOpacity="0.6" />
              <stop offset="1" stopColor="#0284c7" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Floating Gentle Snowflakes */}
      <div className="absolute left-[10%] animate-snow-1">
        <div className="w-2 h-2 rounded-full bg-white/80 shadow-[0_0_6px_#ffffff]" />
      </div>
      <div className="absolute left-[28%] animate-snow-2">
        <div className="w-1.5 h-1.5 rounded-full bg-sky-100/90 shadow-[0_0_4px_#38bdf8]" />
      </div>
      <div className="absolute left-[52%] animate-snow-3">
        <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
      </div>
      <div className="absolute right-[25%] animate-snow-1" style={{ animationDelay: '3s' }}>
        <div className="w-2 h-2 rounded-full bg-white/85 shadow-[0_0_6px_#ffffff]" />
      </div>
      <div className="absolute right-[12%] animate-snow-2" style={{ animationDelay: '1.5s' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-sky-200/80" />
      </div>

      {/* Glaciers & Snowy Ridges at Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full">
        <svg
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Distant Sharp Glacier Peaks */}
          <path
            d="M0 160 L 160 90 L 320 170 L 480 80 L 640 160 L 820 70 L 980 150 L 1160 85 L 1320 160 L 1440 100 L 1440 240 L 0 240 Z"
            fill="url(#glacierBackGrad)"
          />

          {/* Mid Frozen Tundra Ridge */}
          <path
            d="M0 180 C 240 140, 500 200, 780 165 C 1050 135, 1280 185, 1440 170 L 1440 240 L 0 240 Z"
            fill="url(#glacierMidGrad)"
          />

          {/* Ice Shelf Foreground */}
          <path
            d="M0 215 C 320 195, 660 230, 950 205 C 1200 185, 1360 220, 1440 210 L 1440 240 L 0 240 Z"
            fill="url(#glacierForeGrad)"
          />

          <defs>
            <linearGradient id="glacierBackGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="glacierMidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="glacierForeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Polar Bear Silhouette on the Left Ice Shelf */}
        <div className="absolute bottom-5 left-10 sm:left-24 animate-camel-breathe opacity-85">
          <svg width="60" height="38" viewBox="0 0 80 50" fill="none">
            {/* Polar Bear Body */}
            <path
              d="M16 32 C 14 24, 20 18, 30 18 C 36 18, 44 14, 54 16 C 62 18, 68 24, 70 28 C 72 32, 68 36, 62 38 L 18 38 C 16 38, 16 36, 16 32 Z"
              fill="#f8fafc"
            />
            {/* Head & Snout */}
            <path
              d="M66 22 C 70 20, 76 21, 78 24 C 80 26, 76 28, 72 29 Z"
              fill="#f8fafc"
            />
            <circle cx="77.5" cy="24" r="1" fill="#0f172a" />
            <path d="M68 18 L 70 16 L 72 18 Z" fill="#e2e8f0" /> {/* Little ear */}
            {/* Sturdy Legs */}
            <rect x="22" y="36" width="6" height="12" rx="2" fill="#e2e8f0" />
            <rect x="32" y="36" width="6" height="10" rx="2" fill="#cbd5e1" />
            <rect x="52" y="36" width="6" height="10" rx="2" fill="#cbd5e1" />
            <rect x="60" y="36" width="6" height="12" rx="2" fill="#e2e8f0" />
          </svg>
        </div>

        {/* Crystalline Frost Shards on Right */}
        <div className="absolute bottom-4 right-10 sm:right-20 opacity-75">
          <svg width="45" height="45" viewBox="0 0 60 60" fill="none">
            <polygon points="30,5 34,22 50,15 38,28 55,35 38,38 45,55 30,42 15,55 22,38 5,35 22,28 10,15 26,22" fill="#bae6fd" opacity="0.8" />
            <circle cx="30" cy="30" r="5" fill="#ffffff" />
          </svg>
        </div>
      </div>
    </div>
  );
};
