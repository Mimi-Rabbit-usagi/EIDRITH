import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import NavBar from '../components/NavBar';
import ChessBoard from '../components/ChessBoard';
import { BOARD_THEMES } from '../data/themes';

// ── 棋譜から全ポジションを事前計算 ───────────────────────────────────────────
function buildPositions(moves) {
  const chess = new Chess();
  const positions = [{ fen: chess.fen(), lastMove: null }];
  for (const san of moves) {
    const move = chess.move(san);
    if (!move) break;
    positions.push({ fen: chess.fen(), lastMove: { from: move.from, to: move.to } });
  }
  return positions;
}

// ── 戦術ごとのコーチコメント ──────────────────────────────────────────────────
const TECH_COACH = {
  fork: {
    why:    '一度に2つ以上の相手駒を同時に攻撃することで、どちらかを取れる状況を作ります。',
    effect: '相手は1手で1つしか守れないため、駒得が期待できます。',
    evalGood: '次の手で駒を取ることができました！フォークが決まりました。',
    evalNeutral: '相手がうまく逃げました。フォークは狙いに来て正解でしたが、逃げられてしまいました。',
    checkCaptureAt: 2, // フォーク後2手目（相手が逃げた後）に取れるはず
  },
  pin: {
    why:    '相手の駒を「動けない状態」にします。後ろに価値の高い駒（キングなど）がいるため動けなくなります。',
    effect: '相手の選択肢を狭め、ピンされた駒を攻め続けることで有利になれます。',
    evalGood: 'ピンした駒をうまく攻め続けています。',
    evalNeutral: 'ピン自体は良い手ですが、さらにそこを攻めるとより効果的です。',
    checkCaptureAt: 2,
  },
  skewer: {
    why:    'ピンの逆。価値の高い駒に直接プレッシャーをかけ、逃げた後ろの駒を取ります。',
    effect: '相手の高価値駒を動かさせ、その後ろの駒を取れます。',
    evalGood: '相手が逃げた後、後ろの駒を取れました！',
    evalNeutral: '相手がうまく対処しました。スキュアー自体は良い戦術です。',
    checkCaptureAt: 2,
  },
  discoveredAttack: {
    why:    '駒を動かすことで、後ろに隠れていた味方駒の攻撃ラインを開きます。',
    effect: '2つの攻撃を同時に発生させ、相手に対処させにくくします。',
    evalGood: '発見攻撃が成功し、駒得できました！',
    evalNeutral: '発見攻撃を仕掛けましたが、相手も対処できました。',
    checkCaptureAt: 2,
  },
  battery: {
    why:    '同じライン上に複数の駒を並べることで、攻撃力を倍増させます。',
    effect: 'ルークとクイーン、ビショップとクイーンなど強力な連携が生まれます。',
    evalGood: 'バッテリーが効果的に機能しました。',
    evalNeutral: 'バッテリーは将来的に強力な形です。',
    checkCaptureAt: 4,
  },
  check: {
    why:    '相手のキングに直接プレッシャーをかけ、相手の行動を制限します。',
    effect: '相手は必ずチェックに対応しなければならず、攻撃の主導権を握れます。',
    evalGood: 'チェックで相手のリズムを崩せました。',
    evalNeutral: 'チェックは良い手ですが、その後も攻め続けることが大切です。',
    checkCaptureAt: 2,
  },
  doubleCheck: {
    why:    '2つの駒が同時にチェックをかける最強の王手です。キング自身が動くしかありません。',
    effect: '相手が取れる手段がなくなるため、チェックメイトに直結しやすい。',
    evalGood: 'ダブルチェック成功！相手は動く一手しか選べません。',
    evalNeutral: 'ダブルチェック自体は非常に強い手です。',
    checkCaptureAt: 1,
  },
  discoveredCheck: {
    why:    '駒を動かした結果、後ろの駒がチェックをかける発見王手です。',
    effect: '動かした駒とチェックをかけた駒の両方に対処しなければなりません。',
    evalGood: '発見チェック！相手は対処が難しい局面です。',
    evalNeutral: '良い発見チェックです。',
    checkCaptureAt: 1,
  },
  castling: {
    why:    'キングを安全なコーナーに移動させ、ルークをゲームに参加させます。',
    effect: 'キングの安全確保とルークの活性化が同時に行えます。',
    evalGood: 'キャスリングは序盤〜中盤の正しい選択です！',
    evalNeutral: 'キャスリングは正しい方向性です。',
    checkCaptureAt: 0,
  },
  promotion: {
    why:    'ポーンを最奥まで進めてクイーンに変身させ、圧倒的な戦力を得ます。',
    effect: 'クイーンは最強の駒。局面を一気に有利に変えることができます。',
    evalGood: '昇格成功！強力なクイーンを手に入れました。',
    evalNeutral: '昇格は非常に強い手です。',
    checkCaptureAt: 0,
  },
  enPassant: {
    why:    '相手ポーンが2マス進んだ直後だけ使える特殊な取り方です。',
    effect: '相手のポーン構造を崩し、ファイルのコントロールを得られます。',
    evalGood: 'アンパッサン！相手のポーン構造を崩せました。',
    evalNeutral: 'アンパッサンは正しい局面判断です。',
    checkCaptureAt: 0,
  },
};

// ── 手番コメント生成 ──────────────────────────────────────────────────────────
function getMoveComment(step, moves, techniques) {
  if (step === 0) return { type: 'start' };

  const san = moves[step - 1];
  const isWhite = step % 2 === 1;
  const moveNum = Math.ceil(step / 2);
  const side = isWhite ? '白' : '黒';

  // この手番に発動した戦術を探す
  const tech = techniques?.find(t => t.moveIndex === step);

  if (tech) {
    const coach = TECH_COACH[tech.id];
    // 戦術後の指定手数以内にxが含まれる手があるか（駒を取れたか）
    const captureOffset = coach?.checkCaptureAt ?? 2;
    const followMoves = moves.slice(step, step + captureOffset);
    const didCapture = captureOffset > 0 && followMoves.some(m => m?.includes('x'));
    const isMate = san?.includes('#');

    return {
      type: 'technique',
      tech,
      moveNum,
      side,
      coach,
      verdict: isMate ? 'mate' : didCapture ? 'good' : 'neutral',
    };
  }

  if (san?.includes('#')) return { type: 'checkmate', moveNum, side, san };
  if (san?.includes('+')) return { type: 'check',     moveNum, side, san };
  if (san === 'O-O' || san === 'O-O-O') return { type: 'castling', moveNum, side, san };
  if (san?.includes('=')) return { type: 'promotion', moveNum, side, san };
  if (san?.includes('x')) return { type: 'capture',   moveNum, side, san };

  return { type: 'neutral', moveNum, side, san };
}

// ── 手順リスト ────────────────────────────────────────────────────────────────
function MoveList({ moves, step, techniques, onGoTo }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [step]);

  // moveIndex → technique のマップ
  const techByMove = useMemo(() => {
    const map = {};
    (techniques || []).forEach(t => { map[t.moveIndex] = t; });
    return map;
  }, [techniques]);

  const pairs = useMemo(() => {
    const result = [];
    for (let i = 0; i < moves.length; i += 2) {
      result.push({
        num: Math.floor(i / 2) + 1,
        white: { san: moves[i],      stepIndex: i + 1 },
        black: moves[i + 1] ? { san: moves[i + 1], stepIndex: i + 2 } : null,
      });
    }
    return result;
  }, [moves]);

  return (
    <div className="replay-move-list">
      {pairs.map(pair => (
        <div key={pair.num} className="replay-pair">
          <span className="replay-pair-num">{pair.num}.</span>

          <button
            ref={step === pair.white.stepIndex ? activeRef : null}
            className={`replay-move-btn ${step === pair.white.stepIndex ? 'replay-move-active' : ''}`}
            onClick={() => onGoTo(pair.white.stepIndex)}
          >
            {pair.white.san}
            {techByMove[pair.white.stepIndex] && (
              <span
                className="replay-tech-badge"
                title={techByMove[pair.white.stepIndex].name}
                style={{ color: techByMove[pair.white.stepIndex].color }}
              >
                {techByMove[pair.white.stepIndex].icon}
              </span>
            )}
          </button>

          {pair.black && (
            <button
              ref={step === pair.black.stepIndex ? activeRef : null}
              className={`replay-move-btn ${step === pair.black.stepIndex ? 'replay-move-active' : ''}`}
              onClick={() => onGoTo(pair.black.stepIndex)}
            >
              {pair.black.san}
              {techByMove[pair.black.stepIndex] && (
                <span
                  className="replay-tech-badge"
                  title={techByMove[pair.black.stepIndex].name}
                  style={{ color: techByMove[pair.black.stepIndex].color }}
                >
                  {techByMove[pair.black.stepIndex].icon}
                </span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── コメントパネル ─────────────────────────────────────────────────────────────
function MoveComment({ comment }) {
  if (!comment) return null;

  if (comment.type === 'start') {
    return (
      <div className="replay-comment replay-comment--neutral">
        <p className="replay-comment-label">対局開始前</p>
        <p className="replay-comment-text">← → キーか下のボタンで手を進めよう</p>
      </div>
    );
  }

  if (comment.type === 'technique') {
    const { tech, moveNum, side, coach, verdict } = comment;
    const verdictInfo = verdict === 'mate'
      ? { label: '完璧！', text: 'チェックメイトにつながりました！', color: '#4CAF50' }
      : verdict === 'good'
      ? { label: '成功', text: coach?.evalGood, color: '#4CAF50' }
      : { label: '参考', text: coach?.evalNeutral, color: '#FF9800' };

    return (
      <div className="replay-comment replay-comment--technique" style={{ borderLeftColor: tech.color }}>
        <div className="replay-comment-header">
          <span className="replay-comment-icon">{tech.icon}</span>
          <span className="replay-comment-tech-name" style={{ color: tech.color }}>{tech.name}</span>
          <span className="replay-comment-move">{moveNum}手目（{side}）</span>
        </div>
        {coach && (
          <div className="replay-comment-body">
            <p className="replay-comment-row"><span className="replay-comment-key">なぜ</span>{coach.why}</p>
            <p className="replay-comment-row"><span className="replay-comment-key">効果</span>{coach.effect}</p>
          </div>
        )}
        <div className="replay-comment-verdict" style={{ borderColor: verdictInfo.color, color: verdictInfo.color }}>
          <span className="replay-comment-verdict-label">{verdictInfo.label}</span>
          <span>{verdictInfo.text}</span>
        </div>
      </div>
    );
  }

  // シンプルなコメント
  const simpleMap = {
    checkmate: { label: 'チェックメイト！', color: '#F44336' },
    check:     { label: 'チェック',         color: '#FF9800' },
    castling:  { label: 'キャスリング',     color: '#4FC3F7' },
    promotion: { label: '昇格！',           color: '#FFB800' },
    capture:   { label: '駒を取る',         color: '#EF9A9A' },
    neutral:   { label: '',                 color: 'rgba(255,255,255,0.15)' },
  };
  const info = simpleMap[comment.type] ?? simpleMap.neutral;
  const labelText = [info.label, `${comment.moveNum}手目（${comment.side}）`, comment.san].filter(Boolean).join('　');

  return (
    <div className="replay-comment replay-comment--simple" style={{ borderLeftColor: info.color }}>
      <p className="replay-comment-text" style={{ color: info.color || 'rgba(255,255,255,0.6)' }}>
        {labelText}
      </p>
    </div>
  );
}

// ── Review ページ ─────────────────────────────────────────────────────────────
export default function Review() {
  const location = useLocation();
  const navigate = useNavigate();

  const game = location.state?.game ?? null;
  const boardThemeId = location.state?.boardThemeId ?? 'classic';
  const boardTheme = BOARD_THEMES.find(t => t.id === boardThemeId) ?? BOARD_THEMES[0];

  const techniques = game?.techniques ?? [];

  const positions = useMemo(
    () => (game ? buildPositions(game.moves) : []),
    [game]
  );
  const total = positions.length - 1;

  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const goTo = useCallback((s) => {
    setStep(Math.min(total, Math.max(0, s)));
    setIsPlaying(false);
  }, [total]);

  // 自動再生
  useEffect(() => {
    if (!isPlaying) return;
    if (step >= total) { setIsPlaying(false); return; }
    const t = setTimeout(() => setStep(s => s + 1), 1000);
    return () => clearTimeout(t);
  }, [isPlaying, step, total]);

  // キーボード操作
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(step - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(step + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, goTo]);

  const handlePlayPause = () => {
    if (step >= total) setStep(0);
    setIsPlaying(p => !p);
  };

  const comment = useMemo(
    () => game ? getMoveComment(step, game.moves, techniques) : null,
    [step, game, techniques]
  );

  // データなし
  if (!game) {
    return (
      <div className="app-container">
        <NavBar />
        <main className="review-page">
          <div className="review-empty">
            <p>棋譜データがありません。</p>
            <button className="new-game-btn" onClick={() => navigate('/play')}>
              ← 対局に戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { fen, lastMove } = positions[step];
  const chess = new Chess(fen);

  return (
    <div className="app-container">
      <NavBar />

      <main className="review-page">
        {/* ── ヘッダー ── */}
        <div className="review-header">
          <button className="review-back-btn" onClick={() => navigate(-1)}>
            ← 戻る
          </button>
          <h1 className="review-title">棋譜リプレイ</h1>
          <span className="replay-step-counter">{step} / {total}手</span>
        </div>

        {/* ── 盤面 + 手順リスト ── */}
        <div className="replay-body">
          <div className="replay-board-wrap">
            <ChessBoard
              board={chess.board()}
              selectedSquare={null}
              legalMoves={[]}
              lastMove={lastMove}
              gameStatus="playing"
              boardTheme={boardTheme}
              hint={null}
              onSquareClick={() => {}}
              onDrop={() => {}}
              onCancelDrag={() => {}}
            />
          </div>

          <div className="replay-side">
            <p className="replay-moves-title">手順（{total}手）</p>
            <MoveList moves={game.moves} step={step} techniques={techniques} onGoTo={goTo} />
          </div>
        </div>

        {/* ── コメントパネル（全幅） ── */}
        <MoveComment comment={comment} />

        {/* ── コントロール ── */}
        <div className="replay-controls">
          <button className="replay-ctrl-btn" onClick={() => goTo(0)}        title="最初">⏮</button>
          <button className="replay-ctrl-btn" onClick={() => goTo(step - 1)} title="前の手（←）">⏪</button>
          <button
            className={`replay-ctrl-btn replay-play-btn ${isPlaying ? 'replay-playing' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? '一時停止' : '自動再生'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="replay-ctrl-btn" onClick={() => goTo(step + 1)} title="次の手（→）">⏩</button>
          <button className="replay-ctrl-btn" onClick={() => goTo(total)}    title="最後">⏭</button>
        </div>
        <p className="replay-keyboard-hint">← → キーでも操作できます</p>
      </main>
    </div>
  );
}
