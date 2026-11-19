import React, { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Copy, Check, Download } from 'lucide-react';
import { SpreadsheetConfig } from '../../services/quizApi';

const APPS_SCRIPT_TEMPLATE = `// Quiz Inagata — Google Apps Script (Scan Soal Otomatis + Rekap Hasil)
var IGNORED_SHEETS = ['hasil', 'results', 'rekap', 'peserta', 'log', 'leaderboard', 'respon', 'response', 'responses'];

// 1. Ambil seluruh sheet soal otomatis (1 sheet = 1 tipe soal)
function doGet(e) {
  try {
    var ssId = (e && e.parameter && e.parameter.spreadsheetId) ? String(e.parameter.spreadsheetId).trim() : '';
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Spreadsheet tidak ditemukan. Pastikan Apps Script dibuka dari Ekstensi -> Apps Script atau isi Link Google Spreadsheet di Panel Admin.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var sheets = ss.getSheets();
    var topics = [];

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      if (IGNORED_SHEETS.indexOf(name.toLowerCase().trim()) !== -1) continue;

      var range = sheet.getDataRange();
      var values = range.getValues();
      var formulas = range.getFormulas();
      if (values.length < 2) continue;

      var headers = values[0];
      var questions = [];
      for (var r = 1; r < values.length; r++) {
        var rowObj = {};
        var hasData = false;
        for (var c = 0; c < headers.length; c++) {
          var key = String(headers[c] || '').trim();
          if (!key) continue;
          var val = values[r][c];
          var formula = formulas[r][c] || '';

          // Ambil URL dari rumus =IMAGE("...") atau CellImage
          var imgMatch = formula.match(/^=IMAGE\\(\\s*["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            val = imgMatch[1];
          } else if (val && typeof val === 'object' && typeof val.getContentUrl === 'function') {
            try { val = val.getContentUrl() || ''; } catch (err) { val = ''; }
          }

          if (val !== '' && val !== null && val !== undefined) hasData = true;
          rowObj[key] = val;
        }
        if (hasData) questions.push(rowObj);
      }

      if (questions.length > 0) {
        topics.push({
          sheetName: name,
          questions: questions
        });
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, totalTopics: topics.length, topics: topics }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. Simpan rekap hasil peserta ke sheet "Hasil" (otomatis dibuat jika belum ada)
function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    if ((!p.name && !p.nama) && e && e.postData && e.postData.contents) {
      try { p = JSON.parse(e.postData.contents); } catch (err) {}
    }
    var ssId = p.spreadsheetId ? String(p.spreadsheetId).trim() : '';
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Spreadsheet tidak ditemukan.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var logSheet = ss.getSheetByName('Hasil');
    if (!logSheet) {
      logSheet = ss.insertSheet('Hasil');
      logSheet.appendRow(['Waktu', 'Nama', 'Instansi', 'WhatsApp', 'Mode', 'Topik', 'Skor', 'Benar', 'Total Soal', 'Detail']);
    }
    logSheet.appendRow([
      p.timestamp || p.waktu || new Date(),
      p.name || p.nama || '-',
      p.institution || p.instansi || '-',
      p.phone || p.whatsapp || '-',
      p.mode || p.mode_permainan || '-',
      p.topic || p.topik || '-',
      Number(p.score || p.skor || 0),
      Number(p.correct || p.benar || 0),
      Number(p.totalQuestions || p.total_soal || 0),
      p.detail || '-'
    ]);
    SpreadsheetApp.flush();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, spreadsheetName: ss.getName(), spreadsheetUrl: ss.getUrl(), sheet: logSheet.getName(), rowNumber: logSheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export interface DetectedSheetItem {
  id: number;
  nama: string;
  judul: string;
  questionCount: number;
}

interface AdminSpreadsheetTabProps {
  config: SpreadsheetConfig;
  detectedSheets: DetectedSheetItem[];
  syncInfo: {
    source: string;
    lastSyncedAt: string;
    sheetTopicsCount: number;
    totalLiveQuestions: number;
    warning?: string;
  } | null;
  isBusy: boolean;
  copiedCode: string | null;
  onChangeConfig: (updater: (prev: SpreadsheetConfig) => SpreadsheetConfig) => void;
  onSaveAndSync: (e: React.FormEvent) => void;
  onForceRefresh: () => void;
  onCopyText: (text: string, id: string) => void;
}

export const AdminSpreadsheetTab: React.FC<AdminSpreadsheetTabProps> = ({
  config,
  detectedSheets,
  syncInfo,
  isBusy,
  copiedCode,
  onChangeConfig,
  onSaveAndSync,
  onForceRefresh,
  onCopyText,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-3.5">
      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900">Template Bank Soal (.xlsx)</div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            6 tab topik (180 soal). Impor ke Google Sheets via <strong>File → Impor</strong>.
          </p>
        </div>
        <a
          href="/Template_Soal_Quiz_Inagata.xlsx"
          download="Template_Soal_Quiz_Inagata.xlsx"
          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs border-b-2 border-amber-700 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Template</span>
        </a>
      </div>

      <form onSubmit={onSaveAndSync} className="space-y-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900">Sumber Soal</span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="rounded accent-amber-500"
              />
              <span>Aktif</span>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Link Google Spreadsheet
            </label>
            <input
              type="text"
              value={config.spreadsheetUrlOrId}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  spreadsheetUrlOrId: e.target.value,
                }))
              }
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700">Tab Terdeteksi</span>
              <span className="text-[11px] font-mono font-bold text-amber-900">
                {detectedSheets.length > 0 ? `${detectedSheets.length} topik` : 'Belum sinkron'}
              </span>
            </div>

            {detectedSheets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                {detectedSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[11px]"
                  >
                    <span className="font-semibold text-slate-800 truncate">
                      {sheet.nama}: {sheet.judul}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-emerald-700 shrink-0">
                      {sheet.questionCount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Setiap tab sheet otomatis dibaca sebagai 1 topik soal.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                URL Web App (Opsional)
              </label>
              <input
                type="text"
                value={config.appsScriptUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  const match = val.match(/\/macros\/s\/([a-zA-Z0-9_-]+)/i);
                  onChangeConfig((prev) => ({
                    ...prev,
                    appsScriptUrl: val,
                    deploymentId: match?.[1]
                      ? match[1]
                      : !val.trim()
                      ? ''
                      : prev.deploymentId,
                  }));
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ID Penerapan (Opsional)
              </label>
              <input
                type="text"
                value={config.deploymentId || ''}
                onChange={(e) => {
                  const idVal = e.target.value;
                  const cleanId = idVal.trim();
                  onChangeConfig((prev) => ({
                    ...prev,
                    deploymentId: idVal,
                    appsScriptUrl: /^[a-zA-Z0-9_-]{20,}$/.test(cleanId)
                      ? `https://script.google.com/macros/s/${cleanId}/exec`
                      : !cleanId
                      ? ''
                      : prev.appsScriptUrl,
                  }));
                }}
                placeholder="AKfycb..."
                className="w-full h-9 px-3 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={isBusy}
            className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isBusy ? 'Menyimpan...' : 'Simpan & Sinkronkan'}
          </button>
          <button
            type="button"
            onClick={onForceRefresh}
            disabled={isBusy}
            className="h-9 px-3.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </form>

      {syncInfo && (
        <div
          className={`p-3 border rounded-xl text-xs space-y-1 ${
            syncInfo.source === 'unconfigured' || syncInfo.warning
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50/70 border-emerald-200 text-slate-700'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Status:{' '}
              <strong className="text-slate-900">
                {syncInfo.source === 'apps_script'
                  ? 'Apps Script'
                  : syncInfo.source === 'spreadsheet'
                  ? 'Google Sheets'
                  : 'Belum terhubung'}
              </strong>
            </span>
            <span className="font-mono text-[11px] font-bold">
              {syncInfo.sheetTopicsCount} topik · {syncInfo.totalLiveQuestions} soal
            </span>
          </div>
          {syncInfo.warning && (
            <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
              {syncInfo.warning}
            </p>
          )}
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
        >
          <span>Panduan Setup &amp; Kode Apps Script</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showGuide && (
          <div className="p-3.5 bg-white text-xs text-slate-600 space-y-2.5 border-t border-slate-200">
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>
                Unduh template <code>.xlsx</code> di atas lalu impor ke Google Sheets (
                <strong>File → Impor</strong>). Tiap tab sheet otomatis jadi 1 topik.
              </li>
              <li>
                Klik <strong>Bagikan</strong> → atur akses umum ke{' '}
                <strong>Siapa saja yang memiliki link (Pelihat)</strong>.
              </li>
              <li>
                Untuk gambar di sel: gunakan <em>Sisipkan → Gambar → Gambar dalam sel</em>,{' '}
                <code>=IMAGE(&quot;url&quot;)</code>, atau link Google Drive publik.
              </li>
              <li>
                Tempel link spreadsheet di atas lalu klik <strong>Simpan &amp; Sinkronkan</strong>.
              </li>
            </ol>

            <div className="p-2 bg-slate-100 rounded-lg font-mono text-[10px] text-slate-800 overflow-x-auto">
              Header baris 1: Kode | Pertanyaan | Gambar | Pilihan A | Pilihan B | Pilihan C |
              Pilihan D | Jawaban Benar
            </div>

            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">
                  Apps Script Bank Soal (Opsional — untuk gambar dalam sel via JSON):
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(APPS_SCRIPT_TEMPLATE, 'GAS_CODE')}
                  className="px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-[11px] font-bold text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedCode === 'GAS_CODE' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode === 'GAS_CODE' ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Buka <strong>Ekstensi → Apps Script</strong>, tempel kode di bawah, lalu{' '}
                <strong>Terapkan → Aplikasi web → Siapa saja</strong>.
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] leading-relaxed overflow-x-auto max-h-44">
                {APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
