// music.js - Fixed for continuous playback across pages on mobile
(function () {
  const MUSIC_SRC = 'music3.mp3';
  const STORAGE_KEY = 'bgMusicState_v1';
  const SAVE_INTERVAL_MS = 500; // Save more frequently on mobile

  // Create UI container (if not already present)
  if (!document.getElementById('bg-music-ui')) {
    const container = document.createElement('div');
    container.id = 'bg-music-ui';
    container.style = 'position:fixed;right:18px;bottom:18px;z-index:9999;font-family:Arial, sans-serif;';
    container.innerHTML = `
      <button id="bg-play-btn" style="padding:8px 12px;border-radius:8px;border:none;box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer;">
        ▶ Play music
      </button>
    `;
    document.body.appendChild(container);
  }

  // Create audio element (if not already present)
  let audio = document.getElementById('bg-music');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bg-music';
    audio.src = MUSIC_SRC;
    audio.loop = true;
    audio.preload = 'auto';
    audio.style.display = 'none';
    document.body.appendChild(audio);
  }

  const btn = document.getElementById('bg-play-btn');

  // Helpers for state
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
    } catch (e) { /* ignore storage errors */ }
  }

  // Update UI button label
  function updateButton() {
    if (!audio) return;
    if (audio.paused) btn.textContent = '▶ Play music';
    else btn.textContent = '⏸ Pause music';
  }

  // Save state before page unloads (critical for mobile)
  function saveCurrentState() {
    try {
      const state = loadState() || {};
      state.playing = !audio.paused;
      state.time = audio.currentTime || 0;
      state.userInteracted = state.userInteracted || false;
      saveState(state);
    } catch (e) {}
  }

  // When the user clicks play/pause
  btn.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        const state = { playing: true, time: audio.currentTime || 0, userInteracted: true };
        saveState(state);
      } catch (err) {
        console.warn('Play blocked', err);
      }
    } else {
      audio.pause();
      saveState({ playing: false, time: audio.currentTime || 0, userInteracted: true });
    }
    updateButton();
  });

  // Save position regularly (more frequent on mobile)
  setInterval(() => {
    if (!audio.paused) {
      saveCurrentState();
    }
  }, SAVE_INTERVAL_MS);

  // Critical: Save immediately before navigation
  window.addEventListener('beforeunload', saveCurrentState);
  window.addEventListener('pagehide', saveCurrentState);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveCurrentState();
    }
  });

  // Also save periodically during playback
  audio.addEventListener('timeupdate', () => {
    // Save every 2 seconds during playback
    if (!audio.paused && Math.floor(audio.currentTime * 2) % 4 === 0) {
      saveCurrentState();
    }
  });

  // Restore time and play state when page loads
  function restorePlayback() {
    const state = loadState();
    if (!state) {
      updateButton();
      return;
    }

    // Wait for audio to be ready
    const attemptRestore = () => {
      try {
        // Restore time with small offset to account for loading
        if (typeof state.time === 'number' && !isNaN(state.time)) {
          const dur = isFinite(audio.duration) ? audio.duration : Infinity;
          audio.currentTime = Math.max(0, Math.min(state.time, dur - 0.1));
        }

        // Auto-resume if was playing and user has interacted before
        if (state.playing && state.userInteracted) {
          audio.play().catch(() => {
            // Autoplay blocked - user needs to click play
            console.log('Autoplay blocked - click play button to resume');
          });
        }
        
        updateButton();
      } catch (e) {
        console.warn('Restore failed:', e);
      }
    };

    // Try to restore after audio is ready
    if (audio.readyState >= 2) {
      attemptRestore();
    } else {
      audio.addEventListener('canplay', attemptRestore, { once: true });
      // Fallback timeout
      setTimeout(attemptRestore, 1500);
    }
  }

  // Run restoration
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restorePlayback);
  } else {
    restorePlayback();
  }

  // Handle back/forward navigation (mobile browsers)
  window.addEventListener('pageshow', (event) => {
    // If loaded from cache, restore playback
    if (event.persisted) {
      restorePlayback();
    }
  });

  // Keep button updated
  audio.addEventListener('play', updateButton);
  audio.addEventListener('pause', updateButton);

  // Expose for debugging
  window.__bgAudio = audio;
})();