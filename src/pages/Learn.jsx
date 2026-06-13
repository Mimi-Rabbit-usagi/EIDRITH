import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { safeLoad } from '../lib/storage';
import { OPENINGS } from '../data/openings';

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

const CONTENT_LESSONS = LESSON_DEFS.filter(l => l.hasContent);

export default function Learn() {
  const navigate = useNavigate();
  const progress = safeLoad('chess-lesson-progress', []);

  const completedCount = progress.filter(id => LESSON_DEFS.find(l => l.id === id)).length;
  const totalContent   = CONTENT_LESSONS.length;
  const progressPct    = totalContent > 0 ? Math.round((completedCount / totalContent) * 100) : 0;

  return (
    <div className="learn-container">
      <div className="home-bg-glow home-bg-glow--left" />
      <div className="home-bg-glow home-bg-glow--right" />

      <NavBar />

      {/* ヒーロー */}
      <section className="learn-hero">
        <h1 className="learn-title">📖 学習モード</h1>
        <p className="learn-subtitle">基礎から戦術まで、ステップごとに学ぼう。</p>

        <div className="learn-hero-progress">
          <div className="learn-hero-prog-meta">
            <span className="learn-hero-prog-label">
              {completedCount > 0 ? `${completedCount} / ${totalContent} レッスン完了` : 'まだ始めていません'}
            </span>
            <span className="learn-hero-prog-pct">{progressPct}%</span>
          </div>
          <div className="learn-hero-prog-bar-wrap">
            <div className="learn-hero-prog-bar" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </section>

      {/* レッスン一覧 */}
      <section className="learn-section">
        <div className="learn-section-head">
          <span className="learn-section-label">レッスン</span>
          <span className="learn-section-count">{totalContent}コース</span>
        </div>

        <div className="learn-grid">
          {LESSON_DEFS.map((lesson, index) => {
            const done      = progress.includes(lesson.id);
            const unlocked  = lesson.hasContent && (index === 0 || progress.includes(LESSON_DEFS[index - 1].id));
            const isContent = lesson.hasContent;

            // ── 完了済み / アンロック済み ──
            if (unlocked) {
              return (
                <button
                  key={lesson.id}
                  className={`learn-card learn-card--available${done ? ' learn-card--done' : ''}`}
                  onClick={() => navigate(`/learn/${lesson.id}`)}
                >
                  <div className={`learn-step-num ${done ? 'learn-step-num--done' : 'learn-step-num--active'}`}>
                    {done ? '✓' : index + 1}
                  </div>
                  <div className="learn-card-icon">{lesson.icon}</div>
                  <div className="learn-card-body">
                    <div className="learn-card-title">{lesson.title}</div>
                    <p className="learn-card-desc">{lesson.desc}</p>
                  </div>
                  <div className={`learn-card-status ${done ? 'learn-card-status--done' : 'learn-card-status--go'}`}>
                    {done ? '完了' : '→'}
                  </div>
                </button>
              );
            }

            // ── コンテンツあり・ロック中 ──
            if (isContent) {
              const prevLesson = LESSON_DEFS[index - 1];
              return (
                <div key={lesson.id} className="learn-card learn-card--locked">
                  <div className="learn-step-num learn-step-num--locked">{index + 1}</div>
                  <div className="learn-card-icon">{lesson.icon}</div>
                  <div className="learn-card-body">
                    <div className="learn-card-title">{lesson.title}</div>
                    <p className="learn-card-desc">{lesson.desc}</p>
                  </div>
                  <div className="learn-card-status learn-card-status--locked">
                    🔒
                    <span className="learn-card-lock-hint">「{prevLesson.title}」を先に</span>
                  </div>
                </div>
              );
            }

            // ── 近日公開 ──
            return (
              <div key={lesson.id} className="learn-card learn-card--soon">
                <div className="learn-step-num learn-step-num--soon">{index + 1}</div>
                <div className="learn-card-icon">{lesson.icon}</div>
                <div className="learn-card-body">
                  <div className="learn-card-title">{lesson.title}</div>
                  <p className="learn-card-desc">{lesson.desc}</p>
                </div>
                <div className="learn-card-status learn-card-status--soon">準備中</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 関連コース */}
      <section className="learn-section learn-extras">
        <div className="learn-section-head">
          <span className="learn-section-label">関連コース</span>
        </div>
        <div className="learn-extras-grid">
          <button className="learn-extra-card" onClick={() => navigate('/endgame')}>
            <div className="learn-extra-icon">🏁</div>
            <div className="learn-extra-body">
              <div className="learn-extra-title">エンドゲームレッスン</div>
              <p className="learn-extra-desc">オポジション・ポーン昇格・ルーク詰みをインタラクティブに学ぶ</p>
            </div>
            <span className="learn-extra-arrow">→</span>
          </button>

          <button className="learn-extra-card" onClick={() => navigate('/openings')}>
            <div className="learn-extra-icon">📖</div>
            <div className="learn-extra-body">
              <div className="learn-extra-title">定跡ライブラリ</div>
              <p className="learn-extra-desc">{OPENINGS.length}種類の序盤定跡を盤面で練習できます</p>
            </div>
            <span className="learn-extra-arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
