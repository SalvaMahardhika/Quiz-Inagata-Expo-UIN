import { GOOGLE_SCRIPT_URL } from '../../src/types/quiz.ts';
import {
  PARTICIPANT_SHEET_CONFIG_FILE,
  readJsonFile,
  writeJsonFile,
} from '../lib/jsonStore.ts';
import type { ParticipantLogPayload, ParticipantSheetConfig } from '../types.ts';

let participantSheetConfig: ParticipantSheetConfig = readJsonFile<ParticipantSheetConfig>(
  PARTICIPANT_SHEET_CONFIG_FILE,
  {
    spreadsheetUrl: '',
    appsScriptUrl: process.env.GOOGLE_PARTICIPANT_SCRIPT_URL || GOOGLE_SCRIPT_URL || '',
    sheetName: 'Daftar Peserta',
    enabled: true,
  }
);

export function getParticipantSheetConfig(): ParticipantSheetConfig {
  return participantSheetConfig;
}

export function updateParticipantSheetConfigState(
  input: Partial<ParticipantSheetConfig>
): ParticipantSheetConfig {
  participantSheetConfig = {
    spreadsheetUrl: String(
      input.spreadsheetUrl ?? participantSheetConfig.spreadsheetUrl
    ).trim(),
    appsScriptUrl: String(
      input.appsScriptUrl ?? participantSheetConfig.appsScriptUrl
    ).trim(),
    sheetName: String(input.sheetName ?? participantSheetConfig.sheetName).trim() || 'Daftar Peserta',
    enabled:
      typeof input.enabled === 'boolean' ? input.enabled : participantSheetConfig.enabled,
  };
  writeJsonFile(PARTICIPANT_SHEET_CONFIG_FILE, participantSheetConfig);
  return participantSheetConfig;
}

export async function sendParticipantLogToSheet(
  payload: ParticipantLogPayload
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!participantSheetConfig.enabled) {
    return { ok: true, skipped: true };
  }

  const targetUrl = (participantSheetConfig.appsScriptUrl || '').trim();
  if (!targetUrl) {
    return { ok: false, skipped: true, error: 'URL Apps Script Daftar Peserta belum diisi.' };
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

    const formBody = new URLSearchParams({
      action: 'PARTICIPANT_LOG',
      sheetName: participantSheetConfig.sheetName || 'Daftar Peserta',
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
    const timer = setTimeout(() => controller.abort(), 9000);
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
    if (text.trim().startsWith('{')) {
      try {
        const json = JSON.parse(text);
        if (json && json.ok === false) {
          return { ok: false, error: json.error || 'Apps Script mengembalikan error.' };
        }
      } catch {
        // Ignore non-JSON body
      }
    }

    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Gagal menghubungi URL Web App Google Apps Script.',
    };
  }
}

export async function testParticipantSheetConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
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
      error: result.error || 'Aktifkan dan isi URL Web App Apps Script terlebih dahulu.',
    };
  }
  return result;
}
