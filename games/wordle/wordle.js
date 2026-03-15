import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  /* ───── word list ───── */
  const WORDS = [
    'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
    'agent','agree','ahead','alarm','album','alert','alien','align','alive','alley',
    'allow','alone','along','alter','ample','angel','anger','angle','angry','anime',
    'ankle','annex','apart','apple','apply','arena','argue','arise','armor','array',
    'arrow','aside','asset','atlas','attic','audio','audit','avoid','awake','award',
    'aware','awful','bacon','badge','badly','baker','basic','basin','basis','beach',
    'beard','beast','began','begin','being','below','bench','berry','birth','black',
    'blade','blame','bland','blank','blast','blaze','bleed','blend','bless','blind',
    'block','blood','bloom','blown','board','bonus','boost','booth','bound','brain',
    'brand','brave','bread','break','breed','brick','bride','brief','bring','broad',
    'broke','brook','brown','brush','buddy','build','built','bunch','burst','buyer',
    'cabin','cable','camel','candy','cargo','carry','catch','cause','cedar','chain',
    'chair','chaos','charm','chart','chase','cheap','check','chess','chest','chief',
    'child','chill','chord','chunk','civil','claim','clash','class','clean','clear',
    'clerk','click','cliff','climb','cling','clock','clone','close','cloth','cloud',
    'coach','coast','comet','comic','coral','couch','could','count','court','cover',
    'crack','craft','crane','crash','crazy','cream','creek','crime','crisp','cross',
    'crowd','crown','crude','crush','curve','cycle','daily','dance','death','debug',
    'decay','delay','delta','dense','depth','derby','devil','diary','dirty','dodge',
    'donor','doubt','dough','draft','drain','drake','drama','drank','drawn','dream',
    'dress','dried','drift','drill','drink','drive','drone','drove','drown','dryer',
    'dwarf','eager','early','earth','eight','elect','elite','email','embed','ember',
    'empty','ended','enemy','enjoy','enter','entry','equal','error','essay','event',
    'every','exact','exams','exile','exist','extra','fable','facet','faith','faint',
    'fairy','false','fancy','fatal','fault','feast','fever','fiber','field','fiery',
    'fight','final','first','fixed','flame','flash','fleet','flesh','float','flood',
    'floor','flora','flour','fluid','flute','focal','focus','force','forge','forth',
    'forum','found','frame','frank','fraud','fresh','front','frost','froze','fruit',
    'fully','funny','giant','given','glass','gleam','glide','globe','gloom','glory',
    'gloss','glove','going','grace','grade','grain','grand','grant','grape','grasp',
    'grass','grave','great','greed','green','greet','grief','grill','grind','gripe',
    'gross','group','grove','guard','guess','guest','guide','guild','guilt','habit',
    'happy','harsh','haunt','haven','heart','heavy','hedge','hence','honor','horse',
    'hotel','house','human','humor','hurry','hyper','ideal','image','imply','index',
    'indie','inner','input','intro','issue','ivory','jewel','joint','joker','jolly',
    'judge','juice','karma','kebab','knife','knock','known','label','labor','lance',
    'large','laser','latch','later','laugh','layer','leapt','learn','lease','leave',
    'legal','lemon','level','light','limit','linen','liner','liver','llama','local',
    'logic','lorry','lover','lower','loyal','lucid','lucky','lunch','lying','magic',
    'major','maker','manor','maple','march','marsh','match','mayor','media','mercy',
    'merge','merit','metal','meter','midst','might','minor','minus','model','moist',
    'money','month','moral','mount','mouse','mouth','movie','music','naive','nasty',
    'naval','nerve','never','newly','night','noble','noise','north','noted','novel',
    'nurse','nylon','occur','ocean','offer','often','olive','onset','opera','orbit',
    'order','organ','other','outer','owner','oxide','ozone','paint','panel','panic',
    'paste','patch','pause','peace','peach','pearl','penny','phase','phone','photo',
    'piano','piece','pilot','pinch','pixel','pizza','place','plain','plane','plant',
    'plate','plaza','plead','pluck','plumb','plume','plump','point','polar','pound',
    'power','press','price','pride','prime','print','prior','prize','probe','prone',
    'proof','proud','prove','proxy','psalm','pulse','punch','pupil','purse','queen',
    'query','quest','queue','quick','quiet','quilt','quirk','quota','quote','radar',
    'radio','raise','rally','ranch','range','rapid','ratio','reach','ready','realm',
    'rebel','refer','reign','relax','reply','resin','rider','ridge','rifle','right',
    'rigid','river','roast','robin','robot','rocky','rouge','rough','round','route',
    'royal','ruler','rural','sadly','saint','salad','salon','sauce','scale','scare',
    'scene','scent','scope','score','scout','scrap','seize','sense','serve','setup',
    'seven','shade','shaft','shake','shall','shame','shape','share','shark','sharp',
    'sheep','sheer','sheet','shelf','shell','shift','shine','shirt','shock','shoot',
    'shore','short','shout','shown','sight','silly','since','sixth','sixty','skate',
    'skill','skull','slate','slave','sleep','slice','slide','slope','small','smart',
    'smell','smile','smith','smoke','snake','solar','solid','solve','sorry','south',
    'space','spare','spark','speak','speed','spend','spent','spice','spill','spine',
    'spite','split','spoke','spoon','sport','spray','squad','stack','staff','stage',
    'stain','stair','stake','stale','stall','stamp','stand','stare','stark','start',
    'state','stays','steak','steal','steam','steel','steep','steer','stern','stick',
    'stiff','still','stock','stole','stone','stood','stool','store','storm','story',
    'stout','stove','stuck','stuff','style','sugar','suite','sunny','super','surge',
    'swamp','swear','sweep','sweet','swift','swing','syrup','table','taste','teach',
    'teeth','tempo','tense','thank','theft','theme','thick','thing','think','third',
    'thorn','those','three','threw','throw','thumb','tiger','tight','timer','tired',
    'title','toast','today','token','total','touch','tough','tower','toxic','trace',
    'track','trade','trail','train','trait','trash','treat','trend','trial','tribe',
    'trick','tried','troop','truck','truly','trunk','trust','truth','tumor','twist',
    'ultra','uncle','under','unify','union','unite','unity','until','upper','upset',
    'urban','usage','usual','utter','vague','valid','value','valve','vault','venue',
    'verse','video','vigor','vinyl','viral','vital','vivid','vocal','voice','voter',
    'waist','waste','watch','water','weary','weave','wheat','wheel','where','which',
    'while','white','whole','whose','width','witch','woman','world','worry','worse',
    'worst','worth','would','wound','wrath','wrist','write','wrote','yacht','young',
    'youth','zebra',
    // ── expanded set ──
    'abode','abort','abrupt','acres','adapt','adept','adorn','aegis','afoot','ailed',
    'aisle','algae','alibi','allot','alloy','aloft','alpha','amber','amend','amino',
    'amuse','angry','anvil','aorta','aping','arose','asked','atone','avert','axiom',
    'azure','badge','bagel','barge','baron','batch','baton','belly','bible','bingo',
    'biome','birch','bison','bland','bloke','blunt','blurb','boast','bogus','bored',
    'botch','bough','brace','braid','brash','bravo','brawn','brine','brink','brisk',
    'broil','brood','brunt','budge','bulge','bully','byway','cache','cadre','calif',
    'carat','carol','caves','cease','chart','chasm','cheat','cheek','cheer','chess',
    'chief','chime','choir','chose','churn','cider','cigar','cinch','civic','clasp',
    'cleft','clerk','cling','cloak','clone','clout','clown','coils','colon','comma',
    'condo','coral','couch','could','cover','crack','cramp','crane','crate','crawl',
    'craze','creep','crest','crimp','crops','crumb','crust','cubic','curly','cutie',
    'dally','datum','decal','decor','decoy','deity','delve','denim','depot','derby',
    'detox','dicey','diner','dingy','disco','ditto','dizzy','dodge','dolls','donor',
    'dowdy','dozed','drain','drape','dread','dregs','dried','drool','droop','drove',
    'dryly','dully','dumpy','dunce','duvet','dwell','dying','edict','eerie','eight',
    'elbow','elder','elfin','elude','embed','enact','endow','ensue','envoy','epoch',
    'equip','erode','erupt','essay','ethic','evade','evict','evoke','ewers','exalt',
    'exert','expat','expel','extol','facet','farce','fauna','feast','femur','feral',
    'fetch','feign','feint','fence','ferry','fetch','fiber','finch','first','flask',
    'flair','flank','flare','flawy','flier','fling','flock','floss','flown','fluke',
    'flung','flunk','foggy','folly','foray','forge','forte','forty','foyer','frail',
    'freed','friar','frisk','froze','frugal','funky','fuzzy','gaffe','gauge','gauze',
    'gavel','geeky','genre','ghost','given','giddy','gland','glare','glaze','glean',
    'glint','gloat','gnash','goose','gorge','gouge','graft','grate','gravy','graze',
    'groan','groom','grope','grout','growl','grubs','grunt','guava','guise','gulch',
    'gummy','gusto','gypsy','haste','haven','hazel','heath','heave','hefty','helix',
    'hence','herbs','heron','hilly','hitch','hoard','hobby','homer','hound','hover',
    'huffy','humid','humus','hunky','hutch','icing','idiom','idyll','igloo','impel',
    'incur','infer','ingot','inlay','irony','ivory','jelly','jenny','jetty','jiffy',
    'jimmy','johns','jostle','joust','jumbo','jumpy','juror','kayak','khaki','kinky',
    'knack','knead','kneel','knelt','knoll','labor','laden','ladle','lapse','latch',
    'latex','ledge','lefty','lemma','liken','lilac','limbo','lingo','livid','llama',
    'loafs','lobby','lodge','lofty','login','lowly','lucid','lumpy','lunar','lyric',
    'macho','mafia','magma','mange','mango','mania','manor','maxim','mealy','melee',
    'melon','meows','merry','messy','midge','might','milky','mimic','mince','misty',
    'mocha','mogul','moldy','money','moody','moose','motel','motif','motto','mound',
    'mourn','mucus','muddy','mulch','mumps','mural','murky','mushy','muted','myrrh',
    'nasal','nerdy','newts','niche','ninny','nitro','noisy','nudge','nutty','nymph',
    'oaken','oasis','oddly','offal','omega','onset','optic','ounce','outdo','overt',
    'owing','oxbow','oxide','paced','paddy','pager','palsy','panda','pansy','papal',
    'parse','party','patio','paved','payee','pedal','penny','perch','peril','perky',
    'pesto','petty','piggy','pique','pithy','pivot','plaid','plank','playa','plaza',
    'pleat','plied','plier','plods','pluck','plumb','plump','plunk','plush','poach',
    'podgy','poker','polka','poppy','posed','poser','potty','pouch','prank','prawn',
    'preen','primo','primp','prism','privy','prong','prose','prowl','prude','prune',
    'psalm','pudgy','pulpy','pumps','puree','pushy','putty','pygmy','qualm','quart',
    'quasi','quell','quick','quota','rabid','racer','radar','radii','radon','rainy',
    'raked','ralph','ramen','rapid','raven','rayon','razor','recap','recut','redux',
    'regal','rehab','reign','relax','renew','repay','repel','reset','retro','rhino',
    'ridge','rigor','rinse','risen','risky','rival','roger','rogue','roman','roost',
    'rover','rowdy','rugby','rumba','rumor','rupee','rusty','sable','salon','sandy',
    'satin','sauna','savor','scald','scalp','scant','scarf','scene','scone','scoop',
    'scorn','scour','scout','scowl','seedy','seize','shack','shady','shale','shire',
    'shoal','showy','shrub','shrug','siege','sigma','silky','since','siren','sissy',
    'sixty','skier','skimp','skirt','skunk','slain','slang','slant','slash','sleep',
    'sleet','slick','sling','slink','sloth','slump','slung','smack','smear','smelt',
    'smirk','smite','snail','snare','sneak','sneer','snide','sniff','snoop','snore',
    'snort','snout','soapy','sober','solar','sonar','sonic','sooth','sooty','sorry',
    'spade','spank','spasm','spawn','spear','speck','spell','spelt','spied','spike',
    'spoil','spoke','spore','spout','sprig','sprry','spurt','squat','squid','staid',
    'stale','stalk','stank','stash','stead','steed','steep','steer','stiff','sting',
    'stint','stoic','stomp','stood','stork','stout','strap','straw','stray','strip',
    'strut','strum','strut','stubs','stuff','stump','stung','stunk','suave','swain',
    'swami','swank','swath','sweat','swell','swept','swine','swirl','swoon','swoop',
    'tabby','tacit','taffy','talon','tango','tapir','taunt','tease','teeth','tempo',
    'tenet','tenure','tepid','thane','thick','thief','thigh','thing','thong','tidal',
    'tilts','timid','tipsy','titan','toadd','tonic','topaz','torso','totem','trait',
    'tramp','trawl','treks','tress','triad','tribe','trice','tried','trite','troll',
    'truce','truss','tuber','tulip','tumor','tuner','tunic','turbo','tusks','twang',
    'tweed','twice','twigs','twine','twirl','udder','ulcer','uncut','undue','unfed',
    'unfit','unify','union','unite','unlit','unmet','unpeg','unpin','unset','untie',
    'unwed','upend','usher','using','utter','valet','vapor','vault','veiny','verge',
    'verse','vigor','villa','viper','visor','vista','vixen','vodka','voila','vouch',
    'vowel','vulva','wacky','wager','wagon','waltz','warty','watch','weedy','weird',
    'welch','whack','whale','wheat','whiff','whine','whirl','whisk','whole','wider',
    'wield','windy','wired','wispy','witty','woken','woody','woozy','wreck','yearn',
    'yeast','yield','zilch','zippy','zonal'
  ];

  /* ───── state ───── */
  const ROWS = 6, COLS = 5;
  let target, guesses, currentRow, currentCol, gameOver;
  const keyState = {};

  /* ───── DOM refs ───── */
  const board = document.getElementById('board');
  const keyboard = document.getElementById('keyboard');
  const $winOverlay = document.getElementById('win-overlay');

  /* ───── toast ───── */
  function showToast(msg, ms = 1500) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('fade'), ms);
    setTimeout(() => t.remove(), ms + 600);
  }

  /* ───── build board ───── */
  function buildBoard() {
    board.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'wordle-row';
      row.dataset.row = r;
      for (let c = 0; c < COLS; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = r;
        tile.dataset.col = c;
        row.appendChild(tile);
      }
      board.appendChild(row);
    }
  }

  /* ───── build keyboard ───── */
  function buildKeyboard() {
    const rows = [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      ['Enter','z','x','c','v','b','n','m','⌫']
    ];
    keyboard.innerHTML = '';
    rows.forEach(keys => {
      const row = document.createElement('div');
      row.className = 'keyboard-row';
      keys.forEach(k => {
        const btn = document.createElement('button');
        btn.className = 'key' + (k.length > 1 ? ' wide' : '');
        btn.textContent = k;
        btn.dataset.key = k;
        btn.addEventListener('click', () => handleKey(k));
        row.appendChild(btn);
      });
      keyboard.appendChild(row);
    });
  }

  /* ───── get tile ───── */
  function getTile(r, c) {
    return board.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`);
  }

  /* ───── handle key ───── */
  function handleKey(key) {
    if (gameOver) return;

    if (key === '⌫' || key === 'Backspace') {
      if (currentCol > 0) {
        currentCol--;
        const tile = getTile(currentRow, currentCol);
        tile.textContent = '';
        tile.classList.remove('filled');
      }
      return;
    }

    if (key === 'Enter') {
      if (currentCol < COLS) {
        const row = board.querySelector(`.wordle-row[data-row="${currentRow}"]`);
        row.classList.remove('shake');
        void row.offsetWidth;
        row.classList.add('shake');
        showToast('Not enough letters', 1000);
        return;
      }
      submitGuess();
      return;
    }

    if (/^[a-z]$/i.test(key) && currentCol < COLS) {
      const letter = key.toLowerCase();
      const tile = getTile(currentRow, currentCol);
      tile.textContent = letter;
      tile.classList.add('filled');
      currentCol++;
    }
  }

  /* ───── submit guess ───── */
  function submitGuess() {
    let guess = '';
    for (let c = 0; c < COLS; c++) {
      guess += getTile(currentRow, c).textContent;
    }

    if (!WORDS.includes(guess)) {
      const row = board.querySelector(`.wordle-row[data-row="${currentRow}"]`);
      row.classList.remove('shake');
      void row.offsetWidth;
      row.classList.add('shake');
      showToast('Not in word list', 1000);
      return;
    }

    guesses.push(guess);
    revealRow(currentRow, guess);
    saveState();
  }

  /* ───── reveal row ───── */
  function revealRow(row, guess) {
    const targetArr = target.split('');
    const result = Array(COLS).fill('absent');
    const used = Array(COLS).fill(false);

    // first pass — correct
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === targetArr[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }
    // second pass — present
    for (let i = 0; i < COLS; i++) {
      if (result[i] === 'correct') continue;
      for (let j = 0; j < COLS; j++) {
        if (!used[j] && guess[i] === targetArr[j]) {
          result[i] = 'present';
          used[j] = true;
          break;
        }
      }
    }

    // animate tiles
    for (let c = 0; c < COLS; c++) {
      const tile = getTile(row, c);
      const delay = c * 300;
      setTimeout(() => {
        tile.classList.add('reveal');
        setTimeout(() => {
          tile.classList.add(result[c]);
          updateKeyState(guess[c], result[c]);
        }, 250);
      }, delay);
    }

    // after all reveals
    const totalDelay = COLS * 300 + 300;
    setTimeout(() => {
      if (guess === target) {
        gameOver = true;
        for (let c = 0; c < COLS; c++) {
          setTimeout(() => getTile(row, c).classList.add('win'), c * 100);
        }
        const msgs = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
        showToast(msgs[row] || 'Nice!', 2500);
        setTimeout(() => showWinOverlay($winOverlay), 800);
        return;
      }

      currentRow++;
      currentCol = 0;

      if (currentRow >= ROWS) {
        gameOver = true;
        showToast(target.toUpperCase(), 4000);
      }
    }, totalDelay);
  }

  /* ───── update keyboard colors ───── */
  const STATE_PRIORITY = { correct: 3, present: 2, absent: 1 };

  function updateKeyState(letter, state) {
    const prev = keyState[letter];
    if (!prev || STATE_PRIORITY[state] > STATE_PRIORITY[prev]) {
      keyState[letter] = state;
    }
    const btn = keyboard.querySelector(`.key[data-key="${letter}"]`);
    if (btn) {
      btn.classList.remove('correct', 'present', 'absent');
      btn.classList.add(keyState[letter]);
    }
  }

  /* ───── physical keyboard ───── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') handleKey('Enter');
    else if (e.key === 'Backspace') handleKey('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
  });

  /* ───── save / restore ───── */
  const SAVE_KEY = 'gameroom-wordle';

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      target, guesses, currentRow, currentCol, gameOver, keyState
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function restoreGame(state) {
    target = state.target;
    guesses = state.guesses;
    currentRow = state.currentRow;
    currentCol = state.currentCol;
    gameOver = state.gameOver;
    Object.assign(keyState, state.keyState);
    buildBoard();
    buildKeyboard();

    // replay submitted rows instantly
    for (let r = 0; r < guesses.length; r++) {
      const guess = guesses[r];
      const targetArr = target.split('');
      const result = Array(COLS).fill('absent');
      const used = Array(COLS).fill(false);
      for (let i = 0; i < COLS; i++) { if (guess[i] === targetArr[i]) { result[i] = 'correct'; used[i] = true; } }
      for (let i = 0; i < COLS; i++) { if (result[i] === 'correct') continue; for (let j = 0; j < COLS; j++) { if (!used[j] && guess[i] === targetArr[j]) { result[i] = 'present'; used[j] = true; break; } } }
      for (let c = 0; c < COLS; c++) {
        const tile = getTile(r, c);
        tile.textContent = guess[c];
        tile.classList.add('filled', 'reveal', result[c]);
      }
    }

    // restore current row letters in progress
    if (!gameOver) {
      const rowEl = board.querySelector(`.wordle-row[data-row="${currentRow}"]`);
      if (rowEl) {
        // nothing typed yet on current row — that's fine
      }
    }

    // restore keyboard colors
    Object.entries(keyState).forEach(([letter, st]) => {
      const btn = keyboard.querySelector(`.key[data-key="${letter}"]`);
      if (btn) btn.classList.add(st);
    });
  }

  /* ───── new game ───── */
  function newGame() {
    currentRow = 0;
    currentCol = 0;
    guesses = [];
    gameOver = false;
    target = WORDS[Math.floor(Math.random() * WORDS.length)];
    Object.keys(keyState).forEach(k => delete keyState[k]);
    buildBoard();
    buildKeyboard();
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
  if (saved && saved.target) {
    restoreGame(saved);
  } else {
    newGame();
  }
})();
