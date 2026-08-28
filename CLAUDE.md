# EIDRITH — プロジェクトガイド

ブラウザで動くチェス学習ゲーム。CPU 対戦を通じて戦術・定跡を学ぶことを主目的とする。

- リポジトリ: https://github.com/Mimi-Rabbit-usagi/EIDRITH （公開）
- 詳細仕様: [SPEC.md](SPEC.md) ※一部が実装とずれている。後述の「既知のズレ」を参照

---

## 技術スタック

| | |
|---|---|
| フレームワーク | React 19 + Vite 8 |
| ルーティング | react-router-dom 7 |
| チェスルール | chess.js 1.4 |
| AI | 自前 minimax（`useAI.js`）＋ Stockfish 18 lite（hard モードのみ） |
| スタイル | Tailwind CSS 4 ＋ 手書き CSS（`App.css` / `index.css`） |
| テスト | vitest + jsdom + @testing-library/react |
| データ保存 | localStorage（オンライン対戦のみ Supabase） |

規模は `src/` 配下で約 11,000 行。

## コマンド

```bash
npm run dev        # 開発サーバー（port 5173 固定）
npm test           # vitest 53件
npm run test:watch # ウォッチモード
npm run lint       # eslint（現在 0 件を維持）
npm run build      # 本番ビルド
```

CI（`.github/workflows/ci.yml`）が **main への push と全 PR** で lint → test → build を自動実行する（約27秒）。

---

## ディレクトリ構成

```
src/
├── pages/        画面（ルーティングの単位）
├── components/   画面をまたいで使う UI 部品
├── hooks/        ロジック（ゲーム進行・AI・時計・音）
├── data/         コンテンツ定義（パズル・レッスン・定跡など）
├── lib/          localStorage / Supabase クライアント
└── test/         テストのセットアップ
```

### 画面（`src/pages/`）

| ルート | ファイル | 行数 | 内容 |
|---|---|---|---|
| `/` | Home.jsx | 287 | ダッシュボード。戦績・学習進捗・デイリーパズル |
| `/play` | **Play.jsx** | **724** | 対局本体。**最大のファイル。分割が Issue #91** |
| `/learn` | Learn.jsx | 152 | レッスン一覧 |
| `/learn/:lessonId` | LessonPlayer.jsx | 296 | レッスン再生（解説ステップ＋クイズステップ） |
| `/puzzles` | Puzzles.jsx | 569 | パズル一覧・解答・タクティクストレーニング |
| `/openings` | Openings.jsx | 503 | 定跡ライブラリ＋クイズ |
| `/endgame` | Endgame.jsx | 282 | エンドゲームレッスン |
| `/tournament` | Tournament.jsx | 205 | 4ラウンドのトーナメント |
| `/review` | Review.jsx | 669 | 棋譜レビュー。戦術自動検出・エンジン評価・PGN 入出力 |
| `/profile` | Profile.jsx | 731 | 戦績・実績・外観設定（テーマ／駒セット／アバター） |
| `/online` | Online.jsx | 436 | Supabase 経由のオンライン対戦。**要 `.env.local`** |

### 主要フック（`src/hooks/`）

**`useChessGame.js`（437行）— ゲームロジックの中枢**

```js
useChessGame(difficulty, playerColor, vsMode, getAIMove)
//   difficulty: 'easy' | 'normal' | 'hard'
//   playerColor: 'w' | 'b'
//   vsMode: 'cpu' | 'human'
//   getAIMove: 外部AI（Stockfish）。null なら内蔵 minimax を使う
```

返り値は `board` `gameStatus` `moveHistory` `handleSquareClick` `undoMove` など約30項目。

> ⚠️ **重要な設計ルール**
> `chess.js` のインスタンスは ref に置かれ**破壊的に更新される**。React はこの変化を検知できないため、盤面を変えたら **必ず `syncFen()`（= `setSnapshot()`）を呼ぶこと**。呼び忘れると画面が更新されない。
> レンダー中に `chessRef.current` を直接読んではいけない。描画用の値は `snapshot` state から取る。

**`useAI.js`（346行）— 内蔵チェスエンジン**

- minimax + αβ枝刈り + 静止探索（quiescence）+ トランスポジション表
- 探索深さ: easy=1 / normal=2 / hard=3
- **easy は 70% の確率でランダムな手を指す**（初心者向けの手加減）
- `evaluatePosition()` は Review の評価バーにも使われる

**`useStockfish.js`（86行）** — hard モードのときだけ Web Worker を起動。応答できない場合は `useChessGame` 側で内蔵 minimax にフォールバックする。

**`detectTactics.js`（446行）— 戦術の自動検出**

`detectFork` `detectPin` `detectSkewer` `detectDiscoveredAttack` `detectBattery` `detectDiscoveredCheck` `detectDoubleCheck` `detectBackRankMate` `detectSmotheredMate` `detectScholarsMate` `detectFoolsMate` の11種。`detectTechnique(chess, move)` が優先順位つきで1つ返す。`buildTechniques(moves)` は SAN 配列から一括検出する（Review 用）。

**その他** — `useChessClock.js`（時計・インクリメント）、`useSoundEffects.js`（効果音）、`detectOpening.js`（定跡判定）、`useAuth.js`（Supabase 認証）

### コンテンツ（`src/data/`）

| ファイル | 件数 | 備考 |
|---|---|---|
| `openings.js` | **71種** | 唯一まともに揃っている |
| `techniques.js` | 66項目 | 戦術の解説文 |
| `puzzles.js` | **12問** | ⚠️ 少ない。Issue #72 で100問への拡充が課題 |
| `lessons.js` | **5本** | 駒の動き／チェック／フォーク／ピン／スキュア |
| `endgameLessons.js` | **3本** | オポジション／ポーン昇格／ルーク+キング詰み |
| `achievements.js` | 10個 | 初勝利・電光石火・鉄壁突破 など |
| `themes.js` | 6種 | 盤面カラー |
| `pieceSets.js` | 6種 | 駒スタイル |
| `tournamentRounds.js` | 4ラウンド | 定数のみ |

**コンテンツの偏りが最大の弱点。** 定跡71種に対してパズル12問・レッスン5本しかない。

---

## データの持ち方

すべて localStorage。`src/lib/storage.js` の `safeLoad` / `safeSave` を経由すること（プライベートモードや容量超過で落ちないようにガードしてある）。**直接 `localStorage` を触らない。**

主なキー:

| キー | 内容 |
|---|---|
| `chess-master-data` | 戦績・アンロック状況（バックアップとバージョン管理あり） |
| `chess-master-logs` | 対局ログ（最大30件） |
| `chess-solved-puzzles` | 解いたパズルID |
| `chess-lesson-progress` / `chess-endgame-progress` | レッスン進捗 |
| `chess-opening-practice` / `chess-opening-quiz` | 定跡の練習・クイズ成績 |
| `chess-daily-puzzle` | デイリーパズルのストリーク |
| `chess-tactics-training` | トレーニングの累計成績 |
| `chess-tournament-state` | トーナメント進行状況 |
| `chess-tournament-last-result` | Play → Tournament の**受け渡し用**（読んだら消す） |
| `chess-player-name` / `chess-player2-name` / `chess-avatar-emoji` | プレイヤー情報 |
| `chess-sound-enabled` / `chess-sound-volume` | 音設定 |
| `chess-clock` / `chess-piece` / `chess-game-mode` | 各種設定 |

---

## コーディング上の注意

React 19 + `eslint-plugin-react-hooks` v7 のルールに従っている。**lint 0件を維持すること。**

1. **レンダー中に ref を読み書きしない。** ref への代入は effect 内で行い、その ref を読む effect **より先に宣言**する（effect は宣言順に実行される）。
2. **effect の中で同期的に setState しない。** 原因別に対処が違う:
   - マウント時の localStorage 読み込み → `useState` の遅延初期化
   - props 変化に合わせた state 調整 → レンダー中に前回値と比較
   - 「終端で止まる」等の状態 → **派生値**にする
   - ユーザー操作への応答 → **イベントハンドラ**に書く
3. **StrictMode が有効。** `useState` の初期化関数は開発時に2回呼ばれるので、そこで localStorage を消すなど副作用を書いてはいけない（`Tournament.jsx` の受け渡し処理を参照）。
4. **意図的な `eslint-disable` は2箇所のみ**（理由をコメントに明記済み）。増やす場合は必ず理由を書く:
   - `Play.jsx` の終局検知 — 終局はプレイヤー／CPU／時間切れのどれからでも起き、捕捉できるイベントハンドラが存在しない
   - `Profile.jsx` の Google ログイン反応 — Supabase が非同期に通知する外部イベント

### テストの書き方

`useChessGame` は第4引数で `getAIMove` を差し替えられるので、**偽 AI を渡せば CPU 対戦も決定的にテストできる**。

```js
const fakeAI = async () => 'e5';
renderHook(() => useChessGame('easy', 'w', 'cpu', fakeAI));
```

純粋関数を書き換えたときは「旧実装と新実装をランダム入力で総当たり比較する」手法が有効（`detectTactics` の変更時に71,184回比較して差分ゼロを確認した実績あり）。

---

## 既知のズレ・未整備

1. **SPEC.md が古い。** 非スコープに「オンライン対戦なし」「認証なし」と書いてあるが、`Online.jsx` と `useAuth.js` が実装済み。
2. **README.md が Vite のテンプレートのまま。** プロジェクトの説明になっていない。
3. **未デプロイ。** `vite.config.js` に GitHub Pages 用の `base: '/EIDRITH/'` は書いてあるが、公開されていない。デプロイ用のワークフローも無い。
   - ⚠️ 公開する場合、Supabase の anon key はビルド後の JS に埋め込まれて公開される。これは Supabase の設計上そういうものだが、**RLS（Row Level Security）が有効であることが大前提**。公開前に必ず確認すること。
4. **オンライン対戦は `.env.local` が必要。** `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY`。未設定なら `supabase` が `null` になり、画面は出るがマッチングできない（クラッシュはしない）。
5. **バンドルが単一チャンクで 723KB（gzip 209KB）。** code-splitting の警告が出ている。

---

## Issue の状況（24件 Open）

**先に片付けるべき: 実装済みなのに Open のまま**

- #68 盤面テーマ変更 → 実装済み（コミット `fa940ec`）
- #69 ホーム画面ダッシュボード化 → 実装済み（`942c046`）
- #70 トーナメントモード → 実装済み（`5ff2039`）
- #71 Stockfish 連携 → 実装済み（`398e6f5`）
- #82 サウンド設定の永続化 → 実装済み（`useSoundEffects.js:85-99`）
- #76 techniques の moveIndex 欠落 → 修正済み（`useChessGame.js:98`、旧データは Review 側で自動マイグレーション）

**実際に残っている主なもの**

- **#91 Play.jsx の分割**（724行）← リファクタの本命
- #72 パズル 12問 → 100問（コンテンツ不足の解消）
- #73 / #74 / #75 レッスン追加（序盤・エンドゲーム・中盤）
- #84 棋譜解析にエンジン評価グラフ
- #89 モバイル対応

---

## 直近の作業（2026-08-27）

一気に土台を整えた。詳細は `git log` を参照。

| | Before | After |
|---|---|---|
| ESLint | 150件 | **0件** |
| テスト | なし | **53件** |
| CI | なし | **GitHub Actions** |

- `PuzzleModal` のクラッシュバグを修正（未定義の `isWhiteTurn` を参照していた）
- `useChessGame` / `Online` をレンダー純粋性に対応（ref 直読み → snapshot state）
- 未実装だった prop を削除（`tournamentRoundLabel` / `stepNum` / `totalSteps` / `myId`）。
  UI を作るなら Issue 化して復活させること

次に着手するなら **#91（Play.jsx の分割）** が適切。テストと CI が揃っているので、壊しても PR が赤くなって気づける。
