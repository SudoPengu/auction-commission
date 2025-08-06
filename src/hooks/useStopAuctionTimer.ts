import { useState, useEffect, useCallback } from 'react';

export interface StopAuctionTimerState {
  isTimerActive: boolean;
  countdown: number;
  startTimer: () => void;
  cancelTimer: () => void;
  isReadyToStop: boolean;
}

export const useStopAuctionTimer = (onConfirm: () => void): StopAuctionTimerState => {
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const startTimer = useCallback(() => {
    setIsTimerActive(true);
    setCountdown(5);
  }, []);

  const cancelTimer = useCallback(() => {
    setIsTimerActive(false);
    setCountdown(5);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            onConfirm();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerActive, countdown, onConfirm]);

  return {
    isTimerActive,
    countdown,
    startTimer,
    cancelTimer,
    isReadyToStop: countdown === 0
  };
};