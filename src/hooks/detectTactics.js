import { Chess } from 'chess.js';
import { TECHNIQUES } from '../data/techniques';

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
  if (detectFork(chess, move)) return TECHNIQUES.fork;

  return null;
}
