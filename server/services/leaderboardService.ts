import { readJsonFile, writeJsonFile, LEADERBOARD_FILE } from '../lib/jsonStore.ts';
import type { GlobalLeaderboardRecord } from '../types.ts';

let leaderboardStore: GlobalLeaderboardRecord[] = readJsonFile<GlobalLeaderboardRecord[]>(
  LEADERBOARD_FILE,
  []
);

export function getPublicLeaderboard(limitParam = 20): {
  top: Omit<GlobalLeaderboardRecord, 'phone'>[];
  totalCount: number;
} {
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

export function getAllAdminRecords(): {
  records: GlobalLeaderboardRecord[];
  totalCount: number;
} {
  return {
    records: leaderboardStore,
    totalCount: leaderboardStore.length,
  };
}

export function addLeaderboardRecord(input: {
  name: string;
  institution?: string;
  phone?: string;
  topicId?: number;
  topicName?: string;
  score?: number;
  totalQuestions?: number;
  correctCount?: number;
  timedOutCount?: number;
}): GlobalLeaderboardRecord {
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
    name: input.name.trim(),
    institution: String(input.institution || '-').trim(),
    phone: String(input.phone || '-').trim(),
    topicId: Number(input.topicId) || 1,
    topicName: String(input.topicName || '-').trim(),
    score: Number(input.score) || 0,
    totalQuestions: Number(input.totalQuestions) || 10,
    correctCount: Number(input.correctCount) || 0,
    timedOutCount: Number(input.timedOutCount) || 0,
  };

  leaderboardStore.unshift(newRecord);
  writeJsonFile(LEADERBOARD_FILE, leaderboardStore);

  return newRecord;
}

export function clearAllLeaderboardRecords(): void {
  leaderboardStore = [];
  writeJsonFile(LEADERBOARD_FILE, leaderboardStore);
}

export function getLeaderboardCount(): number {
  return leaderboardStore.length;
}
