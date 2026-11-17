import React from 'react';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { TopicPackage } from '../../types/quiz';
import { ThemeConfig } from '../../types/theme';
import { PlayMode } from '../../hooks/useQuizSession';
import { playClickSound } from '../../utils/audio';

interface TopicSelectionScreenProps {
  theme: ThemeConfig;
  playMode: PlayMode;
  name: string;
  institution: string;
  topics: Record<number, TopicPackage>;
  topicSource: 'spreadsheet' | 'apps_script' | 'unconfigured';
  topicWarning?: string;
  isBusy: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onSelectTopic: (topic: TopicPackage) => void;
}

export const TopicSelectionScreen: React.FC<TopicSelectionScreenProps> = ({
  theme,
  playMode,
  name,
  institution,
  topics,
  topicSource,
  topicWarning,
  isBusy,
  errorMessage,
  onBack,
  onSelectTopic,
}) => {
  const topicList = Object.values(topics);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col py-1">
      <div
        className={`flex items-center justify-between gap-2 pb-2.5 border-b ${theme.headerBorder} shrink-0`}
      >
        <button
          onClick={() => {
            playClickSound();
            onBack();
          }}
          className={`btn-kahoot inline-flex items-center gap-1 px-2.5 py-1.5 ${
            theme.isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-b-2 border-slate-600'
              : 'bg-white/90 hover:bg-white text-slate-700 border-b-2 border-slate-300'
          } rounded-lg text-xs font-bold shadow-xs cursor-pointer shrink-0 select-none`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        <div
          className={`text-right text-[11px] sm:text-xs ${
            theme.isDark ? 'text-slate-300' : 'text-slate-600'
          } truncate`}
        >
          <span className={`font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
            {name}
          </span>{' '}
          · {playMode === 'MULTIPLAYER' ? 'Buat Room Bersama' : institution}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {errorMessage}
        </div>
      )}

      {topicList.length === 0 ? (
        <div
          className={`my-6 p-6 rounded-2xl border-2 text-center shadow-lg ${
            theme.isDark
              ? 'bg-slate-900/90 border-slate-700 text-white'
              : 'bg-white/95 border-amber-200 text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold">Bank Soal Spreadsheet Belum Terhubung</h3>
          <p
            className={`text-xs mt-1.5 max-w-md mx-auto leading-relaxed ${
              theme.isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {topicWarning ||
              'Belum ada soal aktif. Silakan masuk ke menu Admin → Live Soal (Sheet) untuk mengunduh template Excel (.xlsx) atau menghubungkan link Google Spreadsheet Anda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 my-3">
          {topicList.map((topic) => (
            <button
              key={topic.id}
              disabled={isBusy}
              onClick={() => onSelectTopic(topic)}
              className={`btn-kahoot group p-3 sm:p-4 ${
                theme.isDark
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700 hover:border-amber-400 border-b-slate-800 hover:border-b-amber-500'
                  : 'bg-white/95 hover:bg-amber-50/90 text-slate-900 border-amber-200/90 hover:border-amber-400 border-b-amber-300 hover:border-b-amber-500'
              } rounded-xl sm:rounded-2xl border-2 border-b-4 shadow-sm text-left flex flex-col justify-between min-h-[5.5rem] sm:min-h-[6.75rem] cursor-pointer transition-all select-none disabled:opacity-60`}
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${theme.badgeBg} ${theme.badgeText} font-mono text-[11px] sm:text-xs font-bold flex items-center justify-center shrink-0`}
                >
                  {String(topic.id).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                  {topic.nama}
                </span>
              </div>
              <div className="mt-2">
                <h3
                  className={`text-xs sm:text-base font-bold ${
                    theme.isDark ? 'text-white' : 'text-slate-900'
                  } leading-snug line-clamp-2`}
                >
                  {topic.judul}
                </h3>
                <p
                  className={`text-[11px] sm:text-xs ${
                    theme.isDark ? 'text-slate-400' : 'text-slate-500'
                  } line-clamp-2 mt-0.5 sm:mt-1`}
                >
                  {topic.deskripsi}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        className={`text-center text-[11px] sm:text-xs font-semibold ${
          theme.isDark ? 'text-slate-400' : 'text-slate-500'
        } pt-1 pb-2 flex items-center justify-center gap-2 flex-wrap`}
      >
        <span>
          {playMode === 'MULTIPLAYER'
            ? 'Pilih topik untuk membuat Room Live dan mengacak 10 soal'
            : 'Pilih satu topik untuk memulai 10 soal acak'}
        </span>
        {topicSource !== 'unconfigured' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            Live Spreadsheet
          </span>
        )}
      </div>
    </div>
  );
};
