import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';

/**
 * 棋譜の全手を事前に計算し、ステップ番号→{fen, lastMove}の配列を返す
 */
function buildPositions(moves) {
  const chess = new Chess();
  const positions = [{ fen: chess.fen(), lastMove: null }];
  for (const san of moves) {
    const move = chess.move(san);
    if (!move) break; // 不正な棋譜はここで打ち切り
    positions.push({ fen: chess.fen(), lastMove: { from: move.from, to: move.to } });
  }
  return positions;
}

/**
 * 手順リスト（1. e4 e5 / 2. Nf3 Nc6 ...）の表示と
 * クリックで任意のステップへジャンプする機能を持つ
 */
function MoveList({ moves, step, onGoTo }) {
  const activeRef = useRef(null);

  // アクティブな手を自動スクロール
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

export default function ReplayModal({ game, boardTheme, onClose }) {
  // 全ポジションを事前計算（game.movesが変わらない限り再計算しない）
  const positions = useMemo(() => buildPositions(game.moves), [game.moves]);
  const total = positions.length - 1; // 総手数

  const [step, setStep] = useState(0);
  // 「再生ボタンが押されている」状態。実際に再生中かは isPlaying（下の派生値）で判定する
  const [playRequested, setPlayRequested] = useState(false);

  const goTo = useCallback((s) => {
    setStep(Math.min(total, Math.max(0, s)));
    setPlayRequested(false);
  }, [total]);

  // 「終端に達したら止まる」は state を書き換えずに派生値として表す
  const isPlaying = playRequested && step < total;

  // 自動再生: 1秒ごとに1手進む
  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setStep(s => s + 1), 1000);
    return () => clearTimeout(t);
  }, [isPlaying, step]);

  // キーボード操作
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(step - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(step + 1); }
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goTo, onClose]);

  const { fen, lastMove } = positions[step];
  const chess = new Chess(fen);

  const handlePlayPause = () => {
    if (step >= total) setStep(0); // 最後まで行ったら最初から
    // トグルの基準は playRequested ではなく isPlaying。
    // 終端で止まっているとき playRequested は true のままなので、
    // それを反転させると「再生し直し」ではなく「停止」になってしまう
    setPlayRequested(!isPlaying);
  };

  return (
    <div className="replay-overlay" onClick={onClose}>
      <div className="replay-modal" onClick={e => e.stopPropagation()}>

        {/* ── ヘッダー ── */}
        <div className="replay-header">
          <span className="replay-title">棋譜リプレイ</span>
          <span className="replay-step-counter">{step} / {total}手</span>
          <button className="replay-close-btn" onClick={onClose}>✕</button>
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
            <p className="replay-moves-title">手順</p>
            <MoveList moves={game.moves} step={step} onGoTo={goTo} />
          </div>
        </div>

        {/* ── コントロール ── */}
        <div className="replay-controls">
          <button className="replay-ctrl-btn" onClick={() => goTo(0)}      title="最初">⏮</button>
          <button className="replay-ctrl-btn" onClick={() => goTo(step-1)} title="前の手（←）">⏪</button>
          <button
            className={`replay-ctrl-btn replay-play-btn ${isPlaying ? 'replay-playing' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? '一時停止' : '自動再生'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="replay-ctrl-btn" onClick={() => goTo(step+1)} title="次の手（→）">⏩</button>
          <button className="replay-ctrl-btn" onClick={() => goTo(total)}  title="最後">⏭</button>
        </div>
        <p className="replay-keyboard-hint">← → キーでも操作できます</p>

      </div>
    </div>
  );
}
