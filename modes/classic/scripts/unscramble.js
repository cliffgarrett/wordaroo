// Roo-a-Range basic scaffold
import { SoundManager } from "../../../scripts/sound.js";
import { msgCloud } from "./classic.js";   // or move msgCloud to core later

export function startUnscrambleRound(jumble) {
  const wordList = document.getElementById("wordList");
  const grid = document.getElementById("grid");
  const pills = document.getElementById("pills");
  const hintWrap = document.getElementById("hintWrap");
  if (hintWrap) hintWrap.style.display = "none";

  // wordList.classList.remove('fade-out');
  // grid.classList.remove('eaten');
  // pills.classList.remove('eaten');

    return;
  console.log("🎯 Starting Roo-a-Range:", jumble.word);

  // stop any search music and load gentle track
  SoundManager.stopAll();
  SoundManager.load("unscramble", "./modes/classic/assets/audio/unscramble.mp3");
  SoundManager.play("unscramble", true);

  const board = document.getElementById("classicBoard");
  board.innerHTML = `
    <div id="unscrambleRound">
      <h2 class="jumbleTitle">Roo-a-Range!</h2>
      <div id="scrambleLetters" class="letterRow"></div>
      <div id="answerSlots" class="letterRow"></div>
      <button id="btnCheck" class="jumbleBtn">Check</button>
    </div>
  `;

  const src = jumble.sourceLetters.slice().sort(() => Math.random() - 0.5);
  const scramble = document.getElementById("scrambleLetters");
  const answer = document.getElementById("answerSlots");

  src.forEach(ch => {
    const s = document.createElement("span");
    s.textContent = ch;
    s.className = "tile";
    s.addEventListener("click", () => {
      if (s.classList.contains("used")) return;
      const slot = [...answer.children].find(a => !a.textContent);
      if (slot) { slot.textContent = ch; s.classList.add("used"); }
    });
    scramble.appendChild(s);
  });

  for (let i = 0; i < jumble.word.length; i++) {
    const slot = document.createElement("span");
    slot.className = "slot";
    answer.appendChild(slot);
  }

  document.getElementById("btnCheck").addEventListener("click", () => {
    const attempt = [...answer.children].map(s => s.textContent).join("");
    if (attempt === jumble.word) {
      msgCloud("Great!", true);
      SoundManager.play("victory");
      setTimeout(() => location.reload(), 1500); // back to next level soon
    } else {
      msgCloud("Try again!", false);
      SoundManager.play("fail");
      answer.querySelectorAll(".slot").forEach(s => (s.textContent = ""));
      scramble.querySelectorAll(".tile.used").forEach(t => t.classList.remove("used"));
    }
  });
}

function monsterAnnounceNextLevel(levelTitle) {
  const banner = document.getElementById('monsterBanner');
  const rooTitle = document.getElementById('rooTitle');
  const transition = document.getElementById('monsterTransition');
  const eyes = document.getElementById('monsterEyes');

  transition.style.display = 'block';
  eyes.style.opacity = 1;
  banner.classList.add('show');

  rooTitle.textContent = `LEVEL ${S.level + 1}: ${levelTitle.toUpperCase()}`;

  setTimeout(() => {
    banner.classList.remove('show');
    transition.style.display = 'none';
  }, 2500);
}
