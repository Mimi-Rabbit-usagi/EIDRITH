import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { OPENINGS } from '../data/openings';
import NavBar from '../components/NavBar';
import ChessBoard from '../components/ChessBoard';
import { BOARD_THEMES } from '../data/themes';
import { safeLoad, safeSave, loadGameData } from '../lib/storage';

function buildBoardTheme(themeId) {
  return BOARD_THEMES.find(t => t.id === themeId) || BOARD_THEMES[0];
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

export default function Openings() {
  const navigate = useNavigate();
  const gameData = loadGameData();
  const boardTheme = buildBoardTheme(gameData.activeBoardTheme);
  const pieceSet   = gameData.activePieceSet;

  const [filter, setFilter]         = useState('all');
  const [opening, setOpening]       = useState(null);
  const [practiceColor, setPracticeColor] = useState('w');
  const [chess]                     = useState(() => new Chess());
  const [fen, setFen]               = useState('');
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove]     = useState(null);
  const [moveIdx, setMoveIdx]       = useState(0);
  const [status, setStatus]         = useState('idle'); // 'idle'|'wrong'|'done'
  const [solvedIds, setSolvedIds]   = useState(() => safeLoad('chess-opening-practice', []));
  const autoTimer = useRef(null);

  const filteredOpenings = filter === 'all' ? OPENINGS
    : OPENINGS.filter(o => getCategory(o) === filter);

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
            const nextColor = next % 2 === 0 ? 'w' : 'b';
            if (nextColor !== practiceColor) {
              playOpponentMove(opening, next);
            }
          }
        } else {
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

  const solvedCount = solvedIds.filter(id => OPENINGS.find(o => o.eco === id)).length;

  // ── 練習ビュー ──────────────────────────────────────────────────────────────
  if (opening) {
    const flipped    = practiceColor === 'b';
    const totalMoves = opening.moves.length;
    const isUserTurn = moveIdx < totalMoves && (moveIdx % 2 === 0 ? 'w' : 'b') === practiceColor;

    return (
      <div className="openings-page">
        <NavBar />
        <div className="openings-practice-wrap">
          <div className="openings-practice-header">
            <button
              className="openings-back-btn"
              onClick={() => { setOpening(null); clearTimeout(autoTimer.current); }}
            >← 一覧に戻る</button>
            <h2 className="openings-practice-title">{opening.name}</h2>
            <span className="openings-practice-subtitle">{opening.nameEn}</span>
          </div>

          <div className="openings-practice-body">
            {/* 左: ボード */}
            <div className="openings-board-col">
              <div className="openings-info-row">
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

              <div className="openings-board-wrap">
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
            </div>

            {/* 右: 説明・手順 */}
            <div className="openings-detail-col">
              {opening.description && (
                <p className="openings-description">{opening.description}</p>
              )}
              <div className="openings-moves-list">
                <h3 className="openings-moves-title">手順</h3>
                <div className="openings-moves-grid">
                  {Array.from({ length: Math.ceil(opening.moves.length / 2) }, (_, i) => {
                    const wIdx = i * 2;
                    const bIdx = i * 2 + 1;
                    const wPlayed = wIdx < moveIdx;
                    const bPlayed = bIdx < moveIdx;
                    const wCurrent = wIdx === moveIdx - 1 && moveIdx > 0;
                    const bCurrent = bIdx === moveIdx - 1 && moveIdx > 0;
                    return (
                      <div key={i} className="openings-move-row">
                        <span className="openings-move-num">{i + 1}.</span>
                        <span className={`openings-move-san ${wPlayed ? 'move-played' : ''} ${wCurrent ? 'move-current' : ''}`}>
                          {opening.moves[wIdx]}
                        </span>
                        {opening.moves[bIdx] && (
                          <span className={`openings-move-san ${bPlayed ? 'move-played' : ''} ${bCurrent ? 'move-current' : ''}`}>
                            {opening.moves[bIdx]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {status === 'done' && (
                <button className="puzzle-retry-btn" onClick={() => openPractice(opening)}>
                  もう一度練習
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── リストビュー ────────────────────────────────────────────────────────────
  return (
    <div className="openings-page">
      <div className="home-bg-glow home-bg-glow--left" />
      <NavBar />

      <section className="openings-hero">
        <h1 className="openings-title">📖 定跡ライブラリ</h1>
        <p className="openings-subtitle">
          序盤の定跡を学び、練習しよう。
        </p>
        <p className="openings-progress-summary">
          練習済み: <strong>{solvedCount}</strong> / {OPENINGS.length}
        </p>
      </section>

      <section className="openings-list-section">
        <div className="puzzle-filter-row">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`puzzle-filter-btn ${filter === c.id ? 'puzzle-filter-active' : ''}`}
              onClick={() => setFilter(c.id)}
            >{c.label}</button>
          ))}
        </div>

        <div className="openings-grid">
          {filteredOpenings.map(o => {
            const done = solvedIds.includes(o.eco);
            const category = getCategory(o);
            return (
              <button
                key={o.eco}
                className={`openings-card ${done ? 'openings-card--done' : ''}`}
                onClick={() => openPractice(o)}
              >
                <div className="openings-card-top">
                  <span className="openings-card-eco">{o.eco}</span>
                  <span className={`openings-card-cat openings-cat--${category}`}>
                    {category === 'e4' ? 'e4系' : category === 'd4' ? 'd4系' : 'その他'}
                  </span>
                  {done && <span className="openings-card-check">✅</span>}
                </div>
                <p className="openings-card-name">{o.name}</p>
                <p className="openings-card-name-en">{o.nameEn}</p>
                <p className="openings-card-moves">{o.moves.length}手</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
