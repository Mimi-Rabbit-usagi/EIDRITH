import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getBestMove } from './useAI';
import { detectTechnique } from './detectTactics';

function buildGameStatus(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isDraw()) return 'draw';
  if (chess.isCheck()) return 'check';
  return 'playing';
}


export function useChessGame(difficulty = 'normal') {
  const chessRef = useRef(new Chess());

  // fen changes on every move, driving re-renders
  const [fen, setFen] = useState(() => chessRef.current.fen());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [technique, setTechnique] = useState(null);
  const [techniqueLog, setTechniqueLog] = useState([]); // all techniques this game
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
  const [hint, setHint] = useState(null); // { from, to }
  const aiTimerRef = useRef(null);

  const chess = chessRef.current;

  // Snapshot of derived state
  const gameStatus = buildGameStatus(chess);
  const winner = gameStatus === 'checkmate' ? (chess.turn() === 'w' ? 'b' : 'w') : null;

  const syncFen = useCallback(() => {
    setFen(chessRef.current.fen());
  }, []);

  const showTechnique = useCallback((tech) => {
    if (!tech) return;
    setTechnique(tech);
    setTechniqueLog(prev =>
      prev.find(t => t.id === tech.id) ? prev : [...prev, tech]
    );
  }, []);

  const triggerAI = useCallback(() => {
    const c = chessRef.current;
    if (c.turn() !== 'b' || c.isGameOver()) return;

    setIsThinking(true);

    aiTimerRef.current = setTimeout(() => {
      const c = chessRef.current;
      const bestMove = getBestMove(c.fen(), difficulty);
      if (bestMove) {
        const move = c.move(bestMove);
        if (move) {
          setLastMove({ from: move.from, to: move.to });
          if (move.captured) {
            setCapturedPieces(prev => ({
              ...prev,
              [move.color]: [...prev[move.color], move.captured],
            }));
          }
          showTechnique(detectTechnique(c, move));
          syncFen();
        }
      }
      setIsThinking(false);
    }, 350);
  }, [difficulty, syncFen, showTechnique]);

  const handleSquareClick = useCallback((square) => {
    const c = chessRef.current;
    if (c.turn() !== 'w' || isThinking || c.isGameOver()) return;

    const piece = c.get(square);

    // If a square is already selected
    if (selectedSquare) {
      // Attempt the move
      if (legalMoves.includes(square)) {
        // プロモーション（ポーン昇格）かどうか確認
        const isPromotion = c.moves({ square: selectedSquare, verbose: true })
          .some(m => m.to === square && m.promotion);
        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        const move = c.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move) {
          setLastMove({ from: move.from, to: move.to });
          if (move.captured) {
            setCapturedPieces(prev => ({
              ...prev,
              [move.color]: [...prev[move.color], move.captured],
            }));
          }
          showTechnique(detectTechnique(c, move));
          syncFen();
          setSelectedSquare(null);
          setLegalMoves([]);
          setHint(null);
          triggerAI();
          return;
        }
      }

      // Re-select a different own piece
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
        setLegalMoves(c.moves({ square, verbose: true }).map(m => m.to));
        return;
      }

      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Select an own piece
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      setLegalMoves(c.moves({ square, verbose: true }).map(m => m.to));
    }
  }, [selectedSquare, legalMoves, isThinking, triggerAI, syncFen, showTechnique]);

  const requestHint = useCallback(() => {
    const c = chessRef.current;
    if (c.turn() !== 'w' || c.isGameOver() || isThinking) return;

    // normal強度（depth=2）でベスト手を取得
    const hintSan = getBestMove(c.fen(), 'normal');
    if (!hintSan) return;

    // SAN → from/to 変換
    const verboseMove = c.moves({ verbose: true }).find(m => m.san === hintSan);
    if (verboseMove) {
      setHint({ from: verboseMove.from, to: verboseMove.to });
    }
  }, [isThinking]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  // ドラッグ&ドロップ用: from→to を直接実行
  const handleDrop = useCallback((from, to) => {
    const c = chessRef.current;
    if (c.turn() !== 'w' || isThinking || c.isGameOver()) return;

    const piece = c.get(from);
    if (!piece || piece.color !== 'w') { clearSelection(); return; }

    const moves = c.moves({ square: from, verbose: true });
    if (!moves.some(m => m.to === to)) { clearSelection(); return; }

    const isPromotion = moves.some(m => m.to === to && m.promotion);
    if (isPromotion) {
      setPendingPromotion({ from, to });
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const move = c.move({ from, to, promotion: 'q' });
    if (move) {
      setLastMove({ from: move.from, to: move.to });
      if (move.captured) {
        setCapturedPieces(prev => ({
          ...prev,
          [move.color]: [...prev[move.color], move.captured],
        }));
      }
      showTechnique(detectTechnique(c, move));
      syncFen();
      setSelectedSquare(null);
      setLegalMoves([]);
      setHint(null);
      triggerAI();
    }
  }, [isThinking, clearSelection, syncFen, showTechnique, triggerAI]);

  const confirmPromotion = useCallback((piece) => {
    if (!pendingPromotion) return;
    const c = chessRef.current;
    const { from, to } = pendingPromotion;
    const move = c.move({ from, to, promotion: piece });
    if (move) {
      setLastMove({ from: move.from, to: move.to });
      if (move.captured) {
        setCapturedPieces(prev => ({
          ...prev,
          [move.color]: [...prev[move.color], move.captured],
        }));
      }
      showTechnique(detectTechnique(c, move));
      syncFen();
      setPendingPromotion(null);
      setHint(null);
      triggerAI();
    }
  }, [pendingPromotion, syncFen, showTechnique, triggerAI]);

  const resetGame = useCallback(() => {
    clearTimeout(aiTimerRef.current);
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setIsThinking(false);
    setTechnique(null);
    setTechniqueLog([]);
    setCapturedPieces({ w: [], b: [] });
    setPendingPromotion(null);
    setHint(null);
  }, []);

  // 戦術の「NEW」バッジを8秒後に自動クリア
  useEffect(() => {
    if (!technique) return;
    const t = setTimeout(() => setTechnique(null), 8000);
    return () => clearTimeout(t);
  }, [technique]);

  const closeTechnique = useCallback(() => setTechnique(null), []);
  const clearHint = useCallback(() => setHint(null), []);

  return {
    board: chess.board(),
    fen,
    selectedSquare,
    legalMoves,
    lastMove,
    isThinking,
    technique,
    techniqueLog,
    capturedPieces,
    gameStatus,
    winner,
    currentTurn: chess.turn(),
    moveHistory: chess.history({ verbose: true }),
    handleSquareClick,
    resetGame,
    closeTechnique,
    pendingPromotion,
    confirmPromotion,
    hint,
    requestHint,
    clearHint,
    handleDrop,
    clearSelection,
  };
}
