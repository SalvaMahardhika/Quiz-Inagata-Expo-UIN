import type { WebSocket, WebSocketServer } from 'ws';
import {
  advanceRoomQuestion,
  broadcastToRoom,
  createRoomSession,
  getRoomByCode,
  getRoomLeaderboard,
  handlePlayerDisconnectOrLeave,
  joinRoomSession,
  startRoomGame,
  submitRoomAnswer,
} from '../services/roomService.ts';

export function attachMultiplayerGateway(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    let currentPlayerId: string | null = null;
    let currentRoomCode: string | null = null;

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, payload } = msg;

        switch (type) {
          case 'CREATE_ROOM': {
            const { hostName, hostInstitution, topicId, sessionToken } = payload || {};
            const result = await createRoomSession({
              ws,
              hostName: String(hostName || 'Host'),
              hostInstitution: String(hostInstitution || '-'),
              topicId: Number(topicId) || 1,
              sessionToken: String(sessionToken || ''),
            });

            if (!result.ok) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: { message: result.message } }));
              return;
            }

            currentPlayerId = result.hostId;
            currentRoomCode = result.room.code;

            ws.send(
              JSON.stringify({
                type: 'ROOM_CREATED',
                payload: {
                  roomCode: result.room.code,
                  playerId: result.hostId,
                  isHost: true,
                  topicTitle: result.room.topicTitle,
                  players: getRoomLeaderboard(result.room),
                },
              })
            );
            break;
          }

          case 'JOIN_ROOM': {
            const { roomCode, playerName, playerInstitution } = payload || {};
            const result = joinRoomSession({
              ws,
              roomCode: String(roomCode || ''),
              playerName: String(playerName || 'Peserta'),
              playerInstitution: String(playerInstitution || 'Instansi'),
            });

            if (!result.ok) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: { message: result.message } }));
              return;
            }

            currentPlayerId = result.playerId;
            currentRoomCode = result.room.code;

            ws.send(
              JSON.stringify({
                type: 'ROOM_JOINED',
                payload: {
                  roomCode: result.room.code,
                  playerId: result.playerId,
                  isHost: false,
                  topicTitle: result.room.topicTitle,
                  players: getRoomLeaderboard(result.room),
                },
              })
            );

            broadcastToRoom(result.room, {
              type: 'PLAYERS_UPDATED',
              payload: {
                players: getRoomLeaderboard(result.room),
              },
            });
            break;
          }

          case 'START_ROOM_GAME': {
            if (!currentRoomCode || !currentPlayerId) return;
            const result = startRoomGame(currentRoomCode, currentPlayerId);
            if (!result.ok) {
              ws.send(JSON.stringify({ type: 'ERROR', payload: { message: result.message } }));
            }
            break;
          }

          case 'SUBMIT_ROOM_ANSWER': {
            if (!currentRoomCode || !currentPlayerId) return;
            const { questionIndex, answerText, timeTakenMs } = payload || {};
            submitRoomAnswer({
              roomCode: currentRoomCode,
              playerId: currentPlayerId,
              questionIndex: Number(questionIndex) || 0,
              answerText: String(answerText || ''),
              timeTakenMs: Number(timeTakenMs) || 5000,
            });
            break;
          }

          case 'ADVANCE_QUESTION': {
            if (!currentRoomCode) return;
            const room = getRoomByCode(currentRoomCode);
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
}
