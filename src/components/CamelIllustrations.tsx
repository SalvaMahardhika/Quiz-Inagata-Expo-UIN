import React from 'react';

/**
 * Ilustrasi dan Icon Unta Bergaya Padang Pasir Oasis
 * Didesain secara vektor presisi, ceria, dan ramah pengguna
 */

interface CamelProps {
  className?: string;
  size?: number;
}

// Icon Unta Ringkas untuk Header / Badge
export const CamelIcon: React.FC<CamelProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
  >
    {/* Body & Hump */}
    <path
      d="M14 42 C 14 36, 17 32, 23 32 C 26 32, 28 22, 36 22 C 44 22, 46 32, 49 33 C 53 34, 55 38, 54 44 C 54 46, 52 48, 48 48 L 18 48 C 15 48, 14 45, 14 42 Z"
      fill="#d97706"
    />
    {/* Neck & Head */}
    <path
      d="M48 44 C 48 38, 50 30, 52 24 C 53 20, 54 16, 57 15 C 60 14, 63 17, 62 19 C 61 21, 58 22, 57 24 C 56 28, 54 36, 53 44 Z"
      fill="#d97706"
    />
    {/* Head Muzzle */}
    <ellipse cx="58" cy="17" rx="4.5" ry="3" fill="#b45309" />
    <circle cx="56.5" cy="15.5" r="1" fill="#451a03" />
    <path d="M54 13 L 55 11 L 56.5 13 Z" fill="#92400e" /> {/* Ear */}

    {/* Legs */}
    <path d="M18 48 L 17 60 L 20 60 L 21 48 Z" fill="#b45309" />
    <path d="M24 48 L 25 58 L 27.5 58 L 26.5 48 Z" fill="#92400e" />
    <path d="M42 48 L 41 58 L 43.5 58 L 44 48 Z" fill="#92400e" />
    <path d="M48 48 L 49 60 L 52 60 L 50.5 48 Z" fill="#b45309" />

    {/* Tail with tuft */}
    <path d="M14 38 Q 10 44, 11 50" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
    <circle cx="11" cy="50" r="2" fill="#78350f" />

    {/* Saddle Rug (Pelana Corak Gurun) */}
    <path
      d="M28 32 C 30 30, 38 30, 42 33 L 41 42 C 37 44, 32 44, 29 42 Z"
      fill="#059669"
    />
    <path
      d="M31 35 L 39 35"
      stroke="#fef08a"
      strokeWidth="2"
      strokeDasharray="2 1"
    />
  </svg>
);

// Maskot Unta Ceria yang Ramah untuk Halaman Registrasi & Banner
export const CamelMascot: React.FC<CamelProps> = ({ className = 'w-24 h-24' }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
      {/* Sun / Halo Behind Mascot */}
      <circle cx="60" cy="60" r="50" fill="url(#camelHaloGrad)" opacity="0.35" />

      {/* Camel Body */}
      {/* Back & Tail */}
      <path
        d="M24 68 C 24 60, 28 54, 38 54 C 42 54, 45 40, 56 40 C 67 40, 70 54, 76 56 C 82 58, 86 64, 85 74 C 84 80, 80 84, 72 84 L 32 84 C 26 84, 24 76, 24 68 Z"
        fill="#f59e0b"
      />
      {/* Camel Neck */}
      <path
        d="M74 74 C 74 62, 78 50, 82 38 C 84 32, 87 26, 92 24 C 98 22, 104 27, 102 32 C 99 35, 94 37, 92 42 C 88 50, 84 62, 82 74 Z"
        fill="#f59e0b"
      />

      {/* Head Muzzle */}
      <ellipse cx="98" cy="27" rx="8" ry="5.5" fill="#d97706" />
      {/* Nostril */}
      <circle cx="102" cy="28" r="1.2" fill="#78350f" />
      {/* Friendly Smile */}
      <path d="M96 30 Q 99 32, 101 29" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
      {/* Cheerful Eye */}
      <circle cx="94" cy="24" r="2.5" fill="#451a03" />
      <circle cx="94.8" cy="23.2" r="1" fill="#ffffff" />
      {/* Ear */}
      <path d="M89 20 L 91 14 L 94 19 Z" fill="#b45309" />

      {/* Cheerful Rosy Cheek */}
      <circle cx="92" cy="28" r="2.5" fill="#f87171" opacity="0.75" />

      {/* Desert Pattern Saddle (Pelana Motif Etnik Oasis) */}
      <path
        d="M44 54 C 48 51, 62 51, 68 56 L 66 74 C 58 77, 50 77, 46 74 Z"
        fill="#047857"
      />
      {/* Saddle details */}
      <path d="M48 60 L 64 60" stroke="#fef08a" strokeWidth="2.5" strokeDasharray="3 2" />
      <path d="M50 67 L 62 67" stroke="#fbbf24" strokeWidth="2" />
      {/* Tassels */}
      <circle cx="48" cy="75" r="1.5" fill="#ef4444" />
      <circle cx="56" cy="76" r="1.5" fill="#f59e0b" />
      <circle cx="64" cy="75" r="1.5" fill="#06b6d4" />

      {/* Legs (Front and Back) */}
      {/* Back Left */}
      <path d="M30 84 L 28 106 L 33 106 L 35 84 Z" fill="#b45309" />
      {/* Back Right */}
      <path d="M40 84 L 42 102 L 46 102 L 44 84 Z" fill="#92400e" />
      {/* Front Left */}
      <path d="M64 84 L 62 102 L 66 102 L 68 84 Z" fill="#92400e" />
      {/* Front Right */}
      <path d="M72 84 L 75 106 L 80 106 L 77 84 Z" fill="#b45309" />

      {/* Padded Hooves */}
      <ellipse cx="30.5" cy="106" rx="3.5" ry="1.5" fill="#78350f" />
      <ellipse cx="44" cy="102" rx="3" ry="1.5" fill="#451a03" />
      <ellipse cx="64" cy="102" rx="3" ry="1.5" fill="#451a03" />
      <ellipse cx="77.5" cy="106" rx="3.5" ry="1.5" fill="#78350f" />

      {/* Tail with tuft */}
      <path d="M24 64 Q 16 74, 18 86" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="18" cy="87" rx="3.5" ry="5" fill="#92400e" />

      <defs>
        <radialGradient id="camelHaloGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  </div>
);

// Unta Duduk Santai di Tepi Oasis (Resting Camel)
export const RestingCamel: React.FC<{ className?: string }> = ({ className = 'w-28 h-20' }) => (
  <div className={`relative ${className}`}>
    <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Body Resting on Sand */}
      <path
        d="M16 48 C 16 40, 22 34, 32 34 C 36 34, 40 22, 52 22 C 62 22, 66 34, 72 36 C 78 38, 82 44, 82 52 C 82 58, 76 60, 68 60 L 24 60 C 18 60, 16 54, 16 48 Z"
        fill="#d97706"
      />
      {/* Folded Knees on Ground */}
      <ellipse cx="28" cy="59" rx="10" ry="4" fill="#b45309" />
      <ellipse cx="68" cy="59" rx="12" ry="4.5" fill="#b45309" />

      {/* Graceful Curved Neck & Cheerful Head */}
      <path
        d="M70 50 C 71 40, 75 30, 80 20 C 82 16, 85 12, 90 10 C 94 9, 97 12, 96 16 C 94 18, 90 20, 88 24 C 84 32, 80 42, 78 50 Z"
        fill="#d97706"
      />
      <ellipse cx="93" cy="12" rx="5" ry="3.5" fill="#b45309" />
      <circle cx="91" cy="11" r="1.5" fill="#451a03" />
      <path d="M86 8 L 88 4 L 90 8 Z" fill="#92400e" />

      {/* Decorative Saddle Cloth */}
      <path
        d="M38 34 C 42 32, 54 32, 60 36 L 58 48 C 50 51, 44 51, 40 48 Z"
        fill="#047857"
      />
      <path d="M42 39 L 56 39" stroke="#fef08a" strokeWidth="1.8" strokeDasharray="2 1.5" />
      <circle cx="43" cy="48" r="1.2" fill="#ef4444" />
      <circle cx="49" cy="49" r="1.2" fill="#fbbf24" />
      <circle cx="55" cy="48" r="1.2" fill="#06b6d4" />

      {/* Tail resting */}
      <path d="M16 44 Q 10 50, 12 56" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="56" r="2" fill="#78350f" />
    </svg>
  </div>
);
