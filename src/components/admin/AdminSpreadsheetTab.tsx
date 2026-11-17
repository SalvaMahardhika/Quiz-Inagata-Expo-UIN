import React, { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Copy, Check, Download, Image } from 'lucide-react';
import { SpreadsheetConfig } from '../../services/quizApi';

const APPS_SCRIPT_TEMPLATE = `// Quiz Inagata — Google Apps Script (Scan Soal Otomatis + Rekap Hasil)
var IGNORED_SHEETS = ['hasil', 'results', 'rekap', 'peserta', 'log', 'leaderboard', 'respon', 'response', 'responses'];

// 1. Ambil seluruh sheet soal otomatis (1 sheet = 1 tipe soal)
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
}

// 2. Simpan rekap hasil peserta ke sheet "Hasil" (otomatis dibuat jika belum ada)
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName('Hasil');
    if (!logSheet) {
      logSheet = ss.insertSheet('Hasil');
      logSheet.appendRow(['Waktu', 'Nama', 'Instansi', 'WhatsApp', 'Mode', 'Topik', 'Skor', 'Benar', 'Total Soal', 'Detail']);
    }
    var p = (e && e.parameter) ? e.parameter : {};
    if ((!p.name && !p.nama) && e && e.postData && e.postData.contents) {
      try { p = JSON.parse(e.postData.contents); } catch (err) {}
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
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
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
      {/* Unduh Template XLSX siap impor ke Google Sheets */}
      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900">
            Spreadsheet 1: Bank Soal (6 Sheet = 6 Tipe Soal · 180 Soal)
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Unduh file Excel (.xlsx) lalu unggah ke Google Sheets (File → Impor). Untuk rekap
            daftar peserta &amp; nilai, atur di tab <strong>Peserta (Sheet)</strong>.
          </p>
        </div>
        <a
          href="/Template_Soal_Quiz_Inagata.xlsx"
          download="Template_Soal_Quiz_Inagata.xlsx"
          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs border-b-2 border-amber-700 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Template (.xlsx)</span>
        </a>
      </div>

      <form onSubmit={onSaveAndSync} className="space-y-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900">
              Sumber Soal Live Spreadsheet (1 Sheet = 1 Topik)
            </span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="rounded accent-amber-500"
              />
              <span>Aktifkan</span>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Link / ID Google Spreadsheet (Akses Publik: Siapa saja dapat melihat)
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
              <span className="text-[11px] font-bold text-slate-700">
                Scan Otomatis Tab Sheet (Tanpa Input Manual)
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                {detectedSheets.length > 0
                  ? `${detectedSheets.length} Sheet = ${detectedSheets.length} Tipe Soal`
                  : 'Menunggu Sinkronisasi'}
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
                      {sheet.questionCount} soal
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Seluruh tab sheet di Google Spreadsheet akan dipindai otomatis menjadi tipe soal
                sesuai jumlah sheet yang ada (misal 6 sheet = 6 tipe soal).
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              URL Web App Google Apps Script (Opsional jika pakai doGet JSON)
            </label>
            <input
              type="text"
              value={config.appsScriptUrl}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  appsScriptUrl: e.target.value,
                }))
              }
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
            />
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
            <span>Muat Ulang Soal</span>
          </button>
        </div>
      </form>

      {syncInfo && (
        <div
          className={`p-2.5 border rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 ${
            syncInfo.source === 'unconfigured'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50/70 border-emerald-200 text-slate-700'
          }`}
        >
          <span>
            Sumber aktif:{' '}
            <strong className="text-slate-900">
              {syncInfo.source === 'apps_script'
                ? 'Google Apps Script (Live)'
                : syncInfo.source === 'spreadsheet'
                ? 'Google Spreadsheet (Live)'
                : 'Belum Terhubung'}
            </strong>
          </span>
          <span className="font-mono text-[11px] font-bold">
            {syncInfo.sheetTopicsCount} Tipe Soal · {syncInfo.totalLiveQuestions} Soal
          </span>
        </div>
      )}

      {/* Panduan Lengkap Setup Spreadsheet & Kode Apps Script */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
        >
          <span>Tutorial Lengkap Setup Spreadsheet & Kode Apps Script</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showGuide && (
          <div className="p-3.5 bg-white text-xs text-slate-600 space-y-3 border-t border-slate-200">
            {/* Langkah 1: Siapkan Google Spreadsheet */}
            <div className="space-y-1.5">
              <div className="font-bold text-slate-900">
                1. Siapkan Google Spreadsheet (Impor Template atau Buat Baru)
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Klik <strong>Unduh Template (.xlsx)</strong> di atas, lalu buka{' '}
                  <code>sheets.google.com</code> dan buat spreadsheet baru.
                </li>
                <li>
                  Klik menu <strong>File → Impor → Upload</strong> dan pilih file{' '}
                  <code>Template_Soal_Quiz_Inagata.xlsx</code> (pilih opsi{' '}
                  <em>Ganti spreadsheet</em>).
                </li>
                <li>
                  Setiap <strong>1 tab sheet otomatis menjadi 1 tipe soal / topik</strong>{' '}
                  (misalnya 6 sheet = 6 tipe soal; tambah atau hapus tab langsung di Google Sheets).
                </li>
                <li>
                  Pastikan <strong>Baris 1</strong> pada setiap sheet berisi kolom header persis:
                </li>
              </ol>
              <div className="p-2 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800 overflow-x-auto">
                Kode | Pertanyaan | Gambar | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Jawaban
                Benar
              </div>
              <p className="text-[11px] text-slate-500">
                Kolom <strong>Jawaban Benar</strong> bisa diisi huruf <code>A</code>/<code>B</code>/
                <code>C</code>/<code>D</code>, indeks <code>0</code>–<code>3</code>, atau teks
                persis jawabannya. Sheet bernama <code>Hasil</code>, <code>Rekap</code>, atau{' '}
                <code>Leaderboard</code> otomatis dilewati saat scan soal.
              </p>
            </div>

            {/* Langkah 2: Scan Gambar Langsung */}
            <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-[11px] text-sky-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                <span>2. Cara Memasukkan Gambar di Kolom Gambar (Scan Otomatis):</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
                <li>
                  <strong>Gambar langsung di dalam sel:</strong> Klik sel kolom <code>Gambar</code>{' '}
                  → pilih <em>Sisipkan (Insert) → Gambar → Gambar dalam sel</em>.
                </li>
                <li>
                  <strong>Rumus / Link URL:</strong> Mendukung rumus{' '}
                  <code>=IMAGE(&quot;https://...&quot;)</code>, link share Google Drive (
                  <code>drive.google.com/file/d/...</code> akses publik), maupun URL gambar langsung.
                </li>
              </ul>
            </div>

            {/* Langkah 3: Hubungkan Link Spreadsheet */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                3. Hubungkan Link Spreadsheet (Cara Cepat Tanpa Coding)
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px] leading-relaxed">
                <li>
                  Di kanan atas Google Sheets klik <strong>Bagikan (Share)</strong> → ubah Akses
                  umum menjadi <strong>Siapa saja yang memiliki link</strong> (peran{' '}
                  <em>Pelihat / Viewer</em>).
                </li>
                <li>
                  Salin link spreadsheet dari address bar browser, tempel pada kolom{' '}
                  <strong>Link / ID Google Spreadsheet</strong> di atas, lalu klik{' '}
                  <strong>Simpan &amp; Sinkronkan</strong>.
                </li>
              </ol>
            </div>

            {/* Langkah 4: Setup Google Apps Script */}
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
              <div className="font-bold text-slate-900">
                4. Setup Google Apps Script (Opsional — Mendukung CellImage &amp; Rekap Sheet Hasil)
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-700 leading-relaxed">
                <li>
                  Di Google Sheets buka menu <strong>Ekstensi (Extensions) → Apps Script</strong>.
                </li>
                <li>
                  Hapus fungsi bawaan <code>myFunction()</code>, lalu salin dan tempel seluruh kode
                  di bawah ini ke editor, kemudian simpan (<code>Ctrl+S</code>).
                </li>
                <li>
                  Klik <strong>Terapkan (Deploy) → Deployment baru (New deployment)</strong> → klik
                  ikon roda gigi → pilih <strong>Aplikasi web (Web app)</strong>.
                </li>
                <li>
                  Set <strong>Jalankan sebagai:</strong> <em>Saya (Me)</em> dan{' '}
                  <strong>Yang memiliki akses:</strong> <em>Siapa saja (Anyone)</em> → klik{' '}
                  <strong>Terapkan</strong> → setujui izin akses akun Google.
                </li>
                <li>
                  Salin <strong>URL Aplikasi Web</strong> (berakhiran <code>/exec</code>), tempel ke
                  kolom <strong>URL Web App Google Apps Script</strong> di atas, lalu klik{' '}
                  <strong>Simpan &amp; Sinkronkan</strong>.
                </li>
              </ol>
            </div>

            {/* Blok Kode Apps Script */}
            <div className="pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-800">
                  Kode Lengkap Google Apps Script (<code>Code.gs</code> — doGet &amp; doPost):
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
                  <span>{copiedCode === 'GAS_CODE' ? 'Tersalin!' : 'Salin Kode Lengkap'}</span>
                </button>
              </div>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] leading-relaxed overflow-x-auto max-h-48">
                {APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
