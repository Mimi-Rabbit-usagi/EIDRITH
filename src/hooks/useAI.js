import { Chess } from 'chess.js';

// ── 駒の基本点数 ─────────────────────────────────────────────────────────────
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// ── 駒位置ボーナステーブル（白視点・8×8 = rank8から順に並ぶ） ──────────────
// 各駒がどのマスにいると有利か（+ = 良い場所、- = 悪い場所）

const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

// ルーク: 7段目（オープンランク）・中央ファイルが有利
const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

// クイーン: 序盤に早出しは危険なので外周を抑制
const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

// キング（中盤）: キャスリング後の位置を高評価・中央は危険
const KING_TABLE_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

// キング（終盤）: 中央に進出して活躍する
const KING_TABLE_END = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

// ── ユーティリティ ────────────────────────────────────────────────────────────

function getTableIndex(square, color) {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1]) - 1;   // 1=0, 8=7
  // 白: rank8がテーブルの先頭なので (7 - rank) * 8 + file
  // 黒: 盤面を反転
  return color === 'w'
    ? (7 - rank) * 8 + file
    : rank * 8 + file;
}

/** 全駒の合計点数から終盤かどうかを判定する */
function isEndgame(chess) {
  let material = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue;
      material += PIECE_VALUES[piece.type];
    }
  }
  // 総材料が 2600 点以下（クイーン×1 + ルーク×1程度）なら終盤
  return material < 2600;
}

function getPieceBonus(piece, square, endgame) {
  const idx = getTableIndex(square, piece.color);
  switch (piece.type) {
    case 'p': return PAWN_TABLE[idx];
    case 'n': return KNIGHT_TABLE[idx];
    case 'b': return BISHOP_TABLE[idx];
    case 'r': return ROOK_TABLE[idx];
    case 'q': return QUEEN_TABLE[idx];
    case 'k': return endgame ? KING_TABLE_END[idx] : KING_TABLE_MID[idx];
    default:  return 0;
  }
}

// ── 局面評価 ─────────────────────────────────────────────────────────────────

function evaluate(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -100000 : 100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const endgame = isEndgame(chess);
  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const square = String.fromCharCode(97 + c) + String(8 - r);
      const val = PIECE_VALUES[piece.type] + getPieceBonus(piece, square, endgame);
      score += piece.color === 'w' ? val : -val;
    }
  }

  return score;
}

export function evaluatePosition(chess) {
  return evaluate(chess);
}

// ── 手の順序付け（MVV-LVA）────────────────────────────────────────────────────
//
// MVV-LVA = Most Valuable Victim - Least Valuable Attacker
// 例: ポーンがクイーンを取る手 → 900*10 - 100 = 8900 （最優先）
//     クイーンがポーンを取る手 → 100*10 - 900 = 100  （後回し）
//
// 手の順序が良いほど α-β 枝刈りが多く発生し、探索ノード数が大幅に減る。
// 良い順序では O(b^d) が O(b^(d/2)) に近づく（実質2倍深く探索できる）。

function moveScore(move) {
  let score = 0;
  if (move.captured) {
    // キャプチャ: 価値の高い駒を取るほど高スコア
    score += PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece];
  }
  if (move.promotion) {
    // 昇格はキャプチャよりもさらに高優先
    score += PIECE_VALUES[move.promotion] * 10;
  }
  return score;
}

function orderMoves(moves) {
  return moves.sort((a, b) => moveScore(b) - moveScore(a));
}

// ── 静止探索（Quiescence Search） ────────────────────────────────────────────
//
// 「水平線効果」を防ぐための探索。
// 通常探索の depth=0 でそのまま静的評価すると、例えば「クイーンで駒を取ったが
// 次の手で取り返される」状況を見落とす。
// → キャプチャ手に限って再帰的に探索し、局面が「静止」するまで掘り下げる。
//
// stand-pat（現在の評価値）がすでに beta 以上なら打ち切り（β カットオフ）。

const QUIESCENCE_DEPTH_LIMIT = 4; // 無限再帰を防ぐ深さ制限

function quiescence(chess, alpha, beta, isMax, depth = 0) {
  const standPat = evaluate(chess);
  if (depth >= QUIESCENCE_DEPTH_LIMIT) return standPat;

  if (isMax) {
    if (standPat >= beta) return beta;    // β カットオフ
    alpha = Math.max(alpha, standPat);

    const captures = chess.moves({ verbose: true }).filter(m => m.captured);
    for (const move of captures.sort((a, b) => moveScore(b) - moveScore(a))) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, false, depth + 1);
      chess.undo();
      if (score >= beta) return beta;
      alpha = Math.max(alpha, score);
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;  // α カットオフ
    beta = Math.min(beta, standPat);

    const captures = chess.moves({ verbose: true }).filter(m => m.captured);
    for (const move of captures.sort((a, b) => moveScore(b) - moveScore(a))) {
      chess.move(move);
      const score = quiescence(chess, alpha, beta, true, depth + 1);
      chess.undo();
      if (score <= alpha) return alpha;
      beta = Math.min(beta, score);
    }
    return beta;
  }
}

// ── トランスポジションテーブル ────────────────────────────────────────────────
//
// 同じ局面に異なる手順で到達した場合（トランスポジション）に
// 再計算を省略するためのキャッシュ。
//
// FEN の駒配置・手番・キャスリング権・アンパッサン（最初の4フィールド）を
// キーとして評価値を保存する。

const TT_EXACT      = 0; // α < score < β の確定値
const TT_LOWERBOUND = 1; // β カットオフ発生（score >= beta）
const TT_UPPERBOUND = 2; // α カットオフ発生（score <= alpha）

const TT_MAX_SIZE = 80000; // エントリ上限（メモリリーク防止）
let tt = new Map();

function ttKey(chess) {
  // FEN の最初の4フィールドのみ使用（手数カウンタは除く）
  return chess.fen().split(' ').slice(0, 4).join('|');
}

// ── Minimax（α-β 枝刈り + TT） ───────────────────────────────────────────────

function minimax(chess, depth, alpha, beta, isMax) {
  const origAlpha = alpha;
  const key = ttKey(chess);

  // TT ルックアップ
  const cached = tt.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.flag === TT_EXACT)      return cached.score;
    if (cached.flag === TT_LOWERBOUND) alpha = Math.max(alpha, cached.score);
    if (cached.flag === TT_UPPERBOUND) beta  = Math.min(beta,  cached.score);
    if (alpha >= beta) return cached.score;
  }

  if (chess.isGameOver()) return evaluate(chess);

  if (depth === 0) {
    // 静止探索でキャプチャを追跡（水平線効果を防ぐ）
    return quiescence(chess, alpha, beta, isMax);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = isMax ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, alpha, beta, !isMax);
    chess.undo();

    if (isMax) {
      if (score > best) best = score;
      if (score > alpha) alpha = score;
    } else {
      if (score < best) best = score;
      if (score < beta) beta = score;
    }
    if (beta <= alpha) break; // α-β 枝刈り
  }

  // TT への書き込み（サイズ制限を超えたら書かない）
  if (tt.size < TT_MAX_SIZE) {
    const flag = best <= origAlpha ? TT_UPPERBOUND
               : best >= beta      ? TT_LOWERBOUND
               : TT_EXACT;
    tt.set(key, { score: best, depth, flag });
  }

  return best;
}

// ── メインエクスポート ────────────────────────────────────────────────────────

export function getBestMove(fen, difficulty = 'easy') {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // ゲーム毎に TT をクリア（前のゲームの局面が誤って流用されるのを防ぐ）
  // 注: 同じゲーム内では TT を維持することで高速化できるが、
  //     memory leak を避けるためここで毎回クリアする。
  tt = new Map();

  // かんたん: 70%の確率でランダム（初心者向け）
  if (difficulty === 'easy' && Math.random() < 0.7) {
    const shuffled = [...moves].sort(() => Math.random() - 0.5);
    return shuffled[0].san;
  }

  // 探索深さ: 静止探索があるので nominally depth を抑えても実質は深い
  //   easy:   depth=1 + quiescence
  //   normal: depth=2 + quiescence（旧 depth=2 より大幅に強くなる）
  //   hard:   depth=3 + quiescence（旧 depth=3 より大幅に強くなる）
  const depth = difficulty === 'hard' ? 3 : difficulty === 'normal' ? 2 : 1;
  const isMax = chess.turn() === 'w';

  const orderedMoves = orderMoves([...moves]);
  let bestMove = orderedMoves[0];
  let bestValue = isMax ? -Infinity : Infinity;

  for (const move of orderedMoves) {
    chess.move(move);
    const value = minimax(chess, depth - 1, -Infinity, Infinity, !isMax);
    chess.undo();

    if (isMax ? value > bestValue : value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove.san;
}
