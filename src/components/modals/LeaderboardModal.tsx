import React, { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, Trophy, Globe } from 'lucide-react';
import { fetchGlobalLeaderboard, PublicLeaderboardItem } from '../../services/quizApi';
import { playClickSound } from '../../utils/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<PublicLeaderboardItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchGlobalLeaderboard(20);
      setRecords(data.top || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat papan skor terpusat.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen, loadLeaderboard]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-display">
      <div className="relative w-full max-w-xl max-h-[88dvh] bg-white rounded-2xl shadow-2xl border-2 border-amber-200 flex flex-col overflow-hidden animate-pop">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-amber-50/40">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
              <h2 className="text-base font-bold text-slate-900 truncate">
                Papan Skor Global
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Globe className="w-3 h-3" />
                Tersinkronisasi semua perangkat
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Total {totalCount} sesi Solo</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                loadLeaderboard();
              }}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
              aria-label="Segarkan Papan Skor"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
            <button
              type="button"
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
        </div>

        <div className="p-3 sm:p-4 flex-1 overflow-y-auto space-y-2">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

          {isLoading && records.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
              <p className="text-xs font-medium text-slate-500">Memuat papan skor global...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm font-medium text-slate-500">
                Belum ada skor Solo yang tercatat.
              </p>
            </div>
          ) : (
            records.map((item, index) => {
              const rankBadgeClass =
                index === 0
                  ? 'bg-amber-400 text-amber-950 border-amber-500 font-black'
                  : index === 1
                  ? 'bg-slate-200 text-slate-800 border-slate-300 font-extrabold'
                  : index === 2
                  ? 'bg-orange-200 text-orange-950 border-orange-300 font-extrabold'
                  : 'bg-slate-100 text-slate-500 border-slate-200 font-semibold';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors bg-white"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center tabular-nums shrink-0 ${rankBadgeClass}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="truncate max-w-[130px] sm:max-w-[180px]">
                          {item.institution}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[120px] sm:max-w-[160px] text-amber-800 font-medium">
                          {item.topicName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <div className="text-base font-black tabular-nums text-slate-900">
                      {item.score}
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {item.correctCount}/{item.totalQuestions} benar
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/70">
          <span className="text-[11px] text-slate-400">Menampilkan {records.length} teratas</span>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-200/80 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
