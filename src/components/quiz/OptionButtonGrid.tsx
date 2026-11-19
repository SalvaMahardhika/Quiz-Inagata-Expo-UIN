import React from 'react';
import { Check, X } from 'lucide-react';

interface OptionButtonGridProps {
  questionKode: string;
  options: string[];
  correctAnswerText: string;
  selectedOption: string | null;
  isAnswerLocked: boolean;
  onSelectOption: (optionText: string) => void;
}

const KAHOOT_CONFIGS = [
  {
    symbol: '▲',
    baseBg: 'bg-rose-500 hover:bg-rose-400 border-rose-700 text-white',
    symbolBg: 'bg-rose-700/60 text-white',
  },
  {
    symbol: '◆',
    baseBg: 'bg-sky-500 hover:bg-sky-400 border-sky-700 text-white',
    symbolBg: 'bg-sky-700/60 text-white',
  },
  {
    symbol: '●',
    baseBg: 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-amber-950 font-bold',
    symbolBg: 'bg-amber-600/40 text-amber-950',
  },
  {
    symbol: '■',
    baseBg: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white',
    symbolBg: 'bg-emerald-700/60 text-white',
  },
];

export const OptionButtonGrid: React.FC<OptionButtonGridProps> = ({
  questionKode,
  options,
  correctAnswerText,
  selectedOption,
  isAnswerLocked,
  onSelectOption,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 shrink-0 pt-1 pb-1 select-none">
      {options.map((option, idx) => {
        const hasSelected = selectedOption !== null;
        const isSelected = selectedOption === option;
        const isCorrect = option === correctAnswerText;
        const cfg = KAHOOT_CONFIGS[idx % 4];

        let buttonClass = cfg.baseBg;
        let animClass = '';

        if (isAnswerLocked) {
          if (!hasSelected) {
            buttonClass = 'bg-slate-200 border-slate-300 text-slate-500 opacity-55';
          } else if (isCorrect) {
            buttonClass = 'bg-emerald-500 border-emerald-700 text-white ring-4 ring-emerald-300';
            animClass = 'animate-pop';
          } else if (isSelected && !isCorrect) {
            buttonClass = 'bg-rose-600 border-rose-800 text-white ring-4 ring-rose-300';
            animClass = 'animate-shake';
          } else {
            buttonClass = 'bg-slate-300 border-slate-400 text-slate-500 opacity-40';
          }
        }

        return (
          <button
            key={`${questionKode}_opt_${idx}`}
            onClick={() => onSelectOption(option)}
            disabled={isAnswerLocked}
            className={`btn-kahoot relative flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl border-b-[5px] shadow-md text-left transition-all min-h-[50px] sm:min-h-[64px] h-auto cursor-pointer disabled:cursor-not-allowed ${buttonClass} ${animClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-inner ${cfg.symbolBg}`}
              >
                {cfg.symbol}
              </span>
              <span className="text-xs sm:text-sm font-bold leading-snug break-words whitespace-normal flex-1">
                {option}
              </span>
            </div>

            {isAnswerLocked && hasSelected && (
              <span className="shrink-0 pl-2">
                {isCorrect && <Check className="w-5 h-5 text-white animate-bounce" />}
                {isSelected && !isCorrect && <X className="w-5 h-5 text-white" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
