import { OPENINGS } from '../data/openings';

/**
 * 棋譜と定跡データを前方一致で比較し、最も長く一致した定跡を返す。
 *
 * @param {object[]} moveHistory - chess.js の history({ verbose: true }) の結果
 * @returns {object|null} 一致した定跡オブジェクト、またはnull
 *
 * --- アルゴリズムの説明 ---
 * chess.js の SAN には チェック(+)やチェックメイト(#) の記号が付く場合があるが、
 * 定跡データには付いていないため、比較前に除去する。
 * 全定跡を線形スキャンし、「手数が最も長く一致したもの」を返す。
 */
export function detectOpening(moveHistory) {
  if (moveHistory.length === 0) return null;

  // SAN から +, # などの記号を除去して比較用リストを作る
  const sans = moveHistory.map(m => m.san.replace(/[+#!?]/g, ''));

  let bestMatch = null;
  let bestLen = 0;

  for (const opening of OPENINGS) {
    const len = opening.moves.length;

    // 定跡の手数がゲームの手数より多い場合は未達なのでスキップ
    if (len > sans.length) continue;

    // 前方一致チェック: 定跡の全手がゲーム先頭と一致するか
    const matches = opening.moves.every((move, i) => move === sans[i]);

    if (matches && len > bestLen) {
      bestMatch = opening;
      bestLen = len;
    }
  }

  return bestMatch;
}
