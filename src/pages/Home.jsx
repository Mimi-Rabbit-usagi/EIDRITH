import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import {
  loadGameData, safeLoad,
  getTodayDateString, getDailyPuzzleIndex, loadDailyInfo,
  loadQuizStats, loadTrainingStats,
} from '../lib/storage';
import { PUZZLES } from '../data/puzzles';
import { LESSONS } from '../data/lessons';
import { OPENINGS } from '../data/openings';

const TOTAL_OPENINGS = OPENINGS.length;

function loadDashData() {
  const gameData      = loadGameData();
  const logs          = safeLoad('chess-master-logs', []);
  const solved        = safeLoad('chess-solved-puzzles', []);
  const practiced     = safeLoad('chess-opening-practice', []);
  const completedLess = safeLoad('chess-lesson-progress', []);
  const name          = safeLoad('chess-player-name', null);
  const avatar        = safeLoad('chess-avatar-emoji', '');
  const quizStats     = loadQuizStats();
  const trainingStats = loadTrainingStats();
  return { gameData, logs, solved, practiced, completedLess, name, avatar, quizStats, trainingStats };
}

const MODES = [
  {
    id: 'play',
    path: '/play',
    icon: '♟',
    title: '対局',
    subtitle: 'CPU対戦',
    description: '3段階の難易度でCPUと対戦。',
    accent: '#6c63ff',
  },
  {
    id: 'learn',
    path: '/learn',
    icon: '📖',
    title: '学習',
    subtitle: '基礎から学ぶ',
    description: '駒の動きや基本戦術を学ぼう。',
    accent: '#c89b3c',
  },
  {
    id: 'puzzles',
    path: '/puzzles',
    icon: '♞',
    title: 'パズル',
    subtitle: '戦術問題',
    description: 'フォーク・詰みなどを解いて上達。',
    accent: '#3cb89b',
  },
  {
    id: 'openings',
    path: '/openings',
    icon: '♗',
    title: '定跡',
    subtitle: 'オープニング',
    description: '65種の定跡を学びクイズで腕試し。',
    accent: '#e06c75',
  },
  {
    id: 'endgame',
    path: '/endgame',
    icon: '♔',
    title: 'エンドゲーム',
    subtitle: '終盤練習',
    description: 'キング＋ルークなどの詰め方を習得。',
    accent: '#56b6c2',
  },
  {
    id: 'review',
    path: '/review',
    icon: '🔍',
    title: '棋譜解析',
    subtitle: 'ゲームレビュー',
    description: '過去の対局を振り返り反省しよう。',
    accent: '#98c379',
  },
];

const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };
const RESULT_MARK = { win: { label: '勝', color: '#4CAF50' }, loss: { label: '敗', color: '#F44336' }, draw: { label: '分', color: '#9E9E9E' } };

function greeting(name) {
  const h = new Date().getHours();
  if (h < 5)  return `お疲れさまです、${name}`;
  if (h < 12) return `おはようございます、${name}`;
  if (h < 18) return `こんにちは、${name}`;
  return `こんばんは、${name}`;
}

export default function Home() {
  const navigate = useNavigate();
  // localStorage の読み込みは同期的なので、effect ではなく初期化関数で一度だけ行う
  const [dash] = useState(() => loadDashData());

  const today = getTodayDateString();
  const [dailyInfo] = useState(() => loadDailyInfo());

  const dailyIdx    = PUZZLES.length > 0 ? getDailyPuzzleIndex(today, PUZZLES.length) : 0;
  const dailyPuzzle = PUZZLES[dailyIdx];
  const todaySolved = dailyInfo.lastSolvedDate === today;

  const stats = dash ? {
    wins:         dash.gameData.wins ?? 0,
    streak:       dash.gameData.streak ?? 0,
    total:        dash.logs.length,
    winRate:      dash.logs.length > 0
      ? Math.round((dash.logs.filter(l => l.result === 'win').length / dash.logs.length) * 100)
      : 0,
    puzzlesSolved:  dash.solved.filter(id => PUZZLES.find(p => p.id === id)).length,
    openingsDone:   dash.practiced.length,
    lessonsDone:    dash.completedLess.filter(id => LESSONS[id]).length,
    recentLogs:     dash.logs.slice(0, 3),
  } : null;

  const playerName = dash?.name || 'プレイヤー';
  const avatar     = dash?.avatar || '♟';

  return (
    <div className="home-container">
      <div className="home-bg-glow home-bg-glow--left" />
      <div className="home-bg-glow home-bg-glow--right" />

      <NavBar />

      {/* ダッシュボード ヘッダー */}
      <section className="home-dash-header">
        <div className="home-dash-avatar">{avatar}</div>
        <div className="home-dash-greet">
          <h1 className="home-dash-name">{greeting(playerName)}</h1>
          {stats && (
            <div className="home-dash-stats">
              <div className="home-dash-stat">
                <span className="home-dash-stat-val">{stats.wins}</span>
                <span className="home-dash-stat-lbl">勝利</span>
              </div>
              <div className="home-dash-stat-divider" />
              <div className={`home-dash-stat ${stats.streak > 0 ? 'home-dash-stat--streak' : ''}`}>
                <span className="home-dash-stat-val">
                  {stats.streak > 0 ? `🔥 ${stats.streak}` : '—'}
                </span>
                <span className="home-dash-stat-lbl">連勝</span>
              </div>
              {stats.total > 0 && (
                <>
                  <div className="home-dash-stat-divider" />
                  <div className="home-dash-stat">
                    <span className="home-dash-stat-val">{stats.winRate}%</span>
                    <span className="home-dash-stat-lbl">勝率</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 今日のパズル */}
      {dailyPuzzle && (
        <section className="home-daily">
          <button
            className={`home-daily-card ${todaySolved ? 'home-daily-card--solved' : ''}`}
            onClick={() => navigate('/puzzles?daily=true')}
          >
            <div className="home-daily-left">
              <span className="home-daily-icon">📅</span>
              <div>
                <p className="home-daily-label">今日のパズル</p>
                <p className="home-daily-title">{dailyPuzzle.title}</p>
              </div>
            </div>
            <div className="home-daily-right">
              {dailyInfo.streak > 0 && (
                <span className="home-daily-streak">🔥 {dailyInfo.streak}日連続</span>
              )}
              {todaySolved ? (
                <span className="home-daily-badge">✓ クリア</span>
              ) : (
                <span className="home-daily-cta">挑戦する →</span>
              )}
            </div>
          </button>
        </section>
      )}

      {/* 直近の対局 */}
      {stats && stats.recentLogs.length > 0 && (
        <section className="home-recent">
          <div className="home-section-head">
            <span className="home-section-title">直近の対局</span>
            <button className="home-section-link" onClick={() => navigate('/profile')}>すべて見る →</button>
          </div>
          <div className="home-recent-list">
            {stats.recentLogs.map((l, i) => {
              const rm = RESULT_MARK[l.result] ?? RESULT_MARK.draw;
              return (
                <div
                  key={l.id ?? i}
                  className={`home-recent-row ${l.moves?.length > 0 ? 'home-recent-row--clickable' : ''}`}
                  onClick={() => {
                    if (l.moves?.length > 0) navigate('/review', { state: { game: l } });
                  }}
                >
                  <span className="home-recent-mark" style={{ color: rm.color }}>{rm.label}</span>
                  <span className="home-recent-diff">{DIFF_LABEL[l.difficulty] ?? l.difficulty}</span>
                  <span className="home-recent-moves">{l.moveCount}手</span>
                  <span className="home-recent-date">
                    {new Date(l.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </span>
                  {l.moves?.length > 0 && <span className="home-recent-review">▶ 振り返る</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 学習進捗 */}
      {stats && (
        <section className="home-progress">
          <div className="home-section-head">
            <span className="home-section-title">学習進捗</span>
            <button className="home-section-link" onClick={() => navigate('/profile')}>詳細 →</button>
          </div>
          <div className="home-progress-bars">
            {[
              { label: 'パズル',   value: stats.puzzlesSolved, total: PUZZLES.length,   color: '#3cb89b' },
              { label: 'レッスン', value: stats.lessonsDone,   total: Object.keys(LESSONS).length, color: '#c89b3c' },
              { label: '定跡練習', value: stats.openingsDone,  total: TOTAL_OPENINGS,   color: '#e06c75' },
            ].map(item => (
              <div key={item.label} className="home-progress-item">
                <div className="home-progress-meta">
                  <span className="home-progress-label">{item.label}</span>
                  <span className="home-progress-count">{item.value} / {item.total}</span>
                </div>
                <div className="home-progress-bar-wrap">
                  <div
                    className="home-progress-bar"
                    style={{
                      width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* モードカード */}
      <section className="home-modes-wrap">
        <div className="home-section-head">
          <span className="home-section-title">メニュー</span>
        </div>
        <div className="home-modes">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              className="home-mode-card"
              style={{ '--card-accent': mode.accent }}
              onClick={() => navigate(mode.path)}
            >
              <div className="home-mode-icon">{mode.icon}</div>
              <div className="home-mode-body">
                <div className="home-mode-title">{mode.title}</div>
                <div className="home-mode-subtitle">{mode.subtitle}</div>
                <p className="home-mode-desc">{mode.description}</p>
              </div>
              <div className="home-mode-arrow">→</div>
            </button>
          ))}
        </div>
      </section>

      {/* フッター */}
      <footer className="home-footer">
        <span>EIDRITH Chess — 対局・学習・パズル・定跡でチェスを楽しもう</span>
      </footer>
    </div>
  );
}
