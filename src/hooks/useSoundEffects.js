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
// masterVol: 全体音量（0.0〜1.0）
function tone(ctx, freq, type, vol, duration, startOffset = 0, masterVol = 1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  const t = ctx.currentTime + startOffset;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol * masterVol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

const SOUNDS = {
  // 短いクリック音
  move: (ctx, v) => {
    tone(ctx, 700, 'sine', 0.18, 0.08, 0, v);
  },
  // 重めの衝撃音
  capture: (ctx, v) => {
    tone(ctx, 320, 'sawtooth', 0.22, 0.1,  0,    v);
    tone(ctx, 200, 'sawtooth', 0.12, 0.12, 0.06, v);
  },
  // 2音の警告
  check: (ctx, v) => {
    tone(ctx, 880,  'sine', 0.22, 0.14, 0,   v);
    tone(ctx, 1100, 'sine', 0.18, 0.14, 0.2, v);
  },
  // 上昇ファンファーレ
  win: (ctx, v) => {
    tone(ctx, 523, 'sine', 0.22, 0.14, 0,    v); // ド
    tone(ctx, 659, 'sine', 0.22, 0.14, 0.18, v); // ミ
    tone(ctx, 784, 'sine', 0.28, 0.3,  0.36, v); // ソ
  },
  // 下降する暗い音
  lose: (ctx, v) => {
    tone(ctx, 440, 'sine', 0.22, 0.2,  0,    v);
    tone(ctx, 330, 'sine', 0.18, 0.25, 0.25, v);
    tone(ctx, 220, 'sine', 0.15, 0.35, 0.5,  v);
  },
  // 短い中間音
  draw: (ctx, v) => {
    tone(ctx, 440, 'sine', 0.18, 0.3, 0, v);
  },
  // 昇格ファンファーレ（4音）
  promotion: (ctx, v) => {
    tone(ctx, 523,  'sine', 0.2,  0.1,  0,    v);
    tone(ctx, 659,  'sine', 0.2,  0.1,  0.13, v);
    tone(ctx, 784,  'sine', 0.2,  0.1,  0.26, v);
    tone(ctx, 1047, 'sine', 0.25, 0.22, 0.39, v);
  },
  // キャスリング: 2音の連打
  castle: (ctx, v) => {
    tone(ctx, 520, 'sine', 0.18, 0.09, 0,    v);
    tone(ctx, 680, 'sine', 0.18, 0.09, 0.12, v);
  },
  // 時計の警告ティック（残り10秒以下）
  tick: (ctx, v) => {
    tone(ctx, 1200, 'square', 0.06, 0.04, 0, v);
  },
};

export function useSoundEffects() {
  const ctxRef = useRef(null);

  const [enabled, setEnabled] = useState(() => safeLoad('chess-sound-enabled', true));
  const [volume, setVolumeState] = useState(() => safeLoad('chess-sound-volume', 0.8));

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      safeSave('chess-sound-enabled', next);
      return next;
    });
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    safeSave('chess-sound-volume', clamped);
  }, []);

  const play = useCallback((type) => {
    if (!enabled) return;
    const fn = SOUNDS[type];
    if (!fn) return;
    try {
      fn(getCtx(ctxRef), volume);
    } catch {
      // AudioContext が使えない環境では無視
    }
  }, [enabled, volume]);

  return { enabled, toggle, play, volume, setVolume };
}
