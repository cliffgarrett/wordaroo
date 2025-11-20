// gobbles-mood.js
// Central controller for Gobbles' mouth + eyes + idle moods

// Internal refs
let mouthInner, teethTopWrap, teethBottomWrap, eyesEl, uvulaEl, tongueEl;
let currentMouth = 'closed';
let currentEyeMode = 'neutral';
let idleTimer = null;

// --- Helpers -------------------------------------------------

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function applyEyeClasses(mode) {
  if (!eyesEl) return;
  eyesEl.classList.remove(
    'eye-neutral',
    'eye-angry',
    'eye-wide',
    'eye-fret',
    'eye-stink',
    'eye-focus',
    'eye-shock',
    'eye-squint',
    'eye-cross',
    'eye-roll',
    'eye-flirt',
    'eye-sleep',
    'eye-derp',
    'eye-exhausted',
    'eye-panic',
    'eye-gag',
    'eye-smug',
    'eye-mischief',
    'eye-sad',
    'eye-happy'
  );
  eyesEl.classList.add(`eye-${mode}`);
}

// --- Public: Eye modes ---------------------------------------

const eyeMoods = [
  "eye-neutral", "eye-angry", "eye-wide", "eye-fret", "eye-stink",
  "eye-shock", "eye-squint", "eye-cross", "eye-roll", "eye-flirt",
  "eye-sleep", "eye-derp", "eye-exhausted", "eye-panic", "eye-gag",
  "eye-smug", "eye-mischief", "eye-focus"
];

export function setEyeMode(mode) {
  const el = document.getElementById("monsterEyes");
  if (!el) return;

  // remove old classes
  eyeMoods.forEach(mood => el.classList.remove(mood));

  // add requested mood
  el.classList.add(`eye-${mode}`);
}

window.setEyeMode = setEyeMode;

// Convenience wrapper – more thematic name if you prefer
export const GobblesMood = {
  set: setEyeMode
};

// --- Public: Mouth states ------------------------------------
//
//  closed        – no teeth visible, mouthInner collapsed
//  teethExtended – both rows extended + interlocked
//  open          – full play state, teeth retracted ~6px tips

export async function setMouthState(state) {
  if (!mouthInner || !teethTopWrap || !teethBottomWrap) return;
  if (state === currentMouth) return;

  currentMouth = state;

  switch (state) {
    case 'closed':
      mouthInner.classList.remove('mouth-open', 'mouth-teeth');
      mouthInner.classList.add('mouth-closed');
      break;

    case 'teethExtended':
      mouthInner.classList.remove('mouth-closed', 'mouth-open');
      mouthInner.classList.add('mouth-teeth');
      break;

    case 'open':
      mouthInner.classList.remove('mouth-closed', 'mouth-teeth');
      mouthInner.classList.add('mouth-open');
      break;
  }

  // Durations matched to CSS transitions
  const dur =
    state === 'teethExtended' ? 250 :
    state === 'open'         ? 800 :
                               200;

  await sleep(dur);
}

// --- Idle moods ----------------------------------------------

function pickIdleMode() {
  // Lightweight random spice; keep mostly neutral
  const r = Math.random();
  if (r < 0.55) return 'neutral';
  if (r < 0.70) return 'blink';
  if (r < 0.80) return 'happy';
  if (r < 0.87) return 'squint';
  if (r < 0.93) return 'smug';
  if (r < 0.97) return 'mischief';
  return 'derp';
}

async function idleLoop() {
  while (idleTimer) {
    const delay = 7000 + Math.random() * 8000; // 7–15s
    await sleep(delay);
    if (!idleTimer) break;

    // Don't override intense moods like panic / angry / fret
    if (['panic', 'angry', 'fret', 'sleep'].includes(currentEyeMode)) {
      continue;
    }

    const mood = pickIdleMode();
    if (mood === 'blink') {
      // Just poke the blink animation
      eyesEl?.classList.add('eye-blink-once');
      setTimeout(() => eyesEl?.classList.remove('eye-blink-once'), 260);
    } else {
      const prev = currentEyeMode;
      setEyeMode(mood);
      await sleep(600);
      setEyeMode(prev);
    }
  }
}

export function startIdleMoodLoop() {
  if (idleTimer) return;
  idleTimer = true;
  idleLoop();
}

export function stopIdleMoodLoop() {
  idleTimer = null;
}

// --- Init ----------------------------------------------------

export function initGobblesAnatomy() {
  mouthInner     = document.getElementById('mouthInner');
  teethTopWrap   = document.getElementById('teethTopWrap');
  teethBottomWrap= document.getElementById('teethBottomWrap');
  eyesEl         = document.getElementById('monsterEyes');
  uvulaEl        = document.getElementById('uvula');
  tongueEl       = document.getElementById('tongue');

  if (!mouthInner) {
    console.warn('initGobblesAnatomy: #mouthInner not found');
  }

  // Eyes clickable: quick angry burst + growl hook
  if (eyesEl) {
    eyesEl.addEventListener('click', () => {
      const prev = currentEyeMode;
      setEyeMode('angry');
      // SoundManager.play('growl');
      setTimeout(() => setEyeMode(prev), 450);
    });
  }

  // Initial state
  setEyeMode('neutral');
  if (mouthInner) {
    mouthInner.classList.remove('mouth-open', 'mouth-teeth');
    mouthInner.classList.add('mouth-closed');
  }

  startIdleMoodLoop();
}
