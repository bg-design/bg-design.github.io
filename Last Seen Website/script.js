// script.js
// Placeholder for TV static effect or countdown in the .tv-static div 

// Dust motes effect for attic
window.addEventListener('DOMContentLoaded', () => {
  const attic = document.querySelector('.panel.attic');
  const canvas = attic.querySelector('.dust-overlay');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = attic.offsetWidth;
    canvas.height = attic.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Dust mote properties
  const NUM_MOTES = 32;
  const motes = [];
  for (let i = 0; i < NUM_MOTES; i++) {
    motes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.5 + Math.random() * 1.0,
      alpha: 0.08 + Math.random() * 0.12,
      speed: 0.1 + Math.random() * 0.15,
      drift: (Math.random() - 0.5) * 0.2
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const m of motes) {
      ctx.save();
      ctx.globalAlpha = m.alpha;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 2 * Math.PI);
      ctx.fillStyle = '#fffbe6';
      ctx.shadowColor = '#fffbe6';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
      m.x += m.drift;
      m.y -= m.speed;
      if (m.y + m.r < 0) {
        m.x = Math.random() * canvas.width;
        m.y = canvas.height + m.r;
      }
      if (m.x < 0) m.x = canvas.width;
      if (m.x > canvas.width) m.x = 0;
    }
    requestAnimationFrame(animate);
  }
  animate();

  // Basement flicker effect: cinematic sequence
  const basement = document.querySelector('.panel.basement');
  const glow = basement.querySelector('.flicker-glow');
  const darken = basement.querySelector('.basement-darken');
  if (glow && darken) {
    function flickerSequence() {
      // Start mostly dark
      glow.style.opacity = 0;
      darken.style.opacity = 1;
      // Flicker a few times
      let flickers = 2 + Math.floor(Math.random() * 2); // 2-3 flickers
      function doFlicker() {
        if (flickers-- > 0) {
          setTimeout(() => {
            glow.style.opacity = 0.7 + Math.random() * 0.3;
            glow.style.filter = `blur(${2.2 + Math.random() * 1.2}px) brightness(${0.8 + Math.random() * 0.5})`;
            darken.style.opacity = 0;
            setTimeout(() => {
              glow.style.opacity = 0;
              darken.style.opacity = 1;
              doFlicker();
            }, 80 + Math.random() * 120);
          }, 120 + Math.random() * 180);
        } else {
          // Stay on for a couple seconds
          setTimeout(() => {
            glow.style.opacity = 0.8;
            glow.style.filter = `blur(2.5px) brightness(1.1)`;
            darken.style.opacity = 0;
            setTimeout(() => {
              // Back to dark, repeat
              glow.style.opacity = 0;
              darken.style.opacity = 1;
              setTimeout(flickerSequence, 1200 + Math.random() * 1800);
            }, 1800 + Math.random() * 1200); // on for 1.8-3s
          }, 120 + Math.random() * 180);
        }
      }
      doFlicker();
    }
    flickerSequence();
  }

  // Ambient sound design
  const muteBtn = document.getElementById('mute-toggle');
  const audios = Array.from(document.querySelectorAll('.room-audio'));
  let isMuted = true;
  let currentAudio = null;

  // Start all audio muted
  audios.forEach(a => { a.muted = true; a.volume = 0.7; });
  muteBtn.textContent = '🔇';

  function setMute(state) {
    isMuted = state;
    audios.forEach(a => a.muted = isMuted);
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
  }

  muteBtn.addEventListener('click', () => {
    setMute(!isMuted);
  });

  // Helper: find the currently visible section
  function getCurrentSectionIndex() {
    const panels = Array.from(document.querySelectorAll('.panel'));
    const scrollY = window.scrollY + window.innerHeight / 2;
    return panels.findIndex(panel => {
      const rect = panel.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = rect.bottom + window.scrollY;
      return scrollY >= top && scrollY < bottom;
    });
  }

  function playCurrentRoomAudio() {
    const idx = getCurrentSectionIndex();
    audios.forEach((audio, i) => {
      if (i === idx) {
        if (audio !== currentAudio) {
          if (currentAudio) currentAudio.pause();
          audio.currentTime = 0;
          audio.play().catch(()=>{});
          currentAudio = audio;
        }
      } else {
        audio.pause();
      }
    });
  }

  // Play correct audio on scroll and on load
  window.addEventListener('scroll', playCurrentRoomAudio);
  window.addEventListener('resize', playCurrentRoomAudio);
  setTimeout(playCurrentRoomAudio, 200);
}); 