import { GOOGLE_SCRIPT_URL } from '../../src/types/quiz.ts';
import {
  PARTICIPANT_SHEET_CONFIG_FILE,
  readJsonFile,
  writeJsonFile,
} from '../lib/jsonStore.ts';
import {
  extractAppsScriptDeploymentId,
  extractSpreadsheetId,
  normalizeAppsScriptUrl,
} from '../lib/sheetParsers.ts';
import type { ParticipantLogPayload, ParticipantSheetConfig } from '../types.ts';

const initialParticipantScriptUrl = normalizeAppsScriptUrl(
  process.env.GOOGLE_PARTICIPANT_SCRIPT_URL || GOOGLE_SCRIPT_URL || ''
);
let participantSheetConfig: ParticipantSheetConfig = readJsonFile<ParticipantSheetConfig>(
  PARTICIPANT_SHEET_CONFIG_FILE,
  {
    spreadsheetUrl: '',
    appsScriptUrl: initialParticipantScriptUrl,
    deploymentId: extractAppsScriptDeploymentId(initialParticipantScriptUrl),
    sheetName: 'Sheet1',
    enabled: true,
  }
);
participantSheetConfig = {
  ...participantSheetConfig,
  deploymentId:
    participantSheetConfig.deploymentId ||
    extractAppsScriptDeploymentId(participantSheetConfig.appsScriptUrl || ''),
  appsScriptUrl: normalizeAppsScriptUrl(
    participantSheetConfig.appsScriptUrl || participantSheetConfig.deploymentId || ''
  ),
};

export function getParticipantSheetConfig(): ParticipantSheetConfig {
  return participantSheetConfig;
}

export function updateParticipantSheetConfigState(
  input: Partial<ParticipantSheetConfig>
): ParticipantSheetConfig {
  const rawUrl = String(input.appsScriptUrl ?? participantSheetConfig.appsScriptUrl ?? '').trim();
  const rawDepId = String(input.deploymentId ?? '').trim();

  const resolvedUrl = normalizeAppsScriptUrl(rawUrl || rawDepId);
  const resolvedDepId =
    extractAppsScriptDeploymentId(rawDepId) ||
    extractAppsScriptDeploymentId(resolvedUrl);

  participantSheetConfig = {
    spreadsheetUrl: String(
      input.spreadsheetUrl ?? participantSheetConfig.spreadsheetUrl
    ).trim(),
    appsScriptUrl: resolvedUrl,
    deploymentId: resolvedDepId,
    sheetName: String(input.sheetName ?? participantSheetConfig.sheetName).trim() || 'Sheet1',
    enabled:
      typeof input.enabled === 'boolean' ? input.enabled : participantSheetConfig.enabled,
  };
  writeJsonFile(PARTICIPANT_SHEET_CONFIG_FILE, participantSheetConfig);
  return participantSheetConfig;
}

export interface ParticipantLogResult {
  ok: boolean;
  skipped?: boolean;
  sheetName?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  rowNumber?: number;
  isLegacyResponse?: boolean;
  testedAt?: string;
  error?: string;
}

export async function sendParticipantLogToSheet(
  payload: ParticipantLogPayload
): Promise<ParticipantLogResult> {
  if (!participantSheetConfig.enabled) {
    return { ok: true, skipped: true };
  }

  const targetUrl = normalizeAppsScriptUrl(
    participantSheetConfig.appsScriptUrl || participantSheetConfig.deploymentId || ''
  );
  if (!targetUrl) {
    return {
      ok: false,
      skipped: true,
      error: 'URL Apps Script / ID Penerapan Daftar Peserta belum diisi.',
    };
  }

  if (targetUrl.includes('docs.google.com/spreadsheets/')) {
    return {
      ok: false,
      error:
        'Kolom Apps Script berisi link Google Spreadsheet, bukan URL Aplikasi Web (/macros/s/.../exec).',
    };
  }
  if (targetUrl.includes('/macros/library/')) {
    return {
      ok: false,
      error: 'Jangan gunakan URL Library. Salin bagian "Aplikasi web → URL" yang berakhiran /exec.',
    };
  }
  if (/\/dev(\?|$)/i.test(targetUrl)) {
    return {
      ok: false,
      error: 'Gunakan URL Aplikasi Web berakhiran /exec, bukan URL uji coba /dev.',
    };
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/i.test(targetUrl)) {
    return {
      ok: false,
      error:
        'Format URL Apps Script tidak valid. Harus berupa https://script.google.com/macros/s/.../exec atau ID Penerapan (AKfycb...).',
    };
  }

  try {
    const nowWib =
      payload.timestamp ||
      new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const cleanName = String(payload.name || '').trim() || '-';
    const cleanInstitution = String(payload.institution || '').trim() || '-';
    const cleanPhone = String(payload.phone || '').trim() || '-';
    const cleanSessionType = String(payload.sessionType || '').trim() || 'Solo';
    const cleanScore = Number(payload.score) || 0;
    const cleanTopic = String(payload.topic || '').trim() || '-';
    const targetSheet = participantSheetConfig.sheetName || 'Sheet1';
    const targetSpreadsheetId = extractSpreadsheetId(participantSheetConfig.spreadsheetUrl || '');

    const formBody = new URLSearchParams({
      action: 'PARTICIPANT_LOG',
      spreadsheetId: targetSpreadsheetId,
      sheetName: targetSheet,
      timestamp: nowWib,
      waktu: nowWib,
      name: cleanName,
      nama: cleanName,
      institution: cleanInstitution,
      instansi: cleanInstitution,
      phone: cleanPhone,
      nomor_hp: cleanPhone,
      whatsapp: cleanPhone,
      sessionType: cleanSessionType,
      tipe_sesi: cleanSessionType,
      mode: cleanSessionType,
      score: String(cleanScore),
      nilai: String(cleanScore),
      skor: String(cleanScore),
      topic: cleanTopic,
      topik: cleanTopic,
    }).toString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: formBody,
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: false,
        error: `Google Apps Script merespons HTTP ${res.status}. Pastikan deployment diakses oleh "Siapa saja (Anyone)".`,
      };
    }

    const text = await res.text();
    const trimmedText = text.trim();

    if (res.url.includes('accounts.google.com') || trimmedText.startsWith('<')) {
      if (trimmedText.includes('Script function not found')) {
        return {
          ok: false,
          error:
            'Fungsi doPost(e) tidak ditemukan di Apps Script. Salin kode dari tutorial lalu Deploy sebagai Versi Baru.',
        };
      }
      return {
        ok: false,
        error:
          'Apps Script mengembalikan halaman HTML/login Google. Pastikan "Yang memiliki akses" diset ke "Siapa saja (Anyone)" pada deployment terbaru.',
      };
    }

    if (trimmedText.startsWith('{')) {
      const json = JSON.parse(trimmedText);
      if (json && json.ok === false) {
        return { ok: false, error: json.error || 'Apps Script mengembalikan error.' };
      }
      const hasRichMeta =
        typeof json?.rowNumber === 'number' && typeof json?.spreadsheetName === 'string';
      return {
        ok: true,
        sheetName: json?.sheet || targetSheet,
        spreadsheetName: json?.spreadsheetName || undefined,
        spreadsheetUrl: json?.spreadsheetUrl || undefined,
        rowNumber: typeof json?.rowNumber === 'number' ? json.rowNumber : undefined,
        isLegacyResponse: !hasRichMeta,
        testedAt: nowWib,
      };
    }

    return {
      ok: true,
      sheetName: targetSheet,
      isLegacyResponse: true,
      testedAt: nowWib,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        error: 'Koneksi ke Google Apps Script melebihi 20 detik (timeout). Silakan coba klik Uji lagi.',
      };
    }
    return {
      ok: false,
      error: err?.message || 'Gagal menghubungi URL Web App Google Apps Script.',
    };
  }
}

export async function testParticipantSheetConnection(): Promise<ParticipantLogResult> {
  const result = await sendParticipantLogToSheet({
    name: 'Uji Koneksi Admin',
    institution: 'Quiz Inagata',
    phone: '080000000000',
    sessionType: 'Solo (Uji Coba)',
    score: 100,
    topic: 'Topik Uji Coba Setup',
  });

  if (result.skipped) {
    return {
      ok: false,
      error: result.error || 'Aktifkan dan isi URL Web App / ID Penerapan terlebih dahulu.',
    };
  }
  return result;
}
