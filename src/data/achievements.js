// 実績バッジ定義

export const ACHIEVEMENTS = [
  {
    id: 'first_win',
    name: '初勝利',
    icon: '🏆',
    description: '初めて勝利する',
  },
  {
    id: 'blitz_win',
    name: '電光石火',
    icon: '⚡',
    description: '15手以内に勝利する',
  },
  {
    id: 'hard_win',
    name: '鉄壁突破',
    icon: '💀',
    description: 'むずかしい難易度で勝利する',
  },
  {
    id: 'win_streak_3',
    name: '3連勝',
    icon: '🔥',
    description: '3連勝する',
  },
  {
    id: 'ten_wins',
    name: '十傑',
    icon: '⚔️',
    description: '合計10勝する',
  },
  {
    id: 'castling',
    name: 'キャスリング王',
    icon: '🛡️',
    description: 'キャスリングを行う',
  },
  {
    id: 'promotion',
    name: '昇格の儀',
    icon: '👑',
    description: 'ポーンをクイーンに昇格させる',
  },
  {
    id: 'fork',
    name: 'フォーク師',
    icon: '🍴',
    description: 'フォーク（両取り）を発動する',
  },
  {
    id: 'pin',
    name: 'ピン師',
    icon: '📌',
    description: 'ピンを発動する',
  },
  {
    id: 'deep_opening',
    name: '定跡通',
    icon: '📖',
    description: '定跡を8手以上辿る',
  },
];

/**
 * ゲーム終了時に新たに解除された実績を返す
 * @param {object} ctx - { result, difficulty, moveCount, techniqueLog, moveHistory, openingMoves, wins, streak }
 * @param {string[]} alreadyUnlocked - 既に解除済みの実績IDリスト
 * @returns {object[]} 新たに解除された実績オブジェクトの配列
 */
export function checkAchievements(ctx, alreadyUnlocked) {
  const { result, difficulty, moveCount, techniqueLog, moveHistory, openingMoves, wins, streak } = ctx;
  const techIds = techniqueLog.map(t => t.id);

  // 各実績の解除条件
  const CONDITIONS = {
    first_win:    () => result === 'win',
    blitz_win:    () => result === 'win' && moveCount <= 15,
    hard_win:     () => result === 'win' && difficulty === 'hard',
    win_streak_3: () => streak >= 3,
    ten_wins:     () => wins >= 10,
    castling:     () => moveHistory.some(m => m.san === 'O-O' || m.san === 'O-O-O'),
    promotion:    () => moveHistory.some(m => m.promotion),
    fork:         () => techIds.includes('fork'),
    pin:          () => techIds.includes('pin'),
    deep_opening: () => openingMoves >= 8,
  };

  return ACHIEVEMENTS.filter(a => {
    if (alreadyUnlocked.includes(a.id)) return false; // 既解除はスキップ
    const condition = CONDITIONS[a.id];
    return condition ? condition() : false;
  });
}
