// music.js
(function () {
  const MUSIC_SRC = 'music3.mp3';
  const STORAGE_KEY = 'bgMusicState_v1';
  const SAVE_INTERVAL_MS = 1000;

  // Create UI container
  const container = document.createElement('div');
  container.id = 'bg-music-ui';
  container.style = 'position:fixed;right:18px;bottom:18px;z-index:9999;font-family:Arial, sans-serif;';
  container.innerHTML = `
    <button id="bg-play-btn" style="padding:8px 12px;border-radius:8px;border:none;box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer;">
      ▶ Play music
    </button>
  `;
  document.body.appendChild(container);

  // Create audio element (hidden)
  const audio = document.createElement('audio');
  audio.id = 'bg-music';
  audio.src = MUSIC_SRC;
  audio.loop = true;
  audio.preload = 'auto';
  audio.style.display = 'none';
  document.body.appendChild(audio);

  // Load saved state
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  // Check if this is index.html
  const isIndexPage = window.location.pathname.endsWith('index.html') || 
                      window.location.pathname === '/' || 
                      window.location.pathname.endsWith('/');

  // If on index.html, reset the music position
  if (isIndexPage) {
    saveState({ playing: false, time: 0 });
  }

  // Restore position & play state (when allowed)
  const state = loadState();
  if (state && typeof state.time === 'number') {
    audio.addEventListener('loadedmetadata', () => {
      const dur = isFinite(audio.duration) ? audio.duration : Infinity;
      let t = Math.min(state.time || 0, Math.max(0, dur - 0.1));
      if (isFinite(t)) {
        try { audio.currentTime = t; } catch (e) { /* ignore */ }
      }
      if (state.playing) {
        audio.play().catch(()=>{});
      }
    }, { once: true });
  }

  // Update UI button label
  const btn = document.getElementById('bg-play-btn');
  function updateButton() {
    if (!audio) return;
    if (audio.paused) btn.textContent = '▶ Play music';
    else btn.textContent = '⏸ Pause music';
  }
  updateButton();

  // Button behaviour
  btn.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        saveState({ playing: true, time: audio.currentTime });
      } catch (err) {
        console.warn('Autoplay blocked or error playing audio', err);
      }
    } else {
      audio.pause();
      saveState({ playing: false, time: audio.currentTime });
    }
    updateButton();
  });

  // Keep saving position frequently
  const saver = setInterval(() => {
    saveState({ playing: !audio.paused, time: audio.currentTime });
  }, SAVE_INTERVAL_MS);

  // Save one last time before unload
  window.addEventListener('pagehide', () => {
    saveState({ playing: !audio.paused, time: audio.currentTime });
  });

  // Update button when playback changes
  audio.addEventListener('play', updateButton);
  audio.addEventListener('pause', updateButton);

  // Optional: expose controls for debugging
  window.__bgAudio = audio;
})();