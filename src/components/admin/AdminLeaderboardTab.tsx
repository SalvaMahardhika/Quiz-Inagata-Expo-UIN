import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface AdminLeaderboardTabProps {
  totalRecords: number;
  isBusy: boolean;
  onExportCsv: () => void;
  onResetAll: () => void;
}

export const AdminLeaderboardTab: React.FC<AdminLeaderboardTabProps> = ({
  totalRecords,
  isBusy,
  onExportCsv,
  onResetAll,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleConfirmReset = () => {
    setShowConfirmReset(false);
    onResetAll();
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
        <span>Total peserta Solo</span>
        <span className="font-bold text-slate-900 tabular-nums">{totalRecords} peserta</span>
      </div>

      <button
        type="button"
        onClick={onExportCsv}
        disabled={isBusy}
        className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isBusy ? 'Memproses...' : 'Unduh CSV'}</span>
      </button>

      {!showConfirmReset ? (
        <button
          type="button"
          onClick={() => setShowConfirmReset(true)}
          className="w-full h-9 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Reset Papan Skor
        </button>
      ) : (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <p className="text-xs text-rose-800 text-center font-medium">
            Hapus semua data papan skor di server?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmReset}
              disabled={isBusy}
              className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmReset(false)}
              className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
