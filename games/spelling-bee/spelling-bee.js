import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  /* ───── pre-built puzzles (center letter first, then 6 outer letters, then valid answers) ───── */
  const PUZZLES = [
    {
      center: 'a', outer: ['p','n','t','h','i','c'],
      words: ['anti','attic','attach','attain','captain','cant','chant','chain','china','chin',
              'inch','itch','natch','pain','paint','pact','panic','patch','path','pant','pita',
              'pitch','than','that','thin','titan','tiara','capita','antic','catnip','haptic',
              'patin','nacho','antics','pitta','catch','hatch','natch','cinch','pitch','thatch']
    },
    {
      center: 'r', outer: ['e','s','t','o','n','i'],
      words: ['rein','rent','rest','riot','rise','rite','rote','iron','inter','inert',
              'insert','intro','irons','noirs','noise','noter','notes','onset','orient',
              'osier','reins','resin','rinse','risen','rites','rosin','senor','siren',
              'snore','stern','stir','store','stone','tires','toner','tones','tries',
              'trio','trios','nosier','senior','norite','sortie','stonier','retro',
              'riser','tensor','stoner','rosier','ironer','snorer']
    },
    {
      center: 'l', outer: ['e','a','d','r','n','i'],
      words: ['alder','alien','aline','dale','deal','dial','dine','dire','earl','ideal',
              'idle','laid','lair','land','lane','lard','lead','lean','learn','lend',
              'lid','lied','lien','line','lined','liner','nadir','nail','nailed','rail',
              'railed','rile','riled','renal','darnel','denial','derail','dialer',
              'lander','linear','lidar','reland','alined','redial','inlaid']
    },
    {
      center: 'g', outer: ['a','l','n','i','t','e'],
      words: ['aging','agent','agile','align','angel','angle','eagle','eating','gain',
              'gait','gale','gate','gelatin','gentle','giant','gilt','glean','gnat',
              'ingle','tangle','tinge','ligate','negate','gelati','genial','glean',
              'gentile','lineage','tailing','gaiting','legit','legate','tingle','elating',
              'gelato','alight','eating','letting','getting','letting','latent']
    },
    {
      center: 'o', outer: ['r','c','k','w','d','n'],
      words: ['conk','cook','cord','cork','corn','dock','door','down','dork','know',
              'knock','knob','nook','noon','rock','rook','wood','word','work','worn',
              'worm','crook','crowd','crown','donor','indoor','condor','uncork',
              'wonk','croon','rowdy','donor','rocky','cordon','cocoon','voodoo',
              'rodwork','nookwork','ownwork','coward','dropkick']
    },
    {
      center: 'h', outer: ['s','e','a','t','r','i'],
      words: ['hash','haste','hate','hater','hear','heart','heat','heir','hire','shirt',
              'share','shear','sheer','shier','shire','their','there','these','three',
              'thirst','rather','sheath','haste','hasten','hatter','heater','heist',
              'hires','rash','earths','hearts','heater','hastier','thresh','shatter',
              'hairiest','earthiest','thrasher','healthier','heartiest']
    },
    {
      center: 'u', outer: ['p','z','l','e','s','n'],
      words: ['ensue','lune','lunge','pulse','puns','pure','purse','push','plus',
              'plunge','prune','prunes','slung','slur','spun','stun','snug','super',
              'unpeg','unused','usurp','unseen','unless','unplug','puzzle','puzzles',
              'nuzzle','unsure','sunless','supple','pluses','pureness','spurless',
              'suspense','unspell','zenless','snuzzle','unpuzzle']
    },
    {
      center: 'm', outer: ['a','b','l','e','s','i'],
      words: ['amble','ambles','amiable','bail','balm','beam','blame','claims','climb',
              'email','emails','emblem','fame','flame','imam','lamb','lame','limb',
              'lime','mail','maim','male','malaise','mesa','mile','mime','missile',
              'mobile','nimble','samba','salami','simile','slime','small','smell',
              'smile','tamale','maize','mails','males','missal','missile','emblaims',
              'aimless','blemish','admissible','mailbless']
    },
    {
      center: 'd', outer: ['e','w','a','r','n','i'],
      words: ['added','aided','aired','dared','dawned','dean','dear','dine','diner',
              'dire','drain','draw','drawn','dream','dried','drier','drive','driven',
              'drown','wade','waded','wader','wand','wander','ward','warden','warred',
              'widen','wider','wind','winder','wired','wilder','darned','inward',
              'reward','rewind','warped','winded','winder','trained','derived','rained']
    },
    {
      center: 'f', outer: ['l','o','w','e','r','s'],
      words: ['feel','fell','flew','flow','flower','flowers','fore','forge','form',
              'foes','fole','followed','fool','force','forest','fowl','freeze','fresh',
              'frog','from','front','frost','froze','self','shelf','sniff','stuff',
              'floss','floor','flour','fewer','forge','flesh','floss','flower',
              'follower','floorer','fresher','flosser','foreswore','swerfer']
    },
    {
      center: 'b', outer: ['r','i','g','h','t','s'],
      words: ['bigs','bird','birth','bits','brig','bright','brights','brigs','brit',
              'brits','girth','grits','grist','grit','grith','shirt','sigh','sight',
              'stir','thirst','third','this','right','rights','eight','bright','blight',
              'births','brigths','nightbirds','brightest','brightish']
    },
    {
      center: 'c', outer: ['h','a','n','g','e','s'],
      words: ['cache','cage','cages','cane','canes','change','changes','chase','each',
              'ache','aches','chance','chances','engage','engages','ganache','nags',
              'hang','hangs','change','changes','exchange','exchanges','encase',
              'encash','enchase','changeless','ganaches','enchases']
    },
    {
      center: 'w', outer: ['i','n','t','e','r','s'],
      words: ['wine','wines','winter','winters','wire','wires','wise','wiser','wren',
              'wrens','wrist','writ','write','writer','writers','writes','writs',
              'newts','sinew','stew','twin','twins','twine','twines','twist','twister',
              'twinset','rewrite','rewrites','newsier','winterise']
    },
    {
      center: 'p', outer: ['l','a','y','e','r','s'],
      words: ['pale','paler','pales','pare','pares','parley','parleys','parse','parser',
              'pay','payer','payers','pays','peal','peals','pear','pearl','pearls',
              'pears','play','player','players','plays','plea','pleas','please','pray',
              'prays','prey','preys','prays','relay','relays','replay','replays',
              'repay','repays','splay','sparely','parleys','players','displays']
    },
    {
      center: 'n', outer: ['i','g','h','t','s','e'],
      words: ['neigh','neighs','nest','nesting','nets','nigh','night','nights','nine',
              'nines','noise','nose','note','notes','nothing','shin','shine','shining',
              'sight','sighting','sign','sing','singe','sings','sting','stinging',
              'tense','tensing','thing','things','tighten','tightens','nighties',
              'nesting','sighting','tightest','thinness','singeing','nothings']
    },
    {
      center: 'k', outer: ['i','n','g','s','l','e'],
      words: ['keen','keens','keg','kegs','ken','kill','kills','kin','king','kings',
              'kinks','kiss','kneel','kneels','knelling','knife','like','likes',
              'liking','link','links','linking','silk','silken','silks','sinking',
              'skiing','skill','skills','skin','skins','sleek','slink','slinks',
              'ilks','inklings','kingless','kingliness','linkless']
    },
    {
      center: 's', outer: ['t','a','r','l','i','e'],
      words: ['sail','sale','salt','sari','sate','seal','seat','serial','set','site',
              'sire','sister','slat','slate','slater','slier','slit','stair','stale',
              'staler','star','stare','steal','steel','steer','stile','stir','stare',
              'satire','saltier','realist','earliest','literals','sterilise',
              'satellite','serialist','arterials','slatier','reslate']
    },
    {
      center: 'v', outer: ['i','o','l','e','t','s'],
      words: ['veil','veils','vest','vests','veto','vetoes','vial','vials','vile',
              'violet','violets','visit','visits','vital','vitals','vole','voles',
              'volt','volts','vote','votes','evil','evils','live','lives','olive',
              'olives','solve','solves','stove','stoves','violet','violets','loviest',
              'violets','volitest','loveliest','violetist','olivets']
    },
    {
      center: 'j', outer: ['u','m','p','e','d','s'],
      words: ['jeep','jeeps','jest','jests','jump','jumped','jumper','jumpers','jumps',
              'jude','judge','judges','judged','juds','jupes','just','muse','mused',
              'used','pumped','dumps','jumped','stumped','plumped','spumed',
              'presumed','muddiest','jumpiest','dumpiest','stumpjed']
    },
    {
      center: 'z', outer: ['e','b','r','a','s','i'],
      words: ['zeal','zeals','zebra','zebras','zero','zeros','zest','zests','zips',
              'zone','zones','size','sizes','seize','seizes','raze','razes','braze',
              'brazes','brazier','braziers','breeze','breezes','bizarre','bizarres',
              'grazes','glaziers','razberries','braizer','sizable']
    }
  ];

  const RANKS = [
    { name: 'Beginner',  pct: 0 },
    { name: 'Good',      pct: 5 },
    { name: 'Nice',      pct: 15 },
    { name: 'Great',     pct: 30 },
    { name: 'Amazing',   pct: 50 },
    { name: 'Genius',    pct: 70 },
    { name: 'Queen Bee', pct: 100 }
  ];

  /* ───── state ───── */
  let puzzle, validWords, foundWords, currentInput, score, maxScore;

  /* ───── DOM ───── */
  const honeycomb = document.getElementById('honeycomb');
  const inputDisplay = document.getElementById('input-display');
  const foundWordsEl = document.getElementById('found-words');
  const rankLabel = document.getElementById('rank-label');
  const rankFill = document.getElementById('rank-fill');
  const scoreLabel = document.getElementById('score-label');
  const $winOverlay = document.getElementById('win-overlay');

  /* ───── toast ───── */
  function showToast(msg, ms = 1200) {
    const t = document.createElement('div');
    t.className = 'sb-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('fade'), ms);
    setTimeout(() => t.remove(), ms + 600);
  }

  /* ───── scoring ───── */
  function wordScore(word) {
    const allLetters = new Set(word);
    const isPangram = [puzzle.center, ...puzzle.outer].every(l => allLetters.has(l));
    let pts = word.length === 4 ? 1 : word.length;
    if (isPangram) pts += 7;
    return pts;
  }

  function calcMaxScore() {
    return validWords.reduce((sum, w) => sum + wordScore(w), 0);
  }

  function updateRank() {
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    rankFill.style.width = pct + '%';
    scoreLabel.textContent = score;

    let rank = RANKS[0].name;
    for (const r of RANKS) {
      if (pct >= r.pct) rank = r.name;
    }
    rankLabel.textContent = rank;

    if (pct >= 100) {
      showWinOverlay($winOverlay);
    }
  }

  /* ───── build honeycomb ───── */
  function buildHoneycomb() {
    const letters = [...puzzle.outer];
    honeycomb.innerHTML = '';

    // top row: 2 letters
    const row1 = document.createElement('div');
    row1.className = 'hex-row';
    row1.appendChild(makeHex(letters[0]));
    row1.appendChild(makeHex(letters[1]));
    honeycomb.appendChild(row1);

    // middle row: letter, CENTER, letter
    const row2 = document.createElement('div');
    row2.className = 'hex-row';
    row2.appendChild(makeHex(letters[2]));
    row2.appendChild(makeHex(puzzle.center, true));
    row2.appendChild(makeHex(letters[3]));
    honeycomb.appendChild(row2);

    // bottom row: 2 letters
    const row3 = document.createElement('div');
    row3.className = 'hex-row';
    row3.appendChild(makeHex(letters[4]));
    row3.appendChild(makeHex(letters[5]));
    honeycomb.appendChild(row3);
  }

  function makeHex(letter, isCenter = false) {
    const btn = document.createElement('button');
    btn.className = 'hex-btn' + (isCenter ? ' center' : '');
    btn.textContent = letter;
    btn.addEventListener('click', () => addLetter(letter));
    return btn;
  }

  /* ───── input handling ───── */
  function addLetter(letter) {
    const allLetters = new Set([puzzle.center, ...puzzle.outer]);
    if (!allLetters.has(letter)) return;
    currentInput += letter;
    renderInput();
  }

  function deleteLetter() {
    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      renderInput();
    }
  }

  function renderInput() {
    inputDisplay.innerHTML = '';
    for (const ch of currentInput) {
      const span = document.createElement('span');
      span.textContent = ch;
      if (ch === puzzle.center) span.className = 'center-letter';
      inputDisplay.appendChild(span);
    }
  }

  function submitWord() {
    const word = currentInput.toLowerCase();
    currentInput = '';
    renderInput();

    if (word.length < 4) {
      showToast('Too short');
      shakeInput();
      return;
    }

    if (!word.includes(puzzle.center)) {
      showToast('Missing center letter');
      shakeInput();
      return;
    }

    const allLetters = new Set([puzzle.center, ...puzzle.outer]);
    for (const ch of word) {
      if (!allLetters.has(ch)) {
        showToast('Invalid letter');
        shakeInput();
        return;
      }
    }

    if (foundWords.has(word)) {
      showToast('Already found');
      shakeInput();
      return;
    }

    if (!validWords.includes(word)) {
      showToast('Not in word list');
      shakeInput();
      return;
    }

    // valid!
    foundWords.add(word);
    const pts = wordScore(word);
    score += pts;

    const allLtrs = new Set(word);
    const isPangram = [puzzle.center, ...puzzle.outer].every(l => allLtrs.has(l));

    if (isPangram) {
      showToast(`Pangram! +${pts}`, 2000);
    } else if (pts > 1) {
      showToast(`+${pts}`);
    } else {
      showToast('Nice!');
    }

    renderFoundWords();
    updateRank();
    saveState();
  }

  function shakeInput() {
    inputDisplay.classList.remove('shake');
    void inputDisplay.offsetWidth;
    inputDisplay.classList.add('shake');
  }

  /* ───── render found words ───── */
  function renderFoundWords() {
    foundWordsEl.innerHTML = '';
    const sorted = [...foundWords].sort();
    for (const w of sorted) {
      const el = document.createElement('span');
      el.className = 'found-word';
      const allLtrs = new Set(w);
      if ([puzzle.center, ...puzzle.outer].every(l => allLtrs.has(l))) {
        el.classList.add('pangram');
      }
      el.textContent = w;
      foundWordsEl.appendChild(el);
    }
  }

  /* ───── shuffle outer letters ───── */
  function shuffleOuter() {
    for (let i = puzzle.outer.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [puzzle.outer[i], puzzle.outer[j]] = [puzzle.outer[j], puzzle.outer[i]];
    }
    buildHoneycomb();
  }

  /* ───── keyboard support ───── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { submitWord(); return; }
    if (e.key === 'Backspace') { deleteLetter(); return; }
    if (/^[a-zA-Z]$/.test(e.key)) {
      addLetter(e.key.toLowerCase());
    }
  });

  /* ───── save / restore ───── */
  const SAVE_KEY = 'gameroom-spellingbee';

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      puzzleIndex: PUZZLES.findIndex(p => p.center === puzzle.center && p.outer.sort().join('') === [...puzzle.outer].sort().join('')),
      center: puzzle.center,
      outer: puzzle.outer,
      foundWords: [...foundWords],
      score
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function restoreGame(state) {
    // find matching puzzle by center letter
    const match = PUZZLES.find(p => p.center === state.center);
    if (!match) return false;

    puzzle = { ...match };
    puzzle.outer = [...state.outer];
    validWords = [...new Set(puzzle.words.map(w => w.toLowerCase()))];
    foundWords = new Set(state.foundWords);
    currentInput = '';
    score = state.score;
    maxScore = calcMaxScore();

    buildHoneycomb();
    renderInput();
    renderFoundWords();
    updateRank();
    return true;
  }

  /* ───── new game ───── */
  function newGame() {
    puzzle = { ...PUZZLES[Math.floor(Math.random() * PUZZLES.length)] };
    puzzle.outer = [...puzzle.outer]; // clone for shuffling
    // de-dupe valid words
    validWords = [...new Set(puzzle.words.map(w => w.toLowerCase()))];
    foundWords = new Set();
    currentInput = '';
    score = 0;
    maxScore = calcMaxScore();

    buildHoneycomb();
    renderInput();
    renderFoundWords();
    updateRank();
    saveState();
    hideWinOverlay($winOverlay);
  }

  /* ───── init ───── */
  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-play-again').addEventListener('click', newGame);
  document.getElementById('btn-shuffle').addEventListener('click', shuffleOuter);
  document.getElementById('btn-delete').addEventListener('click', deleteLetter);
  document.getElementById('btn-enter').addEventListener('click', submitWord);

  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-help').addEventListener('click', () => helpModal.showModal());
  document.getElementById('btn-help-close').addEventListener('click', () => helpModal.close());
  helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.close(); });

  const saved = loadState();
  if (saved && saved.center && restoreGame(saved)) {
    // restored
  } else {
    newGame();
  }
})();
