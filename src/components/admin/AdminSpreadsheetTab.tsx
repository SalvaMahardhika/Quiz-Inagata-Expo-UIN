import React, { useState } from 'react';
import { RefreshCw, Check, Eye, X, Settings } from 'lucide-react';
import { AdminTopicItem } from '../../services/quizApi';

interface AdminSpreadsheetTabProps {
  adminTopics: AdminTopicItem[];
  togglingSheetKey: string | null;
  syncInfo: {
    source: string;
    lastSyncedAt: string;
    sheetTopicsCount: number;
    totalLiveQuestions: number;
    warning?: string;
  } | null;
  isBusy: boolean;
  onForceRefresh: () => void;
  onToggleSheetDisabled: (sheetKey: string, nextDisabled: boolean) => void;
  onOpenConfig: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const AdminSpreadsheetTab: React.FC<AdminSpreadsheetTabProps> = ({
  adminTopics,
  togglingSheetKey,
  syncInfo,
  isBusy,
  onForceRefresh,
  onToggleSheetDisabled,
  onOpenConfig,
}) => {
  const [previewSheetKey, setPreviewSheetKey] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const previewTopic = previewSheetKey
    ? adminTopics.find((t) => t.sheetKey === previewSheetKey) || null
    : null;
  const activeCount = adminTopics.filter((t) => t.activeForPlayers).length;

  return (
    <div className="space-y-3">
      {/* Bar Status & Aksi Cepat */}
      <div
        className={`p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
          !syncInfo || syncInfo.source === 'unconfigured'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : syncInfo.warning
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50/70 border-emerald-200 text-slate-700'
        }`}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              Sumber:{' '}
              <strong className="text-slate-900">
                {syncInfo?.source === 'apps_script'
                  ? 'Apps Script'
                  : syncInfo?.source === 'spreadsheet'
                  ? 'Google Sheets'
                  : 'Belum terhubung'}
              </strong>
            </span>
            {syncInfo && (
              <span className="font-mono text-[11px] font-bold">
                · {syncInfo.sheetTopicsCount} topik tampil · {syncInfo.totalLiveQuestions} soal
              </span>
            )}
          </div>
          {syncInfo?.warning && (
            <p
              className={`text-[11px] leading-snug font-medium ${
                syncInfo.source === 'unconfigured' ? 'text-rose-700' : 'text-amber-800'
              }`}
            >
              {syncInfo.warning}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onForceRefresh}
            disabled={isBusy}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={onOpenConfig}
            className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi</span>
          </button>
        </div>
      </div>

      {/* Daftar Sheet / Topik */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800">
            Daftar Sheet Topik (min. 10 soal per topik)
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-900">
            {adminTopics.length > 0 ? `${activeCount}/${adminTopics.length} tampil` : '0 topik'}
          </span>
        </div>

        {adminTopics.length > 0 ? (
          <div className="space-y-1.5">
            {adminTopics.map((topic) => {
              const isPreviewOpen = previewTopic?.sheetKey === topic.sheetKey;
              const isToggling = togglingSheetKey === topic.sheetKey;

              return (
                <div
                  key={topic.sheetKey}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 border rounded-lg text-[11px] transition-colors ${
                    topic.disabled
                      ? 'bg-slate-100 border-slate-200 opacity-75'
                      : topic.meetsMinQuestions
                      ? 'bg-white border-slate-200'
                      : 'bg-amber-50/80 border-amber-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      {topic.nama}: {topic.judul}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 font-medium ${
                        topic.disabled
                          ? 'text-slate-500'
                          : topic.meetsMinQuestions
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {topic.disabled
                        ? `${topic.questionCount} soal · Nonaktif`
                        : topic.meetsMinQuestions
                        ? `${topic.questionCount} soal · Tampil di kuis`
                        : `${topic.questionCount}/10 soal · Butuh min. 10 soal`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewSheetKey((curr) =>
                          curr === topic.sheetKey ? null : topic.sheetKey
                        )
                      }
                      className={`px-2.5 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        isPreviewOpen
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isPreviewOpen ? 'Tutup' : 'Preview'}</span>
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={!topic.disabled}
                      aria-label={`Aktifkan topik ${topic.judul}`}
                      disabled={isBusy || isToggling}
                      onClick={() => onToggleSheetDisabled(topic.sheetKey, !topic.disabled)}
                      className={`px-2.5 py-1 rounded-md border text-[10px] font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                        topic.disabled
                          ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                      }`}
                    >
                      {isToggling ? '...' : topic.disabled ? 'Nonaktif' : 'Aktif'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-white border border-dashed border-slate-300 rounded-lg text-center space-y-2">
            <p className="text-[11px] text-slate-600">
              Belum ada sheet soal terbaca. Atur link Google Spreadsheet melalui menu Konfigurasi.
            </p>
            <button
              type="button"
              onClick={onOpenConfig}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Buka Konfigurasi Spreadsheet</span>
            </button>
          </div>
        )}
      </div>

      {/* Preview Soal Terpilih */}
      {previewTopic && (
        <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2.5">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                Preview: {previewTopic.nama} — {previewTopic.judul}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {previewTopic.questionCount} soal
                {previewTopic.disabled
                  ? ' · Dinonaktifkan admin'
                  : !previewTopic.meetsMinQuestions
                  ? ` · Tambah ${10 - previewTopic.questionCount} soal lagi agar tampil di kuis`
                  : ' · Siap dimainkan'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreviewSheetKey(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              aria-label="Tutup preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {previewTopic.soal.map((q, qIdx) => {
              const imgKey = `${previewTopic.sheetKey}:${q.kode}:${qIdx}`;
              const imgBroken = !!brokenImages[imgKey];

              return (
                <div
                  key={imgKey}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[11px]"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-slate-500 shrink-0">
                      {qIdx + 1}. [{q.kode}]
                    </span>
                    <p className="font-semibold text-slate-900 leading-snug">{q.pertanyaan}</p>
                  </div>

                  {q.gambar && !imgBroken && (
                    <div className="pt-1">
                      <img
                        src={q.gambar}
                        alt={`Gambar ${q.kode}`}
                        onError={() => setBrokenImages((prev) => ({ ...prev, [imgKey]: true }))}
                        className="max-h-32 rounded-md border border-slate-200 bg-white object-contain"
                      />
                    </div>
                  )}
                  {q.gambar && imgBroken && (
                    <p className="text-[10px] text-rose-600">Gambar gagal dimuat.</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                    {q.pilihan.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.jawabanBenar;
                      return (
                        <div
                          key={optIdx}
                          className={`px-2 py-1 rounded border flex items-center justify-between gap-1.5 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="truncate">
                            {OPTION_LETTERS[optIdx]}. {opt}
                          </span>
                          {isCorrect && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
