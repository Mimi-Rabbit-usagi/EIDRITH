import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import NavBar from '../components/NavBar';
import ChessBoard from '../components/ChessBoard';
import { BOARD_THEMES } from '../data/themes';
import { LESSONS } from '../data/lessons';

function loadBoardTheme() {
  try {
    const d = JSON.parse(localStorage.getItem('chess-master-data') || '{}');
    return BOARD_THEMES.find(t => t.id === (d.activeBoardTheme || 'classic')) || BOARD_THEMES[0];
  } catch { return BOARD_THEMES[0]; }
}

function saveProgress(lessonId) {
  try {
    const key = 'chess-lesson-progress';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    if (!prev.includes(lessonId)) {
      localStorage.setItem(key, JSON.stringify([...prev, lessonId]));
    }
  } catch {}
}

// ── 説明ステップ ──────────────────────────────────────────────────────────────
function ExplainStep({ step, onNext, nextType, stepNum, totalSteps }) {
  return (
    <div className="lesson-step-wrap">
      <div className="lesson-explain-card">
        {/* 駒アイコン＋名前 */}
        <div className="lesson-piece-header" style={{ borderColor: step.color }}>
          <span className="lesson-piece-symbol">{step.pieceSymbol}</span>
          <div>
            <div className="lesson-piece-name">{step.pieceName}</div>
            <div className="lesson-piece-en">{step.pieceNameEn}</div>
          </div>
          {step.points > 0 && (
            <div className="lesson-piece-points" style={{ background: step.color + '22', color: step.color }}>
              {step.points}点
            </div>
          )}
        </div>

        {/* 説明 */}
        <p className="lesson-description">{step.description}</p>

        {/* ルール一覧 */}
        <ul className="lesson-rules">
          {step.rules.map((rule, i) => (
            <li key={i} className="lesson-rule-item">
              <span className="lesson-rule-dot" style={{ background: step.color }} />
              {rule}
            </li>
          ))}
        </ul>

        {/* ポイント */}
        <div className="lesson-tip">
          <span className="lesson-tip-icon">💡</span>
          <span>{step.tip}</span>
        </div>
      </div>

      <button className="lesson-next-btn" onClick={onNext}>
        {nextType === 'quiz' ? '実際に動かしてみる →' : '次へ →'}
      </button>
    </div>
  );
}

// ── クイズステップ ────────────────────────────────────────────────────────────
// successCondition:
//   'anyMove'    任意の合法手で正解（デフォルト）
//   'checkmate'  チェックメイトになる手のみ正解
function QuizStep({ step, onNext, boardTheme }) {
  const [chess] = useState(() => { const c = new Chess(); c.load(step.fen); return c; });
  const [selectedSq, setSelectedSq] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [cleared, setCleared] = useState(false);
  const [wrongMsg, setWrongMsg] = useState('');

  const condition = step.successCondition || 'anyMove';

  const pieceSet = (() => {
    try { return JSON.parse(localStorage.getItem('chess-master-data') || '{}').activePieceSet || 'classic'; } catch { return 'classic'; }
  })();

  const handleSquareClick = useCallback((square) => {
    if (cleared) return;
    const piece = chess.get(square);

    if (selectedSq) {
      if (legalMoves.includes(square)) {
        const move = chess.move({ from: selectedSq, to: square, promotion: 'q' });
        setLastMove({ from: move.from, to: move.to });
        setSelectedSq(null);
        setLegalMoves([]);

        // 正解判定
        if (condition === 'checkmate') {
          if (chess.isCheckmate()) {
            setCleared(true);
          } else {
            // 不正解 → 1秒後に戻す
            setWrongMsg('まだ詰んでいません！もう一度試してみよう');
            setTimeout(() => {
              chess.undo();
              setLastMove(null);
              setWrongMsg('');
            }, 1200);
          }
        } else {
          setCleared(true);
        }
        return;
      }
      if (piece && piece.color === chess.turn()) {
        setSelectedSq(square);
        setLegalMoves(chess.moves({ square, verbose: true }).map(m => m.to));
        return;
      }
      setSelectedSq(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === chess.turn()) {
      setSelectedSq(square);
      setLegalMoves(chess.moves({ square, verbose: true }).map(m => m.to));
    }
  }, [chess, selectedSq, legalMoves, cleared]);

  return (
    <div className="lesson-step-wrap">
      <div className="lesson-quiz-header">
        <span className="lesson-quiz-icon">{step.pieceSymbol}</span>
        <div>
          <div className="lesson-quiz-title">{step.pieceName}を動かしてみよう！</div>
          <div className="lesson-quiz-instruction">{step.instruction}</div>
        </div>
      </div>

      <div className="lesson-board-wrap">
        <ChessBoard
          board={chess.board()}
          selectedSquare={selectedSq}
          legalMoves={legalMoves}
          lastMove={lastMove}
          gameStatus="playing"
          boardTheme={boardTheme}
          pieceSet={pieceSet}
          hint={null}
          flipped={false}
          onSquareClick={handleSquareClick}
          onDrop={() => {}}
          onCancelDrag={() => {}}
        />
      </div>

      {cleared ? (
        <div className="lesson-quiz-result lesson-quiz-result--ok">
          <span>🎉 できた！</span>
          <button className="lesson-next-btn" onClick={onNext}>
            次へ →
          </button>
        </div>
      ) : wrongMsg ? (
        <div className="lesson-quiz-result lesson-quiz-result--ng">
          <span>❌ {wrongMsg}</span>
        </div>
      ) : (
        <p className="lesson-quiz-hint">
          まず <strong>{step.highlight}</strong> の{step.pieceName}をクリックしてみよう
        </p>
      )}
    </div>
  );
}

// ── 完了ステップ ──────────────────────────────────────────────────────────────
function CompleteStep({ step, lessonId, onFinish }) {
  useEffect(() => { saveProgress(lessonId); }, [lessonId]);

  return (
    <div className="lesson-step-wrap lesson-complete-wrap">
      <div className="lesson-complete-card">
        <div className="lesson-complete-icon">🏆</div>
        <h2 className="lesson-complete-title">{step.title}</h2>
        <p className="lesson-complete-msg">{step.message}</p>
        <div className="lesson-complete-badges">
          {['♟', '♞', '♝', '♜', '♛', '♚'].map((s, i) => (
            <span key={i} className="lesson-complete-badge">{s}</span>
          ))}
        </div>
      </div>
      <div className="lesson-complete-actions">
        <button className="lesson-next-btn" onClick={onFinish}>
          ♟ 対局で試す
        </button>
        <button className="lesson-secondary-btn" onClick={() => window.location.href = '/learn'}>
          学習一覧に戻る
        </button>
      </div>
    </div>
  );
}

// ── メイン ────────────────────────────────────────────────────────────────────
export default function LessonPlayer() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lesson = LESSONS[lessonId];
  const [stepIdx, setStepIdx] = useState(0);
  const boardTheme = loadBoardTheme();

  if (!lesson) {
    return (
      <div className="lesson-container">
        <NavBar />
        <div className="lesson-inner">
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 60 }}>
            レッスンが見つかりません
          </p>
        </div>
      </div>
    );
  }

  const step = lesson.steps[stepIdx];
  const nextStep = lesson.steps[stepIdx + 1];
  const progress = ((stepIdx) / (lesson.steps.length - 1)) * 100;

  const handleNext = () => {
    if (stepIdx < lesson.steps.length - 1) setStepIdx(i => i + 1);
  };

  return (
    <div className="lesson-container">
      <div className="home-bg-glow home-bg-glow--left" />
      <NavBar />

      <div className="lesson-inner">
        {/* ヘッダー */}
        <div className="lesson-header">
          <button className="puzzles-back-btn" onClick={() => navigate('/learn')}>
            ← 学習一覧
          </button>
          <div className="lesson-title-row">
            <span>{lesson.icon}</span>
            <span className="lesson-lesson-title">{lesson.title}</span>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="lesson-progress-wrap">
          <div className="lesson-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="lesson-step-count">
          {stepIdx + 1} / {lesson.steps.length}
        </p>

        {/* ステップ */}
        {step.type === 'explain' && (
          <ExplainStep
            step={step}
            onNext={handleNext}
            nextType={nextStep?.type}
            stepNum={stepIdx}
            totalSteps={lesson.steps.length}
          />
        )}
        {step.type === 'quiz' && (
          <QuizStep
            key={stepIdx}
            step={step}
            onNext={handleNext}
            boardTheme={boardTheme}
          />
        )}
        {step.type === 'complete' && (
          <CompleteStep
            step={step}
            lessonId={lesson.id}
            onFinish={() => navigate('/play')}
          />
        )}
      </div>
    </div>
  );
}
