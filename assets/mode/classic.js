// assets/mode/classic.js
import { AudioManager } from '../../js/audio.js';

/* ---------------- CONFIG ---------------- */
const WORDS = ['BIRD','BUG','CLOUD','DRAGON','KITE','EMIT'];
const BAG = "EEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNRRRRRSSSSTTTTTDLLLLUGGBBCCMMPPFFHHVVWWYKJXQZ";
const GRID_ROWS = 7, GRID_COLS = 6;

let S = {
  grid: [], placed: [], found: new Set(),
  dragging:false, path:[], curDir:[0,0], segLen:0,
  settings:{ snake:true }
};

/* ---------------- HELPERS ---------------- */
const idx = (r,c)=>r*GRID_COLS+c;
const inb = (r,c)=>r>=0&&c>=0&&r<GRID_ROWS&&c<GRID_COLS;
const rcOf = id=>[Math.floor(id/GRID_COLS),id%GRID_COLS];
const R = n=>Math.floor(Math.random()*n);
const lettersOf = path=>path.map(id=>S.grid[id]).join('');

/* ---------------- BUILD ---------------- */
function buildGrid(){
  S.grid = Array(GRID_ROWS*GRID_COLS).fill('');
  S.placed = [];
  S.found.clear();

  for(const w of WORDS) tryPlace(w);
  for(let i=0;i<S.grid.length;i++)
    if(!S.grid[i]) S.grid[i] = BAG[R(BAG.length)];
}

function allowedDirs(){return [[0,1],[1,0],[1,1],[1,-1],[-1,1],[-1,-1],[0,-1],[-1,0]];}

function tryPlace(word){
  const W=word.split('');
  for(let t=0;t<400;t++){
    const dir=allowedDirs()[R(8)];
    const r0=R(GRID_ROWS), c0=R(GRID_COLS);
    const r1=r0+dir[0]*(W.length-1), c1=c0+dir[1]*(W.length-1);
    if(!inb(r1,c1)) continue;
    let ok=true,path=[];
    for(let k=0;k<W.length;k++){
      const r=r0+dir[0]*k,c=c0+dir[1]*k,id=idx(r,c);
      if(S.grid[id] && S.grid[id]!==W[k]){ok=false;break;}
      path.push(id);
    }
    if(!ok) continue;
    for(let k=0;k<W.length;k++) S.grid[path[k]]=W[k];
    S.placed.push({text:word,path});
    return true;
  }
  return false;
}

/* ---------------- RENDER ---------------- */
function renderBoard(){
  document.body.innerHTML = `
    <section id="classicBoard">
      <!--<h2>Classic Mode</h2>-->
      <div id="classicWrap">
        <div id="msg"></div>
        <div id="wordList" class="words"></div>
        <div class="boardWrap">
          <svg id="pills" class="pills"></svg>
          <div id="grid" class="grid"></div>
        </div>
      </div>
    </section>
  `;

  const gridEl = document.getElementById('grid');
  S.grid.forEach((ch,i)=>{
    const d=document.createElement('div');
    d.className='cell'; d.textContent=ch; d.dataset.idx=i;
    gridEl.appendChild(d);
  });

  const wl=document.getElementById('wordList');
  WORDS.forEach((w,i)=>{
    const el=document.createElement('span');
    el.textContent=w; el.id='w'+i; wl.appendChild(el);
  });

  hookInput(gridEl);
}

/* ---------------- SVG PILL DRAWING ---------------- */
function cellCenter(id){
  const el=document.querySelector(`.cell[data-idx="${id}"]`);
  if(!el) return null;
  const r=el.getBoundingClientRect();
  const host=document.getElementById('grid').getBoundingClientRect();
  return {
    x:r.left-host.left + r.width/2,
    y:r.top -host.top  + r.height/2,
    w:r.width, h:r.height
  };
}

function drawPillSegment(a,b,color='rgba(150,200,255,.85)'){
  const A=cellCenter(a), B=cellCenter(b);
  if(!A||!B) return;
  const dx=B.x-A.x, dy=B.y-A.y;
  const len=Math.hypot(dx,dy);
  const t=Math.min(A.w,A.h)*0.65;
  const ang=Math.atan2(dy,dx)*180/Math.PI;

  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',A.x);
  line.setAttribute('y1',A.y);
  line.setAttribute('x2',B.x);
  line.setAttribute('y2',B.y);
  line.setAttribute('stroke',color);
  line.setAttribute('stroke-width',t);
  line.setAttribute('stroke-linecap','round');
  document.getElementById('pills').appendChild(line);
}

function drawWordPill(path,color){
  const svg=document.getElementById('pills');
  for(let i=0;i<path.length-1;i++) drawPillSegment(path[i],path[i+1],color);
}

/* ---------------- INPUT ---------------- */
function hookInput(gridEl){
  let activePointer=null;

  function updateSel(){
    [...gridEl.children].forEach(c=>c.classList.remove('sel'));
    for(const id of S.path) gridEl.children[id].classList.add('sel');
  }

  gridEl.addEventListener('pointerdown', e=>{
    const el=e.target.closest('.cell'); if(!el) return;
    gridEl.setPointerCapture(e.pointerId); activePointer=e.pointerId;
    S.dragging=true; S.path=[+el.dataset.idx]; S.curDir=[0,0]; S.segLen=0;
    updateSel();
  });

  gridEl.addEventListener('pointermove', e=>{
    if(!S.dragging || e.pointerId!==activePointer) return;
    const lastId=S.path[S.path.length-1];
    const [lr,lc]=rcOf(lastId);
    for(const [dr,dc] of allowedDirs()){
      const rr=lr+dr, cc=lc+dc;
      if(!inb(rr,cc)) continue;
      const nid=idx(rr,cc);
      const prev=S.path[S.path.length-2];
      if(nid!==prev && S.path.includes(nid)) continue;
      const cell=gridEl.children[nid];
      const r=cell.getBoundingClientRect();
      const dx=e.clientX-(r.left+r.width/2);
      const dy=e.clientY-(r.top+r.height/2);
      if(dx*dx+dy*dy<1200){
        if(!S.settings.snake && S.path.length>=1){
          if(S.curDir[0]===0&&S.curDir[1]===0)S.curDir=[dr,dc];
          else if(dr!==S.curDir[0]||dc!==S.curDir[1])return;
        }
        if(prev!=null && nid===prev){S.path.pop();updateSel();return;}
        S.path.push(nid); updateSel(); return;
      }
    }
  });

  gridEl.addEventListener('pointerup', ()=>{
    if(!S.dragging) return;
    S.dragging=false; activePointer=null;
    const w=lettersOf(S.path);
    const i=WORDS.indexOf(w);
    if(i>=0 && !S.found.has(i)){
      S.found.add(i);
      document.getElementById('w'+i).classList.add('done');
      drawWordPill(S.path,'#9adafe');
      msg(`Found ${w}!`);
      checkWin();
    }else msg('Not a word');
    S.path=[]; updateSel();
  });
}

/* ---------------- MESSAGES ---------------- */
function msg(t){
  const m=document.getElementById('msg');
  m.textContent=t; m.classList.add('show');
  setTimeout(()=>m.classList.remove('show'),1100);
}

/* ---------------- WIN ---------------- */
function checkWin(){
  if(S.found.size===WORDS.length){
    msg('Level complete!');
    AudioManager.stopAll();
    AudioManager.play('victory');
    setTimeout(()=>document.body.innerHTML='<h2 style="color:white;text-align:center;margin-top:30vh;">You win! 🎉</h2>',2000);
  }
}

/* ---------------- START ---------------- */
export function start(){
  console.log('Starting Classic Mode...');
  AudioManager.stopAll();
  AudioManager.play('classic', true);
  buildGrid();
  renderBoard();
}
