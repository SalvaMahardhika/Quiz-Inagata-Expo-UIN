import React from 'react';
import { ThemeConfig } from '../../types/theme';

interface QuestionCardProps {
  kode: string;
  pertanyaan: string;
  gambar?: string;
  theme: ThemeConfig;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  kode,
  pertanyaan,
  gambar,
  theme,
}) => {
  return (
    <div
      className={`${theme.questionCardBg} ${theme.questionCardBorder} rounded-2xl p-3.5 sm:p-5 border-2 shadow-lg flex flex-col items-center justify-center min-h-[100px] sm:min-h-[130px] max-h-[36dvh] lg:max-h-[42dvh] overflow-y-auto`}
    >
      {gambar && gambar.trim() !== '' && (
        <div className="w-full mb-2.5 flex items-center justify-center shrink-0">
          <img
            src={gambar}
            alt={`Soal ${kode}`}
            referrerPolicy="no-referrer"
            className="w-auto max-w-full h-auto max-h-28 sm:max-h-36 md:max-h-44 object-contain rounded-xl border border-slate-200/80 shadow-xs"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <p
        className={`w-full text-sm sm:text-base md:text-lg font-bold leading-relaxed text-center break-words ${
          theme.isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {pertanyaan}
      </p>
    </div>
  );
};
