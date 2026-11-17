import { useState, useEffect, useRef } from 'react';
import { playTickSound } from '../utils/audio';

export const QUESTION_DURATION_SEC = 10;

interface UseQuizTimerParams {
  isPlaying: boolean;
  questionKey: string | number | undefined;
  isAnswerLockedRef: React.MutableRefObject<boolean>;
  onTimeOut: () => void;
  onQuestionReset: () => void;
}

export function useQuizTimer({
  isPlaying,
  questionKey,
  isAnswerLockedRef,
  onTimeOut,
  onQuestionReset,
}: UseQuizTimerParams) {
  const [timeRemainingMs, setTimeRemainingMs] = useState(QUESTION_DURATION_SEC * 1000);
  const questionStartTimeRef = useRef<number>(Date.now());
  const onTimeOutRef = useRef(onTimeOut);
  const onResetRef = useRef(onQuestionReset);

  useEffect(() => {
    onTimeOutRef.current = onTimeOut;
  }, [onTimeOut]);

  useEffect(() => {
    onResetRef.current = onQuestionReset;
  }, [onQuestionReset]);

  useEffect(() => {
    if (!isPlaying || !questionKey) {
      setTimeRemainingMs(QUESTION_DURATION_SEC * 1000);
      return;
    }

    onResetRef.current();
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
        onTimeOutRef.current();
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, questionKey, isAnswerLockedRef]);

  const remainingSeconds = Math.ceil(timeRemainingMs / 1000);
  const timerPercentage = Math.max(
    0,
    Math.min(100, (timeRemainingMs / (QUESTION_DURATION_SEC * 1000)) * 100)
  );

  return {
    timeRemainingMs,
    remainingSeconds,
    timerPercentage,
    questionStartTimeRef,
  };
}
