// ── localStorage ユーティリティ ────────────────────────────────────────────────
//
// 目的:
//   - localStorage が使えない環境（Private Mode など）でも落ちないようにする
//   - 容量超過（QuotaExceededError）を握りつぶさずにコンソールへ記録する
//   - chess-master-data にバックアップ & バージョン管理を追加する
//
// 使い方:
//   import { safeLoad, safeSave, loadGameData, saveGameData, loadLogs, saveLogs } from '../lib/storage';

// ── 環境チェック ───────────────────────────────────────────────────────────────

let _storageAvailable = null;

export function isStorageAvailable() {
  if (_storageAvailable !== null) return _storageAvailable;
  try {
    const key = '__chess_storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
    console.warn('[storage] localStorage が利用できません（Private Mode？）。データは保存されません。');
  }
  return _storageAvailable;
}

// ── 基本操作 ───────────────────────────────────────────────────────────────────

/**
 * localStorage から JSON をロードする。
 * パース失敗・キーなしの場合は defaultValue を返す。
 */
export function safeLoad(key, defaultValue) {
  if (!isStorageAvailable()) return defaultValue;
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    // JSON.parse に失敗した場合はプレーン文字列として返す（旧データとの後方互換）
    return raw ?? defaultValue;
  }
}

/**
 * localStorage に JSON を保存する。
 * 容量超過時はコンソールに警告して false を返す。
 */
export function safeSave(key, data) {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error(`[storage] 容量超過のため "${key}" を保存できませんでした。`);
    } else {
      console.error(`[storage] "${key}" の保存に失敗しました:`, e);
    }
    return false;
  }
}

// ── chess-master-data（バックアップ＆バージョン管理付き） ─────────────────────

const GAME_DATA_KEY    = 'chess-master-data';
const GAME_DATA_BACKUP = 'chess-master-data-backup';
const CURRENT_VERSION  = 1;

const DEFAULT_GAME_DATA = {
  _version: CURRENT_VERSION,
  wins: 0,
  streak: 0,
  unlockedBoardThemes: ['classic'],
  activeBoardTheme: 'classic',
  activePieceSet: 'classic',
  unlockedPieceSets: ['classic'],
  unlockedAchievements: [],
};

/** 古いバージョンのデータを現行バージョンへ移行する */
function migrate(data) {
  // v1 未満（_version がない）→ v1: フィールドを補完するだけでOK
  if (!data._version) {
    data._version = 1;
  }
  // 将来 v2 が必要になったらここに追記
  return data;
}

export function loadGameData() {
  if (!isStorageAvailable()) return { ...DEFAULT_GAME_DATA };

  // メインキーを試みる
  try {
    const raw = localStorage.getItem(GAME_DATA_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const migrated = migrate({ ...DEFAULT_GAME_DATA, ...data });
      // 正常に読めたらバックアップを更新
      safeSave(GAME_DATA_BACKUP, migrated);
      return migrated;
    }
  } catch {
    console.warn('[storage] chess-master-data が破損しています。バックアップから復旧を試みます。');
    // バックアップから復旧
    try {
      const backup = localStorage.getItem(GAME_DATA_BACKUP);
      if (backup) {
        const data = JSON.parse(backup);
        const migrated = migrate({ ...DEFAULT_GAME_DATA, ...data });
        safeSave(GAME_DATA_KEY, migrated); // メインキーを修復
        return migrated;
      }
    } catch {
      console.error('[storage] バックアップからの復旧にも失敗しました。データをリセットします。');
      localStorage.removeItem(GAME_DATA_KEY);
      localStorage.removeItem(GAME_DATA_BACKUP);
    }
  }

  return { ...DEFAULT_GAME_DATA };
}

export function saveGameData(data) {
  safeSave(GAME_DATA_KEY, data);
  // バックアップは成功・失敗に関わらず上書き（古いバックアップで上書きしない）
  safeSave(GAME_DATA_BACKUP, data);
}

// ── 対局ログ ──────────────────────────────────────────────────────────────────

export function loadLogs() {
  return safeLoad('chess-master-logs', []);
}

export function saveLogs(logs) {
  safeSave('chess-master-logs', logs.slice(0, 30));
}

// ── デイリーパズル ────────────────────────────────────────────────────────────

/** 今日の日付文字列を返す（例: "2026-06-13"） */
export function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 日付文字列からパズルのインデックスを決める（同じ日付→同じ問題）
 * @param {string} dateStr - "2026-06-13" 形式
 * @param {number} totalPuzzles - PUZZLES.length
 */
export function getDailyPuzzleIndex(dateStr, totalPuzzles) {
  let hash = 0;
  for (const c of dateStr) {
    hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  }
  return Math.abs(hash) % totalPuzzles;
}

/**
 * デイリーパズルの状態を読み込む
 * @returns {{ lastSolvedDate: string|null, streak: number }}
 */
export function loadDailyInfo() {
  return safeLoad('chess-daily-puzzle', { lastSolvedDate: null, streak: 0 });
}

// ── タクティクストレーニング ──────────────────────────────────────────────────

/** トレーニングの累計成績を読み込む */
export function loadTrainingStats() {
  return safeLoad('chess-tactics-training', { bestStreak: 0, totalCorrect: 0, highestTier: 'easy' });
}

/** トレーニングの累計成績を保存する */
export function saveTrainingStats(stats) {
  safeSave('chess-tactics-training', stats);
}

// ── オープニングクイズ ────────────────────────────────────────────────────────

/** クイズの累計成績を読み込む */
export function loadQuizStats() {
  return safeLoad('chess-opening-quiz', { total: 0, correct: 0 });
}

/** クイズの累計成績を保存する */
export function saveQuizStats(stats) {
  safeSave('chess-opening-quiz', stats);
}

/**
 * デイリーパズルを解いたときに呼ぶ。ストリークを更新して保存する。
 * @param {string} today - "2026-06-13" 形式
 * @returns {number} 新しいストリーク数
 */
export function saveDailyPuzzleSolved(today) {
  const info = loadDailyInfo();

  // 既に今日解いていたら何もしない
  if (info.lastSolvedDate === today) return info.streak;

  // 昨日も解いていたらストリーク継続、それ以外はリセット
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const newStreak = info.lastSolvedDate === yesterdayStr ? info.streak + 1 : 1;

  safeSave('chess-daily-puzzle', { lastSolvedDate: today, streak: newStreak });
  return newStreak;
}

// ── トーナメント ───────────────────────────────────────────────────────────────

const DEFAULT_TOURNAMENT = {
  active: false,
  currentRound: 1,  // 次にプレイするラウンド番号 (1-4)
  results: [],      // [{ round, result, moveCount, date }]
  startedAt: null,
  finishedAt: null,
  champion: false,
  history: [],      // 過去の完了/失敗トーナメントのサマリー
};

export function loadTournamentState() {
  return safeLoad('chess-tournament-state', { ...DEFAULT_TOURNAMENT });
}

export function saveTournamentState(state) {
  safeSave('chess-tournament-state', state);
}
