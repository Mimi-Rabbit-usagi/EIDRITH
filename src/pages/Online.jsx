import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import NavBar from '../components/NavBar';
import ChessBoard from '../components/ChessBoard';
import PromotionModal from '../components/PromotionModal';

// ── ユーティリティ ─────────────────────────────────────────────────────────────
function getGuestId() {
  let id = sessionStorage.getItem('chess-guest-id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('chess-guest-id', id);
  }
  return id;
}

function buildGameStatus(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isDraw())      return 'draw';
  if (chess.isCheck())     return 'check';
  return 'playing';
}

// ── 待機画面 ──────────────────────────────────────────────────────────────────
function WaitingScreen({ playerName, playerAvatar, onCancel }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="online-waiting">
      <div className="online-waiting-avatar">{playerAvatar}</div>
      <p className="online-waiting-name">{playerName}</p>
      <div className="online-waiting-spinner" />
      <p className="online-waiting-text">対戦相手を探しています{dots}</p>
      <button className="online-cancel-btn" onClick={onCancel}>キャンセル</button>
    </div>
  );
}

// ── 対局画面 ──────────────────────────────────────────────────────────────────
function GameScreen({ game, myColor, myId, onGameEnd }) {
  const chessRef  = useRef(new Chess());
  const [fen, setFen]                   = useState(game.fen);
  const [selectedSquare, setSelected]   = useState(null);
  const [legalMoves, setLegalMoves]     = useState([]);
  const [lastMove, setLastMove]         = useState(null);
  const [pendingPromotion, setPending]  = useState(null);
  const [gameStatus, setGameStatus]     = useState('playing');
  const [winner, setWinner]             = useState(null);
  const [isOpponentLeft, setOpponentLeft] = useState(false);

  const opponentColor = myColor === 'w' ? 'b' : 'w';
  const myInfo        = myColor === 'w'
    ? { name: game.white_name, avatar: game.white_avatar }
    : { name: game.black_name, avatar: game.black_avatar };
  const oppInfo       = myColor === 'w'
    ? { name: game.black_name, avatar: game.black_avatar }
    : { name: game.white_name, avatar: game.white_avatar };

  // ── Supabase からゲーム更新を受け取る ───────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    // 初回: DBの最新状態を取得
    supabase.from('games').select('*').eq('id', game.id).single()
      .then(({ data }) => { if (data) applyGameData(data); });

    const channel = supabase
      .channel(`game:${game.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}`,
      }, ({ new: updated }) => applyGameData(updated))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  function applyGameData(data) {
    const c = new Chess();
    // 棋譜を再生して局面を復元
    for (const move of (data.moves ?? [])) {
      try { c.move(move); } catch { break; }
    }
    chessRef.current = c;
    setFen(c.fen());
    const history = c.history({ verbose: true });
    const last = history[history.length - 1];
    if (last) setLastMove({ from: last.from, to: last.to });

    if (data.status !== 'playing') {
      setGameStatus(data.status);
      setWinner(data.winner ?? null);
      onGameEnd(data);
    } else {
      setGameStatus(buildGameStatus(c));
    }

    if (data.status === 'abandoned') setOpponentLeft(true);
  }

  // ── 手を指す ──────────────────────────────────────────────────────────────
  const executeMove = useCallback(async (from, to, promotion = null) => {
    const c = chessRef.current;
    const moveObj = promotion
      ? c.move({ from, to, promotion })
      : c.move({ from, to, promotion: 'q' });
    if (!moveObj) return;

    setFen(c.fen());
    setLastMove({ from, to });
    setSelected(null);
    setLegalMoves([]);
    setGameStatus(buildGameStatus(c));

    const allMoves = c.history();
    let newStatus = 'playing', newWinner = null;
    if (c.isCheckmate()) { newStatus = 'checkmate'; newWinner = myColor; }
    else if (c.isStalemate() || c.isDraw()) { newStatus = 'draw'; }

    if (!supabase) return;
    await supabase.from('games').update({
      fen: c.fen(),
      moves: allMoves,
      status: newStatus,
      winner: newWinner,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
  }, [game.id, myColor]);

  const handleSquareClick = useCallback((square) => {
    const c = chessRef.current;
    if (c.turn() !== myColor || gameStatus !== 'playing') return;
    const piece = c.get(square);

    if (selectedSquare) {
      if (legalMoves.includes(square)) {
        const isPromotion = c.moves({ square: selectedSquare, verbose: true })
          .some(m => m.to === square && m.promotion);
        if (isPromotion) { setPending({ from: selectedSquare, to: square }); return; }
        executeMove(selectedSquare, square);
        return;
      }
      if (piece && piece.color === myColor) {
        setSelected(square);
        setLegalMoves(c.moves({ square, verbose: true }).map(m => m.to));
        return;
      }
      setSelected(null); setLegalMoves([]);
      return;
    }
    if (piece && piece.color === myColor) {
      setSelected(square);
      setLegalMoves(c.moves({ square, verbose: true }).map(m => m.to));
    }
  }, [selectedSquare, legalMoves, myColor, gameStatus, executeMove]);

  const handleDrop = useCallback((from, to) => {
    const c = chessRef.current;
    if (c.turn() !== myColor || gameStatus !== 'playing') return;
    const piece = c.get(from);
    if (!piece || piece.color !== myColor) return;
    const isPromotion = c.moves({ square: from, verbose: true }).some(m => m.to === to && m.promotion);
    if (isPromotion) { setPending({ from, to }); return; }
    executeMove(from, to);
  }, [myColor, gameStatus, executeMove]);

  const confirmPromotion = useCallback((piece) => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPending(null);
  }, [pendingPromotion, executeMove]);

  // ── 投了 ──────────────────────────────────────────────────────────────────
  const handleResign = async () => {
    if (!supabase) return;
    await supabase.from('games').update({
      status: 'checkmate',
      winner: opponentColor,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);
  };

  const chess = chessRef.current;
  const isMyTurn = chess.turn() === myColor && gameStatus === 'playing';
  const isOver   = gameStatus !== 'playing' && gameStatus !== 'check';

  return (
    <div className="online-game">
      {/* 相手情報 */}
      <div className="online-player-bar online-player-bar--opp">
        <span className="online-player-avatar">{oppInfo.avatar}</span>
        <span className="online-player-name">{oppInfo.name}</span>
        <span className="online-player-color">{opponentColor === 'w' ? '白' : '黒'}</span>
        {isOpponentLeft && <span className="online-left-badge">離席</span>}
      </div>

      {/* ボード */}
      <div className="online-board-wrap">
        <ChessBoard
          board={chess.board()}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={lastMove}
          gameStatus={gameStatus}
          boardTheme={{ light: '#F0D9B5', dark: '#B58863', highlight: 'rgba(255,255,0,0.4)', lastMove: 'rgba(205,210,106,0.8)' }}
          pieceSet="classic"
          hint={null}
          flipped={myColor === 'b'}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onCancelDrag={() => { setSelected(null); setLegalMoves([]); }}
        />
      </div>

      {/* 自分の情報 */}
      <div className="online-player-bar online-player-bar--me">
        <span className="online-player-avatar">{myInfo.avatar}</span>
        <span className="online-player-name">{myInfo.name}（あなた）</span>
        <span className="online-player-color">{myColor === 'w' ? '白' : '黒'}</span>
      </div>

      {/* ステータス・ボタン */}
      <div className="online-status-bar">
        {isOver ? (
          <div className="online-result">
            {gameStatus === 'checkmate' && (
              <span>{winner === myColor ? '🏆 あなたの勝ち！' : '😔 負け...'}</span>
            )}
            {(gameStatus === 'stalemate' || gameStatus === 'draw') && <span>🤝 引き分け</span>}
            {gameStatus === 'abandoned' && <span>相手が離席しました</span>}
            <button className="online-back-btn" onClick={() => onGameEnd(null)}>ロビーに戻る</button>
          </div>
        ) : (
          <div className="online-turn">
            <span className={`online-turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
              {isMyTurn ? 'あなたの番' : '相手の番...'}
            </span>
            <button className="online-resign-btn" onClick={handleResign}>投了</button>
          </div>
        )}
      </div>

      {pendingPromotion && <PromotionModal onConfirm={confirmPromotion} />}
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────
export default function Online() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const playerId   = user?.id ?? getGuestId();
  const playerName = localStorage.getItem('chess-player-name') || 'ゲスト';
  const playerAvatar = localStorage.getItem('chess-avatar-emoji') || '♟';

  const [phase, setPhase]     = useState('lobby');   // lobby | waiting | playing
  const [currentGame, setCurrentGame] = useState(null);
  const [myColor, setMyColor] = useState('w');
  const matchmakingIdRef      = useRef(null);

  // ── マッチング開始 ───────────────────────────────────────────────────────
  const startMatchmaking = useCallback(async () => {
    if (!supabase) return;
    setPhase('waiting');

    // 先に待機中の相手を探す
    const { data: waiting } = await supabase
      .from('matchmaking')
      .select('*')
      .neq('player_id', playerId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (waiting && waiting.length > 0) {
      // 相手が見つかった → ゲームを作成
      const opponent = waiting[0];
      await supabase.from('matchmaking').delete().eq('id', opponent.id);

      const myCol    = 'b'; // 後から来た人が黒
      const oppCol   = 'w';
      setMyColor(myCol);

      const { data: newGame } = await supabase.from('games').insert({
        white_id:     opponent.player_id,
        white_name:   opponent.name,
        white_avatar: opponent.avatar,
        black_id:     playerId,
        black_name:   playerName,
        black_avatar: playerAvatar,
      }).select().single();

      if (newGame) {
        setCurrentGame(newGame);
        setPhase('playing');
      }
    } else {
      // 待機列に自分を追加
      const { data: entry } = await supabase.from('matchmaking').insert({
        player_id: playerId,
        name:      playerName,
        avatar:    playerAvatar,
        color:     'w',
      }).select().single();

      if (entry) {
        matchmakingIdRef.current = entry.id;
        // 相手が来るのを Realtime で待つ
        listenForMatch();
      }
    }
  }, [playerId, playerName, playerAvatar]);

  // ── 相手からのゲーム作成を監視 ──────────────────────────────────────────
  const listenForMatch = useCallback(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`matchmaking:${playerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'games',
        filter: `white_id=eq.${playerId}`,
      }, ({ new: newGame }) => {
        supabase.removeChannel(channel);
        setMyColor('w');
        setCurrentGame(newGame);
        setPhase('playing');
      })
      .subscribe();
  }, [playerId]);

  // ── マッチングキャンセル ────────────────────────────────────────────────
  const cancelMatchmaking = useCallback(async () => {
    if (!supabase) return;
    if (matchmakingIdRef.current) {
      await supabase.from('matchmaking').delete().eq('id', matchmakingIdRef.current);
      matchmakingIdRef.current = null;
    }
    setPhase('lobby');
  }, []);

  // ── 対局終了 ────────────────────────────────────────────────────────────
  const handleGameEnd = useCallback(() => {
    setCurrentGame(null);
    setPhase('lobby');
  }, []);

  // ── 離脱時にマッチングキューから削除 ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (matchmakingIdRef.current && supabase) {
        supabase.from('matchmaking').delete().eq('id', matchmakingIdRef.current);
      }
    };
  }, []);

  if (!supabase) {
    return (
      <div className="app-container">
        <NavBar />
        <main className="online-page">
          <div className="online-coming-soon">
            <div className="online-coming-icon">🌐</div>
            <h2 className="online-coming-title">オンライン対戦</h2>
            <p className="online-coming-desc">
              世界中のプレイヤーとリアルタイムで対局できる機能を<br />
              現在準備中です。もうしばらくお待ちください。
            </p>
            <button className="online-back-link" onClick={() => navigate('/play')}>
              ← CPU対戦に戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <NavBar />
      <main className="online-page">

        {phase === 'lobby' && (
          <div className="online-lobby">
            <h1 className="online-lobby-title">オンライン対戦</h1>
            <div className="online-profile-preview">
              <span className="online-preview-avatar">{playerAvatar}</span>
              <span className="online-preview-name">{playerName}</span>
            </div>
            <p className="online-lobby-desc">
              ランダムに対戦相手を探します。<br />
              世界中のプレイヤーと対局しましょう！
            </p>
            <button className="online-start-btn" onClick={startMatchmaking}>
              ♟ マッチングを始める
            </button>
            <button className="online-back-link" onClick={() => navigate('/play')}>
              ← CPU対戦に戻る
            </button>
          </div>
        )}

        {phase === 'waiting' && (
          <WaitingScreen
            playerName={playerName}
            playerAvatar={playerAvatar}
            onCancel={cancelMatchmaking}
          />
        )}

        {phase === 'playing' && currentGame && (
          <GameScreen
            game={currentGame}
            myColor={myColor}
            myId={playerId}
            onGameEnd={handleGameEnd}
          />
        )}

      </main>
    </div>
  );
}
