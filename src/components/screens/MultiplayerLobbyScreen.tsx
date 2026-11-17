import React from 'react';
import { Crown, Play, LogOut, Copy, CheckCheck } from 'lucide-react';
import { MultiPlayerItem } from '../../utils/useMultiplayer';

interface MultiplayerLobbyScreenProps {
  roomCode: string | null;
  topicTitle: string;
  players: MultiPlayerItem[];
  isHost: boolean;
  copiedPin: boolean;
  onCopyPin: (code: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const MultiplayerLobbyScreen: React.FC<MultiplayerLobbyScreenProps> = ({
  roomCode,
  topicTitle,
  players,
  isHost,
  copiedPin,
  onCopyPin,
  onStartGame,
  onLeaveRoom,
}) => {
  return (
    <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-amber-200/90 text-center animate-pop text-slate-900">
      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
        {topicTitle}
      </span>

      <div className="my-3 p-3.5 sm:p-4 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-300 flex flex-col items-center">
        <span className="text-xs font-bold text-slate-500 mb-0.5">PIN ROOM BERSAMA</span>
        <div className="flex items-center gap-2">
          <span className="text-3xl sm:text-5xl font-mono font-black tracking-widest text-slate-900">
            {roomCode}
          </span>
          <button
            type="button"
            onClick={() => roomCode && onCopyPin(roomCode)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
            title="Salin PIN"
          >
            {copiedPin ? (
              <CheckCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        <span className="text-[11px] text-slate-500 mt-1">
          Bagikan 4 digit PIN ini kepada peserta lain untuk bergabung
        </span>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-slate-700 px-1 mb-2">
          <span>Peserta Terhubung ({players.length})</span>
          <span className={players.length >= 2 ? 'text-emerald-700' : 'text-amber-700'}>
            {players.length >= 2
              ? '✓ Siap Bermain (Min. 2 Orang)'
              : 'Menunggu minimal 2 orang...'}
          </span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                  #{idx + 1}
                </span>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span className="truncate">{p.name}</span>
                    {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{p.institution}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Tersambung
              </span>
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button
          type="button"
          onClick={onStartGame}
          disabled={players.length < 2}
          className="btn-kahoot w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm border-b-4 border-emerald-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
        >
          <Play className="w-4 h-4 fill-white shrink-0" />
          <span>MULAI KUIS BERSAMA ({players.length} Peserta)</span>
        </button>
      ) : (
        <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          <span>Menunggu Host memulai kuis bersama...</span>
        </div>
      )}

      <button
        type="button"
        onClick={onLeaveRoom}
        className="mt-3 text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer select-none"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Keluar dari Room</span>
      </button>
    </div>
  );
};
