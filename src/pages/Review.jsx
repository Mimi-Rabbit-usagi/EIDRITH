import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import NavBar from '../components/NavBar';
import ChessBoard from '../components/ChessBoard';
import { BOARD_THEMES } from '../data/themes';

// ── 棋譜から全ポジションを事前計算 ───────────────────────────────────────────
function buildPositions(moves) {
  const chess = new Chess();
  const positions = [{ fen: chess.fen(), lastMove: null }];
  for (const san of moves) {
    const move = chess.move(san);
    if (!move) break;
    positions.push({ fen: chess.fen(), lastMove: { from: move.from, to: move.to } });
  }
  return positions;
}

// ── 手順リスト ────────────────────────────────────────────────────────────────
function MoveList({ moves, step, onGoTo }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [step]);

  const pairs = useMemo(() => {
    const result = [];
    for (let i = 0; i < moves.length; i += 2) {
      result.push({
        num: Math.floor(i / 2) + 1,
        white: { san: moves[i],      stepIndex: i + 1 },
        black: moves[i + 1] ? { san: moves[i + 1], stepIndex: i + 2 } : null,
      });
    }
    return result;
  }, [moves]);

  return (
    <div className="replay-move-list">
      {pairs.map(pair => (
        <div key={pair.num} className="replay-pair">
          <span className="replay-pair-num">{pair.num}.</span>
          <button
            ref={step === pair.white.stepIndex ? activeRef : null}
            className={`replay-move-btn ${step === pair.white.stepIndex ? 'replay-move-active' : ''}`}
            onClick={() => onGoTo(pair.white.stepIndex)}
          >
            {pair.white.san}
          </button>
          {pair.black && (
            <button
              ref={step === pair.black.stepIndex ? activeRef : null}
              className={`replay-move-btn ${step === pair.black.stepIndex ? 'replay-move-active' : ''}`}
              onClick={() => onGoTo(pair.black.stepIndex)}
            >
              {pair.black.san}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Review ページ ─────────────────────────────────────────────────────────────
export default function Review() {
  const location = useLocation();
  const navigate = useNavigate();

  // Play.jsx から { moves, moveCount, boardThemeId } を state で受け取る
  const game = location.state?.game ?? null;
  const boardThemeId = location.state?.boardThemeId ?? 'classic';
  const boardTheme = BOARD_THEMES.find(t => t.id === boardThemeId) ?? BOARD_THEMES[0];

  const positions = useMemo(
    () => (game ? buildPositions(game.moves) : []),
    [game]
  );
  const total = positions.length - 1;

  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const goTo = useCallback((s) => {
    setStep(Math.min(total, Math.max(0, s)));
    setIsPlaying(false);
  }, [total]);

  // 自動再生
  useEffect(() => {
    if (!isPlaying) return;
    if (step >= total) { setIsPlaying(false); return; }
    const t = setTimeout(() => setStep(s => s + 1), 1000);
    return () => clearTimeout(t);
  }, [isPlaying, step, total]);

  // キーボード操作
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(step - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(step + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goTo]);

  const handlePlayPause = () => {
    if (step >= total) setStep(0);
    setIsPlaying(p => !p);
  };

  // データなし
  if (!game) {
    return (
      <div className="app-container">
        <NavBar />
        <main className="review-page">
          <div className="review-empty">
            <p>棋譜データがありません。</p>
            <button className="new-game-btn" onClick={() => navigate('/play')}>
              ← 対局に戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { fen, lastMove } = positions[step];
  const chess = new Chess(fen);

  return (
    <div className="app-container">
      <NavBar />

      <main className="review-page">
        {/* ── ヘッダー ── */}
        <div className="review-header">
          <button className="review-back-btn" onClick={() => navigate(-1)}>
            ← 戻る
          </button>
          <h1 className="review-title">棋譜リプレイ</h1>
          <span className="replay-step-counter">{step} / {total}手</span>
        </div>

        {/* ── 盤面 + 手順リスト ── */}
        <div className="replay-body">
          <div className="replay-board-wrap">
            <ChessBoard
              board={chess.board()}
              selectedSquare={null}
              legalMoves={[]}
              lastMove={lastMove}
              gameStatus="playing"
              boardTheme={boardTheme}
              hint={null}
              onSquareClick={() => {}}
              onDrop={() => {}}
              onCancelDrag={() => {}}
            />
          </div>

          <div className="replay-side">
            <p className="replay-moves-title">手順（{total}手）</p>
            <MoveList moves={game.moves} step={step} onGoTo={goTo} />
          </div>
        </div>

        {/* ── コントロール ── */}
        <div className="replay-controls">
          <button className="replay-ctrl-btn" onClick={() => goTo(0)}        title="最初">⏮</button>
          <button className="replay-ctrl-btn" onClick={() => goTo(step - 1)} title="前の手（←）">⏪</button>
          <button
            className={`replay-ctrl-btn replay-play-btn ${isPlaying ? 'replay-playing' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? '一時停止' : '自動再生'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="replay-ctrl-btn" onClick={() => goTo(step + 1)} title="次の手（→）">⏩</button>
          <button className="replay-ctrl-btn" onClick={() => goTo(total)}    title="最後">⏭</button>
        </div>
        <p className="replay-keyboard-hint">← → キーでも操作できます</p>
      </main>
    </div>
  );
}
