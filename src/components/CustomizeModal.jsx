import { useState } from 'react';
import { BOARD_THEMES } from '../data/themes';
import { PIECE_SETS } from '../data/pieceSets';
import { ACHIEVEMENTS } from '../data/achievements';

const PIECE_VALUES_INFO = [
  { symbol: '♙', name: 'ポーン',     pts: 1 },
  { symbol: '♘', name: 'ナイト',     pts: 3 },
  { symbol: '♗', name: 'ビショップ', pts: 3 },
  { symbol: '♖', name: 'ルーク',     pts: 5 },
  { symbol: '♛', name: 'クイーン',   pts: 9 },
];

const TABS = [
  { id: 'theme',        label: '🎨 テーマ' },
  { id: 'pieces',       label: '♟ 駒セット' },
  { id: 'achievements', label: '🏆 実績' },
];

export default function CustomizeModal({
  activeBoardTheme, unlockedBoardThemes,
  activePieceSet, unlockedPieceSets,
  unlockedAchievements, wins,
  onThemeChange, onPieceSetChange,
  onClose,
}) {
  const [tab, setTab] = useState('theme');

  const activeThemeName = BOARD_THEMES.find(t => t.id === activeBoardTheme)?.name ?? '';
  const activeSetName   = PIECE_SETS.find(p => p.id === activePieceSet)?.name ?? '';

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal customize-modal" onClick={e => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="stats-header">
          <h2 className="stats-title">🎨 カスタマイズ</h2>
          <button className="stats-close" onClick={onClose}>✕</button>
        </div>

        {/* タブバー */}
        <div className="customize-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`customize-tab-btn ${tab === t.id ? 'customize-tab-active' : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* ── テーマタブ ── */}
        {tab === 'theme' && (
          <div className="customize-content">
            <p className="customize-subtitle">
              現在: <strong>{activeThemeName}</strong>
              {' · '}勝利数でアンロック（{wins}勝達成中）
            </p>
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
                      style={{ background: `linear-gradient(135deg, ${theme.lightSquare} 50%, ${theme.darkSquare} 50%)` }}
                    />
                    <span className="theme-name">{unlocked ? theme.emoji : '🔒'}</span>
                    {!unlocked && <span className="theme-lock-text">{theme.requiredWins}勝</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 駒セットタブ ── */}
        {tab === 'pieces' && (
          <div className="customize-content">
            <p className="customize-subtitle">
              現在: <strong>{activeSetName}</strong>
              {' · '}勝利数でアンロック（{wins}勝達成中）
            </p>
            <div className="theme-grid">
              {PIECE_SETS.map(ps => {
                const unlocked = (unlockedPieceSets || ['classic']).includes(ps.id);
                const isActive = activePieceSet === ps.id;
                return (
                  <button
                    key={ps.id}
                    className={`piece-set-btn ${isActive ? 'piece-set-btn-active' : ''} ${!unlocked ? 'theme-btn-locked' : ''}`}
                    style={unlocked ? {
                      background: ps.cardBg,
                      borderColor: isActive ? ps.accentColor : 'transparent',
                      boxShadow: isActive ? `0 0 10px ${ps.accentColor}55` : 'none',
                    } : {}}
                    onClick={() => unlocked && onPieceSetChange(ps.id)}
                    title={unlocked ? ps.name : `${ps.requiredWins}勝でアンロック`}
                  >
                    <span
                      className="piece-set-symbol"
                      style={unlocked ? { color: ps.symbolColor, filter: ps.symbolFilter } : {}}
                    >♛</span>
                    <span className="piece-set-btn-name">{ps.name}</span>
                    {!unlocked && <span className="theme-lock-text">{ps.requiredWins}勝</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 実績タブ ── */}
        {tab === 'achievements' && (
          <div className="customize-content">
            <p className="customize-subtitle">
              解除済み: <strong>{(unlockedAchievements || []).length} / {ACHIEVEMENTS.length}</strong>
            </p>
            <div className="achievement-grid">
              {ACHIEVEMENTS.map(a => {
                const unlocked = (unlockedAchievements || []).includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`achievement-badge ${unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
                    title={unlocked ? `${a.name}：${a.description}` : `未解除：${a.description}`}
                  >
                    <span className="achievement-icon">{unlocked ? a.icon : '🔒'}</span>
                    <span className="achievement-name">{a.name}</span>
                  </div>
                );
              })}
            </div>

            {/* 駒の点数リファレンス */}
            <div className="piece-values-ref">
              <p className="piece-values-ref-title">駒の点数</p>
              <div className="piece-values-ref-grid">
                {PIECE_VALUES_INFO.map(p => (
                  <div key={p.name} className="piece-value-row">
                    <span className="pv-symbol">{p.symbol}</span>
                    <span className="pv-name">{p.name}</span>
                    <span className="pv-pts">{p.pts}pt</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
