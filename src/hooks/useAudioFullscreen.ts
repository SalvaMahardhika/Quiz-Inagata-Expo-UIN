import { useState, useEffect } from 'react';
import { getIsMuted, toggleMuted, playClickSound } from '../utils/audio';

export function useAudioFullscreen() {
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

  const toggleMute = () => {
    const next = toggleMuted();
    setIsMutedState(next);
    if (!next) {
      playClickSound();
    }
  };

  const toggleFullscreen = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return {
    isMuted,
    isFullscreen,
    toggleMute,
    toggleFullscreen,
  };
}
