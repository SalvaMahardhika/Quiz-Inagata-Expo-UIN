import React, { useState } from 'react';
import { ADMIN_PIN } from '../data/bankSoal';
import { exportRecordsToCSV, clearAllRecords, getAllQuizRecords } from '../utils/storage';
import { playClickSound } from '../utils/audio';
import { X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, onDataChanged }) => {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!isOpen) return null;

  const totalRecords = getAllQuizRecords().length;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (pinInput.trim() === ADMIN_PIN) {
      setIsAuthenticated(true);
      setErrorMessage('');
    } else {
      setErrorMessage('PIN tidak sesuai.');
      setPinInput('');
    }
  };

  const handleExport = () => {
    playClickSound();
    const success = exportRecordsToCSV();
    if (success) {
      setSuccessMessage('File CSV berhasil diunduh.');
    } else {
      setErrorMessage('Belum ada data untuk diekspor.');
    }
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
  };

  const handleResetData = () => {
    playClickSound();
    clearAllRecords();
    setShowConfirmReset(false);
    if (onDataChanged) onDataChanged();
    setSuccessMessage('Data lokal telah dihapus.');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleClose = () => {
    playClickSound();
    setPinInput('');
    setIsAuthenticated(false);
    setErrorMessage('');
    setSuccessMessage('');
    setShowConfirmReset(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-display">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden animate-pop">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Akses Admin
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {errorMessage && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
              {successMessage}
            </div>
          )}

          {!isAuthenticated ? (
            <form onSubmit={handleVerifyPin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  PIN Admin
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Masukkan 4 digit PIN"
                  className="w-full h-10 px-3 text-center tracking-widest text-sm font-semibold bg-white border border-slate-300 focus:border-slate-900 rounded-lg outline-none transition-colors"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Masuk
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 pb-2 border-b border-slate-100 flex justify-between items-center">
                <span>Tersimpan di perangkat</span>
                <span className="font-semibold text-slate-900 tabular-nums">{totalRecords} peserta</span>
              </div>

              <button
                onClick={handleExport}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Unduh Data CSV
              </button>

              {!showConfirmReset ? (
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="w-full h-9 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Reset Data Lokal
                </button>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                  <p className="text-xs text-rose-800 text-center font-medium">
                    Hapus semua data kuis di perangkat ini?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetData}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-medium"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => setShowConfirmReset(false)}
                      className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
