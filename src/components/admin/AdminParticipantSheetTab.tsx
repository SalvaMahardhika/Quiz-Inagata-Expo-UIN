import React, { useState } from 'react';
import { Send, Check, Copy, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { ParticipantSheetConfig } from '../../services/quizApi';

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

interface AdminParticipantSheetTabProps {
  config: ParticipantSheetConfig;
  isBusy: boolean;
  testStatus?: {
    ok: boolean;
    warning?: boolean;
    message: string;
    spreadsheetUrl?: string;
  } | null;
  copiedCode: string | null;
  onChangeConfig: (updater: (prev: ParticipantSheetConfig) => ParticipantSheetConfig) => void;
  onSaveConfig: (e: React.FormEvent) => void;
  onTestSend: () => void;
  onCopyText: (text: string, id: string) => void;
}

export const AdminParticipantSheetTab: React.FC<AdminParticipantSheetTabProps> = ({
  config,
  isBusy,
  testStatus,
  copiedCode,
  onChangeConfig,
  onSaveConfig,
  onTestSend,
  onCopyText,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-3.5">
      <form onSubmit={onSaveConfig} className="space-y-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900">Rekap Peserta Otomatis</span>
              <p className="text-[11px] text-slate-500">
                Kolom: Timestamp, Nama, Instansi, No. HP, Sesi, Nilai, Topik.
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="rounded accent-emerald-600"
              />
              <span>Aktif</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                URL Web App (<code>/exec</code>)
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
                className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ID Penerapan
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
                value={config.sheetName}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
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
                Link Google Spreadsheet
              </label>
              <input
                type="text"
                value={config.spreadsheetUrl}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    spreadsheetUrl: e.target.value,
                  }))
                }
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {config.spreadsheetUrl && config.spreadsheetUrl.startsWith('https://') && (
            <div className="pt-0.5">
              <a
                href={config.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka Spreadsheet</span>
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={isBusy}
            className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isBusy ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button
            type="button"
            onClick={onTestSend}
            disabled={isBusy}
            className="h-9 px-3.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isBusy ? 'animate-pulse' : ''}`} />
            <span>{isBusy ? 'Menguji...' : 'Uji Kirim'}</span>
          </button>
        </div>

        {testStatus && (
          <div
            className={`p-2.5 border rounded-xl text-xs font-medium leading-relaxed space-y-1 ${
              !testStatus.ok
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : testStatus.warning
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <p>{testStatus.message}</p>
            {testStatus.spreadsheetUrl && (
              <a
                href={testStatus.spreadsheetUrl}
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
      </form>

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
                Buka spreadsheet peserta → klik <strong>Ekstensi → Apps Script</strong>, lalu tempel
                kode di bawah dan simpan (<code>Ctrl+S</code>).
              </li>
              <li>
                Klik <strong>Terapkan → Deployment baru → Aplikasi web</strong>, atur{' '}
                <strong>Yang memiliki akses: Siapa saja</strong>, lalu salin URL{' '}
                <code>/exec</code> ke form di atas.
              </li>
              <li>
                Jika memperbarui kode, wajib klik{' '}
                <strong>Terapkan → Kelola penerapan → Edit → Versi baru</strong>.
              </li>
              <li>
                Data langsung masuk ke tab <code>{config.sheetName || 'Sheet1'}</code> (header
                otomatis dibuat jika sheet masih kosong).
              </li>
            </ol>

            <div className="pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-800">
                  Kode Apps Script (<code>Code.gs</code>):
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(PARTICIPANT_APPS_SCRIPT, 'PARTICIPANT_GAS_CODE')}
                  className="px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-[11px] font-bold text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedCode === 'PARTICIPANT_GAS_CODE' ? (
                    <Check className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode === 'PARTICIPANT_GAS_CODE' ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] leading-relaxed overflow-x-auto max-h-44">
                {PARTICIPANT_APPS_SCRIPT}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
