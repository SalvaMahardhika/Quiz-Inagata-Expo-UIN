import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { BANK_SOAL, RawQuestion } from './src/data/bankSoal.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Helper Fisher-Yates
function fisherYates<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

const rooms = new Map<string, QuizRoom>();

// Clean up idle rooms older than 3 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 3 * 60 * 60 * 1000) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

function generateRoomCode(): string {
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

function broadcastToRoom(room: QuizRoom, message: object) {
  const data = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (!player.isDisconnected && player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function getLeaderboard(room: QuizRoom): LeaderboardEntry[] {
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

function advanceRoomQuestion(room: QuizRoom) {
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
        leaderboard: getLeaderboard(room),
      },
    });

    // Fallback safety timeout jika ada peserta yang koneksinya terganggu (13 detik)
    room.questionTimer = setTimeout(() => {
      advanceRoomQuestion(room);
    }, 13000);
  } else {
    // Selesai seluruh 10 soal
    room.status = 'FINISHED';
    room.finalLeaderboard = getLeaderboard(room);

    broadcastToRoom(room, {
      type: 'GAME_OVER',
      payload: {
        finalLeaderboard: room.finalLeaderboard,
      },
    });
  }
}

function handlePlayerDisconnectOrLeave(roomCode: string, playerId: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  if (room.status === 'LOBBY') {
    // Jika masih di LOBBY, hapus pemain dari daftar tunggu
    room.players.delete(playerId);
    if (room.players.size === 0) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      rooms.delete(roomCode);
      return;
    }
    if (room.hostId === playerId) {
      const nextHost = room.players.keys().next().value;
      if (nextHost) room.hostId = nextHost;
    }
    broadcastToRoom(room, {
      type: 'PLAYERS_UPDATED',
      payload: { players: getLeaderboard(room) },
    });
  } else {
    // Jika status PLAYING atau FINISHED:
    // JANGAN hapus pemain dari room.players agar nama & skor tetap tampil di layar peserta lain!
    player.isDisconnected = true;
    player.ws = undefined;

    const activePlayers = Array.from(room.players.values()).filter((p) => !p.isDisconnected);

    // Jika semua peserta sudah keluar/disconnect, baru bersihkan room dari memori
    if (activePlayers.length === 0) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
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
          leaderboard: getLeaderboard(room),
          allAnswered: allActiveHaveAnswered,
        },
      });

      // Jika seluruh peserta yang masih bertahan sudah menjawab, langsung lanjut ke soal berikutnya
      if (allActiveHaveAnswered) {
        if (room.questionTimer) clearTimeout(room.questionTimer);
        room.questionTimer = setTimeout(() => {
          advanceRoomQuestion(room);
        }, 1200);
      }
    }
  }
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  let currentPlayerId: string | null = null;
  let currentRoomCode: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case 'CREATE_ROOM': {
          const { hostName, hostInstitution, topicId } = payload;
          const topic = BANK_SOAL[topicId] || BANK_SOAL[1];

          // 1. Acak seluruh 30 soal topik dengan Fisher-Yates, lalu ambil 10 soal
          const shuffledRaw = fisherYates(topic.soal);
          const pickedTen = shuffledRaw.slice(0, 10);

          // 2. Acak 4 opsi jawaban tiap soal
          const preparedQuestions: RoomQuestion[] = pickedTen.map((q: RawQuestion) => ({
            kode: q.kode,
            pertanyaan: q.pertanyaan,
            gambar: q.gambar || '',
            options: fisherYates([...q.pilihan]),
            correctAnswerText: q.pilihan[q.jawabanBenar],
          }));

          const roomCode = generateRoomCode();
          const hostId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

          const hostPlayer: RoomPlayer = {
            id: hostId,
            name: hostName || 'Host Guru',
            institution: hostInstitution || 'Sekolah',
            score: 0,
            correctCount: 0,
            hasAnsweredCurrent: false,
            lastAnswerCorrect: null,
            isDisconnected: false,
            ws,
          };

          const room: QuizRoom = {
            code: roomCode,
            hostId,
            topicId: topic.id,
            topicTitle: `${topic.nama}: ${topic.judul}`,
            status: 'LOBBY',
            players: new Map([[hostId, hostPlayer]]),
            finalLeaderboard: [],
            questions: preparedQuestions,
            currentQuestionIndex: 0,
            questionTimer: null,
            createdAt: Date.now(),
          };

          rooms.set(roomCode, room);
          currentPlayerId = hostId;
          currentRoomCode = roomCode;

          ws.send(
            JSON.stringify({
              type: 'ROOM_CREATED',
              payload: {
                roomCode,
                playerId: hostId,
                isHost: true,
                topicTitle: room.topicTitle,
                players: getLeaderboard(room),
              },
            })
          );
          break;
        }

        case 'JOIN_ROOM': {
          const { roomCode, playerName, playerInstitution } = payload;
          const cleanCode = (roomCode || '').trim();
          const room = rooms.get(cleanCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Kode PIN Room tidak ditemukan.' } }));
            return;
          }

          if (room.status !== 'LOBBY') {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Kuis di room ini sudah berlangsung.' } }));
            return;
          }

          const newPlayerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const newPlayer: RoomPlayer = {
            id: newPlayerId,
            name: playerName || 'Peserta',
            institution: playerInstitution || 'Instansi',
            score: 0,
            correctCount: 0,
            hasAnsweredCurrent: false,
            lastAnswerCorrect: null,
            isDisconnected: false,
            ws,
          };

          room.players.set(newPlayerId, newPlayer);
          currentPlayerId = newPlayerId;
          currentRoomCode = cleanCode;

          ws.send(
            JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomCode: cleanCode,
                playerId: newPlayerId,
                isHost: false,
                topicTitle: room.topicTitle,
                players: getLeaderboard(room),
              },
            })
          );

          broadcastToRoom(room, {
            type: 'PLAYERS_UPDATED',
            payload: {
              players: getLeaderboard(room),
            },
          });
          break;
        }

        case 'START_ROOM_GAME': {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          if (room.hostId !== currentPlayerId) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Hanya Host yang dapat memulai kuis.' } }));
            return;
          }

          if (room.players.size < 2) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Minimal 2 peserta untuk bermain bersama.' },
              })
            );
            return;
          }

          room.status = 'PLAYING';
          room.currentQuestionIndex = 0;

          for (const p of room.players.values()) {
            p.score = 0;
            p.correctCount = 0;
            p.hasAnsweredCurrent = false;
            p.lastAnswerCorrect = null;
          }

          broadcastToRoom(room, {
            type: 'GAME_STARTED',
            payload: {
              questions: room.questions,
              topicTitle: room.topicTitle,
              players: getLeaderboard(room),
            },
          });

          // Mulai safety timer soal pertama (13s)
          if (room.questionTimer) clearTimeout(room.questionTimer);
          room.questionTimer = setTimeout(() => {
            advanceRoomQuestion(room);
          }, 13000);
          break;
        }

        case 'SUBMIT_ROOM_ANSWER': {
          if (!currentRoomCode || !currentPlayerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room || room.status !== 'PLAYING') return;

          const player = room.players.get(currentPlayerId);
          if (!player || player.hasAnsweredCurrent) return;

          const { questionIndex, answerText, timeTakenMs } = payload;
          const currentQ = room.questions[questionIndex];
          if (!currentQ) return;

          const isCorrect = answerText === currentQ.correctAnswerText;
          player.hasAnsweredCurrent = true;
          player.lastAnswerCorrect = isCorrect;

          if (isCorrect) {
            const speedBonus = Math.max(0, Math.floor((10000 - (timeTakenMs || 5000)) / 2500));
            player.score += 10 + speedBonus;
            player.correctCount += 1;
          }

          // Cek apakah seluruh peserta yang masih aktif sudah menjawab
          const activePlayers = Array.from(room.players.values()).filter((p) => !p.isDisconnected);
          const allHaveAnswered = activePlayers.every((p) => p.hasAnsweredCurrent);

          // Siarkan live leaderboard terupdate (termasuk peserta yang sudah logout)
          broadcastToRoom(room, {
            type: 'LIVE_LEADERBOARD',
            payload: {
              leaderboard: getLeaderboard(room),
              allAnswered: allHaveAnswered,
            },
          });

          // Jika semua pemain aktif sudah menjawab, percepat pindah ke soal berikutnya dalam 1.2 detik!
          if (allHaveAnswered) {
            if (room.questionTimer) clearTimeout(room.questionTimer);
            room.questionTimer = setTimeout(() => {
              advanceRoomQuestion(room);
            }, 1200);
          }
          break;
        }

        case 'ADVANCE_QUESTION': {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (!room || room.status !== 'PLAYING') return;

          advanceRoomQuestion(room);
          break;
        }

        case 'LEAVE_ROOM': {
          if (currentRoomCode && currentPlayerId) {
            handlePlayerDisconnectOrLeave(currentRoomCode, currentPlayerId);
          }
          currentPlayerId = null;
          currentRoomCode = null;
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode && currentPlayerId) {
      handlePlayerDisconnectOrLeave(currentRoomCode, currentPlayerId);
    }
  });
});

// Setup Vite dev server or static express in prod
async function setupApp() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupApp();