import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { loadTournamentState, saveTournamentState, safeLoad, safeSave } from '../lib/storage';
import { TOURNAMENT_ROUNDS } from '../data/tournamentRounds';

function startFreshTournament() {
  const state = {
    active: true,
    currentRound: 1,
    results: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    champion: false,
    history: loadTournamentState().history ?? [],
  };
  saveTournamentState(state);
  return state;
}

/**
 * 保存済みのトーナメント状態を読み、Play.jsx が書き残した対局結果があれば取り込む。
 *
 * localStorage の読み取りだけで書き換えは行わない（StrictMode では useState の
 * 初期化関数が2回呼ばれるため、ここで受け渡しデータを消すと結果が失われる）。
 * 消す処理は Tournament 内の effect で行う。
 */
function loadTournamentWithPendingResult() {
  const state = loadTournamentState();
  const lastResult = safeLoad('chess-tournament-last-result', null);
  if (!lastResult) return state;
  if (!state.active) return state;
  if (lastResult.round !== state.currentRound) return state;

  const newResults = [...state.results, {
    round: lastResult.round,
    result: lastResult.result,
    moveCount: lastResult.moveCount,
    date: new Date().toISOString(),
  }];

  if (lastResult.result === 'loss') {
    // 敗退
    const finished = {
      ...state,
      active: false,
      results: newResults,
      finishedAt: new Date().toISOString(),
      champion: false,
      history: [
        { reachedRound: lastResult.round, champion: false, date: new Date().toISOString() },
        ...(state.history ?? []),
      ].slice(0, 5),
    };
    saveTournamentState(finished);
    return finished;
  }

  // 勝利
  const nextRound = state.currentRound + 1;
  const isChampion = nextRound > TOURNAMENT_ROUNDS.length;
  const finished = {
    ...state,
    active: !isChampion,
    currentRound: isChampion ? state.currentRound : nextRound,
    results: newResults,
    finishedAt: isChampion ? new Date().toISOString() : null,
    champion: isChampion,
    history: isChampion
      ? [
          { reachedRound: state.currentRound, champion: true, date: new Date().toISOString() },
          ...(state.history ?? []),
        ].slice(0, 5)
      : (state.history ?? []),
  };
  saveTournamentState(finished);
  return finished;
}

export default function Tournament() {
  const navigate = useNavigate();
  const [ts, setTs] = useState(loadTournamentWithPendingResult);

  // 取り込み済みの受け渡しデータを消す。
  // 外部ストレージの後始末なので effect が適切な置き場所。
  // 万一ここに来る前に落ちても、次回は currentRound が進んでいて
  // loadTournamentWithPendingResult が二重適用を弾くので安全。
  useEffect(() => {
    safeSave('chess-tournament-last-result', null);
  }, []);

  const handleStart = () => {
    const fresh = startFreshTournament();
    setTs(fresh);
  };

  const handlePlayRound = (round) => {
    navigate(`/play?tournament=${round.id}&diff=${round.difficulty}`);
  };

  return (
    <div className="tournament-container">
      <div className="home-bg-glow home-bg-glow--left" />
      <div className="home-bg-glow home-bg-glow--right" />
      <NavBar />

      <div className="tournament-inner">
        <h1 className="tournament-title">🏆 トーナメント</h1>
        <p className="tournament-subtitle">4ラウンドを勝ち抜いてグランドマスターに挑め</p>

        {/* チャンピオン画面 */}
        {ts.champion && (
          <div className="tournament-champion">
            <div className="tournament-champion-icon">👑</div>
            <h2 className="tournament-champion-title">チャンピオン！</h2>
            <p className="tournament-champion-desc">
              全{TOURNAMENT_ROUNDS.length}ラウンドを制覇しました！
            </p>
            <button className="tournament-start-btn" onClick={handleStart}>
              もう一度挑戦する
            </button>
          </div>
        )}

        {/* 敗退画面 */}
        {!ts.active && !ts.champion && ts.finishedAt && (
          <div className="tournament-eliminated">
            <div className="tournament-elim-icon">💀</div>
            <p className="tournament-elim-text">
              ラウンド{ts.results[ts.results.length - 1]?.round ?? '?'}で敗退しました
            </p>
            <button className="tournament-start-btn" onClick={handleStart}>
              再挑戦する
            </button>
          </div>
        )}

        {/* ブラケット */}
        <div className="tournament-bracket">
          {TOURNAMENT_ROUNDS.map(round => {
            const res = ts.results?.find(r => r.round === round.id);
            let status = 'pending';
            if (res) status = res.result === 'win' ? 'win' : 'loss';
            else if (ts.active && ts.currentRound === round.id) status = 'current';
            else if (ts.active && ts.currentRound > round.id) status = 'win'; // shouldn't happen but safe

            return (
              <div
                key={round.id}
                className={`tournament-round-card tournament-round-card--${status}`}
              >
                <div className="tournament-round-num">{round.label}</div>
                <div className="tournament-round-body">
                  <span className="tournament-round-emoji">{round.emoji}</span>
                  <div className="tournament-round-info">
                    <span className="tournament-round-opponent">{round.opponent}</span>
                    <span className="tournament-round-diff">{round.diffLabel}</span>
                  </div>
                  {res && (
                    <span className={`tournament-round-result tournament-round-result--${res.result}`}>
                      {res.result === 'win' ? '✓ 勝利' : '✗ 敗退'}
                    </span>
                  )}
                  {status === 'current' && (
                    <button
                      className="tournament-play-btn"
                      onClick={() => handlePlayRound(round)}
                    >
                      対戦する →
                    </button>
                  )}
                  {status === 'pending' && !ts.active && (
                    <span className="tournament-round-locked">🔒</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* トーナメント開始 */}
        {!ts.active && !ts.champion && !ts.finishedAt && (
          <button className="tournament-start-btn" onClick={handleStart}>
            トーナメントを始める
          </button>
        )}

        {/* 過去の記録 */}
        {ts.history?.length > 0 && (
          <div className="tournament-history">
            <h3 className="tournament-history-title">過去の記録</h3>
            {ts.history.map((h, i) => (
              <div key={i} className={`tournament-history-row ${h.champion ? 'tournament-history-row--champion' : ''}`}>
                <span>{h.champion ? '👑 チャンピオン' : `ラウンド${h.reachedRound}で敗退`}</span>
                <span className="tournament-history-date">
                  {new Date(h.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
