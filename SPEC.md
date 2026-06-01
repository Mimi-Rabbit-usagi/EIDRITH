# EIDRITH — 技術仕様書

**バージョン:** 1.0.0  
**最終更新:** 2026-06-01  
**リポジトリ:** https://github.com/Mimi-Rabbit-usagi/EIDRITH

---

## 目次

1. [プロダクト概要](#1-プロダクト概要)
2. [技術スタック](#2-技術スタック)
3. [アーキテクチャ](#3-アーキテクチャ)
4. [機能仕様](#4-機能仕様)
5. [AIエンジン仕様](#5-aiエンジン仕様)
6. [データ設計](#6-データ設計)
7. [UI・画面構成](#7-ui画面構成)
8. [既知の制約・注意事項](#8-既知の制約注意事項)

---

## 1. プロダクト概要

### 1.1 目的

ブラウザで動作するチェス学習ゲーム。CPU対戦を通じてチェスの戦術・定跡を学べることを主目的とする。

### 1.2 スコープ

- **対象:** チェス初心者〜中級者
- **対戦形式:** プレイヤー vs CPU のみ（オンライン対戦なし）
- **配信形式:** 静的サイト（Vite ビルド → GitHub Pages 等で公開）

### 1.3 非スコープ

- バックエンド・サーバーサイド処理（全データは localStorage）
- ユーザー認証・アカウント管理
- オンライン対戦・観戦機能

---

## 2. 技術スタック

### 2.1 本番依存

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| React | ^19.2.6 | UIフレームワーク |
| react-dom | ^19.2.6 | DOMレンダリング |
| chess.js | ^1.4.0 | チェスルール・盤面管理 |
| stockfish | ^18.0.7 | インストール済みだが現在未使用 |

### 2.2 開発依存

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| Vite | ^8.0.12 | ビルドツール |
| Tailwind CSS | ^4.3.0 | ユーティリティCSS |
| ESLint | ^10.3.0 | コード品質管理 |

### 2.3 ビルド・開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド（出力: dist/）
npm run preview  # ビルド成果物のプレビュー
npm run lint     # ESLint実行
```

---

## 3. アーキテクチャ

### 3.1 コンポーネントツリー

```
App（ルート・グローバルステート管理）
├── ChessBoard          盤面表示・駒操作（クリック/ドラッグ）
├── EvalBar             局面評価バー（センチポーン単位、盤左横）
├── ChessClock          チェスクロック表示
├── GamePanel           サイドパネル
│   ├── 開局バッジ
│   ├── 戦術ログ
│   ├── 取った駒表示
│   ├── 手順リスト
│   └── 設定コントロール（難易度/時間/手番/プレイヤー名）
├── PromotionModal      ポーン成り駒選択
├── GameSummary         ゲーム終了サマリー（分析チャート含む）
├── PuzzleModal         パズルモード
├── OpeningModal        定跡練習モード
├── StatsModal          統計ダッシュボード
├── GameHistory         ゲーム履歴一覧
├── ReplayModal         棋譜リプレイ
├── CustomizeModal      テーマ・駒セット・実績（タブ切り替え）
├── UnlockToast × 2    アンロック通知（テーマ用・実績用）
└── ConfettiEffect      勝利時紙吹雪
```

### 3.2 状態管理方針

- **グローバル状態:** `App.jsx` が `useState` で管理し props 経由で渡す
- **ゲームロジック:** `useChessGame` カスタムフック（chess.js ラッパー）
- **AI計算:** `useAI` カスタムフック（ミニマックス実装）
- **クロック:** `useChessClock` カスタムフック（1秒インターバル）
- **サウンド:** `useSoundEffects` カスタムフック（Web Audio API）
- **永続化:** localStorage のみ（外部DB・APIなし）

### 3.3 ディレクトリ構成

```
src/
├── components/   UIコンポーネント（表示層）
├── hooks/        カスタムフック（ロジック層）
├── data/         静的データ（定跡・パズル・テーマ等）
├── App.jsx       ルートコンポーネント
└── index.css     グローバルスタイル
```

---

## 4. 機能仕様

### 4.1 チェスボード操作

| 操作 | 仕様 |
|------|------|
| 駒選択 | クリックで選択、合法手をハイライト表示 |
| 移動 | 合法マスをクリック or ドラッグ&ドロップ |
| キャンセル | 同じ駒を再クリック |
| ポーン成り | 8段目到達時に選択モーダルを表示（Q/R/B/N） |
| 盤面反転 | 黒番選択時に盤面を180度反転 |
| 最終手ハイライト | from/to マスを常時ハイライト |

### 4.2 CPU対戦

| 難易度 | 探索深さ | 備考 |
|--------|---------|------|
| かんたん（🌱） | 深さ1 | 50%の確率でランダム手を選択 |
| ふつう（⚔️） | 深さ2 | 純ミニマックス（デフォルト） |
| むずかしい（💀） | 深さ3 | 純ミニマックス |

### 4.3 チェスクロック

| モード | 持ち時間 |
|--------|---------|
| なし | 無制限（デフォルト） |
| 1分 | 各60秒 |
| 3分 | 各180秒 |
| 10分 | 各600秒 |

- 手番切り替えと同時にタイマーが交代
- 時間切れ → 即座にゲーム終了・サウンド再生

### 4.4 戦術検出（detectTactics.js）

手を指すたびに自動検出し、`techniqueLog` に追記する。

| カテゴリ | 検出種類 |
|---------|---------|
| チェックメイト | フールズメイト / スコラーズメイト / スマザードメイト / バックランクメイト / 通常チェックメイト |
| チェック | ダブルチェック / 発見チェック / チェック |
| 戦術 | フォーク（2駒以上同時攻撃） |
| 特殊手 | キャスリング / アンパッサン / ポーン成り |
| 終局 | ステールメイト / ドロー |

**合計: 15種類**（データ定義は51種類まで拡張可能）

### 4.5 オープニング解説（detectOpening.js）

- ゲーム中の手順を全定跡と前方一致比較し、最長一致の定跡名を表示
- 65種類の定跡を収録（ECOコード付き）
- フィルター: 全体 / e4系 / d4系 / その他

### 4.6 局面評価バー（EvalBar）

- センチポーン単位で白有利/黒有利を縦バー表示
- 評価値は `useAI` が返す白視点スコア
- ±700 でクランプして表示

### 4.7 ヒント機能

- プレイヤーターンのみ有効
- 深さ2のミニマックスで最善手を計算（難易度に関わらず一定）
- from/to マスをハイライト表示・トグル可能

### 4.8 UNDO（待った）

- 自手 + CPU手の2手をまとめて取り消し
- ゲーム中のみ有効

### 4.9 プレイヤー名設定

- 最大16文字、デフォルト `あなた`
- localStorage `chess-player-name` に永続化

### 4.10 サウンドエフェクト（useSoundEffects.js）

Web Audio API で合成音を生成（外部音源ファイルなし）。

| 種類 | 周波数構成 | トリガー |
|------|-----------|---------|
| move | 700Hz sine / 0.08s | 通常移動 |
| capture | 320Hz + 200Hz sawtooth | 駒取り |
| check | 880Hz + 1100Hz sine | チェック |
| win | 523→659→784Hz 昇順 | 勝利 |
| lose | 440→330→220Hz 降順 | 敗北 |
| draw | 440Hz sine / 0.3s | ドロー |
| promotion | 4音昇順 | 成り |

### 4.11 パズルモード（PuzzleModal.jsx）

| 項目 | 内容 |
|------|------|
| 問題数 | 12問（easy: 5 / normal: 4 / hard: 3） |
| データ形式 | FEN + 正解手順（SAN配列） |
| 正解判定 | 手を指すたびに正解手と照合 |
| 正解時 | 600ms後に相手手を自動再生 |
| 不正解時 | 900ms後に手を取り消し |
| ヒント | 正解手の1手目を表示 |
| 進捗保存 | localStorage `chess-solved-puzzles` |

### 4.12 定跡練習モード（OpeningModal.jsx）

| 項目 | 内容 |
|------|------|
| 収録定跡 | 65種類 |
| 手番選択 | 白（♔）/ 黒（♚）を選んで練習可能 |
| 黒番時 | 白の1手目を400msで自動再生 |
| 正解時 | 600ms後に相手手を自動再生 |
| 不正解時 | 800ms後に正解手を表示して取り消し |
| 進捗表示 | X/Y手完了のプログレスバー |
| 進捗保存 | localStorage `chess-opening-practice` |

### 4.13 棋譜分析・ゲームサマリー（GameSummary.jsx）

| グレード | 条件（評価値変動） |
|---------|-----------------|
| 大ミス（Blunder） | delta < -200 |
| ミス（Mistake） | delta < -80 |
| 不正確（Inaccuracy） | delta < -20 |
| 好手（Good） | delta ≥ -20 |

- 手ごとの評価値チャート表示（±700クランプ）
- 最悪手の特定・コメント表示
- 手数・駒の損得（ポイント換算）・戦術ログを集計表示

### 4.14 棋譜リプレイ（ReplayModal.jsx）

- ⏮ ⏪ ▶ ⏩ ⏭ ボタンで手順を再生
- 手順リストのクリックでジャンプ
- キーボード操作対応（← →）

### 4.15 統計ダッシュボード（StatsModal.jsx）

- 総勝利数・勝率・現在の連勝数
- 難易度別成績
- 直近10局の結果一覧

### 4.16 実績バッジシステム（achievements.js）

| ID | 名称 | 解除条件 |
|----|------|---------|
| first_win | 初勝利 | 1勝 |
| blitz_win | 電光石火 | 15手以内で勝利 |
| hard_win | 鉄壁突破 | むずかしいで勝利 |
| win_streak_3 | 3連勝 | 3連勝達成 |
| ten_wins | 十傑 | 累計10勝 |
| castling | キャスリング王 | キャスリング実行 |
| promotion | 昇格の儀 | ポーン成り実行 |
| fork | フォーク師 | フォーク実行 |
| pin | ピン師 | ピン実行（予約） |
| deep_opening | 定跡通 | 8手以上定跡を踏む |

**合計: 10種類**

### 4.17 アンロックシステム

**ボードテーマ（6種類）:**

| テーマ名 | 解除条件 |
|---------|---------|
| Classic | デフォルト解放 |
| Ocean | 3勝 |
| Forest | 5勝 |
| Midnight | 10勝 |
| Sakura | 15勝 |
| Gold | 20勝 |

**駒セット（6種類）:**

| セット名 | 解除条件 |
|---------|---------|
| Classic | デフォルト解放 |
| Gold | 3勝 |
| Neon | 7勝 |
| Crystal | 12勝 |
| Fire | 18勝 |
| Shadow | 25勝 |

### 4.18 勝利エフェクト

- チェックメイト時に紙吹雪アニメーション（ConfettiEffect）を表示
- Canvas を使用したパーティクルアニメーション

---

## 5. AIエンジン仕様

### 5.1 アルゴリズム

**ミニマックス法 + αβ枝刈り**

`src/hooks/useAI.js` に実装。chess.js の合法手生成を利用。

### 5.2 駒価値テーブル（センチポーン）

| 駒 | 価値 |
|----|------|
| ポーン | 100 |
| ナイト | 320 |
| ビショップ | 330 |
| ルーク | 500 |
| クイーン | 900 |
| キング | 20,000 |

### 5.3 駒位置ボーナステーブル（PST）

各駒に対して 8×8 の位置ボーナステーブルを保有。

- **ポーン:** 中央ポーンを優遇、バックランク留まりをペナルティ
- **ナイト:** 中央マスを優遇、端マスをペナルティ
- **ビショップ:** 開いた斜線・中央を優遇

白視点・黒視点でテーブルインデックスを反転して使用。

### 5.4 評価関数

```
evaluate(局面):
  if チェックメイト → ±100,000（手番側が負け）
  if ドロー        → 0
  else             → Σ(駒価値 + 位置ボーナス) を白視点で合計
```

### 5.5 手順探索フロー

1. 合法手をシャッフル（同評価値時の多様性確保）
2. easy かつ乱数 < 0.5 → シャッフル後の先頭手をそのまま返す
3. それ以外 → 各手に対して `minimax(depth-1)` を呼び出し評価
4. 最良評価の手を返す

---

## 6. データ設計

### 6.1 localStorage スキーマ

#### `chess-master-data`（ゲーム進捗）

```typescript
{
  wins: number,                     // 総勝利数
  streak: number,                   // 現在の連勝数
  unlockedBoardThemes: string[],    // 解放済みテーマID
  activeBoardTheme: string,         // 使用中テーマID
  activePieceSet: string,           // 使用中駒セットID
  unlockedPieceSets: string[],      // 解放済み駒セットID
  unlockedAchievements: string[]    // 取得済み実績ID
}
```

#### `chess-master-logs`（ゲーム履歴 / 最大30件）

```typescript
Array<{
  id: number,               // UNIX タイムスタンプ
  date: string,             // ISO 8601
  difficulty: 'easy' | 'normal' | 'hard',
  result: 'win' | 'loss' | 'draw',
  moveCount: number,
  moves: string[],          // SAN形式の手順配列
  techniques: Technique[]   // 検出された戦術オブジェクト配列
}>
```

#### `chess-player-name`

```typescript
string  // max 16文字、デフォルト "あなた"
```

#### `chess-sound-enabled`

```typescript
boolean  // デフォルト true
```

#### `chess-solved-puzzles`

```typescript
string[]  // 解決済みパズルID配列（例: ["p001", "p003"]）
```

#### `chess-opening-practice`

```typescript
string[]  // 練習済み定跡ECOコード配列（例: ["C20", "D40"]）
```

### 6.2 主要な型定義

#### Technique（戦術オブジェクト）

```typescript
{
  id: string,          // 例: "backRankMate"
  name: string,        // 日本語名
  nameEn: string,      // 英語名
  icon: string,        // 駒絵文字
  color: string,       // HEX カラーコード
  description: string, // 短い説明文
  detail: string       // 詳細説明文
}
```

#### Opening（定跡オブジェクト）

```typescript
{
  eco: string,         // ECOコード（例: "C20"）
  name: string,        // 日本語名
  nameEn: string,      // 英語名
  moves: string[],     // SAN形式の手順配列
  description: string  // 戦略説明
}
```

#### Puzzle（パズルオブジェクト）

```typescript
{
  id: string,          // 例: "p001"
  title: string,
  difficulty: 'easy' | 'normal' | 'hard',
  fen: string,         // 出題局面のFEN
  solution: string[],  // 正解手順（SAN配列）
  hint: string,        // ヒントテキスト
  theme: string,       // 戦術テーマID
  themeLabel: string   // 戦術テーマ表示名
}
```

### 6.3 ゲーム状態（useChessGame が管理）

```typescript
{
  board: Square[][],            // chess.js 盤面オブジェクト
  fen: string,                  // 現在局面のFEN
  selectedSquare: string | null,// 選択中マス（例: "e4"）
  legalMoves: string[],         // 合法移動先マス配列
  lastMove: { from, to } | null,
  isThinking: boolean,          // AI計算中フラグ
  technique: Technique | null,  // 直前に検出した戦術
  techniqueLog: Technique[],    // 今局の戦術ログ
  capturedPieces: { w: string[], b: string[] },
  gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw' | 'timeout',
  winner: 'w' | 'b' | null,
  currentTurn: 'w' | 'b',
  moveHistory: Move[],          // chess.js verbose move オブジェクト配列
  pendingPromotion: { from, to } | null,
  hint: { from, to } | null,
  currentOpening: Opening | null,
  positionEval: number          // 評価値（白視点センチポーン）
}
```

---

## 7. UI・画面構成

### 7.1 レイアウト概要

- **PC:** 盤面（左）+ コントロールパネル（右）の横並び
- **スマホ:** 「対局」タブ / 「設定」タブ のタブ切り替え
- `safe-area-inset` 対応済み（ノッチ付き端末）

### 7.2 盤面セクション（CSS Grid）

```
[ eval-bar ] [ board + 座標ラベル ]
```

EvalBarと盤面の高さを grid で揃えることで位置ズレを防止。

### 7.3 GamePanel 構成

- **上部:** ゲーム状態表示・オープニングバッジ・戦術ログ
- **中部:** 取った駒・手順リスト
- **下部（設定タブ）:** 難易度・手番・クロック・プレイヤー名・カスタマイズ
- **ボタン群:** 新しいゲーム / 履歴 / パズル / 定跡（4つ）

---

## 8. 既知の制約・注意事項

| 項目 | 内容 |
|------|------|
| stockfish | インストール済みだが未使用。将来の強化候補 |
| ピン検出 | 実績「ピン師」はデータ定義済みだが、detectTactics.js の実装が未完 |
| パズル数 | 12問のみ。拡張する場合は `src/data/puzzles.js` に追記 |
| AI非同期処理 | 深さ3の計算は UI スレッドをブロックする可能性あり。Worker化は未対応 |
| localStorage | データはブラウザローカルのみ。デバイス間の引き継ぎ不可 |
| ゲーム履歴 | 最大30件。超過時は古い履歴から順に削除 |
| 対戦形式 | CPU戦のみ。人間同士の対局モードなし |

---

*このドキュメントはコードベースから自動生成されたものです。実装変更時は合わせて更新してください。*
