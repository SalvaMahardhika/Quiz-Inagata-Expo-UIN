import { WebSocket } from 'ws';
import { RawQuestion } from '../../src/types/quiz.ts';
import { fisherYates, generateUniqueRoomCode } from '../lib/random.ts';
import { getLiveTopics } from './spreadsheetService.ts';
import {
  consumeSessionToken,
  ensureTokensLoaded,
  normalizeTokenCode,
  releaseSessionTokenReservation,
  reserveSessionToken,
} from './tokenService.ts';
import type { LeaderboardEntry, QuizRoom, RoomPlayer, RoomQuestion } from '../types.ts';

const rooms = new Map<string, QuizRoom>();

function buildPlayerQuestions(
  topicPool: RawQuestion[] | undefined,
  fallbackQuestions: RoomQuestion[],
  count = 10
): RoomQuestion[] {
  if (Array.isArray(topicPool) && topicPool.length > 0) {
    return fisherYates([...topicPool])
      .slice(0, count)
      .map((q) => ({
        kode: q.kode,
        pertanyaan: q.pertanyaan,
        gambar: q.gambar || '',
        options: fisherYates([...q.pilihan]),
        correctAnswerText: q.pilihan[q.jawabanBenar],
      }));
  }
  return fisherYates([...fallbackQuestions]).map((q) => ({
    kode: q.kode,
    pertanyaan: q.pertanyaan,
    gambar: q.gambar || '',
    options: fisherYates([...q.options]),
    correctAnswerText: q.correctAnswerText,
  }));
}

function finalizeRoomToken(room: QuizRoom): void {
  if (room.tokenConsumed || !room.sessionToken) return;
  const holderKey = `ROOM:${room.code}`;
  const res = consumeSessionToken(
    room.sessionToken,
    'MULTIPLAYER',
    room.hostName || 'Host',
    room.hostInstitution || '-',
    room.code,
    holderKey
  );
  if (res.ok) {
    room.tokenConsumed = true;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 3 * 60 * 60 * 1000) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      if (!room.tokenConsumed && room.sessionToken) {
        releaseSessionTokenReservation(room.sessionToken, `ROOM:${code}`);
      }
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

export function broadcastToRoom(room: QuizRoom, message: object): void {
  const data = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (!player.isDisconnected && player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

export function getRoomLeaderboard(room: QuizRoom): LeaderboardEntry[] {
  return Array.from(room.players.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      institution: p.institution,
      score: p.score,
      correctCount: p.correctCount,
      hasAnsweredCurrent: p.hasAnsweredCurrent,
      isDisconnected: !!p.isDisconnected,
    }))
    .sort((a, b) => b.score - a.score);
}

export function advanceRoomQuestion(room: QuizRoom): void {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  const nextIndex = room.currentQuestionIndex + 1;
  if (nextIndex < room.questions.length) {
    room.currentQuestionIndex = nextIndex;
    for (const p of room.players.values()) {
      p.hasAnsweredCurrent = false;
      p.lastAnswerCorrect = null;
    }

    broadcastToRoom(room, {
      type: 'NEXT_QUESTION',
      payload: {
        questionIndex: nextIndex,
        leaderboard: getRoomLeaderboard(room),
      },
    });

    room.questionTimer = setTimeout(() => {
      advanceRoomQuestion(room);
    }, 13000);
  } else {
    room.status = 'FINISHED';
    room.finalLeaderboard = getRoomLeaderboard(room);
    finalizeRoomToken(room);

    broadcastToRoom(room, {
      type: 'GAME_OVER',
      payload: {
        finalLeaderboard: room.finalLeaderboard,
      },
    });
  }
}

export async function createRoomSession(params: {
  ws: WebSocket;
  hostName: string;
  hostInstitution: string;
  topicId: number;
  sessionToken: string;
}): Promise<
  | { ok: true; room: QuizRoom; hostId: string }
  | { ok: false; message: string }
> {
  const live = await getLiveTopics(false);
  const topicsMap = live.topics;
  const topic = topicsMap[params.topicId];

  if (!topic || !Array.isArray(topic.soal) || topic.soal.length < 10) {
    return {
      ok: false,
      message:
        Object.keys(topicsMap).length === 0
          ? live.warning ||
            'Belum ada topik aktif dengan minimal 10 soal. Periksa Bank Soal di menu Admin.'
          : 'Topik yang dipilih sedang dinonaktifkan atau belum memiliki minimal 10 soal.',
    };
  }

  await ensureTokensLoaded();
  const roomCode = generateUniqueRoomCode(rooms);
  const holderKey = `ROOM:${roomCode}`;
  const tokenCheck = reserveSessionToken(params.sessionToken, 'MULTIPLAYER', holderKey);

  if (!tokenCheck.ok) {
    return { ok: false, message: tokenCheck.message };
  }

  const preparedQuestions = buildPlayerQuestions(topic.soal, [], 10);
  const hostId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const hostPlayer: RoomPlayer = {
    id: hostId,
    name: params.hostName || 'Host',
    institution: params.hostInstitution || 'Instansi',
    score: 0,
    correctCount: 0,
    hasAnsweredCurrent: false,
    lastAnswerCorrect: null,
    isDisconnected: false,
    questions: buildPlayerQuestions(topic.soal, preparedQuestions, 10),
    ws: params.ws,
  };

  const room: QuizRoom = {
    code: roomCode,
    hostId,
    hostName: params.hostName || 'Host',
    hostInstitution: params.hostInstitution || '-',
    sessionToken: normalizeTokenCode(params.sessionToken),
    tokenConsumed: false,
    topicId: topic.id,
    topicTitle: `${topic.nama}: ${topic.judul}`,
    status: 'LOBBY',
    players: new Map([[hostId, hostPlayer]]),
    finalLeaderboard: [],
    topicQuestions: [...topic.soal],
    questions: preparedQuestions,
    currentQuestionIndex: 0,
    questionTimer: null,
    createdAt: Date.now(),
  };

  rooms.set(roomCode, room);
  return { ok: true, room, hostId };
}

export function joinRoomSession(params: {
  ws: WebSocket;
  roomCode: string;
  playerName: string;
  playerInstitution: string;
}):
  | { ok: true; room: QuizRoom; playerId: string }
  | { ok: false; message: string } {
  const cleanCode = (params.roomCode || '').trim();
  const room = rooms.get(cleanCode);

  if (!room) {
    return { ok: false, message: 'Kode PIN Room tidak ditemukan.' };
  }

  if (room.status !== 'LOBBY') {
    return { ok: false, message: 'Kuis di room ini sudah berlangsung.' };
  }

  const newPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newPlayer: RoomPlayer = {
    id: newPlayerId,
    name: params.playerName || 'Peserta',
    institution: params.playerInstitution || 'Instansi',
    score: 0,
    correctCount: 0,
    hasAnsweredCurrent: false,
    lastAnswerCorrect: null,
    isDisconnected: false,
    questions: buildPlayerQuestions(room.topicQuestions, room.questions, room.questions.length || 10),
    ws: params.ws,
  };

  room.players.set(newPlayerId, newPlayer);
  return { ok: true, room, playerId: newPlayerId };
}

export function getRoomByCode(roomCode: string): QuizRoom | undefined {
  return rooms.get(roomCode);
}

export function startRoomGame(
  roomCode: string,
  requesterId: string
): { ok: true; room: QuizRoom } | { ok: false; message: string } {
  const room = rooms.get(roomCode);
  if (!room) return { ok: false, message: 'Room tidak ditemukan.' };

  if (room.hostId !== requesterId) {
    return { ok: false, message: 'Hanya Host yang dapat memulai kuis.' };
  }

  if (room.players.size < 2) {
    return { ok: false, message: 'Minimal 2 peserta untuk bermain bersama.' };
  }

  room.status = 'PLAYING';
  room.currentQuestionIndex = 0;

  for (const p of room.players.values()) {
    p.score = 0;
    p.correctCount = 0;
    p.hasAnsweredCurrent = false;
    p.lastAnswerCorrect = null;
    p.questions = buildPlayerQuestions(room.topicQuestions, room.questions, room.questions.length || 10);
  }

  const initialLeaderboard = getRoomLeaderboard(room);
  for (const p of room.players.values()) {
    if (!p.isDisconnected && p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(
        JSON.stringify({
          type: 'GAME_STARTED',
          payload: {
            questions: p.questions,
            topicTitle: room.topicTitle,
            players: initialLeaderboard,
          },
        })
      );
    }
  }

  if (room.questionTimer) clearTimeout(room.questionTimer);
  room.questionTimer = setTimeout(() => {
    advanceRoomQuestion(room);
  }, 13000);

  return { ok: true, room };
}

export function submitRoomAnswer(params: {
  roomCode: string;
  playerId: string;
  questionIndex: number;
  answerText: string;
  timeTakenMs: number;
}): void {
  const room = rooms.get(params.roomCode);
  if (!room || room.status !== 'PLAYING') return;
  if (params.questionIndex !== room.currentQuestionIndex) return;

  const player = room.players.get(params.playerId);
  if (!player || player.hasAnsweredCurrent) return;

  const currentQ =
    (player.questions && player.questions[params.questionIndex]) ||
    room.questions[params.questionIndex];
  if (!currentQ) return;

  const cleanAnswer = String(params.answerText || '');
  const isCorrect = Boolean(cleanAnswer) && cleanAnswer === currentQ.correctAnswerText;
  player.hasAnsweredCurrent = true;
  player.lastAnswerCorrect = isCorrect;

  if (isCorrect) {
    const speedBonus = Math.max(0, Math.floor((10000 - (params.timeTakenMs || 5000)) / 2500));
    player.score += 10 + speedBonus;
    player.correctCount += 1;
  }

  const activePlayers = Array.from(room.players.values()).filter((p) => !p.isDisconnected);
  const allHaveAnswered = activePlayers.every((p) => p.hasAnsweredCurrent);

  broadcastToRoom(room, {
    type: 'LIVE_LEADERBOARD',
    payload: {
      leaderboard: getRoomLeaderboard(room),
      allAnswered: allHaveAnswered,
    },
  });

  if (allHaveAnswered) {
    if (params.questionIndex >= room.questions.length - 1) {
      finalizeRoomToken(room);
    }
    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.questionTimer = setTimeout(() => {
      advanceRoomQuestion(room);
    }, 1200);
  }
}

export function handlePlayerDisconnectOrLeave(roomCode: string, playerId: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  if (room.status === 'LOBBY') {
    room.players.delete(playerId);
    if (room.players.size === 0) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      if (!room.tokenConsumed && room.sessionToken) {
        releaseSessionTokenReservation(room.sessionToken, `ROOM:${roomCode}`);
      }
      rooms.delete(roomCode);
      return;
    }
    if (room.hostId === playerId) {
      const nextHost = room.players.keys().next().value;
      if (nextHost) room.hostId = nextHost;
    }
    broadcastToRoom(room, {
      type: 'PLAYERS_UPDATED',
      payload: {
        players: getRoomLeaderboard(room),
        hostId: room.hostId,
      },
    });
  } else {
    player.isDisconnected = true;
    player.ws = undefined;

    const activePlayers = Array.from(room.players.values()).filter((p) => !p.isDisconnected);

    if (activePlayers.length === 0) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      if (room.status === 'FINISHED') {
        finalizeRoomToken(room);
      } else if (!room.tokenConsumed && room.sessionToken) {
        releaseSessionTokenReservation(room.sessionToken, `ROOM:${roomCode}`);
      }
      rooms.delete(roomCode);
      return;
    }

    if (room.hostId === playerId) {
      room.hostId = activePlayers[0].id;
    }

    if (room.status === 'PLAYING') {
      const allActiveHaveAnswered = activePlayers.every((p) => p.hasAnsweredCurrent);
      broadcastToRoom(room, {
        type: 'LIVE_LEADERBOARD',
        payload: {
          leaderboard: getRoomLeaderboard(room),
          allAnswered: allActiveHaveAnswered,
        },
      });

      if (allActiveHaveAnswered) {
        if (room.questionTimer) clearTimeout(room.questionTimer);
        room.questionTimer = setTimeout(() => {
          advanceRoomQuestion(room);
        }, 1200);
      }
    }
  }
}
