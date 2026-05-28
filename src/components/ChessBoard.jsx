const PIECE_SYMBOLS = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function getSquareName(rowIndex, colIndex) {
  return FILES[colIndex] + RANKS[rowIndex];
}

function isLightSquare(rowIndex, colIndex) {
  return (rowIndex + colIndex) % 2 === 0;
}

function getSquareStyle(square, rowIndex, colIndex, boardTheme, selectedSquare, legalMoves, lastMove, gameStatus, board) {
  const isSelected = selectedSquare === square;
  const isLegal = legalMoves.includes(square);
  const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
  const light = isLightSquare(rowIndex, colIndex);

  // Check highlight for king in check
  const piece = board[rowIndex][colIndex];
  const isKingInCheck =
    gameStatus === 'check' || gameStatus === 'checkmate'
      ? piece && piece.type === 'k'
      : false;

  if (isKingInCheck) {
    return { backgroundColor: light ? '#FF8A80' : '#E53935' };
  }
  if (isSelected) {
    return { backgroundColor: light ? '#F6F669' : '#E8E020' };
  }
  if (isLastMoveSquare) {
    return { backgroundColor: light ? '#CDD46A' : '#AABA32' };
  }
  return {
    backgroundColor: light ? boardTheme.lightSquare : boardTheme.darkSquare,
  };
}

export default function ChessBoard({ board, selectedSquare, legalMoves, lastMove, gameStatus, boardTheme, onSquareClick }) {
  return (
    <div className="chess-board-wrapper">
      {/* File labels top (hidden, just for symmetry) */}
      <div className="board-with-coords">
        {/* Rank labels */}
        <div className="rank-labels">
          {RANKS.map(r => (
            <div key={r} className="coord-label rank-label">{r}</div>
          ))}
        </div>

        {/* Board grid */}
        <div className="chess-board">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const square = getSquareName(rowIndex, colIndex);
              const isLegal = legalMoves.includes(square);
              const squareStyle = getSquareStyle(
                square, rowIndex, colIndex,
                boardTheme, selectedSquare, legalMoves, lastMove, gameStatus, board
              );

              return (
                <div
                  key={square}
                  className="chess-square"
                  style={squareStyle}
                  onClick={() => onSquareClick(square)}
                >
                  {/* Legal move indicator */}
                  {isLegal && !piece && (
                    <div className="legal-dot" />
                  )}
                  {isLegal && piece && (
                    <div className="legal-capture-ring" />
                  )}

                  {/* Piece */}
                  {piece && (
                    <span
                      className={`chess-piece piece-${piece.color === 'w' ? 'white' : 'black'} ${selectedSquare === square ? 'piece-selected' : ''}`}
                    >
                      {PIECE_SYMBOLS[piece.color + piece.type]}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* File labels bottom */}
      <div className="file-labels-row">
        <div className="file-labels-spacer" />
        <div className="file-labels">
          {FILES.map(f => (
            <div key={f} className="coord-label file-label">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
