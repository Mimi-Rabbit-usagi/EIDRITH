import { useRef, useEffect, useCallback } from 'react';

// UCI のムーブ文字列（例: "e2e4", "e7e8q"）をchess.js互換オブジェクトに変換
function uciToMove(uci) {
  if (!uci || uci === '(none)') return null;
  const from = uci.slice(0, 2);
  const to   = uci.slice(2, 4);
  const promo = uci.length === 5 ? uci[4] : undefined;
  return promo ? { from, to, promotion: promo } : { from, to };
}

/**
 * Stockfish.js Web Worker を管理するフック。
 *
 * @param {boolean} enabled - true の場合のみ Worker を起動する（例: difficulty==='hard' の場合のみ）
 * @returns {{ getStockfishMove: (fen: string) => Promise<object|null> }}
 *   getStockfishMove: FEN を渡すと chess.js の move() に渡せるオブジェクトを返す Promise
 */
export function useStockfish(enabled = false) {
  const workerRef  = useRef(null);
  const resolveRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // public/stockfish/ にコピーされたファイルを Web Worker として起動
    const worker = new Worker('/stockfish/stockfish-18-lite-single.js');
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';
      // "bestmove e2e4 ponder ..." のような行を検出
      if (line.startsWith('bestmove') && resolveRef.current) {
        const parts = line.split(' ');
        const uciMove = parts[1] ?? null;
        resolveRef.current(uciToMove(uciMove));
        resolveRef.current = null;
      }
    };

    worker.onerror = () => {
      if (resolveRef.current) {
        resolveRef.current(null);
        resolveRef.current = null;
      }
    };

    // UCI 初期化
    worker.postMessage('uci');
    // Skill Level 20 = 最強、10 = 中級者風
    worker.postMessage('setoption name Skill Level value 20');
    worker.postMessage('isready');

    return () => {
      worker.postMessage('quit');
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled]);

  /**
   * Stockfish に局面を渡して最善手を取得する。
   * @param {string} fen - 局面の FEN 文字列
   * @param {number} movetime - 思考時間(ms)。デフォルト 1500ms
   * @returns {Promise<{from: string, to: string, promotion?: string} | null>}
   */
  const getStockfishMove = useCallback((fen, movetime = 1500) => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve(null);
        return;
      }
      // 前の解決コールバックが残っていればキャンセル
      if (resolveRef.current) {
        resolveRef.current(null);
      }
      resolveRef.current = resolve;

      workerRef.current.postMessage('stop');
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go movetime ${movetime}`);
    });
  }, []);

  return { getStockfishMove };
}
