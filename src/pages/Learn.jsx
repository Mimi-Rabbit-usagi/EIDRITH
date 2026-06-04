import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

// hasContent: true = レッスンデータが存在する（コンテンツあり）
// hasContent: false = 近日公開
const LESSON_DEFS = [
  { id: 'pieces',   icon: '♟',  title: '駒の動き',              desc: 'ポーン・ナイト・ビショップ・ルーク・クイーン・キングの動き方', hasContent: true },
  { id: 'check',    icon: '⚠️', title: 'チェックとチェックメイト', desc: '王手のかけ方、逃げ方、詰み方を理解しよう',                 hasContent: true },
  { id: 'fork',     icon: '🍴', title: 'フォーク（両取り）',       desc: '1つの駒で相手の2駒を同時に攻撃する強力な戦術',            hasContent: true },
  { id: 'pin',      icon: '📌', title: 'ピン',                  desc: '相手の駒を動けなくする戦術テクニック',                    hasContent: true },
  { id: 'skewer',   icon: '🗡️', title: 'スキュア',               desc: '価値の高い駒を攻撃し、その後ろの駒を取る',               hasContent: true },
  { id: 'opening',  icon: '🎯', title: '序盤の考え方',            desc: 'センターコントロール・駒の展開・キャスリング',              hasContent: false },
  { id: 'endgame',  icon: '🏁', title: 'エンドゲーム入門',        desc: 'キングの活用・ポーン昇格の狙い方',                       hasContent: false },
  { id: 'strategy', icon: '🧠', title: '中盤の戦略',             desc: 'コマの協力・弱点マスの狙い方',                          hasContent: false },
];

export default function Learn() {
  const navigate = useNavigate();

  // progressは1回だけ読み込む
  const progress = (() => {
    try { return JSON.parse(localStorage.getItem('chess-lesson-progress') || '[]'); } catch { return []; }
  })();

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
        {LESSON_DEFS.map((lesson, index) => {
          const done = progress.includes(lesson.id);
          // 最初のレッスンは常にアンロック。それ以降は前のレッスンが完了済みでアンロック
          const unlocked = lesson.hasContent && (index === 0 || progress.includes(LESSON_DEFS[index - 1].id));

          // ── アンロック済み ──────────────────────────────────────────────
          if (unlocked) {
            return (
              <div
                key={lesson.id}
                className={`learn-card learn-card--available${done ? ' learn-card--done' : ''}`}
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

          // ── コンテンツあり・ロック中（前のレッスン未完了）─────────────────
          if (lesson.hasContent) {
            const prevLesson = LESSON_DEFS[index - 1];
            return (
              <div key={lesson.id} className="learn-card learn-card--locked">
                <div className="learn-card-number">#{index + 1}</div>
                <div className="learn-card-icon">{lesson.icon}</div>
                <div className="learn-card-body">
                  <div className="learn-card-title">{lesson.title}</div>
                  <p className="learn-card-desc">{lesson.desc}</p>
                </div>
                <div className="learn-card-badge learn-card-badge--locked">
                  🔒 {prevLesson.title}を先に
                </div>
              </div>
            );
          }

          // ── 近日公開 ───────────────────────────────────────────────────
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
