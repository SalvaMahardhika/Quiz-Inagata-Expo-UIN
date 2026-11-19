import { RawQuestion, TopicPackage } from '../types/quiz';
import { requestJson } from '../lib/httpClient';
import { TeacherQuizRecord } from '../utils/storage';

export type TokenMode = 'ALL' | 'SOLO' | 'MULTIPLAYER';

export interface SessionToken {
  code: string;
  mode: TokenMode;
  label: string;
  status: 'UNUSED' | 'USED';
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  usedInstitution?: string;
  usedMode?: 'SOLO' | 'MULTIPLAYER';
  roomCode?: string;
}

export interface SpreadsheetConfig {
  spreadsheetUrlOrId: string;
  appsScriptUrl: string;
  deploymentId: string;
  sheetNames: string[];
  disabledSheets?: string[];
  enabled: boolean;
}

export interface AdminTopicItem {
  id: number;
  sheetKey: string;
  sheetName: string;
  nama: string;
  judul: string;
  questionCount: number;
  meetsMinQuestions: boolean;
  disabled: boolean;
  activeForPlayers: boolean;
  soal: RawQuestion[];
}

export interface LiveTopicsResponse {
  topics: Record<number, TopicPackage>;
  adminTopics?: AdminTopicItem[];
  source: 'spreadsheet' | 'apps_script' | 'unconfigured';
  lastSyncedAt: string;
  sheetTopicsCount: number;
  totalLiveQuestions: number;
  warning?: string;
}

export interface PublicLeaderboardItem {
  id: string;
  timestamp: string;
  formattedDate: string;
  name: string;
  institution: string;
  topicId: number;
  topicName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timedOutCount: number;
}

export function fetchLiveTopics(forceRefresh = false): Promise<LiveTopicsResponse> {
  return requestJson<LiveTopicsResponse>(`/api/questions${forceRefresh ? '?refresh=1' : ''}`);
}

export function refreshLiveTopicsAdmin(pin: string): Promise<LiveTopicsResponse> {
  return requestJson<LiveTopicsResponse>('/api/questions/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    },
    body: JSON.stringify({ pin }),
  });
}

export function fetchGlobalLeaderboard(
  limit = 20
): Promise<{ top: PublicLeaderboardItem[]; totalCount: number }> {
  return requestJson(`/api/leaderboard?limit=${limit}`);
}

export function submitGlobalLeaderboardRecord(
  data: Omit<TeacherQuizRecord, 'id' | 'timestamp' | 'formattedDate'>
): Promise<{ ok: boolean; record?: TeacherQuizRecord }> {
  return requestJson('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function checkSessionToken(
  token: string,
  mode: 'SOLO' | 'MULTIPLAYER'
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requestJson('/api/tokens/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mode }),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Token sesi tidak valid.' };
  }
}

export async function reserveSoloToken(payload: {
  token: string;
  holderKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requestJson('/api/tokens/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, mode: 'SOLO' }),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Token gagal digunakan.' };
  }
}

export async function releaseSoloToken(payload: {
  token: string;
  holderKey: string;
}): Promise<void> {
  try {
    await requestJson('/api/tokens/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore release errors
  }
}

export async function consumeSoloToken(payload: {
  token: string;
  name: string;
  institution: string;
  holderKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requestJson('/api/tokens/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, mode: 'SOLO' }),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Token gagal digunakan.' };
  }
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  try {
    await requestJson('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return true;
  } catch {
    return false;
  }
}

export function fetchAdminRecords(
  pin: string
): Promise<{ records: TeacherQuizRecord[]; totalCount: number }> {
  return requestJson('/api/admin/records', {
    headers: { 'x-admin-pin': pin },
  });
}

export async function clearAdminRecords(pin: string): Promise<void> {
  await requestJson('/api/admin/records', {
    method: 'DELETE',
    headers: { 'x-admin-pin': pin },
  });
}

export async function fetchAdminTokens(pin: string): Promise<SessionToken[]> {
  const data = await requestJson<{ tokens: SessionToken[] }>('/api/admin/tokens', {
    headers: { 'x-admin-pin': pin },
  });
  return data.tokens || [];
}

export function generateAdminTokens(
  pin: string,
  payload: { count: number; mode: TokenMode; label: string }
): Promise<{ created: SessionToken[]; tokens: SessionToken[] }> {
  return requestJson('/api/admin/tokens/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminToken(pin: string, code: string): Promise<SessionToken[]> {
  const data = await requestJson<{ tokens: SessionToken[] }>(
    `/api/admin/tokens/${encodeURIComponent(code)}`,
    {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    }
  );
  return data.tokens || [];
}

export async function clearAdminTokens(
  pin: string,
  scope: 'used' | 'all'
): Promise<SessionToken[]> {
  const data = await requestJson<{ tokens: SessionToken[] }>(
    `/api/admin/tokens?scope=${scope}`,
    {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    }
  );
  return data.tokens || [];
}

export function fetchAdminSpreadsheetState(pin: string): Promise<{
  config: SpreadsheetConfig;
  adminTopics: AdminTopicItem[];
  liveTopics: LiveTopicsResponse;
}> {
  return requestJson('/api/admin/spreadsheet', {
    headers: { 'x-admin-pin': pin },
  });
}

export interface ParticipantSheetConfig {
  spreadsheetUrl: string;
  appsScriptUrl: string;
  deploymentId: string;
  sheetName: string;
  enabled: boolean;
}

export async function fetchParticipantSheetConfig(
  pin: string
): Promise<ParticipantSheetConfig> {
  const data = await requestJson<{ config: ParticipantSheetConfig }>(
    '/api/admin/participant-sheet',
    {
      headers: { 'x-admin-pin': pin },
    }
  );
  return data.config;
}

export function updateParticipantSheetConfig(
  pin: string,
  config: ParticipantSheetConfig
): Promise<{ ok: boolean; config: ParticipantSheetConfig }> {
  return requestJson('/api/admin/participant-sheet', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    },
    body: JSON.stringify(config),
  });
}

export function testParticipantSheetConfig(
  pin: string
): Promise<{
  ok: boolean;
  sheetName?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  rowNumber?: number;
  isLegacyResponse?: boolean;
  testedAt?: string;
  error?: string;
}> {
  return requestJson('/api/admin/participant-sheet/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    },
  });
}

export function logParticipantResult(payload: {
  timestamp?: string;
  name: string;
  institution: string;
  phone: string;
  sessionType: string;
  score: number;
  topic: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  return requestJson('/api/participants/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateSpreadsheetConfig(
  pin: string,
  config: SpreadsheetConfig
): Promise<{
  ok: boolean;
  config: SpreadsheetConfig;
  adminTopics?: AdminTopicItem[];
  liveTopics: LiveTopicsResponse;
  syncResult: {
    source: 'spreadsheet' | 'apps_script' | 'unconfigured';
    lastSyncedAt: string;
    sheetTopicsCount: number;
    totalLiveQuestions: number;
    warning?: string;
  };
}> {
  return requestJson('/api/admin/spreadsheet', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    },
    body: JSON.stringify(config),
  });
}
