function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ChessClock({ time, isActive }) {
  if (time === null) return null;

  const isUrgent = time > 0 && time <= 5;   // 残り5秒以下: 超緊迫
  const isLow    = time > 5 && time <= 10;  // 残り10秒以下: 警告
  const isDead   = time === 0;

  return (
    <div className={[
      'chess-clock',
      isActive  ? 'clock-active'  : '',
      isLow     ? 'clock-low'     : '',
      isUrgent  ? 'clock-urgent'  : '',
      isDead    ? 'clock-dead'    : '',
    ].filter(Boolean).join(' ')}>
      <span className="clock-time">{formatTime(time)}</span>
    </div>
  );
}
