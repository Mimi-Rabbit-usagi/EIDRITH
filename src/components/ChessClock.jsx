function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ChessClock({ time, isActive }) {
  if (time === null) return null;

  const isLow  = time > 0 && time <= 10;
  const isDead = time === 0;

  return (
    <div className={[
      'chess-clock',
      isActive ? 'clock-active' : '',
      isLow    ? 'clock-low'    : '',
      isDead   ? 'clock-dead'   : '',
    ].filter(Boolean).join(' ')}>
      <span className="clock-time">{formatTime(time)}</span>
    </div>
  );
}
