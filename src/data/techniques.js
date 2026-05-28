// ────────────────────────────────────────────────────────────────────────────
// チェス技・概念データ — チェス戦略大全準拠
// categories: special / basic / tactics / mate_pattern / strategy / pawn
// detectable: true = ゲーム中に自動検出して表示
// ────────────────────────────────────────────────────────────────────────────

export const TECHNIQUES = {

  // ── 特殊ルール ──────────────────────────────────────────────────────────

  castling: {
    id: 'castling', category: 'special', detectable: true,
    name: 'キャスリング', nameEn: 'Castling', icon: '🏰', color: '#6C63FF',
    description: 'キングとルークが同時に動く唯一の手。キングを安全に守りつつ、ルークを中央へ活用できます。',
    detail: '条件: ①キング・ルークとも未移動 ②間に駒がない ③キングがチェック下でない ④通過するマスが攻撃されていない。キングサイド（0-0）とクイーンサイド（0-0-0）の2種類あり。',
  },
  enPassant: {
    id: 'enPassant', category: 'special', detectable: true,
    name: 'アンパッサン', nameEn: 'En Passant', icon: '👻', color: '#FF6584',
    description: '相手ポーンが2マス前進した直後のみ、隣のポーンで斜めに取れる特殊ルール。フランス語で「通りすがりに」の意味。',
    detail: 'チャンスは1手のみ。次のターンを逃すと権利は消える。初心者が最も忘れやすいルールの一つ。',
  },
  promotion: {
    id: 'promotion', category: 'special', detectable: true,
    name: 'プロモーション（昇格）', nameEn: 'Promotion', icon: '👑', color: '#FFB800',
    description: 'ポーンが相手の最奥段に到達したとき、クイーン・ルーク・ビショップ・ナイトに変身できます。',
    detail: 'ほとんどの場合クイーンへの昇格が最強。しかし特定局面では敢えてナイトに昇格する「アンダープロモーション」が有効なことも。',
  },

  // ── 基本概念 ────────────────────────────────────────────────────────────

  check: {
    id: 'check', category: 'basic', detectable: true,
    name: 'チェック（王手）', nameEn: 'Check', icon: '⚠️', color: '#FF9800',
    description: '相手のキングを直接攻撃している状態。受けた側は必ずそのターンに解消しなければなりません。',
    detail: '解消方法は3つ: ①キングを逃がす ②攻撃駒を取る ③間に駒を挟む。3つのうちどれも無理ならチェックメイト。',
  },
  checkmate: {
    id: 'checkmate', category: 'basic', detectable: true,
    name: 'チェックメイト（詰み）', nameEn: 'Checkmate', icon: '🏆', color: '#4CAF50',
    description: 'キングがチェックを受けており、どの手を指しても逃れられない状態。これでゲーム終了です！',
    detail: '逃げ道・ブロック・攻撃駒の除去、すべてが不可能な状態。チェックメイトを与えた側の完全勝利。',
  },
  stalemate: {
    id: 'stalemate', category: 'basic', detectable: true,
    name: 'ステイルメイト（引き分け）', nameEn: 'Stalemate', icon: '🤝', color: '#9E9E9E',
    description: 'チェックを受けていないのに、合法的な手が一つもない状態。引き分けになります。',
    detail: '負けそうな側が意図的にステイルメイトに誘導することも。駒得していても引き分けになる重要な概念。',
  },
  draw: {
    id: 'draw', category: 'basic', detectable: false,
    name: '引き分け', nameEn: 'Draw', icon: '🤝', color: '#9E9E9E',
    description: 'どちらも勝利できずゲームが終了する状態。ステイルメイト・繰り返し・50手ルールなど複数の原因があります。',
    detail: '種類: ステイルメイト / 同一局面3回繰り返し / 50手ルール（捕獲・ポーン移動なし） / 合意引き分け / 詰みに必要な駒不足',
  },

  // ── 戦術手筋 ────────────────────────────────────────────────────────────

  fork: {
    id: 'fork', category: 'tactics', detectable: true,
    name: 'フォーク（両取り）', nameEn: 'Fork', icon: '⚔️', color: '#E91E63',
    description: '1つの駒で相手の2つ以上の駒を同時に攻撃するテクニック。相手はすべてを守りきれません！',
    detail: 'ナイトフォークが最も有名で強力。キングとクイーンを同時に狙う「ロイヤルフォーク」は特に決定的。ポーンフォークも侮れない。',
  },
  pin: {
    id: 'pin', category: 'tactics', detectable: false,
    name: 'ピン（釘付け）', nameEn: 'Pin', icon: '📌', color: '#9C27B0',
    description: '駒が動くと後ろにいるより価値の高い駒が危険になる状態。動けない（アブソリュートピン）か動きたくない（リラティブピン）状態に追い込む。',
    detail: 'アブソリュートピン: 後ろがキングのため絶対に動けない。リラティブピン: 動けるが損をするため動きにくい。ビショップやルーク・クイーンでよく作られる。',
  },
  skewer: {
    id: 'skewer', category: 'tactics', detectable: false,
    name: 'スキュアー（串刺し）', nameEn: 'Skewer', icon: '🏹', color: '#FF5722',
    description: 'ピンの逆。価値の高い駒が前にあり、逃げると後ろの駒が取られる。高い駒を逃がすと安い駒が取られる構造。',
    detail: '例: ルークがキングを攻撃→キングが逃げると後ろのクイーンが取られる。ピンと並んで基本的な戦術の一つ。',
  },
  discoveredAttack: {
    id: 'discoveredAttack', category: 'tactics', detectable: false,
    name: '発見攻撃', nameEn: 'Discovered Attack', icon: '🔍', color: '#2196F3',
    description: '駒を動かすことで、後ろにいた別の駒が相手の駒を攻撃できるようになる手。2つの脅威が同時に発生！',
    detail: '動かした駒も別の攻撃をすれば「二重攻撃」になる。相手は2つの脅威を同時に対処できず、必ず損をする。',
  },
  discoveredCheck: {
    id: 'discoveredCheck', category: 'tactics', detectable: true,
    name: '発見チェック（開き王手）', nameEn: 'Discovered Check', icon: '💥', color: '#00BCD4',
    description: '駒を動かすことで、後ろにいた別の駒がキングにチェックをかける手。動かした駒はどこに行っても良い！',
    detail: '移動した駒が別の攻撃をしながら発見チェックを掛ける「両王手（ダブルチェック）」が特に強力。逃げるしか対処法がない。',
  },
  doubleCheck: {
    id: 'doubleCheck', category: 'tactics', detectable: true,
    name: 'ダブルチェック（両王手）', nameEn: 'Double Check', icon: '‼️', color: '#F44336',
    description: '2つの駒が同時にキングにチェックをかける状態。ブロックも駒を取ることもできず、キングは逃げるしかない！',
    detail: '発見チェックと同時に移動した駒もチェックをかけることで発生。チェスで最も逃げにくいチェックの形。',
  },
  decoy: {
    id: 'decoy', category: 'tactics', detectable: false,
    name: 'デコイ（おびき寄せ）', nameEn: 'Decoy', icon: '🪤', color: '#795548',
    description: '相手の駒を不利な位置に誘い込む手。わざと駒を差し出して相手に取らせ、その後で決定的な手を放つ。',
    detail: '犠打（サクリファイス）の一形態。例: 駒を差し出してキングを危険なマスに誘い込み、チェックメイトのパターンに誘導する。',
  },
  deflection: {
    id: 'deflection', category: 'tactics', detectable: false,
    name: 'ディフレクション（そらし）', nameEn: 'Deflection', icon: '↗️', color: '#607D8B',
    description: '大事な役目を担っている相手の駒を、別の場所に引っ張り出す手。守りを崩すテクニック。',
    detail: '例: クイーンがバックランクを守っているとき、クイーンを別の場所に引き付けてバックランクメイトを決める。',
  },
  overloading: {
    id: 'overloading', category: 'tactics', detectable: false,
    name: 'オーバーローディング（過負荷）', nameEn: 'Overloading', icon: '💢', color: '#FF7043',
    description: '相手の1つの駒が2つの役目を同時に担っているとき、その駒に過大な仕事を押し付けて守りを崩す。',
    detail: '例: ルークがバックランクも守りながら重要な駒も守っている→どちらかを取ることで相手は両方を守りきれない。',
  },
  undermining: {
    id: 'undermining', category: 'tactics', detectable: false,
    name: 'アンダーマイニング（守備駒の除去）', nameEn: 'Undermining', icon: '⛏️', color: '#8D6E63',
    description: '相手の駒を守っている駒を取り除くか、追い払うことで守りを崩すテクニック。',
    detail: '「守備駒の除去」とも呼ぶ。例: ナイトを守っているビショップを取ることで、ナイトを狙えるようになる。',
  },
  interference: {
    id: 'interference', category: 'tactics', detectable: false,
    name: 'インターフェアレンス（妨害）', nameEn: 'Interference', icon: '🚧', color: '#78909C',
    description: '相手の2つの駒が連携しているラインを自分の駒を置くことで遮断する手。相手の守りを分断する。',
    detail: '例: ルークとビショップが連携して守っている場合、その間に駒を置いて連携を断ち切る。稀だが決定的な手になる。',
  },
  xray: {
    id: 'xray', category: 'tactics', detectable: false,
    name: 'X線攻撃（透視攻撃）', nameEn: 'X-ray Attack', icon: '☢️', color: '#26A69A',
    description: '駒の背後から別の駒が同じ方向に攻撃している状態。前の駒が取られても後ろの駒が同じラインを守る。',
    detail: '例: ルークの後ろに別のルークがいると、前のルークを取った駒を後ろのルークで取り返せる。二重に守る強力な形。',
  },
  zwischenzug: {
    id: 'zwischenzug', category: 'tactics', detectable: false,
    name: 'ツヴィッシェンツーク（間の手）', nameEn: 'Zwischenzug', icon: '🎯', color: '#5C6BC0',
    description: '相手が期待している手の前に、より優先度の高い手（特にチェックや取り）を挟む高度なテクニック。',
    detail: 'ドイツ語で「中間の手」の意味。相手が次の手を読んでいるところに予想外の手を挟むことで、局面を有利に変える。',
  },
  battery: {
    id: 'battery', category: 'tactics', detectable: false,
    name: 'バッテリー（重ね利き）', nameEn: 'Battery', icon: '🔋', color: '#66BB6A',
    description: '同じ方向に2つ以上の遠距離駒（クイーン・ルーク・ビショップ）を並べて威力を倍増させる配置。',
    detail: '例: ルーク2枚を同じファイルに重ねる「二重ルーク」、クイーン+ビショップを同じ対角線に並べる形など。',
  },
  sacrifice: {
    id: 'sacrifice', category: 'tactics', detectable: false,
    name: 'サクリファイス（犠打）', nameEn: 'Sacrifice', icon: '🎰', color: '#EF5350',
    description: 'わざと駒を差し出して見返りを得る手。駒の損得よりも局面の優位や詰みを優先する大胆な一手。',
    detail: 'キング周りのポーンをビショップやナイトで破壊する「キングサイド崩し」が典型例。正確な計算が必要。',
  },
  exchangeSacrifice: {
    id: 'exchangeSacrifice', category: 'tactics', detectable: false,
    name: '交換犠打', nameEn: 'Exchange Sacrifice', icon: '♻️', color: '#AB47BC',
    description: 'ルーク（5点）をビショップやナイト（3点）と意図的に交換して、局面の優位を得るテクニック。',
    detail: '駒の価値では損でも、強力なアウトポストを得たり、相手の守りを崩したりできる。戦略的判断が必要。',
  },

  // ── 詰みのパターン ──────────────────────────────────────────────────────

  backRankMate: {
    id: 'backRankMate', category: 'mate_pattern', detectable: true,
    name: 'バックランクメイト', nameEn: 'Back Rank Mate', icon: '🏦', color: '#3F51B5',
    description: 'キングが自軍のポーン3枚に囲まれて逃げ場を失い、ルークやクイーンに最奥段（1段目/8段目）で詰まされるパターン。',
    detail: '予防策: ポーンを1枚動かして「逃げ道」を作っておく（ルーク昇り）。終盤で最もよく現れる詰みパターンの一つ。',
  },
  smotheredMate: {
    id: 'smotheredMate', category: 'mate_pattern', detectable: true,
    name: 'スモザードメイト（窒息メイト）', nameEn: 'Smothered Mate', icon: '🌀', color: '#009688',
    description: 'キングが自軍の駒に囲まれて逃げ場を失い、ナイトに詰まされるパターン。自分の駒が敵になる！',
    detail: '典型手順: チェックを繰り返してキングを隅に追い込み、自軍の駒で包囲した後にナイトで詰ます。非常に美しい詰み。',
  },
  scholarsMate: {
    id: 'scholarsMate', category: 'mate_pattern', detectable: true,
    name: 'スコラーズメイト（4手詰め）', nameEn: "Scholar's Mate", icon: '📚', color: '#FF8F00',
    description: 'わずか4手で決まる最速詰みパターン。クイーンとビショップがf7（黒ならf2）を狙う。初心者が最も注意すべき攻撃。',
    detail: '白の手順: 1.e4 2.Bc4 3.Qh5 4.Qxf7#。黒がNf6などで守れば防げる。受け方を知ることが重要。',
  },
  foolsMate: {
    id: 'foolsMate', category: 'mate_pattern', detectable: true,
    name: 'フールズメイト（2手詰め）', nameEn: "Fool's Mate", icon: '🤡', color: '#F44336',
    description: 'チェスで最も早い詰みパターン。わずか2手で決まる。白が危険な手を連発すると黒に決められてしまう。',
    detail: '手順: 1.f3 e5 2.g4? Qh4#。白がf列とg列のポーンを動かしキング前の守りを崩すと、クイーンに詰まされる。',
  },
  anastasiasMate: {
    id: 'anastasiasMate', category: 'mate_pattern', detectable: false,
    name: 'アナスタシアメイト', nameEn: "Anastasia's Mate", icon: '🌹', color: '#E91E63',
    description: 'キングがボードの端に追い詰められ、ナイトとルーク（またはクイーン）の組み合わせで詰まされるパターン。',
    detail: 'ナイトがキングの逃げ道を塞ぎ、ルークが水平方向からチェックメイトを決める。端に追い込む手順が重要。',
  },
  arabianMate: {
    id: 'arabianMate', category: 'mate_pattern', detectable: false,
    name: 'アラビアンメイト', nameEn: 'Arabian Mate', icon: '🐪', color: '#FF6F00',
    description: 'ナイトとルークがコンビを組んで、キングをコーナーに詰まされるパターン。中世から知られる古典的な詰み形。',
    detail: 'ナイトがコーナー近くのマスをカバーし、ルークが隣接するランクかファイルからチェックメイトを決める。',
  },
  bodensMAte: {
    id: 'bodensMAte', category: 'mate_pattern', detectable: false,
    name: 'ボーデンメイト', nameEn: "Boden's Mate", icon: '✂️', color: '#7B1FA2',
    description: '2枚のビショップがX字に交差してキングを詰ますパターン。キャスリング後のキングを狙うことが多い。',
    detail: '例: 相手がキャスリングしてキングがa8付近にいるとき、Bxc6でa8-h1対角線を開けてからBa6#など。計算が必要。',
  },
  grecosMate: {
    id: 'grecosMate', category: 'mate_pattern', detectable: false,
    name: 'グレコメイト', nameEn: "Greco's Mate", icon: '🏛️', color: '#455A64',
    description: 'ビショップとナイトあるいは2つのビショップで、キャスリング後のキングをh8（またはh1）近くで詰まするパターン。',
    detail: '17世紀のチェスプレイヤー「グレコ」が多用したとされる詰み。キングサイドキャスリング後の弱点を突く。',
  },
  epauletteMate: {
    id: 'epauletteMate', category: 'mate_pattern', detectable: false,
    name: 'エポレットメイト', nameEn: 'Epaulette Mate', icon: '🎖️', color: '#546E7A',
    description: 'キングの左右両側に自軍の駒があり身動きが取れない状態で、クイーンに正面から詰まされるパターン。',
    detail: '肩章（エポレット）を付けているように見える形から命名。左右の駒が自軍であることが特徴。',
  },
  corridorMate: {
    id: 'corridorMate', category: 'mate_pattern', detectable: false,
    name: 'コリドーメイト（廊下詰め）', nameEn: 'Corridor Mate', icon: '🚪', color: '#37474F',
    description: 'キングが廊下のように狭い空間に追い込まれ、2枚のルーク（またはクイーンとルーク）で詰まされるパターン。',
    detail: 'ルークの「梯子」手順（一方のルークでチェック→キングが逃げる→もう一方でチェック）でキングを追い込む。',
  },

  // ── 戦略概念 ─────────────────────────────────────────────────────────────

  centerControl: {
    id: 'centerControl', category: 'strategy', detectable: false,
    name: 'センターコントロール', nameEn: 'Center Control', icon: '🎯', color: '#1565C0',
    description: '中央の4マス（d4・d5・e4・e5）を支配する戦略的概念。中央を制した側が全体的な主導権を持つ。',
    detail: '中央に置いた駒は多くのマスに影響を与えられる。序盤はe4・d4（またはe5・d5）を確保することが基本原則。',
  },
  openFile: {
    id: 'openFile', category: 'strategy', detectable: false,
    name: 'オープンファイル（開かれたファイル）', nameEn: 'Open File', icon: '📂', color: '#0288D1',
    description: 'どちら側のポーンもないファイル（縦列）。ルークやクイーンが最大限の威力を発揮できる「ハイウェイ」。',
    detail: 'ルークはオープンファイルに配置することが基本。2枚のルークをダブルで並べると特に強力（ダブルルーク）。',
  },
  halfOpenFile: {
    id: 'halfOpenFile', category: 'strategy', detectable: false,
    name: 'ハーフオープンファイル（半開放ファイル）', nameEn: 'Half-Open File', icon: '📁', color: '#0097A7',
    description: '自分のポーンがなく、相手のポーンだけがあるファイル。ルークで相手のポーンを攻撃しやすい列。',
    detail: 'シシリアンディフェンスなどでよく生まれる。黒は多くの場合c列かd列のハーフオープンファイルを活用する。',
  },
  initiative: {
    id: 'initiative', category: 'strategy', detectable: false,
    name: 'イニシアティブ（主導権）', nameEn: 'Initiative', icon: '⚡', color: '#F57F17',
    description: '攻撃し続けて相手を受け身にさせる主導権のこと。イニシアティブを持つ側が手の流れをコントロールできる。',
    detail: 'テンポを失わず連続して脅威を作り出すことで維持できる。チェックや取りを連発して相手に考える余裕を与えない。',
  },
  tempo: {
    id: 'tempo', category: 'strategy', detectable: false,
    name: 'テンポ', nameEn: 'Tempo', icon: '⏱️', color: '#E65100',
    description: '手番の価値のこと。テンポを「得る」とは同じ目的を少ない手数で達成すること。テンポを「失う」とは無駄な手を指すこと。',
    detail: '例: 攻撃される前に攻撃することでテンポを得る。チェックをかけながら駒を展開するとテンポを得られる。',
  },
  zugzwang: {
    id: 'zugzwang', category: 'strategy', detectable: false,
    name: 'ツークツワング', nameEn: 'Zugzwang', icon: '😰', color: '#6A1B9A',
    description: '手番が回ってくると必ず局面が悪化してしまう状態。「動かない方が良いが、チェスでは必ず指さなければならない」という窮地。',
    detail: 'ドイツ語で「指す強制」の意味。主にエンドゲームで発生。王のエンドゲームやポーンのエンドゲームで重要な概念。',
  },
  space: {
    id: 'space', category: 'strategy', detectable: false,
    name: 'スペース（空間）', nameEn: 'Space', icon: '🌌', color: '#1A237E',
    description: '自駒が支配しているマスの数。スペースが広いと駒の移動の自由度が高く、攻撃の選択肢も多くなる。',
    detail: 'スペースを広げるためにポーンを前進させるのが一般的だが、過度の前進はポーンを弱くする危険もある。',
  },
  kingSafety: {
    id: 'kingSafety', category: 'strategy', detectable: false,
    name: 'キングの安全', nameEn: 'King Safety', icon: '🛡️', color: '#1B5E20',
    description: 'キングを攻撃から守ることはチェスで最も重要な戦略的目標の一つ。早期のキャスリングが基本。',
    detail: 'キング周りのポーン（f, g, h列）を不用意に動かさない。相手がキャスリングしていない場合は中央に攻撃を集中させる。',
  },
  pieceActivity: {
    id: 'pieceActivity', category: 'strategy', detectable: false,
    name: 'ピースアクティビティ（駒の活性化）', nameEn: 'Piece Activity', icon: '🔥', color: '#BF360C',
    description: '各駒が最大の力を発揮できる位置に配置すること。隅に追いやられた駒は価値が著しく下がる。',
    detail: 'ナイトは中央（d4・e4・d5・e5付近）が最強。ビショップは長い対角線が生きる場所に。ルークはオープンファイルへ。',
  },
  bishopPair: {
    id: 'bishopPair', category: 'strategy', detectable: false,
    name: 'ビショップペア', nameEn: 'Bishop Pair', icon: '⛪', color: '#33691E',
    description: '2枚のビショップを持つ優位のこと。異なる色のマスを2枚でカバーでき、開いた局面では特に強力。',
    detail: 'ビショップペアはオープンゲームや閉じた局面が開いたとき（エンドゲーム）に真価を発揮する。ナイト2枚より有利なことが多い。',
  },
  knightOutpost: {
    id: 'knightOutpost', category: 'strategy', detectable: false,
    name: 'ナイトのアウトポスト（前線基地）', nameEn: 'Knight Outpost', icon: '♞', color: '#558B2F',
    description: '相手のポーンに取られる心配がない安全な前線のマスにナイトを配置すること。非常に強力な拠点になる。',
    detail: 'ポーンに取られないマス（相手のポーンが攻撃できないマス）にナイトを置くと、相手は追い払う手段がない。d5・e5などが典型的なアウトポスト。',
  },
  rookSeventh: {
    id: 'rookSeventh', category: 'strategy', detectable: false,
    name: 'ルークの第7列侵入', nameEn: 'Rook on the 7th Rank', icon: '🏄', color: '#00695C',
    description: '白なら7段目、黒なら2段目にルークを侵入させること。相手のポーンを横から攻撃し、キングを押し込む強力な手。',
    detail: '第7列のルークは相手のキングを最奥段に閉じ込めバックランクメイトの脅威を作る。「悪魔のルーク」とも呼ばれる。',
  },

  // ── ポーンの概念 ─────────────────────────────────────────────────────────

  passPawn: {
    id: 'passPawn', category: 'pawn', detectable: false,
    name: 'パスポーン（通過ポーン）', nameEn: 'Passed Pawn', icon: '🏃', color: '#F9A825',
    description: '相手のポーンに阻まれることなくプロモーションへ向かえるポーン。エンドゲームでは非常に価値が高い。',
    detail: 'パスポーンは「遠隔パスポーン」として相手のキングや駒をひきつけ、別の場所で優位を作るのにも使える。',
  },
  doubledPawns: {
    id: 'doubledPawns', category: 'pawn', detectable: false,
    name: 'ダブルポーン（重複ポーン）', nameEn: 'Doubled Pawns', icon: '📏', color: '#F57F17',
    description: '同じファイルに2枚のポーンが縦に並んだ状態。通常は弱点になるが、オープンファイルを作るメリットもある。',
    detail: '前のポーンしか前進できず、お互いを守り合えない。しかし敢えてダブルポーンを作って相手のビショップを消す場合もある。',
  },
  isolatedPawn: {
    id: 'isolatedPawn', category: 'pawn', detectable: false,
    name: 'アイソレイテッドポーン（孤立ポーン）', nameEn: 'Isolated Pawn', icon: '🏝️', color: '#EF6C00',
    description: '両隣のファイルにポーンがなく孤立しているポーン。他のポーンで守れないため弱点になりやすい。',
    detail: '典型的なのは「孤立d5ポーン（IQP）」。弱点だが、中央支配と動的なプレイを可能にするトレードオフがある。',
  },
  backwardPawn: {
    id: 'backwardPawn', category: 'pawn', detectable: false,
    name: 'バックワードポーン（後退ポーン）', nameEn: 'Backward Pawn', icon: '⬅️', color: '#D84315',
    description: '隣のポーンより後ろにあり、前進しても取られてしまうポーン。ポーンの弱点の一つ。',
    detail: 'バックワードポーンは前に進めず、後ろに引けない「釘付け」状態。特に半開放ファイルにあるとルークに狙われやすい。',
  },
  pawnChain: {
    id: 'pawnChain', category: 'pawn', detectable: false,
    name: 'ポーンチェーン（ポーン連鎖）', nameEn: 'Pawn Chain', icon: '⛓️', color: '#AD1457',
    description: '対角線上に連なるポーンの列。互いに守り合う強固な構造だが、チェーンの付け根（最後尾のポーン）が弱点。',
    detail: 'フランスディフェンスなどで典型的に現れる。「チェーンの付け根を攻撃せよ」はNimzovichの有名な格言。',
  },
  pawnMajority: {
    id: 'pawnMajority', category: 'pawn', detectable: false,
    name: 'ポーンマジョリティ（ポーン多数）', nameEn: 'Pawn Majority', icon: '👥', color: '#880E4F',
    description: 'ボードのある側面で相手より多くのポーンを持つこと。エンドゲームでパスポーンを作りやすくなる重要な優位。',
    detail: 'クイーンサイドのポーンマジョリティはエンドゲームで特に重要。相手キングが届かないパスポーンを作れる。',
  },
};

// カテゴリ順序定義
export const CATEGORY_ORDER = ['special', 'basic', 'tactics', 'mate_pattern', 'strategy', 'pawn'];

export const CATEGORY_LABELS = {
  special:      '特殊ルール',
  basic:        '基本概念',
  tactics:      '戦術手筋',
  mate_pattern: '詰みのパターン',
  strategy:     '戦略概念',
  pawn:         'ポーンの概念',
};
