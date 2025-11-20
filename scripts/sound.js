export const SoundManager = (() => {
  const sounds = {};
  const basePaths = {
    core: './assets/audio/',
    modes: './modes/',
  };

  function load(name, path) {
    sounds[name] = new Audio(path);
  }

  function play(name, loop = false) {
    const s = sounds[name];
    if (!s) return;
    stopAll();
    s.loop = loop;
    s.currentTime = 0;
    s.play().catch(() => {});
  }

  function stopAll() {
    Object.values(sounds).forEach(a => {
      try { a.pause(); a.currentTime = 0; } catch {}
    });
  }

  function playOverlay(name) {
  const s = sounds[name];
  if (!s) return;

  try {
    const clone = s.cloneNode();
    clone.play().catch(() => {});
  } catch (e) {
    // fail silently
  }
}

  return { load, play, stopAll, playOverlay };
})();
