import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { PUZZLES, PUZZLE_THEMES } from '../data/puzzles';
import ChessBoard from './ChessBoard';
import { BOARD_THEMES } from '../data/themes';
import { safeLoad, safeSave } from '../lib/storage';

const DIFF_COLOR = { easy: '#4CAF50', normal: '#FF9800', hard: '#F44336' };
const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };

function buildBoardTheme(activeTheme) {
  return BOARD_THEMES.find(t => t.id === activeTheme) || BOARD_THEMES[0];
}

export default function PuzzleModal({ activeBoardTheme, activePieceSet, onClose }) {
  const [filter, setFilter]         = useState('all');
  const [puzzleIdx, setPuzzleIdx]   = useState(null); // null = list view
  const [chess]                     = useState(() => new Chess());
  // chess は破壊的に更新されるため、setFen を再レンダーの引き金としてのみ使う
  const [, setFen]                  = useState('');
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove]     = useState(null);
  const [moveIdx, setMoveIdx]       = useState(0);   // index in solution
  const [status, setStatus]         = useState('idle'); // 'idle'|'correct'|'wrong'|'done'
  const [showHint, setShowHint]     = useState(false);
  const [solvedIds, setSolvedIds]   = useState(() => {
    return safeLoad('chess-solved-puzzles', []);
  });
  const boardTheme = buildBoardTheme(activeBoardTheme);
  const autoMoveTimer = useRef(null);

  const filteredPuzzles = filter === 'all' ? PUZZLES
    : PUZZLES.filter(p => p.difficulty === filter);

  const puzzle = puzzleIdx !== null ? filteredPuzzles[puzzleIdx] : null;

  // パズルを開く
  const openPuzzle = useCallback((idx) => {
    const p = filteredPuzzles[idx];
    chess.load(p.fen);
    setFen(chess.fen());
    setPuzzleIdx(idx);
    setMoveIdx(0);
    setSelectedSq(null);
    setLegalMoves([]);
    setLastMove(null);
    setStatus('idle');
    setShowHint(false);
    clearTimeout(autoMoveTimer.current);
  }, [chess, filteredPuzzles]);

  // 解答の自動応手（CPU側の手）
  const playOpponentMove = useCallback((p, nextIdx) => {
    if (nextIdx >= p.solution.length) return;
    autoMoveTimer.current = setTimeout(() => {
      const move = chess.move(p.solution[nextIdx]);
      if (move) {
        setFen(chess.fen());
        setLastMove({ from: move.from, to: move.to });
        setMoveIdx(nextIdx + 1);
        setStatus('idle');
      }
    }, 600);
  }, [chess]);

  // プレイヤーがマスをクリック
  const handleSquareClick = useCallback((square) => {
    if (!puzzle || status === 'done' || status === 'wrong') return;
    const turn = chess.turn();

    const piece = chess.get(square);

    if (selectedSq) {
      if (legalMoves.includes(square)) {
        // 移動を試みる
        const expectedSan = puzzle.solution[moveIdx];
        const move = chess.move({ from: selectedSq, to: square, promotion: 'q' });
        if (!move) { setSelectedSq(null); setLegalMoves([]); return; }

        setLastMove({ from: move.from, to: move.to });
        setFen(chess.fen());
        setSelectedSq(null);
        setLegalMoves([]);

        const normalizedSan = move.san.replace(/[+#]/g, '');
        const normalizedExp = expectedSan.replace(/[+#]/g, '');

        if (normalizedSan === normalizedExp) {
          const nextIdx = moveIdx + 1;
          if (nextIdx >= puzzle.solution.length) {
            // 解答完了
            setStatus('done');
            setSolvedIds(prev => {
              const updated = prev.includes(puzzle.id) ? prev : [...prev, puzzle.id];
              safeSave('chess-solved-puzzles', updated);
              return updated;
            });
          } else {
            // CPU応手
            setStatus('correct');
            playOpponentMove(puzzle, nextIdx);
          }
        } else {
          // 不正解 → 1秒後に戻す
          setStatus('wrong');
          setTimeout(() => {
            chess.undo();
            setFen(chess.fen());
            setLastMove(null);
            setStatus('idle');
          }, 900);
        }
        return;
      }

      if (piece && piece.color === turn) {
        setSelectedSq(square);
        setLegalMoves(chess.moves({ square, verbose: true }).map(m => m.to));
        return;
      }

      setSelectedSq(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === turn) {
      setSelectedSq(square);
      setLegalMoves(chess.moves({ square, verbose: true }).map(m => m.to));
    }
  }, [puzzle, status, chess, selectedSq, legalMoves, moveIdx, playOpponentMove]);

  useEffect(() => () => clearTimeout(autoMoveTimer.current), []);

  // ── リストビュー ──
  if (puzzleIdx === null) {
    return (
      <div className="puzzle-overlay" onClick={onClose}>
        <div className="puzzle-modal" onClick={e => e.stopPropagation()}>
          <div className="puzzle-modal-header">
            <h2 className="puzzle-modal-title">🧩 チェスパズル</h2>
            <button className="stats-close" onClick={onClose}>✕</button>
          </div>

          <div className="puzzle-filter-row">
            {PUZZLE_THEMES.map(t => (
              <button
                key={t.id}
                className={`puzzle-filter-btn ${filter === t.id ? 'puzzle-filter-active' : ''}`}
                onClick={() => setFilter(t.id)}
              >{t.label}</button>
            ))}
          </div>

          <div className="puzzle-list">
            {filteredPuzzles.map((p, i) => {
              const solved = solvedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`puzzle-list-item ${solved ? 'puzzle-solved' : ''}`}
                  onClick={() => openPuzzle(i)}
                >
                  <div className="puzzle-list-left">
                    <span className="puzzle-list-status">{solved ? '✅' : '⬜'}</span>
                    <div>
                      <p className="puzzle-list-title">{p.title}</p>
                      <p className="puzzle-list-theme">{p.themeLabel}</p>
                    </div>
                  </div>
                  <span
                    className="puzzle-list-diff"
                    style={{ color: DIFF_COLOR[p.difficulty] }}
                  >{DIFF_LABEL[p.difficulty]}</span>
                </button>
              );
            })}
          </div>

          <p className="puzzle-solved-count">
            解いた問題：{solvedIds.filter(id => PUZZLES.find(p => p.id === id)).length} / {PUZZLES.length}
          </p>
        </div>
      </div>
    );
  }

  // ── パズル解答ビュー ──
  // FENの2トークン目が初期手番。move/undoで変化しないよう固定値として使う
  const puzzlePlayerColor = puzzle.fen.split(' ')[1]; // 'w' | 'b'
  const flipped = puzzlePlayerColor === 'b';

  return (
    <div className="puzzle-overlay" onClick={onClose}>
      <div className="puzzle-modal puzzle-modal-play" onClick={e => e.stopPropagation()}>
        <div className="puzzle-modal-header">
          <button className="puzzle-back-btn" onClick={() => { setPuzzleIdx(null); clearTimeout(autoMoveTimer.current); }}>
            ← 一覧
          </button>
          <h2 className="puzzle-modal-title">{puzzle.title}</h2>
          <button className="stats-close" onClick={onClose}>✕</button>
        </div>

        {/* パズル情報 */}
        <div className="puzzle-info-row">
          <span className="puzzle-theme-badge">{puzzle.themeLabel}</span>
          <span className="puzzle-diff-badge" style={{ color: DIFF_COLOR[puzzle.difficulty] }}>
            {DIFF_LABEL[puzzle.difficulty]}
          </span>
          <span className="puzzle-turn-label">
            {puzzlePlayerColor === 'w' ? '白番（先手）の一手' : '黒番（後手）の一手'}
          </span>
        </div>

        {/* ステータスバナー */}
        {status === 'done' && (
          <div className="puzzle-banner puzzle-banner-done">🎉 正解！ 素晴らしい！</div>
        )}
        {status === 'wrong' && (
          <div className="puzzle-banner puzzle-banner-wrong">❌ 不正解。もう一度試してみよう！</div>
        )}
        {status === 'correct' && (
          <div className="puzzle-banner puzzle-banner-correct">✓ 正解！ 続きを指してみよう</div>
        )}

        {/* ボード */}
        <div className="puzzle-board-wrap">
          <ChessBoard
            board={chess.board()}
            selectedSquare={selectedSq}
            legalMoves={legalMoves}
            lastMove={lastMove}
            gameStatus="playing"
            boardTheme={boardTheme}
            pieceSet={activePieceSet}
            hint={null}
            flipped={flipped}
            onSquareClick={handleSquareClick}
            onDrop={() => {}}
            onCancelDrag={() => {}}
          />
        </div>

        {/* ヒント・ナビ */}
        <div className="puzzle-actions">
          {status !== 'done' && (
            <button
              className="puzzle-hint-btn"
              onClick={() => setShowHint(h => !h)}
            >
              💡 {showHint ? 'ヒントを隠す' : 'ヒントを見る'}
            </button>
          )}
          {showHint && status !== 'done' && (
            <p className="puzzle-hint-text">{puzzle.hint}</p>
          )}
          {status === 'done' && (
            <div className="puzzle-next-row">
              {puzzleIdx + 1 < filteredPuzzles.length && (
                <button className="puzzle-next-btn" onClick={() => openPuzzle(puzzleIdx + 1)}>
                  次の問題 →
                </button>
              )}
              <button className="puzzle-retry-btn" onClick={() => openPuzzle(puzzleIdx)}>
                もう一度
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
