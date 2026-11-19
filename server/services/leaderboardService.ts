import {
  decryptPhoneFromStorage,
  encryptPhoneForStorage,
  fsDeleteDoc,
  fsListDocs,
  fsSetDoc,
  isFirestoreConfigured,
} from '../lib/firestoreStore.ts';
import { LEADERBOARD_FILE, readJsonFile, writeJsonFile } from '../lib/jsonStore.ts';
import type { GlobalLeaderboardRecord } from '../types.ts';

const LEADERBOARD_COLLECTION = 'leaderboard_records';

interface FirestoreLeaderboardDoc {
  id: string;
  timestamp: string;
  formattedDate: string;
  name: string;
  institution: string;
  phoneCipher?: string;
  topicId: number;
  topicName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timedOutCount: number;
}

let leaderboardStore: GlobalLeaderboardRecord[] = readJsonFile<GlobalLeaderboardRecord[]>(
  LEADERBOARD_FILE,
  []
);
let loadPromise: Promise<void> | null = null;
let loadedFromFirestore = false;

function toFirestorePayload(rec: GlobalLeaderboardRecord): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: rec.id.slice(0, 80),
    timestamp: String(rec.timestamp || '').slice(0, 64),
    formattedDate: String(rec.formattedDate || '').slice(0, 64),
    name: String(rec.name || 'Peserta').trim().slice(0, 120) || 'Peserta',
    institution: String(rec.institution || '-').trim().slice(0, 160),
    topicId: Math.max(0, Math.min(1000, Math.round(Number(rec.topicId) || 1))),
    topicName: String(rec.topicName || '-').trim().slice(0, 160),
    score: Math.max(0, Math.min(100000, Math.round(Number(rec.score) || 0))),
    totalQuestions: Math.max(0, Math.min(200, Math.round(Number(rec.totalQuestions) || 10))),
    correctCount: Math.max(0, Math.min(200, Math.round(Number(rec.correctCount) || 0))),
    timedOutCount: Math.max(0, Math.min(200, Math.round(Number(rec.timedOutCount) || 0))),
  };
  const cipher = encryptPhoneForStorage(rec.phone);
  if (cipher) {
    payload.phoneCipher = cipher.slice(0, 300);
  }
  return payload;
}

export async function ensureLeaderboardLoaded(): Promise<void> {
  if (loadedFromFirestore || !isFirestoreConfigured()) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const docs = await fsListDocs<FirestoreLeaderboardDoc>(
          LEADERBOARD_COLLECTION,
          'leaderboard'
        );
        if (docs.length > 0) {
          leaderboardStore = docs
            .map((d) => ({
              id: d.id,
              timestamp: d.timestamp,
              formattedDate: d.formattedDate,
              name: d.name,
              institution: d.institution,
              phone: decryptPhoneFromStorage(d.phoneCipher),
              topicId: Number(d.topicId) || 1,
              topicName: d.topicName || '-',
              score: Number(d.score) || 0,
              totalQuestions: Number(d.totalQuestions) || 10,
              correctCount: Number(d.correctCount) || 0,
              timedOutCount: Number(d.timedOutCount) || 0,
            }))
            .sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          writeJsonFile(LEADERBOARD_FILE, leaderboardStore);
        } else if (leaderboardStore.length > 0) {
          await Promise.all(
            leaderboardStore.map((rec) =>
              fsSetDoc(LEADERBOARD_COLLECTION, rec.id, toFirestorePayload(rec)).catch((err) =>
                console.error('Gagal seed leaderboard ke Firestore:', err)
              )
            )
          );
        }
        loadedFromFirestore = true;
      } catch (err) {
        console.error('Gagal memuat leaderboard dari Firestore:', err);
      } finally {
        loadPromise = null;
      }
    })();
  }
  await loadPromise;
}

export async function getPublicLeaderboard(limitParam = 20): Promise<{
  top: Omit<GlobalLeaderboardRecord, 'phone'>[];
  totalCount: number;
}> {
  await ensureLeaderboardLoaded();
  const limit = Math.max(1, Math.min(100, Number(limitParam) || 20));
  const sorted = [...leaderboardStore].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const publicTop = sorted.slice(0, limit).map(({ phone: _phone, ...rest }) => rest);
  return {
    top: publicTop,
    totalCount: leaderboardStore.length,
  };
}

export async function getAllAdminRecords(): Promise<{
  records: GlobalLeaderboardRecord[];
  totalCount: number;
}> {
  await ensureLeaderboardLoaded();
  return {
    records: leaderboardStore,
    totalCount: leaderboardStore.length,
  };
}

export async function addLeaderboardRecord(input: {
  name: string;
  institution?: string;
  phone?: string;
  topicId?: number;
  topicName?: string;
  score?: number;
  totalQuestions?: number;
  correctCount?: number;
  timedOutCount?: number;
}): Promise<GlobalLeaderboardRecord> {
  await ensureLeaderboardLoaded();
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(now);

  const newRecord: GlobalLeaderboardRecord = {
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: now.toISOString(),
    formattedDate,
    name: input.name.trim().slice(0, 120) || 'Peserta',
    institution: String(input.institution || '-').trim().slice(0, 160),
    phone: String(input.phone || '-').trim(),
    topicId: Math.max(0, Math.min(1000, Math.round(Number(input.topicId) || 1))),
    topicName: String(input.topicName || '-').trim().slice(0, 160),
    score: Math.max(0, Math.min(100000, Math.round(Number(input.score) || 0))),
    totalQuestions: Math.max(0, Math.min(200, Math.round(Number(input.totalQuestions) || 10))),
    correctCount: Math.max(0, Math.min(200, Math.round(Number(input.correctCount) || 0))),
    timedOutCount: Math.max(0, Math.min(200, Math.round(Number(input.timedOutCount) || 0))),
  };

  leaderboardStore.unshift(newRecord);
  writeJsonFile(LEADERBOARD_FILE, leaderboardStore);

  if (isFirestoreConfigured()) {
    try {
      await fsSetDoc(LEADERBOARD_COLLECTION, newRecord.id, toFirestorePayload(newRecord));
    } catch (err) {
      console.error('Gagal menyimpan record leaderboard ke Firestore:', err);
    }
  }

  return newRecord;
}

export async function clearAllLeaderboardRecords(): Promise<void> {
  await ensureLeaderboardLoaded();
  const existingIds = leaderboardStore.map((r) => r.id);
  leaderboardStore = [];
  writeJsonFile(LEADERBOARD_FILE, leaderboardStore);

  if (isFirestoreConfigured() && existingIds.length > 0) {
    await Promise.all(
      existingIds.map((id) =>
        fsDeleteDoc(LEADERBOARD_COLLECTION, id).catch((err) =>
          console.error('Gagal menghapus leaderboard doc di Firestore:', err)
        )
      )
    );
  }
}

export function getLeaderboardCount(): number {
  return leaderboardStore.length;
}
