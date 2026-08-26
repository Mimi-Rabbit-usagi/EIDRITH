import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChessGame } from './useChessGame';

// ── ヘルパー ──────────────────────────────────────────────────────────────────

/** 2人対戦モードでフックを立ち上げる（AI が動かないので手番を自由に操作できる） */
function renderHumanGame() {
  return renderHook(() => useChessGame('easy', 'w', 'human'));
}

/** from → to の 2 クリックで 1 手指す */
function play(result, from, to) {
  act(() => result.current.handleSquareClick(from));
  act(() => result.current.handleSquareClick(to));
}

/** 棋譜を SAN の配列で取り出す */
function sans(result) {
  return result.current.moveHistory.map(m => m.san);
}

// ── 初期状態 ──────────────────────────────────────────────────────────────────

describe('初期状態', () => {
  it('白番・棋譜0手・playing で始まる', () => {
    const { result } = renderHumanGame();
    expect(result.current.currentTurn).toBe('w');
    expect(result.current.moveHistory).toHaveLength(0);
    expect(result.current.gameStatus).toBe('playing');
    expect(result.current.winner).toBe(null);
    expect(result.current.selectedSquare).toBe(null);
    expect(result.current.capturedPieces).toEqual({ w: [], b: [] });
  });

  it('board は 8x8 で返る', () => {
    const { result } = renderHumanGame();
    expect(result.current.board).toHaveLength(8);
    expect(result.current.board[0]).toHaveLength(8);
  });
});

// ── 駒の選択 ──────────────────────────────────────────────────────────────────

describe('駒の選択', () => {
  it('自分の駒を選ぶと合法手が並ぶ', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleSquareClick('e2'));
    expect(result.current.selectedSquare).toBe('e2');
    expect(result.current.legalMoves.sort()).toEqual(['e3', 'e4']);
  });

  it('相手の駒はクリックしても選択されない', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleSquareClick('e7')); // 白番に黒の駒
    expect(result.current.selectedSquare).toBe(null);
    expect(result.current.legalMoves).toEqual([]);
  });

  it('空きマスをクリックしても何も起きない', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleSquareClick('e4'));
    expect(result.current.selectedSquare).toBe(null);
  });

  it('選択中に別の自駒をクリックすると選択が移る', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleSquareClick('e2'));
    act(() => result.current.handleSquareClick('d2'));
    expect(result.current.selectedSquare).toBe('d2');
    expect(result.current.legalMoves.sort()).toEqual(['d3', 'd4']);
  });

  it('選択中に無関係なマスをクリックすると選択が外れる', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleSquareClick('e2'));
    act(() => result.current.handleSquareClick('h5')); // 合法手でも自駒でもない
    expect(result.current.selectedSquare).toBe(null);
    expect(result.current.legalMoves).toEqual([]);
  });

  it('clearSelection で選択を解除できる', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleSquareClick('e2'));
    act(() => result.current.clearSelection());
    expect(result.current.selectedSquare).toBe(null);
  });
});

// ── 指し手 ────────────────────────────────────────────────────────────────────

describe('指し手', () => {
  it('1手指すと棋譜・手番・lastMove が更新される', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');

    expect(sans(result)).toEqual(['e4']);
    expect(result.current.currentTurn).toBe('b');
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(result.current.selectedSquare).toBe(null);
  });

  it('2人対戦では白黒を交互に動かせる', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    play(result, 'e7', 'e5');
    expect(sans(result)).toEqual(['e4', 'e5']);
    expect(result.current.currentTurn).toBe('w');
  });

  it('非合法な移動先を選んでも手は進まない', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e5'); // ポーンは2マスまで
    expect(result.current.moveHistory).toHaveLength(0);
  });

  it('駒を取ると capturedPieces に積まれる', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    play(result, 'd7', 'd5');
    play(result, 'e4', 'd5'); // exd5

    expect(result.current.capturedPieces.w).toEqual(['p']);
    expect(result.current.capturedPieces.b).toEqual([]);
  });

  it('handleDrop でも同じように指せる', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleDrop('e2', 'e4'));
    expect(sans(result)).toEqual(['e4']);
  });

  it('handleDrop に非合法な移動を渡しても無視される', () => {
    const { result } = renderHumanGame();
    act(() => result.current.handleDrop('e2', 'e5'));
    expect(result.current.moveHistory).toHaveLength(0);
  });
});

// ── 昇格（プロモーション） ────────────────────────────────────────────────────

describe('プロモーション', () => {
  const PROMO_FEN = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1'; // a7 の白ポーンが昇格できる

  it('昇格手を選ぶと pendingPromotion が立ち、盤はまだ動かない', () => {
    const { result } = renderHumanGame();
    act(() => result.current.resetWithFen(PROMO_FEN));
    play(result, 'a7', 'a8');

    expect(result.current.pendingPromotion).toEqual({ from: 'a7', to: 'a8' });
    expect(result.current.moveHistory).toHaveLength(0);
  });

  it('confirmPromotion で選んだ駒に成る', () => {
    const { result } = renderHumanGame();
    act(() => result.current.resetWithFen(PROMO_FEN));
    play(result, 'a7', 'a8');
    act(() => result.current.confirmPromotion('n')); // ナイトに成る

    expect(result.current.pendingPromotion).toBe(null);
    expect(sans(result)).toEqual(['a8=N']);
    expect(result.current.board[0][0]).toMatchObject({ type: 'n', color: 'w' });
  });
});

// ── 終局判定 ──────────────────────────────────────────────────────────────────

describe('終局判定', () => {
  it('フールズメイトでチェックメイトを検出する', () => {
    const { result } = renderHumanGame();
    play(result, 'f2', 'f3');
    play(result, 'e7', 'e5');
    play(result, 'g2', 'g4');
    play(result, 'd8', 'h4'); // Qh4#

    expect(result.current.gameStatus).toBe('checkmate');
    expect(result.current.winner).toBe('b');
  });

  it('チェックがかかると gameStatus が check になる', () => {
    const { result } = renderHumanGame();
    act(() => result.current.resetWithFen('4k3/8/8/8/8/8/8/3RK3 w - - 0 1'));
    play(result, 'd1', 'd8'); // Rd8+

    expect(sans(result)).toEqual(['Rd8+']); // 手が実際に成立したことを確認
    expect(result.current.gameStatus).toBe('check');
  });

  it('終局後はクリックを受け付けない', () => {
    const { result } = renderHumanGame();
    play(result, 'f2', 'f3');
    play(result, 'e7', 'e5');
    play(result, 'g2', 'g4');
    play(result, 'd8', 'h4');

    const before = result.current.moveHistory.length;
    play(result, 'e1', 'f2');
    expect(result.current.moveHistory).toHaveLength(before);
  });

  it('offerDraw で合意による引き分けになる', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    act(() => result.current.offerDraw());

    expect(result.current.gameStatus).toBe('draw');
    expect(result.current.drawReason).toBe('agreement');
  });

  it('駒不足による引き分けを検出する', () => {
    const { result } = renderHumanGame();
    // 白キング + 黒キングのみ（King vs King）
    act(() => result.current.resetWithFen('4k3/8/8/8/8/8/4K3/8 w - - 0 1'));

    expect(result.current.gameStatus).toBe('draw');
    expect(result.current.drawReason).toBe('insufficient');
  });
});

// ── リセット ──────────────────────────────────────────────────────────────────

describe('リセット', () => {
  it('resetGame で初期局面に戻る', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    play(result, 'd7', 'd5');
    play(result, 'e4', 'd5');
    act(() => result.current.resetGame());

    expect(result.current.moveHistory).toHaveLength(0);
    expect(result.current.currentTurn).toBe('w');
    expect(result.current.capturedPieces).toEqual({ w: [], b: [] });
    expect(result.current.lastMove).toBe(null);
    expect(result.current.gameStatus).toBe('playing');
  });

  it('resetWithFen は有効な FEN なら true を返して局面を差し替える', () => {
    const { result } = renderHumanGame();
    let ok;
    act(() => { ok = result.current.resetWithFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'); });

    expect(ok).toBe(true);
    expect(result.current.currentTurn).toBe('w');
    expect(result.current.moveHistory).toHaveLength(0);
  });

  it('resetWithFen は無効な FEN なら false を返し、局面を壊さない', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');

    let ok;
    act(() => { ok = result.current.resetWithFen('これはFENではない'); });

    expect(ok).toBe(false);
    expect(sans(result)).toEqual(['e4']); // 元の局面が残っている
  });
});

// ── 待った（undo） ────────────────────────────────────────────────────────────

describe('undoMove', () => {
  it('2人対戦では1手だけ戻る', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    play(result, 'e7', 'e5');
    act(() => result.current.undoMove());

    expect(sans(result)).toEqual(['e4']);
    expect(result.current.currentTurn).toBe('b');
  });

  it('1手も指していなければ何も起きない', () => {
    const { result } = renderHumanGame();
    act(() => result.current.undoMove());
    expect(result.current.moveHistory).toHaveLength(0);
  });

  it('取った駒リストが巻き戻される', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    play(result, 'd7', 'd5');
    play(result, 'e4', 'd5');
    expect(result.current.capturedPieces.w).toEqual(['p']);

    act(() => result.current.undoMove());
    expect(result.current.capturedPieces.w).toEqual([]);
  });

  it('lastMove も1手前に戻る', () => {
    const { result } = renderHumanGame();
    play(result, 'e2', 'e4');
    play(result, 'e7', 'e5');
    act(() => result.current.undoMove());

    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
  });
});

// ── CPU 対戦（AI を固定関数に差し替えて決定的にする） ─────────────────────────

describe('CPU対戦', () => {
  /** 常に決まった手を返す偽 AI。実際の思考ルーチンを使わないので結果が安定する */
  function renderCpuGame(replies) {
    let i = 0;
    const fakeAI = async () => replies[i++] ?? null;
    return renderHook(() => useChessGame('easy', 'w', 'cpu', fakeAI));
  }

  it('プレイヤーが指すと CPU が応じる', async () => {
    const { result } = renderCpuGame(['e5']);
    play(result, 'e2', 'e4');

    await waitFor(() => expect(result.current.moveHistory).toHaveLength(2));
    expect(sans(result)).toEqual(['e4', 'e5']);
    expect(result.current.currentTurn).toBe('w');
    expect(result.current.isThinking).toBe(false);
  });

  it('CPU が思考している間はプレイヤーの操作を受け付けない', async () => {
    // AI の応答を手動で解決できるようにして「思考中」の状態を作り出す
    let resolveAI;
    const pendingAI = () => new Promise(r => { resolveAI = r; });
    const { result } = renderHook(() => useChessGame('easy', 'w', 'cpu', pendingAI));

    play(result, 'e2', 'e4');
    expect(result.current.isThinking).toBe(true);

    // 思考中のクリックは無視される
    play(result, 'd2', 'd4');
    expect(sans(result)).toEqual(['e4']);

    // AI が応答すると再び動かせるようになる
    await act(async () => { resolveAI('e5'); });
    expect(result.current.isThinking).toBe(false);

    play(result, 'd2', 'd4');
    expect(sans(result)).toEqual(['e4', 'e5', 'd4']);
  });

  it('CPUモードの undo は2手戻る（自分とCPUの手をまとめて）', async () => {
    const { result } = renderCpuGame(['e5']);
    play(result, 'e2', 'e4');
    await waitFor(() => expect(result.current.moveHistory).toHaveLength(2));

    act(() => result.current.undoMove());
    expect(result.current.moveHistory).toHaveLength(0);
    expect(result.current.currentTurn).toBe('w');
  });

  it('外部 AI が手を返せなければ内蔵エンジンにフォールバックする', async () => {
    const { result } = renderCpuGame([null]); // 外部 AI は応答なし
    play(result, 'e2', 'e4');

    // フォールバックが働くので CPU は必ず何か指し、手番はプレイヤーに戻る
    await waitFor(() => expect(result.current.moveHistory).toHaveLength(2));
    expect(result.current.currentTurn).toBe('w');
    expect(result.current.isThinking).toBe(false);
  });

  it('外部 AI が例外を投げても内蔵エンジンにフォールバックする', async () => {
    const brokenAI = async () => { throw new Error('エンジン停止'); };
    const { result } = renderHook(() => useChessGame('easy', 'w', 'cpu', brokenAI));
    play(result, 'e2', 'e4');

    await waitFor(() => expect(result.current.moveHistory).toHaveLength(2));
    expect(result.current.currentTurn).toBe('w');
  });

  it('CPU モードで相手の駒は選択できない', () => {
    const { result } = renderCpuGame([]);
    act(() => result.current.handleSquareClick('e7')); // 黒（CPU）のポーン
    expect(result.current.selectedSquare).toBe(null);
  });

  it('プレイヤーが黒なら CPU が初手を指す', async () => {
    let i = 0;
    const fakeAI = async () => (['d4'][i++] ?? null);
    const { result } = renderHook(() => useChessGame('easy', 'b', 'cpu', fakeAI));

    await waitFor(() => expect(result.current.moveHistory).toHaveLength(1));
    expect(sans(result)).toEqual(['d4']);
    expect(result.current.currentTurn).toBe('b');
  });
});

// ── 戦術ログ ──────────────────────────────────────────────────────────────────

describe('戦術ログ', () => {
  it('検出した戦術には moveIndex が必ず付く（Issue #76 の回帰防止）', () => {
    const { result } = renderHumanGame();
    // ナイトフォークが成立する局面を作る
    act(() => result.current.resetWithFen('r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1'));
    play(result, 'd5', 'c7'); // Nc7+ で王とルークを同時攻撃

    // 空配列だとループが回らず素通りしてしまうので、まず検出されたことを確かめる
    expect(result.current.techniqueLog.length).toBeGreaterThan(0);
    for (const tech of result.current.techniqueLog) {
      expect(tech.moveIndex).toBeTypeOf('number');
    }
  });
});
