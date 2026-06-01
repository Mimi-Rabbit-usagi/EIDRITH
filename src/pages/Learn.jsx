import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

const LESSONS = [
  { id: 'pieces',    icon: '♟', title: '駒の動き',         desc: 'ポーン・ナイト・ビショップ・ルーク・クイーン・キングの動き方',   available: true },
  { id: 'check',     icon: '⚠️', title: 'チェックとチェックメイト', desc: '王手のかけ方、逃げ方、詰み方を理解しよう',                available: true },
  { id: 'fork',      icon: '🍴', title: 'フォーク（両取り）',   desc: '1つの駒で相手の2駒を同時に攻撃する強力な戦術',           available: true },
  { id: 'pin',       icon: '📌', title: 'ピン',             desc: '相手の駒を動けなくする戦術テクニック',                    available: true },
  { id: 'skewer',    icon: '🗡️', title: 'スキュア',          desc: '価値の高い駒を攻撃し、その後ろの駒を取る',                available: true },
  { id: 'opening',   icon: '🎯', title: '序盤の考え方',       desc: 'センターコントロール・駒の展開・キャスリング',               done: false },
  { id: 'endgame',   icon: '🏁', title: 'エンドゲーム入門',    desc: 'キングの活用・ポーン昇格の狙い方',                       done: false },
  { id: 'strategy',  icon: '🧠', title: '中盤の戦略',         desc: 'コマの協力・弱点マスの狙い方',                          done: false },
];

export default function Learn() {
  const navigate = useNavigate();

  return (
    <div className="learn-container">
      {/* 背景装飾 */}
      <div className="home-bg-glow home-bg-glow--left" />

      <NavBar />

      {/* タイトル */}
      <section className="learn-hero">
        <h1 className="learn-title">学習モード</h1>
        <p className="learn-subtitle">
          チェスの基礎から戦術まで、ステップごとに学ぼう。
        </p>
      </section>

      {/* レッスン一覧 */}
      <section className="learn-grid">
        {LESSONS.map((lesson, index) => {
          const progress = (() => {
            try { return JSON.parse(localStorage.getItem('chess-lesson-progress') || '[]'); } catch { return []; }
          })();
          const done = progress.includes(lesson.id);

          if (lesson.available) {
            return (
              <div
                key={lesson.id}
                className="learn-card learn-card--available"
                onClick={() => navigate(`/learn/${lesson.id}`)}
              >
                <div className="learn-card-number">#{index + 1}</div>
                <div className="learn-card-icon">{lesson.icon}</div>
                <div className="learn-card-body">
                  <div className="learn-card-title">{lesson.title}</div>
                  <p className="learn-card-desc">{lesson.desc}</p>
                </div>
                {done
                  ? <div className="learn-card-badge learn-card-badge--done">✅ 完了</div>
                  : <div className="learn-card-badge learn-card-badge--go">→ 始める</div>
                }
              </div>
            );
          }

          return (
            <div key={lesson.id} className="learn-card learn-card--locked">
              <div className="learn-card-number">#{index + 1}</div>
              <div className="learn-card-icon">{lesson.icon}</div>
              <div className="learn-card-body">
                <div className="learn-card-title">{lesson.title}</div>
                <p className="learn-card-desc">{lesson.desc}</p>
              </div>
              <div className="learn-card-badge">近日公開</div>
            </div>
          );
        })}
      </section>

      {/* 足元のCTA */}
      <section className="learn-cta">
        <p className="learn-cta-text">
          まずは対局でチェスを体験しよう！
        </p>
        <button className="learn-cta-btn" onClick={() => navigate('/play')}>
          ♟ 対局を始める
        </button>
      </section>
    </div>
  );
}
