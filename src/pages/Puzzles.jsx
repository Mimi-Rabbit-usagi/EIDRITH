import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { PUZZLES, PUZZLE_THEMES } from '../data/puzzles';
import ChessBoard from '../components/ChessBoard';
import NavBar from '../components/NavBar';
import { BOARD_THEMES } from '../data/themes';

const DIFF_COLOR = { easy: '#4CAF50', normal: '#FF9800', hard: '#F44336' };
const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };

function loadPrefs() {
  try {
    const d = JSON.parse(localStorage.getItem('chess-master-data') || '{}');
    return {
      activeBoardTheme: d.activeBoardTheme || 'classic',
      activePieceSet:   d.activePieceSet   || 'classic',
    };
  } catch { return { activeBoardTheme: 'classic', activePieceSet: 'classic' }; }
}

export default function Puzzles() {
  const prefs = loadPrefs();
  const boardTheme = BOARD_THEMES.find(t => t.id === prefs.activeBoardTheme) || BOARD_THEMES[0];
  const pieceSet   = prefs.activePieceSet;

  const [filter, setFilter]         = useState('all');
  const [puzzleIdx, setPuzzleIdx]   = useState(null);
  const [chess]                     = useState(() => new Chess());
  const [fen, setFen]               = useState('');
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove]     = useState(null);
  const [moveIdx, setMoveIdx]       = useState(0);
  const [status, setStatus]         = useState('idle'); // 'idle'|'correct'|'wrong'|'done'
  const [showHint, setShowHint]     = useState(false);
  const [solvedIds, setSolvedIds]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('chess-solved-puzzles') || '[]'); } catch { return []; }
  });
  const autoMoveTimer = useRef(null);

  const filteredPuzzles = filter === 'all' ? PUZZLES : PUZZLES.filter(p => p.difficulty === filter);
  const puzzle = puzzleIdx !== null ? filteredPuzzles[puzzleIdx] : null;

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

  const handleSquareClick = useCallback((square) => {
    if (!puzzle || status === 'done' || status === 'wrong') return;
    const turn = chess.turn();
    const piece = chess.get(square);

    if (selectedSq) {
      if (legalMoves.includes(square)) {
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
            setStatus('done');
            setSolvedIds(prev => {
              const updated = prev.includes(puzzle.id) ? prev : [...prev, puzzle.id];
              localStorage.setItem('chess-solved-puzzles', JSON.stringify(updated));
              return updated;
            });
          } else {
            setStatus('correct');
            playOpponentMove(puzzle, nextIdx);
          }
        } else {
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

  const solvedCount = solvedIds.filter(id => PUZZLES.find(p => p.id === id)).length;

  // ── 一覧ビュー ──────────────────────────────────────────────────────────────
  if (puzzleIdx === null) {
    return (
      <div className="puzzles-container">
        <div className="home-bg-glow home-bg-glow--left" />
        <NavBar />

        <div className="puzzles-inner">
          <div className="puzzles-page-header">
            <div>
              <h1 className="puzzles-title">🧩 チェスパズル</h1>
              <p className="puzzles-subtitle">戦術問題を解いて実力を磨こう</p>
            </div>
            <div className="puzzles-progress">
              <span className="puzzles-progress-num">{solvedCount}</span>
              <span className="puzzles-progress-denom">/ {PUZZLES.length}</span>
              <span className="puzzles-progress-label">クリア</span>
            </div>
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

          <div className="puzzles-list">
            {filteredPuzzles.map((p, i) => {
              const solved = solvedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`puzzle-list-item ${solved ? 'puzzle-solved' : ''}`}
                  style={{ '--diff-color': DIFF_COLOR[p.difficulty] }}
                  onClick={() => openPuzzle(i)}
                >
                  <div className="puzzle-list-left">
                    <span className={`puzzle-list-status-dot ${solved ? 'puzzle-list-status-dot--done' : ''}`} />
                    <div>
                      <p className="puzzle-list-title">{p.title}</p>
                      <p className="puzzle-list-theme">{p.themeLabel}</p>
                    </div>
                  </div>
                  <span className="puzzle-list-diff" style={{ color: DIFF_COLOR[p.difficulty] }}>
                    {DIFF_LABEL[p.difficulty]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── 解答ビュー ──────────────────────────────────────────────────────────────
  const puzzlePlayerColor = puzzle.fen.split(' ')[1]; // 'w' | 'b'
  const flipped = puzzlePlayerColor === 'b';

  return (
    <div className="puzzles-container">
      <div className="home-bg-glow home-bg-glow--left" />
      <NavBar />

      <div className="puzzles-play-layout">
        {/* 左：ボード */}
        <div className="puzzles-board-col">
          <div className="puzzle-turn-banner">
            {puzzlePlayerColor === 'w' ? '⬜ 白番（先手）の一手を探せ！' : '⬛ 黒番（後手）の一手を探せ！'}
          </div>

          {status === 'done'    && <div className="puzzle-banner puzzle-banner-done">🎉 正解！ 素晴らしい！</div>}
          {status === 'wrong'   && <div className="puzzle-banner puzzle-banner-wrong">❌ 不正解。もう一度！</div>}
          {status === 'correct' && <div className="puzzle-banner puzzle-banner-correct">✓ 正解！ 続きを指して</div>}

          <ChessBoard
            board={chess.board()}
            selectedSquare={selectedSq}
            legalMoves={legalMoves}
            lastMove={lastMove}
            gameStatus="playing"
            boardTheme={boardTheme}
            pieceSet={pieceSet}
            hint={null}
            flipped={flipped}
            onSquareClick={handleSquareClick}
            onDrop={() => {}}
            onCancelDrag={() => {}}
          />
        </div>

        {/* 右：情報パネル */}
        <div className="puzzles-info-col">
          <button
            className="puzzles-back-btn"
            onClick={() => { setPuzzleIdx(null); clearTimeout(autoMoveTimer.current); }}
          >
            ← 一覧に戻る
          </button>

          <div className="puzzles-puzzle-meta">
            <h2 className="puzzles-puzzle-title">{puzzle.title}</h2>
            <div className="puzzles-badges">
              <span className="puzzle-theme-badge">{puzzle.themeLabel}</span>
              <span className="puzzle-diff-badge" style={{ color: DIFF_COLOR[puzzle.difficulty] }}>
                {DIFF_LABEL[puzzle.difficulty]}
              </span>
            </div>
          </div>

          <div className="puzzles-actions">
            {status !== 'done' && (
              <button className="puzzle-hint-btn" onClick={() => setShowHint(h => !h)}>
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

          <div className="puzzles-progress-mini">
            {puzzleIdx + 1} / {filteredPuzzles.length} 問目
          </div>
        </div>
      </div>
    </div>
  );
}
