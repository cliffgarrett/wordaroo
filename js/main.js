// ===== minimal state =====
const S = {
  level: 1, rows: 7, cols: 6,
  grid: [], placed: [], dragging:false, selPath: [],
  minTurnLen: 1, curDir: [0,0], segLen: 0,
};

// ===== dom =====
const $ = s => document.querySelector(s);
const splash = $('#splash');
const picker = $('#modePicker');
const game   = $('#gameWrap');
const gridEl = $('#grid');
const lvlEl  = $('#lvl');
let bandsEl = $('#bands');
let previewEl = $('#bandsPreview');

// ===== modepicker =====
//const splash     = document.getElementById('splash');
const btnStart   = document.getElementById('btnStart');
const modePicker = document.getElementById('modePicker');

btnStart.addEventListener('click', async () => {
  // optional: play splash tap sound
  await AudioManager.userInit?.(); // unlock audio
  try { audio.splash.currentTime = 0; await audio.splash.play(); } catch {}
  // hide splash, show picker
  splash.classList.add('hidden');
  modePicker.classList.remove('hidden');
  modePicker.setAttribute('aria-hidden', 'false');
});

// example: choosing a mode (you can wire real handlers later)
// document.getElementById('chooseClassic').addEventListener('click', () => {
//   audio.stopAll();               // ⬅ stop splash
//   audio.playLoop('classic');
//   modePicker.classList.add('hidden');
//   beginMode?.('classic');
// });

// document.getElementById('chooseLightning').addEventListener('click', () => {
//   audio.stopAll();
//   audio.playLoop('lightning');
//   modePicker.classList.add('hidden');
//   beginMode?.('lightning');
// });

document.getElementById('chooseClassic')
  .addEventListener('click', () => beginMode('classic'));

document.getElementById('chooseLightning')
  .addEventListener('click', () => beginMode('lightning'));

document.getElementById('chooseRound').addEventListener('click', () => {
  modePicker.classList.add('hidden');
  modePicker.setAttribute('aria-hidden', 'true');
  beginMode?.('round');
});

document.getElementById('cancelPicker').addEventListener('click', () => {
  // If you want cancel to go back to splash:
  splash.classList.remove('hidden');
  modePicker.classList.add('hidden');
  modePicker.setAttribute('aria-hidden', 'true');
});

// ===== utils =====
const idx = (r,c)=> r*S.cols + c;
const rcOf = id => [(id/S.cols)|0, id%S.cols];
const inb = (r,c)=> r>=0 && c>=0 && r<S.rows && c<S.cols;
const lettersOf = (path)=> path.map(id=>S.grid[id]).join('');

// ===== core build =====
function buildEmpty(){ S.grid = Array(S.rows*S.cols).fill(''); }
function fillRandom(){
  const BAG="EEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNRRRRRSSSSTTTTTDLLLLUGGBBCCMMPPFFHHVVWWYKJXQZ";
  for(let i=0;i<S.grid.length;i++) if(!S.grid[i]) S.grid[i]=BAG[Math.floor(Math.random()*BAG.length)];
}
function tryPlaceStraight(word){
  const W=[...word];
  const dirs = [[0,1],[1,0],[1,1],[1,-1],[-1,1],[-1,-1],[0,-1],[-1,0]];
  for(let t=0;t<400;t++){
    const [dr,dc] = dirs[Math.floor(Math.random()*8)];
    const r0 = Math.floor(Math.random()*S.rows);
    const c0 = Math.floor(Math.random()*S.cols);
    const r1=r0+dr*(W.length-1), c1=c0+dc*(W.length-1);
    if(!inb(r1,c1)) continue;
    let ok=true, path=[];
    for(let k=0;k<W.length;k++){
      const r=r0+dr*k, c=c0+dc*k, id=idx(r,c);
      const ch=S.grid[id]; if (ch && ch!==W[k]) { ok=false; break; }
      path.push(id);
    }
    if(!ok) continue;
    for(let k=0;k<W.length;k++) S.grid[path[k]]=W[k];
    S.placed.push({text:word, path});
    return true;
  }
  return false;
}

function renderGrid(){
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${S.cols}, 56px)`; // simple sizing
  for(let i=0;i<S.grid.length;i++){
    const d=document.createElement('div');
    d.className='cell';
    d.textContent=S.grid[i];
    d.dataset.idx = i;
    gridEl.appendChild(d);
  }
  bandsEl = $('#bands');        // refresh handles after DOM changes
  previewEl = $('#bandsPreview');
}

function startClassic(){
  splash.classList.add('hide');
  picker.classList.add('hide');
  game.classList.remove('hide');

  S.placed.length = 0;
  buildEmpty();
  ['BIRD','BUG','CLOUD','DRAGON','KITE','EMIT'].forEach(w=>tryPlaceStraight(w));
  fillRandom();
  renderGrid();
}

// ===== selection (simple + robust) =====
let activePointer=null;
function cellElById(id){ return gridEl.querySelector(`.cell[data-idx="${id}"]`); }
function updateCellSelection(){
  gridEl.querySelectorAll('.cell.sel').forEach(c=>c.classList.remove('sel'));
  for(const id of S.selPath) cellElById(id)?.classList.add('sel');
}
function clearPreview(){ if (previewEl) previewEl.innerHTML=''; }
function clearBands(){ if (bandsEl) bandsEl.innerHTML=''; }

function segmentStraight(path){
  if (path.length<2) return [];
  const segs=[]; let a=path[0], b=path[1];
  let [r1,c1]=rcOf(a), [r2,c2]=rcOf(b);
  let dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  let cur=[a,b];
  for(let i=2;i<path.length;i++){
    const p=path[i], [pr,pc]=rcOf(path[i-1]), [r,c]=rcOf(p);
    const ddr=Math.sign(r-pr), ddc=Math.sign(c-pc);
    if (ddr===dr && ddc===dc) cur.push(p);
    else { segs.push(cur.slice()); cur=[path[i-1],p]; dr=ddr; dc=ddc; }
  }
  segs.push(cur.slice()); return segs;
}
function cellRectIn(container, id){
  const cell = cellElById(id); if (!cell || !container) return null;
  const host = container.getBoundingClientRect();
  const r = cell.getBoundingClientRect();
  return { cx: r.left-host.left+r.width/2, cy:r.top-host.top+r.height/2, w:r.width, h:r.height };
}
function drawBandSegment(container,aId,bId,color,preview=false){
  const A=cellRectIn(container,aId), B=cellRectIn(container,bId);
  if (!A || !B) return;
  const dx=B.cx-A.cx, dy=B.cy-A.cy;
  const len=Math.hypot(dx,dy)+Math.min(A.w,A.h)*0.68;
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  const th=Math.min(A.h,A.w)*0.72;
  const d=document.createElement('div');
  d.className='band '+(preview?'preview':'');
  d.style.cssText=`width:${len}px;height:${th}px;left:${(A.cx+B.cx)/2-len/2}px;top:${(A.cy+B.cy)/2-th/2}px;transform:rotate(${angle}deg)`;
  container.appendChild(d);
}
function drawPillForPath(path,color,preview=false){
  const host = preview ? previewEl : bandsEl; if (!host) return;
  for (const seg of segmentStraight(path)){
    drawBandSegment(host, seg[0], seg[seg.length-1], color, preview);
  }
}

gridEl.addEventListener('pointerdown', e=>{
  const el=e.target.closest('.cell'); if(!el) return;
  activePointer=e.pointerId;
  gridEl.setPointerCapture(e.pointerId);
  S.dragging=true;
  S.selPath=[+el.dataset.idx];
  updateCellSelection(); clearPreview();
},{passive:false});

gridEl.addEventListener('pointermove', e=>{
  if (!S.dragging || e.pointerId!==activePointer) return;
  const el=e.target.closest('.cell'); if(!el) return;
  const id=+el.dataset.idx;
  const last=S.selPath[S.selPath.length-1];
  if (id!==last){
    S.selPath.push(id);
    updateCellSelection();
    clearPreview();
    if (S.selPath.length>1) drawPillForPath(S.selPath,'blue',true);
  }
},{passive:false});

addEventListener('pointerup', ()=>{
  if (!S.dragging) return;
  S.dragging=false; activePointer=null;
  clearPreview();
  if (S.selPath.length>1) drawPillForPath(S.selPath,'blue',false);
  S.selPath.length=0;
  updateCellSelection();
},{passive:true});

// ===== splash → picker wiring =====
const audio = {
  splash: new Audio('./assets/audio/splash.mp3'),
  classic: new Audio('./assets/audio/classic.mp3'),
  lightning: new Audio('./assets/audio/lightning.mp3'),
  stopAll() {
    [this.splash, this.classic, this.lightning].forEach(a => {
      try { a.pause(); a.currentTime = 0; } catch {}
    });
  },
  playLoop(name) {
    const a = this[name];
    if (!a) return;
    this.stopAll();                // stop others first
    a.loop = true;
    a.currentTime = 0;
    a.play().catch(()=>{});
  }
};

// $('#btnStart').addEventListener('click', async ()=>{
//   try { audio.splash.currentTime=0; await audio.splash.play(); } catch {}
//   picker.classList.remove('hide');
// });

$('#cancelPicker').addEventListener('click', ()=> picker.classList.add('hide'));

$('#chooseClassic').addEventListener('click', async ()=>{
  picker.classList.add('hide');
  await audio.playLoop('classic');
  startClassic();
});

$('#chooseLightning').addEventListener('click', async ()=>{
  picker.classList.add('hide');
  await audio.playLoop('lightning');
  // For now, just start the same grid; visuals/SFX later
  startClassic();
  document.body.classList.add('mode-lightning'); // placeholder class
});

// Optional: auto-show splash on load (already visible by default)

import { AudioManager } from './audio.js';

const modes = {
  classic: '../assets/mode/classic.js',
  lightning: '../assets/mode/lightning.js'
};

async function loadMode(name) {
  AudioManager.stopAll();
  if (name === 'classic') AudioManager.play('classic', true);
  if (name === 'lightning') AudioManager.play('lightning', true);

  modePicker.classList.add('hidden');

  try {
    const mod = await import(modes[name]);
    mod.start?.();
  } catch (err) {
    console.error('Failed to load mode:', name, err);
  }
}

document.getElementById('chooseClassic')
  .addEventListener('click', () => loadMode('classic'));

document.getElementById('chooseLightning')
  .addEventListener('click', () => loadMode('lightning'));

document.getElementById('cancelPicker')
  .addEventListener('click', () => {
    AudioManager.stopAll();
    modePicker.classList.add('hidden');
    splash.classList.remove('hidden');
});

function beginMode(modeName) {
  console.log(`Starting mode: ${modeName}`);

  // stop splash music if it’s still running
  AudioManager.stopAll();

  // play the chosen mode’s looped track
  if (modeName === 'classic') AudioManager.play('classic', true);
  if (modeName === 'lightning') AudioManager.play('lightning', true);

  // load the mode’s module (from /assets/mode/)
  import(`../assets/mode/${modeName}.js`)
    .then(mod => {
      if (mod.start) mod.start();
      else console.warn(`${modeName}.js has no start() function`);
    })
    .catch(err => console.error('Failed to load mode:', err));
}
