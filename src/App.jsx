import { useState, useCallback, useEffect, useRef } from 'react';
import { useChessGame } from './hooks/useChessGame';
import { BOARD_THEMES } from './data/themes';
import ChessBoard from './components/ChessBoard';
import GamePanel from './components/GamePanel';
import TechniqueModal from './components/TechniqueModal';
import UnlockToast from './components/UnlockToast';
import GameHistory from './components/GameHistory';
import PromotionModal from './components/PromotionModal';

// ── LocalStorage helpers ──────────────────────────────────────────────────────
function loadGameData() {
  try {
    const stored = localStorage.getItem('chess-master-data');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    wins: 0,
    unlockedBoardThemes: ['classic'],
    activeBoardTheme: 'classic',
  };
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
  const [winCounted, setWinCounted] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [showHistory, setShowHistory] = useState(false);

  const activeBoardTheme = BOARD_THEMES.find(t => t.id === gameData.activeBoardTheme) || BOARD_THEMES[0];

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
    closeTechnique,
    pendingPromotion,
    confirmPromotion,
  } = useChessGame(difficulty);

  // Keep refs in sync
  moveHistoryRef.current = moveHistory;
  techniqueLogRef.current = techniqueLog;

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

    // Win counter and unlocks
    if (result === 'win') {
      setGameData(prev => {
        const newWins = prev.wins + 1;
        const newUnlocked = [...prev.unlockedBoardThemes];
        let justUnlocked = null;

        BOARD_THEMES.forEach(theme => {
          if (theme.locked && theme.requiredWins <= newWins && !newUnlocked.includes(theme.id)) {
            newUnlocked.push(theme.id);
            justUnlocked = theme;
          }
        });

        if (justUnlocked) setPendingUnlock(justUnlocked);

        const newData = { ...prev, wins: newWins, unlockedBoardThemes: newUnlocked };
        saveGameData(newData);
        return newData;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, winner, winCounted]);

  const handleNewGame = useCallback(() => {
    resetGame();
    setWinCounted(false);
  }, [resetGame]);

  const handleDifficultyChange = useCallback((d) => {
    setDifficulty(d);
    resetGame();
    setWinCounted(false);
  }, [resetGame]);

  const handleThemeChange = useCallback((themeId) => {
    setGameData(prev => {
      const newData = { ...prev, activeBoardTheme: themeId };
      saveGameData(newData);
      return newData;
    });
  }, []);

  const closeUnlock = useCallback(() => setPendingUnlock(null), []);

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

          <ChessBoard
            board={board}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            gameStatus={gameStatus}
            boardTheme={activeBoardTheme}
            onSquareClick={handleSquareClick}
          />

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
          onDifficultyChange={handleDifficultyChange}
          onThemeChange={handleThemeChange}
          onNewGame={handleNewGame}
          onShowHistory={() => setShowHistory(true)}
        />
      </main>

      {/* Promotion piece selector */}
      {pendingPromotion && (
        <PromotionModal onConfirm={confirmPromotion} />
      )}

      {/* Technique popup */}
      <TechniqueModal technique={technique} onClose={closeTechnique} />

      {/* Unlock notification */}
      <UnlockToast unlock={pendingUnlock} onClose={closeUnlock} />

      {/* Game history modal */}
      {showHistory && (
        <GameHistory logs={logs} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
