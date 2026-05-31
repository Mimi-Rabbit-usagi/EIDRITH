const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };

function calcMaterial(pieces) {
  return pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
}

function getAdvice({ gameStatus, winner, moveHistory, techniqueLog, capturedPieces, difficulty }) {
  const moveCount = moveHistory.length;
  const lostMaterial  = calcMaterial(capturedPieces.b); // CPUに取られた駒
  const gainedMaterial = calcMaterial(capturedPieces.w); // プレイヤーが取った駒

  // 勝ち
  if (gameStatus === 'checkmate' && winner === 'w') {
    if (difficulty === 'hard')   return 'むずかしい難易度で勝利！完璧なゲームでした。棋譜を振り返ってさらに磨いていこう！';
    if (difficulty === 'normal') return 'おめでとう！次はむずかしい難易度に挑戦してみよう！';
    return 'おめでとう！自信がついたらふつう以上の難易度にも挑戦してみよう！';
  }

  // 引き分け
  if (gameStatus === 'stalemate') {
    return '引き分け（ステイルメイト）。優勢でも相手の王に逃げ道がなくなるとステイルメイトに。王手をかけながら詰めていく練習をしよう。';
  }
  if (gameStatus === 'draw') {
    return '引き分け。次は積極的に攻めて勝ちを目指そう！';
  }

  // 負け
  if (moveCount < 15) {
    return '序盤で終わってしまいました。最初にポーンを中央に出し、ナイト・ビショップを展開して早めにキャスリングする「序盤の3原則」を意識しましょう。';
  }
  if (lostMaterial >= gainedMaterial + 9) {
    return 'CPUより多くの駒を失いました。駒を動かす前に「この駒は相手に取られないか？」を確認する習慣をつけましょう。';
  }
  if (techniqueLog.length >= 3) {
    return `${techniqueLog.length}つの戦術が発動しました！各戦術の解説を読んで、次のゲームで同じ形を防げるか試してみましょう。`;
  }
  if (moveCount > 50) {
    return '長い対局でした。終盤の寄せを練習すると、優勢な局面をしっかり勝ちに結びつけられるようになります。';
  }
  return 'ヒント機能を活用しながら対局を重ねて、感覚を磨いていきましょう！';
}

const RESULT_CONFIG = {
  win:  {
    emoji: '🏆',
    title: 'あなたの勝ち！',
    color: '#69F0AE',
    border: '#4CAF50',
    bg: 'linear-gradient(160deg, #0d2b1a 0%, #0f1a12 100%)',
  },
  loss: {
    emoji: '😔',
    title: 'CPUの勝ち...',
    color: '#FF8A80',
    border: '#F44336',
    bg: 'linear-gradient(160deg, #2b0d0d 0%, #1a0f0f 100%)',
  },
  draw: {
    emoji: '🤝',
    title: '引き分け',
    color: '#BDBDBD',
    border: '#757575',
    bg: 'linear-gradient(160deg, #1a1a2e 0%, #0f0e17 100%)',
  },
};

export default function GameSummary({
  gameStatus, winner, moveHistory, techniqueLog,
  capturedPieces, difficulty, onNewGame, onClose, onReplay,
}) {
  const result = gameStatus === 'checkmate' ? (winner === 'w' ? 'win' : 'loss') : 'draw';
  const cfg = RESULT_CONFIG[result];

  const endLabel = { checkmate: 'チェックメイト', stalemate: 'ステイルメイト', draw: '引き分け' }[gameStatus] || '';
  const moveCount = moveHistory.length;
  const lostMaterial   = calcMaterial(capturedPieces.b);
  const gainedMaterial = calcMaterial(capturedPieces.w);
  const advice = getAdvice({ gameStatus, winner, moveHistory, techniqueLog, capturedPieces, difficulty });

  return (
    <div className="summary-overlay" onClick={onClose}>
      <div
        className="summary-modal"
        style={{ background: cfg.bg, borderColor: cfg.border }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── 結果ヘッダー ── */}
        <div className="summary-header">
          <span className="summary-emoji">{cfg.emoji}</span>
          <div>
            <h2 className="summary-title" style={{ color: cfg.color }}>{cfg.title}</h2>
            <p className="summary-subtitle">{endLabel}・{moveCount}手</p>
          </div>
        </div>

        {/* ── 統計 ── */}
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="summary-stat-label">手数</span>
            <span className="summary-stat-value">{moveCount}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">取った駒</span>
            <span className="summary-stat-value summary-stat-gain">+{gainedMaterial}pt</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">失った駒</span>
            <span className="summary-stat-value summary-stat-loss">-{lostMaterial}pt</span>
          </div>
        </div>

        {/* ── 発動した戦術 ── */}
        {techniqueLog.length > 0 && (
          <div className="summary-section">
            <p className="summary-section-title">⚔️ 発動した戦術（{techniqueLog.length}）</p>
            <div className="summary-techniques">
              {techniqueLog.map(t => (
                <div
                  key={t.id}
                  className="summary-technique-badge"
                  style={{ borderColor: t.color, background: `${t.color}22` }}
                >
                  <span>{t.icon}</span>
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── アドバイス ── */}
        <div className="summary-advice">
          <p className="summary-advice-label">💡 アドバイス</p>
          <p className="summary-advice-text">{advice}</p>
        </div>

        {/* ── ボタン ── */}
        <div className="summary-buttons">
          <button className="new-game-btn" onClick={onNewGame}>新しいゲーム</button>
          {moveHistory.length > 0 && (
            <button className="replay-from-summary-btn" onClick={onReplay}>📽 棋譜を見る</button>
          )}
          <button className="summary-close-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
