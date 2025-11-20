import { createAudio } from './audio.js';
import { Classic }     from './modes/classic.js';
import { Lightning }   from './modes/lightning.js';

// export so modes can call audio
export const audio = createAudio();
audio.registerLoop('classic',   './assets/audio/classic.mp3',   {volume:.45});
audio.registerLoop('lightning', './assets/audio/lightning.mp3', {volume:.55});

const modes = { classic: Classic, lightning: Lightning };
let active = null;

async function switchMode(key){
  if (active?.exit) active.exit();
  active = modes[key];
  await active.enter();
}

document.getElementById('btnClassic').addEventListener('click', ()=> switchMode('classic'));
document.getElementById('btnLightning').addEventListener('click',()=> switchMode('lightning'));

// boot: Classic
switchMode('classic');