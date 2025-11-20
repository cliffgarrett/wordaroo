import { resetLevel } from '../core.js';
import { audio } from '../main.js';

function makeStorm() {
  const host = document.getElementById('storm');
  const back = document.getElementById('stormBack');
  const front = document.getElementById('stormFront');
  const bolt = document.getElementById('stormBolts');
  const b = back.getContext('2d'), f = front.getContext('2d'), l = bolt.getContext('2d');
  let W=0,H=0, raf=null, dropsB=[], dropsF=[], next=0, nextThunder=0;

  const rand=(a,b)=> a + Math.random()*(b-a);

  // two extra Audio objects for thunder
  const thunderCrack  = new Audio('./assets/audio/thunder_crack.mp3');
  const thunderRumble = new Audio('./assets/audio/thunder_rumble.mp3');
  thunderCrack.volume = 0.9;
  thunderRumble.volume= 0.6;

  function playThunder(){
    if (Math.random() < 0.6) {
      thunderCrack.currentTime = 0;
      thunderCrack.play().catch(()=>{});
    } else {
      thunderRumble.currentTime = 0;
      thunderRumble.play().catch(()=>{});
    }
  }

  function resize(){
    [back,front,bolt].forEach(cv=>{ cv.width=innerWidth; cv.height=innerHeight; });
    W=innerWidth; H=innerHeight;
    dropsB = Array.from({length:360}, ()=>({x:rand(0,W), y:rand(0,H), l:rand(8,26)}));
    dropsF = Array.from({length:420}, ()=>({x:rand(0,W), y:rand(0,H), l:rand(10,30)}));
  }

  function rain(arr, ctx, speed){
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba(174,194,224,.45)';
    ctx.lineWidth=1; ctx.lineCap='round';
    for (const r of arr){
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.l*0.2, r.y + r.l); ctx.stroke();
      r.x += 0.8; r.y += speed;
      if (r.x>W || r.y>H){ r.x = rand(0,W); r.y = -20; }
    }
  }

  function zap(){
    l.fillStyle='rgba(255,255,255,.05)'; l.fillRect(0,0,W,H);
    const x = rand(60, W-60), y = rand(0, H/4);
    l.strokeStyle='rgba(255,255,255,.12)'; l.lineWidth=5;
    l.beginPath(); l.moveTo(x,y);
    const n = 40+Math.random()*40;
    let px=x, py=y;
    for (let i=0;i<n;i++){
      px += rand(-18,18); py += rand(4,22);
      l.lineTo(px,py);
    }
    l.stroke();
  }

  function tick(t){
    rain(dropsB,b,22); rain(dropsF,f,28);
    if (t>next){ zap(); next = t + 1200 + Math.random()*2600; }
    if (t>nextThunder){ playThunder(); nextThunder = t + 2500 + Math.random()*6000; }
    raf = requestAnimationFrame(tick);
  }

  function start(){ resize(); host.classList.remove('hide'); raf=requestAnimationFrame(tick); }
  function stop(){ cancelAnimationFrame(raf); raf=null; [b,f,l].forEach(c=>c.clearRect(0,0,W,H)); host.classList.add('hide'); }

  addEventListener('resize', resize);
  return { start, stop };
}

const Storm = makeStorm();

export const Lightning = {
  key: 'lightning',
  async enter(){
    document.body.classList.add('mode-lightning');
    Storm.start();
    await audio.playLoop('lightning');   // plays assets/audio/lightning.mp3
    resetLevel();
  },
  exit(){
    Storm.stop();
  }
};
