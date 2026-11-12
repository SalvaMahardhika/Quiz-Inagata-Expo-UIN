import React from 'react';

export const GalaxyDecorations: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Cosmic Nebula Swirls */}
      <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl" />
      <div className="absolute top-24 right-1/4 w-80 h-80 rounded-full bg-fuchsia-600/15 blur-3xl" />
      <div className="absolute top-0 right-10 w-72 h-72 rounded-full bg-indigo-600/15 blur-3xl" />

      {/* Shooting Star */}
      <div className="absolute top-12 left-10 animate-shooting-star">
        <div className="w-24 h-0.5 bg-gradient-to-r from-white via-cyan-300 to-transparent rotate-[28deg] shadow-[0_0_8px_#38bdf8]" />
      </div>

      {/* Twinkling Stars */}
      <div className="absolute top-14 left-[8%] animate-star-twinkle">
        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
      </div>
      <div className="absolute top-28 left-[22%] animate-star-twinkle" style={{ animationDelay: '1s' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-purple-200 shadow-[0_0_4px_#c084fc]" />
      </div>
      <div className="absolute top-10 right-[15%] animate-star-twinkle" style={{ animationDelay: '2s' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-200 shadow-[0_0_8px_#67e8f9]" />
      </div>
      <div className="absolute top-36 right-[30%] animate-star-twinkle" style={{ animationDelay: '1.5s' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_#ffffff]" />
      </div>
      <div className="absolute top-44 left-[42%] animate-star-twinkle" style={{ animationDelay: '2.5s' }}>
        <div className="w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_6px_#fde047]" />
      </div>

      {/* Ringed Cosmic Planet (Top Right) */}
      <div className="absolute top-8 right-8 sm:right-16 opacity-75 animate-camel-bob">
        <svg width="68" height="68" viewBox="0 0 80 80" fill="none">
          {/* Planet Sphere */}
          <circle cx="40" cy="40" r="22" fill="url(#planetGrad)" />
          {/* Planet Rings */}
          <ellipse
            cx="40"
            cy="40"
            rx="36"
            ry="11"
            stroke="url(#ringGrad)"
            strokeWidth="3.5"
            transform="rotate(-22 40 40)"
          />
          <defs>
            <linearGradient id="planetGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#c084fc" />
              <stop offset="0.6" stopColor="#7e22ce" />
              <stop offset="1" stopColor="#3b0764" />
            </linearGradient>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#f472b6" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#e879f9" stopOpacity="0.4" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Lunar / Alien Planet Horizon at Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full">
        <svg
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Distant Crater Ridge */}
          <path
            d="M0 160 C 260 125, 540 180, 800 135 C 1060 90, 1280 165, 1440 120 L 1440 240 L 0 240 Z"
            fill="url(#spaceCraterBack)"
          />

          {/* Foreground Planet Curve */}
          <path
            d="M0 195 C 320 160, 680 220, 960 180 C 1220 145, 1370 200, 1440 185 L 1440 240 L 0 240 Z"
            fill="url(#spaceCraterFore)"
          />

          <defs>
            <linearGradient id="spaceCraterBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b0764" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#090514" />
            </linearGradient>
            <linearGradient id="spaceCraterFore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#581c87" />
              <stop offset="100%" stopColor="#030008" />
            </linearGradient>
          </defs>
        </svg>

        {/* Retro Rocket on the Horizon on Left */}
        <div className="absolute bottom-6 left-8 sm:left-20 opacity-80 animate-camel-bob">
          <svg width="45" height="55" viewBox="0 0 60 70" fill="none">
            {/* Rocket Body */}
            <path d="M30 6 C 22 18, 20 38, 20 52 L 40 52 C 40 38, 38 18, 30 6 Z" fill="#e0e7ff" />
            <path d="M26 6 Q 30 0, 34 6 Z" fill="#ef4444" /> {/* Nose cone */}
            <circle cx="30" cy="26" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            {/* Fins */}
            <path d="M20 40 L 10 54 L 20 50 Z" fill="#ef4444" />
            <path d="M40 40 L 50 54 L 40 50 Z" fill="#ef4444" />
            {/* Thruster Flame */}
            <path d="M25 52 L 30 64 L 35 52 Z" fill="#f59e0b" />
          </svg>
        </div>

        {/* Satellite Dish on Right Ridge */}
        <div className="absolute bottom-6 right-10 sm:right-24 opacity-75">
          <svg width="40" height="45" viewBox="0 0 50 55" fill="none">
            <line x1="25" y1="35" x2="25" y2="52" stroke="#a855f7" strokeWidth="3" />
            <path d="M12 28 Q 25 15, 38 28" stroke="#c084fc" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="25" cy="20" r="2.5" fill="#38bdf8" />
          </svg>
        </div>
      </div>
    </div>
  );
};
