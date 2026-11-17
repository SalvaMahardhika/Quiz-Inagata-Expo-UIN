import React from 'react';
import { User, Users, KeyRound } from 'lucide-react';
import { ThemeConfig } from '../../types/theme';
import { PlayMode, MultiplayerAction } from '../../hooks/useQuizSession';
import { playClickSound } from '../../utils/audio';

interface RegistrationScreenProps {
  theme: ThemeConfig;
  playMode: PlayMode;
  onChangePlayMode: (mode: PlayMode) => void;
  multiplayerAction: MultiplayerAction;
  onChangeMultiplayerAction: (action: MultiplayerAction) => void;
  name: string;
  onChangeName: (val: string) => void;
  institution: string;
  onChangeInstitution: (val: string) => void;
  phone: string;
  onChangePhone: (val: string) => void;
  sessionTokenInput: string;
  onChangeSessionToken: (val: string) => void;
  joinPinInput: string;
  onChangeJoinPin: (val: string) => void;
  formError: string;
  mpError: string | null;
  clearErrors: () => void;
  isCheckingToken: boolean;
  onStartSolo: () => void;
  onProceedCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({
  theme,
  playMode,
  onChangePlayMode,
  multiplayerAction,
  onChangeMultiplayerAction,
  name,
  onChangeName,
  institution,
  onChangeInstitution,
  phone,
  onChangePhone,
  sessionTokenInput,
  onChangeSessionToken,
  joinPinInput,
  onChangeJoinPin,
  formError,
  mpError,
  clearErrors,
  isCheckingToken,
  onStartSolo,
  onProceedCreateRoom,
  onJoinRoom,
}) => {
  const inputClass = `w-full h-10 sm:h-11 px-3.5 ${
    theme.isDark
      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:bg-slate-800'
      : 'bg-slate-50 border-amber-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
  } border rounded-xl text-sm font-medium outline-none transition-all shadow-inner`;

  const labelClass = `block text-xs font-semibold mb-1 ${
    theme.isDark ? 'text-slate-200' : 'text-slate-700'
  }`;

  return (
    <div
      className={`w-full max-w-md ${theme.cardBg} rounded-2xl p-4 sm:p-6 shadow-xl border-2 ${theme.cardBorder} animate-pop`}
    >
      <div
        className={`grid grid-cols-2 p-1 ${
          theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-100/70 border-amber-200'
        } rounded-xl mb-4 border select-none`}
      >
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onChangePlayMode('SOLO');
            clearErrors();
          }}
          className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            playMode === 'SOLO'
              ? theme.isDark
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white text-slate-950 shadow-xs'
              : theme.isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-amber-900 hover:text-slate-950'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Mode Solo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onChangePlayMode('MULTIPLAYER');
            clearErrors();
          }}
          className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            playMode === 'MULTIPLAYER'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold'
              : theme.isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-amber-900 hover:text-slate-950'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Bermain Bersama</span>
        </button>
      </div>

      <div className="mb-3.5 sm:mb-4">
        <h2
          className={`text-base sm:text-lg font-bold tracking-tight ${
            theme.isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {playMode === 'SOLO' ? 'Registrasi Peserta' : 'Bermain Bersama'}
        </h2>
        <p className={`text-xs mt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {playMode === 'SOLO'
            ? 'Lengkapi data untuk memulai kuis (masuk Papan Skor Global)'
            : 'Bermain bersama di topik yang sama minimal 2 orang'}
        </p>
      </div>

      {(formError || mpError) && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-shake">
          {formError || mpError}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className={labelClass}>Nama Lengkap</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              onChangeName(e.target.value);
              clearErrors();
            }}
            placeholder="Nama lengkap atau panggilan"
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>Asal Instansi</label>
          <input
            type="text"
            value={institution}
            onChange={(e) => {
              onChangeInstitution(e.target.value);
              clearErrors();
            }}
            placeholder="Nama instansi atau organisasi"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Nomor WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              onChangePhone(e.target.value);
              clearErrors();
            }}
            placeholder="08xxxxxxxxxx"
            className={inputClass}
          />
        </div>

        {!(playMode === 'MULTIPLAYER' && multiplayerAction === 'JOIN') && (
          <div>
            <label className={labelClass}>Token Sesi (1 Token = 1 Sesi)</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sessionTokenInput}
                onChange={(e) => {
                  onChangeSessionToken(e.target.value.toUpperCase());
                  clearErrors();
                }}
                placeholder="Masukkan token dari Admin (misal: K7M9P2)"
                className={`w-full h-10 sm:h-11 pl-9 pr-3.5 uppercase font-mono tracking-wider ${
                  theme.isDark
                    ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:bg-slate-800'
                    : 'bg-slate-50 border-amber-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                } border rounded-xl text-sm font-bold outline-none transition-all shadow-inner`}
              />
            </div>
          </div>
        )}

        {playMode === 'SOLO' ? (
          <button
            type="button"
            onClick={onStartSolo}
            disabled={isCheckingToken}
            className={`btn-kahoot w-full h-11 mt-2 ${theme.primaryButtonBg} font-extrabold rounded-xl text-xs border-b-4 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none disabled:opacity-60`}
          >
            <span>{isCheckingToken ? 'MEMERIKSA TOKEN...' : 'PILIH TOPIK'}</span>
            {!isCheckingToken && <span>→</span>}
          </button>
        ) : (
          <div className="pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 select-none">
              <button
                type="button"
                onClick={() => {
                  onChangeMultiplayerAction('CREATE');
                  clearErrors();
                }}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  multiplayerAction === 'CREATE'
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Buat Room Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeMultiplayerAction('JOIN');
                  clearErrors();
                }}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  multiplayerAction === 'JOIN'
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Gabung Room
              </button>
            </div>

            {multiplayerAction === 'CREATE' ? (
              <button
                type="button"
                onClick={onProceedCreateRoom}
                disabled={isCheckingToken}
                className="btn-kahoot w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold rounded-xl text-xs border-b-4 border-emerald-800 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none disabled:opacity-60"
              >
                <span>
                  {isCheckingToken ? 'MEMERIKSA TOKEN...' : 'PILIH TOPIK & BUAT PIN ROOM'}
                </span>
                {!isCheckingToken && <span>→</span>}
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={joinPinInput}
                    onChange={(e) => onChangeJoinPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4 Digit PIN"
                    className="w-full sm:w-2/5 h-11 text-center font-mono text-base font-black tracking-widest bg-slate-50 text-slate-900 border-2 border-amber-200 focus:border-amber-500 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={onJoinRoom}
                    className="btn-kahoot w-full sm:flex-1 h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs border-b-4 border-amber-700 shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    <span>GABUNG ROOM</span>
                    <span>→</span>
                  </button>
                </div>
                <p
                  className={`text-[11px] ${
                    theme.isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Peserta bergabung menggunakan 4 digit PIN Room dari Host (token sesi dipakai oleh
                  Host).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
