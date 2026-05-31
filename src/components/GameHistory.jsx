import { useState } from 'react';

const RESULT_CONFIG = {
  win:  { icon: '🏆', label: '勝利',   color: '#4CAF50' },
  loss: { icon: '😔', label: '敗北',   color: '#F44336' },
  draw: { icon: '🤝', label: '引き分け', color: '#9E9E9E' },
};

const DIFFICULTY_LABEL = {
  easy:   { label: 'かんたん', color: '#4CAF50' },
  normal: { label: 'ふつう',   color: '#FF9800' },
  hard:   { label: 'むずかしい', color: '#F44336' },
};

const TECHNIQUE_COLOR = {
  castling:      '#6C63FF',
  enPassant:     '#FF6584',
  promotion:     '#FFB800',
  check:         '#FF9800',
  checkmate:     '#4CAF50',
  stalemate:     '#9E9E9E',
};

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function MovePairs({ moves }) {
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] });
  }
  return (
    <div className="move-pairs">
      {pairs.map(p => (
        <span key={p.num} className="move-pair">
          <span className="mp-num">{p.num}.</span>
          <span className="mp-white">{p.white}</span>
          {p.black && <span className="mp-black">{p.black}</span>}
        </span>
      ))}
    </div>
  );
}

function GameEntry({ game, onReplay }) {
  const [expanded, setExpanded] = useState(false);
  const result = RESULT_CONFIG[game.result];
  const diff = DIFFICULTY_LABEL[game.difficulty] || DIFFICULTY_LABEL.normal;

  return (
    <div className={`history-entry ${game.result}`}>
      {/* Summary row */}
      <button className="history-entry-header" onClick={() => setExpanded(v => !v)}>
        <span className="history-result-icon">{result.icon}</span>
        <div className="history-meta">
          <div className="history-meta-top">
            <span className="history-result-label" style={{ color: result.color }}>{result.label}</span>
            <span className="history-difficulty" style={{ color: diff.color }}>{diff.label}</span>
            <span className="history-moves">{game.moveCount}手</span>
          </div>
          <span className="history-date">{formatDate(game.date)}</span>
        </div>
        <div className="history-techniques">
          {game.techniques.map(t => (
            <span
              key={t.id}
              className="history-technique-badge"
              style={{ backgroundColor: `${TECHNIQUE_COLOR[t.id] || '#666'}22`, borderColor: `${TECHNIQUE_COLOR[t.id] || '#666'}66`, color: TECHNIQUE_COLOR[t.id] || '#aaa' }}
              title={t.name}
            >
              {t.icon}
            </span>
          ))}
        </div>
        <span className="history-expand-icon">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="history-detail">
          {/* Techniques list */}
          {game.techniques.length > 0 && (
            <div className="history-techniques-detail">
              <p className="history-detail-title">発生したテクニック</p>
              <div className="history-techniques-list">
                {game.techniques.map(t => (
                  <div key={t.id} className="history-technique-row" style={{ borderLeftColor: TECHNIQUE_COLOR[t.id] || '#666' }}>
                    <span className="ht-icon">{t.icon}</span>
                    <span className="ht-name">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary comment */}
          <div className="history-summary">
            <p className="history-detail-title">この対局のまとめ</p>
            <p className="history-summary-text">{buildSummary(game)}</p>
          </div>

          {/* Move list */}
          <div className="history-moves-section">
            <p className="history-detail-title">棋譜（全{game.moveCount}手）</p>
            <MovePairs moves={game.moves} />
            {game.moves.length > 0 && (
              <button
                className="history-replay-btn"
                onClick={(e) => { e.stopPropagation(); onReplay(game); }}
              >
                📽 棋譜を再生
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildSummary(game) {
  const techNames = game.techniques.map(t => t.name);
  const hasCastling = techNames.includes('キャスリング');
  const hasPromo = techNames.includes('プロモーション');
  const hasEnPassant = techNames.includes('アンパッサン');

  let lines = [];

  if (game.result === 'win') {
    lines.push(`${game.moveCount}手で勝利！`);
    if (game.moveCount <= 20) lines.push('序盤で一気に決めた快勝です。');
    else if (game.moveCount <= 40) lines.push('中盤で優位を築いて勝ち切りました。');
    else lines.push('長期戦を制しました。');
  } else if (game.result === 'loss') {
    lines.push(`${game.moveCount}手で敗北。`);
    lines.push('次の対局に活かしましょう！');
  } else {
    lines.push('引き分け。');
  }

  if (hasCastling) lines.push('キャスリングでキングを安全に守りました。');
  if (hasPromo) lines.push('ポーンをプロモーションさせることができました。');
  if (hasEnPassant) lines.push('アンパッサンという珍しい手が生まれました。');

  return lines.join(' ');
}

export default function GameHistory({ logs, onClose, onReplay }) {
  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="history-modal-header">
          <h2 className="history-modal-title">📋 ゲーム履歴</h2>
          <p className="history-modal-subtitle">これまでの対局記録</p>
          <button className="history-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Stats bar */}
        {logs.length > 0 && (
          <div className="history-stats">
            {['win', 'loss', 'draw'].map(r => {
              const count = logs.filter(g => g.result === r).length;
              const cfg = RESULT_CONFIG[r];
              return (
                <div key={r} className="history-stat">
                  <span className="history-stat-icon">{cfg.icon}</span>
                  <span className="history-stat-num" style={{ color: cfg.color }}>{count}</span>
                  <span className="history-stat-label">{cfg.label}</span>
                </div>
              );
            })}
            <div className="history-stat">
              <span className="history-stat-icon">⚔️</span>
              <span className="history-stat-num" style={{ color: '#aaa' }}>{logs.length}</span>
              <span className="history-stat-label">合計</span>
            </div>
          </div>
        )}

        {/* Log list */}
        <div className="history-list">
          {logs.length === 0 ? (
            <div className="history-empty">
              <p>まだ対局記録がありません。</p>
              <p>ゲームを終わらせると自動で記録されます！</p>
            </div>
          ) : (
            logs.map(game => <GameEntry key={game.id} game={game} onReplay={onReplay} />)
          )}
        </div>
      </div>
    </div>
  );
}
