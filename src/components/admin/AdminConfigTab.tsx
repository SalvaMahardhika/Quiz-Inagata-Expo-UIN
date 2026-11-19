import React, { useState } from 'react';
import {
  Download,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { ParticipantSheetConfig, SpreadsheetConfig } from '../../services/quizApi';

const QUESTION_APPS_SCRIPT = `// Quiz Inagata — Google Apps Script (Scan Soal Otomatis + Rekap Hasil)
var IGNORED_SHEETS = ['contoh', 'contoh (hapus)', 'panduan', 'petunjuk', 'hasil', 'results', 'rekap', 'peserta', 'log', 'leaderboard', 'respon', 'response', 'responses'];

function doGet(e) {
  try {
    var ssId = (e && e.parameter && e.parameter.spreadsheetId) ? String(e.parameter.spreadsheetId).trim() : '';
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Spreadsheet tidak ditemukan.' }))
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
        topics.push({ sheetName: name, questions: questions });
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
}`;

const PARTICIPANT_APPS_SCRIPT = `// Quiz Inagata — Google Apps Script Spreadsheet Peserta
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
        .createTextOutput(JSON.stringify({
          ok: false,
          error: 'Spreadsheet tidak ditemukan. Buat Apps Script lewat Ekstensi -> Apps Script atau isi Link Spreadsheet di Admin.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var targetSheetName = (p.sheetName && String(p.sheetName).trim()) || 'Sheet1';
    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) {
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getName().toLowerCase().trim() === targetSheetName.toLowerCase()) {
          sheet = sheets[i];
          break;
        }
      }
      if (!sheet && targetSheetName.toLowerCase() === 'sheet1' && sheets.length > 0) {
        sheet = sheets[0];
      }
    }
    if (!sheet) {
      sheet = ss.insertSheet(targetSheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Nama',
        'Instansi',
        'Nomor HP',
        'Tipe Sesi (Solo/Kelompok)',
        'Nilai',
        'Topik yang Dipilih'
      ]);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }

    sheet.appendRow([
      p.timestamp || p.waktu || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
      p.name || p.nama || '-',
      p.institution || p.instansi || '-',
      "'" + String(p.phone || p.nomor_hp || p.whatsapp || '-'),
      p.sessionType || p.tipe_sesi || p.mode || 'Solo',
      Number(p.score || p.nilai || p.skor || 0),
      p.topic || p.topik || '-'
    ]);
    SpreadsheetApp.flush();

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        service: 'Quiz Inagata - Daftar Peserta',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        sheet: sheet.getName(),
        rowNumber: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Quiz Inagata - Daftar Peserta' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

interface AdminConfigTabProps {
  sheetConfig: SpreadsheetConfig;
  participantConfig: ParticipantSheetConfig;
  isSaving: boolean;
  isParticipantTesting: boolean;
  participantTestStatus?: {
    ok: boolean;
    warning?: boolean;
    message: string;
    spreadsheetUrl?: string;
  } | null;
  copiedCode: string | null;
  onChangeSheetConfig: (updater: (prev: SpreadsheetConfig) => SpreadsheetConfig) => void;
  onChangeParticipantConfig: (
    updater: (prev: ParticipantSheetConfig) => ParticipantSheetConfig
  ) => void;
  onSaveAllConfigs: (e: React.FormEvent) => void;
  onTestParticipantSend: () => void;
  onBackToBankSoal: () => void;
  onCopyText: (text: string, id: string) => void;
}

export const AdminConfigTab: React.FC<AdminConfigTabProps> = ({
  sheetConfig,
  participantConfig,
  isSaving,
  isParticipantTesting,
  participantTestStatus,
  copiedCode,
  onChangeSheetConfig,
  onChangeParticipantConfig,
  onSaveAllConfigs,
  onTestParticipantSend,
  onBackToBankSoal,
  onCopyText,
}) => {
  const [showQuestionGuide, setShowQuestionGuide] = useState(false);
  const [showParticipantGuide, setShowParticipantGuide] = useState(false);

  return (
    <form onSubmit={onSaveAllConfigs} className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900">Konfigurasi Link Spreadsheet</h4>
          <p className="text-[11px] text-slate-500">
            Atur link spreadsheet soal dan daftar peserta di sini.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToBankSoal}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bank Soal</span>
        </button>
      </div>

      {/* Container 1: Spreadsheet Soal */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900">1. Spreadsheet Bank Soal</span>
          <div className="flex items-center gap-3">
            <a
              href="/Template_Soal_Quiz_Inagata.xlsx"
              download="Template_Soal_Quiz_Inagata.xlsx"
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-[11px] border-b-2 border-amber-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Template .xlsx</span>
            </a>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sheetConfig.enabled}
                onChange={(e) =>
                  onChangeSheetConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="rounded accent-amber-500"
              />
              <span>Aktif</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Link Google Spreadsheet Soal
          </label>
          <input
            type="text"
            value={sheetConfig.spreadsheetUrlOrId}
            onChange={(e) =>
              onChangeSheetConfig((prev) => ({
                ...prev,
                spreadsheetUrlOrId: e.target.value,
              }))
            }
            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
            className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              URL Web App Soal (Opsional)
            </label>
            <input
              type="text"
              value={sheetConfig.appsScriptUrl}
              onChange={(e) => {
                const val = e.target.value;
                const match = val.match(/\/macros\/s\/([a-zA-Z0-9_-]+)/i);
                onChangeSheetConfig((prev) => ({
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
              ID Penerapan Soal (Opsional)
            </label>
            <input
              type="text"
              value={sheetConfig.deploymentId || ''}
              onChange={(e) => {
                const idVal = e.target.value;
                const cleanId = idVal.trim();
                onChangeSheetConfig((prev) => ({
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

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setShowQuestionGuide((v) => !v)}
            className="w-full px-3 py-2 bg-white hover:bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-700 cursor-pointer"
          >
            <span>Panduan &amp; Apps Script Soal</span>
            {showQuestionGuide ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showQuestionGuide && (
            <div className="p-3 border-t border-slate-200 space-y-2 text-[11px] text-slate-600">
              <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                <li>
                  Unduh template <code>.xlsx</code> lalu impor ke Google Sheets (
                  <strong>File → Impor</strong>). Hapus sheet <code>Contoh</code>, buat tab baru
                  per topik (min. 10 soal per topik).
                </li>
                <li>
                  Gambar soal (opsional): pilih sel kolom <code>Gambar</code> →{' '}
                  <strong>Sisipkan → Gambar → Gambar di atas sel</strong>.
                </li>
                <li>
                  Set akses <strong>Bagikan → Siapa saja yang memiliki link (Pelihat)</strong>.
                </li>
              </ol>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-800">Apps Script Soal (Opsional):</span>
                <button
                  type="button"
                  onClick={() => onCopyText(QUESTION_APPS_SCRIPT, 'GAS_CODE')}
                  className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-[10px] font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'GAS_CODE' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode === 'GAS_CODE' ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] leading-relaxed overflow-x-auto max-h-36">
                {QUESTION_APPS_SCRIPT}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Container 2: Spreadsheet Daftar Peserta */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-900">
              2. Spreadsheet Daftar Peserta
            </span>
            <p className="text-[11px] text-slate-500">
              Kolom: Timestamp, Nama, Instansi, No. HP, Sesi, Nilai, Topik.
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={participantConfig.enabled}
              onChange={(e) =>
                onChangeParticipantConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="rounded accent-emerald-600"
            />
            <span>Aktif</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              URL Web App Peserta (<code>/exec</code>)
            </label>
            <input
              type="text"
              value={participantConfig.appsScriptUrl}
              onChange={(e) => {
                const val = e.target.value;
                const match = val.match(/\/macros\/s\/([a-zA-Z0-9_-]+)/i);
                onChangeParticipantConfig((prev) => ({
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
              className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ID Penerapan Peserta
            </label>
            <input
              type="text"
              value={participantConfig.deploymentId || ''}
              onChange={(e) => {
                const idVal = e.target.value;
                const cleanId = idVal.trim();
                onChangeParticipantConfig((prev) => ({
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
              className="w-full h-9 px-3 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Nama Tab Sheet
            </label>
            <input
              type="text"
              value={participantConfig.sheetName}
              onChange={(e) =>
                onChangeParticipantConfig((prev) => ({
                  ...prev,
                  sheetName: e.target.value,
                }))
              }
              placeholder="Sheet1"
              className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Link Google Spreadsheet Peserta
            </label>
            <input
              type="text"
              value={participantConfig.spreadsheetUrl}
              onChange={(e) =>
                onChangeParticipantConfig((prev) => ({
                  ...prev,
                  spreadsheetUrl: e.target.value,
                }))
              }
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div>
            {participantConfig.spreadsheetUrl &&
              participantConfig.spreadsheetUrl.startsWith('https://') && (
                <a
                  href={participantConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Spreadsheet</span>
                </a>
              )}
          </div>

          <button
            type="button"
            onClick={onTestParticipantSend}
            disabled={isSaving || isParticipantTesting}
            className="h-8 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className={`w-3 h-3 ${isParticipantTesting ? 'animate-pulse' : ''}`} />
            <span>{isParticipantTesting ? 'Menguji...' : 'Uji Kirim Peserta'}</span>
          </button>
        </div>

        {participantTestStatus && (
          <div
            className={`p-2.5 border rounded-lg text-[11px] font-medium leading-relaxed space-y-1 ${
              !participantTestStatus.ok
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : participantTestStatus.warning
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <p>{participantTestStatus.message}</p>
            {participantTestStatus.spreadsheetUrl && (
              <a
                href={participantTestStatus.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 underline"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka Spreadsheet</span>
              </a>
            )}
          </div>
        )}

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setShowParticipantGuide((v) => !v)}
            className="w-full px-3 py-2 bg-white hover:bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-700 cursor-pointer"
          >
            <span>Panduan &amp; Apps Script Peserta</span>
            {showParticipantGuide ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showParticipantGuide && (
            <div className="p-3 border-t border-slate-200 space-y-2 text-[11px] text-slate-600">
              <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                <li>
                  Buka spreadsheet peserta → <strong>Ekstensi → Apps Script</strong>, tempel kode di
                  bawah lalu simpan (<code>Ctrl+S</code>).
                </li>
                <li>
                  Klik <strong>Terapkan → Deployment baru → Aplikasi web</strong>, atur{' '}
                  <strong>Siapa saja</strong>, lalu salin URL <code>/exec</code> ke form di atas.
                </li>
                <li>
                  Data otomatis masuk ke tab <code>{participantConfig.sheetName || 'Sheet1'}</code>.
                </li>
              </ol>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-800">Apps Script Peserta (Code.gs):</span>
                <button
                  type="button"
                  onClick={() => onCopyText(PARTICIPANT_APPS_SCRIPT, 'PARTICIPANT_GAS_CODE')}
                  className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-[10px] font-bold text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'PARTICIPANT_GAS_CODE' ? (
                    <Check className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode === 'PARTICIPANT_GAS_CODE' ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] leading-relaxed overflow-x-auto max-h-36">
                {PARTICIPANT_APPS_SCRIPT}
              </pre>
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving || isParticipantTesting}
        className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
      >
        {isSaving ? 'Menyimpan & Menyinkronkan...' : 'Simpan Semua Konfigurasi'}
      </button>
    </form>
  );
};
