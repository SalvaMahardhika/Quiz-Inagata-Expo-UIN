import type { WebSocket } from 'ws';
import type { TopicPackage } from '../src/types/quiz.ts';

export interface RoomPlayer {
  id: string;
  name: string;
  institution: string;
  score: number;
  correctCount: number;
  hasAnsweredCurrent: boolean;
  lastAnswerCorrect: boolean | null;
  isDisconnected?: boolean;
  ws?: WebSocket;
}

export interface RoomQuestion {
  kode: string;
  pertanyaan: string;
  gambar: string;
  options: string[];
  correctAnswerText: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  institution: string;
  score: number;
  correctCount: number;
  hasAnsweredCurrent: boolean;
  isDisconnected?: boolean;
}

export interface QuizRoom {
  code: string;
  hostId: string;
  topicId: number;
  topicTitle: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: Map<string, RoomPlayer>;
  finalLeaderboard: LeaderboardEntry[];
  questions: RoomQuestion[];
  currentQuestionIndex: number;
  questionTimer: NodeJS.Timeout | null;
  createdAt: number;
}

export interface GlobalLeaderboardRecord {
  id: string;
  timestamp: string;
  formattedDate: string;
  name: string;
  institution: string;
  phone: string;
  topicId: number;
  topicName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timedOutCount: number;
}

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
  enabled: boolean;
}

export interface LiveQuestionsCache {
  topics: Record<number, TopicPackage>;
  source: 'spreadsheet' | 'apps_script' | 'unconfigured';
  lastSyncedAt: string;
  sheetTopicsCount: number;
  totalLiveQuestions: number;
  warning?: string;
  fetchedAtMs: number;
}

export interface ParticipantSheetConfig {
  spreadsheetUrl: string;
  appsScriptUrl: string;
  deploymentId: string;
  sheetName: string;
  enabled: boolean;
}

export interface ParticipantLogPayload {
  timestamp?: string;
  name: string;
  institution: string;
  phone: string;
  sessionType: string;
  score: number;
  topic: string;
}
