import React from 'react';
import { ThemeConfig } from '../../types/theme';
import { PlayMode } from '../../hooks/useQuizSession';
import { MultiPlayerItem } from '../../utils/useMultiplayer';
import { LiveRoomTicker } from '../quiz/LiveRoomTicker';
import { QuestionCard } from '../quiz/QuestionCard';
import { OptionButtonGrid } from '../quiz/OptionButtonGrid';

interface ActiveQuestionData {
  kode: string;
  pertanyaan: string;
  gambar?: string;
  options: string[];
  correctAnswerText: string;
}

interface QuizPlayScreenProps {
  theme: ThemeConfig;
  playMode: PlayMode;
  question: ActiveQuestionData;
  score: number;
  remainingSeconds: number;
  timerPercentage: number;
  selectedOption: string | null;
  isAnswerLocked: boolean;
  liveMultiplayerLeaderboard: MultiPlayerItem[];
  currentPlayerName: string;
  onSelectOption: (optionText: string) => void;
}

export const QuizPlayScreen: React.FC<QuizPlayScreenProps> = ({
  theme,
  playMode,
  question,
  score,
  remainingSeconds,
  timerPercentage,
  selectedOption,
  isAnswerLocked,
  liveMultiplayerLeaderboard,
  currentPlayerName,
  onSelectOption,
}) => {
  return (
    <div className="w-full flex flex-col justify-between max-w-4xl gap-2.5 sm:gap-3">
      <div className="w-full shrink-0">
        <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1.5 px-0.5 tabular-nums">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span
              className={`font-mono px-2 py-0.5 rounded border shrink-0 ${
                theme.isDark
                  ? 'text-cyan-300 bg-slate-800/90 border-slate-700'
                  : 'text-slate-600 bg-white/80 border-slate-200'
              }`}
            >
              {question.kode}
            </span>
            <span
              className={`hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded truncate ${
                theme.isDark ? 'bg-slate-800 text-amber-300' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {theme.name}
            </span>
            {playMode === 'MULTIPLAYER' && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <span
              className={`text-xs font-black px-2 sm:px-2.5 py-0.5 rounded-full border shadow-xs ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
            >
              {score} Poin
            </span>

            <span
              className={`font-mono text-xs sm:text-sm font-black px-2 py-0.5 rounded-md transition-colors ${
                remainingSeconds <= 2
                  ? 'bg-rose-500 text-white animate-bounce shadow'
                  : theme.isDark
                  ? 'bg-slate-800/90 text-white border border-slate-700 shadow-xs'
                  : 'bg-white/90 text-slate-900 border border-slate-200 shadow-xs'
              }`}
            >
              {remainingSeconds}s
            </span>
          </div>
        </div>

        <div
          className={`w-full h-2 sm:h-2.5 ${
            theme.isDark ? 'bg-slate-800/90' : 'bg-slate-200/80'
          } rounded-full overflow-hidden p-0.5 shadow-inner`}
        >
          <div
            className={`h-full rounded-full transition-all duration-75 ease-linear ${
              remainingSeconds <= 2
                ? 'bg-rose-500 animate-pulse'
                : remainingSeconds <= 4
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {playMode === 'MULTIPLAYER' && (
          <LiveRoomTicker
            players={liveMultiplayerLeaderboard}
            currentPlayerName={currentPlayerName}
            currentScore={score}
            theme={theme}
          />
        )}
      </div>

      <QuestionCard
        kode={question.kode}
        pertanyaan={question.pertanyaan}
        gambar={question.gambar}
        theme={theme}
      />

      <OptionButtonGrid
        questionKode={question.kode}
        options={question.options || []}
        correctAnswerText={question.correctAnswerText}
        selectedOption={selectedOption}
        isAnswerLocked={isAnswerLocked}
        onSelectOption={onSelectOption}
      />
    </div>
  );
};
