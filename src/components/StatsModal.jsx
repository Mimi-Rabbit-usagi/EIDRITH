const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };

function calcStats(logs) {
  const total = logs.length;
  const wins   = logs.filter(l => l.result === 'win').length;
  const losses = logs.filter(l => l.result === 'loss').length;
  const draws  = logs.filter(l => l.result === 'draw').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // 最長連勝
  let bestStreak = 0, cur = 0;
  [...logs].reverse().forEach(l => {
    if (l.result === 'win') { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  });

  // 難易度別
  const byDiff = { easy: { w: 0, l: 0, d: 0 }, normal: { w: 0, l: 0, d: 0 }, hard: { w: 0, l: 0, d: 0 } };
  logs.forEach(l => {
    const d = byDiff[l.difficulty];
    if (!d) return;
    if (l.result === 'win')  d.w++;
    else if (l.result === 'loss') d.l++;
    else d.d++;
  });

  // 直近10局
  const recent = logs.slice(0, 10);

  return { total, wins, losses, draws, winRate, bestStreak, byDiff, recent };
}

function ResultDot({ result }) {
  const map = { win: { symbol: '○', cls: 'stat-dot-win' }, loss: { symbol: '×', cls: 'stat-dot-loss' }, draw: { symbol: '△', cls: 'stat-dot-draw' } };
  const { symbol, cls } = map[result] || map.draw;
  return <span className={`stat-dot ${cls}`}>{symbol}</span>;
}

export default function StatsModal({ logs, playerName, onClose }) {
  const s = calcStats(logs);

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={e => e.stopPropagation()}>
        <div className="stats-header">
          <h2 className="stats-title">📊 {playerName} の統計</h2>
          <button className="stats-close" onClick={onClose}>✕</button>
        </div>

        {/* サマリーカード */}
        <div className="stats-cards">
          <div className="stats-card">
            <span className="stats-card-num">{s.total}</span>
            <span className="stats-card-label">総対局</span>
          </div>
          <div className="stats-card stats-card-win">
            <span className="stats-card-num">{s.wins}</span>
            <span className="stats-card-label">勝利</span>
          </div>
          <div className="stats-card stats-card-loss">
            <span className="stats-card-num">{s.losses}</span>
            <span className="stats-card-label">敗北</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-num">{s.draws}</span>
            <span className="stats-card-label">引き分け</span>
          </div>
        </div>

        {/* 勝率バー */}
        <div className="stats-winrate-section">
          <div className="stats-winrate-label">
            <span>勝率</span>
            <span className="stats-winrate-pct">{s.winRate}%</span>
          </div>
          <div className="stats-winrate-bar">
            <div className="stats-winrate-fill" style={{ width: `${s.winRate}%` }} />
          </div>
        </div>

        {/* 最長連勝 */}
        <div className="stats-streak">
          <span className="stats-streak-icon">🔥</span>
          <span className="stats-streak-label">最長連勝</span>
          <span className="stats-streak-num">{s.bestStreak}連勝</span>
        </div>

        {/* 難易度別 */}
        <div className="stats-section">
          <p className="stats-section-title">難易度別成績</p>
          <div className="stats-diff-grid">
            {Object.entries(s.byDiff).map(([diff, d]) => {
              const t = d.w + d.l + d.d;
              const rate = t > 0 ? Math.round((d.w / t) * 100) : 0;
              return (
                <div key={diff} className="stats-diff-row">
                  <span className="stats-diff-name">{DIFF_LABEL[diff]}</span>
                  <span className="stats-diff-result">{d.w}勝 {d.l}敗 {d.d}分</span>
                  <span className="stats-diff-rate">{t > 0 ? `${rate}%` : '-'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 直近10局 */}
        {s.recent.length > 0 && (
          <div className="stats-section">
            <p className="stats-section-title">直近の対局</p>
            <div className="stats-recent">
              {s.recent.map(l => <ResultDot key={l.id} result={l.result} />)}
            </div>
          </div>
        )}

        {s.total === 0 && (
          <p className="stats-empty">まだ対局記録がありません。<br />ゲームを完了させると記録されます！</p>
        )}
      </div>
    </div>
  );
}
