import { Chess } from 'chess.js';
import { TECHNIQUES } from '../data/techniques';

// ピン・スキュアー判定用の駒価値テーブル
const PIECE_VALUES_DETECT = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

// ── ヘルパー: 盤上のキング位置を返す ────────────────────────────────────
function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { row: r, col: c, square: String.fromCharCode(97 + c) + (8 - r) };
      }
    }
  }
  return null;
}

// ── ヘルパー: あるマスを攻撃している駒のリストを返す ─────────────────
function getAttackers(board, targetRow, targetCol, attackerColor) {
  const attackers = [];

  // ナイト
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r = targetRow + dr, c = targetCol + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p && p.color === attackerColor && p.type === 'n')
        attackers.push({ piece: p, row: r, col: c });
    }
  }

  // ルーク / クイーン（縦横）
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    let r = targetRow + dr, c = targetCol + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q'))
          attackers.push({ piece: p, row: r, col: c });
        break;
      }
      r += dr; c += dc;
    }
  }

  // ビショップ / クイーン（斜め）
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let r = targetRow + dr, c = targetCol + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q'))
          attackers.push({ piece: p, row: r, col: c });
        break;
      }
      r += dr; c += dc;
    }
  }

  // ポーン（攻撃する側のポーンが攻撃する方向を考慮）
  // attackerColor='w' の白ポーンは上(row--)方向に攻撃するので、
  // targetSquareを攻撃できる白ポーンは (targetRow+1, targetCol±1) にいる
  const pawnRowOffset = attackerColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = targetRow + pawnRowOffset, c = targetCol + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p && p.color === attackerColor && p.type === 'p')
        attackers.push({ piece: p, row: r, col: c });
    }
  }

  return attackers;
}

// ── スライディング方向列挙ヘルパー ────────────────────────────────────────
function getSlidingDirs(pieceType) {
  const rookDirs   = [[0,1],[0,-1],[1,0],[-1,0]];
  const bishopDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
  if (pieceType === 'r') return rookDirs;
  if (pieceType === 'b') return bishopDirs;
  if (pieceType === 'q') return [...rookDirs, ...bishopDirs];
  return [];
}

function canSlideInDir(pieceType, dr, dc) {
  const isRookDir   = dr === 0 || dc === 0;
  const isBishopDir = Math.abs(dr) === 1 && Math.abs(dc) === 1;
  return (
    (pieceType === 'r' && isRookDir) ||
    (pieceType === 'b' && isBishopDir) ||
    (pieceType === 'q' && (isRookDir || isBishopDir))
  );
}

// ── ピン検出 ─────────────────────────────────────────────────────────────────
// 移動した駒→敵駒（ピン対象）→より価値の高い敵駒（またはキング）が一直線になっているか
export function detectPin(chess, move) {
  const board = chess.board();
  const mover = chess.get(move.to);
  if (!mover) return false;

  const enemyColor = mover.color === 'w' ? 'b' : 'w';
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = 8 - parseInt(move.to[1]);

  for (const [dr, dc] of getSlidingDirs(mover.type)) {
    let r = toRank + dr, c = toFile + dc;
    let firstEnemy = null;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === enemyColor) {
          if (!firstEnemy) {
            if (p.type === 'k') break; // キングはピンされない（相手キングへのチェックは別処理）
            firstEnemy = p;
          } else {
            // 2枚目が1枚目より価値が高い（またはキング）→ ピン成立
            if (PIECE_VALUES_DETECT[p.type] > PIECE_VALUES_DETECT[firstEnemy.type]) {
              return true;
            }
            break;
          }
        } else {
          break; // 味方駒がブロック
        }
      }
      r += dr; c += dc;
    }
  }
  return false;
}

// ── スキュアー検出 ────────────────────────────────────────────────────────────
// 移動した駒→高価値の敵駒→さらに別の敵駒 が一直線（ピンの逆）
export function detectSkewer(chess, move) {
  const board = chess.board();
  const mover = chess.get(move.to);
  if (!mover) return false;

  const enemyColor = mover.color === 'w' ? 'b' : 'w';
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = 8 - parseInt(move.to[1]);

  for (const [dr, dc] of getSlidingDirs(mover.type)) {
    let r = toRank + dr, c = toFile + dc;
    let firstEnemy = null;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === enemyColor) {
          if (!firstEnemy) {
            // スキュアーの対象は高価値駒（k/q/r）
            if (!['k', 'q', 'r'].includes(p.type)) break;
            firstEnemy = p;
          } else {
            // 後ろに何か駒がある → スキュアー成立
            return true;
          }
        } else {
          break;
        }
      }
      r += dr; c += dc;
    }
  }
  return false;
}

// ── 発見攻撃検出 ──────────────────────────────────────────────────────────────
// 駒が動いた空きマス（move.from）の後ろにいた味方スライディング駒が
// 反対方向の価値ある敵駒を攻撃できるようになった
export function detectDiscoveredAttack(chess, move) {
  if (chess.isCheck()) return false; // discoveredCheck が優先

  const board = chess.board();
  const movedPiece = chess.get(move.to);
  if (!movedPiece) return false;

  const moverColor = movedPiece.color;
  const enemyColor = moverColor === 'w' ? 'b' : 'w';
  const fromFile   = move.from.charCodeAt(0) - 97;
  const fromRank   = 8 - parseInt(move.from[1]);

  const allDirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

  for (const [dr, dc] of allDirs) {
    // Step1: (dr, dc) 方向に味方スライディング駒を探す
    let fr = fromRank + dr, fc = fromFile + dc;
    let allyFound = false;
    while (fr >= 0 && fr < 8 && fc >= 0 && fc < 8) {
      const p = board[fr][fc];
      if (p) {
        if (p.color === moverColor && canSlideInDir(p.type, dr, dc)) {
          allyFound = true;
        }
        break;
      }
      fr += dr; fc += dc;
    }
    if (!allyFound) continue;

    // Step2: 反対方向 (-dr, -dc) に価値ある敵駒がいるか
    let er = fromRank - dr, ec = fromFile - dc;
    while (er >= 0 && er < 8 && ec >= 0 && ec < 8) {
      const ep = board[er][ec];
      if (ep) {
        if (ep.color === enemyColor && ['q', 'r', 'b', 'n', 'k'].includes(ep.type)) {
          return true;
        }
        break;
      }
      er -= dr; ec -= dc;
    }
  }
  return false;
}

// ── バッテリー検出 ────────────────────────────────────────────────────────────
// 移動した駒の背後に同方向を攻撃できる味方スライディング駒がいる
export function detectBattery(chess, move) {
  const board = chess.board();
  const mover = chess.get(move.to);
  if (!mover || !['r', 'q', 'b'].includes(mover.type)) return false;

  const moverColor = mover.color;
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = 8 - parseInt(move.to[1]);

  for (const [dr, dc] of getSlidingDirs(mover.type)) {
    let r = toRank + dr, c = toFile + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === moverColor && canSlideInDir(p.type, dr, dc)) {
          return true; // 同方向を攻撃できる味方スライディング駒 → バッテリー成立
        }
        break;
      }
      r += dr; c += dc;
    }
  }
  return false;
}

// ── フォーク検出 ─────────────────────────────────────────────────────────
// 移動した駒が2つ以上の価値ある相手駒を同時に攻撃しているか
export function detectFork(chess, move) {
  const board = chess.board();
  const piece = board.flat().find(p => p && chess.get(move.to) === p);
  const movedPiece = chess.get(move.to);
  if (!movedPiece) return false;

  // moved piece の row/col
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = 8 - parseInt(move.to[1]);

  // 相手の色
  const enemyColor = movedPiece.color === 'w' ? 'b' : 'w';

  // 移動先の駒が攻撃しているマスを列挙（chess.jsのmovesは合法手のみ返す）
  // 代わりに盤面を直接分析する
  const attackedEnemySquares = [];

  const addSlidingAttacks = (dirs, types) => {
    for (const [dr, dc] of dirs) {
      let r = toRank + dr, c = toFile + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p) {
          if (p.color === enemyColor) attackedEnemySquares.push({ piece: p, row: r, col: c });
          break;
        }
        r += dr; c += dc;
      }
    }
  };

  const addLeapAttacks = (offsets) => {
    for (const [dr, dc] of offsets) {
      const r = toRank + dr, c = toFile + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p && p.color === enemyColor) attackedEnemySquares.push({ piece: p, row: r, col: c });
      }
    }
  };

  switch (movedPiece.type) {
    case 'n': addLeapAttacks([[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]); break;
    case 'b': addSlidingAttacks([[1,1],[1,-1],[-1,1],[-1,-1]], ['b','q']); break;
    case 'r': addSlidingAttacks([[0,1],[0,-1],[1,0],[-1,0]], ['r','q']); break;
    case 'q':
      addSlidingAttacks([[1,1],[1,-1],[-1,1],[-1,-1]], ['b','q']);
      addSlidingAttacks([[0,1],[0,-1],[1,0],[-1,0]], ['r','q']);
      break;
    case 'p': {
      const pDir = movedPiece.color === 'w' ? -1 : 1;
      for (const dc of [-1, 1]) {
        const r = toRank + pDir, c = toFile + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const p = board[r][c];
          if (p && p.color === enemyColor) attackedEnemySquares.push({ piece: p, row: r, col: c });
        }
      }
      break;
    }
    case 'k': addLeapAttacks([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]); break;
  }

  // 価値ある駒（ポーン以外）を2つ以上攻撃しているか
  const valuable = attackedEnemySquares.filter(({ piece: p }) =>
    ['q', 'r', 'b', 'n', 'k'].includes(p.type)
  );
  return valuable.length >= 2;
}

// ── チェックをかけている駒を返す ─────────────────────────────────────────
// chess.turn() が現在チェックされている側
export function getCheckingPieces(chess) {
  if (!chess.isCheck()) return [];
  const board = chess.board();
  const checkedColor = chess.turn();
  const attackerColor = checkedColor === 'w' ? 'b' : 'w';
  const king = findKing(board, checkedColor);
  if (!king) return [];
  return getAttackers(board, king.row, king.col, attackerColor);
}

// ── 発見チェック検出 ─────────────────────────────────────────────────────
// チェックをかけているのが移動した駒でなければ発見チェック
export function detectDiscoveredCheck(chess, move) {
  if (!chess.isCheck()) return false;
  const checkers = getCheckingPieces(chess);
  if (checkers.length === 0) return false;

  const movedToFile = move.to.charCodeAt(0) - 97;
  const movedToRank = 8 - parseInt(move.to[1]);

  // 移動先の駒がチェッカーに含まれていない場合 → 発見チェック
  const movedPieceIsChecker = checkers.some(c => c.col === movedToFile && c.row === movedToRank);
  return !movedPieceIsChecker;
}

// ── ダブルチェック検出 ────────────────────────────────────────────────────
export function detectDoubleCheck(chess) {
  if (!chess.isCheck()) return false;
  return getCheckingPieces(chess).length >= 2;
}

// ── バックランクメイト検出 ────────────────────────────────────────────────
// チェックメイトかつ、詰まされたキングが1段目か8段目にいる
export function detectBackRankMate(chess) {
  if (!chess.isCheckmate()) return false;
  const board = chess.board();
  const matedColor = chess.turn();
  const king = findKing(board, matedColor);
  if (!king) return false;
  const rank = 8 - king.row; // 1〜8
  return rank === 1 || rank === 8;
}

// ── スモザードメイト検出 ───────────────────────────────────────────────────
// チェックメイトかつ、詰みをかけた駒がナイト
export function detectSmotheredMate(chess, move) {
  if (!chess.isCheckmate()) return false;
  const piece = chess.get(move.to);
  return piece && piece.type === 'n';
}

// ── スコラーズメイト検出 ───────────────────────────────────────────────────
// 4手以内のチェックメイト（f2 or f7 を制覇）
export function detectScholarsMate(chess, move) {
  if (!chess.isCheckmate()) return false;
  const history = chess.history({ verbose: true });
  if (history.length > 6) return false; // 4手詰めなので最大6手前後
  // 詰め上がりマスがf7かf2
  return move.to === 'f7' || move.to === 'f2';
}

// ── フールズメイト検出 ─────────────────────────────────────────────────────
// 2手以内のチェックメイト
export function detectFoolsMate(chess) {
  if (!chess.isCheckmate()) return false;
  return chess.history().length <= 4; // 2手詰めなので全体4手以内
}

// ── メイン検出関数 ─────────────────────────────────────────────────────────
export function detectTechnique(chess, move) {
  if (!move) return null;

  // 詰み系（優先度高）
  if (chess.isCheckmate()) {
    if (detectFoolsMate(chess))         return TECHNIQUES.foolsMate;
    if (detectScholarsMate(chess, move)) return TECHNIQUES.scholarsMate;
    if (detectSmotheredMate(chess, move)) return TECHNIQUES.smotheredMate;
    if (detectBackRankMate(chess))      return TECHNIQUES.backRankMate;
    return TECHNIQUES.checkmate;
  }

  if (chess.isStalemate())  return TECHNIQUES.stalemate;
  if (chess.isDraw())       return TECHNIQUES.draw;

  // 特殊ルール
  if (move.flags.includes('p')) return TECHNIQUES.promotion;
  if (move.flags.includes('e')) return TECHNIQUES.enPassant;
  if (move.flags.includes('k') || move.flags.includes('q')) return TECHNIQUES.castling;

  // 王手系
  if (chess.isCheck()) {
    if (detectDoubleCheck(chess))                 return TECHNIQUES.doubleCheck;
    if (detectDiscoveredCheck(chess, move))       return TECHNIQUES.discoveredCheck;
    return TECHNIQUES.check;
  }

  // 戦術
  if (detectFork(chess, move))             return TECHNIQUES.fork;
  if (detectPin(chess, move))              return TECHNIQUES.pin;
  if (detectSkewer(chess, move))           return TECHNIQUES.skewer;
  if (detectDiscoveredAttack(chess, move)) return TECHNIQUES.discoveredAttack;
  if (detectBattery(chess, move))          return TECHNIQUES.battery;

  return null;
}
