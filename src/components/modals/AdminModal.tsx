import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, KeyRound, FileSpreadsheet, Trophy, Settings } from 'lucide-react';
import { exportRecordsToCSV } from '../../services/csvExportService';
import {
  verifyAdminPin,
  fetchAdminRecords,
  clearAdminRecords,
  fetchAdminTokens,
  generateAdminTokens,
  deleteAdminToken,
  clearAdminTokens,
  fetchAdminSpreadsheetState,
  updateSpreadsheetConfig,
  fetchParticipantSheetConfig,
  updateParticipantSheetConfig,
  testParticipantSheetConfig,
  refreshLiveTopicsAdmin,
  AdminTopicItem,
  SessionToken,
  TokenMode,
  SpreadsheetConfig,
  ParticipantSheetConfig,
  LiveTopicsResponse,
} from '../../services/quizApi';
import { playClickSound } from '../../utils/audio';
import { AdminLoginForm } from '../admin/AdminLoginForm';
import { AdminTokensTab } from '../admin/AdminTokensTab';
import { AdminSpreadsheetTab } from '../admin/AdminSpreadsheetTab';
import { AdminConfigTab } from '../admin/AdminConfigTab';
import { AdminLeaderboardTab } from '../admin/AdminLeaderboardTab';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
  onTopicsUpdated?: (data: LiveTopicsResponse) => void;
}

type AdminTab = 'TOKENS' | 'SPREADSHEET' | 'LEADERBOARD' | 'CONFIG';

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
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [tokens, setTokens] = useState<SessionToken[]>([]);
  const [isTokenBusy, setIsTokenBusy] = useState(false);

  const [sheetConfig, setSheetConfig] = useState<SpreadsheetConfig>({
    spreadsheetUrlOrId: '',
    appsScriptUrl: '',
    deploymentId: '',
    sheetNames: [],
    disabledSheets: [],
    enabled: true,
  });
  const [adminTopics, setAdminTopics] = useState<AdminTopicItem[]>([]);
  const [togglingSheetKey, setTogglingSheetKey] = useState<string | null>(null);
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
    sheetName: 'Sheet1',
    enabled: true,
  });
  const [participantTestStatus, setParticipantTestStatus] = useState<{
    ok: boolean;
    warning?: boolean;
    message: string;
    spreadsheetUrl?: string;
  } | null>(null);
  const [isParticipantBusy, setIsParticipantBusy] = useState(false);

  const [totalServerRecords, setTotalServerRecords] = useState(0);
  const [isRecordBusy, setIsRecordBusy] = useState(false);

  const applyLiveTopicsPreview = (
    live: LiveTopicsResponse,
    adminList?: AdminTopicItem[]
  ) => {
    if (Array.isArray(adminList)) {
      setAdminTopics(adminList);
    } else if (Array.isArray(live.adminTopics)) {
      setAdminTopics(live.adminTopics);
    }
    setSyncInfo({
      source: live.source,
      lastSyncedAt: live.lastSyncedAt,
      sheetTopicsCount: live.sheetTopicsCount,
      totalLiveQuestions: live.totalLiveQuestions,
      warning: live.warning,
    });
  };

  const flashSuccess = (msg: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setErrorMessage('');
    setSuccessMessage(msg);
    flashTimerRef.current = setTimeout(() => setSuccessMessage(''), 6000);
  };

  const flashError = (msg: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setSuccessMessage('');
    setErrorMessage(msg);
    flashTimerRef.current = setTimeout(() => setErrorMessage(''), 8000);
  };

  const loadAllAdminData = useCallback(async (pin: string) => {
    try {
      const [tokenList, recData, sheetState, pCfg] = await Promise.all([
        fetchAdminTokens(pin),
        fetchAdminRecords(pin),
        fetchAdminSpreadsheetState(pin),
        fetchParticipantSheetConfig(pin),
      ]);
      setTokens(tokenList);
      setTotalServerRecords(recData.totalCount);
      setSheetConfig(sheetState.config);
      setParticipantConfig(pCfg);
      applyLiveTopicsPreview(sheetState.liveTopics, sheetState.adminTopics);
    } catch (err: any) {
      flashError(err?.message || 'Gagal memuat data admin.');
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated && activePin) {
      loadAllAdminData(activePin);
    }
  }, [isOpen, isAuthenticated, activePin, loadAllAdminData]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !activePin) return;

    const refreshLiveAdminStats = () => {
      fetchAdminTokens(activePin)
        .then(setTokens)
        .catch(() => {});
      fetchAdminRecords(activePin)
        .then((recData) => setTotalServerRecords(recData.totalCount))
        .catch(() => {});
    };

    if (activeTab === 'TOKENS' || activeTab === 'LEADERBOARD') {
      refreshLiveAdminStats();
    }

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveAdminStats();
      }
    };

    window.addEventListener('focus', refreshLiveAdminStats);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    const intervalId =
      activeTab === 'TOKENS' ? setInterval(refreshLiveAdminStats, 4000) : undefined;

    return () => {
      window.removeEventListener('focus', refreshLiveAdminStats);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isAuthenticated, activePin, activeTab]);

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
      flashSuccess(`${res.created.length} token dibuat.`);
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
      flashSuccess('Token terpakai dihapus.');
    } catch (err: any) {
      flashError(err?.message || 'Gagal menghapus token.');
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
      flashError('Tidak ada token tersedia.');
      return;
    }
    handleCopyText(unused.join('\n'), 'ALL_UNUSED');
    flashSuccess(`${unused.length} token disalin.`);
  };

  const handleSaveAllConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsSheetBusy(true);
    setParticipantTestStatus(null);
    try {
      const [sheetRes, partRes] = await Promise.all([
        updateSpreadsheetConfig(activePin, {
          ...sheetConfig,
          sheetNames: [],
        }),
        updateParticipantSheetConfig(activePin, participantConfig),
      ]);

      setSheetConfig(sheetRes.config);
      setParticipantConfig(partRes.config);

      const freshTopics = sheetRes.liveTopics || (await refreshLiveTopicsAdmin(activePin));
      applyLiveTopicsPreview(freshTopics, sheetRes.adminTopics);
      if (onTopicsUpdated) onTopicsUpdated(freshTopics);

      if (freshTopics.warning && (!sheetRes.adminTopics || sheetRes.adminTopics.length === 0)) {
        flashError(freshTopics.warning);
      } else {
        flashSuccess(
          `Konfigurasi tersimpan (${freshTopics.sheetTopicsCount} topik tampil, ${freshTopics.totalLiveQuestions} soal).`
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
          `Diperbarui: ${freshTopics.sheetTopicsCount} topik tampil, ${freshTopics.totalLiveQuestions} soal.`
        );
      }
    } catch (err: any) {
      flashError(err?.message || 'Gagal memuat ulang soal.');
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleToggleSheetDisabled = async (sheetKey: string, nextDisabled: boolean) => {
    playClickSound();
    setTogglingSheetKey(sheetKey);
    try {
      const prevDisabled = Array.isArray(sheetConfig.disabledSheets)
        ? sheetConfig.disabledSheets
        : [];
      const nextDisabledSheets = nextDisabled
        ? Array.from(new Set([...prevDisabled, sheetKey]))
        : prevDisabled.filter((k) => k !== sheetKey);

      const res = await updateSpreadsheetConfig(activePin, {
        ...sheetConfig,
        disabledSheets: nextDisabledSheets,
      });
      setSheetConfig(res.config);
      applyLiveTopicsPreview(res.liveTopics, res.adminTopics);
      if (onTopicsUpdated) onTopicsUpdated(res.liveTopics);

      const targetTopic = (res.adminTopics || []).find((t) => t.sheetKey === sheetKey);
      if (nextDisabled) {
        flashSuccess(`Topik "${targetTopic?.judul || sheetKey}" dinonaktifkan.`);
      } else if (targetTopic && !targetTopic.meetsMinQuestions) {
        flashSuccess(
          `Topik diaktifkan (${targetTopic.questionCount}/10 soal — butuh min. 10 soal untuk tampil).`
        );
      } else {
        flashSuccess(`Topik "${targetTopic?.judul || sheetKey}" diaktifkan.`);
      }
    } catch (err: any) {
      flashError(err?.message || 'Gagal mengubah status topik.');
    } finally {
      setTogglingSheetKey(null);
    }
  };



  const handleTestParticipantSheet = async () => {
    playClickSound();
    setIsParticipantBusy(true);
    setParticipantTestStatus(null);
    try {
      const saved = await updateParticipantSheetConfig(activePin, participantConfig);
      setParticipantConfig(saved.config);
      const res = await testParticipantSheetConfig(activePin);
      if (res.ok) {
        const targetTab = res.sheetName || saved.config.sheetName || 'Sheet1';
        if (res.isLegacyResponse) {
          const msg = `Terkirim (${
            res.testedAt || 'baru saja'
          }). Jika belum tampak di "${targetTab}", periksa tab bawah atau deploy ulang Code.gs sebagai Versi baru.`;
          setParticipantTestStatus({
            ok: true,
            warning: true,
            message: msg,
            spreadsheetUrl: res.spreadsheetUrl || saved.config.spreadsheetUrl || undefined,
          });
          flashSuccess('Request terkirim ke Apps Script.');
        } else {
          const msg = `Berhasil masuk ke "${res.spreadsheetName}" (${targetTab}, baris ${res.rowNumber}).`;
          setParticipantTestStatus({
            ok: true,
            message: msg,
            spreadsheetUrl: res.spreadsheetUrl || saved.config.spreadsheetUrl || undefined,
          });
          flashSuccess(msg);
        }
      } else {
        const msg = res.error || 'Uji kirim gagal.';
        setParticipantTestStatus({ ok: false, message: msg });
        flashError(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Gagal menghubungi Apps Script.';
      setParticipantTestStatus({ ok: false, message: msg });
      flashError(msg);
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
        flashSuccess('CSV diunduh.');
      } else {
        flashError('Belum ada data.');
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
      flashSuccess('Papan skor direset.');
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
              {isAuthenticated ? 'Panel Admin' : 'Masuk Admin'}
            </h3>
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
          <div className="px-4 sm:px-5 pt-2.5 pb-0 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0 bg-white">
            <div className="flex gap-1.5">
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
                <span>Token ({unusedCount})</span>
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
                <span>Bank Soal</span>
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

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('CONFIG');
              }}
              className={`mb-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'CONFIG'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Konfigurasi</span>
            </button>
          </div>
        )}

        {(errorMessage || successMessage) && (
          <div className="px-4 sm:px-5 pt-2.5 shrink-0">
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-start justify-between gap-2">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  className="text-rose-500 hover:text-rose-800 shrink-0 cursor-pointer"
                  aria-label="Tutup pesan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-start justify-between gap-2">
                <span>{successMessage}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMessage('')}
                  className="text-emerald-600 hover:text-emerald-900 shrink-0 cursor-pointer"
                  aria-label="Tutup pesan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
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
              adminTopics={adminTopics}
              togglingSheetKey={togglingSheetKey}
              syncInfo={syncInfo}
              isBusy={isSheetBusy}
              onForceRefresh={handleForceRefreshTopics}
              onToggleSheetDisabled={handleToggleSheetDisabled}
              onOpenConfig={() => {
                playClickSound();
                setActiveTab('CONFIG');
              }}
            />
          ) : activeTab === 'CONFIG' ? (
            <AdminConfigTab
              sheetConfig={sheetConfig}
              participantConfig={participantConfig}
              isSaving={isSheetBusy}
              isParticipantTesting={isParticipantBusy}
              participantTestStatus={participantTestStatus}
              copiedCode={copiedCode}
              onChangeSheetConfig={setSheetConfig}
              onChangeParticipantConfig={setParticipantConfig}
              onSaveAllConfigs={handleSaveAllConfigs}
              onTestParticipantSend={handleTestParticipantSheet}
              onBackToBankSoal={() => {
                playClickSound();
                setActiveTab('SPREADSHEET');
              }}
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
