import React, { useState, useEffect, useCallback } from 'react';
import { X, KeyRound, FileSpreadsheet, Trophy, Users } from 'lucide-react';
import { exportRecordsToCSV } from '../../services/csvExportService';
import {
  verifyAdminPin,
  fetchAdminRecords,
  clearAdminRecords,
  fetchAdminTokens,
  generateAdminTokens,
  deleteAdminToken,
  clearAdminTokens,
  fetchSpreadsheetConfig,
  updateSpreadsheetConfig,
  fetchParticipantSheetConfig,
  updateParticipantSheetConfig,
  testParticipantSheetConfig,
  fetchLiveTopics,
  refreshLiveTopicsAdmin,
  SessionToken,
  TokenMode,
  SpreadsheetConfig,
  ParticipantSheetConfig,
  LiveTopicsResponse,
} from '../../services/quizApi';
import { playClickSound } from '../../utils/audio';
import { AdminLoginForm } from '../admin/AdminLoginForm';
import { AdminTokensTab } from '../admin/AdminTokensTab';
import { AdminSpreadsheetTab, DetectedSheetItem } from '../admin/AdminSpreadsheetTab';
import { AdminParticipantSheetTab } from '../admin/AdminParticipantSheetTab';
import { AdminLeaderboardTab } from '../admin/AdminLeaderboardTab';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  onTopicsUpdated?: (data: LiveTopicsResponse) => void;
}

type AdminTab = 'TOKENS' | 'SPREADSHEET' | 'PARTICIPANTS' | 'LEADERBOARD';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  onTopicsUpdated,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [activePin, setActivePin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('TOKENS');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [tokens, setTokens] = useState<SessionToken[]>([]);
  const [isTokenBusy, setIsTokenBusy] = useState(false);

  const [sheetConfig, setSheetConfig] = useState<SpreadsheetConfig>({
    spreadsheetUrlOrId: '',
    appsScriptUrl: '',
    deploymentId: '',
    sheetNames: [],
    enabled: true,
  });
  const [detectedSheets, setDetectedSheets] = useState<DetectedSheetItem[]>([]);
  const [syncInfo, setSyncInfo] = useState<{
    source: string;
    lastSyncedAt: string;
    sheetTopicsCount: number;
    totalLiveQuestions: number;
    warning?: string;
  } | null>(null);
  const [isSheetBusy, setIsSheetBusy] = useState(false);

  const [participantConfig, setParticipantConfig] = useState<ParticipantSheetConfig>({
    spreadsheetUrl: '',
    appsScriptUrl: '',
    deploymentId: '',
    sheetName: 'Daftar Peserta',
    enabled: true,
  });
  const [isParticipantBusy, setIsParticipantBusy] = useState(false);

  const [totalServerRecords, setTotalServerRecords] = useState(0);
  const [isRecordBusy, setIsRecordBusy] = useState(false);

  const applyLiveTopicsPreview = (live: LiveTopicsResponse) => {
    const list: DetectedSheetItem[] = Object.values(live.topics || {}).map((t) => ({
      id: t.id,
      nama: t.nama,
      judul: t.judul,
      questionCount: Array.isArray(t.soal) ? t.soal.length : 0,
    }));
    setDetectedSheets(list);
    setSyncInfo({
      source: live.source,
      lastSyncedAt: live.lastSyncedAt,
      sheetTopicsCount: live.sheetTopicsCount,
      totalLiveQuestions: live.totalLiveQuestions,
      warning: live.warning,
    });
  };

  const flashSuccess = (msg: string) => {
    setErrorMessage('');
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const flashError = (msg: string) => {
    setSuccessMessage('');
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const loadAllAdminData = useCallback(async (pin: string) => {
    try {
      const [tokenList, recData, cfg, pCfg, live] = await Promise.all([
        fetchAdminTokens(pin),
        fetchAdminRecords(pin),
        fetchSpreadsheetConfig(pin),
        fetchParticipantSheetConfig(pin),
        fetchLiveTopics(false),
      ]);
      setTokens(tokenList);
      setTotalServerRecords(recData.totalCount);
      setSheetConfig(cfg);
      setParticipantConfig(pCfg);
      applyLiveTopicsPreview(live);
    } catch (err: any) {
      flashError(err?.message || 'Gagal memuat data admin.');
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated && activePin) {
      loadAllAdminData(activePin);
    }
  }, [isOpen, isAuthenticated, activePin, loadAllAdminData]);

  if (!isOpen) return null;

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!pinInput.trim()) return;

    setIsVerifying(true);
    setErrorMessage('');
    try {
      const ok = await verifyAdminPin(pinInput.trim());
      if (ok) {
        const verified = pinInput.trim();
        setActivePin(verified);
        setIsAuthenticated(true);
        await loadAllAdminData(verified);
      } else {
        setErrorMessage('PIN Admin tidak sesuai.');
        setPinInput('');
      }
    } catch {
      setErrorMessage('Gagal menghubungi server.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGenerateTokens = async (params: {
    count: number;
    mode: TokenMode;
    label: string;
  }) => {
    playClickSound();
    setIsTokenBusy(true);
    try {
      const res = await generateAdminTokens(activePin, params);
      setTokens(res.tokens);
      flashSuccess(`${res.created.length} token sesi berhasil dibuat.`);
    } catch (err: any) {
      flashError(err?.message || 'Gagal membuat token.');
    } finally {
      setIsTokenBusy(false);
    }
  };

  const handleDeleteToken = async (code: string) => {
    playClickSound();
    try {
      const updated = await deleteAdminToken(activePin, code);
      setTokens(updated);
    } catch (err: any) {
      flashError(err?.message || 'Gagal menghapus token.');
    }
  };

  const handleClearUsedTokens = async () => {
    playClickSound();
    try {
      const updated = await clearAdminTokens(activePin, 'used');
      setTokens(updated);
      flashSuccess('Token terpakai berhasil dibersihkan.');
    } catch (err: any) {
      flashError(err?.message || 'Gagal membersihkan token.');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    playClickSound();
    navigator.clipboard?.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleCopyAllUnused = () => {
    const unused = tokens.filter((t) => t.status === 'UNUSED').map((t) => t.code);
    if (unused.length === 0) {
      flashError('Tidak ada token tersedia untuk disalin.');
      return;
    }
    handleCopyText(unused.join('\n'), 'ALL_UNUSED');
    flashSuccess(`${unused.length} token tersedia disalin ke clipboard.`);
  };

  const handleSaveAndSyncSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsSheetBusy(true);
    try {
      const res = await updateSpreadsheetConfig(activePin, {
        ...sheetConfig,
        sheetNames: [],
      });
      setSheetConfig(res.config);

      const freshTopics = await refreshLiveTopicsAdmin(activePin);
      applyLiveTopicsPreview(freshTopics);
      if (onTopicsUpdated) onTopicsUpdated(freshTopics);

      if (freshTopics.warning) {
        flashError(freshTopics.warning);
      } else {
        flashSuccess(
          `Sinkronisasi selesai (${freshTopics.sheetTopicsCount} tipe soal, ${freshTopics.totalLiveQuestions} soal).`
        );
      }
    } catch (err: any) {
      flashError(err?.message || 'Gagal menyimpan konfigurasi spreadsheet.');
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleForceRefreshTopics = async () => {
    playClickSound();
    setIsSheetBusy(true);
    try {
      const freshTopics = await refreshLiveTopicsAdmin(activePin);
      applyLiveTopicsPreview(freshTopics);
      if (onTopicsUpdated) onTopicsUpdated(freshTopics);
      if (freshTopics.warning) {
        flashError(freshTopics.warning);
      } else {
        flashSuccess(
          `Soal diperbarui (${freshTopics.sheetTopicsCount} tipe soal, ${freshTopics.totalLiveQuestions} soal).`
        );
      }
    } catch (err: any) {
      flashError(err?.message || 'Gagal menyinkronkan soal.');
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleSaveParticipantSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsParticipantBusy(true);
    try {
      const res = await updateParticipantSheetConfig(activePin, participantConfig);
      setParticipantConfig(res.config);
      flashSuccess('Pengaturan Spreadsheet Daftar Peserta berhasil disimpan.');
    } catch (err: any) {
      flashError(err?.message || 'Gagal menyimpan pengaturan spreadsheet peserta.');
    } finally {
      setIsParticipantBusy(false);
    }
  };

  const handleTestParticipantSheet = async () => {
    playClickSound();
    setIsParticipantBusy(true);
    try {
      await updateParticipantSheetConfig(activePin, participantConfig);
      const res = await testParticipantSheetConfig(activePin);
      if (res.ok) {
        flashSuccess('Baris contoh berhasil dikirim ke Spreadsheet Daftar Peserta!');
      } else {
        flashError(res.error || 'Gagal mengirim baris uji coba.');
      }
    } catch (err: any) {
      flashError(err?.message || 'Gagal menguji koneksi Spreadsheet Daftar Peserta.');
    } finally {
      setIsParticipantBusy(false);
    }
  };

  const handleExport = async () => {
    playClickSound();
    setIsRecordBusy(true);
    try {
      const data = await fetchAdminRecords(activePin);
      setTotalServerRecords(data.totalCount);
      const success = exportRecordsToCSV(data.records);
      if (success) {
        flashSuccess('File CSV seluruh perangkat berhasil diunduh.');
      } else {
        flashError('Belum ada data peserta di server untuk diekspor.');
      }
    } catch (err: any) {
      flashError(err?.message || 'Gagal mengunduh CSV.');
    } finally {
      setIsRecordBusy(false);
    }
  };

  const handleResetData = async () => {
    playClickSound();
    setIsRecordBusy(true);
    try {
      await clearAdminRecords(activePin);
      setTotalServerRecords(0);
      if (onDataChanged) onDataChanged();
      flashSuccess('Seluruh data Papan Skor Global telah dihapus.');
    } catch (err: any) {
      flashError(err?.message || 'Gagal mereset data.');
    } finally {
      setIsRecordBusy(false);
    }
  };

  const handleClose = () => {
    playClickSound();
    setPinInput('');
    setActivePin('');
    setIsAuthenticated(false);
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  const unusedCount = tokens.filter((t) => t.status === 'UNUSED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-display">
      <div
        className={`relative w-full ${
          isAuthenticated ? 'max-w-2xl' : 'max-w-sm'
        } max-h-[90dvh] bg-white rounded-2xl shadow-2xl border-2 border-amber-200 flex flex-col overflow-hidden animate-pop`}
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/60">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {isAuthenticated ? 'Panel Admin Quiz Inagata' : 'Akses Admin'}
            </h3>
            {isAuthenticated && (
              <p className="text-[11px] text-slate-500">
                Kelola token sesi, bank soal live spreadsheet, & papan skor global
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isAuthenticated && (
          <div className="px-4 sm:px-5 pt-2.5 pb-0 border-b border-slate-200 flex gap-1.5 overflow-x-auto shrink-0 bg-white">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('TOKENS');
              }}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'TOKENS'
                  ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Token Sesi ({unusedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('SPREADSHEET');
              }}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'SPREADSHEET'
                  ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Live Soal (Sheet)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('PARTICIPANTS');
              }}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'PARTICIPANTS'
                  ? 'border-emerald-500 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Peserta (Sheet)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('LEADERBOARD');
              }}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'LEADERBOARD'
                  ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Papan Skor ({totalServerRecords})</span>
            </button>
          </div>
        )}

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">
              {successMessage}
            </div>
          )}

          {!isAuthenticated ? (
            <AdminLoginForm
              pinInput={pinInput}
              isVerifying={isVerifying}
              onChangePin={(val) => {
                setPinInput(val);
                if (errorMessage) setErrorMessage('');
              }}
              onSubmit={handleVerifyPin}
            />
          ) : activeTab === 'TOKENS' ? (
            <AdminTokensTab
              tokens={tokens}
              isBusy={isTokenBusy}
              copiedCode={copiedCode}
              onGenerate={handleGenerateTokens}
              onDelete={handleDeleteToken}
              onClearUsed={handleClearUsedTokens}
              onCopyText={handleCopyText}
              onCopyAllUnused={handleCopyAllUnused}
            />
          ) : activeTab === 'SPREADSHEET' ? (
            <AdminSpreadsheetTab
              config={sheetConfig}
              detectedSheets={detectedSheets}
              syncInfo={syncInfo}
              isBusy={isSheetBusy}
              copiedCode={copiedCode}
              onChangeConfig={setSheetConfig}
              onSaveAndSync={handleSaveAndSyncSheet}
              onForceRefresh={handleForceRefreshTopics}
              onCopyText={handleCopyText}
            />
          ) : activeTab === 'PARTICIPANTS' ? (
            <AdminParticipantSheetTab
              config={participantConfig}
              isBusy={isParticipantBusy}
              copiedCode={copiedCode}
              onChangeConfig={setParticipantConfig}
              onSaveConfig={handleSaveParticipantSheet}
              onTestSend={handleTestParticipantSheet}
              onCopyText={handleCopyText}
            />
          ) : (
            <AdminLeaderboardTab
              totalRecords={totalServerRecords}
              isBusy={isRecordBusy}
              onExportCsv={handleExport}
              onResetAll={handleResetData}
            />
          )}
        </div>
      </div>
    </div>
  );
};
