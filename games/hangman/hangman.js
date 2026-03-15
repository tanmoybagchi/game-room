import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  /* ───── word list ───── */
  const WORDS = [
    'elephant','giraffe','penguin','dolphin','cheetah','buffalo','hamster','octopus',
    'panther','vulture','gazelle','leopard','lobster','pelican','raccoon','sparrow',
    'tortoise','flamingo','squirrel','antelope','crocodile','butterfly','chameleon',
    'hedgehog','kangaroo','mosquito','platypus','porcupine','seahorse','starfish',
    'albatross','armadillo','barracuda','cardinal','chipmunk','cockatoo','coyote',
    'dragonfly','falcon','ferret','gorilla','iguana','jaguar','jellyfish','lemur',
    'mackerel','manatee','mongoose','narwhal','nightingale','opossum','orangutan',
    'parakeet','parrot','pheasant','piranha','python','quail','rattlesnake','reindeer',
    'rhinoceros','roadrunner','salamander','scorpion','stingray','swordfish','termite',
    'toucan','wallaby','walrus','warthog','wolverine','woodpecker','zebra',
    'argentina','australia','belgium','brazil','canada','croatia','denmark','ecuador',
    'finland','germany','hungary','iceland','jamaica','lebanon','malaysia','morocco',
    'nigeria','pakistan','portugal','romania','scotland','thailand','ukraine','vietnam',
    'cambodia','colombia','ethiopia','indonesia','singapore','venezuela',
    'afghanistan','albania','algeria','austria','bahamas','bangladesh','barbados',
    'bermuda','bolivia','botswana','bulgaria','cameroon','chile','cuba','cyprus',
    'dominica','egypt','estonia','georgia','ghana','greece','guatemala','honduras',
    'ireland','israel','jordan','kenya','kuwait','latvia','libya','lithuania',
    'madagascar','mauritius','mexico','mongolia','myanmar','namibia','nepal','nicaragua',
    'norway','panama','paraguay','peru','poland','serbia','slovakia','slovenia',
    'somalia','spain','sweden','switzerland','tanzania','trinidad','tunisia','turkey',
    'uruguay','zambia','zimbabwe',
    'avocado','burrito','brownie','biscuit','chicken','coconut','custard','dumpling',
    'espresso','granola','hummus','jalapeno','lasagna','muffin','noodles',
    'pancake','popcorn','pretzel','ravioli','risotto','sausage','spinach',
    'waffle','yoghurt','zucchini','cabbage','oatmeal','tiramisu',
    'artichoke','asparagus','baguette','banana','blueberry','broccoli','bruschetta',
    'calzone','cantaloupe','cappuccino','caramel','casserole','cheddar','cheesecake',
    'chimichanga','chocolate','cinnamon','coleslaw','cornbread','cranberry','croissant',
    'cucumber','cupcake','eggplant','empanada','focaccia','gazpacho','gnocchi',
    'guacamole','hazelnut','honeydew','kettle','lavender','macaron','macaroni',
    'mandarin','meatball','mushroom','mustard','parmesan','pineapple','pistachio',
    'porridge','pumpkin','quesadilla','raspberry','rhubarb','rosemary','sandwich',
    'smoothie','sourdough','spaghetti','strawberry','tangerine','tapioca','tortilla',
    'turmeric','turnip','vanilla','watermelon',
    'baseball','basketball','bowling','boxing','cricket','cycling','fencing','football',
    'gymnastics','handball','hockey','javelin','karate','lacrosse','marathon','netball',
    'polo','rowing','sailing','skating','skiing','soccer','surfing','swimming',
    'tennis','volleyball','wrestling','archery','badminton','rugby',
    'biathlon','bobsled','canoeing','climbing','curling','darts','decathlon',
    'discus','diving','dodgeball','equestrian','frisbee','golf',
    'halfpipe','heptathlon','hurdles','judo','kickboxing','luge','motocross',
    'paintball','parkour','pentathlon','pickleball','racquetball','rappelling',
    'rodeo','skeleton','slalom','snowboard','softball','speedway','sprinting',
    'squash','steeplechase','taekwondo','triathlon','trampoline','waterpolo',
    'weightlifting','windsurfing',
    'atom','biology','catalyst','density','electron','friction','gravity','hydrogen',
    'isotope','kinetic','molecule','neutron','nucleus','osmosis','photon','quantum',
    'reaction','spectrum','velocity','voltage','bacteria','compound','crystal',
    'element','entropy','formula','genome','habitat','mineral','polymer',
    'asteroid','atmosphere','biochemistry','biosphere','carbonate','centrifuge',
    'chromosome','combustion','conductor','convection','cytoplasm','diffusion',
    'ecosystem','electrode','enzyme','equation','evaporate','evolution','exponent',
    'frequency','geothermal','helium','hologram','igneous','inertia','latitude',
    'magnesium','magnetism','metamorphic','microscope','mitosis','nitrogen',
    'organism','oxidation','parasite','particle','pendulum','petroleum','phosphorus',
    'photosynthesis','proton','radiation','satellite','sediment','seismology',
    'synthesis','telescope','thermometer','titanium','tundra','uranium','wavelength'
  ];

  const MAX_WRONG = 6;
  const PARTS = ['hm-head', 'hm-body', 'hm-larm', 'hm-rarm', 'hm-lleg', 'hm-rleg'];

  /* ───── state ───── */
  let word, guessedLetters, wrongCount, gameOver;

  /* ───── DOM ───── */
  const wordDisplay = document.getElementById('word-display');
  const letterButtons = document.getElementById('letter-buttons');
  const $winOverlay = document.getElementById('win-overlay');

  /* ───── pick a word ───── */
  function pickWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
  }

  /* ───── render word ───── */
  function renderWord() {
    wordDisplay.innerHTML = '';
    for (const ch of word) {
      const slot = document.createElement('div');
      slot.className = 'letter-slot';
      if (ch === ' ') {
        slot.classList.add('space');
      } else if (guessedLetters.has(ch)) {
        slot.textContent = ch;
        slot.classList.add('revealed');
      }
      wordDisplay.appendChild(slot);
    }
  }

  /* ───── render hangman parts ───── */
  function renderHangman() {
    PARTS.forEach((id, i) => {
      const el = document.getElementById(id);
      el.classList.toggle('show', i < wrongCount);
    });
  }

  /* ───── build letter buttons ───── */
  function buildLetterButtons() {
    letterButtons.innerHTML = '';
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(97 + i);
      const btn = document.createElement('button');
      btn.className = 'letter-btn';
      btn.textContent = letter;
      btn.dataset.letter = letter;
      btn.addEventListener('click', () => guessLetter(letter));
      letterButtons.appendChild(btn);
    }
  }

  /* ───── guess ───── */
  function guessLetter(letter) {
    if (gameOver || guessedLetters.has(letter)) return;
    guessedLetters.add(letter);

    const btn = letterButtons.querySelector(`[data-letter="${letter}"]`);
    btn.disabled = true;

    if (word.includes(letter)) {
      btn.classList.add('correct');
      renderWord();
      checkWin();
    } else {
      btn.classList.add('wrong');
      wrongCount++;
      renderHangman();
      checkLose();
    }
    saveState();
  }

  /* ───── win / lose ───── */
  function checkWin() {
    const won = [...word].every(ch => ch === ' ' || guessedLetters.has(ch));
    if (won) {
      gameOver = true;
      showResult('🎉 You won!', 'win');
      showWinOverlay($winOverlay);
    }
  }

  function checkLose() {
    if (wrongCount >= MAX_WRONG) {
      gameOver = true;
      // reveal remaining letters
      for (const ch of word) guessedLetters.add(ch);
      renderWord();
      document.querySelectorAll('.letter-slot').forEach(s => {
        if (!s.classList.contains('space') && !s.classList.contains('revealed')) {
          s.classList.add('wrong-reveal');
        }
      });
      showResult(`The word was: ${word.toUpperCase()}`, 'lose');
    }
  }

  function showResult(msg, cls) {
    const existing = document.querySelector('.result-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = `result-msg ${cls}`;
    el.textContent = msg;
    wordDisplay.after(el);

    // disable remaining buttons
    letterButtons.querySelectorAll('.letter-btn:not(:disabled)').forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.3';
    });
  }

  /* ───── keyboard support ───── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) {
      guessLetter(e.key.toLowerCase());
    }
  });

  /* ───── save / restore ───── */
  const SAVE_KEY = 'gameroom-hangman';

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      word,
      guessedLetters: [...guessedLetters],
      wrongCount,
      gameOver
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function restoreGame(state) {
    word = state.word;
    guessedLetters = new Set(state.guessedLetters);
    wrongCount = state.wrongCount;
    gameOver = state.gameOver;

    renderHangman();
    renderWord();
    buildLetterButtons();

    // restore button states
    for (const letter of guessedLetters) {
      const btn = letterButtons.querySelector(`[data-letter="${letter}"]`);
      if (!btn) continue;
      btn.disabled = true;
      btn.classList.add(word.includes(letter) ? 'correct' : 'wrong');
    }

    if (gameOver) {
      const won = [...word].every(ch => ch === ' ' || guessedLetters.has(ch));
      if (wrongCount >= MAX_WRONG) {
        showResult(`The word was: ${word.toUpperCase()}`, 'lose');
      } else if (won) {
        showResult('🎉 You won!', 'win');
      }
    }
  }

  /* ───── new game ───── */
  function newGame() {
    word = pickWord();
    guessedLetters = new Set();
    wrongCount = 0;
    gameOver = false;

    const existing = document.querySelector('.result-msg');
    if (existing) existing.remove();

    renderHangman();
    renderWord();
    buildLetterButtons();
    saveState();
    hideWinOverlay($winOverlay);
  }

  /* ───── init ───── */
  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-play-again').addEventListener('click', newGame);

  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-help').addEventListener('click', () => helpModal.showModal());
  document.getElementById('btn-help-close').addEventListener('click', () => helpModal.close());
  helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.close(); });

  const saved = loadState();
  if (saved && saved.word) {
    restoreGame(saved);
  } else {
    newGame();
  }
})();
