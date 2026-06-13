import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import StatsModal from '../components/StatsModal';
import PuzzleModal from '../components/PuzzleModal';
import OpeningModal from '../components/OpeningModal';
import CustomizeModal from '../components/CustomizeModal';
import PromotionModal from '../components/PromotionModal';
import GameSummary from '../components/GameSummary';
import { loadGameData, saveGameData, loadLogs, saveLogs, safeLoad, safeSave } from '../lib/storage';
import { TOURNAMENT_ROUNDS } from './Tournament';
import { useStockfish } from '../hooks/useStockfish';

// ── Play Page ─────────────────────────────────────────────────────────────────
export default function Play() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const tournamentRound = searchParams.get('tournament') ? parseInt(searchParams.get('tournament'), 10) : null;
  const isTournament = tournamentRound !== null;
  const tournamentRoundDef = isTournament ? TOURNAMENT_ROUNDS.find(r => r.id === tournamentRound) : null;

  const [gameData, setGameData] = useState(loadGameData);
  const [logs, setLogs] = useState(loadLogs);
  const [pendingUnlock, setPendingUnlock] = useState(null);
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const achievementQueueRef = useRef([]);
  const [winCounted, setWinCounted] = useState(false);
  const [difficulty, setDifficulty] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('diff') ?? 'easy';
  });
  const [playerColor, setPlayerColor] = useState('w');
  const [gameMode, setGameMode] = useState(() => safeLoad('chess-game-mode', 'cpu'));
  const [player2Name, setPlayer2Name] = useState(() => safeLoad('chess-player2-name', 'プレイヤー2'));
  const [clockMode, setClockMode]           = useState('none');
  const [clockIncrement, setClockIncrement] = useState(0);
  const [clockTimeout, setClockTimeout]     = useState(null);
  const [playerName, setPlayerName] = useState(() => safeLoad('chess-player-name', 'あなた'));
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const handlePlayerNameChange = useCallback((name) => {
    setPlayerName(name);
    safeSave('chess-player-name', name);
  }, []);

  const handlePlayer2NameChange = useCallback((name) => {
    setPlayer2Name(name);
    safeSave('chess-player2-name', name);
  }, []);

  const activeBoardTheme = BOARD_THEMES.find(t => t.id === gameData.activeBoardTheme) || BOARD_THEMES[0];
  const { enabled: soundEnabled, toggle: toggleSound, play: playSound, volume: soundVolume, setVolume: setSoundVolume } = useSoundEffects();

  // Stockfish は hard モードのときだけ起動（メモリ節約）
  const { getStockfishMove } = useStockfish(difficulty === 'hard' && gameMode !== 'local');

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
    offerDraw,
    drawReason,
    resetWithFen,
  } = useChessGame(
    difficulty,
    playerColor,
    gameMode === 'local' ? 'human' : 'cpu',
    difficulty === 'hard' && gameMode !== 'local' ? getStockfishMove : null,
  );

  moveHistoryRef.current = moveHistory;
  techniqueLogRef.current = techniqueLog;

  const isChessOver = gameStatus !== 'playing' && gameStatus !== 'check';
  const handleTimeout = useCallback((loserColor) => setClockTimeout(loserColor), []);
  const { playerTime, cpuTime, resetClock } = useChessClock({
    clockMode,
    increment: clockIncrement,
    currentTurn,
    playerColor,
    isGameOver: isChessOver || clockTimeout !== null,
    onTimeout: handleTimeout,
  });

  const effectiveGameStatus = clockTimeout !== null ? 'timeout' : gameStatus;
  const effectiveWinner     = clockTimeout !== null ? (clockTimeout === 'w' ? 'b' : 'w') : winner;
  const playerWon = gameMode === 'local'
    // 2人対戦: 決着あり（チェックメイト or 時間切れ）のときだけ紙吹雪
    ? (effectiveWinner !== null && (gameStatus === 'checkmate' || clockTimeout !== null))
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
    } else if (last?.san === 'O-O' || last?.san === 'O-O-O') {
      playSound('castle');
    } else if (last?.captured) {
      playSound('capture');
    } else {
      playSound('move');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory.length]);

  // 時計の警告ティック（残り10秒以下）
  const lastTickedTimeRef = useRef(null);
  useEffect(() => {
    if (!soundEnabled || playerTime === null || playerTime > 10 || playerTime <= 0) return;
    if (currentTurn !== playerColor || isChessOver || clockTimeout !== null) return;
    if (playerTime !== lastTickedTimeRef.current) {
      lastTickedTimeRef.current = playerTime;
      playSound('tick');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerTime]);

  const [showTimeoutBanner, setShowTimeoutBanner] = useState(false);
  const [showKeyHelp, setShowKeyHelp] = useState(false);
  const [showFenInput, setShowFenInput] = useState(false);
  const [fenValue, setFenValue] = useState('');
  const [fenError, setFenError] = useState(null);

  useEffect(() => {
    if (clockTimeout === null) return;
    playSound(clockTimeout !== playerColor ? 'win' : 'lose');
    setShowTimeoutBanner(true);
    const t = setTimeout(() => setShowTimeoutBanner(false), 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockTimeout]);

  // ── キーボードショートカット ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // テキスト入力中は無視
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // モーダルが開いている間は無視（? ヘルプだけ閉じる）
      const anyModalOpen = showSummary || showHistory || showStats ||
                           showPuzzle || showOpening || showCustomize;
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setShowKeyHelp(p => !p);
        return;
      }
      if (e.key === 'Escape') { setShowKeyHelp(false); return; }
      if (anyModalOpen) return;

      if ((e.key === 'u' || e.key === 'U') && !isChessOver) {
        e.preventDefault();
        undoMove();
      }
      if ((e.key === 'h' || e.key === 'H') && !isChessOver) {
        e.preventDefault();
        if (hint) clearHint(); else requestHint();
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNewGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChessOver, hint, showSummary, showHistory, showStats, showPuzzle, showOpening, showCustomize]);

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
      playerColor: isLocalMode ? 'w' : playerColor,
    };

    setLogs(prev => {
      const updated = [entry, ...prev];
      saveLogs(updated);
      return updated;
    });

    // トーナメントモード: 結果を保存してTournament.jsxが読めるようにする
    if (isTournament && tournamentRound) {
      safeSave('chess-tournament-last-result', {
        round: tournamentRound,
        result,
        moveCount: history.length,
      });
    }

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

  const handleFenStart = useCallback(() => {
    const trimmed = fenValue.trim();
    const ok = resetWithFen(trimmed);
    if (!ok) {
      setFenError('無効なFEN形式です。正しいFENを入力してください。');
      return;
    }
    resetClock();
    setClockTimeout(null);
    setWinCounted(false);
    setShowSummary(false);
    setShowFenInput(false);
    setFenValue('');
    setFenError(null);
  }, [fenValue, resetWithFen, resetClock]);

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
    safeSave('chess-game-mode', mode);
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

  const handleClockPresetChange = useCallback(({ mode, increment }) => {
    setClockMode(mode);
    setClockIncrement(increment);
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
    navigate('/review', {
      state: {
        game: { moves, moveCount: moves.length, techniques: techniqueLogRef.current, playerColor },
        boardThemeId: gameData.activeBoardTheme,
        pieceSet: gameData.activePieceSet,
        flipped: gameMode === 'cpu' && playerColor === 'b',
      },
    });
  }, [navigate, gameData.activeBoardTheme, gameData.activePieceSet, playerColor, gameMode]);

  const handleReplayHistorical = useCallback((game) => {
    setShowHistory(false);
    navigate('/review', {
      state: {
        game,
        boardThemeId: gameData.activeBoardTheme,
        pieceSet: gameData.activePieceSet,
        flipped: game.playerColor === 'b',
      },
    });
  }, [navigate, gameData.activeBoardTheme, gameData.activePieceSet]);

  return (
    <div className="app-container">
      <NavBar />

      {isTournament && tournamentRoundDef && (
        <div className="tournament-banner">
          <span className="tournament-banner-icon">🏆</span>
          <span className="tournament-banner-text">
            トーナメント — {tournamentRoundDef.label}
          </span>
          <span className="tournament-banner-opp">vs {tournamentRoundDef.opponent}</span>
        </div>
      )}

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

          <div className="board-timeout-wrap">
            {showTimeoutBanner && clockTimeout !== null && (() => {
              const loserName = gameMode === 'local'
                ? (clockTimeout === 'w' ? `${playerName}（白）` : `${player2Name}（黒）`)
                : (clockTimeout === playerColor ? 'あなた' : 'CPU');
              const isPlayerLoss = gameMode === 'local' ? false : clockTimeout === playerColor;
              return (
                <div className={`timeout-banner ${isPlayerLoss ? 'timeout-banner--lose' : 'timeout-banner--win'}`}>
                  ⏰ {loserName}の時間切れ！
                </div>
              );
            })()}
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
          </div>

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
          soundVolume={soundVolume}
          technique={technique}
          techniqueLog={techniqueLog}
          hint={hint}
          currentOpening={currentOpening}
          gameMode={gameMode}
          playerColor={playerColor}
          playerName={playerName}
          player2Name={player2Name}
          clockMode={clockMode}
          clockIncrement={clockIncrement}
          onGameModeChange={handleGameModeChange}
          onDifficultyChange={handleDifficultyChange}
          onPlayerNameChange={handlePlayerNameChange}
          onPlayer2NameChange={handlePlayer2NameChange}
          onShowStats={() => setShowStats(true)}
          onClockPresetChange={handleClockPresetChange}
          onPlayerColorChange={handlePlayerColorChange}
          onUndo={undoMove}
          onOfferDraw={offerDraw}
          onNewGame={handleNewGame}
          onShowHistory={() => setShowHistory(true)}
          onShowPuzzle={() => setShowPuzzle(true)}
          onShowOpening={() => setShowOpening(true)}
          onShowCustomize={() => setShowCustomize(true)}
          onShowFenInput={() => { setFenValue(''); setFenError(null); setShowFenInput(true); }}
          onToggleSound={toggleSound}
          onVolumeChange={setSoundVolume}
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
          playerName={playerName}
          player2Name={player2Name}
          drawReason={drawReason}
          onNewGame={handleNewGame}
          onClose={() => setShowSummary(false)}
          onReplay={handleReplayCurrentGame}
          onTournamentReturn={isTournament ? () => navigate('/tournament') : undefined}
          tournamentRoundLabel={tournamentRoundDef?.label}
        />
      )}

      {pendingPromotion && <PromotionModal onConfirm={confirmPromotion} />}

      {showKeyHelp && (
        <div className="key-help-overlay" onClick={() => setShowKeyHelp(false)}>
          <div className="key-help-modal" onClick={e => e.stopPropagation()}>
            <div className="key-help-header">
              <span>⌨️ キーボードショートカット</span>
              <button className="key-help-close" onClick={() => setShowKeyHelp(false)}>✕</button>
            </div>
            <div className="key-help-section">
              <p className="key-help-section-title">対局画面</p>
              {[
                { key: 'U', desc: '待った（直前の1手を取り消す）' },
                { key: 'H', desc: 'ヒント ON / OFF' },
                { key: 'N', desc: '新しいゲームを始める' },
                { key: '?', desc: 'このヘルプを開く / 閉じる' },
                { key: 'Esc', desc: 'ヘルプを閉じる' },
              ].map(({ key, desc }) => (
                <div key={key} className="key-help-row">
                  <kbd className="key-help-key">{key}</kbd>
                  <span className="key-help-desc">{desc}</span>
                </div>
              ))}
            </div>
            <div className="key-help-section">
              <p className="key-help-section-title">レビュー・リプレイ画面</p>
              {[
                { key: '←', desc: '1手前へ' },
                { key: '→', desc: '1手次へ' },
                { key: 'Esc', desc: '閉じる' },
              ].map(({ key, desc }) => (
                <div key={key} className="key-help-row">
                  <kbd className="key-help-key">{key}</kbd>
                  <span className="key-help-desc">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFenInput && (
        <div className="key-help-overlay" onClick={() => setShowFenInput(false)}>
          <div className="fen-input-modal" onClick={e => e.stopPropagation()}>
            <div className="key-help-header">
              <span>♟ FEN入力で局面を設定</span>
              <button className="key-help-close" onClick={() => setShowFenInput(false)}>✕</button>
            </div>
            <p className="fen-input-desc">
              FEN（チェスの局面記法）を貼り付けると、その局面から対局できます。
            </p>
            <textarea
              className="fen-input-textarea"
              placeholder="例: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
              value={fenValue}
              onChange={e => { setFenValue(e.target.value); setFenError(null); }}
              rows={3}
              spellCheck={false}
              autoComplete="off"
            />
            {fenError && <p className="fen-input-error">{fenError}</p>}
            <div className="fen-input-actions">
              <button
                className="fen-input-start-btn"
                onClick={handleFenStart}
                disabled={!fenValue.trim()}
              >この局面で対局開始</button>
              <button
                className="fen-input-cancel-btn"
                onClick={() => setShowFenInput(false)}
              >キャンセル</button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
