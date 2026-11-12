import React from 'react';
import { THEMES, ThemeId, getRandomTheme } from '../types/theme';
import { playClickSound } from '../utils/audio';
import { X, Check, Dices } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-display">
      <div className="relative w-full max-w-lg bg-white/95 rounded-2xl shadow-2xl border-2 border-amber-300 flex flex-col overflow-hidden animate-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/70">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>🎨</span>
              <span>Pilih Tema Kuis</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tema otomatis diacak tiap device & login, atau pilih manual di bawah:
            </p>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {Object.values(THEMES).map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`btn-kahoot relative p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-400/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                {/* Theme Icon / Preview Badge */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${theme.previewGradient} flex items-center justify-center text-2xl shadow-sm shrink-0 border border-white/40`}
                >
                  {theme.icon}
                </div>

                {/* Theme Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {theme.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {theme.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onSelectTheme(getRandomTheme());
              onClose();
            }}
            className="px-3 py-1.5 font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Dices className="w-3.5 h-3.5 text-amber-700" />
            <span>Acak Tema Sekarang</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-3.5 py-1.5 font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
