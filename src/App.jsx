import { useState, useCallback, useEffect, useRef } from 'react';
import { useChessGame } from './hooks/useChessGame';
import { useSoundEffects } from './hooks/useSoundEffects';
import { BOARD_THEMES } from './data/themes';
import { PIECE_SETS } from './data/pieceSets';
import { ACHIEVEMENTS, checkAchievements } from './data/achievements';
import ChessBoard from './components/ChessBoard';
import EvalBar from './components/EvalBar';
import ConfettiEffect from './components/ConfettiEffect';
import GamePanel from './components/GamePanel';
import UnlockToast from './components/UnlockToast';
import GameHistory from './components/GameHistory';
import ReplayModal from './components/ReplayModal';
import PromotionModal from './components/PromotionModal';
import GameSummary from './components/GameSummary';

// ── LocalStorage helpers ──────────────────────────────────────────────────────
const DEFAULT_GAME_DATA = {
  wins: 0,
  streak: 0,
  unlockedBoardThemes: ['classic'],
  activeBoardTheme: 'classic',
  activePieceSet: 'classic',
  unlockedPieceSets: ['classic'],
  unlockedAchievements: [],
};

function loadGameData() {
  try {
    const stored = localStorage.getItem('chess-master-data');
    if (stored) {
      const data = JSON.parse(stored);
      // 旧データとの互換性：欠損フィールドにデフォルト値を補完
      return { ...DEFAULT_GAME_DATA, ...data };
    }
  } catch {}
  return { ...DEFAULT_GAME_DATA };
}

function saveGameData(data) {
  localStorage.setItem('chess-master-data', JSON.stringify(data));
}

function loadLogs() {
  try {
    const stored = localStorage.getItem('chess-master-logs');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveLogs(logs) {
  // 最大30件保持
  localStorage.setItem('chess-master-logs', JSON.stringify(logs.slice(0, 30)));
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameData, setGameData] = useState(loadGameData);
  const [logs, setLogs] = useState(loadLogs);
  const [pendingUnlock, setPendingUnlock] = useState(null);
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const achievementQueueRef = useRef([]);
  const [winCounted, setWinCounted] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [replayGame, setReplayGame] = useState(null);

  const activeBoardTheme = BOARD_THEMES.find(t => t.id === gameData.activeBoardTheme) || BOARD_THEMES[0];
  const { enabled: soundEnabled, toggle: toggleSound, play: playSound } = useSoundEffects();

  // Refs to capture latest values inside effects
  const moveHistoryRef = useRef([]);
  const techniqueLogRef = useRef([]);

  const {
    board,
    selectedSquare,
    legalMoves,
    lastMove,
    isThinking,
    technique,
    techniqueLog,
    capturedPieces,
    gameStatus,
    winner,
    currentTurn,
    moveHistory,
    handleSquareClick,
    resetGame,
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
  } = useChessGame(difficulty);

  // Keep refs in sync
  moveHistoryRef.current = moveHistory;
  techniqueLogRef.current = techniqueLog;

  // ゲーム終了後にサマリーを表示（音が鳴り終わる1秒後）
  useEffect(() => {
    const isOver = gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw';
    if (!isOver) return;
    const t = setTimeout(() => setShowSummary(true), 1000);
    return () => clearTimeout(t);
  }, [gameStatus]);

  // Sound effects: 手が指されるたびに音を鳴らす
  const prevMoveCountRef = useRef(0);
  useEffect(() => {
    const count = moveHistory.length;
    if (count <= prevMoveCountRef.current) return;
    prevMoveCountRef.current = count;

    const last = moveHistory[count - 1];
    if (gameStatus === 'checkmate') {
      playSound(winner === 'w' ? 'win' : 'lose');
    } else if (gameStatus === 'stalemate' || gameStatus === 'draw') {
      playSound('draw');
    } else if (gameStatus === 'check') {
      playSound('check');
    } else if (last?.promotion) {
      playSound('promotion');
    } else if (last?.captured) {
      playSound('capture');
    } else {
      playSound('move');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory.length]);

  // Save log and count wins when game ends
  useEffect(() => {
    const isOver = gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw';
    if (!isOver || winCounted) return;
    setWinCounted(true);

    // Determine result
    let result = 'draw';
    if (gameStatus === 'checkmate') result = winner === 'w' ? 'win' : 'loss';

    // Build log entry (use refs for latest values)
    const history = moveHistoryRef.current;
    const techLog = techniqueLogRef.current;
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      difficulty,
      result,
      moveCount: history.length,
      moves: history.map(m => m.san),
      techniques: techLog,
    };

    setLogs(prev => {
      const updated = [entry, ...prev];
      saveLogs(updated);
      return updated;
    });

    // Win counter, streak, unlocks, achievements
    setGameData(prev => {
      const isWin = result === 'win';
      const newWins   = isWin ? prev.wins + 1 : prev.wins;
      const newStreak = isWin ? prev.streak + 1 : 0;

      // ── ボードテーマアンロック ──
      const newBoardThemes = [...prev.unlockedBoardThemes];
      let justUnlockedTheme = null;
      BOARD_THEMES.forEach(theme => {
        if (theme.locked && theme.requiredWins <= newWins && !newBoardThemes.includes(theme.id)) {
          newBoardThemes.push(theme.id);
          justUnlockedTheme = theme;
        }
      });
      if (justUnlockedTheme) setPendingUnlock(justUnlockedTheme);

      // ── 駒セットアンロック ──
      const newPieceSets = [...(prev.unlockedPieceSets || ['classic'])];
      PIECE_SETS.forEach(ps => {
        if (ps.locked && ps.requiredWins <= newWins && !newPieceSets.includes(ps.id)) {
          newPieceSets.push(ps.id);
          // テーマアンロックが既にあれば駒セットは静かにアンロック（重複通知を避ける）
          if (!justUnlockedTheme) {
            setPendingUnlock({ emoji: ps.emoji, name: ps.name, description: ps.description, title: '駒セットアンロック！' });
          }
        }
      });

      // ── 実績チェック ──
      const alreadyDone = prev.unlockedAchievements || [];
      const openingMoves = currentOpening?.moves?.length ?? 0;
      const newAchievements = checkAchievements(
        { result, difficulty, moveCount: history.length, techniqueLog: techLog,
          moveHistory: history, openingMoves, wins: newWins, streak: newStreak },
        alreadyDone
      );
      const newAchievementIds = [...alreadyDone, ...newAchievements.map(a => a.id)];
      if (newAchievements.length > 0) {
        achievementQueueRef.current = [...newAchievements];
        setPendingAchievement(achievementQueueRef.current.shift());
      }

      const newData = {
        ...prev,
        wins: newWins,
        streak: newStreak,
        unlockedBoardThemes: newBoardThemes,
        unlockedPieceSets: newPieceSets,
        unlockedAchievements: newAchievementIds,
      };
      saveGameData(newData);
      return newData;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, winner, winCounted]);

  const handleNewGame = useCallback(() => {
    resetGame();
    setWinCounted(false);
    setShowSummary(false);
  }, [resetGame]);

  const handleDifficultyChange = useCallback((d) => {
    setDifficulty(d);
    resetGame();
    setWinCounted(false);
    setShowSummary(false);
  }, [resetGame]);

  const handleThemeChange = useCallback((themeId) => {
    setGameData(prev => {
      const newData = { ...prev, activeBoardTheme: themeId };
      saveGameData(newData);
      return newData;
    });
  }, []);

  const closeUnlock = useCallback(() => setPendingUnlock(null), []);

  // 実績トーストを閉じる（キューに次があれば続けて表示）
  const closeAchievement = useCallback(() => {
    if (achievementQueueRef.current.length > 0) {
      setPendingAchievement(achievementQueueRef.current.shift());
    } else {
      setPendingAchievement(null);
    }
  }, []);

  const handlePieceSetChange = useCallback((id) => {
    setGameData(prev => {
      const newData = { ...prev, activePieceSet: id };
      saveGameData(newData);
      return newData;
    });
  }, []);

  // 現在のゲームをリプレイ（GameSummaryから呼ばれる）
  const handleReplayCurrentGame = useCallback(() => {
    const moves = moveHistoryRef.current.map(m => m.san);
    setShowSummary(false);
    setReplayGame({ moves, moveCount: moves.length });
  }, []);

  // 履歴ゲームをリプレイ（GameHistoryから呼ばれる）
  const handleReplayHistorical = useCallback((game) => {
    setShowHistory(false);
    setReplayGame(game);
  }, []);

  return (
    <div className="app-container">
      <main className="game-area">
        {/* Board section */}
        <div className="board-section">
          {/* CPU captured pieces (shown above board) */}
          <div className="opponent-label">
            <div className="player-chip player-chip-black">CPU（黒）</div>
            {isThinking && <div className="thinking-text">考え中...</div>}
          </div>

          <div className="board-eval-row">
            <EvalBar
              score={positionEval}
              gameStatus={gameStatus}
              winner={winner}
            />
            <ChessBoard
              board={board}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              lastMove={lastMove}
              gameStatus={gameStatus}
              boardTheme={activeBoardTheme}
              pieceSet={gameData.activePieceSet}
              hint={hint}
              onSquareClick={handleSquareClick}
              onDrop={handleDrop}
              onCancelDrag={clearSelection}
            />
          </div>

          {/* Player label */}
          <div className="player-label">
            <div className="player-chip player-chip-white">あなた（白）</div>
          </div>
        </div>

        {/* Side panel */}
        <GamePanel
          gameStatus={gameStatus}
          winner={winner}
          currentTurn={currentTurn}
          isThinking={isThinking}
          capturedPieces={capturedPieces}
          moveHistory={moveHistory}
          wins={gameData.wins}
          activeBoardTheme={gameData.activeBoardTheme}
          unlockedBoardThemes={gameData.unlockedBoardThemes}
          difficulty={difficulty}
          soundEnabled={soundEnabled}
          technique={technique}
          techniqueLog={techniqueLog}
          hint={hint}
          currentOpening={currentOpening}
          activePieceSet={gameData.activePieceSet}
          unlockedPieceSets={gameData.unlockedPieceSets}
          unlockedAchievements={gameData.unlockedAchievements}
          onDifficultyChange={handleDifficultyChange}
          onUndo={undoMove}
          onThemeChange={handleThemeChange}
          onPieceSetChange={handlePieceSetChange}
          onNewGame={handleNewGame}
          onShowHistory={() => setShowHistory(true)}
          onToggleSound={toggleSound}
          onHint={requestHint}
          onClearHint={clearHint}
        />
      </main>

      {/* Game summary */}
      {showSummary && (
        <GameSummary
          gameStatus={gameStatus}
          winner={winner}
          moveHistory={moveHistory}
          techniqueLog={techniqueLog}
          capturedPieces={capturedPieces}
          difficulty={difficulty}
          onNewGame={handleNewGame}
          onClose={() => setShowSummary(false)}
          onReplay={handleReplayCurrentGame}
        />
      )}

      {/* Promotion piece selector */}
      {pendingPromotion && (
        <PromotionModal onConfirm={confirmPromotion} />
      )}

      {/* Unlock notification */}
      <UnlockToast unlock={pendingUnlock} onClose={closeUnlock} />

      {/* 実績解除通知 */}
      <UnlockToast
        unlock={pendingAchievement ? { ...pendingAchievement, title: '実績解除！' } : null}
        onClose={closeAchievement}
      />

      {/* Game history modal */}
      {showHistory && (
        <GameHistory
          logs={logs}
          onClose={() => setShowHistory(false)}
          onReplay={handleReplayHistorical}
        />
      )}

      {/* 勝利エフェクト */}
      {gameStatus === 'checkmate' && winner === 'w' && <ConfettiEffect />}

      {/* Replay modal */}
      {replayGame && (
        <ReplayModal
          game={replayGame}
          boardTheme={activeBoardTheme}
          onClose={() => setReplayGame(null)}
        />
      )}
    </div>
  );
}
