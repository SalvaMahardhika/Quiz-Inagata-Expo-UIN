import React from 'react';
import { ThemeConfig } from '../../types/theme';
import { PlayMode } from '../../hooks/useQuizSession';
import { MultiPlayerItem } from '../../utils/useMultiplayer';
import { SoloResultCard } from '../result/SoloResultCard';
import { MultiplayerPodium } from '../result/MultiplayerPodium';

interface ResultScreenProps {
  playMode: PlayMode;
  theme: ThemeConfig;
  name: string;
  institution: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  topicTitle: string;
  finalLeaderboard: MultiPlayerItem[];
  onFinish: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  playMode,
  theme,
  name,
  institution,
  score,
  correctCount,
  totalQuestions,
  topicTitle,
  finalLeaderboard,
  onFinish,
}) => {
  if (playMode === 'SOLO') {
    return (
      <SoloResultCard
        name={name}
        institution={institution}
        score={score}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
        theme={theme}
        onFinish={onFinish}
      />
    );
  }

  return (
    <MultiplayerPodium
      topicTitle={topicTitle}
      leaderboard={finalLeaderboard}
      currentPlayerName={name}
      currentScore={score}
      theme={theme}
      onFinish={onFinish}
    />
  );
};
