import React from 'react';
import { Trophy } from 'lucide-react';
import { ThemeConfig } from '../../types/theme';
import { MultiPlayerItem } from '../../utils/useMultiplayer';

interface LiveRoomTickerProps {
  players: MultiPlayerItem[];
  currentPlayerName: string;
  currentScore: number;
  theme: ThemeConfig;
}

export const LiveRoomTicker: React.FC<LiveRoomTickerProps> = ({
  players,
  currentPlayerName,
  currentScore,
  theme,
}) => {
  return (
    <div
      className={`mt-1.5 px-2.5 sm:px-3 py-1.5 ${
        theme.isDark
          ? 'bg-slate-900/95 border-slate-700 text-white'
          : 'bg-white/90 border-amber-200 text-slate-800'
      } backdrop-blur-xs rounded-xl border flex items-center justify-between gap-2 text-xs overflow-x-auto shadow-xs`}
    >
      <span
        className={`text-[11px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
          theme.isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        <span>Live Room:</span>
      </span>
      <div className="flex items-center gap-3 shrink-0">
        {players.slice(0, 5).map((p, idx) => (
          <span
            key={p.id}
            className={`flex items-center gap-1 font-bold ${
              theme.isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            <span className="text-amber-500 font-mono">#{idx + 1}</span>
            <span className="truncate max-w-[80px] sm:max-w-[110px]">{p.name}</span>
            <span className="font-mono text-xs opacity-60">
              ({p.name.trim() === currentPlayerName.trim() ? currentScore : p.score})
            </span>
            {p.hasAnsweredCurrent && (
              <span className="text-[10px] text-emerald-500 font-black">✓</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};
