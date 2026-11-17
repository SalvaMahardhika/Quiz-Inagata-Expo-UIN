/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useThemePreference } from './hooks/useThemePreference';
import { useAudioFullscreen } from './hooks/useAudioFullscreen';
import { useQuizSession } from './hooks/useQuizSession';
import { ThemeBackdrop } from './components/themes/ThemeBackdrop';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { AdminModal } from './components/modals/AdminModal';
import { TopBar } from './components/layout/TopBar';
import { FooterBar } from './components/layout/FooterBar';
import { RegistrationScreen } from './components/screens/RegistrationScreen';
import { TopicSelectionScreen } from './components/screens/TopicSelectionScreen';
import { MultiplayerLobbyScreen } from './components/screens/MultiplayerLobbyScreen';
import { QuizPlayScreen } from './components/screens/QuizPlayScreen';
import { ResultScreen } from './components/screens/ResultScreen';

export default function App() {
  const {
    themeId,
    currentTheme,
    isThemeModalOpen,
    setIsThemeModalOpen,
    selectTheme,
  } = useThemePreference();

  const { isMuted, isFullscreen, toggleMute, toggleFullscreen } = useAudioFullscreen();
  const quiz = useQuizSession();

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const showHomeActions = quiz.currentScreen === 'REGISTRATION' && quiz.mp.gameStatus === 'IDLE';

  return (
    <div
      className={`relative w-full h-dvh max-h-dvh overflow-hidden bg-gradient-to-b ${currentTheme.bgGradient} flex flex-col font-display ${
        currentTheme.isDark ? 'text-white' : 'text-slate-900'
      } transition-colors duration-300`}
    >
      <ThemeBackdrop themeId={themeId} />

      <TopBar
        theme={currentTheme}
        playMode={quiz.playMode}
        roomCode={quiz.mp.roomCode}
        isPlaying={quiz.isPlaying}
        currentQIndex={quiz.currentQIndex}
        totalQuestions={quiz.currentQuestions.length}
        showHomeActions={showHomeActions}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenLeaderboardModal={() => setIsLeaderboardOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
      />

      <main className="relative z-10 flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y px-3 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="min-h-full w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
          {quiz.isPlaying && quiz.activeQuestion ? (
            <QuizPlayScreen
              theme={currentTheme}
              playMode={quiz.playMode}
              question={quiz.activeQuestion}
              score={quiz.score}
              remainingSeconds={quiz.remainingSeconds}
              timerPercentage={quiz.timerPercentage}
              selectedOption={quiz.selectedOption}
              isAnswerLocked={quiz.isAnswerLocked}
              liveMultiplayerLeaderboard={quiz.liveMultiplayerLeaderboard}
              currentPlayerName={quiz.name}
              onSelectOption={quiz.handleAnswerClick}
            />
          ) : quiz.playMode === 'MULTIPLAYER' &&
            quiz.mp.gameStatus === 'PLAYING' &&
            !quiz.activeQuestion ? (
            <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl text-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">Memuat soal multiplayer...</p>
            </div>
          ) : quiz.playMode === 'MULTIPLAYER' && quiz.mp.gameStatus === 'LOBBY' ? (
            <MultiplayerLobbyScreen
              roomCode={quiz.mp.roomCode}
              topicTitle={quiz.mp.topicTitle}
              players={quiz.mp.players}
              isHost={quiz.mp.isHost}
              copiedPin={quiz.copiedPin}
              onCopyPin={quiz.handleCopyPin}
              onStartGame={quiz.mp.startRoomGame}
              onLeaveRoom={quiz.handleResetToHome}
            />
          ) : quiz.currentScreen === 'REGISTRATION' && quiz.mp.gameStatus === 'IDLE' ? (
            <RegistrationScreen
              theme={currentTheme}
              playMode={quiz.playMode}
              onChangePlayMode={quiz.setPlayMode}
              multiplayerAction={quiz.multiplayerAction}
              onChangeMultiplayerAction={quiz.setMultiplayerAction}
              name={quiz.name}
              onChangeName={quiz.setName}
              institution={quiz.institution}
              onChangeInstitution={quiz.setInstitution}
              phone={quiz.phone}
              onChangePhone={quiz.setPhone}
              sessionTokenInput={quiz.sessionTokenInput}
              onChangeSessionToken={quiz.setSessionTokenInput}
              joinPinInput={quiz.joinPinInput}
              onChangeJoinPin={quiz.setJoinPinInput}
              formError={quiz.formError}
              mpError={quiz.mp.errorMessage}
              clearErrors={() => {
                if (quiz.formError) quiz.setFormError('');
                if (quiz.mp.errorMessage) quiz.mp.clearError();
              }}
              isCheckingToken={quiz.isCheckingToken}
              onStartSolo={quiz.handleStartSolo}
              onProceedCreateRoom={quiz.handleProceedCreateRoom}
              onJoinRoom={quiz.handleJoinRoom}
            />
          ) : quiz.currentScreen === 'CHOOSE_TOPIC' ? (
            <TopicSelectionScreen
              theme={currentTheme}
              playMode={quiz.playMode}
              name={quiz.name}
              institution={quiz.institution}
              topics={quiz.liveTopics}
              topicSource={quiz.topicSource}
              topicWarning={quiz.topicWarning}
              isBusy={quiz.isCheckingToken}
              errorMessage={quiz.formError || quiz.mp.errorMessage}
              onBack={() => {
                quiz.mp.clearError();
                quiz.setCurrentScreen('REGISTRATION');
              }}
              onSelectTopic={(topic) => {
                if (quiz.playMode === 'MULTIPLAYER') {
                  quiz.handleCreateRoom(topic.id);
                } else {
                  quiz.handleSelectSoloTopic(topic);
                }
              }}
            />
          ) : (quiz.playMode === 'SOLO' && quiz.currentScreen === 'RESULT') ||
            (quiz.playMode === 'MULTIPLAYER' && quiz.mp.gameStatus === 'FINISHED') ? (
            <ResultScreen
              playMode={quiz.playMode}
              theme={currentTheme}
              name={quiz.name}
              institution={quiz.institution}
              score={quiz.score}
              correctCount={quiz.correctAnswersCount}
              totalQuestions={quiz.soloQuestions.length}
              topicTitle={quiz.mp.topicTitle}
              finalLeaderboard={quiz.finalLeaderboardDisplay}
              onFinish={quiz.handleResetToHome}
            />
          ) : null}
        </div>
      </main>

      <FooterBar theme={currentTheme} />

      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onTopicsUpdated={quiz.applyUpdatedTopics}
      />
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={themeId}
        onSelectTheme={selectTheme}
      />
    </div>
  );
}