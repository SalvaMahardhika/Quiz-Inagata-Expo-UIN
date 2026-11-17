import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { TopicPackage } from '../types/quiz';
import {
  prepareTeacherQuiz,
  fisherYatesShuffle,
  PreparedTeacherQuestion,
} from '../utils/shuffle';
import {
  playCorrectSound,
  playWrongSound,
  playClickSound,
  playFanfareSound,
} from '../utils/audio';
import {
  fetchLiveTopics,
  checkSessionToken,
  consumeSoloToken,
  submitGlobalLeaderboardRecord,
  LiveTopicsResponse,
} from '../services/quizApi';
import { sendResultToSpreadsheet } from '../services/spreadsheetLogger';
import { useMultiplayer, MultiPlayerItem } from '../utils/useMultiplayer';
import { useQuizTimer, QUESTION_DURATION_SEC } from './useQuizTimer';

export type ScreenState = 'REGISTRATION' | 'CHOOSE_TOPIC' | 'QUIZ' | 'RESULT';
export type PlayMode = 'SOLO' | 'MULTIPLAYER';
export type MultiplayerAction = 'CREATE' | 'JOIN';

export function useQuizSession() {
  const [playMode, setPlayMode] = useState<PlayMode>('SOLO');
  const [multiplayerAction, setMultiplayerAction] = useState<MultiplayerAction>('CREATE');
  const [joinPinInput, setJoinPinInput] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);

  const mp = useMultiplayer();

  const [cachedMultiplayerRoster, setCachedMultiplayerRoster] = useState<MultiPlayerItem[]>([]);
  const hasLoggedMpFinishRef = useRef(false);
  const hasLoggedSoloFinishRef = useRef(false);
  const [randomizedMpQuestions, setRandomizedMpQuestions] = useState<PreparedTeacherQuestion[]>([]);

  const [currentScreen, setCurrentScreen] = useState<ScreenState>('REGISTRATION');

  const [liveTopics, setLiveTopics] = useState<Record<number, TopicPackage>>({});
  const [topicSource, setTopicSource] = useState<'spreadsheet' | 'apps_script' | 'unconfigured'>(
    'unconfigured'
  );
  const [topicWarning, setTopicWarning] = useState<string>('');

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [sessionTokenInput, setSessionTokenInput] = useState('');
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [formError, setFormError] = useState('');

  const [selectedTopic, setSelectedTopic] = useState<TopicPackage | null>(null);
  const [soloQuestions, setSoloQuestions] = useState<PreparedTeacherQuestion[]>([]);
  const [soloQuestionIndex, setSoloQuestionIndex] = useState(0);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const isAnswerLockedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  const syncTopicsFromServer = useCallback(async () => {
    try {
      const data = await fetchLiveTopics(false);
      setLiveTopics(data?.topics || {});
      setTopicSource(data?.source || 'unconfigured');
      setTopicWarning(data?.warning || '');
    } catch {
      setTopicWarning('Gagal memuat soal dari server.');
    }
  }, []);

  const applyUpdatedTopics = useCallback((data: LiveTopicsResponse) => {
    setLiveTopics(data?.topics || {});
    setTopicSource(data?.source || 'unconfigured');
    setTopicWarning(data?.warning || '');
  }, []);

  useEffect(() => {
    syncTopicsFromServer();
  }, [syncTopicsFromServer]);

  // Acak urutan opsi tiap klien saat game multiplayer mulai sambil menjaga urutan soal sinkron
  useEffect(() => {
    if (playMode === 'MULTIPLAYER' && mp.gameStatus === 'PLAYING') {
      if (Array.isArray(mp.questions) && mp.questions.length > 0) {
        const preparedLocal: PreparedTeacherQuestion[] = mp.questions.map((q) => ({
          kode: q.kode,
          pertanyaan: q.pertanyaan,
          gambar: q.gambar || '',
          options: fisherYatesShuffle([...(q.options || [])]),
          correctAnswerText: q.correctAnswerText,
        }));
        setRandomizedMpQuestions(preparedLocal);
      }
    }
  }, [playMode, mp.gameStatus, mp.questions]);

  // Sinkronisasi roster multiplayer agar peserta yang logout tetap muncul
  useEffect(() => {
    if (playMode !== 'MULTIPLAYER') return;

    if (mp.gameStatus === 'IDLE') {
      setCachedMultiplayerRoster([]);
      hasLoggedMpFinishRef.current = false;
      return;
    }

    if (mp.gameStatus === 'LOBBY') {
      setCachedMultiplayerRoster(mp.players);
      hasLoggedMpFinishRef.current = false;
      return;
    }

    const incomingList =
      mp.gameStatus === 'FINISHED' && mp.finalLeaderboard && mp.finalLeaderboard.length > 0
        ? mp.finalLeaderboard
        : mp.players;

    if (incomingList.length > 0) {
      setCachedMultiplayerRoster((prev) => {
        const mergedMap = new Map<string, MultiPlayerItem>();
        prev.forEach((p) => mergedMap.set(p.id, p));
        incomingList.forEach((p) => {
          const existing = mergedMap.get(p.id);
          if (existing && p.name.trim() === name.trim() && score > p.score) {
            mergedMap.set(p.id, { ...p, score });
          } else {
            mergedMap.set(p.id, p);
          }
        });
        return Array.from(mergedMap.values()).sort((a, b) => b.score - a.score);
      });
    }
  }, [playMode, mp.gameStatus, mp.players, mp.finalLeaderboard, score, name]);

  const currentQIndex = playMode === 'MULTIPLAYER' ? mp.currentQuestionIndex : soloQuestionIndex;
  const currentQuestions =
    playMode === 'MULTIPLAYER'
      ? randomizedMpQuestions.length > 0
        ? randomizedMpQuestions
        : mp.questions && mp.questions.length > 0
        ? mp.questions
        : []
      : soloQuestions;

  const activeQuestion = currentQuestions[currentQIndex] || null;
  const isPlaying = playMode === 'MULTIPLAYER' ? mp.gameStatus === 'PLAYING' : currentScreen === 'QUIZ';

  const moveToNextSoloQuestion = useCallback(
    (latestScore = score, latestCorrect = correctAnswersCount) => {
      const nextIndex = soloQuestionIndex + 1;
      if (nextIndex < soloQuestions.length) {
        setSoloQuestionIndex(nextIndex);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        isAnswerLockedRef.current = false;
      } else {
        if (hasLoggedSoloFinishRef.current) return;
        hasLoggedSoloFinishRef.current = true;

        const topicFullName = selectedTopic
          ? `${selectedTopic.nama}: ${selectedTopic.judul}`
          : '-';

        if (selectedTopic) {
          submitGlobalLeaderboardRecord({
            name: name.trim(),
            institution: institution.trim(),
            phone: phone.trim(),
            topicId: selectedTopic.id,
            topicName: topicFullName,
            score: latestScore,
            totalQuestions: soloQuestions.length,
            correctCount: latestCorrect,
            timedOutCount: soloQuestions.length - latestCorrect,
          }).catch(() => {});
        }

        sendResultToSpreadsheet({
          name,
          institution,
          phone,
          mode: 'Solo',
          topic: topicFullName,
          score: latestScore,
          correct: latestCorrect,
          totalQuestions: soloQuestions.length,
          detail: `Selesai Solo (${latestCorrect}/${soloQuestions.length} benar)`,
        });

        setCurrentScreen('RESULT');
      }
    },
    [
      soloQuestionIndex,
      soloQuestions.length,
      selectedTopic,
      name,
      institution,
      phone,
      score,
      correctAnswersCount,
    ]
  );

  const handleTimeOut = useCallback(() => {
    if (isAnswerLockedRef.current) return;
    isAnswerLockedRef.current = true;
    setIsAnswerLocked(true);
    playWrongSound();

    if (playMode === 'SOLO') {
      setTimeout(() => {
        moveToNextSoloQuestion();
      }, 1000);
    } else {
      mp.submitAnswer(currentQIndex, '', QUESTION_DURATION_SEC * 1000);
    }
  }, [playMode, moveToNextSoloQuestion, mp, currentQIndex]);

  const handleQuestionReset = useCallback(() => {
    setSelectedOption(null);
    setIsAnswerLocked(false);
    isAnswerLockedRef.current = false;
  }, []);

  const { remainingSeconds, timerPercentage, questionStartTimeRef } = useQuizTimer({
    isPlaying,
    questionKey: activeQuestion ? `${currentQIndex}_${activeQuestion.kode}` : undefined,
    isAnswerLockedRef,
    onTimeOut: handleTimeOut,
    onQuestionReset: handleQuestionReset,
  });

  // Confetti & fanfare Solo result
  useEffect(() => {
    if (playMode === 'SOLO' && currentScreen === 'RESULT') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6'],
        });
      } catch {
        // ignore confetti failure
      }
      playFanfareSound();
    }
  }, [currentScreen, playMode]);

  // Confetti & Spreadsheet logging Multiplayer finish
  useEffect(() => {
    if (playMode === 'MULTIPLAYER' && mp.gameStatus === 'FINISHED') {
      if (!hasLoggedMpFinishRef.current) {
        hasLoggedMpFinishRef.current = true;
        const myRosterEntry =
          cachedMultiplayerRoster.find((p) => p.name === name.trim()) ||
          mp.players.find((p) => p.name === name.trim());
        const finalMpScore = myRosterEntry ? Math.max(myRosterEntry.score, score) : score;
        const totalQ = currentQuestions.length || 10;

        sendResultToSpreadsheet({
          name,
          institution,
          phone,
          mode: mp.isHost ? 'Kelompok (Host)' : 'Kelompok (Peserta)',
          topic: mp.topicTitle || '-',
          score: finalMpScore,
          correct: correctAnswersCount,
          totalQuestions: totalQ,
          detail: `Selesai Room PIN ${mp.roomCode || '-'} (${correctAnswersCount}/${totalQ} benar)`,
        });
      }

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6'],
        });
      } catch {
        // ignore confetti failure
      }
      playFanfareSound();
    }
  }, [
    playMode,
    mp.gameStatus,
    mp.isHost,
    mp.topicTitle,
    mp.roomCode,
    mp.players,
    currentQuestions.length,
    cachedMultiplayerRoster,
    name,
    institution,
    phone,
    score,
    correctAnswersCount,
  ]);

  const validateForm = (requireToken: boolean) => {
    if (!name.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return false;
    }
    if (!institution.trim()) {
      setFormError('Asal instansi / sekolah wajib diisi.');
      return false;
    }
    if (!phone.trim()) {
      setFormError('Nomor WhatsApp wajib diisi.');
      return false;
    }
    if (requireToken && !sessionTokenInput.trim()) {
      setFormError('Token sesi wajib diisi. Minta token dari Admin.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleStartSolo = async () => {
    playClickSound();
    if (!validateForm(true)) return;

    setIsCheckingToken(true);
    try {
      const check = await checkSessionToken(sessionTokenInput.trim(), 'SOLO');
      if (!check.ok) {
        setFormError(check.error || 'Token sesi tidak valid.');
        return;
      }
      await syncTopicsFromServer();
      setCurrentScreen('CHOOSE_TOPIC');
    } catch {
      setFormError('Gagal memverifikasi token sesi ke server.');
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handleProceedCreateRoom = async () => {
    playClickSound();
    if (!validateForm(true)) return;

    setIsCheckingToken(true);
    try {
      const check = await checkSessionToken(sessionTokenInput.trim(), 'MULTIPLAYER');
      if (!check.ok) {
        setFormError(check.error || 'Token sesi tidak valid.');
        return;
      }
      await syncTopicsFromServer();
      setCurrentScreen('CHOOSE_TOPIC');
    } catch {
      setFormError('Gagal memverifikasi token sesi ke server.');
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handleCreateRoom = (topicId: number) => {
    playClickSound();
    if (!validateForm(true)) return;
    setCachedMultiplayerRoster([]);
    hasLoggedMpFinishRef.current = false;
    mp.clearError();
    mp.createRoom(
      name.trim(),
      institution.trim(),
      topicId,
      sessionTokenInput.trim().toUpperCase()
    );
  };

  const handleJoinRoom = () => {
    playClickSound();
    if (!validateForm(false)) return;
    if (!joinPinInput.trim() || joinPinInput.trim().length !== 4) {
      setFormError('Masukkan 4 digit PIN Room.');
      return;
    }
    setCachedMultiplayerRoster([]);
    hasLoggedMpFinishRef.current = false;
    mp.clearError();
    mp.joinRoom(joinPinInput.trim(), name.trim(), institution.trim());
  };

  const handleSelectSoloTopic = async (topic: TopicPackage) => {
    playClickSound();
    setIsCheckingToken(true);
    try {
      const consumed = await consumeSoloToken({
        token: sessionTokenInput.trim(),
        name: name.trim(),
        institution: institution.trim(),
      });
      if (!consumed.ok) {
        setFormError(consumed.error || 'Token sesi sudah terpakai atau tidak valid.');
        setCurrentScreen('REGISTRATION');
        return;
      }

      setSelectedTopic(topic);
      hasLoggedSoloFinishRef.current = false;

      const prepared = prepareTeacherQuiz(topic.soal);
      setSoloQuestions(prepared);
      setSoloQuestionIndex(0);
      setScore(0);
      setCorrectAnswersCount(0);
      setSelectedOption(null);
      setIsAnswerLocked(false);
      isAnswerLockedRef.current = false;

      setCurrentScreen('QUIZ');
    } catch {
      setFormError('Gagal memulai sesi dengan token.');
      setCurrentScreen('REGISTRATION');
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handleAnswerClick = (optionText: string) => {
    if (isAnswerLocked || isAnswerLockedRef.current || !activeQuestion) return;

    const timeTaken = Date.now() - questionStartTimeRef.current;
    isAnswerLockedRef.current = true;
    setIsAnswerLocked(true);
    setSelectedOption(optionText);

    const isCorrect = optionText === activeQuestion.correctAnswerText;

    let updatedScore = score;
    let updatedCorrect = correctAnswersCount;

    if (isCorrect) {
      playCorrectSound();
      updatedScore = score + 10;
      updatedCorrect = correctAnswersCount + 1;
      setScore(updatedScore);
      setCorrectAnswersCount(updatedCorrect);
    } else {
      playWrongSound();
    }

    if (playMode === 'SOLO') {
      setTimeout(() => {
        moveToNextSoloQuestion(updatedScore, updatedCorrect);
      }, 1000);
    } else {
      mp.submitAnswer(currentQIndex, optionText, timeTaken);
    }
  };

  const handleResetToHome = () => {
    playClickSound();
    isAnswerLockedRef.current = false;
    hasLoggedSoloFinishRef.current = false;
    hasLoggedMpFinishRef.current = false;
    if (playMode === 'MULTIPLAYER') {
      mp.leaveRoom();
      setCachedMultiplayerRoster([]);
    }
    setName('');
    setInstitution('');
    setPhone('');
    setSessionTokenInput('');
    setFormError('');
    setSelectedTopic(null);
    setSoloQuestions([]);
    setRandomizedMpQuestions([]);
    setSoloQuestionIndex(0);
    setScore(0);
    setCorrectAnswersCount(0);
    setSelectedOption(null);
    setIsAnswerLocked(false);
    setJoinPinInput('');
    setCurrentScreen('REGISTRATION');
  };

  const handleCopyPin = (code: string) => {
    playClickSound();
    navigator.clipboard?.writeText(code);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const liveMultiplayerLeaderboard =
    cachedMultiplayerRoster.length > 0 ? cachedMultiplayerRoster : mp.players;

  const myLiveServerEntry =
    playMode === 'MULTIPLAYER'
      ? liveMultiplayerLeaderboard.find(
          (p) => (mp.playerId && p.id === mp.playerId) || (name.trim() && p.name.trim() === name.trim())
        )
      : undefined;

  const effectiveScore =
    playMode === 'MULTIPLAYER' ? Math.max(score, myLiveServerEntry?.score ?? 0) : score;

  const finalLeaderboardDisplay = (() => {
    const rawList =
      cachedMultiplayerRoster.length > 0
        ? cachedMultiplayerRoster
        : mp.finalLeaderboard && mp.finalLeaderboard.length > 0
        ? mp.finalLeaderboard
        : mp.players;

    if (!name.trim()) return rawList;

    const existingIndex = rawList.findIndex(
      (p) => (mp.playerId && p.id === mp.playerId) || p.name.trim() === name.trim()
    );
    if (existingIndex >= 0) {
      const copy = [...rawList];
      if (effectiveScore > copy[existingIndex].score) {
        copy[existingIndex] = { ...copy[existingIndex], score: effectiveScore };
      }
      return copy.sort((a, b) => b.score - a.score);
    } else if (effectiveScore > 0 || mp.gameStatus === 'FINISHED') {
      return [
        {
          id: mp.playerId || 'local_current_user',
          name: name.trim(),
          institution: institution.trim() || '-',
          score: effectiveScore,
          correctCount: correctAnswersCount,
          hasAnsweredCurrent: true,
        },
        ...rawList,
      ].sort((a, b) => b.score - a.score);
    }

    return rawList;
  })();

  return {
    playMode,
    setPlayMode,
    multiplayerAction,
    setMultiplayerAction,
    joinPinInput,
    setJoinPinInput,
    copiedPin,
    mp,
    currentScreen,
    setCurrentScreen,
    liveTopics,
    topicSource,
    topicWarning,
    applyUpdatedTopics,
    name,
    setName,
    institution,
    setInstitution,
    phone,
    setPhone,
    sessionTokenInput,
    setSessionTokenInput,
    isCheckingToken,
    formError,
    setFormError,
    soloQuestions,
    currentQIndex,
    currentQuestions,
    activeQuestion,
    isPlaying,
    selectedOption,
    isAnswerLocked,
    score: effectiveScore,
    correctAnswersCount,
    remainingSeconds,
    timerPercentage,
    liveMultiplayerLeaderboard,
    finalLeaderboardDisplay,
    handleStartSolo,
    handleProceedCreateRoom,
    handleCreateRoom,
    handleJoinRoom,
    handleSelectSoloTopic,
    handleAnswerClick,
    handleResetToHome,
    handleCopyPin,
  };
}
