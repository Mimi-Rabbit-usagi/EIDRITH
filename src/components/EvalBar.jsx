/**
 * EvalBar — 局面評価バー
 *
 * score: evaluatePosition() が返すセンチポーン値（正 = 白有利）
 *   例: +150 → 白が1.5ポーン分有利
 *   チェックメイト時は ±100000
 *
 * 表示:
 *   - 縦バー: 下（白）〜上（黒）
 *   - 白有利 → 白部分が伸びる（下から上へ）
 *   - 数値ラベル: "+1.5" / "-0.8" / "+M" / "-M" / "½"
 */
export default function EvalBar({ score, gameStatus, winner }) {
  let whitePct;   // 白の占有率 (0–100)
  let label;      // 表示するスコアテキスト

  if (gameStatus === 'checkmate') {
    whitePct = winner === 'w' ? 95 : 5;
    label = winner === 'w' ? '+M' : '-M';
  } else if (gameStatus === 'stalemate' || gameStatus === 'draw') {
    whitePct = 50;
    label = '½';
  } else {
    // センチポーン → ポーン単位に変換
    const pawns = score / 100;
    // ±10ポーン以上は 95% / 5% にクリップ
    const MAX_PAWNS = 10;
    whitePct = Math.min(95, Math.max(5, 50 + (pawns / MAX_PAWNS) * 45));

    const abs = Math.abs(pawns).toFixed(1);
    label = score > 0 ? `+${abs}` : score < 0 ? `-${abs}` : '0.0';
  }

  return (
    <div className="eval-bar">
      <div className="eval-bar-track">
        {/* 白の部分: 下から whitePct% 分を白で塗る */}
        <div
          className="eval-bar-white"
          style={{ height: `${whitePct}%` }}
        />
      </div>
      <span className="eval-bar-label">{label}</span>
    </div>
  );
}
