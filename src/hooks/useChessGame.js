import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getBestMove, evaluatePosition } from './useAI';
import { detectTechnique } from './detectTactics';
import { detectOpening } from './detectOpening';

function buildGameStatus(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isDraw()) return 'draw';
  if (chess.isCheck()) return 'check';
  return 'playing';
}

/** 引き分けになった理由を返す（draw でない場合は null） */
function buildDrawReason(chess) {
  if (chess.isInsufficientMaterial()) return 'insufficient';
  if (chess.isThreefoldRepetition()) return 'repetition';
  if (chess.isDraw()) return 'fifty'; // 上2つに該当しない isDraw は50手ルール
  return null;
}

/**
 * 描画に必要な盤面情報を Chess インスタンスから抜き出して固める。
 *
 * Chess インスタンスは ref に置かれて破壊的に更新されるため、レンダー中に直接読むと
 * React が変化を追跡できない。局面が変わるたびにこの関数でスナップショットを作り、
 * state として持たせることで「state が同じなら画面も同じ」を保証する。
 */
function buildSnapshot(chess) {
  return {
    fen: chess.fen(),
    board: chess.board(),
    turn: chess.turn(),
    history: chess.history({ verbose: true }),
    status: buildGameStatus(chess),
    drawReason: buildDrawReason(chess),
  };
}


export function useChessGame(difficulty = 'normal', playerColor = 'w', vsMode = 'cpu', getAIMove = null) {
  const chessRef = useRef(new Chess());

  // 局面が変わるたびに差し替わる描画用スナップショット（再レンダーの起点）
  const [snapshot, setSnapshot] = useState(() => buildSnapshot(new Chess()));
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [technique, setTechnique] = useState(null);
  const [techniqueLog, setTechniqueLog] = useState([]); // all techniques this game
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
  const [hint, setHint] = useState(null); // { from, to }
  const [currentOpening, setCurrentOpening] = useState(null);
  const [positionEval, setPositionEval] = useState(0);
  const [gameResetKey, setGameResetKey] = useState(0);
  const [agreedDraw, setAgreedDraw] = useState(false); // 引き分け合意フラグ
  const aiTimerRef = useRef(null);
  // getAIMove は外部（Stockfish フック等）から渡される非同期関数のref
  const getAIMoveRef = useRef(getAIMove);

  // 最新の props を ref に写しておくためのref群。
  // コールバック内から「常に最新の値」を参照するために使う（依存配列を増やさずに済む）
  const playerColorRef = useRef(playerColor);
  const cpuColorRef = useRef(playerColor === 'w' ? 'b' : 'w');
  const vsModeRef = useRef(vsMode);

  // ref への代入はレンダー中ではなく effect で行う。
  // この effect は他のどの effect よりも先に宣言しておくこと（下の「CPU先手」effect が
  // cpuColorRef / vsModeRef を読むため、順序が入れ替わると古い値を見てしまう）
  useEffect(() => {
    getAIMoveRef.current = getAIMove;
    playerColorRef.current = playerColor;
    cpuColorRef.current = playerColor === 'w' ? 'b' : 'w';
    vsModeRef.current = vsMode;
  });

  // 派生値はすべてスナップショット（state）から計算する
  const gameStatus = agreedDraw ? 'draw' : snapshot.status;
  const winner = gameStatus === 'checkmate' ? (snapshot.turn === 'w' ? 'b' : 'w') : null;
  const drawReason = gameStatus === 'draw'
    ? (agreedDraw ? 'agreement' : snapshot.drawReason)
    : null;

  /** 盤面を変更したあとは必ずこれを呼ぶ（呼ばないと画面が更新されない） */
  const syncFen = useCallback(() => {
    const c = chessRef.current;
    setSnapshot(buildSnapshot(c));
    setCurrentOpening(detectOpening(c.history({ verbose: true })));
    setPositionEval(evaluatePosition(c));
  }, []);

  const showTechnique = useCallback((tech) => {
    if (!tech) return;
    setTechnique(tech);
    const moveIndex = chessRef.current.history().length;
    setTechniqueLog(prev => [...prev, { ...tech, moveIndex }]);
  }, []);

  const triggerAI = useCallback(() => {
    const c = chessRef.current;
    if (c.turn() !== cpuColorRef.current || c.isGameOver()) return;

    setIsThinking(true);

    const executeMove = (bestMove) => {
      const c = chessRef.current;
      if (bestMove) {
        const move = c.move(bestMove); // SAN 文字列または {from, to, promotion?} を受け付ける
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
    };

    if (getAIMoveRef.current) {
      // 非同期パス（Stockfish 等）
      const fen = c.fen();
      getAIMoveRef.current(fen).then(moveObj => {
        if (moveObj) {
          executeMove(moveObj);
        } else {
          // フォールバック: 既存の minimax
          const fallback = getBestMove(fen, difficulty);
          executeMove(fallback);
        }
      }).catch(() => {
        const fallback = getBestMove(c.fen(), difficulty);
        executeMove(fallback);
      });
    } else {
      // 同期パス: 既存の minimax（350ms 遅延でCPU思考演出）
      aiTimerRef.current = setTimeout(() => {
        const c = chessRef.current;
        const bestMove = getBestMove(c.fen(), difficulty);
        executeMove(bestMove);
      }, 350);
    }
  }, [difficulty, syncFen, showTechnique]);

  const handleSquareClick = useCallback((square) => {
    const c = chessRef.current;
    const isHuman = vsModeRef.current === 'human';
    const activeColor = isHuman ? c.turn() : playerColorRef.current;

    if (isThinking || c.isGameOver()) return;
    if (!isHuman && c.turn() !== playerColorRef.current) return;

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
          if (!isHuman) triggerAI();
          return;
        }
      }

      // Re-select a different own piece
      if (piece && piece.color === activeColor) {
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
    if (piece && piece.color === activeColor) {
      setSelectedSquare(square);
      setLegalMoves(c.moves({ square, verbose: true }).map(m => m.to));
    }
  }, [selectedSquare, legalMoves, isThinking, triggerAI, syncFen, showTechnique]);

  const requestHint = useCallback(() => {
    const c = chessRef.current;
    const isHuman = vsModeRef.current === 'human';
    if ((!isHuman && c.turn() !== playerColorRef.current) || c.isGameOver() || isThinking) return;

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
    const isHuman = vsModeRef.current === 'human';
    const activeColor = isHuman ? c.turn() : playerColorRef.current;

    if (isThinking || c.isGameOver()) return;
    if (!isHuman && c.turn() !== playerColorRef.current) return;

    const piece = c.get(from);
    if (!piece || piece.color !== activeColor) { clearSelection(); return; }

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
      if (vsModeRef.current !== 'human') triggerAI();
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
      if (vsModeRef.current !== 'human') triggerAI();
    }
  }, [pendingPromotion, syncFen, showTechnique, triggerAI]);

  const resetGame = useCallback(() => {
    clearTimeout(aiTimerRef.current);
    chessRef.current = new Chess();
    setSnapshot(buildSnapshot(chessRef.current));
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setIsThinking(false);
    setTechnique(null);
    setTechniqueLog([]);
    setCapturedPieces({ w: [], b: [] });
    setPendingPromotion(null);
    setHint(null);
    setCurrentOpening(null);
    setPositionEval(0);
    setAgreedDraw(false);
    setGameResetKey(prev => prev + 1);
  }, []);

  /** 任意FENから対局開始。成功時 true、無効FENなら false を返す */
  const resetWithFen = useCallback((fen) => {
    try {
      const c = new Chess();
      c.load(fen);
      clearTimeout(aiTimerRef.current);
      chessRef.current = c;
      setSnapshot(buildSnapshot(c));
      setSelectedSquare(null);
      setLegalMoves([]);
      setLastMove(null);
      setIsThinking(false);
      setTechnique(null);
      setTechniqueLog([]);
      setCapturedPieces({ w: [], b: [] });
      setPendingPromotion(null);
      setHint(null);
      setCurrentOpening(null);
      setPositionEval(evaluatePosition(c));
      setAgreedDraw(false);
      setGameResetKey(prev => prev + 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  // 新しいゲーム開始時、またはplayerColorが変わったとき：CPUが先手なら即発動
  useEffect(() => {
    const c = chessRef.current;
    if (vsModeRef.current !== 'human' && !c.isGameOver() && c.turn() === cpuColorRef.current) {
      triggerAI();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameResetKey, playerColor, vsMode]);

  // 戦術の「NEW」バッジを8秒後に自動クリア
  useEffect(() => {
    if (!technique) return;
    const t = setTimeout(() => setTechnique(null), 8000);
    return () => clearTimeout(t);
  }, [technique]);

  const closeTechnique = useCallback(() => setTechnique(null), []);
  const clearHint = useCallback(() => setHint(null), []);

  // 1手前に戻す：CPUモードは2手undo、2人対戦は1手undo
  const undoMove = useCallback(() => {
    const c = chessRef.current;
    const isHuman = vsModeRef.current === 'human';

    if (isHuman) {
      // 2人対戦：1手undo、制限なし
      if (c.history().length < 1 || isThinking) return;
      clearTimeout(aiTimerRef.current);
      setIsThinking(false);
      c.undo();
    } else {
      // CPUモード：プレイヤーの番・2手以上ある場合のみ許可
      if (c.turn() !== playerColorRef.current || c.history().length < 2 || isThinking) return;
      clearTimeout(aiTimerRef.current);
      setIsThinking(false);
      c.undo(); // 黒（CPU）の手を取り消す
      c.undo(); // 白（自分）の手を取り消す
    }

    // 取った駒リストを棋譜から再計算
    const history = c.history({ verbose: true });
    const newCaptured = { w: [], b: [] };
    for (const move of history) {
      if (move.captured) newCaptured[move.color].push(move.captured);
    }
    setCapturedPieces(newCaptured);

    // 最後の指し手ハイライトを更新
    const prevMove = history.length > 0 ? history[history.length - 1] : null;
    setLastMove(prevMove ? { from: prevMove.from, to: prevMove.to } : null);

    setHint(null);
    setTechnique(null);
    syncFen();
  }, [isThinking, syncFen]);

  /** CPU戦: 引き分け申し出 → 即承認。2人対戦用に外部で確認ダイアログを挟む場合もある */
  const offerDraw = useCallback(() => {
    if (gameStatus !== 'playing' && gameStatus !== 'check') return;
    setAgreedDraw(true);
  }, [gameStatus]);

  return {
    board: snapshot.board,
    fen: snapshot.fen,
    selectedSquare,
    legalMoves,
    lastMove,
    isThinking,
    technique,
    techniqueLog,
    capturedPieces,
    gameStatus,
    winner,
    drawReason,
    currentTurn: snapshot.turn,
    moveHistory: snapshot.history,
    handleSquareClick,
    resetGame,
    resetWithFen,
    closeTechnique,
    pendingPromotion,
    confirmPromotion,
    hint,
    requestHint,
    clearHint,
    handleDrop,
    clearSelection,
    currentOpening,
    positionEval,
    undoMove,
    offerDraw,
  };
}
