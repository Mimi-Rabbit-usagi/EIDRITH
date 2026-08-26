import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import { PUZZLES, PUZZLE_THEMES } from '../data/puzzles';
import ChessBoard from '../components/ChessBoard';
import NavBar from '../components/NavBar';
import { BOARD_THEMES } from '../data/themes';
import {
  loadGameData, safeLoad, safeSave,
  getTodayDateString, getDailyPuzzleIndex, loadDailyInfo, saveDailyPuzzleSolved,
  loadTrainingStats, saveTrainingStats,
} from '../lib/storage';

const DIFF_COLOR = { easy: '#4CAF50', normal: '#FF9800', hard: '#F44336' };
const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };

const TRAINING_TIERS = [
  { id: 'easy',   label: 'かんたん',   promoteAt: 3, color: '#4CAF50' },
  { id: 'normal', label: 'ふつう',     promoteAt: 3, color: '#FF9800' },
  { id: 'hard',   label: 'むずかしい', promoteAt: 3, color: '#F44336' },
];
const TIER_RANK = { easy: 0, normal: 1, hard: 2 };

function loadPrefs() {
  const d = loadGameData();
  return {
    activeBoardTheme: d.activeBoardTheme || 'classic',
    activePieceSet:   d.activePieceSet   || 'classic',
  };
}

export default function Puzzles() {
  const prefs = loadPrefs();
  const boardTheme = BOARD_THEMES.find(t => t.id === prefs.activeBoardTheme) || BOARD_THEMES[0];
  const pieceSet   = prefs.activePieceSet;

  const location = useLocation();
  const isDaily  = new URLSearchParams(location.search).get('daily') === 'true';

  const today          = getTodayDateString();
  const dailyIdx       = getDailyPuzzleIndex(today, PUZZLES.length);
  const [dailyInfo, setDailyInfo] = useState(() => loadDailyInfo());
  const todaySolved    = dailyInfo.lastSolvedDate === today;

  const [filter, setFilter]         = useState('all');
  // ?daily=true で来たときは最初からデイリーパズルを開いた状態にする。
  // （effect で後から開くと、一覧が一瞬見えてから切り替わってしまう）
  const [puzzleIdx, setPuzzleIdx]   = useState(isDaily ? dailyIdx : null);
  const [chess]                     = useState(() => {
    const c = new Chess();
    if (isDaily) c.load(PUZZLES[dailyIdx].fen);
    return c;
  });
  // chess は破壊的に更新されるため、setFen を再レンダーの引き金としてのみ使う
  const [, setFen]                  = useState('');
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove]     = useState(null);
  const [moveIdx, setMoveIdx]       = useState(0);
  const [status, setStatus]         = useState('idle'); // 'idle'|'correct'|'wrong'|'done'
  const [showHint, setShowHint]     = useState(false);
  const [solvedIds, setSolvedIds]   = useState(() => {
    return safeLoad('chess-solved-puzzles', []);
  });
  const [solutionMode, setSolutionMode] = useState(false);
  const [solutionStep, setSolutionStep] = useState(-1);
  const autoMoveTimer  = useRef(null);
  const solutionTimers = useRef([]);

  // トレーニング関連
  const [isTraining, setIsTraining]           = useState(false);
  const [trainingTier, setTrainingTier]       = useState('easy');
  const [trainingStreak, setTrainingStreak]   = useState(0);
  const [trainingSession, setTrainingSession] = useState({ correct: 0, total: 0 });
  // 値は画面に出さず localStorage への保存にのみ使う（updater の prev で参照）
  const [, setTrainingStats]                  = useState(() => loadTrainingStats());
  const [promoted, setPromoted]               = useState(false);

  const filteredPuzzles = filter === 'all' ? PUZZLES : PUZZLES.filter(p => p.difficulty === filter);
  const puzzle = puzzleIdx !== null ? filteredPuzzles[puzzleIdx] : null;

  const clearSolutionTimers = useCallback(() => {
    solutionTimers.current.forEach(clearTimeout);
    solutionTimers.current = [];
  }, []);

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
    setSolutionMode(false);
    setSolutionStep(-1);
    clearTimeout(autoMoveTimer.current);
    clearSolutionTimers();
  }, [chess, filteredPuzzles, clearSolutionTimers]);

  const startSolutionReplay = useCallback(() => {
    if (!puzzle) return;
    clearTimeout(autoMoveTimer.current);
    clearSolutionTimers();
    chess.load(puzzle.fen);
    setFen(chess.fen());
    setLastMove(null);
    setSelectedSq(null);
    setLegalMoves([]);
    setSolutionMode(true);
    setSolutionStep(-1);
    setStatus('idle');

    puzzle.solution.forEach((san, i) => {
      const t = setTimeout(() => {
        const move = chess.move(san);
        if (move) {
          setFen(chess.fen());
          setLastMove({ from: move.from, to: move.to });
          setSolutionStep(i);
        }
      }, (i + 1) * 900);
      solutionTimers.current.push(t);
    });
  }, [puzzle, chess, clearSolutionTimers]);

  // ── トレーニングの採点 ──────────────────────────────────────────────────────
  // 「正解した」「間違えた」はユーザー操作への応答なので、status の変化を effect で
  // 監視するのではなく、status を変える側（handleSquareClick）から直接呼ぶ。

  /** 正解時: streak を伸ばし、条件を満たせば tier を昇格させる */
  const recordTrainingCorrect = useCallback(() => {
    const newStreak = trainingStreak + 1;
    setTrainingStreak(newStreak);
    setTrainingSession(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));

    const tierCfg        = TRAINING_TIERS.find(t => t.id === trainingTier);
    const currentTierIdx = TRAINING_TIERS.findIndex(t => t.id === trainingTier);
    let nextTier = trainingTier;

    if (tierCfg && newStreak >= tierCfg.promoteAt && currentTierIdx < TRAINING_TIERS.length - 1) {
      nextTier = TRAINING_TIERS[currentTierIdx + 1].id;
      setTrainingTier(nextTier);
      setTrainingStreak(0);
      setPromoted(true);
    }

    setTrainingStats(prev => {
      const updated = {
        bestStreak:   Math.max(prev.bestStreak, newStreak),
        totalCorrect: prev.totalCorrect + 1,
        highestTier:  TIER_RANK[nextTier] > TIER_RANK[prev.highestTier ?? 'easy']
          ? nextTier : prev.highestTier,
      };
      saveTrainingStats(updated);
      return updated;
    });
  }, [trainingStreak, trainingTier]);

  /** 不正解時: streak をリセットして出題数だけ数える */
  const recordTrainingWrong = useCallback(() => {
    setTrainingStreak(0);
    setTrainingSession(prev => ({ ...prev, total: prev.total + 1 }));
  }, []);

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
    if (!puzzle || status === 'done' || status === 'wrong' || solutionMode) return;
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
            if (isTraining) recordTrainingCorrect();
            setSolvedIds(prev => {
              const updated = prev.includes(puzzle.id) ? prev : [...prev, puzzle.id];
              safeSave('chess-solved-puzzles', updated);
              return updated;
            });
            // デイリーパズルだった場合はストリークを更新
            if (puzzle.id === PUZZLES[dailyIdx].id) {
              const newStreak = saveDailyPuzzleSolved(today);
              setDailyInfo({ lastSolvedDate: today, streak: newStreak });
            }
          } else {
            setStatus('correct');
            playOpponentMove(puzzle, nextIdx);
          }
        } else {
          setStatus('wrong');
          if (isTraining) recordTrainingWrong();
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
  }, [puzzle, status, solutionMode, chess, selectedSq, legalMoves, moveIdx, playOpponentMove,
      isTraining, recordTrainingCorrect, recordTrainingWrong, dailyIdx, today]);

  // トレーニング：ランダムに問題を選んで直接ロード（filteredPuzzles を経由しない）
  const openTrainingPuzzle = useCallback((tier, excludeId = null) => {
    const pool = PUZZLES.filter(p => p.difficulty === tier && p.id !== excludeId);
    if (pool.length === 0) return;
    const p = pool[Math.floor(Math.random() * pool.length)];
    chess.load(p.fen);
    setFen(chess.fen());
    setFilter('all');
    setPuzzleIdx(PUZZLES.indexOf(p));
    setMoveIdx(0);
    setSelectedSq(null);
    setLegalMoves([]);
    setLastMove(null);
    setStatus('idle');
    setShowHint(false);
    setSolutionMode(false);
    setSolutionStep(-1);
    setPromoted(false);
    clearTimeout(autoMoveTimer.current);
    clearSolutionTimers();
  }, [chess, clearSolutionTimers]);

  const startTraining = useCallback(() => {
    setIsTraining(true);
    setTrainingTier('easy');
    setTrainingStreak(0);
    setTrainingSession({ correct: 0, total: 0 });
    setPromoted(false);
    openTrainingPuzzle('easy', null);
  }, [openTrainingPuzzle]);

  const stopTraining = useCallback(() => {
    setIsTraining(false);
    setPuzzleIdx(null);
    clearTimeout(autoMoveTimer.current);
  }, []);

  useEffect(() => () => {
    clearTimeout(autoMoveTimer.current);
    solutionTimers.current.forEach(clearTimeout);
  }, []);

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
            <div className="puzzles-header-right">
              <div className="puzzles-progress">
                <span className="puzzles-progress-num">{solvedCount}</span>
                <span className="puzzles-progress-denom">/ {PUZZLES.length}</span>
                <span className="puzzles-progress-label">クリア</span>
              </div>
              <button className="training-start-btn" onClick={startTraining}>
                🎯 トレーニング
              </button>
            </div>
          </div>

          {/* デイリーパズルバナー */}
          <div className={`daily-puzzle-banner ${todaySolved ? 'daily-puzzle-banner--solved' : ''}`}>
            <div className="daily-puzzle-banner-left">
              <span className="daily-puzzle-banner-icon">📅</span>
              <div>
                <p className="daily-puzzle-banner-title">今日のパズル</p>
                <p className="daily-puzzle-banner-meta">
                  {PUZZLES[dailyIdx].title}
                  {dailyInfo.streak > 0 && (
                    <span className="daily-puzzle-banner-streak">🔥 {dailyInfo.streak}日連続</span>
                  )}
                </p>
              </div>
            </div>
            {todaySolved ? (
              <span className="daily-puzzle-banner-done">✓ クリア済み</span>
            ) : (
              <button className="daily-puzzle-banner-btn" onClick={() => openPuzzle(dailyIdx)}>
                挑戦する →
              </button>
            )}
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
          {isTraining ? (
            <button className="puzzles-back-btn" onClick={stopTraining}>
              ✕ トレーニングを終了
            </button>
          ) : (
            <button
              className="puzzles-back-btn"
              onClick={() => { setPuzzleIdx(null); clearTimeout(autoMoveTimer.current); }}
            >
              ← 一覧に戻る
            </button>
          )}

          {/* トレーニングパネル */}
          {isTraining && (
            <div className="training-panel">
              <div className="training-tier-row">
                {TRAINING_TIERS.map((t, i) => {
                  const tierIdx = TRAINING_TIERS.findIndex(x => x.id === trainingTier);
                  const state = i < tierIdx ? 'done' : i === tierIdx ? 'current' : 'locked';
                  return (
                    <div key={t.id} className={`training-tier-badge training-tier-badge--${state}`}
                      style={state === 'current' ? { borderColor: t.color, color: t.color } : {}}>
                      {t.label}
                    </div>
                  );
                })}
              </div>
              <div className="training-streak-row">
                <span className="training-streak-icon">🔥</span>
                <span className="training-streak-val">{trainingStreak}</span>
                <span className="training-streak-label">連続正解</span>
                {(() => {
                  const cfg = TRAINING_TIERS.find(t => t.id === trainingTier);
                  const tierIdx = TRAINING_TIERS.findIndex(t => t.id === trainingTier);
                  const remaining = cfg ? cfg.promoteAt - trainingStreak : 0;
                  if (!cfg || tierIdx >= TRAINING_TIERS.length - 1 || remaining <= 0) return null;
                  return (
                    <span className="training-promote-hint">
                      昇格まで {remaining} 問
                    </span>
                  );
                })()}
              </div>
              {promoted && (
                <div className="training-promoted-banner">
                  🎉 {DIFF_LABEL[trainingTier]} へ昇格！
                </div>
              )}
              <div className="training-session-row">
                セッション: {trainingSession.correct} / {trainingSession.total} 正解
              </div>
            </div>
          )}

          <div className="puzzles-puzzle-meta">
            <h2 className="puzzles-puzzle-title">{puzzle.title}</h2>
            <div className="puzzles-badges">
              <span className="puzzle-theme-badge">{puzzle.themeLabel}</span>
              <span className="puzzle-diff-badge" style={{ color: DIFF_COLOR[puzzle.difficulty] }}>
                {DIFF_LABEL[puzzle.difficulty]}
              </span>
            </div>
          </div>

          {/* 解答手順パネル */}
          <div className="puzzles-solution-panel">
            <div className="puzzles-solution-header">
              <span>解答手順</span>
              {solutionMode && <span className="puzzles-solution-badge">▶ 再生中</span>}
            </div>
            <div className="puzzles-solution-moves">
              {Array.from({ length: Math.ceil(puzzle.solution.length / 2) }, (_, i) => {
                const wIdx = i * 2;
                const bIdx = i * 2 + 1;
                const reveal = solutionMode || status === 'done';
                return (
                  <div key={i} className="puzzles-solution-row">
                    <span className="puzzles-sol-num">{i + 1}.</span>
                    <span className={[
                      'puzzles-sol-move',
                      reveal ? 'sol-revealed' : 'sol-hidden',
                      solutionStep === wIdx ? 'sol-current' : '',
                    ].filter(Boolean).join(' ')}>
                      {reveal ? puzzle.solution[wIdx] : '??'}
                    </span>
                    {puzzle.solution[bIdx] !== undefined && (
                      <span className={[
                        'puzzles-sol-move',
                        reveal ? 'sol-revealed' : 'sol-hidden',
                        solutionStep === bIdx ? 'sol-current' : '',
                      ].filter(Boolean).join(' ')}>
                        {reveal ? puzzle.solution[bIdx] : '??'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="puzzles-actions">
            {status !== 'done' && !solutionMode && (
              <>
                <button className="puzzle-hint-btn" onClick={() => setShowHint(h => !h)}>
                  💡 {showHint ? 'ヒントを隠す' : 'ヒントを見る'}
                </button>
                <button className="puzzle-solution-btn" onClick={startSolutionReplay}>
                  📖 解答を見る
                </button>
              </>
            )}
            {showHint && status !== 'done' && !solutionMode && (
              <p className="puzzle-hint-text">{puzzle.hint}</p>
            )}
            {solutionMode && (
              <button className="puzzle-retry-btn" onClick={() => openPuzzle(puzzleIdx)}>
                もう一度挑戦する
              </button>
            )}
            {status === 'done' && isTraining && (
              <button
                className="puzzle-next-btn"
                onClick={() => openTrainingPuzzle(trainingTier, puzzle?.id)}
              >
                次の問題 →
              </button>
            )}
            {status === 'done' && !isTraining && (
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
