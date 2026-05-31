import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * チェスクロック管理フック
 *
 * clockMode: 'none' | '1' | '3' | '10' (分)
 * currentTurn: 'w' | 'b'
 * playerColor: 'w' | 'b'
 * isGameOver: boolean
 * onTimeout(loserColor): 時間切れ時コールバック
 */
export function useChessClock({ clockMode, currentTurn, playerColor, isGameOver, onTimeout }) {
  const getInitTime = () => clockMode === 'none' ? null : parseInt(clockMode) * 60;

  const [playerTime, setPlayerTime] = useState(getInitTime);
  const [cpuTime, setCpuTime] = useState(getInitTime);

  const timedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // clockMode が変わったらリセット
  useEffect(() => {
    const t = clockMode === 'none' ? null : parseInt(clockMode) * 60;
    setPlayerTime(t);
    setCpuTime(t);
    timedOutRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockMode]);

  // 1秒ごとにカウントダウン
  useEffect(() => {
    if (clockMode === 'none' || isGameOver || timedOutRef.current) return;

    const isPlayerTurn = currentTurn === playerColor;
    const cpuColor = playerColor === 'w' ? 'b' : 'w';

    const tick = setInterval(() => {
      if (isPlayerTurn) {
        setPlayerTime(prev => {
          if (prev === null || prev <= 0) return prev;
          const next = prev - 1;
          if (next <= 0 && !timedOutRef.current) {
            timedOutRef.current = true;
            setTimeout(() => onTimeoutRef.current(playerColor), 0);
          }
          return next;
        });
      } else {
        setCpuTime(prev => {
          if (prev === null || prev <= 0) return prev;
          const next = prev - 1;
          if (next <= 0 && !timedOutRef.current) {
            timedOutRef.current = true;
            setTimeout(() => onTimeoutRef.current(cpuColor), 0);
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [clockMode, currentTurn, playerColor, isGameOver]);

  const resetClock = useCallback(() => {
    const t = clockMode === 'none' ? null : parseInt(clockMode) * 60;
    setPlayerTime(t);
    setCpuTime(t);
    timedOutRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockMode]);

  return { playerTime, cpuTime, resetClock };
}
