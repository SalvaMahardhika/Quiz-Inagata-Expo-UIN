/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  BANK_SOAL,
  TopicPackage,
} from './data/bankSoal';
import {
  prepareTeacherQuiz,
  PreparedTeacherQuestion,
} from './utils/shuffle';
import {
  playCorrectSound,
  playWrongSound,
  playClickSound,
  playFanfareSound,
  playTickSound,
  getIsMuted,
  toggleMuted,
} from './utils/audio';
import {
  saveTeacherQuizRecord,
} from './utils/storage';
import { useMultiplayer, MultiPlayerItem } from './utils/useMultiplayer';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AdminModal } from './components/AdminModal';
import { THEMES, ThemeId, getRandomTheme } from './types/theme';
import { ThemeBackdrop } from './components/themes/ThemeBackdrop';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Check,
  X,
  Trophy,
  Users,
  User,
  Crown,
  Play,
  LogOut,
  Copy,
  CheckCheck,
  Palette,
} from 'lucide-react';

type ScreenState = 'REGISTRATION' | 'CHOOSE_TOPIC' | 'QUIZ' | 'RESULT';
type PlayMode = 'SOLO' | 'MULTIPLAYER';

const QUESTION_DURATION_SEC = 10; // Batas waktu 10 detik per soal

export default function App() {
  // Flag apakah peserta sudah secara spesifik memilih tema manual lewat modal
  const hasUserSelectedThemeManually = useRef(false);

  // Visual Theme (Oasis, Atlantis, Tundra, Galaxy, Jungle, Mountain)
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    return getRandomTheme();
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const handleSelectTheme = (newTheme: ThemeId) => {
    hasUserSelectedThemeManually.current = true;
    setThemeId(newTheme);
    try {
      localStorage.setItem('QUIZ_INAGATA_THEME', newTheme);
    } catch {}
  };

  const currentTheme = THEMES[themeId] || THEMES.desert;

  // Mode Permainan
  const [playMode, setPlayMode] = useState<PlayMode>('SOLO');
  const [multiplayerAction, setMultiplayerAction] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [joinPinInput, setJoinPinInput] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);

  // Hook Multiplayer Real-Time WebSocket
  const mp = useMultiplayer();

  // Cache daftar peserta multiplayer agar nama/skor user yang logout tetap bertahan di layar peserta lain
  const [cachedMultiplayerRoster, setCachedMultiplayerRoster] = useState<MultiPlayerItem[]>([]);

  // Navigation
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('REGISTRATION');

  // Form Registrasi
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');

  // Topik Terpilih & Soal Solo
  const [selectedTopic, setSelectedTopic] = useState<TopicPackage | null>(null);
  const [soloQuestions, setSoloQuestions] = useState<PreparedTeacherQuestion[]>([]);
  const [soloQuestionIndex, setSoloQuestionIndex] = useState(0);

  // Status Kuis & Jawaban Peserta
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const isAnswerLockedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // Timer 10 Detik Per Peserta
  const [timeRemainingMs, setTimeRemainingMs] = useState(QUESTION_DURATION_SEC * 1000);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Modals & Kontrol
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMuted, setIsMutedState] = useState(getIsMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsMutedState(getIsMuted());
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Sinkronisasi roster multiplayer agar user yang logout saat PLAYING/FINISHED tidak hilang dari papan peringkat sementara
  useEffect(() => {
    if (playMode !== 'MULTIPLAYER') return;

    if (mp.gameStatus === 'IDLE') {
      setCachedMultiplayerRoster([]);
      return;
    }

    if (mp.gameStatus === 'LOBBY') {
      setCachedMultiplayerRoster(mp.players);
      return;
    }

    const incomingList =
      mp.gameStatus === 'FINISHED' && mp.finalLeaderboard && mp.finalLeaderboard.length > 0
        ? mp.finalLeaderboard
        : mp.players;

    if (incomingList.length > 0) {
      setCachedMultiplayerRoster((prev) => {
        const mergedMap = new Map<string, MultiPlayerItem>();
        // Pertahankan data pemain sebelumnya
        prev.forEach((p) => mergedMap.set(p.id, p));
        // Perbarui dengan skor/data terbaru dari server
        incomingList.forEach((p) => mergedMap.set(p.id, p));
        return Array.from(mergedMap.values()).sort((a, b) => b.score - a.score);
      });
    }
  }, [playMode, mp.gameStatus, mp.players, mp.finalLeaderboard]);

  const handleToggleFullscreen = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleMute = () => {
    const next = toggleMuted();
    setIsMutedState(next);
    if (!next) {
      playClickSound();
    }
  };

  // Determine current active question
  const currentQIndex = playMode === 'MULTIPLAYER' ? mp.currentQuestionIndex : soloQuestionIndex;
  const currentQuestions = playMode === 'MULTIPLAYER' ? mp.questions : soloQuestions;
  const activeQuestion = currentQuestions[currentQIndex];
  const isPlaying = playMode === 'MULTIPLAYER' ? mp.gameStatus === 'PLAYING' : currentScreen === 'QUIZ';

  // Solo next question helper (Hanya mode SOLO yang menyimpan ke Leaderboard Global)
  const moveToNextSoloQuestion = useCallback(
    (latestScore = score, latestCorrect = correctAnswersCount) => {
      const nextIndex = soloQuestionIndex + 1;
      if (nextIndex < soloQuestions.length) {
        setSoloQuestionIndex(nextIndex);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        isAnswerLockedRef.current = false;
      } else {
        if (selectedTopic) {
          saveTeacherQuizRecord({
            name: name.trim(),
            institution: institution.trim(),
            phone: phone.trim(),
            topicId: selectedTopic.id,
            topicName: `${selectedTopic.nama}: ${selectedTopic.judul}`,
            score: latestScore,
            totalQuestions: soloQuestions.length,
            correctCount: latestCorrect,
            timedOutCount: soloQuestions.length - latestCorrect,
          });
        }
        setCurrentScreen('RESULT');
      }
    },
    [soloQuestionIndex, soloQuestions.length, selectedTopic, name, institution, phone, score, correctAnswersCount]
  );

  // Stable timeout ref for per-participant countdown
  const handleTimeOutRef = useRef<() => void>(() => {});
  useEffect(() => {
    handleTimeOutRef.current = () => {
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
    };
  }, [playMode, moveToNextSoloQuestion, mp, currentQIndex]);

  // ============================================================
  // PER-PARTICIPANT COUNTDOWN TIMER
  // ============================================================
  useEffect(() => {
    if (!isPlaying || !activeQuestion) {
      setTimeRemainingMs(QUESTION_DURATION_SEC * 1000);
      return;
    }

    setSelectedOption(null);
    setIsAnswerLocked(false);
    isAnswerLockedRef.current = false;
    setTimeRemainingMs(QUESTION_DURATION_SEC * 1000);
    questionStartTimeRef.current = Date.now();

    const totalMs = QUESTION_DURATION_SEC * 1000;
    const startTime = Date.now();
    let lastTick = QUESTION_DURATION_SEC;

    const interval = setInterval(() => {
      if (isAnswerLockedRef.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalMs - elapsed);
      setTimeRemainingMs(remaining);

      const currentSec = Math.ceil(remaining / 1000);
      if (currentSec <= 2 && currentSec > 0 && currentSec !== lastTick) {
        lastTick = currentSec;
        playTickSound();
      }

      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeOutRef.current();
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, currentQIndex, activeQuestion?.kode]);

  // Confetti & fanfare pada layar hasil Solo (tanpa auto-reset timer)
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
        // ignore
      }
      playFanfareSound();
    }
  }, [currentScreen, playMode]);

  // Confetti saat multiplayer game over
  useEffect(() => {
    if (playMode === 'MULTIPLAYER' && mp.gameStatus === 'FINISHED') {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6'],
        });
      } catch {
        // ignore
      }
      playFanfareSound();
    }
  }, [playMode, mp.gameStatus]);

  // ============================================================
  // REGISTRATION & GAMEPLAY HANDLERS
  // ============================================================
  const validateForm = () => {
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
    setFormError('');
    return true;
  };

  const handleStartSolo = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!validateForm()) return;
    if (!hasUserSelectedThemeManually.current) {
      setThemeId(getRandomTheme());
    }
    setCurrentScreen('CHOOSE_TOPIC');
  };

  const handleCreateRoom = (topicId: number) => {
    playClickSound();
    if (!validateForm()) return;
    if (!hasUserSelectedThemeManually.current) {
      setThemeId(getRandomTheme());
    }
    setCachedMultiplayerRoster([]);
    mp.createRoom(name.trim(), institution.trim(), topicId);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!validateForm()) return;
    if (!joinPinInput.trim() || joinPinInput.trim().length !== 4) {
      setFormError('Masukkan 4 digit PIN Room.');
      return;
    }
    if (!hasUserSelectedThemeManually.current) {
      setThemeId(getRandomTheme());
    }
    setCachedMultiplayerRoster([]);
    mp.joinRoom(joinPinInput.trim(), name.trim(), institution.trim());
  };

  const handleSelectSoloTopic = (topic: TopicPackage) => {
    playClickSound();
    setSelectedTopic(topic);

    const prepared = prepareTeacherQuiz(topic.soal);
    setSoloQuestions(prepared);
    setSoloQuestionIndex(0);
    setScore(0);
    setCorrectAnswersCount(0);
    setSelectedOption(null);
    setIsAnswerLocked(false);
    isAnswerLockedRef.current = false;

    setCurrentScreen('QUIZ');
  };

  const handleAnswerClick = (optionText: string) => {
    if (isAnswerLocked || isAnswerLockedRef.current || !activeQuestion) return;

    const timeTaken = Date.now() - questionStartTimeRef.current;
    isAnswerLockedRef.current = true;
    setIsAnswerLocked(true);
    setSelectedOption(optionText);

    const isCorrect = optionText === activeQuestion.correctAnswerText;

    if (isCorrect) {
      playCorrectSound();
      setScore((prev) => prev + 10);
      setCorrectAnswersCount((prev) => prev + 1);
    } else {
      playWrongSound();
    }

    if (playMode === 'SOLO') {
      setTimeout(() => {
        moveToNextSoloQuestion(isCorrect ? score + 10 : score, isCorrect ? correctAnswersCount + 1 : correctAnswersCount);
      }, 1000);
    } else {
      mp.submitAnswer(currentQIndex, optionText, timeTaken);
    }
  };

  const handleResetToHome = () => {
    playClickSound();
    isAnswerLockedRef.current = false;
    if (playMode === 'MULTIPLAYER') {
      mp.leaveRoom();
      setCachedMultiplayerRoster([]);
    }
    setName('');
    setInstitution('');
    setPhone('');
    setSelectedTopic(null);
    setSoloQuestions([]);
    setSoloQuestionIndex(0);
    setScore(0);
    setCorrectAnswersCount(0);
    setSelectedOption(null);
    setIsAnswerLocked(false);
    setJoinPinInput('');
    if (!hasUserSelectedThemeManually.current) {
      setThemeId(getRandomTheme());
    }
    setCurrentScreen('REGISTRATION');
  };

  const handleCopyPin = (code: string) => {
    playClickSound();
    navigator.clipboard?.writeText(code);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const remainingSeconds = Math.ceil(timeRemainingMs / 1000);
  const timerPercentage = Math.max(0, Math.min(100, (timeRemainingMs / (QUESTION_DURATION_SEC * 1000)) * 100));

  // Daftar peserta temporary multiplayer yang tetap menyimpan user meskipun sudah logout
  const liveMultiplayerLeaderboard =
    cachedMultiplayerRoster.length > 0 ? cachedMultiplayerRoster : mp.players;

  const finalLeaderboardDisplay =
    cachedMultiplayerRoster.length > 0
      ? cachedMultiplayerRoster
      : mp.finalLeaderboard && mp.finalLeaderboard.length > 0
      ? mp.finalLeaderboard
      : mp.players;

  return (
    <div className={`relative w-full min-h-dvh lg:h-dvh overflow-x-hidden lg:overflow-hidden bg-gradient-to-b ${currentTheme.bgGradient} flex flex-col justify-between font-display ${currentTheme.isDark ? 'text-white' : 'text-slate-900'} select-none transition-colors duration-300`}>
      {/* Dynamic Animated Backdrop based on Active Theme */}
      <ThemeBackdrop themeId={themeId} />

      {/* Top Bar */}
      <header className={`relative z-20 w-full px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 border-b ${currentTheme.headerBorder} ${currentTheme.headerBg} shrink-0 shadow-xs transition-colors duration-300`}>
        {/* Left: Brand title ONLY (tanpa placeholder logo & emoji) */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-base sm:text-lg font-extrabold tracking-tight truncate ${currentTheme.isDark ? 'text-white' : 'text-slate-900'}`}>
            Quiz Inagata
          </span>

          {playMode === 'MULTIPLAYER' && mp.roomCode && (
            <div className={`flex items-center gap-1.5 text-[11px] sm:text-xs font-bold ${currentTheme.badgeBg} ${currentTheme.badgeText} px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border ${currentTheme.badgeBorder} shrink-0`}>
              <Users className="w-3.5 h-3.5" />
              <span>PIN: {mp.roomCode}</span>
            </div>
          )}
        </div>

        {/* Zone 2: Progress indicator */}
        {isPlaying ? (
          <div className={`px-2.5 sm:px-3 py-1 ${currentTheme.badgeBg} border ${currentTheme.badgeBorder} rounded-full text-xs font-bold ${currentTheme.badgeText} tabular-nums shadow-xs shrink-0`}>
            {currentQIndex + 1} / {currentQuestions.length}
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Theme Switcher Button */}
          <button
            onClick={() => {
              playClickSound();
              setIsThemeModalOpen(true);
            }}
            className={`btn-kahoot px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg border-b-2 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTheme.isDark
                ? 'text-white bg-slate-800/90 hover:bg-slate-700 border-slate-600'
                : 'text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-300'
            }`}
            title="Ganti Tema"
          >
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Tema: {currentTheme.name}</span>
          </button>

          {currentScreen === 'REGISTRATION' && mp.gameStatus === 'IDLE' && (
            <>
              {/* Papan Skor Global HANYA muncul di Mode Solo */}
              {playMode === 'SOLO' && (
                <button
                  onClick={() => {
                    playClickSound();
                    setIsLeaderboardOpen(true);
                  }}
                  className="btn-kahoot px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border-b-2 border-amber-400 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-800" />
                  <span className="hidden xs:inline sm:inline">Papan Skor</span>
                </button>
              )}
              <button
                onClick={() => {
                  playClickSound();
                  setIsAdminModalOpen(true);
                }}
                className="btn-kahoot px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-b-2 border-slate-300 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Admin
              </button>
            </>
          )}

          <button
            onClick={handleToggleMute}
            className="p-1.5 text-slate-700 bg-white/80 hover:bg-white border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            aria-label={isMuted ? 'Nyalakan suara' : 'Bisukan suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="hidden sm:inline-flex p-1.5 text-slate-700 bg-white/80 hover:bg-white border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Viewport Container (Responsif untuk HP, Tablet, Laptop, dan Monitor) */}
      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-3 sm:px-5 py-3 sm:py-4 flex flex-col justify-center items-center overflow-y-auto">
        {/* ============================================================ */}
        {/* LAYAR 1: REGISTRASI & MODE SWITCHER                          */}
        {/* ============================================================ */}
        {currentScreen === 'REGISTRATION' && mp.gameStatus === 'IDLE' && (
          <div className={`w-full max-w-md ${currentTheme.cardBg} rounded-2xl p-5 sm:p-6 shadow-xl border-2 ${currentTheme.cardBorder} my-auto animate-pop`}>
            {/* Mode Switcher Tabs */}
            <div className={`grid grid-cols-2 p-1 ${currentTheme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-100/70 border-amber-200'} rounded-xl mb-4 border`}>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPlayMode('SOLO');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  playMode === 'SOLO'
                    ? currentTheme.isDark ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-slate-950 shadow-xs'
                    : currentTheme.isDark ? 'text-slate-400 hover:text-white' : 'text-amber-900 hover:text-slate-950'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Mode Solo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPlayMode('MULTIPLAYER');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  playMode === 'MULTIPLAYER'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold'
                    : currentTheme.isDark ? 'text-slate-400 hover:text-white' : 'text-amber-900 hover:text-slate-950'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Bermain Bersama</span>
              </button>
            </div>

            <div className="mb-4">
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${currentTheme.isDark ? 'text-white' : 'text-slate-900'}`}>
                {playMode === 'SOLO' ? 'Registrasi Peserta' : 'Bermain Bersama'}
              </h2>
              <p className={`text-xs mt-0.5 ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {playMode === 'SOLO'
                  ? 'Lengkapi data untuk memulai kuis (masuk Papan Skor Global)'
                  : 'Bermain bersama di topik yang sama minimal 2 orang'}
              </p>
            </div>

            {(formError || mp.errorMessage) && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-shake">
                {formError || mp.errorMessage}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${currentTheme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Nama lengkap atau panggilan"
                  className={`w-full h-10 sm:h-11 px-3.5 ${
                    currentTheme.isDark
                      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:bg-slate-800'
                      : 'bg-slate-50 border-amber-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                  } border rounded-xl text-sm font-medium outline-none transition-all shadow-inner`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${currentTheme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Asal Instansi
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => {
                    setInstitution(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Nama instansi atau organisasi"
                  className={`w-full h-10 sm:h-11 px-3.5 ${
                    currentTheme.isDark
                      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:bg-slate-800'
                      : 'bg-slate-50 border-amber-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                  } border rounded-xl text-sm font-medium outline-none transition-all shadow-inner`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${currentTheme.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="08xxxxxxxxxx"
                  className={`w-full h-10 sm:h-11 px-3.5 ${
                    currentTheme.isDark
                      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:bg-slate-800'
                      : 'bg-slate-50 border-amber-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white'
                  } border rounded-xl text-sm font-medium outline-none transition-all shadow-inner`}
                />
              </div>

              {playMode === 'SOLO' ? (
                <button
                  type="button"
                  onClick={handleStartSolo}
                  className={`btn-kahoot w-full h-11 mt-2 ${currentTheme.primaryButtonBg} font-extrabold rounded-xl text-xs border-b-4 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <span>PILIH TOPIK</span>
                  <span>→</span>
                </button>
              ) : (
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMultiplayerAction('CREATE')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        multiplayerAction === 'CREATE'
                          ? 'bg-amber-100 border-amber-400 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Buat Room Baru
                    </button>
                    <button
                      type="button"
                      onClick={() => setMultiplayerAction('JOIN')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        multiplayerAction === 'JOIN'
                          ? 'bg-amber-100 border-amber-400 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Gabung Room
                    </button>
                  </div>

                  {multiplayerAction === 'CREATE' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (validateForm()) {
                          setCurrentScreen('CHOOSE_TOPIC');
                        }
                      }}
                      className="btn-kahoot w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold rounded-xl text-xs border-b-4 border-emerald-800 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>PILIH TOPIK & BUAT PIN ROOM</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div className="flex flex-col xs:flex-row gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={joinPinInput}
                        onChange={(e) => setJoinPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="4 Digit PIN"
                        className="w-full xs:w-2/5 h-11 text-center font-mono text-base font-black tracking-widest bg-slate-50 text-slate-900 border-2 border-amber-200 focus:border-amber-500 rounded-xl outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleJoinRoom}
                        className="btn-kahoot flex-1 h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs border-b-4 border-amber-700 shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>GABUNG ROOM</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* LAYAR 2: PILIH TOPIK (LAYOUT GRID 2 x 2 RAPIH)               */}
        {/* ============================================================ */}
        {currentScreen === 'CHOOSE_TOPIC' && (
          <div className="w-full max-w-2xl mx-auto lg:h-full flex flex-col justify-between py-1 sm:py-2 my-auto">
            <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b ${currentTheme.headerBorder} shrink-0`}>
              <button
                onClick={() => {
                  playClickSound();
                  setCurrentScreen('REGISTRATION');
                }}
                className={`btn-kahoot inline-flex items-center gap-1.5 px-3 py-1.5 ${
                  currentTheme.isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-b-2 border-slate-600'
                    : 'bg-white/90 hover:bg-white text-slate-700 border-b-2 border-slate-300'
                } rounded-lg text-xs font-bold shadow-xs cursor-pointer`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <div className={`text-right text-xs ${currentTheme.isDark ? 'text-slate-300' : 'text-slate-600'} truncate max-w-[70%]`}>
                <span className={`font-bold ${currentTheme.isDark ? 'text-white' : 'text-slate-900'}`}>{name}</span> ·{' '}
                {playMode === 'MULTIPLAYER' ? 'Buat Room Bersama' : institution}
              </div>
            </div>

            {/* Grid 2-2 yang rapi untuk semua topik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-4 lg:my-auto py-1">
              {Object.values(BANK_SOAL).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    if (playMode === 'MULTIPLAYER') {
                      handleCreateRoom(topic.id);
                    } else {
                      handleSelectSoloTopic(topic);
                    }
                  }}
                  className={`btn-kahoot group p-4 sm:p-5 ${
                    currentTheme.isDark
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700 hover:border-amber-400 border-b-slate-800 hover:border-b-amber-500'
                      : 'bg-white/95 hover:bg-amber-50/90 text-slate-900 border-amber-200/90 hover:border-amber-400 border-b-amber-300 hover:border-b-amber-500'
                  } rounded-2xl border-2 border-b-4 shadow-sm text-left flex flex-col justify-between min-h-[7rem] sm:min-h-[7.75rem] cursor-pointer transition-all`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`w-7 h-7 rounded-lg ${currentTheme.badgeBg} ${currentTheme.badgeText} font-mono text-xs font-bold flex items-center justify-center`}>
                      {String(topic.id).padStart(2, '0')}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      {topic.nama}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <h3 className={`text-sm sm:text-base font-bold ${currentTheme.isDark ? 'text-white' : 'text-slate-900'} leading-snug line-clamp-2`}>
                      {topic.judul}
                    </h3>
                    <p className={`text-xs ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'} line-clamp-2 mt-1`}>
                      {topic.deskripsi}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className={`text-center text-xs font-semibold ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'} shrink-0 pt-1`}>
              <span>
                {playMode === 'MULTIPLAYER'
                  ? 'Pilih topik untuk membuat Room Live dan mengacak 10 soal'
                  : 'Pilih satu topik untuk memulai 10 soal acak'}
              </span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* LAYAR MULTIPLAYER: LOBBY RUANG TUNGGU (MINIMAL 2 PESERTA)    */}
        {/* ============================================================ */}
        {playMode === 'MULTIPLAYER' && mp.gameStatus === 'LOBBY' && (
          <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-xl border-2 border-amber-200/90 my-auto text-center animate-pop text-slate-900">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              {mp.topicTitle}
            </span>

            {/* Room PIN Card */}
            <div className="my-3 p-3.5 sm:p-4 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-300 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-500 mb-0.5">PIN ROOM BERSAMA</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-5xl font-mono font-black tracking-widest text-slate-900">
                  {mp.roomCode}
                </span>
                <button
                  type="button"
                  onClick={() => mp.roomCode && handleCopyPin(mp.roomCode)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                  title="Salin PIN"
                >
                  {copiedPin ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Bagikan 4 digit PIN ini kepada peserta lain untuk bergabung
              </span>
            </div>

            {/* Players List */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 mb-2">
                <span>Peserta Terhubung ({mp.players.length})</span>
                <span className={mp.players.length >= 2 ? 'text-emerald-700' : 'text-amber-700'}>
                  {mp.players.length >= 2 ? '✓ Siap Bermain (Min. 2 Orang)' : 'Menunggu minimal 2 orang...'}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {mp.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{p.institution}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Tersambung
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Actions */}
            {mp.isHost ? (
              <button
                type="button"
                onClick={mp.startRoomGame}
                disabled={mp.players.length < 2}
                className="btn-kahoot w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm border-b-4 border-emerald-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>MULAI KUIS BERSAMA ({mp.players.length} Peserta)</span>
              </button>
            ) : (
              <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>Menunggu Host memulai kuis bersama...</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetToHome}
              className="mt-3 text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Room</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* LAYAR 3: KUIS (DENGAN COUNTDOWN AKTIF & OPSI FULL TEXT)      */}
        {/* ============================================================ */}
        {isPlaying && activeQuestion && (
          <div className="w-full lg:h-full flex flex-col justify-between max-w-4xl py-1 gap-2 sm:gap-3 my-auto">
            {/* Header: Timer Bar, Soal Index & Live Leaderboard Ticker */}
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1.5 px-0.5 tabular-nums">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className={`font-mono px-2 py-0.5 rounded border shrink-0 ${
                    currentTheme.isDark
                      ? 'text-cyan-300 bg-slate-800/90 border-slate-700'
                      : 'text-slate-600 bg-white/80 border-slate-200'
                  }`}>
                    {activeQuestion.kode}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded truncate ${
                    currentTheme.isDark ? 'bg-slate-800 text-amber-300' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {currentTheme.name}
                  </span>
                  {playMode === 'MULTIPLAYER' && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                      Live
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border shadow-xs ${currentTheme.badgeBg} ${currentTheme.badgeBorder} ${currentTheme.badgeText}`}>
                    {score} Poin
                  </span>

                  {/* Countdown Timer Badge */}
                  <span
                    className={`font-mono text-xs sm:text-sm font-black px-2 py-0.5 rounded-md transition-colors ${
                      remainingSeconds <= 2
                        ? 'bg-rose-500 text-white animate-bounce shadow'
                        : currentTheme.isDark
                        ? 'bg-slate-800/90 text-white border border-slate-700 shadow-xs'
                        : 'bg-white/90 text-slate-900 border border-slate-200 shadow-xs'
                    }`}
                  >
                    {remainingSeconds}s
                  </span>
                </div>
              </div>

              {/* Shimmering Animated Timer Bar */}
              <div className={`w-full h-2.5 ${currentTheme.isDark ? 'bg-slate-800/90' : 'bg-slate-200/80'} rounded-full overflow-hidden p-0.5 shadow-inner`}>
                <div
                  className={`h-full rounded-full transition-all duration-75 ease-linear ${
                    remainingSeconds <= 2
                      ? 'bg-rose-500 animate-pulse'
                      : remainingSeconds <= 4
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>

              {/* Multiplayer Temporary Live Leaderboard Ticker Bar (tetap menampilkan peserta yang sudah keluar) */}
              {playMode === 'MULTIPLAYER' && (
                <div className={`mt-1.5 px-3 py-1.5 ${
                  currentTheme.isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white/90 border-amber-200 text-slate-800'
                } backdrop-blur-xs rounded-xl border flex items-center justify-between gap-2 text-xs overflow-x-auto shadow-xs`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                    currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live Room:</span>
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    {liveMultiplayerLeaderboard.slice(0, 5).map((p, idx) => (
                      <span key={p.id} className={`flex items-center gap-1 font-bold ${currentTheme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        <span className="text-amber-500 font-mono">#{idx + 1}</span>
                        <span className="truncate max-w-[85px] sm:max-w-[110px]">{p.name}</span>
                        <span className="font-mono text-xs opacity-60">({p.score})</span>
                        {p.hasAnsweredCurrent && (
                          <span className="text-[10px] text-emerald-500 font-black">✓</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Question Card */}
            <div className={`${currentTheme.questionCardBg} ${currentTheme.questionCardBorder} rounded-2xl p-4 sm:p-6 border-2 shadow-lg my-auto flex flex-col justify-center min-h-[110px] sm:min-h-[140px] lg:max-h-[240px] overflow-y-auto`}>
              {activeQuestion.gambar && activeQuestion.gambar.trim() !== '' && (
                <div className="mb-2.5 flex justify-center">
                  <img
                    src={activeQuestion.gambar}
                    alt={`Soal ${activeQuestion.kode}`}
                    className="max-h-28 sm:max-h-36 object-contain rounded-xl border border-slate-200 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <p className={`text-sm sm:text-base md:text-lg font-bold leading-relaxed text-center ${
                currentTheme.isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {activeQuestion.pertanyaan}
              </p>
            </div>

            {/* Kahoot 4 Geometric Color Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 shrink-0 pt-1 pb-1">
              {activeQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === activeQuestion.correctAnswerText;

                const kahootConfigs = [
                  {
                    symbol: '▲',
                    baseBg: 'bg-rose-500 hover:bg-rose-400 border-rose-700 text-white',
                    symbolBg: 'bg-rose-700/60 text-white',
                  },
                  {
                    symbol: '◆',
                    baseBg: 'bg-sky-500 hover:bg-sky-400 border-sky-700 text-white',
                    symbolBg: 'bg-sky-700/60 text-white',
                  },
                  {
                    symbol: '●',
                    baseBg: 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-amber-950 font-bold',
                    symbolBg: 'bg-amber-600/40 text-amber-950',
                  },
                  {
                    symbol: '■',
                    baseBg: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white',
                    symbolBg: 'bg-emerald-700/60 text-white',
                  },
                ];

                const cfg = kahootConfigs[idx % 4];
                let buttonClass = cfg.baseBg;
                let animClass = '';

                if (isAnswerLocked) {
                  if (isCorrect) {
                    buttonClass = 'bg-emerald-500 border-emerald-700 text-white ring-4 ring-emerald-300';
                    animClass = 'animate-pop';
                  } else if (isSelected && !isCorrect) {
                    buttonClass = 'bg-rose-600 border-rose-800 text-white ring-4 ring-rose-300';
                    animClass = 'animate-shake';
                  } else {
                    buttonClass = 'bg-slate-300 border-slate-400 text-slate-500 opacity-40';
                  }
                }

                return (
                  <button
                    key={`${activeQuestion.kode}_opt_${idx}`}
                    onClick={() => handleAnswerClick(option)}
                    disabled={isAnswerLocked}
                    className={`btn-kahoot relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border-b-[5px] shadow-md text-left transition-all min-h-[56px] sm:min-h-[68px] h-auto cursor-pointer disabled:cursor-not-allowed ${buttonClass} ${animClass}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-inner ${cfg.symbolBg}`}
                      >
                        {cfg.symbol}
                      </span>
                      <span className="text-xs sm:text-sm font-bold leading-snug break-words whitespace-normal flex-1">
                        {option}
                      </span>
                    </div>

                    {isAnswerLocked && (
                      <span className="shrink-0 pl-2">
                        {isCorrect && <Check className="w-5 h-5 text-white animate-bounce" />}
                        {isSelected && !isCorrect && <X className="w-5 h-5 text-white" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* LAYAR 4A: HASIL KUIS SOLO (TANPA TIMER OTOMATIS KEMBALI)     */}
        {/* ============================================================ */}
        {playMode === 'SOLO' && currentScreen === 'RESULT' && (
          <div className={`w-full max-w-sm ${currentTheme.cardBg} rounded-2xl p-6 sm:p-7 border-2 ${currentTheme.cardBorder} text-center shadow-xl animate-pop my-auto`}>
            <h2 className={`text-lg sm:text-xl font-bold ${currentTheme.isDark ? 'text-white' : 'text-slate-900'}`}>Hasil Kuis Solo</h2>
            <p className={`text-xs ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
              {name} · {institution}
            </p>

            <div className={`my-5 p-4 ${currentTheme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-gradient-to-b from-amber-50 to-emerald-50 border-amber-200'} rounded-xl border`}>
              <div className="text-4xl sm:text-5xl font-black tabular-nums text-amber-500 tracking-tight">
                {score}
              </div>
              <div className={`text-xs font-bold ${currentTheme.isDark ? 'text-slate-300' : 'text-slate-600'} mt-1 tabular-nums`}>
                {correctAnswersCount} dari {soloQuestions.length} soal benar
              </div>
              <div className={`text-[11px] mt-1.5 ${currentTheme.isDark ? 'text-emerald-400' : 'text-emerald-700'} font-semibold`}>
                Skor tercatat di Papan Skor Global
              </div>
            </div>

            <button
              onClick={handleResetToHome}
              className={`btn-kahoot w-full h-12 ${currentTheme.primaryButtonBg} font-extrabold rounded-xl text-sm border-b-4 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer`}
            >
              <span>SELESAI</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* LAYAR 4B: PODIUM KEMENANGAN MULTIPLAYER (TEMPORARY ROOM)     */}
        {/* ============================================================ */}
        {playMode === 'MULTIPLAYER' && mp.gameStatus === 'FINISHED' && (
          <div className={`w-full max-w-md ${currentTheme.cardBg} rounded-2xl p-5 sm:p-6 border-2 ${currentTheme.cardBorder} shadow-xl my-auto animate-pop text-center`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${currentTheme.isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              {mp.topicTitle}
            </span>
            <h2 className={`text-lg sm:text-xl font-black ${currentTheme.isDark ? 'text-white' : 'text-slate-900'} mt-1 mb-4`}>
              Podium Juara Quiz Inagata
            </h2>

            {/* Kahoot 3-Step Podium (Tetap menyimpan peserta meski sudah logout) */}
            <div className="flex items-end justify-center gap-2 sm:gap-3 mb-5 px-1 sm:px-2 h-36">
              {/* Rank 2 (Silver) */}
              {finalLeaderboardDisplay[1] ? (
                <div className="flex-1 min-w-0 flex flex-col items-center">
                  <div className={`text-xs font-bold truncate w-full px-1 ${currentTheme.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {finalLeaderboardDisplay[1].name}
                  </div>
                  <div className={`text-[11px] font-mono font-bold ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {finalLeaderboardDisplay[1].score} pt
                  </div>
                  <div className={`w-full h-20 ${currentTheme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-300'} border-2 rounded-t-xl flex flex-col items-center justify-center shadow-xs mt-1`}>
                    <span className={`text-sm font-black ${currentTheme.isDark ? 'text-white' : 'text-slate-700'}`}>#2</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* Rank 1 (Gold) */}
              {finalLeaderboardDisplay[0] && (
                <div className="flex-1 min-w-0 flex flex-col items-center">
                  <div className="text-xs font-bold text-amber-400 truncate w-full px-1 flex items-center justify-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{finalLeaderboardDisplay[0].name}</span>
                  </div>
                  <div className="text-xs font-mono font-black text-amber-400">
                    {finalLeaderboardDisplay[0].score} pt
                  </div>
                  <div className="w-full h-28 bg-gradient-to-t from-amber-400 to-yellow-300 border-2 border-amber-400 rounded-t-xl flex flex-col items-center justify-center shadow-md mt-1 text-slate-950">
                    <span className="text-base font-black">#1</span>
                  </div>
                </div>
              )}

              {/* Rank 3 (Bronze) */}
              {finalLeaderboardDisplay[2] ? (
                <div className="flex-1 min-w-0 flex flex-col items-center">
                  <div className={`text-xs font-bold truncate w-full px-1 ${currentTheme.isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                    {finalLeaderboardDisplay[2].name}
                  </div>
                  <div className={`text-[11px] font-mono font-bold ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {finalLeaderboardDisplay[2].score} pt
                  </div>
                  <div className="w-full h-16 bg-amber-600/30 border-2 border-amber-600/40 rounded-t-xl flex flex-col items-center justify-center shadow-xs mt-1">
                    <span className="text-sm font-black text-amber-400">#3</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1" />
              )}
            </div>

            {/* Complete Rankings List */}
            <div className={`max-h-36 overflow-y-auto space-y-1 p-2 ${currentTheme.isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-xl border mb-4 text-left`}>
              {finalLeaderboardDisplay.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 p-2 ${currentTheme.isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} rounded-lg border text-xs`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                    <span className="font-bold truncate">{p.name}</span>
                    <span className={`text-[11px] ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-400'} truncate`}>({p.institution})</span>
                  </div>
                  <span className="font-mono font-black text-amber-500 tabular-nums shrink-0">
                    {p.score} pt
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleResetToHome}
              className="btn-kahoot w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs border-b-4 border-slate-950 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>KEMBALI KE MENU UTAMA</span>
            </button>
          </div>
        )}
      </main>

      {/* Global Footer */}
      <footer className={`relative z-20 w-full px-4 py-2 border-t ${currentTheme.footerBorder} ${currentTheme.footerBg} text-center shrink-0 transition-colors duration-300`}>
        <p className={`text-xs font-semibold ${currentTheme.footerText}`}>
          Quiz Inagata · Tema {currentTheme.name}
        </p>
      </footer>

      {/* Modals */}
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={themeId}
        onSelectTheme={handleSelectTheme}
      />
    </div>
  );
}