import React from 'react';
import { RestingCamel } from './CamelIllustrations';

export const DesertOasisDecorations: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* Warm Oasis Sky & Glowing Sun */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-gradient-to-b from-amber-200/50 to-orange-200/20 blur-2xl" />
      <div className="absolute top-8 left-12 w-20 h-20 rounded-full bg-amber-100/60 blur-md" />

      {/* Gentle Floating Desert Clouds */}
      <div className="absolute top-10 left-[8%] animate-drift opacity-70">
        <svg width="120" height="40" viewBox="0 0 120 40" fill="white">
          <path d="M10 28 Q 15 15, 30 18 Q 45 6, 65 14 Q 85 8, 95 20 Q 110 22, 108 30 Q 80 34, 10 28 Z" opacity="0.8" />
        </svg>
      </div>

      <div className="absolute top-16 right-[10%] animate-drift opacity-60" style={{ animationDelay: '3s' }}>
        <svg width="140" height="45" viewBox="0 0 140 45" fill="white">
          <path d="M15 32 Q 25 18, 45 22 Q 60 10, 85 16 Q 105 12, 120 24 Q 135 26, 130 35 Q 90 38, 15 32 Z" opacity="0.7" />
        </svg>
      </div>

      {/* Walking Camel Caravan Silhouette on the Distant Dune Crest */}
      <div className="absolute bottom-28 sm:bottom-36 inset-x-0 w-full overflow-hidden pointer-events-none">
        <div className="animate-caravan flex items-end gap-5 opacity-40">
          {/* Camel 1 (Leader with Bobbing Gait) */}
          <div className="animate-camel-bob">
            <svg width="45" height="36" viewBox="0 0 64 52" fill="#92400e">
              <path d="M14 36 C 14 30, 18 26, 24 26 C 28 26, 30 16, 38 16 C 46 16, 48 26, 51 27 C 55 28, 57 32, 56 38 L 50 42 L 18 42 Z" />
              <path d="M50 38 C 50 32, 53 24, 55 18 C 56 14, 57 10, 60 9 C 63 8, 65 12, 63 15 C 61 17, 58 18, 57 21 C 56 25, 54 32, 53 38 Z" />
              <ellipse cx="61" cy="11" rx="4" ry="2.5" />
              <path d="M18 42 L 17 52 L 20 52 L 21 42 Z" />
              <path d="M25 42 L 26 50 L 28 50 L 27 42 Z" />
              <path d="M42 42 L 41 50 L 43 50 L 44 42 Z" />
              <path d="M48 42 L 49 52 L 52 52 L 50 42 Z" />
              <path d="M14 32 Q 10 38, 11 44" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Caravan connecting rope */}
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="mb-3">
            <path d="M0 4 Q 12 11, 24 6" stroke="#92400e" strokeWidth="1" strokeDasharray="2 1" opacity="0.6" />
          </svg>

          {/* Camel 2 (Follower) */}
          <div className="animate-camel-bob" style={{ animationDelay: '0.6s' }}>
            <svg width="42" height="34" viewBox="0 0 64 52" fill="#92400e">
              <path d="M14 36 C 14 30, 18 26, 24 26 C 28 26, 30 16, 38 16 C 46 16, 48 26, 51 27 C 55 28, 57 32, 56 38 L 50 42 L 18 42 Z" />
              <path d="M50 38 C 50 32, 53 24, 55 18 C 56 14, 57 10, 60 9 C 63 8, 65 12, 63 15 C 61 17, 58 18, 57 21 C 56 25, 54 32, 53 38 Z" />
              <ellipse cx="61" cy="11" rx="4" ry="2.5" />
              <path d="M18 42 L 17 52 L 20 52 L 21 42 Z" />
              <path d="M25 42 L 26 50 L 28 50 L 27 42 Z" />
              <path d="M42 42 L 41 50 L 43 50 L 44 42 Z" />
              <path d="M48 42 L 49 52 L 52 52 L 50 42 Z" />
              <path d="M14 32 Q 10 38, 11 44" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Caravan connecting rope */}
          <svg width="22" height="12" viewBox="0 0 22 12" fill="none" className="mb-3">
            <path d="M0 4 Q 11 11, 22 6" stroke="#92400e" strokeWidth="1" strokeDasharray="2 1" opacity="0.6" />
          </svg>

          {/* Camel 3 (Baby / Small follower) */}
          <div className="animate-camel-bob" style={{ animationDelay: '1.2s' }}>
            <svg width="34" height="28" viewBox="0 0 64 52" fill="#92400e">
              <path d="M14 36 C 14 30, 18 26, 24 26 C 28 26, 30 16, 38 16 C 46 16, 48 26, 51 27 C 55 28, 57 32, 56 38 L 50 42 L 18 42 Z" />
              <path d="M50 38 C 50 32, 53 24, 55 18 C 56 14, 57 10, 60 9 C 63 8, 65 12, 63 15 C 61 17, 58 18, 57 21 C 56 25, 54 32, 53 38 Z" />
              <ellipse cx="61" cy="11" rx="4" ry="2.5" />
              <path d="M18 42 L 17 52 L 20 52 L 21 42 Z" />
              <path d="M25 42 L 26 50 L 28 50 L 27 42 Z" />
              <path d="M42 42 L 41 50 L 43 50 L 44 42 Z" />
              <path d="M48 42 L 49 52 L 52 52 L 50 42 Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Distant Dunes & Palm Silhouette Layers at Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-52 w-full">
        {/* Layer 1: Distant Sand Dunes */}
        <svg
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full object-cover preserve-3d"
          preserveAspectRatio="none"
        >
          {/* Back Dunes (Warm Golden Terracotta) */}
          <path
            d="M0 160 C 240 110, 480 180, 720 130 C 960 80, 1200 170, 1440 120 L 1440 260 L 0 260 Z"
            fill="url(#sandDuneBack)"
          />

          {/* Mid Dunes (Warm Golden Amber) */}
          <path
            d="M0 185 C 320 140, 640 220, 980 165 C 1220 125, 1360 190, 1440 175 L 1440 260 L 0 260 Z"
            fill="url(#sandDuneMid)"
          />

          {/* Oasis Pond Water (Cool Shimmering Emerald / Turquoise Lake) */}
          <path
            d="M380 230 C 520 215, 680 215, 840 225 C 980 235, 880 255, 620 258 C 460 258, 320 245, 380 230 Z"
            fill="url(#oasisWaterGrad)"
            className="animate-oasis-shimmer"
          />

          {/* Foreground Dune Rim */}
          <path
            d="M0 225 C 280 200, 580 245, 920 215 C 1180 190, 1350 235, 1440 220 L 1440 260 L 0 260 Z"
            fill="url(#sandDuneFore)"
          />

          <defs>
            <linearGradient id="sandDuneBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbd38d" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#f6ad55" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="sandDuneMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f6ad55" />
              <stop offset="100%" stopColor="#ed8936" />
            </linearGradient>
            <linearGradient id="sandDuneFore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbd38d" />
              <stop offset="100%" stopColor="#dd6b20" />
            </linearGradient>
            <linearGradient id="oasisWaterGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Oasis Palm Trees (Stylized Crisp Silhouettes) */}
        <div className="absolute bottom-6 left-6 sm:left-14 w-28 h-36 opacity-85">
          <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
            {/* Trunk 1 */}
            <path d="M35 120 Q 42 70, 48 35" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
            {/* Fronds 1 */}
            <path d="M48 35 Q 25 15, 10 30" stroke="#047857" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M48 35 Q 35 5, 45 -5" stroke="#059669" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M48 35 Q 65 10, 80 25" stroke="#047857" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M48 35 Q 60 25, 75 48" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M48 35 Q 30 35, 18 50" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" fill="none" />

            {/* Coconuts */}
            <circle cx="45" cy="38" r="3" fill="#92400e" />
            <circle cx="50" cy="39" r="3" fill="#78350f" />

            {/* Trunk 2 (smaller palm) */}
            <path d="M65 120 Q 68 85, 76 55" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
            <path d="M76 55 Q 58 35, 48 45" stroke="#059669" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M76 55 Q 80 30, 95 38" stroke="#047857" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M76 55 Q 92 48, 100 62" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* Resting Camel Under the Left Palms */}
        <div className="absolute bottom-2 left-20 sm:left-32 animate-camel-breathe opacity-90">
          <RestingCamel className="w-24 sm:w-28 h-16 sm:h-20 drop-shadow-sm" />
        </div>

        {/* Standing Camel on the Right Dune overlooking the Oasis */}
        <div className="absolute bottom-3 right-24 sm:right-36 animate-camel-bob opacity-90 hidden xs:block">
          <svg width="56" height="52" viewBox="0 0 64 64" fill="none">
            {/* Body */}
            <path
              d="M14 42 C 14 36, 17 32, 23 32 C 26 32, 28 22, 36 22 C 44 22, 46 32, 49 33 C 53 34, 55 38, 54 44 C 54 46, 52 48, 48 48 L 18 48 C 15 48, 14 45, 14 42 Z"
              fill="#d97706"
            />
            {/* Neck */}
            <path
              d="M48 44 C 48 38, 50 30, 52 24 C 53 20, 54 16, 57 15 C 60 14, 63 17, 62 19 C 61 21, 58 22, 57 24 C 56 28, 54 36, 53 44 Z"
              fill="#d97706"
            />
            <ellipse cx="58" cy="17" rx="4.5" ry="3" fill="#b45309" />
            <circle cx="56.5" cy="15.5" r="1" fill="#451a03" />
            <path d="M54 13 L 55 11 L 56.5 13 Z" fill="#92400e" />
            {/* Saddle */}
            <path d="M28 32 C 30 30, 38 30, 42 33 L 41 42 C 37 44, 32 44, 29 42 Z" fill="#047857" />
            <path d="M30 35 L 40 35" stroke="#fef08a" strokeWidth="1.5" />
            {/* Legs */}
            <path d="M18 48 L 17 60 L 20 60 L 21 48 Z" fill="#b45309" />
            <path d="M24 48 L 25 58 L 27.5 58 L 26.5 48 Z" fill="#92400e" />
            <path d="M42 48 L 41 58 L 43.5 58 L 44 48 Z" fill="#92400e" />
            <path d="M48 48 L 49 60 L 52 60 L 50.5 48 Z" fill="#b45309" />
            {/* Tail */}
            <path d="M14 38 Q 10 44, 11 50" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="50" r="2" fill="#78350f" />
          </svg>
        </div>

        {/* Palm Tree on the Right */}
        <div className="absolute bottom-6 right-6 sm:right-16 w-24 h-32 opacity-80">
          <svg viewBox="0 0 100 120" fill="none" className="w-full h-full">
            <path d="M60 120 Q 55 75, 46 38" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M46 38 Q 20 20, 12 35" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M46 38 Q 40 8, 52 2" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M46 38 Q 70 18, 82 32" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M46 38 Q 62 38, 72 55" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M46 38 Q 28 40, 20 52" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="43" cy="41" r="2.5" fill="#92400e" />
            <circle cx="48" cy="42" r="2.5" fill="#78350f" />
          </svg>
        </div>
      </div>
    </div>
  );
};
