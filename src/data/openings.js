// チェスオープニングデータベース
// moves: SANの手順配列（白・黒・白・黒…の順）
// detectOpening.js で「最長前方一致」により現在の定跡名を判定する

export const OPENINGS = [
  // ── 1手目の定跡（最初の1手で即座に表示） ─────────────────────────────
  {
    eco: 'B00', name: 'e4 オープニング', nameEn: "King's Pawn Opening",
    moves: ['e4'],
    description: 'チェスで最も人気の初手。中央を占領しビショップとクイーンの道を開ける。',
  },
  {
    eco: 'A40', name: 'd4 オープニング', nameEn: "Queen's Pawn Opening",
    moves: ['d4'],
    description: 'クローズドゲームの出発点。中央を占領し堅実な展開を目指す。',
  },
  // ── フランク・オープニング（1.Nf3 / 1.c4 / etc.） ──────────────────────
  {
    eco: 'A01', name: 'ニムゾ・ラーセン・アタック', nameEn: "Nimzo-Larsen Attack",
    moves: ['b3'],
    description: '1.b3でビショップをb2に展開しニムゾウィッチとラーセンが愛用した変則的な出だし。',
  },
  {
    eco: 'A04', name: 'レティ・オープニング', nameEn: "Réti Opening",
    moves: ['Nf3'],
    description: '中央のポーン前進を急がず、ナイトから始めるハイパーモダン系の代表的開幕手。',
  },
  {
    eco: 'A05', name: 'レティ・オープニング キングズ・インディアン配置', nameEn: "King's Indian Attack",
    moves: ['Nf3', 'Nf6'],
    description: '双方がナイトを展開する柔軟な出だし。様々な変化に転換できる。',
  },
  {
    eco: 'A10', name: 'イングリッシュ・オープニング', nameEn: "English Opening",
    moves: ['c4'],
    description: '1.c4でクイーンサイドの空間を確保するハイパーモダン系開幕手。',
  },
  {
    eco: 'A20', name: 'イングリッシュ・オープニング（シシリアン転置）', nameEn: "English Opening: King's English",
    moves: ['c4', 'e5'],
    description: 'イングリッシュに対して黒がe5と応じる変化。シシリアンの色違い。',
  },
  {
    eco: 'A30', name: 'イングリッシュ・オープニング シンメトリカル変化', nameEn: "English: Symmetrical Variation",
    moves: ['c4', 'c5'],
    description: '黒も同じくc5と応じて対称形を作る変化。均衡的な展開が続く。',
  },
  // ── d4 + Nf6系 ──────────────────────────────────────────────────────────
  {
    eco: 'A45', name: 'トロンポスキー・アタック', nameEn: "Trompowsky Attack",
    moves: ['d4', 'Nf6', 'Bg5'],
    description: '黒のナイトにすぐビショップを当てる奇襲系戦法。序盤から主導権を握りに行く。',
  },
  {
    eco: 'A51', name: 'ブダペスト・ギャンビット', nameEn: "Budapest Gambit",
    moves: ['d4', 'Nf6', 'c4', 'e5'],
    description: '黒がe5のポーンを犠牲にして積極的に反撃を狙うギャンビット。',
  },
  {
    eco: 'A57', name: 'ベンコ・ギャンビット', nameEn: "Benko Gambit",
    moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'],
    description: 'クイーンサイドでのポーン犠牲により長期的に圧力をかける現代的ギャンビット。',
  },
  {
    eco: 'A60', name: 'ベノニ・ディフェンス', nameEn: "Benoni Defense",
    moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6'],
    description: '黒がe6からd5のポーンに挑戦し、ダイナミックな反撃を目指す変化。',
  },
  {
    eco: 'A80', name: 'ダッチ・ディフェンス', nameEn: "Dutch Defense",
    moves: ['d4', 'f5'],
    description: '黒がf5でキングサイドを展開する積極的な変化。攻撃的スタイルに向く。',
  },
  // ── d4 + d5系 ──────────────────────────────────────────────────────────
  {
    eco: 'D00', name: 'クイーンズ・ポーン・ゲーム', nameEn: "Queen's Pawn Game",
    moves: ['d4', 'd5'],
    description: 'お互いにd4・d5と中央を占拠する、クローズドゲームの出発点。',
  },
  {
    eco: 'D02', name: 'ロンドン・システム', nameEn: "London System",
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
    description: 'Bf4でビショップを早期に展開する堅実なシステム。初心者〜上級者まで人気。',
  },
  {
    eco: 'D04', name: 'コル・システム', nameEn: "Colle System",
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'e3'],
    description: 'e3でビショップの道を開けつつ中央を固める堅実な組み立て方。',
  },
  {
    eco: 'D06', name: 'クイーンズ・ギャンビット', nameEn: "Queen's Gambit",
    moves: ['d4', 'd5', 'c4'],
    description: '白がc4のポーンを提供し中央制圧を狙う歴史ある序盤。実は「偽ギャンビット」で簡単には取れない。',
  },
  {
    eco: 'D10', name: 'スラブ・ディフェンス', nameEn: "Slav Defense",
    moves: ['d4', 'd5', 'c4', 'c6'],
    description: '黒がc6でd5を支える堅実な守り方。ポーンを取られずに中央を維持できる。',
  },
  {
    eco: 'D20', name: 'クイーンズ・ギャンビット・アクセプテッド', nameEn: "Queen's Gambit Accepted",
    moves: ['d4', 'd5', 'c4', 'dxc4'],
    description: '黒がポーンを取ってギャンビットを受け入れる変化。後でポーンを返し均等化を図る。',
  },
  {
    eco: 'D30', name: 'クイーンズ・ギャンビット・デクラインド', nameEn: "Queen's Gambit Declined",
    moves: ['d4', 'd5', 'c4', 'e6'],
    description: '黒がe6でd5を支えてギャンビットを断る変化。堅実だが少しスペースが狭い。',
  },
  {
    eco: 'D32', name: 'タラッシュ変化', nameEn: "Tarrasch Defense",
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5'],
    description: '黒がc5で中央に挑戦し活発な展開を目指すタラッシュ博士考案の変化。',
  },
  {
    eco: 'D43', name: 'セミ・スラブ変化', nameEn: "Semi-Slav Defense",
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'c6'],
    description: 'クイーンズ・ギャンビット・デクラインドとスラブの要素を合わせた複雑な変化。',
  },
  {
    eco: 'D50', name: 'クイーンズ・ギャンビット・デクラインド Bg5変化', nameEn: "QGD with Bg5",
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'],
    description: '白がBg5で黒のナイトにプレッシャーをかける古典的な変化。',
  },
  // ── d4 + Nf6 + c4 + g6/e6系 ─────────────────────────────────────────────
  {
    eco: 'E00', name: 'カタラン・オープニング', nameEn: "Catalan Opening",
    moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'],
    description: 'g3でビショップをg2にフィアンケットし長距離からd5に圧力をかける現代的開幕。',
  },
  {
    eco: 'E15', name: 'クイーンズ・インディアン・ディフェンス', nameEn: "Queen's Indian Defense",
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'],
    description: 'b6でビショップをb7にフィアンケットし長対角線をコントロールする変化。',
  },
  {
    eco: 'E20', name: 'ニムゾ・インディアン・ディフェンス', nameEn: "Nimzo-Indian Defense",
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    description: 'ニムゾウィッチ考案。Bb4でナイトをピンし白のポーンセンターを崩す積極的変化。',
  },
  {
    eco: 'D80', name: 'グリュンフェルト・ディフェンス', nameEn: "Grünfeld Defense",
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    description: '黒がd5でポーンセンターを挑戦。白センターを攻撃することで反撃するハイパーモダン戦法。',
  },
  {
    eco: 'E60', name: 'キングズ・インディアン・ディフェンス', nameEn: "King's Indian Defense",
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
    description: '黒がg6・Bg7でフィアンケットし白の大きなセンターを後から崩す現代的戦法。',
  },
  // ── e4 + (c6, c5, e6, d5, Nf6, d6, g6系) ────────────────────────────────
  {
    eco: 'B01', name: 'スカンジナビアン・ディフェンス', nameEn: "Scandinavian Defense",
    moves: ['e4', 'd5'],
    description: '黒がすぐd5で中央に挑戦する変化。初手からポーンを交換し積極的に応戦する。',
  },
  {
    eco: 'B02', name: 'アレヒン・ディフェンス', nameEn: "Alekhine's Defense",
    moves: ['e4', 'Nf6'],
    description: '黒がナイトを前に出して白のe4を前進させ、後から攻撃する挑発的な変化。',
  },
  {
    eco: 'B06', name: 'モダン・ディフェンス', nameEn: "Modern Defense",
    moves: ['e4', 'g6'],
    description: '黒がg6でビショップをg7にフィアンケットし柔軟に対応するハイパーモダン変化。',
  },
  {
    eco: 'B07', name: 'ピルツ・ディフェンス', nameEn: "Pirc Defense",
    moves: ['e4', 'd6', 'd4', 'Nf6'],
    description: 'モダン変化に似て黒がg6・Bg7・Nf6で組み立てる柔軟性の高い変化。',
  },
  {
    eco: 'B10', name: 'カロ・カン・ディフェンス', nameEn: "Caro-Kann Defense",
    moves: ['e4', 'c6'],
    description: '黒がc6でd5を準備する堅実な変化。ポーン構造を乱さずに中央に対応する。',
  },
  {
    eco: 'B13', name: 'カロ・カン 交換変化', nameEn: "Caro-Kann: Exchange Variation",
    moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5'],
    description: 'ポーンを交換してオープンなゲームになる変化。双方均等なポーン構造。',
  },
  {
    eco: 'B15', name: 'カロ・カン クラシカル変化', nameEn: "Caro-Kann: Classical Variation",
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'Nf6'],
    description: '黒がNf6でナイトを展開する伝統的な変化。堅固な守りを構築する。',
  },
  {
    eco: 'B20', name: 'シシリアン・ディフェンス', nameEn: "Sicilian Defense",
    moves: ['e4', 'c5'],
    description: 'チェスで最も人気の序盤。黒が非対称な応手を取ることで独自の反撃機会を作る。',
  },
  {
    eco: 'B23', name: 'シシリアン グランプリ・アタック', nameEn: "Sicilian: Grand Prix Attack",
    moves: ['e4', 'c5', 'Nc3'],
    description: '白がNc3で早期からf4を準備しキングサイドを攻める積極的な変化。',
  },
  {
    eco: 'B40', name: 'シシリアン オープン変化', nameEn: "Sicilian: Open Variation",
    moves: ['e4', 'c5', 'Nf3'],
    description: '白がNf3でd4準備する最も標準的なシシリアン応手。多くの変化に分岐する。',
  },
  {
    eco: 'B41', name: 'シシリアン カン変化', nameEn: "Sicilian: Kan Variation",
    moves: ['e4', 'c5', 'Nf3', 'e6'],
    description: '黒がe6で柔軟性を保つ変化。多くの変化形への転換が可能。',
  },
  {
    eco: 'B54', name: 'シシリアン d6 変化', nameEn: "Sicilian: ...d6 lines",
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
    description: 'シシリアンの中心的な変化で、黒がd6と応じた後に多くの変化に分岐する。',
  },
  {
    eco: 'B70', name: 'シシリアン ドラゴン変化', nameEn: "Sicilian: Dragon Variation",
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
    description: 'g6でビショップをg7に展開し強力な「ドラゴンの牙」を作る攻撃的変化。',
  },
  {
    eco: 'B80', name: 'シシリアン シェフェニング変化', nameEn: "Sicilian: Scheveningen Variation",
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'],
    description: 'e6でビショップの道を開け堅固な小センターを築く変化。カスパロフが愛用した。',
  },
  {
    eco: 'B90', name: 'シシリアン ナジョドフ変化', nameEn: "Sicilian: Najdorf Variation",
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    description: 'a6でビショップ進出を防ぐナジョドフ考案の変化。フィッシャーやカスパロフの十八番。',
  },
  // ── フレンチ・ディフェンス ─────────────────────────────────────────────
  {
    eco: 'C00', name: 'フレンチ・ディフェンス', nameEn: "French Defense",
    moves: ['e4', 'e6'],
    description: '黒がe6で中央を準備する堅実な変化。若干スペースは狭いが堅固な構造を持つ。',
  },
  {
    eco: 'C01', name: 'フレンチ 交換変化', nameEn: "French: Exchange Variation",
    moves: ['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5'],
    description: 'ポーンを交換してフラットなゲームになる変化。ドローになりやすい。',
  },
  {
    eco: 'C06', name: 'フレンチ タラッシュ変化', nameEn: "French: Tarrasch Variation",
    moves: ['e4', 'e6', 'd4', 'd5', 'Nd2'],
    description: 'Nd2でナイトを展開し白がc3を防いだ変化。やや消極的だが堅実。',
  },
  {
    eco: 'C11', name: 'フレンチ クラシカル変化', nameEn: "French: Classical Variation",
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    description: '白がNc3で中央を支え、黒がNf6でナイトを展開する標準的なフレンチ変化。',
  },
  {
    eco: 'C15', name: 'フレンチ ウィノーワー変化', nameEn: "French: Winawer Variation",
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'],
    description: '黒がBb4でナイトをピンする積極的変化。複雑で計算力が問われる。',
  },
  // ── e4 e5 系 ────────────────────────────────────────────────────────────
  {
    eco: 'C20', name: 'キングズ・ポーン・ゲーム', nameEn: "King's Pawn Game",
    moves: ['e4', 'e5'],
    description: '白e4・黒e5のオープンゲーム。チェス最古の序盤形で多くの変化に分岐する。',
  },
  {
    eco: 'C21', name: 'センター・ゲーム', nameEn: "Center Game",
    moves: ['e4', 'e5', 'd4'],
    description: 'すぐd4で中央を爆発させる変化。しかしクイーンが早期に中央に出て攻撃を受けやすい。',
  },
  {
    eco: 'C23', name: 'ビショップズ・オープニング', nameEn: "Bishop's Opening",
    moves: ['e4', 'e5', 'Bc4'],
    description: 'ナイトより先にビショップを展開する変化。イタリアンやトゥー・ナイツに転換できる。',
  },
  {
    eco: 'C24', name: 'ビショップズ・オープニング ベルリン変化', nameEn: "Bishop's Opening: Berlin Defense",
    moves: ['e4', 'e5', 'Bc4', 'Nf6'],
    description: '黒がNf6でe4に反撃する変化。ビショップズ・オープニングへの最も積極的な応手。',
  },
  {
    eco: 'C30', name: 'キングズ・ギャンビット', nameEn: "King's Gambit",
    moves: ['e4', 'e5', 'f4'],
    description: 'f4のポーンを犠牲に中央展開を急ぐロマンチックな戦法。19世紀に大人気だった。',
  },
  {
    eco: 'C33', name: 'キングズ・ギャンビット・アクセプテッド', nameEn: "King's Gambit Accepted",
    moves: ['e4', 'e5', 'f4', 'exf4'],
    description: '黒がポーンを取ってギャンビットを受け入れた変化。白は中央とピースで補償を求める。',
  },
  {
    eco: 'C36', name: 'キングズ・ギャンビット・アクセプテッド 現代変化', nameEn: "King's Gambit Accepted: Modern Defense",
    moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3'],
    description: 'Nf3でナイトを展開しつつd4を準備する現代的な運用法。',
  },
  {
    eco: 'C40', name: 'ペトロフ・ディフェンス', nameEn: "Petrov's Defense (Russian Game)",
    moves: ['e4', 'e5', 'Nf3', 'Nf6'],
    description: '黒も対称にNf6と応じる変化。均等でドロー傾向が強い。プロ間で人気。',
  },
  {
    eco: 'C41', name: 'フィリドール・ディフェンス', nameEn: "Philidor Defense",
    moves: ['e4', 'e5', 'Nf3', 'd6'],
    description: '伝説の棋士フィリドールが推奨した守備的変化。現代では黒が少しパッシブと見られる。',
  },
  {
    eco: 'C44', name: 'ポンツィアーニ・オープニング', nameEn: "Ponziani Opening",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'],
    description: '早期にc3でd4を準備する変化。正確に応じれば黒は均等が取れる。',
  },
  {
    eco: 'C45', name: 'スコッチ・ゲーム', nameEn: "Scotch Game",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    description: '早期d4で中央を爆発させ戦いを挑む変化。ガルリ・カスパロフが現役中に復活させた。',
  },
  {
    eco: 'C46', name: 'スリー・ナイツ・ゲーム', nameEn: "Three Knights Game",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3'],
    description: '双方合計3つのナイトが展開された局面。フォー・ナイツへの前哨。',
  },
  {
    eco: 'C47', name: 'フォー・ナイツ・ゲーム', nameEn: "Four Knights Game",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'],
    description: '双方合計4つのナイトが展開。均等で堅実な局面が続く古典的な変化。',
  },
  {
    eco: 'C50', name: 'イタリアン・ゲーム', nameEn: "Italian Game",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'ビショップをc4（イタリアの斜め）に展開する古典中の古典。f7への攻撃を狙う。',
  },
  {
    eco: 'C54', name: 'ジュオコ・ピアノ', nameEn: "Giuoco Piano",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    description: 'イタリア語で「静かなゲーム」。双方が相手の斜めに向けてビショップを展開する。',
  },
  {
    eco: 'C55', name: 'トゥー・ナイツ・ディフェンス', nameEn: "Two Knights Defense",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    description: '黒がNf6でe4に反撃。白のBc4が対角上のf7を狙っている緊張した局面。',
  },
  {
    eco: 'C57', name: 'フライド・リバー・アタック', nameEn: "Fried Liver Attack",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'],
    description: 'Ng5でf7に直接圧力をかける超積極的奇襲。f7のポーンを「揚げる」ことが名前の由来。',
  },
  {
    eco: 'C60', name: 'スペイン・ゲーム（ルイ・ロペス）', nameEn: "Spanish Game (Ruy López)",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    description: '最古かつ最も深く研究された序盤の一つ。白がBb5でe5を間接的に攻撃する。',
  },
  {
    eco: 'C64', name: 'スペイン・ゲーム クラシカル変化', nameEn: "Spanish: Classical Variation",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Bc5'],
    description: '黒がBc5で対抗。古典的な変化でバランスの取れた展開が続く。',
  },
  {
    eco: 'C65', name: 'スペイン・ゲーム ベルリン変化', nameEn: "Spanish: Berlin Defense",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
    description: '別名「ベルリンの壁」。現代トッププロが好む堅固な守りでドロー要塞として名高い。',
  },
  {
    eco: 'C70', name: 'スペイン・ゲーム モーフィー変化', nameEn: "Spanish: Morphy Defense",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    description: 'a6でビショップの進路を遮断。最も一般的なスペイン変化でここから膨大な理論がある。',
  },
  {
    eco: 'C68', name: 'スペイン・ゲーム 交換変化', nameEn: "Spanish: Exchange Variation",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'],
    description: '白がBxc6でナイトを取りポーン構造を分断する変化。黒の双ビショップが補償になる。',
  },
  {
    eco: 'C78', name: 'スペイン モーフィー変化 アーリーキャスリング', nameEn: "Spanish: Moller Defense",
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'],
    description: 'バ4に引いた後キャスリングするクローズドスペインへの前哨。主流のルイ・ロペス展開。',
  },
];
