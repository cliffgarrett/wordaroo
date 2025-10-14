export const AudioManager = (() => {
  const paths = {
    splash: 'assets/audio/splash.mp3',
    classic: 'assets/audio/classic.mp3',
    lightning: 'assets/audio/lightning.mp3',
    victory: 'assets/audio/victory.mp3'
  };

  const players = {};
  for (const [k, src] of Object.entries(paths)) {
    players[k] = new Audio(src);
    if (k !== 'splash') players[k].loop = true;
  }

  function stopAll() {
    for (const a of Object.values(players)) {
      try { a.pause(); a.currentTime = 0; } catch {}
    }
  }

  async function play(name, loop = false) {
    stopAll();
    const a = players[name];
    if (!a) return;
    a.loop = loop;
    try {
      a.currentTime = 0;
      await a.play();
    } catch (err) {
      console.warn('Audio play blocked:', name, err);
    }
  }

  return { play, stopAll };
})();
