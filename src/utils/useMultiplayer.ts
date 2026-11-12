import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomQuestion } from '../../server';

export interface MultiPlayerItem {
  id: string;
  name: string;
  institution: string;
  score: number;
  correctCount: number;
  hasAnsweredCurrent: boolean;
}

export function useMultiplayer() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [players, setPlayers] = useState<MultiPlayerItem[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<MultiPlayerItem[]>([]);
  const [questions, setQuestions] = useState<RoomQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'LOBBY' | 'PLAYING' | 'FINISHED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allAnswered, setAllAnswered] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const gameStatusRef = useRef<'IDLE' | 'LOBBY' | 'PLAYING' | 'FINISHED'>('IDLE');

  // Keep ref in sync
  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}`);

    ws.onopen = () => {
      setIsConnected(true);
      setErrorMessage(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'ROOM_CREATED':
          case 'ROOM_JOINED': {
            setRoomCode(payload.roomCode);
            setPlayerId(payload.playerId);
            setIsHost(payload.isHost);
            setTopicTitle(payload.topicTitle);
            setPlayers(payload.players || []);
            setFinalLeaderboard([]);
            setGameStatus('LOBBY');
            setErrorMessage(null);
            break;
          }

          case 'PLAYERS_UPDATED': {
            // Jika permainan sudah selesai (FINISHED), jangan kurangi daftar podium!
            if (gameStatusRef.current !== 'FINISHED') {
              setPlayers(payload.players || []);
            }
            break;
          }

          case 'GAME_STARTED': {
            setQuestions(payload.questions || []);
            setTopicTitle(payload.topicTitle || '');
            setPlayers(payload.players || []);
            setFinalLeaderboard([]);
            setCurrentQuestionIndex(0);
            setGameStatus('PLAYING');
            setAllAnswered(false);
            break;
          }

          case 'LIVE_LEADERBOARD': {
            setPlayers(payload.leaderboard || []);
            setAllAnswered(!!payload.allAnswered);
            break;
          }

          case 'NEXT_QUESTION': {
            setCurrentQuestionIndex(payload.questionIndex);
            setPlayers(payload.leaderboard || []);
            setAllAnswered(false);
            break;
          }

          case 'GAME_OVER': {
            const finalBoard = payload.finalLeaderboard || [];
            setFinalLeaderboard(finalBoard);
            setPlayers(finalBoard);
            setGameStatus('FINISHED');
            break;
          }

          case 'ERROR': {
            setErrorMessage(payload.message || 'Terjadi kesalahan jaringan.');
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing multiplayer message:', err);
      }
    };

    ws.onerror = () => {
      setErrorMessage('Koneksi ke server terganggu.');
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    socketRef.current = ws;
  }, []);

  const send = useCallback((type: string, payload: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const createRoom = useCallback(
    (hostName: string, hostInstitution: string, topicId: number) => {
      connect();
      const checkAndSend = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          send('CREATE_ROOM', { hostName, hostInstitution, topicId });
        } else {
          setTimeout(checkAndSend, 100);
        }
      };
      checkAndSend();
    },
    [connect, send]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string, playerInstitution: string) => {
      connect();
      const checkAndSend = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          send('JOIN_ROOM', { roomCode: code, playerName, playerInstitution });
        } else {
          setTimeout(checkAndSend, 100);
        }
      };
      checkAndSend();
    },
    [connect, send]
  );

  const startRoomGame = useCallback(() => {
    send('START_ROOM_GAME', {});
  }, [send]);

  const submitAnswer = useCallback(
    (questionIndex: number, answerText: string, timeTakenMs: number) => {
      send('SUBMIT_ROOM_ANSWER', { questionIndex, answerText, timeTakenMs });
    },
    [send]
  );

  const advanceQuestion = useCallback(() => {
    send('ADVANCE_QUESTION', {});
  }, [send]);

  const leaveRoom = useCallback(() => {
    send('LEAVE_ROOM', {});
    setRoomCode(null);
    setPlayerId(null);
    setIsHost(false);
    setPlayers([]);
    setFinalLeaderboard([]);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setGameStatus('IDLE');
    setErrorMessage(null);
    setAllAnswered(false);
  }, [send]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    roomCode,
    playerId,
    isHost,
    topicTitle,
    players,
    finalLeaderboard,
    questions,
    currentQuestionIndex,
    gameStatus,
    errorMessage,
    allAnswered,
    connect,
    createRoom,
    joinRoom,
    startRoomGame,
    submitAnswer,
    advanceQuestion,
    leaveRoom,
    clearError: () => setErrorMessage(null),
  };
}
