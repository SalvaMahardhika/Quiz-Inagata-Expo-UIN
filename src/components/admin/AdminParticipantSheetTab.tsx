import React, { useState } from 'react';
import { Send, Check, Copy, ChevronDown, ChevronUp, Users, ExternalLink } from 'lucide-react';
import { ParticipantSheetConfig } from '../../services/quizApi';

const PARTICIPANT_APPS_SCRIPT = `// Quiz Inagata — Google Apps Script Khusus Spreadsheet Daftar Peserta
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var p = (e && e.parameter) ? e.parameter : {};
    if ((!p.name && !p.nama) && e && e.postData && e.postData.contents) {
      try { p = JSON.parse(e.postData.contents); } catch (err) {}
    }

    var targetSheetName = (p.sheetName && String(p.sheetName).trim()) || 'Daftar Peserta';
    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) {
      sheet = ss.insertSheet(targetSheetName);
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

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sheet: targetSheetName }))
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

const RECORDED_COLUMNS = [
  'Timestamp',
  'Nama',
  'Instansi',
  'Nomor HP',
  'Tipe Sesi (Solo / Kelompok)',
  'Nilai',
  'Topik yang Dipilih',
];

interface AdminParticipantSheetTabProps {
  config: ParticipantSheetConfig;
  isBusy: boolean;
  copiedCode: string | null;
  onChangeConfig: (updater: (prev: ParticipantSheetConfig) => ParticipantSheetConfig) => void;
  onSaveConfig: (e: React.FormEvent) => void;
  onTestSend: () => void;
  onCopyText: (text: string, id: string) => void;
}

export const AdminParticipantSheetTab: React.FC<AdminParticipantSheetTabProps> = ({
  config,
  isBusy,
  copiedCode,
  onChangeConfig,
  onSaveConfig,
  onTestSend,
  onCopyText,
}) => {
  const [showGuide, setShowGuide] = useState(true);

  return (
    <div className="space-y-3.5">
      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Users className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Spreadsheet 2: Daftar Peserta &amp; Rekap Nilai (Terpisah dari Soal)</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Ya, Quiz Inagata mendukung <strong>2 spreadsheet terpisah</strong>: satu untuk Bank Soal
          (tab <em>Live Soal</em>) dan satu lagi khusus untuk mencatat riwayat peserta secara
          otomatis setiap sesi Solo atau Kelompok selesai.
        </p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {RECORDED_COLUMNS.map((col) => (
            <span
              key={col}
              className="px-2 py-0.5 bg-white border border-emerald-200 rounded-md text-[10px] font-semibold text-emerald-900"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={onSaveConfig} className="space-y-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900">
              Konfigurasi Spreadsheet Daftar Peserta
            </span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="rounded accent-emerald-600"
              />
              <span>Aktifkan</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                URL Aplikasi Web Apps Script (<code>/exec</code>)
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
                ID Penerapan (Deployment ID)
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
          <p className="text-[10px] text-slate-500 -mt-1">
            Isi salah satu saja (<strong>URL Aplikasi Web</strong> atau{' '}
            <strong>ID Penerapan</strong>) — keduanya otomatis tersinkronisasi. URL{' '}
            <em>Library</em> tidak perlu dipakai.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Tab Sheet Tujuan
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
                placeholder="Daftar Peserta"
                className="w-full h-9 px-3 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Link Google Spreadsheet Peserta (Opsional, untuk referensi)
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
                <span>Buka Google Spreadsheet Daftar Peserta</span>
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
            {isBusy ? 'Menyimpan...' : 'Simpan Pengaturan Peserta'}
          </button>
          <button
            type="button"
            onClick={onTestSend}
            disabled={isBusy}
            className="h-9 px-3.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Uji Kirim Baris Contoh</span>
          </button>
        </div>
      </form>

      {/* Panduan Step by Step Setup Spreadsheet Daftar Peserta */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
        >
          <span>Tutorial Step-by-Step Setup Spreadsheet Daftar Peserta &amp; Kode Apps Script</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGuide && (
          <div className="p-3.5 bg-white text-xs text-slate-600 space-y-3 border-t border-slate-200">
            <div className="space-y-1.5">
              <div className="font-bold text-slate-900">
                Langkah 1: Buat Google Spreadsheet Daftar Peserta
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Buka <code>sheets.google.com</code> lalu buat spreadsheet baru (misal beri nama{' '}
                  <strong>Daftar Peserta Quiz Inagata</strong>).
                </li>
                <li>
                  Beri nama tab sheet di bagian bawah menjadi{' '}
                  <code>{config.sheetName || 'Daftar Peserta'}</code> (atau biarkan kosong karena
                  Apps Script otomatis membuat tab dan header-nya saat data pertama masuk).
                </li>
                <li>
                  Urutan 7 kolom informasi peserta yang akan tercatat otomatis di Baris 1:
                </li>
              </ol>
              <div className="p-2 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800 overflow-x-auto">
                Timestamp | Nama | Instansi | Nomor HP | Tipe Sesi (Solo/Kelompok) | Nilai | Topik
                yang Dipilih
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                Langkah 2: Pasang Kode Google Apps Script
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Di Google Spreadsheet tersebut, klik menu{' '}
                  <strong>Ekstensi (Extensions) → Apps Script</strong>.
                </li>
                <li>
                  Hapus seluruh kode bawaan <code>myFunction()</code>, lalu salin-tempel kode{' '}
                  <code>Code.gs</code> di bawah ini dan tekan Simpan (<code>Ctrl+S</code>).
                </li>
              </ol>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                Langkah 3: Deploy Web App &amp; Beri Izin Akses
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Klik tombol biru <strong>Terapkan (Deploy) → Deployment baru (New deployment)</strong>.
                </li>
                <li>
                  Pada ikon roda gigi pilih jenis <strong>Aplikasi web (Web app)</strong>.
                </li>
                <li>
                  Atur <strong>Jalankan sebagai (Execute as):</strong> <em>Saya (Me)</em> dan{' '}
                  <strong>Yang memiliki akses (Who has access):</strong> <em>Siapa saja (Anyone)</em>.
                </li>
                <li>
                  Klik <strong>Terapkan</strong> → tekan <em>Authorize access</em> → pilih akun
                  Google Anda → klik <em>Advanced → Go to ... (unsafe) → Allow</em>.
                </li>
              </ol>
            </div>

            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
              <div className="font-bold text-slate-900">
                Langkah 4: Hubungkan ke Panel Admin &amp; Uji Koneksi
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-700 leading-relaxed">
                <li>
                  Salin <strong>URL Aplikasi Web</strong> (berakhiran <code>/exec</code>) dari hasil
                  deploy.
                </li>
                <li>
                  Tempelkan ke kolom <strong>URL Web App Google Apps Script Daftar Peserta</strong> di
                  atas, lalu klik <strong>Simpan Pengaturan Peserta</strong>.
                </li>
                <li>
                  Klik <strong>Uji Kirim Baris Contoh</strong> dan cek Google Sheet Anda — satu baris
                  contoh akan langsung muncul secara otomatis.
                </li>
              </ol>
            </div>

            <div className="pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-800">
                  Kode Google Apps Script Daftar Peserta (<code>Code.gs</code>):
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
                  <span>
                    {copiedCode === 'PARTICIPANT_GAS_CODE' ? 'Tersalin!' : 'Salin Kode Lengkap'}
                  </span>
                </button>
              </div>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] leading-relaxed overflow-x-auto max-h-48">
                {PARTICIPANT_APPS_SCRIPT}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
