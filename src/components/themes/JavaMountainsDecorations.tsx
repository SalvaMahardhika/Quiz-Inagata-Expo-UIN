import React from 'react';

export const JavaMountainsDecorations: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Golden Sunrise Glow behind Peaks */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-b from-amber-400/25 to-orange-500/10 blur-3xl" />
      <div className="absolute top-16 left-1/3 w-28 h-28 rounded-full bg-amber-200/40 blur-md" />

      {/* Soaring Javan Hawk-Eagle (Elang Jawa) */}
      <div className="absolute top-16 right-[24%] animate-camel-bob opacity-70">
        <svg width="45" height="24" viewBox="0 0 60 30" fill="none">
          <path
            d="M0 12 C 15 2, 28 8, 30 18 C 32 8, 45 2, 60 12 C 45 14, 34 24, 30 28 C 26 24, 15 14, 0 12 Z"
            fill="#78350f"
          />
        </svg>
      </div>

      {/* Morning Mountain Mist across Terraces */}
      <div className="absolute bottom-28 inset-x-0 h-24 animate-mountain-mist pointer-events-none opacity-45">
        <svg viewBox="0 0 1440 100" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0 40 C 300 80, 600 10, 900 60 C 1200 90, 1350 20, 1440 50 L 1440 100 L 0 100 Z"
            fill="url(#mistGrad)"
          />
          <defs>
            <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fed7aa" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Volcanic Peaks (Merapi / Bromo) & Rice Terraces at Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full">
        <svg
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Back Volcanic Mountains (Merapi peak center-left, Bromo crater right) */}
          <path
            d="M0 170 L 180 130 L 380 45 L 560 150 L 780 110 L 1020 65 L 1220 140 L 1440 115 L 1440 240 L 0 240 Z"
            fill="url(#volcanoBackGrad)"
          />

          {/* Crater Smoke Wisp above Peak */}
          <path
            d="M375 42 Q 365 20, 385 10 Q 395 25, 383 44 Z"
            fill="#fef3c7"
            opacity="0.6"
          />

          {/* Terraced Rice Paddies Step 1 (Terasering) */}
          <path
            d="M0 185 C 240 150, 480 210, 750 170 C 1000 130, 1260 190, 1440 175 L 1440 240 L 0 240 Z"
            fill="url(#terraceStep1)"
          />

          {/* Terraced Rice Paddies Step 2 */}
          <path
            d="M0 215 C 280 185, 580 235, 900 195 C 1180 170, 1340 220, 1440 210 L 1440 240 L 0 240 Z"
            fill="url(#terraceStep2)"
          />

          <defs>
            <linearGradient id="volcanoBackGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
            <linearGradient id="terraceStep1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id="terraceStep2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
          </defs>
        </svg>

        {/* Small Javanese Candi/Stupa Silhouette on the Ridge */}
        <div className="absolute bottom-6 left-12 sm:left-24 opacity-80">
          <svg width="40" height="42" viewBox="0 0 50 55" fill="none">
            {/* Tiered Candi Structure */}
            <rect x="5" y="44" width="40" height="10" fill="#292524" rx="1" />
            <rect x="10" y="32" width="30" height="12" fill="#44403c" rx="1" />
            <rect x="15" y="20" width="20" height="12" fill="#57534e" rx="1" />
            <polygon points="25,5 20,20 30,20" fill="#78716c" />
            <circle cx="25" cy="5" r="2.5" fill="#f59e0b" />
          </svg>
        </div>

        {/* Traditional Bamboo Cluster on Right */}
        <div className="absolute bottom-4 right-10 sm:right-24 opacity-75">
          <svg width="36" height="52" viewBox="0 0 50 70" fill="none">
            <line x1="18" y1="70" x2="18" y2="10" stroke="#15803d" strokeWidth="3" />
            <line x1="28" y1="70" x2="30" y2="15" stroke="#16a34a" strokeWidth="2.5" />
            <line x1="38" y1="70" x2="42" y2="25" stroke="#22c55e" strokeWidth="2" />
            <path d="M18 30 Q 8 20, 4 28" stroke="#4ade80" strokeWidth="2" fill="none" />
            <path d="M18 45 Q 26 35, 32 40" stroke="#4ade80" strokeWidth="2" fill="none" />
            <path d="M30 35 Q 40 25, 46 30" stroke="#4ade80" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
};
