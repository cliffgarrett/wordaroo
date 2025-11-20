/* ---------------------------------------------------------
   WORD-A-ROO: CLASSIC MODE
   FULL JS REWRITE FOR “GOBBLES MOUTH SYSTEM”
   - Always-visible eyes
   - Tongue as puzzle board
   - Smart scramble compatibility
   - Drop-letter animation
   - Curved pop → rise → fade messages
--------------------------------------------------------- */

import { 
  SoundManager
} from '../../../scripts/sound.js';

import {
  initGobblesAnatomy,
  setMouthState
} from './gobbles-mood.js';

// import { monsterToUnscramble } from './transition-unscramble.js';

// GLOBAL GAME STATE FOR CLASSIC MODE
export const S = {
  level: 1,
  tickets: 0,
  musicOn: true,

  id: null,
  title: '',
  rows: 8,
  cols: 8,
  words: [],
  fillChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  orientations: ['H', 'V', 'D'],
  snakeMode: false,

  // Roo-a-Range / jumble metadata
  jumble: null,
  musicFile: 'classic.mp3',

  // grid and selection state
  grid: [],
  placed: [],
  found: new Set(),
  dragging: false,
  selPath: [],
  allowSnake: false,

  // colors / UI state
  activeColor: null,
  nextColor: null
};

/* ---------------------------------------------------------
   MOUNT GAME SHELL
--------------------------------------------------------- */
/* ---------- HUD / UI SHELL ---------- */

function renderHUD() {
  return `
    <div id="hud">
      <div class="hud-left">
      </div>
      <div class="hud-center">
      <button id="btnSettings" class="hud-pill">⚙️</button>
      <button id="btnMusic" class="hud-pill">🔈</button>
      <span id="lvl" class="hud-pill">Lv ${S.level}</span>
      <button id="btnMap" class="hud-pill">🗺️</button>
      <!--<button id="btnTimer" class="hud-pill">⏱️</button>-->
      <span id="ticketWrap" class="hud-pill">🎟️ <span id="ticketCount">${S.tickets}</span></span>
      </div>
      <div class="hud-right">
      </div>
    </div>
  `;
}

function mountGameShell() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  stage.innerHTML = `
    <section id="classicBoard">
      <canvas id="lava"></canvas>

      <!-- HUD (above Gobbles) -->
      ${renderHUD()}

      <!-- Game card: Gobbles' whole head + mouth -->
      <div id="gameCard">
        <!-- Hair + eyes strip -->
        <div id="gobblesFaceLayer">
          <div id="furBg"></div>
          <div id="monsterEyes" class="eye-neutral">
            <div class="eye left"><div class="pupil"></div></div>
            <div class="eye right"><div class="pupil"></div></div>
          </div>
        </div>

        <!-- Mouth wrapper (fixed footprint) -->
        <div id="mouth">
          <div id="mouthInner">
            <!-- Top teeth first thing in mouth -->
            <div id="teethTopWrap" class="teethWrap">
              <img id="teethTop" src="./modes/classic/assets/img/monster-top.svg"
                   alt="Top Teeth">
            </div>

            <!-- Roof of mouth (word bar) -->
            <div id="mouthRoof">
              <div id="title"></div>
              <div id="wordBar">
                <div id="wordList" class="words"></div>
              </div>
            </div>

            <!-- Throat + uvula + tongue background -->
            <div id="throat">
              <div id="uvula"></div>
              <div id="tongue"></div>
            </div>

            <!-- Speech lane -->
            <div id="msg"></div>
            <div id="liveSelect"></div>

            <!-- Grid / belly -->
            <div class="boardWrap">
            <div class="capsuleLayer"></div>
            <div id="grid" class="grid"></div>
            </div>

            <!-- Bottom teeth in same mouth container -->
            <div id="teethBottomWrap" class="teethWrap">
              <img id="teethBottom" src="./modes/classic/assets/img/monster-bottom.svg"
                   alt="Bottom Teeth">
            </div>
          </div>
        </div>

        <!-- Level panel / misc under chin -->
      </div>

      <div id="hintWrap">
        <button id="btnHintBottom" class="hint-btn" title="Get a hint">💡</button>
      </div>
    </section>

    <div id="confetti"></div>
  `;
}

/* ---------------------------------------------------------
   WIRE HUD ACTIONS (sound toggle, settings, etc.)
   (unchanged from your original implementation)
--------------------------------------------------------- */

function wireHUD() {
  const btnSettings = document.getElementById('btnSettings');
  const btnMusic   = document.getElementById('btnMusic');
  const btnPause   = document.getElementById('btnPause');
  const btnHint    = document.getElementById('btnHintBottom');

  if (btnSettings) btnSettings.onclick = () => alert("Settings TBD");
  if (btnMusic)    btnMusic.onclick    = toggleMusic;
  if (btnPause)    btnPause.onclick    = togglePause;
  if (btnHint)     btnHint.onclick     = () => msgCloud("Hint Used");
}

function updateHUD() {
  const lvl = document.getElementById('lvl');
  const tk  = document.getElementById('ticketCount');
  const musicBtn = document.getElementById('btnMusic');
  if (!lvl || !tk || !musicBtn) {
    console.warn('HUD elements not yet mounted — skipping updateHUD');
    return;
  }
  lvl.textContent = `Lv ${S.level}`;
  tk.textContent  = S.tickets;

  musicBtn.textContent = S.musicOn ? '🔊' : '🔈';
}

/* ---------- PUZZLE LOADING ---------- */

export async function loadPuzzle(level = 1) {
  const padded = String(level).padStart(4, '0');

  // works both when served from root or from /modes/classic/
  const base = import.meta.url.includes('/modes/classic/')
    // ? './puzzles/'
    ? './modes/classic/puzzles/'
    : './modes/classic/puzzles/';

  const url = `${base}lvl-${padded}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('✅ Puzzle loaded:', url, data.title);

    S.id          = data.id ?? level;
    S.title       = data.title ?? `Level ${level}`;
    S.words       = Array.isArray(data.words) ? data.words.slice() : [];
    S.rows        = data.rows ?? 8;
    S.cols        = data.cols ?? 8;
    S.fillChars   = data.fillChars ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    S.orientations = Array.isArray(data.orientation) && data.orientation.length
      ? data.orientation
      : ['H','V','D'];
    S.snakeMode   = !!data.snakeMode;
    S.jumble      = data.jumble || null;
    S.musicFile   = data.music || 'classic.mp3';

    return data;
  } catch (err) {
    console.error('❌ loadPuzzle failed:', url, err);
    msgCloud('Puzzle file missing', false);
    return null;
  }
}

window.S = S;

/* ---------------------------------------------------------
   EYES: CLICK = angry + wiggle + growl
--------------------------------------------------------- */

function wireMonsterEyes() {
  const eyes = document.getElementById('monsterEyes');
  if (!eyes) return;

  eyes.style.cursor = 'pointer';

  eyes.addEventListener('click', () => {
    GobblesEyes.onUserActivity();

    // Gobbles gets mad for a moment
    GobblesEyes.push('angry', 450);
    try { SoundManager.play('growl'); } catch {}

    // Rare stink-eye alt (you can tune probability)
    if (Math.random() < 0.18) {
      GobblesEyes.push('stink', 600);
      // later: fart / burp audio
      // try { SoundManager.play('fart'); } catch {}
    }
  });
}

/* ---------------------------------------------------------
   MESSAGE BUBBLE (curved pop → rise → fade)
--------------------------------------------------------- */

const PRAISE = ["Nice!", "Great!", "Awesome!", "Well done!", "Sweet!", "Fantastic!"];
const MISS   = ["Not a word...", "Try again!", "Nope!", "Hmm..."];

export function msgCloud(text, isPraise = true) {
  const host = document.getElementById('msg');
  if (!host) return;

  const phrase = text || (
    isPraise
      ? PRAISE[Math.floor(Math.random() * PRAISE.length)]
      : MISS[Math.floor(Math.random() * MISS.length)]
  );

  // Clear any previous bubble so they don't stack forever
  host.innerHTML = '';

  const cloud = document.createElement('div');
  cloud.className = 'msg-cloud';
  cloud.classList.add(isPraise ? 'praise' : 'miss');

  // Random slight arc direction so the bubbles feel alive
  const dirClass = Math.random() < 0.5 ? 'arc-left' : 'arc-right';
  cloud.classList.add(dirClass);

  cloud.textContent = phrase;
  host.appendChild(cloud);

  // Remove the bubble when the animation has finished
  cloud.addEventListener('animationend', () => {
    cloud.remove();
  }, { once: true });
}

/* ---------------------------------------------------------
   BUILD WORD GRID (unchanged except for DOM adjustments)
--------------------------------------------------------- */

// function buildGridFromConfig() {
//   const grid = document.getElementById('grid');
//   if (!grid) return;

//   const rows = S.rows;
//   const cols = S.cols;

//   grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
//   grid.innerHTML = '';

//   for (let r=0; r<rows; r++) {
//     for (let c=0; c<cols; c++) {
//       const cell = document.createElement('div');
//       cell.className = 'cell';
//       const letter = S.grid[r][c];
//       cell.textContent = letter;
//       grid.appendChild(cell);
//     }
//   }
// }

/* ---------- GRID BUILDING ---------- */

const idx  = (r, c) => r * S.cols + c;
const rcOf = id => [(id / S.cols) | 0, id % S.cols];
const inb  = (r, c) => r >= 0 && c >= 0 && r < S.rows && c < S.cols;
const lettersOf = path => path.map(i => S.grid[i]).join('');

function buildGridFromConfig() {
  S.grid = Array(S.rows * S.cols).fill('');
  S.placed = [];
  S.found.clear();
  S.selPath = [];
  S.allowSnake = S.snakeMode;   // json can enable snake straight away

  const dirs = [];
  if (S.orientations.includes('H')) {
    dirs.push([0, 1], [0, -1]);
  }
  if (S.orientations.includes('V')) {
    dirs.push([1, 0], [-1, 0]);
  }
  if (S.orientations.includes('D')) {
    dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  }
  if (!dirs.length) dirs.push([0,1],[1,0],[1,1],[1,-1],[-1,1],[-1,-1]);

  for (const word of S.words) {
    placeWord(word, dirs);
  }

  const bag = S.fillChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < S.grid.length; i++) {
    if (!S.grid[i]) {
      S.grid[i] = bag[Math.floor(Math.random() * bag.length)];
    }
  }
}

function renderGrid() {
  const gridEl = document.getElementById('grid');
  if (!gridEl) return;

  const rows = S.rows;
  const cols = S.cols;

  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      const ch = S.grid[id];

      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = id;
      cell.textContent = ch;

      gridEl.appendChild(cell);
    }
  }
}


function placeWord(word, dirs) {
  const W = [...word.toUpperCase()];
  const R = n => Math.floor(Math.random() * n);

  for (let attempt = 0; attempt < 300; attempt++) {
    const [dr, dc] = dirs[R(dirs.length)];
    const r0 = R(S.rows);
    const c0 = R(S.cols);
    const r1 = r0 + dr * (W.length - 1);
    const c1 = c0 + dc * (W.length - 1);
    if (!inb(r1, c1)) continue;

    let ok = true;
    const path = [];

    for (let k = 0; k < W.length; k++) {
      const r = r0 + dr * k;
      const c = c0 + dc * k;
      const id = idx(r, c);
      const ch = S.grid[id];
      if (ch && ch !== W[k]) { ok = false; break; }
      path.push(id);
    }
    if (!ok) continue;

    for (let k = 0; k < W.length; k++) {
      S.grid[path[k]] = W[k];
    }
    S.placed.push({ text: word.toUpperCase(), path });
    return;
  }

  console.warn('Failed to place word:', word);
}


/* ---------- INPUT / SELECTION ---------- */

/* ---------- LIVE LETTER DISPLAY + EYES / AMBIENT ---------- */

function playKonk() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = playKonk._ctx || (playKonk._ctx = new AudioCtx());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 170;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // ignore audio errors
  }
}

// Getters
const capsuleLayer = () => document.querySelector(".capsuleLayer");
const boardWrap = () => document.querySelector(".boardWrap");

function buildPointList(path) {
  return path.map(id => {
    const el = cellElById(id);
    if (!el) return null;

    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top  + r.height / 2,
    };
  }).filter(Boolean);
}

function convertToLocal(ptList) {
  const bw = boardWrap().getBoundingClientRect();
  return ptList.map(p => ({
    x: p.x - bw.left,
    y: p.y - bw.top,
  }));
}

export function drawActiveCapsule(path, color) {
  const layer = capsuleLayer();
  if (!layer) return;

  layer.innerHTML = "";  
  if (!path || path.length < 1) return;

  const pts = buildPointList(path);
  const local = convertToLocal(pts);

  const pointsAttr = local.map(p => `${p.x},${p.y}`).join(" ");

  layer.innerHTML = `
    <svg class="capsule-active">
      <polyline stroke="${color}" points="${pointsAttr}"></polyline>
    </svg>
  `;
}

export function drawFoundCapsule(path, color) {
  const layer = capsuleLayer();
  if (!layer) return;

  // Append (don’t clear)
  const pts = buildPointList(path);
  const local = convertToLocal(pts);
  const pointsAttr = local.map(p => `${p.x},${p.y}`).join(" ");

  const svg = document.createElement("svg");
  svg.className = "capsule-found";
  svg.innerHTML = `
    <polyline stroke="${color}" points="${pointsAttr}"></polyline>
  `;
  layer.appendChild(svg);
}

export function clearActiveCapsule() {
  const layer = capsuleLayer();
  if (!layer) return;
  layer.innerHTML = "";    // but leaves found capsules intact
}

// function updateLiveLetters(path) {
//   const host = document.getElementById('liveSelect');
//   if (!host || !S.grid) return;

//   host.innerHTML = '';
//   const letters = path.map(i => S.grid[i]);

//   for (const ch of letters) {
//     const span = document.createElement('span');
//     span.className = 'selChar';
//     span.textContent = ch;
//     host.appendChild(span);
//   }
// }

// function clearLiveLetters() {
//   const host = document.getElementById('liveSelect');
//   if (host) host.innerHTML = '';
// }

// function setEyesMood(opts = {}) {
//   const eyes = document.getElementById('monsterEyes');
//   if (!eyes) return;
//   const { angry, wide, shake } = opts;
//   ['angry','wide','shake'].forEach(c => eyes.classList.remove(c));
//   if (angry) eyes.classList.add('angry');
//   if (wide)  eyes.classList.add('wide');
//   if (shake) eyes.classList.add('shake');
// }

/* ---------- LIVE SELECTION LANE (#liveSelect) ---------- */

function updateLiveLetters(path) {
  const host = document.getElementById('liveSelect');
  if (!host) return;

  host.innerHTML = '';
  const letters = path.map(i => S.grid[i]);

  for (const ch of letters) {
    const span = document.createElement('span');
    span.className = 'selChar';
    span.textContent = ch;
    host.appendChild(span);
  }
}

function clearLiveLetters() {
  const host = document.getElementById('liveSelect');
  if (host) host.innerHTML = '';
}

function wireAmbientTaps() {
  const board = document.getElementById('classicBoard');
  if (!board) return;

  board.addEventListener('pointerdown', (ev) => {
    const t = ev.target;
    if (!t) return;

    // Ignore actual UI hits – we only want “empty” taps
    if (
      t.closest('button') ||
      t.closest('#grid') ||
      t.closest('#wordList') ||
      t.closest('#hintWrap')
    ) {
      return;
    }

    GobblesEyes.onUserActivity();

    const eyes = document.getElementById('monsterEyes');
    if (!eyes) return;

    // Quick “look straight” / focus
    GobblesEyes.push('focus', 220);

    // Occasionally do a stink-eye + growl on random mis-taps
    if (Math.random() < 1 / 7) {
      GobblesEyes.push('stink', 550);
      try { SoundManager.play('growl'); } catch {}
      // future: fart / burp variant
    }
  });
}

/* ---------------------------------------------------------
   GOBBLES EYE / MOOD CONTROLLER
   - Centralizes all #monsterEyes mood logic
   - Option B: idle only after user inactivity
--------------------------------------------------------- */

const GOBBLES_EYE_MODES = [
  "neutral", "angry", "wide", "fret", "stink", "shock",
  "squint", "cross", "roll", "flirt", "sleep", "derp",
  "exhausted", "panic", "gag", "smug", "mischief",
  "sad", "happy", "focus"
];

const GobblesEyes = (() => {
  let current = "neutral";
  let base = "neutral";       // where we return after transient moods
  let idleTimer = null;
  let lastActivity = Date.now();
  let lockUntil = 0;          // timestamp until which transient mood is “locked”

  function eyeEl() {
    return document.getElementById("monsterEyes");
  }

  function apply(mode) {
    const el = eyeEl();
    if (!el) return;
    GOBBLES_EYE_MODES.forEach(m => el.classList.remove(`eye-${m}`));
    el.classList.add(`eye-${mode}`);
    current = mode;
  }

  function set(mode) {
    if (!mode) mode = "neutral";
    base = mode;
    lockUntil = 0;
    apply(mode);
  }

  function push(mode, duration = 400) {
    const now = Date.now();
    lockUntil = now + duration;
    apply(mode);

    if (duration > 0) {
      setTimeout(() => {
        const t = Date.now();
        if (t >= lockUntil) {
          apply(base);
        }
      }, duration + 30);
    }
  }

  function onUserActivity() {
    lastActivity = Date.now();
    // If we’re past the lock window and in a transient mood, return to base
    if (Date.now() >= lockUntil && current !== base) {
      apply(base);
    }
  }

  function pickIdleMode() {
    // light, fun, non-annoying moods
    const candidates = [
      "derp", "mischief", "smug", "happy",
      "squint", "sleep", "sad"
    ];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function idleTick() {
    const now = Date.now();
    // Option B: only idle when no activity for >= 2500ms
    if (now - lastActivity < 2500) return;
    if (now < lockUntil) return;
    if (current !== base) return;

    // Small chance per tick → feels organic, not manic
    if (Math.random() < 0.07) {
      const mood = pickIdleMode();
      push(mood, 600 + Math.random() * 800);

      // Example: hook idle sounds later (commented for now)
      // if (mood === "derp")  try { SoundManager.play('derp'); } catch {}
      // if (mood === "sleep") try { SoundManager.play('snore'); } catch {}
    }
  }

  function init() {
    base = "neutral";
    current = "neutral";
    lockUntil = 0;
    lastActivity = Date.now();
    apply("neutral");

    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(idleTick, 350);
  }

  return {
    init,
    set,
    push,
    onUserActivity
  };
})();

// Simple external interface (including console access)
function setEyeMode(mode) {
  GobblesEyes.set(mode);
}
window.setEyeMode = setEyeMode;

function cellElById(id) {
  return document.querySelector(`.cell[data-idx="${id}"]`);
}

function markWordAsFound(path, color) {
  const L = path.length;
  if (!L) return;

  for (let i = 0; i < L; i++) {
    const el = cellElById(path[i]);
    if (!el) continue;
    el.classList.add('found');
    el.style.setProperty('--foundCapsuleColor', color);

    // shape
    el.classList.remove('single', 'start', 'middle', 'end');

    if (L === 1) el.classList.add('single');
    else if (i === 0) el.classList.add('start');
    else if (i === L - 1) el.classList.add('end');
    else el.classList.add('middle');
  }
}

function clearTempCapsules() {
  document.querySelectorAll('.cell.sel').forEach(c => {
    c.classList.add('clearPulse');
    setTimeout(() => c.classList.remove('clearPulse'), 400);
    c.classList.remove('sel');
    c.style.removeProperty('--capsuleColor');
  });
}

  function hookInput(gridEl) {

function updateSel() {
  drawActiveCapsule(S.selPath, S.activeColor);
}


  console.log('hookInput active');
  const cellElById = id => gridEl.querySelector(`.cell[data-idx="${id}"]`);

  // const updateSel = () => {
  //   gridEl.querySelectorAll('.cell.sel').forEach(c => c.classList.remove('sel'));
  //   for (const id of S.selPath) cellElById(id)?.classList.add('sel');
  // };


  if (!S.activeColor) S.activeColor = nextCapsuleColor();
  if (!S.nextColor)   S.nextColor   = S.activeColor;

  let activePointer = null;
  let dir = null; // direction vector for straight-only mode

  const secondLast = () => S.selPath[S.selPath.length - 2];
  const last       = () => S.selPath[S.selPath.length - 1];
  const sameCell   = (a,b) => a === b;

// Direction lock for straight-only mode

function acceptMove(nextId) {
  // Ensure we have a path array
  if (!Array.isArray(S.selPath)) {
    S.selPath = [];
  }
  // First cell in the path – always accept
  if (S.selPath.length === 0) {
    S.selPath.push(nextId);
    updateSel?.();
    updateLiveLetters?.(S.selPath);
    return true;
  }

  const lastId = S.selPath[S.selPath.length - 1];

  // Ignore if we’re still over the same cell
  if (lastId === nextId) return false;

  // Don’t revisit already-used cells in the same stroke
  if (S.selPath.includes(nextId)) return false;

  // Convert ids → row/col
  const [pr, pc] = rcOf(lastId);
  const [nr, nc] = rcOf(nextId);
  const dr = nr - pr;
  const dc = nc - pc;

  // Must be adjacent (8-direction adjacency)
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1) {
    return false;
  }

  // If snake mode is OFF, enforce straight-line direction
  if (!S.allowSnake) {
    // Lock direction on the first step
    if (!dir) {
      dir = [dr, dc];
    } else {
      // Any change in direction is rejected
      if (dir[0] !== dr || dir[1] !== dc) {
        return false;
      }
    }
  }

  // At this point, move is valid – commit it
  S.selPath.push(nextId);
  updateSel?.();
  updateLiveLetters?.(S.selPath);
  return true;
}

  function handlePointerUp(pointerId) {
    if (pointerId !== activePointer) return;
    try { gridEl.releasePointerCapture(activePointer); } catch {}
    activePointer = null;
drawFoundCapsule(S.selPath, S.activeColor);
clearActiveCapsule();

    if (!S.dragging) return;
    S.dragging = false;

    // If user just tapped a single letter, don't treat it as a word attempt.
    if (!S.selPath || S.selPath.length < 2) {
      clearLiveLetters();
      S.selPath = [];
      dir = null;
      updateSel();
      return;
    }

    const w = lettersOf(S.selPath).toUpperCase();
    const i = S.words.findIndex(word => word.toUpperCase() === w);

    if (i >= 0 && !S.found.has(S.words[i].toUpperCase())) {
      // ✅ Correct word
      const wordText = S.words[i].toUpperCase();
      S.found.add(wordText);

      // Apply found class
      for (const id of S.selPath) {
        cellElById(id)?.classList.add('found');
      }

      // ✅ Use the active color (fallback to nextColor if needed)
      const usedColor = S.activeColor || S.nextColor || nextCapsuleColor();
      // alert(usedColor); // debug if you want

      markWordAsFound(S.selPath, usedColor);
      msgCloud(null, true);
      GobblesEyes.push('happy', 700);

      // Dim the word in the list
      const spans = document.querySelectorAll('#wordList div');
      if (spans[i]) spans[i].classList.add('done');

      // 🔄 Rotate colors for the NEXT word
      S.activeColor = S.nextColor;
      S.nextColor   = nextCapsuleColor();

      if (S.found.size === S.words.length) {
        GobblesEyes.push('happy', 1200);
    capsuleLayer().innerHTML = "";
    victory();
      }
    } else {
      // ❌ Incorrect word
      msgCloud(null, false);
      GobblesEyes.push('cross', 450);
      clearTempCapsules?.();
    }

    clearLiveLetters();
    S.selPath = [];
    dir = null;
    updateSel();
    GobblesEyes.onUserActivity();
  }

  window.addEventListener("resize", () => {
  // Redraw active
  if (S.selPath && S.selPath.length)
    drawActiveCapsule(S.selPath, S.activeColor);

  // Redraw all found words
  const foundWords = [...S.found];
  capsuleLayer().innerHTML = "";  
  foundWords.forEach(word => {
    const path = getPathForWord(word); // same logic you already use
    const color = S.colorMap[word];    // store colors per word
    drawFoundCapsule(path, color);
  });
});

  gridEl.addEventListener('pointerdown', e => {
    const el = e.target.closest('.cell');
    if (!el) return;

    activePointer = e.pointerId;
    gridEl.setPointerCapture(e.pointerId);

    S.dragging = true;
    S.selPath  = [+el.dataset.idx];
    dir = null;

    S.activeColor = S.nextCapsuleColor;

    updateSel();
    updateLiveLetters(S.selPath);
    playKonk();

    GobblesEyes.onUserActivity();
    GobblesEyes.push('focus', 260);

    // haptic + tone (best-effort; safe to ignore if unsupported)
    try { navigator.vibrate?.(15); } catch {}
    try { SoundManager.play('tap'); } catch {}
  });

  gridEl.addEventListener('pointermove', e => {
    if (!S.dragging || e.pointerId !== activePointer) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    if (!el) return;

    const id = +el.dataset.idx;
    if (sameCell(id, last())) return;
    acceptMove(id);
  });

  gridEl.addEventListener('pointerup',   e => handlePointerUp(e.pointerId), { capture: true });
  gridEl.addEventListener('pointercancel', e => handlePointerUp(e.pointerId), { capture: true });
}

const COLORS = [
  '#9adafe', // blue
  '#ffc85b', // yellow
  '#9fff9f', // green
  '#ff9fe5', // pink
  '#a29fff', // violet
];

//let colorIndex = 0;
function nextPillColor() {
  const c = COLORS[colorIndex];
  colorIndex = (colorIndex + 1) % COLORS.length;
  return c;
}
const CAPSULE_COLORS = [
  '#9adafe', // sky
  '#ffc85b', // gold
  '#9fff9f', // mint
  '#ff9fe5', // pink
  '#a29fff', // lavender
];

let colorIndex = 0;

function nextCapsuleColor() {
  const c = CAPSULE_COLORS[colorIndex];
  colorIndex = (colorIndex + 1) % CAPSULE_COLORS.length;
  return c;
}

/* ---------- STORAGE ---------- */


function savePlayerData() {
  const data = {
    level:   S.level,
    tickets: S.tickets,
    musicOn: S.musicOn,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/* ---------------------------------------------------------
   RENDER BOARD (fill title + word list)
--------------------------------------------------------- */

function renderBoard() {
  const titleEl = document.getElementById('title');
  const wordListEl = document.getElementById('wordList');

  if (titleEl) titleEl.textContent = S.title;

  if (wordListEl) {
    wordListEl.innerHTML = '';
    if (Array.isArray(S.words)) {
      for (let i = 0; i < S.words.length; i++) {
        const w = document.createElement('div');
        w.textContent = S.words[i];
        wordListEl.appendChild(w);
      }
    }
  }
}

/* ---------------------------------------------------------
   ROOT START FUNCTION
--------------------------------------------------------- */

export async function start() {
  console.log('Starting Classic Mode...');

  // Load local storage (level, tickets, music)
  loadPlayerData();

  // 1) Build DOM shell first
  mountGameShell();

  // 2) Load puzzle JSON NOW that DOM exists
  const data = await loadPuzzle(S.level || 1);
  if (!data) return;

  // 4) Wire interface behavior
  wireHUD();
  wireMonsterEyes();
  wireAmbientTaps();

  // Gobbles anatomy + moods
  initGobblesAnatomy();

  // Opening mouth sequence:
  // 0) start closed (no teeth)
  await setMouthState('closed');

  // 1) slowly extend teeth from gums (interlock position)
  await setMouthState('teethExtended');

  // 2) fully open mouth, retract teeth ~6px, show game
  await setMouthState('open');
  setEyeMode('neutral'); // staring ahead for play

  wireAmbientTaps();

  // 5) Start HUD visuals
  updateHUD();

  // 6) Animations
  animateLava();
  //window.addEventListener('resize', resizePillsToGrid);

  // 👀 Start eye / idle system
  GobblesEyes.init();

  // 7) Build puzzle grid
  buildGridFromConfig();

  // Initialize color cycle
  S.activeColor = nextPillColor();
  S.nextColor = nextPillColor();

  // 3) Populate title + word list for the mouth
  renderGrid();
  renderBoard();

  // 8) Hook input AFTER grid exists
  const gridEl = document.getElementById('grid');
  if (gridEl) hookInput(gridEl);
  // 9) Load and start music + monster sounds
  SoundManager.stopAll();
  SoundManager.load('classic', `./modes/classic/assets/audio/${S.musicFile}`);
  if (S.musicOn) SoundManager.play('classic', true);

  SoundManager.load('gulp',  './modes/classic/assets/audio/gulp.mp3');
  SoundManager.load('growl', './modes/classic/assets/audio/growl.mp3');
}

function loadPlayerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.level)   S.level   = data.level;
    if (data.tickets) S.tickets = data.tickets;
    if (typeof data.musicOn === 'boolean') S.musicOn = data.musicOn;
  } catch {}
}


/* ---------------------------------------------------------
   HUD CONTROLS (simple versions)
--------------------------------------------------------- */

function toggleMusic() {
  S.musicOn = !S.musicOn;
  if (S.musicOn) {
    SoundManager.play('classic', true);
  } else {
    SoundManager.stop('classic');
  }
  savePlayerData();
}

function togglePause() {
  msgCloud("Paused");
}

/* ---------------------------------------------------------
   RESIZE PILLS TO MATCH GRID (kept as original)
--------------------------------------------------------- */

// function resizePillsToGrid() {
//   const grid = document.getElementById('grid');
//   const svg = document.getElementById('pills');
//   if (!grid || !svg) return;

//   const rect = grid.getBoundingClientRect();
//   svg.setAttribute('width', rect.width);
//   svg.setAttribute('height', rect.height);
// }

/* ---------- PILL DRAWING ---------- */

// function resizePillsToGrid() {
//   const grid = document.getElementById('grid');
//   const svg  = document.getElementById('pills');
//   if (!grid || !svg) return;

//   const rect = grid.getBoundingClientRect();
//   svg.style.width  = rect.width  + 'px';
//   svg.style.height = rect.height + 'px';
//   svg.style.left   = grid.offsetLeft + 'px';
//   svg.style.top    = grid.offsetTop  + 'px';
//   svg.setAttribute('width', rect.width);
//   svg.setAttribute('height', rect.height);
// }

function cellCenter(id) {
  const grid = document.getElementById('grid');
  if (!grid) return null;
  const cell = grid.querySelector(`.cell[data-idx="${id}"]`);
  if (!cell) return null;
  const rCell = cell.getBoundingClientRect();
  const rGrid = grid.getBoundingClientRect();
  return {
    x: rCell.left - rGrid.left + rCell.width  / 2,
    y: rCell.top  - rGrid.top  + rCell.height / 2
  };
}

function drawPillSegment(a, b, color, isTemp = false) {
  const svg = document.getElementById('pills');
  if (!svg) return;
  const A = cellCenter(a);
  const B = cellCenter(b);
  if (!A || !B) return;

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', A.x);
  line.setAttribute('y1', A.y);
  line.setAttribute('x2', B.x);
  line.setAttribute('y2', B.y);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '28');
  line.setAttribute('stroke-linecap', 'round');
  if (isTemp) line.classList.add('temp');
  svg.appendChild(line);
}

// function clearTempPill() {
//   const svg = document.getElementById('pills');
//   if (!svg) return;
//   svg.querySelectorAll('.temp').forEach(el => el.remove());
// }

// function redrawTempPill(path, color) {
//   const svg = document.getElementById('pills');
//   if (!svg) return;
//   clearTempPill();
//   for (let i = 0; i < path.length - 1; i++) {
//     drawPillSegment(path[i], path[i + 1], color, true);
//   }
// }

// function drawFinalPill(path, color) {
//   const svg = document.getElementById('pills');
//   if (!svg) return;
//   for (let i = 0; i < path.length - 1; i++) {
//     drawPillSegment(path[i], path[i + 1], color, false);
//   }
// }


/* ---------------------------------------------------------
   LAVA ANIMATION (unchanged)
--------------------------------------------------------- */

function animateLava() {
  const canvas = document.getElementById('lava');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  let t = 0;
  function loop() {
    t += 0.04;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = `rgba(255,0,162, ${0.04 + 0.02*Math.sin(t)})`;
    ctx.fillRect(0,0,canvas.width, canvas.height);
    requestAnimationFrame(loop);
  }
  loop();
}

/* ---------------------------------------------------------
   EXPORTS FOR DEBUG
--------------------------------------------------------- */

window.msgCloud = msgCloud;
window.start = start;
