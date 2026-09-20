// ============================================================
// Lesson data for the interactive tutorial.
// Seats: 0 = You, 1 = Ava, 2 = Bruno, 3 = Chen. Blinds 10/20, stacks 1000.
// With dealerIdx d: small blind d+1, big blind d+2, first to act preflop d+3.
// ============================================================

const RANKS = [
  { label: 'Royal Flush', cards: 'As Ks Qs Js 10s' },
  { label: 'Straight Flush', cards: '9h 8h 7h 6h 5h' },
  { label: 'Four of a Kind', cards: 'Qs Qh Qd Qc 3s' },
  { label: 'Full House', cards: 'Js Jh Jd 8c 8s' },
  { label: 'Flush', cards: 'Kc 10c 7c 4c 2c' },
  { label: 'Straight', cards: '9c 8d 7s 6h 5c' },
  { label: 'Three of a Kind', cards: '7s 7h 7d Ks 2c' },
  { label: 'Two Pair', cards: 'As Ad 9h 9c 4s' },
  { label: 'Pair', cards: 'Ks Kd 10h 6c 3s' },
  { label: 'High Card', cards: 'Ah Jd 8s 5c 2h' },
];

export const LESSONS = [
  // ---------------------------------------------------------------- 1
  {
    id: 'hand-rankings',
    title: 'Hand Rankings',
    blurb: 'Learn which five-card hands beat which.',
    steps: [
      { type: 'say', text: 'Welcome to Poker School! In Texas Hold\'em you make the <strong>best five-card hand</strong> from your two hole cards plus five shared community cards. First, let\'s learn what beats what.' },
      { type: 'showCards', text: 'The rarest hands are the strongest. A <strong>Royal Flush</strong> (A-K-Q-J-10 of one suit) is unbeatable. A <strong>Straight Flush</strong> is five in a row of one suit. <strong>Four of a Kind</strong> is four cards of the same rank.', groups: RANKS.slice(0, 3) },
      { type: 'showCards', text: 'A <strong>Full House</strong> is three of a kind plus a pair. A <strong>Flush</strong> is any five cards of one suit. A <strong>Straight</strong> is five in a row of mixed suits.', groups: RANKS.slice(3, 6) },
      { type: 'showCards', text: 'Then the common ones: <strong>Three of a Kind</strong>, <strong>Two Pair</strong>, a single <strong>Pair</strong>, and finally <strong>High Card</strong> when nothing connects. Ties are broken by the highest cards involved.', groups: RANKS.slice(6, 10) },
      {
        type: 'quiz',
        prompt: 'Quick check: which hand is stronger?',
        groups: [{ label: 'A', cards: 'Ks 9s 7s 4s 2s' }, { label: 'B', cards: '5h 6c 7d 8s 9h' }],
        choices: ['A — the Flush', 'B — the Straight'],
        answer: 0,
        explain: 'Right! A flush beats a straight. Flushes are rarer, so they rank higher.',
        wrongText: 'Straights are more common than flushes, so the flush wins.',
      },
      {
        type: 'quiz',
        prompt: 'And now?',
        groups: [{ label: 'A', cards: 'Qs Qh 8d 8c Ks' }, { label: 'B', cards: '4s 4h 4d Ac 9s' }],
        choices: ['A — Two Pair, Queens and Eights', 'B — Three Fours'],
        answer: 1,
        explain: 'Correct. Any three of a kind beats any two pair, even lowly fours.',
        wrongText: 'Three of a kind always beats two pair, no matter the ranks.',
      },
      {
        type: 'quiz',
        prompt: 'Last one — which is stronger?',
        groups: [{ label: 'A', cards: 'Ah Kh 9h 6h 3h' }, { label: 'B', cards: '2s 2h 2d 5c 5s' }],
        choices: ['A — Ace-high Flush', 'B — Full House, Twos full of Fives'],
        answer: 1,
        explain: 'Yes! A full house beats a flush. The tiny ranks don\'t matter — the category does.',
        wrongText: 'Even the smallest full house beats the biggest flush.',
      },
      { type: 'endLesson', text: '🎉 You know the rankings. Tip: the <strong>ℹ help button</strong> always shows this chart if you need a reminder.' },
    ],
  },

  // ---------------------------------------------------------------- 2
  {
    id: 'reading-the-board',
    title: 'Reading the Board',
    blurb: 'Combine your hole cards with the community cards.',
    steps: [
      { type: 'say', text: 'Your hand is your two hole cards <strong>plus</strong> the five community cards — the best five of those seven count. Let\'s deal a hand and check to the river so you can practise reading the board.' },
      { type: 'botScript', default: 'check-call' },
      { type: 'rigDeck', dealerIdx: 1, holes: { 0: 'Ah 9d' }, board: 'As 9c Kh 4d 2s' },
      { type: 'highlight', target: 'human-cards', text: 'You hold <strong>A♥ 9♦</strong>. Nothing yet — a hand only forms once the community cards come.' },
      { type: 'awaitAction', text: 'You act first. Just <strong>call</strong> the big blind to see the flop.', allow: ['call', 'fold', 'raise'], accept: ['call'], onWrong: 'For this lesson just call so we can see the board.' },
      { type: 'awaitStreet', street: 'flop', text: 'The others call along…' },
      { type: 'highlight', target: 'community', text: 'The <strong>flop</strong>: three community cards at once. Your A♥ pairs the A♠ and your 9♦ pairs the 9♣ — <strong>two pair</strong>. Watch the hint under the table: it always tells you your current hand.' },
      { type: 'awaitStreet', street: 'river', text: 'Check (or call) through to the river.' },
      {
        type: 'quiz',
        prompt: 'The board is complete. What is your best five-card hand?',
        choices: ['Pair of Aces', 'Two Pair, Aces and Nines', 'Three Aces'],
        answer: 1,
        explain: 'Exactly. A-A from your ace, 9-9 from your nine, and the King is your kicker.',
        wrongText: 'Look at both hole cards: each one pairs a board card.',
      },
      { type: 'awaitHandOver', text: 'Check to finish the hand and see the showdown.' },
      { type: 'say', text: 'Now a trickier one. You don\'t need to use both hole cards — sometimes one card (or none!) makes your best hand.' },
      { type: 'rigDeck', dealerIdx: 1, holes: { 0: 'Qc Jd' }, board: 'Qs Qh 7d 7c 2s' },
      { type: 'awaitAction', text: 'Call again to see the board.', accept: ['call'], onWrong: 'Just call for now.' },
      { type: 'awaitStreet', street: 'river', text: 'Check along to the river…' },
      {
        type: 'quiz',
        prompt: 'Board: Q♠ Q♥ 7♦ 7♣ 2♠ with your Q♣ J♦. What do you have?',
        choices: ['Two Pair, Queens and Sevens', 'Full House, Queens full of Sevens', 'Three Queens'],
        answer: 1,
        explain: 'Your Q♣ gives you three Queens, and the board\'s pair of Sevens completes a full house. Your Jack isn\'t used at all.',
        wrongText: 'Count the Queens (three!) and remember the pair of Sevens on the board.',
      },
      { type: 'awaitHandOver', text: 'Finish the hand.' },
      {
        type: 'quiz',
        prompt: 'One more idea: if the community cards are <strong>A♠ K♠ Q♠ J♠ 10♠</strong> — a royal flush on the board — who wins?',
        choices: ['The player with the highest hole card', 'Everyone still in splits the pot', 'The dealer'],
        answer: 1,
        explain: 'When the board itself is the best hand, every remaining player has the same hand and the pot is split. We say "the board plays".',
        wrongText: 'Everyone can use all five community cards, so everyone has the royal flush.',
      },
      { type: 'endLesson', text: 'You can read the board! Next: the blinds, the button and why position matters.' },
    ],
  },

  // ---------------------------------------------------------------- 3
  {
    id: 'position',
    title: 'Blinds, Button & Position',
    blurb: 'Who bets first, who bets last, and why it matters.',
    steps: [
      { type: 'botScript', default: 'check-call', seats: { 3: ['fold'] } },
      { type: 'rigDeck', dealerIdx: 0, holes: { 0: 'Ad Kd' } },
      { type: 'highlight', target: 'dealer-btn', text: 'The white <strong>D</strong> is the dealer button. It moves one seat clockwise every hand, so everyone takes turns in each position.' },
      { type: 'highlight', target: 'sb', text: 'The player left of the button posts the <strong>small blind</strong> (10 chips) before seeing any cards…' },
      { type: 'highlight', target: 'bb', text: '…and the next player posts the <strong>big blind</strong> (20). The blinds guarantee there is always something to fight for.' },
      {
        type: 'quiz',
        prompt: 'Before the flop, action starts with the player left of the big blind. Who acts first this hand?',
        choices: ['Ava', 'Bruno', 'Chen', 'You'],
        answer: 2,
        explain: 'Chen is first, then you (the dealer) act last preflop.',
        wrongText: 'Find the big blind, then move one seat clockwise.',
      },
      {
        type: 'quiz',
        prompt: 'After the flop, the first active player left of the dealer acts first. Who is that here?',
        choices: ['Ava', 'Bruno', 'Chen', 'You'],
        answer: 0,
        explain: 'Ava, the small blind. On every street after the flop, the dealer acts <strong>last</strong> — a big advantage, because you see what everyone else does first.',
        wrongText: 'Look at the seat immediately clockwise from the button.',
      },
      { type: 'awaitTurn', text: 'Chen acts first…' },
      { type: 'awaitAction', text: 'Chen folded. You hold A♦ K♦ on the button with position on everyone. <strong>Call or raise</strong> — both are fine with a hand this strong.', accept: ['call', 'raise'], onWrong: 'Ace-King suited is far too strong to fold!' },
      { type: 'awaitHandOver', text: 'Play out the hand. Notice you always act after Ava and Bruno on each street.' },
      { type: 'endLesson', text: 'Position matters: play more hands when you\'re on or near the button, fewer when you\'re first to act.' },
    ],
  },

  // ---------------------------------------------------------------- 4
  {
    id: 'betting-actions',
    title: 'Betting Actions',
    blurb: 'Fold, check, call and raise — and when to use each.',
    steps: [
      { type: 'botScript', default: 'fold' },
      { type: 'rigDeck', dealerIdx: 1, holes: { 0: 'As Ad' } },
      { type: 'highlight', target: 'human-cards', text: 'Pocket Aces — the best starting hand in poker! You\'re first to act. Let\'s look at your options.' },
      { type: 'highlight', target: 'btn-fold', text: '<strong>Fold</strong> throws your hand away. You lose anything you\'ve already put in, but risk nothing more.' },
      { type: 'highlight', target: 'btn-check-call', text: '<strong>Call</strong> matches the current bet (here the 20 big blind). When nobody has bet, this button becomes <strong>Check</strong>: pass without betting.' },
      { type: 'highlight', target: 'btn-raise', text: '<strong>Raise</strong> increases the bet. Use the presets (Min, ½ Pot, Pot, All-in) or the slider to pick a size. A typical opening raise is about 3 big blinds.' },
      { type: 'awaitAction', text: 'With Aces you want to build a pot. <strong>Raise!</strong>', accept: [{ type: 'raise' }], onWrong: 'You have the best possible hand — don\'t fold or just call. Raise to build the pot.', onRight: 'Perfect. A raise charges opponents to continue and often wins the pot outright.' },
      { type: 'awaitHandOver', text: 'Watch what the others do…' },
      { type: 'endLesson', text: 'Everyone folded and you won the blinds. Raising strong hands wins pots two ways: opponents fold, or they pay you to see more cards.' },
    ],
  },

  // ---------------------------------------------------------------- 5
  {
    id: 'when-to-fold',
    title: 'When to Fold',
    blurb: 'Starting-hand selection: the cheapest chips you\'ll ever save.',
    steps: [
      { type: 'say', text: 'Most hands you\'re dealt are <strong>not</strong> worth playing. Folding weak hands early is how good players stay ahead.' },
      { type: 'botScript', default: 'check-call', seats: { 1: [{ raise: 60 }], 2: ['fold'], 3: ['fold'] } },
      { type: 'rigDeck', dealerIdx: 2, holes: { 0: '7c 2d' } },
      { type: 'awaitTurn', text: 'You\'re in the big blind. Ava raises to 60…' },
      { type: 'awaitAction', text: 'You hold <strong>7♣ 2♦</strong> — famously the worst hand in poker: low, unconnected, unsuited. Ava raised to 60. What now?', accept: ['fold'], onWrong: 'Calling 40 more with 7-2 offsuit is throwing chips away. Fold.', onRight: 'Good fold. Your 20 blind is gone, but that\'s far cheaper than chasing with junk.' },
      { type: 'awaitHandOver', text: '' },
      { type: 'say', text: 'Which hands <em>are</em> worth playing? Big pairs, big cards (A-K, A-Q, K-Q), and suited connectors like 9♠ 8♠ — especially when you have position.' },
      { type: 'botScript', default: 'check-call', seats: { 3: ['fold'] } },
      { type: 'rigDeck', dealerIdx: 0, holes: { 0: 'Ks Qs' } },
      { type: 'awaitTurn', text: 'Chen folds…' },
      { type: 'awaitAction', text: 'Now you have <strong>K♠ Q♠</strong> on the button: two high cards, suited, and last to act. Play it — <strong>call or raise</strong>.', accept: ['call', 'raise'], onWrong: 'King-Queen suited in position is a clear hand to play. Don\'t fold.' },
      { type: 'awaitHandOver', text: 'Play out the hand however you like.' },
      { type: 'endLesson', text: 'Fold the junk, play the strong stuff, and lean towards playing more hands when you act last.' },
    ],
  },

  // ---------------------------------------------------------------- 6
  {
    id: 'pot-odds',
    title: 'Pot Odds & Draws',
    blurb: 'Count your outs and decide if a call is worth it.',
    steps: [
      { type: 'say', text: 'Sometimes you don\'t have a hand yet, but you could make a great one. That\'s a <strong>draw</strong>. Whether to chase it comes down to simple math.' },
      { type: 'botScript', default: 'check-call', seats: { 1: ['call', 'fold'], 2: ['call', { raise: 40 }, 'check', 'call', 'check-call'], 3: ['check', 'fold'] } },
      { type: 'rigDeck', dealerIdx: 1, holes: { 0: 'Ah 9h' }, board: 'Kh 7h 2c 4h 9s' },
      { type: 'awaitAction', text: 'You have A♥ 9♥. Just <strong>call</strong> to see a flop.', accept: ['call'], onWrong: 'Call for now.' },
      { type: 'awaitStreet', street: 'flop', text: 'Everyone calls…' },
      { type: 'highlight', target: 'community', text: 'Flop: K♥ 7♥ 2♣. You have two hearts and so does the board — four hearts. One more and you have a <strong>flush</strong>. That\'s a flush draw.' },
      {
        type: 'quiz',
        prompt: 'An <strong>out</strong> is a card that completes your hand. There are 13 hearts in the deck and you can see 4. How many outs do you have?',
        choices: ['4', '9', '13'],
        answer: 1,
        explain: '13 hearts minus the 4 you see = 9 outs. Rule of thumb: multiply outs by 4 on the flop (~36% to hit by the river) or by 2 on the turn (~18% for one card).',
        wrongText: 'Subtract the hearts you can already see from 13.',
      },
      { type: 'awaitTurn', text: 'Bruno bets…' },
      { type: 'awaitAction', text: 'Bruno bets 40 into an 80 pot. To call 40 you\'d win 160 total — you need to win more than <strong>40 ÷ 160 = 25%</strong> of the time. With ~36% to hit your flush, <strong>calling</strong> is profitable.', accept: ['call'], onWrong: 'The math says call: 36% to hit is better than the 25% you need. Don\'t fold, and raising with no hand yet is risky.', onRight: 'Good call. When your chance to hit beats the price, you call.' },
      { type: 'awaitStreet', street: 'turn', text: 'Ava folds. Here comes the turn…' },
      { type: 'highlight', target: 'hand-strength', text: 'The 4♥ arrives — you\'ve made an <strong>Ace-high flush</strong>, the best possible flush!' },
      { type: 'awaitAction', text: 'Bruno checks. Now you have the goods — <strong>bet</strong> to get paid.', accept: [{ type: 'raise' }], onWrong: 'You\'ve hit your draw. Bet — checking gives away free cards and wins nothing.' },
      { type: 'awaitHandOver', text: 'Finish the hand.' },
      { type: 'endLesson', text: 'Outs × 4 on the flop, × 2 on the turn. Compare that to the price of the call. If your odds are better, call!' },
    ],
  },

  // ---------------------------------------------------------------- 7
  {
    id: 'value-betting',
    title: 'Value Betting & Sizing',
    blurb: 'Bet the right amount to get paid with strong hands.',
    steps: [
      { type: 'say', text: 'When you have a strong hand you want opponents to put chips in. Too small and you leave money on the table; too big and everyone folds. Let\'s find the sweet spot.' },
      { type: 'botScript', default: 'check-call', seats: { 1: ['call', 'check', 'call', 'check', 'call', 'check', 'call'], 2: ['call', 'check', 'fold'], 3: ['fold'] } },
      { type: 'rigDeck', dealerIdx: 0, holes: { 0: 'Kc Kd' }, board: 'Kh 8s 3d 2c 7c' },
      { type: 'awaitTurn', text: 'Chen folds…' },
      { type: 'awaitAction', text: 'Pocket Kings on the button. <strong>Raise</strong> to about 3 big blinds (60).', accept: [{ type: 'raise', max: 120, tooBig: 'Whoa — too big! A standard open is around 60. Huge raises only get called by better hands.' }], onWrong: 'Kings are a premium hand: raise, don\'t limp.' },
      { type: 'awaitStreet', street: 'flop', text: 'Ava and Bruno call…' },
      { type: 'highlight', target: 'community', text: 'Flop K♥ 8♠ 3♦ — you flopped <strong>three Kings</strong> (a "set"). The board has no flush or straight draws, so opponents have weak hands at best. Time to build the pot slowly.' },
      { type: 'highlight', target: 'presets', text: 'A good value bet is <strong>½ to ¾ of the pot</strong>: big enough to grow the pot, small enough that a pair can call. Use the ½ Pot or Pot preset, or the slider.' },
      { type: 'awaitAction', text: 'Ava and Bruno checked. <strong>Bet between half the pot and the full pot.</strong>', accept: [{ type: 'raise', minPotFrac: 0.45, maxPotFrac: 1.05, tooSmall: 'Too small — that gives them a cheap look at the next card. Bet at least half the pot.', tooBig: 'Too big! An overbet or all-in makes everyone fold and you win nothing more. Aim for ½ to 1× pot.' }], onWrong: 'Don\'t check a set on a dry board — you\'d miss a chance to get paid. Bet.', onRight: 'Nicely sized. Ava calls with a pair, exactly what you want.' },
      { type: 'awaitStreet', street: 'turn', text: '' },
      { type: 'awaitAction', text: 'Turn 2♣ — still a dry board and Ava checks again. <strong>Bet again</strong>, ½ to 1× pot.', accept: [{ type: 'raise', minPotFrac: 0.45, maxPotFrac: 1.05, tooSmall: 'A bit bigger — at least half the pot.', tooBig: 'Too big — keep it between ½ and 1× pot so Ava can call.' }], onWrong: 'Keep betting for value. Checking lets Ava off cheaply.' },
      { type: 'awaitHandOver', text: 'River: bet again or check, your choice. Then watch the showdown.' },
      { type: 'endLesson', text: 'Strong hand + dry board = bet ½ to 1× pot on every street. Consistent value betting is where most of your profit comes from.' },
    ],
  },

  // ---------------------------------------------------------------- 8
  {
    id: 'coached-hand',
    title: 'Coached Hand',
    blurb: 'Play a full hand with the coach whispering in your ear.',
    steps: [
      { type: 'say', text: 'Final lesson: a complete hand, start to finish. I\'ll give you a tip before each decision. Let\'s go.' },
      { type: 'botScript', default: 'check-call', seats: { 1: [{ raise: 60 }, { raise: 100 }, 'call', 'call'], 2: ['fold'], 3: ['call', 'check', 'fold'] } },
      { type: 'rigDeck', dealerIdx: 2, holes: { 0: 'Jh 10h' }, board: 'Qh 9c 2d 8s 5h' },
      { type: 'awaitTurn', text: 'You\'re in the big blind. Ava raises to 60, Bruno folds, Chen calls…' },
      { type: 'awaitAction', text: 'You have <strong>J♥ 10♥</strong> — suited and connected, great for making straights and flushes. Two players are in and you only need 40 more. <strong>Call.</strong>', accept: ['call'], onWrong: 'Folding is too tight with this hand and price; raising a drawing hand into two players is risky. Call.' },
      { type: 'awaitStreet', street: 'flop', text: '' },
      { type: 'awaitAction', text: 'Flop <strong>Q♥ 9♣ 2♦</strong>. You have an open-ended straight draw (any King or 8 — 8 outs) plus a backdoor flush draw. Chen checked. <strong>Check</strong> and see what Ava does.', accept: ['check'], onWrong: 'No made hand yet. Check and let the aggressor act first.' },
      { type: 'awaitAction', text: 'Ava bets 100 into 180, Chen folds. Pot is 280; a call of 100 needs ~26%. Eight outs ≈ 17% for one card, but hitting wins a big pot (implied odds). <strong>Call.</strong>', accept: ['call'], onWrong: 'The price is close and the payoff when you hit is big. Call — don\'t fold or raise with no hand yet.' },
      { type: 'awaitStreet', street: 'turn', text: '' },
      { type: 'highlight', target: 'hand-strength', text: 'Turn <strong>8♠</strong> — you made the <strong>Queen-high straight</strong>, the best possible hand right now!' },
      { type: 'awaitAction', text: 'You act first. With the nuts, <strong>bet</strong> — about ⅔ of the pot is perfect.', accept: [{ type: 'raise' }], onWrong: 'You have the nuts. Bet to get paid!' },
      { type: 'awaitStreet', street: 'river', text: 'Ava calls…' },
      { type: 'awaitAction', text: 'River 5♥. Still the nuts. <strong>Bet again</strong> for value.', accept: [{ type: 'raise' }], onWrong: 'Bet! Checking the best hand on the river leaves chips behind.' },
      { type: 'awaitHandOver', text: '' },
      { type: 'endLesson', text: '🎓 Beautifully played. You called with the right odds, hit your draw, and bet for value. You\'re ready for the real table — good luck!' },
    ],
  },
];
