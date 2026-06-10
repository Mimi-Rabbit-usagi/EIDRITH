import { useRef, useState, useCallback } from 'react';
import { safeLoad, safeSave } from '../lib/storage';

// AudioContext を遅延生成（ブラウザの自動再生ポリシー対応）
function getCtx(ctxRef) {
  if (!ctxRef.current) {
    ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctxRef.current.state === 'suspended') {
    ctxRef.current.resume();
  }
  return ctxRef.current;
}

// 1音を鳴らすユーティリティ
// startOffset: ctx.currentTime からの遅延（秒）
function tone(ctx, freq, type, vol, duration, startOffset = 0) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  const t = ctx.currentTime + startOffset;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

const SOUNDS = {
  // 短いクリック音
  move: (ctx) => {
    tone(ctx, 700, 'sine', 0.18, 0.08);
  },
  // 重めの衝撃音
  capture: (ctx) => {
    tone(ctx, 320, 'sawtooth', 0.22, 0.1);
    tone(ctx, 200, 'sawtooth', 0.12, 0.12, 0.06);
  },
  // 2音の警告
  check: (ctx) => {
    tone(ctx, 880, 'sine', 0.22, 0.14);
    tone(ctx, 1100, 'sine', 0.18, 0.14, 0.2);
  },
  // 上昇ファンファーレ
  win: (ctx) => {
    tone(ctx, 523, 'sine', 0.22, 0.14);       // ド
    tone(ctx, 659, 'sine', 0.22, 0.14, 0.18); // ミ
    tone(ctx, 784, 'sine', 0.28, 0.3, 0.36);  // ソ
  },
  // 下降する暗い音
  lose: (ctx) => {
    tone(ctx, 440, 'sine', 0.22, 0.2);
    tone(ctx, 330, 'sine', 0.18, 0.25, 0.25);
    tone(ctx, 220, 'sine', 0.15, 0.35, 0.5);
  },
  // 短い中間音
  draw: (ctx) => {
    tone(ctx, 440, 'sine', 0.18, 0.3);
  },
  // 昇格ファンファーレ（4音）
  promotion: (ctx) => {
    tone(ctx, 523, 'sine', 0.2, 0.1);
    tone(ctx, 659, 'sine', 0.2, 0.1, 0.13);
    tone(ctx, 784, 'sine', 0.2, 0.1, 0.26);
    tone(ctx, 1047, 'sine', 0.25, 0.22, 0.39);
  },
};

export function useSoundEffects() {
  const ctxRef = useRef(null);

  const [enabled, setEnabled] = useState(() => safeLoad('chess-sound-enabled', true));

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      safeSave('chess-sound-enabled', next);
      return next;
    });
  }, []);

  const play = useCallback((type) => {
    if (!enabled) return;
    const fn = SOUNDS[type];
    if (!fn) return;
    try {
      fn(getCtx(ctxRef));
    } catch {
      // AudioContext が使えない環境では無視
    }
  }, [enabled]);

  return { enabled, toggle, play };
}
