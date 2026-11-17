import React from 'react';
import { Crown } from 'lucide-react';
import { ThemeConfig } from '../../types/theme';
import { MultiPlayerItem } from '../../utils/useMultiplayer';

interface MultiplayerPodiumProps {
  topicTitle: string;
  leaderboard: MultiPlayerItem[];
  currentPlayerName: string;
  currentScore: number;
  theme: ThemeConfig;
  onFinish: () => void;
}

export const MultiplayerPodium: React.FC<MultiplayerPodiumProps> = ({
  topicTitle,
  leaderboard,
  currentPlayerName,
  currentScore,
  theme,
  onFinish,
}) => {
  return (
    <div
      className={`w-full max-w-md ${theme.cardBg} rounded-2xl p-4 sm:p-6 border-2 ${theme.cardBorder} shadow-xl animate-pop text-center`}
    >
      <span
        className={`text-xs font-bold uppercase tracking-wider ${
          theme.isDark ? 'text-amber-300' : 'text-amber-800'
        }`}
      >
        {topicTitle}
      </span>
      <h2
        className={`text-lg sm:text-xl font-black ${
          theme.isDark ? 'text-white' : 'text-slate-900'
        } mt-1 mb-4`}
      >
        Podium Juara Quiz Inagata
      </h2>

      <div className="flex items-end justify-center gap-2 sm:gap-3 mb-5 px-1 sm:px-2 h-36">
        {leaderboard[1] ? (
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <div
              className={`text-xs font-bold truncate w-full px-1 ${
                theme.isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {leaderboard[1].name}
            </div>
            <div
              className={`text-[11px] font-mono font-bold ${
                theme.isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {leaderboard[1].score} pt
            </div>
            <div
              className={`w-full h-20 ${
                theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-300'
              } border-2 rounded-t-xl flex flex-col items-center justify-center shadow-xs mt-1`}
            >
              <span
                className={`text-sm font-black ${
                  theme.isDark ? 'text-white' : 'text-slate-700'
                }`}
              >
                #2
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {leaderboard[0] && (
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <div className="text-xs font-bold text-amber-400 truncate w-full px-1 flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{leaderboard[0].name}</span>
            </div>
            <div className="text-xs font-mono font-black text-amber-400">
              {leaderboard[0].score} pt
            </div>
            <div className="w-full h-28 bg-gradient-to-t from-amber-400 to-yellow-300 border-2 border-amber-400 rounded-t-xl flex flex-col items-center justify-center shadow-md mt-1 text-slate-950">
              <span className="text-base font-black">#1</span>
            </div>
          </div>
        )}

        {leaderboard[2] ? (
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <div
              className={`text-xs font-bold truncate w-full px-1 ${
                theme.isDark ? 'text-amber-200' : 'text-amber-900'
              }`}
            >
              {leaderboard[2].name}
            </div>
            <div
              className={`text-[11px] font-mono font-bold ${
                theme.isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {leaderboard[2].score} pt
            </div>
            <div className="w-full h-16 bg-amber-600/30 border-2 border-amber-600/40 rounded-t-xl flex flex-col items-center justify-center shadow-xs mt-1">
              <span className="text-sm font-black text-amber-400">#3</span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      <div
        className={`max-h-36 overflow-y-auto space-y-1 p-2 ${
          theme.isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
        } rounded-xl border mb-4 text-left`}
      >
        {leaderboard.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-2 p-2 ${
              theme.isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            } rounded-lg border text-xs`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-bold text-slate-400 w-5 shrink-0">#{idx + 1}</span>
              <span className="font-bold truncate">{p.name}</span>
              <span className="text-[11px] text-slate-400 truncate">({p.institution})</span>
            </div>
            <span className="font-mono font-black text-amber-500 tabular-nums shrink-0">
              {p.name.trim() === currentPlayerName.trim()
                ? Math.max(p.score, currentScore)
                : p.score}{' '}
              pt
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="btn-kahoot w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs border-b-4 border-slate-950 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
      >
        <span>KEMBALI KE MENU UTAMA</span>
      </button>
    </div>
  );
};
