import { logParticipantResult } from './quizApi';

export interface SpreadsheetLogPayload {
  name: string;
  institution: string;
  phone: string;
  mode: string;
  topic: string;
  score: number;
  correct: number;
  totalQuestions: number;
  detail: string;
}

export function sendResultToSpreadsheet(payload: SpreadsheetLogPayload): void {
  try {
    const nowWib = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
    logParticipantResult({
      timestamp: nowWib,
      name: payload.name.trim() || '-',
      institution: payload.institution.trim() || '-',
      phone: payload.phone.trim() || '-',
      sessionType: payload.mode,
      score: Number(payload.score) || 0,
      topic: payload.topic || '-',
    }).catch(() => {});
  } catch {
    // Non-blocking participant log
  }
}
