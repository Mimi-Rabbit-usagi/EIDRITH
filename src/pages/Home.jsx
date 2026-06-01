import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

function loadStats() {
  try {
    const data = JSON.parse(localStorage.getItem('chess-master-data') || '{}');
    const solved = JSON.parse(localStorage.getItem('chess-solved-puzzles') || '[]');
    return {
      wins: data.wins ?? 0,
      streak: data.streak ?? 0,
      puzzlesSolved: solved.length,
    };
  } catch {
    return { wins: 0, streak: 0, puzzlesSolved: 0 };
  }
}

const MODES = [
  {
    id: 'play',
    path: '/play',
    icon: '♟',
    title: '対局',
    subtitle: 'CPU対戦',
    description: '3段階の難易度でCPUと対戦。チェスクロック・定跡解説・戦術検出つき。',
    accent: '#6c63ff',
    available: true,
  },
  {
    id: 'learn',
    path: '/learn',
    icon: '📖',
    title: '学習',
    subtitle: '基礎から学ぶ',
    description: '駒の動き・チェック・フォーク・ピンなど、チェスの基礎を対話形式で学習。',
    accent: '#c89b3c',
    available: true,
  },
  {
    id: 'puzzles',
    path: '/puzzles',
    icon: '♞',
    title: 'パズル',
    subtitle: '12問収録',
    description: 'バックランクメイト・フォーク・詰みなどの戦術問題を解いて上達しよう。',
    accent: '#3cb89b',
    available: true,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ wins: 0, streak: 0, puzzlesSolved: 0 });
  const [playerName, setPlayerName] = useState('プレイヤー');

  useEffect(() => {
    setStats(loadStats());
    const name = localStorage.getItem('chess-player-name');
    if (name) setPlayerName(name);
  }, []);

  return (
    <div className="home-container">
      {/* 背景装飾 */}
      <div className="home-bg-glow home-bg-glow--left" />
      <div className="home-bg-glow home-bg-glow--right" />

      <NavBar />

      {/* ヒーローセクション */}
      <section className="home-hero">
        <h1 className="home-hero-title">
          チェスで、<br />
          <span className="home-hero-title--accent">強くなれ。</span>
        </h1>
        <p className="home-hero-sub">
          対局・学習・パズルで、初心者でも楽しくチェスが上達できる。
        </p>
      </section>

      {/* モードカード */}
      <section className="home-modes">
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
      </section>

      {/* スタッツバー */}
      <section className="home-stats">
        <div className="home-stat">
          <span className="home-stat-icon">👑</span>
          <span className="home-stat-value">{stats.wins}</span>
          <span className="home-stat-label">勝利</span>
        </div>
        <div className="home-stat-divider" />
        <div className="home-stat">
          <span className="home-stat-icon">🔥</span>
          <span className="home-stat-value">{stats.streak}</span>
          <span className="home-stat-label">連勝</span>
        </div>
        <div className="home-stat-divider" />
        <div className="home-stat">
          <span className="home-stat-icon">🧩</span>
          <span className="home-stat-value">{stats.puzzlesSolved}<span className="home-stat-denom">/12</span></span>
          <span className="home-stat-label">パズル</span>
        </div>
      </section>

      {/* フッター */}
      <footer className="home-footer">
        <span>将来実装予定：オンライン対戦 · Googleログイン · レーティング</span>
      </footer>
    </div>
  );
}
