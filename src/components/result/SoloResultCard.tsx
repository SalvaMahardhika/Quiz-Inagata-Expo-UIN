import React from 'react';
import { ThemeConfig } from '../../types/theme';

interface SoloResultCardProps {
  name: string;
  institution: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  theme: ThemeConfig;
  onFinish: () => Promise<void> | void;
}

export const SoloResultCard: React.FC<SoloResultCardProps> = ({
  name,
  institution,
  score,
  correctCount,
  totalQuestions,
  theme,
  onFinish,
}) => {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleExit = async () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      await onFinish();
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <div
      className={`w-full max-w-sm ${theme.cardBg} rounded-2xl p-5 sm:p-7 border-2 ${theme.cardBorder} text-center shadow-xl animate-pop`}
    >
      <h2 className={`text-lg sm:text-xl font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
        Hasil Kuis Solo
      </h2>
      <p
        className={`text-xs ${
          theme.isDark ? 'text-slate-400' : 'text-slate-500'
        } mt-0.5 break-words`}
      >
        {name} · {institution}
      </p>

      <div
        className={`my-5 p-4 ${
          theme.isDark
            ? 'bg-slate-800/80 border-slate-700'
            : 'bg-gradient-to-b from-amber-50 to-emerald-50 border-amber-200'
        } rounded-xl border`}
      >
        <div className="text-4xl sm:text-5xl font-black tabular-nums text-amber-500 tracking-tight">
          {score}
        </div>
        <div
          className={`text-xs font-bold ${
            theme.isDark ? 'text-slate-300' : 'text-slate-600'
          } mt-1 tabular-nums`}
        >
          {correctCount} dari {totalQuestions} soal benar
        </div>
        <div
          className={`text-[11px] mt-1.5 ${
            theme.isDark ? 'text-emerald-400' : 'text-emerald-700'
          } font-semibold`}
        >
          Skor tercatat di Papan Skor Global
        </div>
      </div>

      <button
        type="button"
        disabled={isExiting}
        onClick={handleExit}
        className={`btn-kahoot w-full h-12 ${theme.primaryButtonBg} font-extrabold rounded-xl text-sm border-b-4 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-60`}
      >
        <span>{isExiting ? 'MENYIMPAN...' : 'KELUAR'}</span>
      </button>
    </div>
  );
};
