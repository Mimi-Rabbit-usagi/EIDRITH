import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import NavBar from '../components/NavBar';
import ChessBoard from '../components/ChessBoard';
import { BOARD_THEMES } from '../data/themes';
import { loadGameData, safeLoad, safeSave } from '../lib/storage';
import { ENDGAME_LESSONS } from '../data/endgameLessons';

function buildBoardTheme(themeId) {
  return BOARD_THEMES.find(t => t.id === themeId) || BOARD_THEMES[0];
}

export default function Endgame() {
  const gameData = loadGameData();
  const boardTheme = buildBoardTheme(gameData.activeBoardTheme);
  const pieceSet   = gameData.activePieceSet;

  // completedIds: lessonId + '-' + stepId pairs
  const [completedSteps, setCompletedSteps] = useState(
    () => safeLoad('chess-endgame-progress', [])
  );
  const [lessonId, setLessonId]   = useState(null);
  const [stepIdx, setStepIdx]     = useState(0);

  // Board state for current step
  const [chess]       = useState(() => new Chess());
  // chess は破壊的に更新されるため、setFen を再レンダーの引き金としてのみ使う
  const [, setFen]    = useState('');
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove]     = useState(null);
  const [status, setStatus]         = useState('idle'); // 'idle'|'correct'|'wrong'

  const lesson = ENDGAME_LESSONS.find(l => l.id === lessonId);
  const step   = lesson ? lesson.steps[stepIdx] : null;

  const loadStep = useCallback((les, idx) => {
    const s = les.steps[idx];
    chess.load(s.fen);
    setFen(chess.fen());
    setSelectedSq(null);
    setLegalMoves([]);
    setLastMove(null);
    setStatus('idle');
  }, [chess]);

  const openLesson = useCallback((id) => {
    const les = ENDGAME_LESSONS.find(l => l.id === id);
    if (!les) return;
    setLessonId(id);
    setStepIdx(0);
    loadStep(les, 0);
  }, [loadStep]);

  const goNext = useCallback(() => {
    if (!lesson) return;
    const next = stepIdx + 1;
    if (next < lesson.steps.length) {
      setStepIdx(next);
      loadStep(lesson, next);
    } else {
      // Lesson done - return to list
      setLessonId(null);
      setStepIdx(0);
    }
  }, [lesson, stepIdx, loadStep]);

  const handleSquareClick = useCallback((square) => {
    if (!step || step.type !== 'challenge' || status === 'correct') return;

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
        const expected = step.solution.replace(/[+#]/g, '');

        if (actual === expected) {
          setStatus('correct');
          // Mark step as completed
          const key = `${lesson.id}-${step.id}`;
          setCompletedSteps(prev => {
            const updated = prev.includes(key) ? prev : [...prev, key];
            safeSave('chess-endgame-progress', updated);
            return updated;
          });
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
  }, [step, status, chess, selectedSq, legalMoves, lesson]);

  // Count completed lessons
  const completedLessons = ENDGAME_LESSONS.filter(l =>
    l.steps.every(s => completedSteps.includes(`${l.id}-${s.id}`))
  ).length;

  // ── レッスン一覧 ───────────────────────────────────────────────────────────
  if (!lessonId) {
    return (
      <div className="endgame-page">
        <div className="home-bg-glow home-bg-glow--left" />
        <NavBar />

        <section className="endgame-hero">
          <h1 className="endgame-title">🏁 エンドゲームレッスン</h1>
          <p className="endgame-subtitle">終盤の必須テクニックをインタラクティブに学ぼう</p>
          <p className="endgame-progress-summary">
            完了済み: <strong>{completedLessons}</strong> / {ENDGAME_LESSONS.length}
          </p>
        </section>

        <section className="endgame-list-section">
          {ENDGAME_LESSONS.map((les) => {
            const lesCompleted = les.steps.every(s =>
              completedSteps.includes(`${les.id}-${s.id}`)
            );
            const stepsDone = les.steps.filter(s =>
              completedSteps.includes(`${les.id}-${s.id}`)
            ).length;
            return (
              <button
                key={les.id}
                className={`endgame-lesson-card ${lesCompleted ? 'endgame-lesson-card--done' : ''}`}
                onClick={() => openLesson(les.id)}
              >
                <div className="endgame-lesson-icon">{les.icon}</div>
                <div className="endgame-lesson-body">
                  <p className="endgame-lesson-title">{les.title}</p>
                  <p className="endgame-lesson-desc">{les.desc}</p>
                  <div className="endgame-lesson-steps-bar">
                    {les.steps.map((s) => (
                      <div
                        key={s.id}
                        className={`endgame-step-dot ${completedSteps.includes(`${les.id}-${s.id}`) ? 'endgame-step-dot--done' : ''}`}
                      />
                    ))}
                    <span className="endgame-steps-count">{stepsDone}/{les.steps.length}</span>
                  </div>
                </div>
                {lesCompleted
                  ? <div className="endgame-lesson-badge endgame-lesson-badge--done">✅ 完了</div>
                  : <div className="endgame-lesson-badge endgame-lesson-badge--go">→ 始める</div>
                }
              </button>
            );
          })}
        </section>
      </div>
    );
  }

  // ── レッスンビュー ─────────────────────────────────────────────────────────
  const totalSteps = lesson.steps.length;
  const isLastStep = stepIdx === totalSteps - 1;
  const isExplain  = step.type === 'explain';

  const canGoNext = isExplain || status === 'correct';

  return (
    <div className="endgame-page">
      <NavBar />

      <div className="endgame-lesson-wrap">
        {/* ヘッダー */}
        <div className="endgame-lesson-header">
          <button
            className="endgame-back-btn"
            onClick={() => setLessonId(null)}
          >← 一覧に戻る</button>
          <div className="endgame-lesson-header-info">
            <span className="endgame-lesson-header-icon">{lesson.icon}</span>
            <h2 className="endgame-lesson-header-title">{lesson.title}</h2>
          </div>
          <div className="endgame-step-progress">
            {lesson.steps.map((s, i) => (
              <div
                key={s.id}
                className={`endgame-step-pip ${i === stepIdx ? 'pip-current' : ''} ${completedSteps.includes(`${lesson.id}-${s.id}`) ? 'pip-done' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* 本体 */}
        <div className="endgame-lesson-body">
          {/* ボード */}
          <div className="endgame-board-col">
            <ChessBoard
              board={chess.board()}
              selectedSquare={selectedSq}
              legalMoves={legalMoves}
              lastMove={lastMove}
              gameStatus="playing"
              boardTheme={boardTheme}
              pieceSet={pieceSet}
              hint={null}
              flipped={step.flipped}
              onSquareClick={handleSquareClick}
              onDrop={() => {}}
              onCancelDrag={() => {}}
            />
          </div>

          {/* テキスト&アクション */}
          <div className="endgame-text-col">
            <div className="endgame-step-badge">
              ステップ {stepIdx + 1} / {totalSteps}
              {isExplain
                ? <span className="endgame-type-tag endgame-type-tag--explain">説明</span>
                : <span className="endgame-type-tag endgame-type-tag--challenge">挑戦</span>
              }
            </div>

            <h3 className="endgame-step-title">{step.title}</h3>
            <p className="endgame-step-text">{step.text}</p>

            {/* ステータスバナー */}
            {status === 'correct' && (
              <div className="puzzle-banner puzzle-banner-done">🎉 正解！素晴らしい！</div>
            )}
            {status === 'wrong' && (
              <div className="puzzle-banner puzzle-banner-wrong">
                ❌ 違います。正しい手: <strong>{step.solution}</strong>
              </div>
            )}
            {!isExplain && status === 'idle' && (
              <div className="puzzle-banner puzzle-banner-info">
                💡 ヒント: {step.hint}
              </div>
            )}

            <div className="endgame-actions">
              {canGoNext && (
                <button className="endgame-next-btn" onClick={goNext}>
                  {isLastStep ? 'レッスン完了 🎉' : '次のステップ →'}
                </button>
              )}
              {!isExplain && status !== 'correct' && (
                <button
                  className="endgame-reset-btn"
                  onClick={() => loadStep(lesson, stepIdx)}
                >やり直す</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
