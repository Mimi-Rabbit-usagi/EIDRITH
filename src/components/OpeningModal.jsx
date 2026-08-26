import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { OPENINGS } from '../data/openings';
import ChessBoard from './ChessBoard';
import { BOARD_THEMES } from '../data/themes';
import { safeLoad, safeSave } from '../lib/storage';

function buildBoardTheme(activeTheme) {
  return BOARD_THEMES.find(t => t.id === activeTheme) || BOARD_THEMES[0];
}

function getCategory(o) {
  const first = o.moves[0];
  if (first === 'e4') return 'e4';
  if (first === 'd4') return 'd4';
  return 'other';
}

const CATEGORIES = [
  { id: 'all',   label: 'すべて' },
  { id: 'e4',    label: 'e4系' },
  { id: 'd4',    label: 'd4系' },
  { id: 'other', label: 'その他' },
];

export default function OpeningModal({ activeBoardTheme, activePieceSet, onClose }) {
  const [filter, setFilter]         = useState('all');
  const [opening, setOpening]       = useState(null);
  const [practiceColor, setPracticeColor] = useState('w');
  const [chess]                     = useState(() => new Chess());
  // chess は破壊的に更新されるため、setFen を再レンダーの引き金としてのみ使う
  const [, setFen]                  = useState('');
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove]     = useState(null);
  const [moveIdx, setMoveIdx]       = useState(0);
  const [status, setStatus]         = useState('idle'); // 'idle'|'wrong'|'done'
  const [solvedIds, setSolvedIds]   = useState(() => {
    return safeLoad('chess-opening-practice', []);
  });
  const boardTheme = buildBoardTheme(activeBoardTheme);
  const autoTimer  = useRef(null);

  const filteredOpenings = filter === 'all' ? OPENINGS
    : OPENINGS.filter(o => getCategory(o) === filter);

  // Auto-play one CPU move at position idx
  const playOpponentMove = useCallback((op, idx) => {
    if (idx >= op.moves.length) return;
    autoTimer.current = setTimeout(() => {
      const move = chess.move(op.moves[idx]);
      if (move) {
        setFen(chess.fen());
        setLastMove({ from: move.from, to: move.to });
        const next = idx + 1;
        setMoveIdx(next);
        if (next >= op.moves.length) {
          setStatus('done');
          setSolvedIds(prev => {
            const updated = prev.includes(op.eco) ? prev : [...prev, op.eco];
            safeSave('chess-opening-practice', updated);
            return updated;
          });
        }
      }
    }, 600);
  }, [chess]);

  // Open / reset a practice session
  const openPractice = useCallback((op, colorOverride) => {
    const color = colorOverride ?? practiceColor;
    clearTimeout(autoTimer.current);
    chess.reset();
    setFen(chess.fen());
    setOpening(op);
    setMoveIdx(0);
    setSelectedSq(null);
    setLegalMoves([]);
    setLastMove(null);
    setStatus('idle');

    // If practicing as black, auto-play white's first move immediately
    if (color === 'b' && op.moves.length > 0) {
      autoTimer.current = setTimeout(() => {
        const move = chess.move(op.moves[0]);
        if (move) {
          setFen(chess.fen());
          setLastMove({ from: move.from, to: move.to });
          const next = 1;
          setMoveIdx(next);
          if (next >= op.moves.length) setStatus('done');
        }
      }, 400);
    }
  }, [chess, practiceColor]);

  const handleSquareClick = useCallback((square) => {
    if (!opening || status === 'done' || status === 'wrong') return;
    // Is it the user's turn?
    const turnColor = moveIdx % 2 === 0 ? 'w' : 'b';
    if (turnColor !== practiceColor) return;

    const piece = chess.get(square);
    const turn  = chess.turn();

    if (selectedSq) {
      if (legalMoves.includes(square)) {
        const move = chess.move({ from: selectedSq, to: square, promotion: 'q' });
        if (!move) { setSelectedSq(null); setLegalMoves([]); return; }

        setLastMove({ from: move.from, to: move.to });
        setFen(chess.fen());
        setSelectedSq(null);
        setLegalMoves([]);

        const actual   = move.san.replace(/[+#]/g, '');
        const expected = opening.moves[moveIdx].replace(/[+#]/g, '');

        if (actual === expected) {
          const next = moveIdx + 1;
          if (next >= opening.moves.length) {
            setMoveIdx(next);
            setStatus('done');
            setSolvedIds(prev => {
              const updated = prev.includes(opening.eco) ? prev : [...prev, opening.eco];
              safeSave('chess-opening-practice', updated);
              return updated;
            });
          } else {
            setMoveIdx(next);
            // If next move belongs to CPU, auto-play it
            const nextColor = next % 2 === 0 ? 'w' : 'b';
            if (nextColor !== practiceColor) {
              playOpponentMove(opening, next);
            }
          }
        } else {
          // Wrong: undo after 800ms
          setStatus('wrong');
          setTimeout(() => {
            chess.undo();
            setFen(chess.fen());
            setLastMove(null);
            setStatus('idle');
          }, 800);
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
  }, [opening, status, chess, selectedSq, legalMoves, moveIdx, practiceColor, playOpponentMove]);

  useEffect(() => () => clearTimeout(autoTimer.current), []);

  // ── リストビュー ────────────────────────────────────────────────────────────
  if (!opening) {
    return (
      <div className="puzzle-overlay" onClick={onClose}>
        <div className="puzzle-modal" onClick={e => e.stopPropagation()}>
          <div className="puzzle-modal-header">
            <h2 className="puzzle-modal-title">📖 定跡練習</h2>
            <button className="stats-close" onClick={onClose}>✕</button>
          </div>

          <div className="puzzle-filter-row">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`puzzle-filter-btn ${filter === c.id ? 'puzzle-filter-active' : ''}`}
                onClick={() => setFilter(c.id)}
              >{c.label}</button>
            ))}
          </div>

          <div className="puzzle-list">
            {filteredOpenings.map(o => {
              const done = solvedIds.includes(o.eco);
              return (
                <button
                  key={o.eco}
                  className={`puzzle-list-item ${done ? 'puzzle-solved' : ''}`}
                  onClick={() => openPractice(o)}
                >
                  <div className="puzzle-list-left">
                    <span className="puzzle-list-status">{done ? '✅' : '⬜'}</span>
                    <div>
                      <p className="puzzle-list-title">{o.name}</p>
                      <p className="puzzle-list-theme">{o.eco} · {o.moves.length}手</p>
                    </div>
                  </div>
                  <span className="opening-name-en">{o.nameEn}</span>
                </button>
              );
            })}
          </div>

          <p className="puzzle-solved-count">
            練習済み：{solvedIds.filter(id => OPENINGS.find(o => o.eco === id)).length} / {OPENINGS.length}
          </p>
        </div>
      </div>
    );
  }

  // ── 練習ビュー ──────────────────────────────────────────────────────────────
  const flipped        = practiceColor === 'b';
  const totalMoves     = opening.moves.length;
  const isUserTurn     = moveIdx < totalMoves && (moveIdx % 2 === 0 ? 'w' : 'b') === practiceColor;

  return (
    <div className="puzzle-overlay" onClick={onClose}>
      <div className="puzzle-modal puzzle-modal-play" onClick={e => e.stopPropagation()}>
        <div className="puzzle-modal-header">
          <button
            className="puzzle-back-btn"
            onClick={() => { setOpening(null); clearTimeout(autoTimer.current); }}
          >← 一覧</button>
          <h2 className="puzzle-modal-title">{opening.name}</h2>
          <button className="stats-close" onClick={onClose}>✕</button>
        </div>

        <div className="puzzle-info-row">
          <span className="puzzle-theme-badge">{opening.eco}</span>
          <span className="puzzle-theme-badge">{totalMoves}手の定跡</span>
          <span className="opening-color-toggle">
            <button
              className={`opening-color-btn ${practiceColor === 'w' ? 'active' : ''}`}
              onClick={() => { setPracticeColor('w'); openPractice(opening, 'w'); }}
            >♔ 白</button>
            <button
              className={`opening-color-btn ${practiceColor === 'b' ? 'active' : ''}`}
              onClick={() => { setPracticeColor('b'); openPractice(opening, 'b'); }}
            >♚ 黒</button>
          </span>
        </div>

        {/* 進捗バー */}
        <div className="opening-progress">
          <div className="opening-progress-bar" style={{ width: `${(moveIdx / totalMoves) * 100}%` }} />
          <span className="opening-progress-text">{moveIdx} / {totalMoves}</span>
        </div>

        {/* ステータスバナー */}
        {status === 'done' && (
          <div className="puzzle-banner puzzle-banner-done">🎉 定跡完了！素晴らしい！</div>
        )}
        {status === 'wrong' && (
          <div className="puzzle-banner puzzle-banner-wrong">
            ❌ 違います。正しい手: <strong>{opening.moves[moveIdx]}</strong>
          </div>
        )}
        {status === 'idle' && isUserTurn && (
          <div className="puzzle-banner puzzle-banner-info">
            {practiceColor === 'w' ? '♔ あなた（白）の番' : '♚ あなた（黒）の番'}
          </div>
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

        {/* 定跡説明 & ボタン */}
        <div className="puzzle-actions">
          {opening.description && (
            <p className="opening-description">{opening.description}</p>
          )}
          {status === 'done' && (
            <div className="puzzle-next-row">
              <button className="puzzle-retry-btn" onClick={() => openPractice(opening)}>
                もう一度
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
