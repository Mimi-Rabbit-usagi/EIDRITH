import { describe, it, expect } from 'vitest';
import {
  safeLoad,
  safeSave,
  loadGameData,
  saveGameData,
  loadLogs,
  saveLogs,
  getDailyPuzzleIndex,
  saveDailyPuzzleSolved,
  loadDailyInfo,
} from './storage';

describe('safeLoad / safeSave', () => {
  it('キーが無ければ defaultValue を返す', () => {
    expect(safeLoad('存在しないキー', 'デフォルト')).toBe('デフォルト');
  });

  it('保存した値をそのまま読み戻せる', () => {
    safeSave('test-key', { a: 1, b: ['x', 'y'] });
    expect(safeLoad('test-key', null)).toEqual({ a: 1, b: ['x', 'y'] });
  });

  it('JSON として壊れている値はプレーン文字列として返す（旧データ互換）', () => {
    // JSON.stringify を通さずに直接書き込まれた古いデータを再現する
    localStorage.setItem('legacy-key', 'あなた');
    expect(safeLoad('legacy-key', 'デフォルト')).toBe('あなた');
  });

  it('null を保存しても defaultValue ではなく null が返る', () => {
    safeSave('null-key', null);
    expect(safeLoad('null-key', 'デフォルト')).toBe(null);
  });
});

describe('loadGameData / saveGameData', () => {
  it('未保存ならデフォルト値を返す', () => {
    const data = loadGameData();
    expect(data.wins).toBe(0);
    expect(data.activeBoardTheme).toBe('classic');
    expect(data.unlockedBoardThemes).toEqual(['classic']);
  });

  it('保存した値を読み戻せる', () => {
    saveGameData({ wins: 5, streak: 2, activeBoardTheme: 'forest' });
    const data = loadGameData();
    expect(data.wins).toBe(5);
    expect(data.activeBoardTheme).toBe('forest');
  });

  it('欠けているフィールドはデフォルトで補完される', () => {
    // wins だけが入った古いデータ
    localStorage.setItem('chess-master-data', JSON.stringify({ wins: 3 }));
    const data = loadGameData();
    expect(data.wins).toBe(3);
    expect(data.unlockedPieceSets).toEqual(['classic']); // 補完された
  });

  it('_version が無い古いデータには _version=1 が付与される', () => {
    localStorage.setItem('chess-master-data', JSON.stringify({ wins: 1 }));
    expect(loadGameData()._version).toBe(1);
  });

  it('メインキーが壊れていたらバックアップから復旧する', () => {
    saveGameData({ wins: 9, activeBoardTheme: 'ocean' });
    localStorage.setItem('chess-master-data', '{壊れたJSON');

    const data = loadGameData();
    expect(data.wins).toBe(9);
    expect(data.activeBoardTheme).toBe('ocean');
    // メインキーが修復されている
    expect(JSON.parse(localStorage.getItem('chess-master-data')).wins).toBe(9);
  });
});

describe('loadLogs / saveLogs', () => {
  it('未保存なら空配列を返す', () => {
    expect(loadLogs()).toEqual([]);
  });

  it('保存件数は 30 件までに切り詰められる', () => {
    const logs = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    saveLogs(logs);
    const loaded = loadLogs();
    expect(loaded).toHaveLength(30);
    expect(loaded[0].id).toBe(0);  // 先頭 30 件が残る
    expect(loaded[29].id).toBe(29);
  });
});

describe('getDailyPuzzleIndex', () => {
  it('同じ日付なら必ず同じ問題になる', () => {
    expect(getDailyPuzzleIndex('2026-08-22', 16)).toBe(getDailyPuzzleIndex('2026-08-22', 16));
  });

  it('返り値は 0 以上 totalPuzzles 未満に収まる', () => {
    for (let d = 1; d <= 28; d++) {
      const dateStr = `2026-02-${String(d).padStart(2, '0')}`;
      const idx = getDailyPuzzleIndex(dateStr, 16);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(16);
    }
  });
});

describe('saveDailyPuzzleSolved（ストリーク）', () => {
  it('初めて解いたらストリークは 1', () => {
    expect(saveDailyPuzzleSolved('2026-08-22')).toBe(1);
  });

  it('昨日も解いていたらストリークが伸びる', () => {
    saveDailyPuzzleSolved('2026-08-21');
    expect(saveDailyPuzzleSolved('2026-08-22')).toBe(2);
  });

  it('1 日空いたらストリークは 1 に戻る', () => {
    saveDailyPuzzleSolved('2026-08-20');
    expect(saveDailyPuzzleSolved('2026-08-22')).toBe(1);
  });

  it('同じ日に 2 回解いてもストリークは増えない', () => {
    saveDailyPuzzleSolved('2026-08-22');
    expect(saveDailyPuzzleSolved('2026-08-22')).toBe(1);
    expect(loadDailyInfo().streak).toBe(1);
  });
});
