const PROMOTION_PIECES = [
  { key: 'q', symbol: '♕', name: 'クイーン' },
  { key: 'r', symbol: '♖', name: 'ルーク' },
  { key: 'b', symbol: '♗', name: 'ビショップ' },
  { key: 'n', symbol: '♘', name: 'ナイト' },
];

export default function PromotionModal({ onConfirm }) {
  return (
    <div className="promotion-overlay">
      <div className="promotion-modal">
        <p className="promotion-title">昇格する駒を選んでください</p>
        <div className="promotion-pieces">
          {PROMOTION_PIECES.map(({ key, symbol, name }) => (
            <button
              key={key}
              className="promotion-piece-btn"
              onClick={() => onConfirm(key)}
            >
              <span className="promotion-piece-symbol">{symbol}</span>
              <span className="promotion-piece-name">{name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
