import { useState, useEffect } from 'react';

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

function TechniqueLogItem({ t, isNew, isExpanded, onToggle }) {
  return (
    <div className={`tlog-item ${isNew ? 'tlog-item-new' : ''}`}>
      <button
        className="tlog-header"
        onClick={onToggle}
        style={{ borderLeftColor: t.color }}
      >
        <span className="tlog-icon">{t.icon}</span>
        <span className="tlog-name">{t.name}</span>
        {isNew && <span className="tlog-new-badge">NEW</span>}
        <span className="tlog-chevron">{isExpanded ? '▲' : '▼'}</span>
      </button>
      {isExpanded && (
        <div className="tlog-body">
          <p className="tlog-name-en">{t.nameEn}</p>
          <p className="tlog-description">{t.description}</p>
          <div className="tlog-detail">
            <span className="tlog-detail-label">詳細</span>
            <p className="tlog-detail-text">{t.detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  playing:   { text: 'ゲーム中',             color: '#4CAF50' },
  check:     { text: 'チェック！',            color: '#FF9800' },
  checkmate: { text: 'チェックメイト',        color: '#F44336' },
  stalemate: { text: 'ステイルメイト（引き分け）', color: '#9E9E9E' },
  draw:      { text: '引き分け',              color: '#9E9E9E' },
  timeout:   { text: '時間切れ！',            color: '#F44336' },
};

const CLOCK_CONFIG = [
  { id: 'none', label: 'なし',  emoji: '∞'  },
  { id: '1',    label: '1分',   emoji: '⚡' },
  { id: '3',    label: '3分',   emoji: '⏱' },
  { id: '10',   label: '10分',  emoji: '🕐' },
];

const DIFFICULTY_CONFIG = [
  { id: 'easy',   label: 'かんたん',   emoji: '🌱', color: '#4CAF50' },
  { id: 'normal', label: 'ふつう',     emoji: '⚔️',  color: '#FF9800' },
  { id: 'hard',   label: 'むずかしい', emoji: '💀', color: '#F44336' },
];

function OpeningBadge({ opening }) {
  const [expanded, setExpanded] = useState(false);
  if (!opening) return null;
  return (
    <div className="opening-badge">
      <button
        className="opening-badge-header"
        onClick={() => setExpanded(p => !p)}
      >
        <span className="opening-eco">{opening.eco}</span>
        <span className="opening-name">{opening.name}</span>
        <span className="opening-chevron">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="opening-body">
          <p className="opening-name-en">{opening.nameEn}</p>
          <p className="opening-description">{opening.description}</p>
        </div>
      )}
    </div>
  );
}

export default function GamePanel({
  gameStatus, winner, currentTurn, isThinking,
  capturedPieces, moveHistory, wins,
  difficulty, soundEnabled, technique, techniqueLog, hint,
  currentOpening,
  gameMode, playerColor, playerName, player2Name, clockMode,
  onGameModeChange, onDifficultyChange, onNewGame, onShowHistory,
  onToggleSound, onHint, onClearHint, onUndo, onOfferDraw, onPlayerColorChange, onClockModeChange,
  onPlayerNameChange, onPlayer2NameChange, onShowStats, onShowPuzzle, onShowOpening, onShowCustomize,
  onShowFenInput,
}) {
  const status = STATUS_CONFIG[gameStatus] || STATUS_CONFIG.playing;
  const moveListRef = (el) => { if (el) el.scrollTop = el.scrollHeight; };

  const [expandedTechId, setExpandedTechId] = useState(null);
  useEffect(() => {
    if (technique) setExpandedTechId(technique.id);
  }, [technique]);

  // スマホ用タブ（PCでは無視される）
  const [mobileTab, setMobileTab] = useState('game');

  // 新しい戦術が来たらスマホでも対局タブに切り替え
  useEffect(() => {
    if (technique) setMobileTab('game');
  }, [technique]);

  return (
    <div className="game-panel">

      {/* ── タイトル行（常に表示） ── */}
      <div className="panel-top-row">
        <div className="panel-title">
          <span>♟</span>
          <span>EIDRITH</span>
        </div>
        <div className="panel-top-right">
          <button
            className="sound-toggle-btn"
            onClick={onToggleSound}
            title={soundEnabled ? '音をオフにする' : '音をオンにする'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <div className="win-counter">
            <span className="win-icon">🏆</span>
            <span className="win-text"><strong>{wins}</strong>勝</span>
          </div>
        </div>
      </div>

      {/* ── スマホ専用タブバー ── */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab-btn ${mobileTab === 'game' ? 'mobile-tab-active' : ''}`}
          onClick={() => setMobileTab('game')}
        >
          ♟ 対局
          {/* 設定タブ表示中に思考中なら対局タブにドット表示 */}
          {isThinking && mobileTab === 'settings' && (
            <span className="mobile-tab-thinking-dot" />
          )}
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === 'settings' ? 'mobile-tab-active' : ''}`}
          onClick={() => setMobileTab('settings')}
        >
          ⚙ 設定
        </button>
      </div>

      {/* CPU思考中バナー: どのタブを開いていても常時表示（スマホ限定） */}
      {isThinking && gameMode === 'cpu' && (
        <div className="mobile-thinking-banner">
          <div className="thinking-dots thinking-dots--small"><span /><span /><span /></div>
          CPUが考え中...
        </div>
      )}

      {/* ── 対局タブ ── */}
      {/* ゲーム状態 */}
      <div className={`status-section${mobileTab === 'settings' ? ' mobile-hidden' : ''}`}>
        <div className="status-badge" style={{ borderColor: status.color, color: status.color }}>
          {status.text}
        </div>
        {gameStatus === 'playing' || gameStatus === 'check' ? (
          <div className="turn-indicator">
            {isThinking ? (
              <div className="thinking-indicator">
                <div className="thinking-dots"><span /><span /><span /></div>
                <span>CPUが考え中...</span>
              </div>
            ) : (
              <div className={`turn-chip ${currentTurn === 'w' ? 'turn-white' : 'turn-black'}`}>
                <div className="turn-dot" />
                <span>{gameMode === 'local'
                  ? `${currentTurn === 'w' ? `${playerName}（白）` : `${player2Name}（黒）`}の番`
                  : currentTurn === playerColor
                    ? `${playerName}の番（${playerColor === 'w' ? '白' : '黒'}）`
                    : `CPUの番（${playerColor === 'w' ? '黒' : '白'}）`
                }</span>
              </div>
            )}
            {(gameMode === 'local' || currentTurn === playerColor) && !isThinking && (
              <div className="action-btn-row">
                <button
                  className={`hint-btn ${hint ? 'hint-btn-active' : ''}`}
                  onClick={hint ? onClearHint : onHint}
                >
                  {hint ? '💡 消す' : '💡 ヒント'}
                </button>
                <button
                  className="undo-btn"
                  onClick={onUndo}
                  disabled={gameMode === 'local' ? moveHistory.length < 1 : moveHistory.length < 2}
                  title="直前の1手を取り消す"
                >
                  ↩ 待った
                </button>
                <button
                  className="draw-offer-btn"
                  onClick={onOfferDraw}
                  title="引き分けを申し出る"
                >
                  🤝 引き分け
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="game-over-message">
            {(gameStatus === 'checkmate' || gameStatus === 'timeout') && (
              <p>{gameMode === 'local'
                ? `🎉 ${winner === 'w' ? `${playerName}（白）` : `${player2Name}（黒）`}の勝ち！`
                : winner === playerColor ? '🎉 あなたの勝ち！' : '😔 CPUの勝ち...'
              }</p>
            )}
            {(gameStatus === 'stalemate' || gameStatus === 'draw') && <p>引き分け</p>}
          </div>
        )}
      </div>

      {/* オープニング解説 */}
      {currentOpening && (
        <div className={mobileTab === 'settings' ? 'mobile-hidden' : ''}>
          <OpeningBadge opening={currentOpening} />
        </div>
      )}

      {/* 戦術ログ */}
      {techniqueLog.length > 0 && (
        <div className={`technique-log-section${mobileTab === 'settings' ? ' mobile-hidden' : ''}`}>
          <p className="section-title">発動した戦術（{techniqueLog.length}）</p>
          <div className="technique-log-list">
            {[...techniqueLog].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).reverse().map(t => (
              <TechniqueLogItem
                key={t.id}
                t={t}
                isNew={technique?.id === t.id}
                isExpanded={expandedTechId === t.id}
                onToggle={() => setExpandedTechId(prev => prev === t.id ? null : t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 取った駒 */}
      <div className={`captured-section${mobileTab === 'settings' ? ' mobile-hidden' : ''}`}>
        <CapturedPieces pieces={capturedPieces[playerColor]} label={playerName} />
        <CapturedPieces
          pieces={capturedPieces[playerColor === 'w' ? 'b' : 'w']}
          label={gameMode === 'local' ? player2Name : 'CPU'}
        />
      </div>

      {/* ── 設定タブ ── */}
      {/* 対戦モード */}
      <div className={mobileTab === 'game' ? 'mobile-hidden' : ''}>
        <p className="section-title">対戦モード</p>
        <div className="difficulty-row">
          <button
            className={`difficulty-btn ${gameMode === 'cpu' ? 'difficulty-btn-active' : ''}`}
            style={gameMode === 'cpu' ? { borderColor: '#9B8FA6', color: '#9B8FA6' } : {}}
            onClick={() => onGameModeChange('cpu')}
          >
            <span>🤖</span>
            <span>CPU対戦</span>
          </button>
          <button
            className={`difficulty-btn ${gameMode === 'local' ? 'difficulty-btn-active' : ''}`}
            style={gameMode === 'local' ? { borderColor: '#64B5F6', color: '#64B5F6' } : {}}
            onClick={() => onGameModeChange('local')}
          >
            <span>👥</span>
            <span>2人対戦</span>
          </button>
        </div>
      </div>

      {/* 難易度（CPU対戦のみ） */}
      <div className={mobileTab === 'game' || gameMode === 'local' ? 'mobile-hidden' : ''}>
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

      {/* プレイヤー名 */}
      <div className={mobileTab === 'game' ? 'mobile-hidden' : ''}>
        <p className="section-title">{gameMode === 'local' ? '白プレイヤー名' : 'プレイヤー名'}</p>
        <div className="player-name-row">
          <input
            className="player-name-input"
            type="text"
            maxLength={16}
            value={playerName}
            onChange={e => onPlayerNameChange(e.target.value)}
            placeholder="あなた"
          />
          <button className="stats-open-btn" onClick={onShowStats}>
            📊 統計
          </button>
        </div>
      </div>

      {/* 黒プレイヤー名（2人対戦のみ） */}
      {gameMode === 'local' && (
        <div className={mobileTab === 'game' ? 'mobile-hidden' : ''}>
          <p className="section-title">黒プレイヤー名</p>
          <div className="player-name-row">
            <input
              className="player-name-input"
              type="text"
              maxLength={16}
              value={player2Name}
              onChange={e => onPlayer2NameChange(e.target.value)}
              placeholder="プレイヤー2"
            />
          </div>
        </div>
      )}

      {/* 持ち時間 */}
      <div className={mobileTab === 'game' ? 'mobile-hidden' : ''}>
        <p className="section-title">持ち時間</p>
        <div className="difficulty-row clock-mode-row">
          {CLOCK_CONFIG.map(c => (
            <button
              key={c.id}
              className={`difficulty-btn ${clockMode === c.id ? 'difficulty-btn-active' : ''}`}
              style={clockMode === c.id ? { borderColor: '#2196F3', color: '#2196F3' } : {}}
              onClick={() => onClockModeChange(c.id)}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 手番選択（CPU対戦のみ） */}
      <div className={mobileTab === 'game' || gameMode === 'local' ? 'mobile-hidden' : ''}>
        <p className="section-title">手番</p>
        <div className="difficulty-row">
          <button
            className={`difficulty-btn ${playerColor === 'w' ? 'difficulty-btn-active' : ''}`}
            style={playerColor === 'w' ? { borderColor: '#9E9E9E', color: '#9E9E9E' } : {}}
            onClick={() => onPlayerColorChange('w')}
          >
            <span>♙</span>
            <span>白番（先手）</span>
          </button>
          <button
            className={`difficulty-btn ${playerColor === 'b' ? 'difficulty-btn-active' : ''}`}
            style={playerColor === 'b' ? { borderColor: '#555', color: '#555' } : {}}
            onClick={() => onPlayerColorChange('b')}
          >
            <span>♟</span>
            <span>黒番（後手）</span>
          </button>
        </div>
      </div>

      {/* カスタマイズ（設定タブ） */}
      <div className={mobileTab === 'game' ? 'mobile-hidden' : ''}>
        <button className="customize-open-btn" onClick={onShowCustomize}>
          🎨 テーマ・駒セット・実績
        </button>
      </div>

      {/* 手順 */}
      <div className={`move-history-section${mobileTab === 'settings' ? ' mobile-hidden' : ''}`}>
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

      {/* ── ボタン（常に表示） ── */}
      <div className="panel-buttons">
        <button className="new-game-btn" onClick={onNewGame}>新しいゲーム</button>
        <button className="history-btn" onClick={onShowHistory}>📋 履歴</button>
        <button className="history-btn" onClick={onShowPuzzle}>🧩 パズル</button>
        <button className="history-btn" onClick={onShowOpening}>📖 定跡</button>
        {onShowFenInput && (
          <button className="history-btn" onClick={onShowFenInput}>♟ FEN入力</button>
        )}
      </div>

    </div>
  );
}
