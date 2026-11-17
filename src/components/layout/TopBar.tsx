import React from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Trophy,
  Users,
  Palette,
} from 'lucide-react';
import { ThemeConfig } from '../../types/theme';
import { PlayMode } from '../../hooks/useQuizSession';
import { playClickSound } from '../../utils/audio';

interface TopBarProps {
  theme: ThemeConfig;
  playMode: PlayMode;
  roomCode: string | null;
  isPlaying: boolean;
  currentQIndex: number;
  totalQuestions: number;
  showHomeActions: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  onOpenThemeModal: () => void;
  onOpenLeaderboardModal: () => void;
  onOpenAdminModal: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  theme,
  playMode,
  roomCode,
  isPlaying,
  currentQIndex,
  totalQuestions,
  showHomeActions,
  isMuted,
  isFullscreen,
  onOpenThemeModal,
  onOpenLeaderboardModal,
  onOpenAdminModal,
  onToggleMute,
  onToggleFullscreen,
}) => {
  return (
    <header
      className={`relative z-20 w-full px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 border-b ${theme.headerBorder} ${theme.headerBg} shrink-0 shadow-xs transition-colors duration-300 select-none`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span
          className={`text-sm sm:text-lg font-extrabold tracking-tight truncate ${
            theme.isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Quiz Inagata
        </span>

        {playMode === 'MULTIPLAYER' && roomCode && (
          <div
            className={`flex items-center gap-1 text-[11px] sm:text-xs font-bold ${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 sm:py-1 rounded-lg border ${theme.badgeBorder} shrink-0`}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>PIN: {roomCode}</span>
          </div>
        )}
      </div>

      {isPlaying ? (
        <div
          className={`px-2 sm:px-3 py-0.5 sm:py-1 ${theme.badgeBg} border ${theme.badgeBorder} rounded-full text-[11px] sm:text-xs font-bold ${theme.badgeText} tabular-nums shadow-xs shrink-0`}
        >
          {currentQIndex + 1} / {totalQuestions}
        </div>
      ) : (
        <div className="hidden sm:block" />
      )}

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={() => {
            playClickSound();
            onOpenThemeModal();
          }}
          className={`btn-kahoot px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg border-b-2 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
            theme.isDark
              ? 'text-white bg-slate-800/90 hover:bg-slate-700 border-slate-600'
              : 'text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-300'
          }`}
          title="Ganti Tema"
        >
          <Palette className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="hidden md:inline">Tema: {theme.name}</span>
        </button>

        {showHomeActions && (
          <>
            {playMode === 'SOLO' && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenLeaderboardModal();
                }}
                className="btn-kahoot px-2 sm:px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border-b-2 border-amber-400 rounded-lg shadow-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer"
                title="Papan Skor"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span className="hidden sm:inline">Papan Skor</span>
              </button>
            )}
            <button
              onClick={() => {
                playClickSound();
                onOpenAdminModal();
              }}
              className="btn-kahoot px-2 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-b-2 border-slate-300 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              Admin
            </button>
          </>
        )}

        <button
          onClick={onToggleMute}
          className="p-1.5 text-slate-700 bg-white/80 hover:bg-white border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          aria-label={isMuted ? 'Nyalakan suara' : 'Bisukan suara'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-600" />
          ) : (
            <Volume2 className="w-4 h-4 text-slate-700" />
          )}
        </button>

        <button
          onClick={onToggleFullscreen}
          className="hidden sm:inline-flex p-1.5 text-slate-700 bg-white/80 hover:bg-white border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
