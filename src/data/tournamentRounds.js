// トーナメントの各ラウンド定義（対戦相手・難易度）
export const TOURNAMENT_ROUNDS = [
  { id: 1, label: 'ラウンド 1', opponent: '初心者',         difficulty: 'easy',   emoji: '🤖', diffLabel: 'かんたん' },
  { id: 2, label: 'ラウンド 2', opponent: '中級者',         difficulty: 'easy',   emoji: '🤖', diffLabel: 'かんたん' },
  { id: 3, label: 'ラウンド 3', opponent: '強者',           difficulty: 'normal', emoji: '🧠', diffLabel: 'ふつう'   },
  { id: 4, label: 'ファイナル', opponent: 'グランドマスター', difficulty: 'hard',   emoji: '👑', diffLabel: 'むずかしい' },
];
