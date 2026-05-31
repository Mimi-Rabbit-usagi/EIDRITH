import { useMemo } from 'react';

// 勝利時に画面に紙吹雪を降らせるエフェクト
// pointer-events: none なので盤面操作を妨げない

const COLORS = ['#6c63ff', '#ff6584', '#ffb800', '#4caf50', '#00bcd4', '#ff9800', '#e91e63'];

export default function ConfettiEffect() {
  // コンポーネントマウント時に一度だけランダム値を計算
  const pieces = useMemo(() => (
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: `${Math.random() * 100}%`,
      width: `${6 + Math.random() * 8}px`,
      height: `${8 + Math.random() * 6}px`,
      animationDelay: `${Math.random() * 2.5}s`,
      animationDuration: `${2.8 + Math.random() * 2}s`,
      borderRadius: Math.random() > 0.4 ? '50%' : '2px',
    }))
  ), []);

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
            borderRadius: p.borderRadius,
          }}
        />
      ))}
    </div>
  );
}
