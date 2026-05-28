import { useState, useCallback, useRef } from 'react';
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
  }, []);

  const closeTechnique = useCallback(() => setTechnique(null), []);

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
  };
}
