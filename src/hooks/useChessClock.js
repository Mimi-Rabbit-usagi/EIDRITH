import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * チェスクロック管理フック
 *
 * clockMode: 'none' | '1' | '3' | '10' (分)
 * currentTurn: 'w' | 'b'
 * playerColor: 'w' | 'b'
 * isGameOver: boolean
 * onTimeout(loserColor): 時間切れ時コールバック
 *
 * 精度改善ポイント:
 * - setInterval(1000ms) の±100ms 誤差を排除するため、
 *   Date.now() 基準で経過秒を計算し 200ms ごとに UI を更新
 * - バックグラウンドタブ復帰時に visibilitychange で即座に補正
 * - タイムアウトは非同期ではなく即座に呼び出す
 */
export function useChessClock({ clockMode, increment = 0, currentTurn, playerColor, isGameOver, onTimeout }) {
  const getInitTime = () => clockMode === 'none' ? null : parseInt(clockMode) * 60;

  const [playerTime, setPlayerTime] = useState(getInitTime);
  const [cpuTime, setCpuTime]       = useState(getInitTime);

  // Ref で「現在の残り時間」を保持する（エフェクト再起動時の初期値として使う）
  const playerTimeRef = useRef(playerTime);
  const cpuTimeRef    = useRef(cpuTime);
  const timedOutRef   = useRef(false);
  const onTimeoutRef  = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // インクリメント用: 直前のターンを追跡
  const prevTurnRef = useRef(null); // null = "このゲームでまだ手が指されていない"

  // clockMode が変わったらリセット
  useEffect(() => {
    const t = clockMode === 'none' ? null : parseInt(clockMode) * 60;
    playerTimeRef.current = t;
    cpuTimeRef.current    = t;
    setPlayerTime(t);
    setCpuTime(t);
    timedOutRef.current = false;
    prevTurnRef.current = null; // インクリメントを新ゲーム用にリセット
  // clockMode だけに反応すればよい
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockMode]);

  useEffect(() => {
    if (clockMode === 'none' || isGameOver || timedOutRef.current) return;

    const isPlayerTurn = currentTurn === playerColor;
    const cpuColor     = playerColor === 'w' ? 'b' : 'w';
    const loserColor   = isPlayerTurn ? playerColor : cpuColor;
    const setTime      = isPlayerTurn ? setPlayerTime : setCpuTime;
    const timeRef      = isPlayerTurn ? playerTimeRef : cpuTimeRef;

    // このターンが始まった瞬間の壁時計と残り時間を固定する
    const startWallMs    = Date.now();
    const startRemaining = timeRef.current;

    if (startRemaining === null || startRemaining <= 0) return;

    const update = () => {
      const elapsedSec  = (Date.now() - startWallMs) / 1000;
      const remaining   = Math.max(0, startRemaining - elapsedSec);
      // Math.ceil: 0.9秒 → 表示1、0.0秒 → 表示0（タイムアウト）
      const displaySec  = Math.ceil(remaining);

      timeRef.current = displaySec;
      setTime(displaySec);

      if (remaining <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        onTimeoutRef.current(loserColor); // 非同期にせず即座に呼ぶ
      }
    };

    // 200ms ごとに更新することで setInterval(1000ms) の誤差を大幅削減
    const tick = setInterval(update, 200);

    // バックグラウンドタブから復帰した直後に即座に補正
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [clockMode, currentTurn, playerColor, isGameOver]);

  // ターンが変わったとき（=手が指されたとき）インクリメントを加算
  useEffect(() => {
    if (increment <= 0 || clockMode === 'none' || isGameOver) return;

    if (prevTurnRef.current === null) {
      // 初手: ターンを記録するだけで加算しない
      prevTurnRef.current = currentTurn;
      return;
    }
    if (prevTurnRef.current === currentTurn) return; // ターン変化なし

    // ターンが変わった → 直前のターンのプレイヤーが手を指した
    const justMovedColor = prevTurnRef.current;
    prevTurnRef.current  = currentTurn;

    const cpuColor = playerColor === 'w' ? 'b' : 'w';
    if (justMovedColor === playerColor) {
      const newT = (playerTimeRef.current ?? 0) + increment;
      playerTimeRef.current = newT;
      setPlayerTime(newT);
    } else if (justMovedColor === cpuColor) {
      const newT = (cpuTimeRef.current ?? 0) + increment;
      cpuTimeRef.current = newT;
      setCpuTime(newT);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn]);

  const resetClock = useCallback(() => {
    const t = clockMode === 'none' ? null : parseInt(clockMode) * 60;
    playerTimeRef.current = t;
    cpuTimeRef.current    = t;
    setPlayerTime(t);
    setCpuTime(t);
    timedOutRef.current = false;
    prevTurnRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockMode]);

  return { playerTime, cpuTime, resetClock };
}
