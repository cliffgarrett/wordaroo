// modes/classic/scripts/transition-unscramble.js
// Gobbles' "chomp" transition from word-search to Roo-a-Range.

import { SoundManager } from '../../../scripts/sound.js';

/**
 * Pre-compute jaw positions based on the current layout.
 * This is intentionally forgiving so it works across aspect ratios.
 */
export function positionMonsterTeeth() {
  const msg       = document.getElementById('msg');
  const boardWrap = document.querySelector('.boardWrap');
  const teethTop  = document.getElementById('monsterTeethTop');
  const teethBottom = document.getElementById('monsterTeethBottom');

  if (!msg || !boardWrap || !teethTop || !teethBottom) return;

  const msgRect   = msg.getBoundingClientRect();
  const boardRect = boardWrap.getBoundingClientRect();

  const msgTop    = msgRect.top;
  const msgCenter = msgTop + msgRect.height / 2;

  // Rough positions; tune in CSS if needed
  const hiddenTop   = msgTop - 160;
  const openTop     = msgTop - 40;
  const chompTop    = msgTop;

  const hiddenBottom = boardRect.bottom + 120;
  const openBottom   = msgCenter + 20;
  const chompBottom  = msgCenter + 60;

  teethTop.dataset.hiddenY = String(hiddenTop);
  teethTop.dataset.openY   = String(openTop);
  teethTop.dataset.chompY  = String(chompTop);

  teethBottom.dataset.hiddenY = String(hiddenBottom);
  teethBottom.dataset.openY   = String(openBottom);
  teethBottom.dataset.chompY  = String(chompBottom);
}

// Expose for debugging / tweaking in DevTools if you want
window.positionMonsterTeeth = positionMonsterTeeth;

/**
 * Drives the transition animation.
 *
 * @param {object} jumble          The jumble config from the puzzle JSON
 * @param {object} [options]
 * @param {() => void} [options.onComplete] callback once teeth reopen
 */
export function monsterToUnscramble(jumble, options = {}) {
  const transition = document.getElementById('monsterTransition');
  const boardWrap  = document.querySelector('.boardWrap');
  const wordBar    = document.getElementById('wordBar');
  const msg        = document.getElementById('msg');
  const { onComplete } = options;

  if (!transition || !boardWrap || !wordBar || !msg) {
    console.warn('monsterToUnscramble: missing DOM; skipping animation');
    onComplete?.();
    return;
  }

  positionMonsterTeeth();

  const teethTop    = document.getElementById('monsterTeethTop');
  const teethBottom = document.getElementById('monsterTeethBottom');
  if (!teethTop || !teethBottom) {
    onComplete?.();
    return;
  }

  // Initial visible state
  transition.style.display = 'block';
  transition.classList.add('show');
  boardWrap.classList.add('fade-out');
  wordBar.classList.add('fade-out');

  // Reset jaw positions off-screen
  teethTop.style.transition = 'none';
  teethBottom.style.transition = 'none';
  teethTop.style.transform = `translateY(${teethTop.dataset.hiddenY || '-200'}px)`;
  teethBottom.style.transform = `translateY(${teethBottom.dataset.hiddenY || '400'}px)`;

  // Step 1: slide to open
  requestAnimationFrame(() => {
    teethTop.style.transition = 'transform 300ms ease-out';
    teethBottom.style.transition = 'transform 300ms ease-out';

    teethTop.style.transform = `translateY(${teethTop.dataset.openY}px)`;
    teethBottom.style.transform = `translateY(${teethBottom.dataset.openY}px)`;
  });

  // Step 2: chomp
  setTimeout(() => {
    teethTop.style.transform = `translateY(${teethTop.dataset.chompY}px)`;
    teethBottom.style.transform = `translateY(${teethBottom.dataset.chompY}px)`;
    try { SoundManager.play('gulp'); } catch {}
  }, 340);

  // Step 3: reopen slightly (so it feels like the next screen is opening)
  setTimeout(() => {
    teethTop.style.transform = `translateY(${teethTop.dataset.openY}px)`;
    teethBottom.style.transform = `translateY(${teethBottom.dataset.openY}px)`;
  }, 900);

  // Step 4: clean up & hand off to Roo-a-Range
  setTimeout(() => {
    transition.classList.remove('show');
    transition.style.display = 'none';
    boardWrap.classList.remove('fade-out');
    wordBar.classList.remove('fade-out');
    onComplete?.();
  }, 1300);
}
