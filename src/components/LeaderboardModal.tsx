import React from 'react';
import { getTopLeaderboard, getAllQuizRecords } from '../utils/storage';
import { playClickSound } from '../utils/audio';
import { X } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const records = getTopLeaderboard(10);
  const totalCount = getAllQuizRecords().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-display">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border-2 border-amber-200 flex flex-col overflow-hidden animate-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Papan Skor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              10 Skor Tertinggi · Total {totalCount} sesi
            </p>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {records.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm font-medium text-slate-500">Belum ada skor yang tercatat.</p>
            </div>
          ) : (
            records.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-xs font-semibold tabular-nums text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">{item.institution}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[120px]">{item.topicName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <div className="text-base font-bold tabular-nums text-slate-900">
                    {item.score}
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {item.correctCount}/{item.totalQuestions} benar
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
