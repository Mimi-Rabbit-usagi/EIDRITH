import { useState, useCallback, useEffect, useRef } from 'react';
import NavBar from '../components/NavBar';
import { useChessGame } from '../hooks/useChessGame';
import { useChessClock } from '../hooks/useChessClock';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { BOARD_THEMES } from '../data/themes';
import { PIECE_SETS } from '../data/pieceSets';
import { ACHIEVEMENTS, checkAchievements } from '../data/achievements';
import ChessBoard from '../components/ChessBoard';
import ChessClock from '../components/ChessClock';
import EvalBar from '../components/EvalBar';
import ConfettiEffect from '../components/ConfettiEffect';
import GamePanel from '../components/GamePanel';
import UnlockToast from '../components/UnlockToast';
import GameHistory from '../components/GameHistory';
import ReplayModal from '../components/ReplayModal';
import StatsModal from '../components/StatsModal';
import PuzzleModal from '../components/PuzzleModal';
import OpeningModal from '../components/OpeningModal';
import CustomizeModal from '../components/CustomizeModal';
import PromotionModal from '../components/PromotionModal';
import GameSummary from '../components/GameSummary';

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
  localStorage.setItem('chess-master-logs', JSON.stringify(logs.slice(0, 30)));
}

// ── Play Page ─────────────────────────────────────────────────────────────────
export default function Play() {
  const [gameData, setGameData] = useState(loadGameData);
  const [logs, setLogs] = useState(loadLogs);
  const [pendingUnlock, setPendingUnlock] = useState(null);
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const achievementQueueRef = useRef([]);
  const [winCounted, setWinCounted] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [playerColor, setPlayerColor] = useState('w');
  const [gameMode, setGameMode] = useState(() => localStorage.getItem('chess-game-mode') || 'cpu');
  const [player2Name, setPlayer2Name] = useState(() => localStorage.getItem('chess-player2-name') || 'プレイヤー2');
  const [clockMode, setClockMode] = useState('none');
  const [clockTimeout, setClockTimeout] = useState(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('chess-player-name') || 'あなた');
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [replayGame, setReplayGame] = useState(null);

  const handlePlayerNameChange = useCallback((name) => {
    setPlayerName(name);
    localStorage.setItem('chess-player-name', name);
  }, []);

  const handlePlayer2NameChange = useCallback((name) => {
    setPlayer2Name(name);
    localStorage.setItem('chess-player2-name', name);
  }, []);

  const activeBoardTheme = BOARD_THEMES.find(t => t.id === gameData.activeBoardTheme) || BOARD_THEMES[0];
  const { enabled: soundEnabled, toggle: toggleSound, play: playSound } = useSoundEffects();

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
  } = useChessGame(difficulty, playerColor, gameMode === 'local' ? 'human' : 'cpu');

  moveHistoryRef.current = moveHistory;
  techniqueLogRef.current = techniqueLog;

  const isChessOver = gameStatus !== 'playing' && gameStatus !== 'check';
  const handleTimeout = useCallback((loserColor) => setClockTimeout(loserColor), []);
  const { playerTime, cpuTime, resetClock } = useChessClock({
    clockMode,
    currentTurn,
    playerColor,
    isGameOver: isChessOver || clockTimeout !== null,
    onTimeout: handleTimeout,
  });

  const effectiveGameStatus = clockTimeout !== null ? 'timeout' : gameStatus;
  const effectiveWinner     = clockTimeout !== null ? (clockTimeout === 'w' ? 'b' : 'w') : winner;
  const playerWon = gameMode === 'local'
    ? (gameStatus === 'checkmate' || clockTimeout !== null)
    : (gameStatus === 'checkmate' && winner === playerColor)
      || (clockTimeout !== null && clockTimeout !== playerColor);

  useEffect(() => {
    const isOver = gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw' || clockTimeout !== null;
    if (!isOver) return;
    const t = setTimeout(() => setShowSummary(true), 1000);
    return () => clearTimeout(t);
  }, [gameStatus, clockTimeout]);

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

  useEffect(() => {
    if (clockTimeout === null) return;
    playSound(clockTimeout !== playerColor ? 'win' : 'lose');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockTimeout]);

  useEffect(() => {
    const isOver = gameStatus === 'checkmate' || gameStatus === 'stalemate' || gameStatus === 'draw' || clockTimeout !== null;
    if (!isOver || winCounted) return;
    setWinCounted(true);

    let result = 'draw';
    if (gameStatus === 'checkmate') result = winner === playerColor ? 'win' : 'loss';
    else if (clockTimeout !== null) result = clockTimeout === playerColor ? 'loss' : 'win';

    const history = moveHistoryRef.current;
    const techLog = techniqueLogRef.current;
    const isLocalMode = gameMode === 'local';
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      difficulty: isLocalMode ? 'local' : difficulty,
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

    // ローカル2人対戦ではCPU用のwin/streak/実績カウントをスキップ
    if (isLocalMode) return;

    setGameData(prev => {
      const isWin = result === 'win';
      const newWins   = isWin ? prev.wins + 1 : prev.wins;
      const newStreak = isWin ? prev.streak + 1 : 0;

      const newBoardThemes = [...prev.unlockedBoardThemes];
      let justUnlockedTheme = null;
      BOARD_THEMES.forEach(theme => {
        if (theme.locked && theme.requiredWins <= newWins && !newBoardThemes.includes(theme.id)) {
          newBoardThemes.push(theme.id);
          justUnlockedTheme = theme;
        }
      });
      if (justUnlockedTheme) setPendingUnlock(justUnlockedTheme);

      const newPieceSets = [...(prev.unlockedPieceSets || ['classic'])];
      PIECE_SETS.forEach(ps => {
        if (ps.locked && ps.requiredWins <= newWins && !newPieceSets.includes(ps.id)) {
          newPieceSets.push(ps.id);
          if (!justUnlockedTheme) {
            setPendingUnlock({ emoji: ps.emoji, name: ps.name, description: ps.description, title: '駒セットアンロック！' });
          }
        }
      });

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
  }, [gameStatus, winner, winCounted, clockTimeout, gameMode]);

  const handleNewGame = useCallback(() => {
    resetGame();
    resetClock();
    setClockTimeout(null);
    setWinCounted(false);
    setShowSummary(false);
  }, [resetGame, resetClock]);

  const handleDifficultyChange = useCallback((d) => {
    setDifficulty(d);
    resetGame();
    resetClock();
    setClockTimeout(null);
    setWinCounted(false);
    setShowSummary(false);
  }, [resetGame, resetClock]);

  const handleGameModeChange = useCallback((mode) => {
    setGameMode(mode);
    localStorage.setItem('chess-game-mode', mode);
    if (mode === 'local') setPlayerColor('w'); // 2人対戦では白を下に固定
    resetGame();
    resetClock();
    setClockTimeout(null);
    setWinCounted(false);
    setShowSummary(false);
  }, [resetGame, resetClock]);

  const handlePlayerColorChange = useCallback((color) => {
    setPlayerColor(color);
    resetGame();
    resetClock();
    setClockTimeout(null);
    setWinCounted(false);
    setShowSummary(false);
  }, [resetGame, resetClock]);

  const handleClockModeChange = useCallback((mode) => {
    setClockMode(mode);
    resetGame();
    setClockTimeout(null);
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

  const handleReplayCurrentGame = useCallback(() => {
    const moves = moveHistoryRef.current.map(m => m.san);
    setShowSummary(false);
    setReplayGame({ moves, moveCount: moves.length });
  }, []);

  const handleReplayHistorical = useCallback((game) => {
    setShowHistory(false);
    setReplayGame(game);
  }, []);

  return (
    <div className="app-container">
      <NavBar />

      <main className="game-area">
        <div className="board-section">
          <div className="opponent-label">
            <div className={`player-chip player-chip-${playerColor === 'w' ? 'black' : 'white'}`}>
              {gameMode === 'local'
                ? `${player2Name}（${playerColor === 'w' ? '黒' : '白'}）`
                : `CPU（${playerColor === 'w' ? '黒' : '白'}）`}
            </div>
            {gameMode === 'cpu' && isThinking && <div className="thinking-text">考え中...</div>}
            <ChessClock
              time={cpuTime}
              isActive={currentTurn !== playerColor && !isChessOver && clockTimeout === null}
            />
          </div>

          <EvalBar score={positionEval} gameStatus={gameStatus} winner={winner} />
          <ChessBoard
            board={board}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            gameStatus={gameStatus}
            boardTheme={activeBoardTheme}
            pieceSet={gameData.activePieceSet}
            hint={hint}
            flipped={gameMode === 'cpu' && playerColor === 'b'}
            onSquareClick={handleSquareClick}
            onDrop={handleDrop}
            onCancelDrag={clearSelection}
          />

          <div className="player-label">
            <div className={`player-chip player-chip-${playerColor === 'w' ? 'white' : 'black'}`}>
              {playerName}（{playerColor === 'w' ? '白' : '黒'}）
            </div>
            <ChessClock
              time={playerTime}
              isActive={currentTurn === playerColor && !isChessOver && clockTimeout === null}
            />
          </div>
        </div>

        <GamePanel
          gameStatus={effectiveGameStatus}
          winner={effectiveWinner}
          currentTurn={currentTurn}
          isThinking={isThinking}
          capturedPieces={capturedPieces}
          moveHistory={moveHistory}
          wins={gameData.wins}
          difficulty={difficulty}
          soundEnabled={soundEnabled}
          technique={technique}
          techniqueLog={techniqueLog}
          hint={hint}
          currentOpening={currentOpening}
          gameMode={gameMode}
          playerColor={playerColor}
          playerName={playerName}
          player2Name={player2Name}
          clockMode={clockMode}
          onGameModeChange={handleGameModeChange}
          onDifficultyChange={handleDifficultyChange}
          onPlayerNameChange={handlePlayerNameChange}
          onPlayer2NameChange={handlePlayer2NameChange}
          onShowStats={() => setShowStats(true)}
          onClockModeChange={handleClockModeChange}
          onPlayerColorChange={handlePlayerColorChange}
          onUndo={undoMove}
          onNewGame={handleNewGame}
          onShowHistory={() => setShowHistory(true)}
          onShowPuzzle={() => setShowPuzzle(true)}
          onShowOpening={() => setShowOpening(true)}
          onShowCustomize={() => setShowCustomize(true)}
          onToggleSound={toggleSound}
          onHint={requestHint}
          onClearHint={clearHint}
        />
      </main>

      {showSummary && (
        <GameSummary
          gameStatus={effectiveGameStatus}
          winner={effectiveWinner}
          playerColor={playerColor}
          moveHistory={moveHistory}
          techniqueLog={techniqueLog}
          capturedPieces={capturedPieces}
          difficulty={difficulty}
          gameMode={gameMode}
          player2Name={player2Name}
          onNewGame={handleNewGame}
          onClose={() => setShowSummary(false)}
          onReplay={handleReplayCurrentGame}
        />
      )}

      {pendingPromotion && <PromotionModal onConfirm={confirmPromotion} />}

      <UnlockToast unlock={pendingUnlock} onClose={closeUnlock} />
      <UnlockToast
        unlock={pendingAchievement ? { ...pendingAchievement, title: '実績解除！' } : null}
        onClose={closeAchievement}
      />

      {showPuzzle && (
        <PuzzleModal
          activeBoardTheme={gameData.activeBoardTheme}
          activePieceSet={gameData.activePieceSet}
          onClose={() => setShowPuzzle(false)}
        />
      )}

      {showCustomize && (
        <CustomizeModal
          activeBoardTheme={gameData.activeBoardTheme}
          unlockedBoardThemes={gameData.unlockedBoardThemes}
          activePieceSet={gameData.activePieceSet}
          unlockedPieceSets={gameData.unlockedPieceSets}
          unlockedAchievements={gameData.unlockedAchievements}
          wins={gameData.wins}
          onThemeChange={handleThemeChange}
          onPieceSetChange={handlePieceSetChange}
          onClose={() => setShowCustomize(false)}
        />
      )}

      {showOpening && (
        <OpeningModal
          activeBoardTheme={gameData.activeBoardTheme}
          activePieceSet={gameData.activePieceSet}
          onClose={() => setShowOpening(false)}
        />
      )}

      {showStats && (
        <StatsModal
          logs={logs}
          playerName={playerName}
          onClose={() => setShowStats(false)}
        />
      )}

      {showHistory && (
        <GameHistory
          logs={logs}
          onClose={() => setShowHistory(false)}
          onReplay={handleReplayHistorical}
        />
      )}

      {playerWon && <ConfettiEffect />}

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
