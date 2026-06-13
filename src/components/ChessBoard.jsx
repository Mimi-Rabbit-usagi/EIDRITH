import { useState, useEffect, useRef } from 'react';

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

function getSquareStyle(square, rowIndex, colIndex, boardTheme, selectedSquare, legalMoves, lastMove, gameStatus, board, hint) {
  const isSelected = selectedSquare === square;
  const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
  const light = isLightSquare(rowIndex, colIndex);

  const piece = board[rowIndex][colIndex];
  const isKingInCheck =
    gameStatus === 'check' || gameStatus === 'checkmate'
      ? piece && piece.type === 'k'
      : false;

  if (isKingInCheck)  return { backgroundColor: light ? '#FF8A80' : '#E53935' };
  if (isSelected)     return { backgroundColor: light ? '#F6F669' : '#E8E020' };
  if (hint?.from === square) return { backgroundColor: light ? '#80DEEA' : '#26C6DA' };
  if (hint?.to === square)   return { backgroundColor: light ? '#A5D6A7' : '#66BB6A' };
  if (isLastMoveSquare) return { backgroundColor: light ? '#CDD46A' : '#AABA32' };
  return { backgroundColor: light ? boardTheme.lightSquare : boardTheme.darkSquare };
}

// ボード上の (x, y) がどのマスか計算
function getSquareAtPoint(x, y, boardEl, flipped) {
  if (!boardEl) return null;
  const rect = boardEl.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
  let col = Math.floor((x - rect.left) / (rect.width / 8));
  let row = Math.floor((y - rect.top)  / (rect.height / 8));
  if (col < 0 || col >= 8 || row < 0 || row >= 8) return null;
  if (flipped) { col = 7 - col; row = 7 - row; }
  return FILES[col] + RANKS[row];
}

export default function ChessBoard({
  board, selectedSquare, legalMoves, lastMove,
  gameStatus, boardTheme, pieceSet, hint, flipped,
  onSquareClick, onDrop, onCancelDrag,
}) {
  const boardRef  = useRef(null);
  // ドラッグ追跡（refで管理→再レンダー不要）
  const dragRef   = useRef({ active: false, from: null, piece: null, startX: 0, startY: 0, isDragging: false });
  // ゴースト駒の位置（stateで管理→再レンダーが必要）
  const [ghost, setGhost] = useState(null); // { from, piece, x, y } | null
  // flippedのref（onPointerUp内のクロージャから最新値を参照するため）
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;

  useEffect(() => {
    function onPointerMove(e) {
      const d = dragRef.current;
      if (!d.active) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (Math.sqrt(dx * dx + dy * dy) > 8) {
        d.isDragging = true;
        setGhost(prev =>
          prev
            ? { ...prev, x: e.clientX, y: e.clientY }
            : { from: d.from, piece: d.piece, x: e.clientX, y: e.clientY }
        );
      }
    }

    function onPointerUp(e) {
      const d = dragRef.current;
      if (!d.active) return;

      const from = d.from;
      const wasDragging = d.isDragging;

      // リセット
      dragRef.current = { active: false, from: null, piece: null, startX: 0, startY: 0, isDragging: false };
      setGhost(null);

      if (wasDragging) {
        const target = getSquareAtPoint(e.clientX, e.clientY, boardRef.current, flippedRef.current);
        if (target && target !== from) {
          onDrop(from, target);
        } else {
          onCancelDrag();
        }
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup',   onPointerUp);
    };
  }, [onDrop, onCancelDrag]);

  return (
    <div className={`chess-board-wrapper${pieceSet && pieceSet !== 'classic' ? ` piece-set-${pieceSet}` : ''}`}>
      <div className="board-with-coords">
        {/* Rank labels */}
        <div className="rank-labels">
          {(flipped ? [...RANKS].reverse() : RANKS).map(r => (
            <div key={r} className="coord-label rank-label">{r}</div>
          ))}
        </div>

        {/* Board grid */}
        <div className="chess-board" ref={boardRef}>
          {Array.from({ length: 8 }, (_, visualRow) =>
            Array.from({ length: 8 }, (_, visualCol) => {
              const actualRow = flipped ? 7 - visualRow : visualRow;
              const actualCol = flipped ? 7 - visualCol : visualCol;
              const piece = board[actualRow][actualCol];
              const square   = getSquareName(actualRow, actualCol);
              const isLegal  = legalMoves.includes(square);
              const isSource = ghost?.from === square; // ドラッグ中の元マス
              const playerPieceColor = flipped ? 'b' : 'w';

              const isKingInCheck = (gameStatus === 'check' || gameStatus === 'checkmate')
                && piece && piece.type === 'k';
              const isLandingSquare = lastMove?.to === square && piece != null;

              return (
                <div
                  key={square}
                  className={`chess-square${isKingInCheck ? ' check-square' : ''}`}
                  style={getSquareStyle(
                    square, actualRow, actualCol,
                    boardTheme, selectedSquare, legalMoves, lastMove, gameStatus, board, hint
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault(); // clickイベントの二重発火を防ぐ
                    onSquareClick(square); // クリック動作（選択・移動）は即時実行

                    // プレイヤーの駒ならドラッグ追跡を開始
                    if (piece && piece.color === playerPieceColor) {
                      dragRef.current = {
                        active: true,
                        from: square,
                        piece,
                        startX: e.clientX,
                        startY: e.clientY,
                        isDragging: false,
                      };
                    }
                  }}
                >
                  {/* 合法手インジケーター */}
                  {isLegal && !piece && <div className="legal-dot" />}
                  {isLegal && piece   && <div className="legal-capture-ring" />}

                  {/* 駒（ドラッグ中は半透明） */}
                  {piece && (
                    <span
                      key={isLandingSquare ? `${square}-${lastMove.from}` : square}
                      className={[
                        'chess-piece',
                        `piece-${piece.color === 'w' ? 'white' : 'black'}`,
                        selectedSquare === square ? 'piece-selected' : '',
                        isSource ? 'piece-dragging' : '',
                        isLandingSquare && !isSource ? 'piece-landing' : '',
                      ].filter(Boolean).join(' ')}
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

      {/* File labels */}
      <div className="file-labels-row">
        <div className="file-labels-spacer" />
        <div className="file-labels">
          {(flipped ? [...FILES].reverse() : FILES).map(f => (
            <div key={f} className="coord-label file-label">{f}</div>
          ))}
        </div>
      </div>

      {/* ドラッグ中のゴースト駒 */}
      {ghost && (
        <div
          className="drag-ghost"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <span className={`chess-piece piece-${ghost.piece.color === 'w' ? 'white' : 'black'}`}>
            {PIECE_SYMBOLS[ghost.piece.color + ghost.piece.type]}
          </span>
        </div>
      )}
    </div>
  );
}
