import { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { evaluatePosition } from '../hooks/useAI';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };

function calcMaterial(pieces) {
  return pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
}

// ── #19 棋譜分析 ─────────────────────────────────────────────────────────────

function computeAnalysis(sanMoves, playerColor) {
  const chess = new Chess();
  const evals = [evaluatePosition(chess)];
  for (const san of sanMoves) {
    const r = chess.move(san);
    if (!r) break;
    evals.push(evaluatePosition(chess));
  }
  const total = evals.length - 1;
  const moves = sanMoves.slice(0, total).map((san, i) => {
    const mover = i % 2 === 0 ? 'w' : 'b';
    const delta = mover === 'w' ? evals[i + 1] - evals[i] : evals[i] - evals[i + 1];
    let grade;
    if (delta < -200) grade = 'blunder';
    else if (delta < -80) grade = 'mistake';
    else if (delta < -20) grade = 'inaccuracy';
    else grade = 'good';
    return { san, mover, delta, grade };
  });
  const pm = moves.filter(m => m.mover === playerColor);
  const blunders     = pm.filter(m => m.grade === 'blunder').length;
  const mistakes     = pm.filter(m => m.grade === 'mistake').length;
  const inaccuracies = pm.filter(m => m.grade === 'inaccuracy').length;
  const worstMove    = pm.length > 0 ? pm.reduce((w, m) => m.delta < w.delta ? m : w, pm[0]) : null;
  return { evals, moves, blunders, mistakes, inaccuracies, worstMove };
}

const GRADE_LABEL = { blunder: '大ミス', mistake: 'ミス', inaccuracy: '不正確' };
const DOT_COLOR   = { blunder: '#F44336', mistake: '#FF9800', inaccuracy: '#FFC107' };

function EvalChart({ evals, moves, playerColor }) {
  if (evals.length < 2) return null;
  const W = 280, H = 56, CLAMP = 700;
  const clamp = v => Math.max(-CLAMP, Math.min(CLAMP, v));
  const xi = i => (i / (evals.length - 1)) * W;
  const yi = v => H / 2 - (clamp(v) / (CLAMP * 2)) * H;
  const midY = H / 2;
  const pts = evals.map((v, i) => [xi(i), yi(v)]);
  const linePts = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPts = [`0,${midY}`, ...pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`), `${W},${midY}`].join(' ');
  const badDots = moves
    .map((m, i) => ({ ...m, cx: xi(i + 1), cy: yi(evals[i + 1]) }))
    .filter(m => m.mover === playerColor && m.grade !== 'good');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <rect x={0} y={0} width={W} height={midY} fill="rgba(220,220,255,0.04)" />
      <rect x={0} y={midY} width={W} height={midY} fill="rgba(10,10,20,0.25)" />
      <polygon points={fillPts} fill="rgba(140,120,200,0.18)" />
      <line x1={0} y1={midY} x2={W} y2={midY} stroke="#444" strokeWidth="1" />
      <polyline points={linePts} fill="none" stroke="#9B8FA6" strokeWidth="1.5" />
      {badDots.map((m, i) => (
        <circle key={i} cx={m.cx.toFixed(1)} cy={m.cy.toFixed(1)} r={4} fill={DOT_COLOR[m.grade]} />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function getAdvice({ gameStatus, winner, playerColor, moveHistory, techniqueLog, capturedPieces, difficulty }) {
  const cpuColor = playerColor === 'w' ? 'b' : 'w';
  const moveCount = moveHistory.length;
  const lostMaterial   = calcMaterial(capturedPieces[cpuColor]);    // CPUに取られた駒
  const gainedMaterial = calcMaterial(capturedPieces[playerColor]); // プレイヤーが取った駒

  // 勝ち
  if ((gameStatus === 'checkmate' || gameStatus === 'timeout') && winner === playerColor) {
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

const BASE_RESULT_CONFIG = {
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

const DRAW_REASON_LABEL = {
  repetition:  '三回繰り返し',
  fifty:       '50手ルール',
  insufficient: '駒不足',
  agreement:   '合意による引き分け',
};

export default function GameSummary({
  gameStatus, winner, playerColor = 'w', moveHistory, techniqueLog,
  capturedPieces, difficulty, gameMode, playerName, player2Name, drawReason,
  onNewGame, onClose, onReplay,
  onTournamentReturn, tournamentRoundLabel,
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const analysis = useMemo(() => {
    if (!showAnalysis || moveHistory.length === 0) return null;
    return computeAnalysis(moveHistory.map(m => m.san), playerColor);
  }, [showAnalysis, moveHistory, playerColor]);

  const isLocal = gameMode === 'local';
  const cpuColor = playerColor === 'w' ? 'b' : 'w';
  const result = (gameStatus === 'checkmate' || gameStatus === 'timeout')
    ? (winner === playerColor ? 'win' : 'loss') : 'draw';

  // 2人対戦では「プレイヤー名（色）」で勝者を表示
  const p1Name = playerName ?? 'プレイヤー1';
  const p2Name = player2Name ?? 'プレイヤー2';
  const localWinnerName = isLocal && winner
    ? (winner === 'w' ? `${p1Name}（白）` : `${p2Name}（黒）`)
    : null;

  const RESULT_CONFIG = {
    ...BASE_RESULT_CONFIG,
    ...(isLocal && winner ? {
      win:  { ...BASE_RESULT_CONFIG.win,  title: `${localWinnerName}の勝ち！` },
      loss: { ...BASE_RESULT_CONFIG.win,  title: `${localWinnerName}の勝ち！` },
    } : {}),
  };

  const cfg = RESULT_CONFIG[result];

  const drawLabel = drawReason ? `引き分け（${DRAW_REASON_LABEL[drawReason] ?? drawReason}）` : '引き分け';
  const endLabel = { checkmate: 'チェックメイト', stalemate: 'ステイルメイト', draw: drawLabel, timeout: '時間切れ' }[gameStatus] || '';
  const moveCount = moveHistory.length;
  const lostMaterial   = calcMaterial(capturedPieces[cpuColor]);
  const gainedMaterial = calcMaterial(capturedPieces[playerColor]);
  const advice = isLocal
    ? `${moveCount}手の対局でした。棋譜を振り返って次の対局に活かしましょう！`
    : getAdvice({ gameStatus, winner, playerColor, moveHistory, techniqueLog, capturedPieces, difficulty });

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
              {techniqueLog.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).map(t => (
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

        {/* ── 棋譜分析 ── */}
        {moveHistory.length > 0 && (
          <div className="summary-section">
            <button
              className="summary-analysis-toggle"
              onClick={() => setShowAnalysis(a => !a)}
            >
              📊 棋譜分析 {showAnalysis ? '▲' : '▼'}
            </button>
            {showAnalysis && analysis && (
              <div className="summary-analysis">
                <div className="summary-eval-chart-wrap">
                  <EvalChart evals={analysis.evals} moves={analysis.moves} playerColor={playerColor} />
                </div>
                <div className="summary-accuracy-row">
                  {analysis.blunders > 0 && (
                    <span className="acc-chip acc-blunder">🔴 大ミス {analysis.blunders}</span>
                  )}
                  {analysis.mistakes > 0 && (
                    <span className="acc-chip acc-mistake">🟠 ミス {analysis.mistakes}</span>
                  )}
                  {analysis.inaccuracies > 0 && (
                    <span className="acc-chip acc-inaccuracy">🟡 不正確 {analysis.inaccuracies}</span>
                  )}
                  {analysis.blunders === 0 && analysis.mistakes === 0 && analysis.inaccuracies === 0 && (
                    <span className="acc-chip acc-perfect">✨ ミスなし！</span>
                  )}
                </div>
                {analysis.worstMove && analysis.worstMove.grade !== 'good' && (
                  <p className="summary-worst-move">
                    一番の悪手: <strong>{analysis.worstMove.san}</strong>
                    （{GRADE_LABEL[analysis.worstMove.grade]}）
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ボタン ── */}
        <div className="summary-buttons">
          {onTournamentReturn ? (
            <button className="tournament-return-btn" onClick={onTournamentReturn}>
              🏆 トーナメントに戻る
            </button>
          ) : (
            <button className="new-game-btn" onClick={onNewGame}>新しいゲーム</button>
          )}
          <div className="summary-buttons-sub">
            {moveHistory.length > 0 && (
              <button className="replay-from-summary-btn" onClick={onReplay}>📽 棋譜を見る</button>
            )}
            <button className="summary-close-btn" onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}
