import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useAuth } from '../hooks/useAuth';
import { ACHIEVEMENTS } from '../data/achievements';
import { PUZZLES } from '../data/puzzles';

const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };
const DIFF_COLOR = { easy: '#4CAF50', normal: '#FF9800', hard: '#F44336' };
const TOTAL_OPENINGS = 65;

function loadAllData() {
  try {
    const gameData = JSON.parse(localStorage.getItem('chess-master-data') || '{}');
    const logs     = JSON.parse(localStorage.getItem('chess-master-logs') || '[]');
    const solved   = JSON.parse(localStorage.getItem('chess-solved-puzzles') || '[]');
    const practiced = JSON.parse(localStorage.getItem('chess-opening-practice') || '[]');
    const name     = localStorage.getItem('chess-player-name') || 'あなた';
    return { gameData, logs, solved, practiced, name };
  } catch {
    return { gameData: {}, logs: [], solved: [], practiced: [], name: 'あなた' };
  }
}

function calcStats(logs) {
  const total  = logs.length;
  const wins   = logs.filter(l => l.result === 'win').length;
  const losses = logs.filter(l => l.result === 'loss').length;
  const draws  = logs.filter(l => l.result === 'draw').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  let bestStreak = 0, cur = 0;
  [...logs].reverse().forEach(l => {
    if (l.result === 'win') { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  });

  const byDiff = { easy: { w:0, l:0, d:0 }, normal: { w:0, l:0, d:0 }, hard: { w:0, l:0, d:0 } };
  logs.forEach(l => {
    const d = byDiff[l.difficulty];
    if (d) {
      if (l.result === 'win') d.w++;
      else if (l.result === 'loss') d.l++;
      else d.d++;
    }
  });

  const recent = logs.slice(0, 10);
  return { total, wins, losses, draws, winRate, bestStreak, byDiff, recent };
}

function ResultDot({ result }) {
  const map = {
    win:  { label: '○', color: '#4CAF50' },
    loss: { label: '×', color: '#F44336' },
    draw: { label: '△', color: '#9E9E9E' },
  };
  const { label, color } = map[result] || map.draw;
  return <span className="profile-result-dot" style={{ color }}>{label}</span>;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, signOut } = useAuth();
  const [data, setData] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    const d = loadAllData();
    setData(d);
    setNameInput(d.name);
  }, []);

  const saveName = () => {
    const trimmed = nameInput.trim() || 'あなた';
    localStorage.setItem('chess-player-name', trimmed);
    setData(prev => ({ ...prev, name: trimmed }));
    setEditingName(false);
  };

  if (!data) return null;

  const s = calcStats(data.logs);
  const unlockedIds = data.gameData.unlockedAchievements || [];
  const wins = data.gameData.wins ?? 0;
  const streak = data.gameData.streak ?? 0;
  const solvedCount = data.solved.filter(id => PUZZLES.find(p => p.id === id)).length;
  const practicedCount = data.practiced.length;

  return (
    <div className="profile-container">
      <div className="home-bg-glow home-bg-glow--left" />
      <div className="home-bg-glow home-bg-glow--right" />
      <NavBar />

      <div className="profile-inner">

        {/* プレイヤー名 */}
        <section className="profile-hero">
          {/* アバター: ログイン済みなら Google 画像、未ログインなら♟ */}
          {user?.user_metadata?.avatar_url
            ? <img
                className="profile-avatar profile-avatar--google"
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
                referrerPolicy="no-referrer"
              />
            : <div className="profile-avatar">♟</div>
          }
          <div className="profile-hero-body">
            {/* Googleログイン済みの場合はGoogle名を表示 */}
            {user ? (
              <div className="profile-name-row">
                <h1 className="profile-name">{user.user_metadata?.full_name ?? user.email}</h1>
                <button className="profile-google-signout" onClick={signOut} title="ログアウト">
                  ログアウト
                </button>
              </div>
            ) : editingName ? (
              <div className="profile-name-edit">
                <input
                  className="profile-name-input"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value.slice(0, 16))}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  autoFocus
                  maxLength={16}
                />
                <button className="profile-name-save" onClick={saveName}>保存</button>
                <button className="profile-name-cancel" onClick={() => setEditingName(false)}>キャンセル</button>
              </div>
            ) : (
              <div className="profile-name-row">
                <h1 className="profile-name">{data.name}</h1>
                <button className="profile-name-edit-btn" onClick={() => setEditingName(true)}>✏️</button>
              </div>
            )}
            <p className="profile-sub">総勝利数 {wins} · 現在 {streak} 連勝</p>
            {/* 未ログインの場合はログインボタンを表示 */}
            {!user && (
              <button className="profile-google-login-btn" onClick={signInWithGoogle}>
                <span className="profile-google-icon">G</span>
                Googleでログイン
              </button>
            )}
          </div>
        </section>

        {/* メインスタッツ */}
        <section className="profile-stats-grid">
          {[
            { label: '総対局', value: s.total, icon: '🎮' },
            { label: '勝利', value: s.wins, icon: '👑' },
            { label: '敗北', value: s.losses, icon: '💀' },
            { label: '勝率', value: `${s.winRate}%`, icon: '📈' },
            { label: '最長連勝', value: `${s.bestStreak}`, icon: '🔥' },
            { label: '引き分け', value: s.draws, icon: '🤝' },
          ].map(item => (
            <div key={item.label} className="profile-stat-card">
              <span className="profile-stat-icon">{item.icon}</span>
              <span className="profile-stat-value">{item.value}</span>
              <span className="profile-stat-label">{item.label}</span>
            </div>
          ))}
        </section>

        {/* 難易度別 */}
        <section className="profile-section">
          <h2 className="profile-section-title">難易度別成績</h2>
          <div className="profile-diff-list">
            {Object.entries(s.byDiff).map(([diff, d]) => {
              const t = d.w + d.l + d.d;
              const rate = t > 0 ? Math.round((d.w / t) * 100) : 0;
              return (
                <div key={diff} className="profile-diff-row">
                  <span className="profile-diff-name" style={{ color: DIFF_COLOR[diff] }}>
                    {DIFF_LABEL[diff]}
                  </span>
                  <span className="profile-diff-result">{d.w}勝 {d.l}敗 {d.d}分</span>
                  <div className="profile-diff-bar-wrap">
                    <div className="profile-diff-bar" style={{ width: `${rate}%`, background: DIFF_COLOR[diff] }} />
                  </div>
                  <span className="profile-diff-rate">{t > 0 ? `${rate}%` : '–'}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 学習進捗 */}
        <section className="profile-section">
          <h2 className="profile-section-title">学習進捗</h2>
          <div className="profile-progress-list">
            <div className="profile-progress-item" onClick={() => navigate('/puzzles')}>
              <div className="profile-progress-header">
                <span className="profile-progress-icon">🧩</span>
                <span className="profile-progress-name">パズル</span>
                <span className="profile-progress-count">{solvedCount} / {PUZZLES.length}</span>
              </div>
              <div className="profile-progress-bar-wrap">
                <div
                  className="profile-progress-bar"
                  style={{ width: `${PUZZLES.length > 0 ? (solvedCount / PUZZLES.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="profile-progress-item" onClick={() => navigate('/play')}>
              <div className="profile-progress-header">
                <span className="profile-progress-icon">📖</span>
                <span className="profile-progress-name">定跡練習</span>
                <span className="profile-progress-count">{practicedCount} / {TOTAL_OPENINGS}</span>
              </div>
              <div className="profile-progress-bar-wrap">
                <div
                  className="profile-progress-bar profile-progress-bar--gold"
                  style={{ width: `${(practicedCount / TOTAL_OPENINGS) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 実績 */}
        <section className="profile-section">
          <h2 className="profile-section-title">
            実績
            <span className="profile-achievement-count">{unlockedIds.length} / {ACHIEVEMENTS.length}</span>
          </h2>
          <div className="profile-achievements">
            {ACHIEVEMENTS.map(a => {
              const unlocked = unlockedIds.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`profile-achievement ${unlocked ? 'profile-achievement--unlocked' : 'profile-achievement--locked'}`}
                  title={a.description}
                >
                  <span className="profile-achievement-icon">{a.icon}</span>
                  <span className="profile-achievement-name">{a.name}</span>
                  {!unlocked && <span className="profile-achievement-lock">🔒</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 直近の対局 */}
        {s.recent.length > 0 && (
          <section className="profile-section">
            <h2 className="profile-section-title">直近の対局</h2>
            <div className="profile-recent">
              {s.recent.map(l => (
                <div key={l.id} className="profile-recent-row">
                  <ResultDot result={l.result} />
                  <span className="profile-recent-diff" style={{ color: DIFF_COLOR[l.difficulty] }}>
                    {DIFF_LABEL[l.difficulty]}
                  </span>
                  <span className="profile-recent-moves">{l.moveCount}手</span>
                  <span className="profile-recent-date">
                    {new Date(l.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {s.total === 0 && (
          <div className="profile-empty">
            <p>まだ対局記録がありません。</p>
            <button className="learn-cta-btn" onClick={() => navigate('/play')}>
              ♟ 対局を始める
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
