// assets/mode/lightning.js
import { AudioManager } from '../../js/audio.js';

const WORDS = ['BIRD','BUG','CLOUD','DRAGON','KITE','EMIT'];
const BAG = "EEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNRRRRRSSSSTTTTTDLLLLUGGBBCCMMPPFFHHVVWWYKJXQZ";
const GRID_ROWS = 7, GRID_COLS = 6;

let S = {
  grid: [], placed: [], found: new Set(),
  dragging:false, path:[], curDir:[0,0], segLen:0,
  settings:{ snake:true }
};

/* ---------------- HELPERS ---------------- */
const idx=(r,c)=>r*GRID_COLS+c;
const inb=(r,c)=>r>=0&&c>=0&&r<GRID_ROWS&&c<GRID_COLS;
const rcOf=id=>[Math.floor(id/GRID_COLS),id%GRID_COLS];
const R=n=>Math.floor(Math.random()*n);
const lettersOf=path=>path.map(id=>S.grid[id]).join('');

function buildGrid(){
  S.grid=Array(GRID_ROWS*GRID_COLS).fill('');
  S.placed=[]; S.found.clear();
  for(const w of WORDS) tryPlace(w);
  for(let i=0;i<S.grid.length;i++) if(!S.grid[i]) S.grid[i]=BAG[R(BAG.length)];
}
function allowedDirs(){return [[0,1],[1,0],[1,1],[1,-1],[-1,1],[-1,-1],[0,-1],[-1,0]];}
function tryPlace(word){
  const W=word.split('');
  for(let t=0;t<400;t++){
    const dir=allowedDirs()[R(8)];
    const r0=R(GRID_ROWS), c0=R(GRID_COLS);
    const r1=r0+dir[0]*(W.length-1), c1=c0+dir[1]*(W.length-1);
    if(!inb(r1,c1)) continue;
    let ok=true, path=[];
    for(let k=0;k<W.length;k++){
      const r=r0+dir[0]*k, c=c0+dir[1]*k, id=idx(r,c);
      if(S.grid[id] && S.grid[id]!==W[k]){ ok=false; break; }
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
  <section id="lightningBoard">
    <div class="stormFX"></div>
    <div id="lightningWrap">
      <div id="msg"></div>
      <div id="wordList" class="words"></div>
      <div class="boardWrap">
        <svg id="pills" class="pills"></svg>
        <div id="grid" class="grid"></div>
      </div>
    </div>
  </section>
  `;

  const gridEl=document.getElementById('grid');
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

  setupStormFX();
  hookInput(gridEl);
}

/* ---------------- PILL DRAWING ---------------- */
function cellCenter(id){
  const el=document.querySelector(`.cell[data-idx="${id}"]`);
  if(!el) return null;
  const r=el.getBoundingClientRect();
  const host=document.getElementById('grid').getBoundingClientRect();
  return { x:r.left-host.left+r.width/2, y:r.top-host.top+r.height/2, w:r.width, h:r.height };
}

function drawPillSegment(a,b,color='rgba(150,200,255,.85)'){
  const A=cellCenter(a), B=cellCenter(b); if(!A||!B) return;
  const dx=B.x-A.x, dy=B.y-A.y, len=Math.hypot(dx,dy);
  const t=Math.min(A.w,A.h)*0.7, ang=Math.atan2(dy,dx)*180/Math.PI;
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',A.x); line.setAttribute('y1',A.y);
  line.setAttribute('x2',B.x); line.setAttribute('y2',B.y);
  line.setAttribute('stroke',color);
  line.setAttribute('stroke-width',t);
  line.setAttribute('stroke-linecap','round');
  line.style.filter='drop-shadow(0 0 8px #9ad7ff)';
  document.getElementById('pills').appendChild(line);
}

function drawWordPill(path,color){
  for(let i=0;i<path.length-1;i++) drawPillSegment(path[i],path[i+1],color);
}

/* ---------------- INPUT ---------------- */
function hookInput(gridEl){
  let activePointer=null;
  function updateSel(){
    [...gridEl.children].forEach(c=>c.classList.remove('sel'));
    for(const id of S.path) gridEl.children[id].classList.add('sel');
  }

  gridEl.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.cell'); if(!el) return;
    gridEl.setPointerCapture(e.pointerId); activePointer=e.pointerId;
    S.dragging=true; S.path=[+el.dataset.idx]; S.curDir=[0,0]; S.segLen=0; updateSel();
  });

  gridEl.addEventListener('pointermove',e=>{
    if(!S.dragging||e.pointerId!==activePointer) return;
    const last=S.path.at(-1); const [lr,lc]=rcOf(last);
    for(const [dr,dc] of allowedDirs()){
      const rr=lr+dr,cc=lc+dc;
      if(!inb(rr,cc)) continue;
      const nid=idx(rr,cc),prev=S.path[S.path.length-2];
      if(nid!==prev && S.path.includes(nid)) continue;
      const cell=gridEl.children[nid];
      const r=cell.getBoundingClientRect();
      const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
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

  gridEl.addEventListener('pointerup',()=>{
    if(!S.dragging) return;
    S.dragging=false; activePointer=null;
    const w=lettersOf(S.path);
    const i=WORDS.indexOf(w);
    if(i>=0 && !S.found.has(i)){
      S.found.add(i);
      document.getElementById('w'+i).classList.add('done');
      drawWordPill(S.path,'#9ad7ff');
      msg(`⚡ ${w}!`);
      flash();
      checkWin();
    } else msg('Not a word');
    S.path=[]; updateSel();
  });
}

/* ---------------- LIGHTNING FX ---------------- */
let stormLoop=null, rainBack=[], rainFront=[], bolts=[];

function setupStormFX(){
  const fx=document.querySelector('.stormFX');
  fx.innerHTML=`
    <canvas id="rainBack"></canvas>
    <canvas id="rainFront"></canvas>
    <canvas id="bolts"></canvas>
  `;
  fx.style.position='fixed';
  fx.style.inset='0';
  fx.style.zIndex='0';
  fx.style.pointerEvents='none';
  fx.style.background='radial-gradient(circle at 50% 30%, #10131a, #070a0f 80%)';

  const c1=fx.querySelector('#rainBack'), c2=fx.querySelector('#rainFront'), c3=fx.querySelector('#bolts');
  [c1,c2,c3].forEach(c=>{c.width=innerWidth; c.height=innerHeight;});
  const ctx1=c1.getContext('2d'), ctx2=c2.getContext('2d'), ctx3=c3.getContext('2d');

  rainBack=Array.from({length:280},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,l:10+Math.random()*18}));
  rainFront=Array.from({length:340},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,l:12+Math.random()*22}));
  bolts=[];

  function drawRain(arr,ctx,speed){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.strokeStyle='rgba(180,200,255,0.25)';
    ctx.lineWidth=1;
    ctx.lineCap='round';
    for(const r of arr){
      ctx.beginPath();
      ctx.moveTo(r.x,r.y);
      ctx.lineTo(r.x+r.l*0.2,r.y+r.l);
      ctx.stroke();
      r.x+=0.6; r.y+=speed;
      if(r.x>innerWidth||r.y>innerHeight){r.x=Math.random()*innerWidth;r.y=-20;}
    }
  }

  function makeBolt(){
    const x=Math.random()*innerWidth;
    const path=[{x,y:0}];
    for(let i=0;i<20;i++){
      const prev=path[path.length-1];
      path.push({x:prev.x+(Math.random()-0.5)*40,y:prev.y+Math.random()*50});
    }
    bolts.push({path,life:0.4});
    AudioManager.play('thunder_crack');
  }

  function drawBolts(ctx){
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba(255,255,255,0.02)';
    ctx.fillRect(0,0,innerWidth,innerHeight);
    bolts.forEach((b,i)=>{
      ctx.strokeStyle=`rgba(255,255,255,${b.life})`;
      ctx.lineWidth=2;
      ctx.beginPath();
      b.path.forEach((p,j)=>{if(j)ctx.lineTo(p.x,p.y); else ctx.moveTo(p.x,p.y);});
      ctx.stroke();
      b.life-=0.02;
      if(b.life<=0)bolts.splice(i,1);
    });
  }

  function loop(){
    drawRain(rainBack,ctx1,3.8);
    drawRain(rainFront,ctx2,6.2);
    drawBolts(ctx3);
    if(Math.random()<0.008) makeBolt();
    stormLoop=requestAnimationFrame(loop);
  }

  cancelAnimationFrame(stormLoop);
  loop();
}

  function flash(){
    const fx=document.querySelector('.stormFX');
    if(!fx) return;
    fx.classList.add('flash');
    // play thunder rumble / crack randomly
    const pick = Math.random() < 0.5 ? 'thunder_crack' : 'thunder_rumble';
    AudioManager.play(pick);
    setTimeout(()=>fx.classList.remove('flash'), 180);
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
    msg('Electrifying!');
    AudioManager.stopAll();
    AudioManager.play('victory');
    setTimeout(()=>document.body.innerHTML='<h2 style="color:white;text-align:center;margin-top:30vh;">You survived the storm! ⚡🎉</h2>',2000);
  }
}

/* ---------------- START ---------------- */
export async function start(){
  console.log('Starting Lightning Mode...');
  // unlock audio context after click (guaranteed user gesture)
  if (AudioManager.userInit) await AudioManager.userInit();

  AudioManager.stopAll();
  AudioManager.play('lightning', true);
  buildGrid();
  renderBoard();

  // trigger first thunder after 1 second
  setTimeout(()=>flash(), 1000);
}
