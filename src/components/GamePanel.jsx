import { BOARD_THEMES } from '../data/themes';

const PIECE_SYMBOLS = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

function CapturedPieces({ pieces, label }) {
  if (pieces.length === 0) return null;
  return (
    <div className="captured-row">
      <span className="captured-label">{label}が取った駒:</span>
      <span className="captured-pieces">
        {pieces.map((p, i) => (
          <span key={i} className="captured-piece">{PIECE_SYMBOLS[p]}</span>
        ))}
      </span>
    </div>
  );
}

function MoveHistoryItem({ move, index }) {
  const moveNum = Math.floor(index / 2) + 1;
  const isWhite = index % 2 === 0;
  return (
    <>
      {isWhite && <span className="move-num">{moveNum}.</span>}
      <span className={`move-san ${isWhite ? 'move-white' : 'move-black'}`}>
        {move.san}
      </span>
    </>
  );
}

const STATUS_CONFIG = {
  playing: { text: 'ゲーム中', color: '#4CAF50' },
  check:   { text: 'チェック！', color: '#FF9800' },
  checkmate: { text: 'チェックメイト', color: '#F44336' },
  stalemate: { text: 'ステイルメイト（引き分け）', color: '#9E9E9E' },
  draw:    { text: '引き分け', color: '#9E9E9E' },
};

const DIFFICULTY_CONFIG = [
  { id: 'easy',   label: 'かんたん', emoji: '🌱', color: '#4CAF50' },
  { id: 'normal', label: 'ふつう',   emoji: '⚔️',  color: '#FF9800' },
  { id: 'hard',   label: 'むずかしい', emoji: '💀', color: '#F44336' },
];

export default function GamePanel({
  gameStatus,
  winner,
  currentTurn,
  isThinking,
  capturedPieces,
  moveHistory,
  wins,
  activeBoardTheme,
  unlockedBoardThemes,
  difficulty,
  onDifficultyChange,
  onThemeChange,
  onNewGame,
  onShowHistory,
}) {
  const status = STATUS_CONFIG[gameStatus] || STATUS_CONFIG.playing;
  const moveListRef = (el) => {
    if (el) el.scrollTop = el.scrollHeight;
  };

  return (
    <div className="game-panel">
      {/* Title */}
      <div className="panel-title">
        <span>♟</span>
        <span>Chess Master</span>
      </div>

      {/* Win counter */}
      <div className="win-counter">
        <span className="win-icon">🏆</span>
        <span className="win-text">勝利数: <strong>{wins}</strong></span>
      </div>

      {/* Difficulty selector */}
      <div>
        <p className="section-title">難易度</p>
        <div className="difficulty-row">
          {DIFFICULTY_CONFIG.map(d => (
            <button
              key={d.id}
              className={`difficulty-btn ${difficulty === d.id ? 'difficulty-btn-active' : ''}`}
              style={difficulty === d.id ? { borderColor: d.color, color: d.color } : {}}
              onClick={() => onDifficultyChange(d.id)}
            >
              <span>{d.emoji}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game status */}
      <div className="status-section">
        <div className="status-badge" style={{ borderColor: status.color, color: status.color }}>
          {status.text}
        </div>

        {gameStatus === 'playing' || gameStatus === 'check' ? (
          <div className="turn-indicator">
            {isThinking ? (
              <div className="thinking-indicator">
                <div className="thinking-dots">
                  <span /><span /><span />
                </div>
                <span>CPUが考え中...</span>
              </div>
            ) : (
              <div className={`turn-chip ${currentTurn === 'w' ? 'turn-white' : 'turn-black'}`}>
                <div className="turn-dot" />
                <span>{currentTurn === 'w' ? 'あなたの番（白）' : 'CPUの番（黒）'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="game-over-message">
            {gameStatus === 'checkmate' && (
              <p>{winner === 'w' ? '🎉 あなたの勝ち！' : '😔 CPUの勝ち...'}</p>
            )}
            {(gameStatus === 'stalemate' || gameStatus === 'draw') && (
              <p>引き分け</p>
            )}
          </div>
        )}
      </div>

      {/* Captured pieces */}
      <div className="captured-section">
        <CapturedPieces pieces={capturedPieces.w} label="あなた" />
        <CapturedPieces pieces={capturedPieces.b} label="CPU" />
      </div>

      {/* Board theme selector */}
      <div className="theme-section">
        <p className="section-title">盤のテーマ</p>
        <div className="theme-grid">
          {BOARD_THEMES.map(theme => {
            const unlocked = unlockedBoardThemes.includes(theme.id);
            const isActive = activeBoardTheme === theme.id;
            return (
              <button
                key={theme.id}
                className={`theme-btn ${isActive ? 'theme-btn-active' : ''} ${!unlocked ? 'theme-btn-locked' : ''}`}
                onClick={() => unlocked && onThemeChange(theme.id)}
                title={unlocked ? theme.name : `${theme.requiredWins}勝でアンロック`}
              >
                <div
                  className="theme-preview"
                  style={{
                    background: `linear-gradient(135deg, ${theme.lightSquare} 50%, ${theme.darkSquare} 50%)`,
                  }}
                />
                <span className="theme-name">{unlocked ? theme.emoji : '🔒'}</span>
                {!unlocked && (
                  <span className="theme-lock-text">{theme.requiredWins}勝</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Move history */}
      <div className="move-history-section">
        <p className="section-title">手順</p>
        <div className="move-list" ref={moveListRef}>
          {moveHistory.length === 0 ? (
            <p className="move-empty">まだ手が指されていません</p>
          ) : (
            <div className="move-grid">
              {moveHistory.map((move, i) => (
                <MoveHistoryItem key={i} move={move} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="panel-buttons">
        <button className="new-game-btn" onClick={onNewGame}>
          新しいゲーム
        </button>
        <button className="history-btn" onClick={onShowHistory}>
          📋 履歴
        </button>
      </div>
    </div>
  );
}
