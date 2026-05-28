import { Chess } from 'chess.js';

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (white perspective; mirrored for black)
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

function getTableIndex(square, color) {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1]) - 1;   // 1=0, 8=7
  return color === 'w'
    ? (7 - rank) * 8 + file
    : rank * 8 + file;
}

function getPieceBonus(piece, square) {
  const idx = getTableIndex(square, piece.color);
  switch (piece.type) {
    case 'p': return PAWN_TABLE[idx];
    case 'n': return KNIGHT_TABLE[idx];
    case 'b': return BISHOP_TABLE[idx];
    default:  return 0;
  }
}

function evaluate(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -100000 : 100000;
  if (chess.isDraw()) return 0;

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const square = String.fromCharCode(97 + c) + String(8 - r);
      const val = PIECE_VALUES[piece.type] + getPieceBonus(piece, square);
      score += piece.color === 'w' ? val : -val;
    }
  }

  return score;
}

function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);

  const moves = chess.moves();

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function getBestMove(fen, difficulty = 'easy') {
  const chess = new Chess(fen);
  if (chess.isGameOver()) return null;

  const moves = chess.moves();
  if (moves.length === 0) return null;

  // Shuffle for variety
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  // かんたん: 50%の確率でランダムな手を指す（初心者向け）
  if (difficulty === 'easy' && Math.random() < 0.5) {
    return shuffled[0];
  }

  const depth = difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2;
  const isMax = chess.turn() === 'w';

  let bestMove = shuffled[0];
  let bestValue = isMax ? -Infinity : Infinity;

  for (const move of shuffled) {
    chess.move(move);
    const value = minimax(chess, depth - 1, -Infinity, Infinity, !isMax);
    chess.undo();

    if (isMax ? value > bestValue : value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove;
}
