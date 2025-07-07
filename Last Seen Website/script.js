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

  // Ambient sound design (robust per-section logic)
  const muteBtn = document.getElementById('mute-toggle');
  const panels = Array.from(document.querySelectorAll('.panel'));
  const audios = panels.map(panel => panel.querySelector('.room-audio'));
  let isMuted = true;
  let currentAudio = null;
  let currentSectionIdx = 0;

  audios.forEach(a => { if (a) { a.muted = true; a.volume = 0.7; } });
  muteBtn.textContent = '🔇';

  function setMute(state) {
    isMuted = state;
    audios.forEach(a => { if (a) a.muted = isMuted; });
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    playCurrentRoomAudio(); // Always update playback on mute toggle
  }

  // Intersection Observer for section detection
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.51 // More than half visible
  };

  const panelVisibility = new Array(panels.length).fill(false);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const idx = panels.indexOf(entry.target);
      panelVisibility[idx] = entry.isIntersecting;
    });
    // Find the topmost visible panel (or the one with the largest intersection ratio)
    let maxRatio = 0;
    let maxIdx = 0;
    entries.forEach(entry => {
      const idx = panels.indexOf(entry.target);
      if (entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio;
        maxIdx = idx;
      }
    });
    if (currentSectionIdx !== maxIdx) {
      currentSectionIdx = maxIdx;
      playCurrentRoomAudio();
    }
  }, observerOptions);

  panels.forEach(panel => observer.observe(panel));

  function typewriterEffect(label) {
    if (!label) return;
    const text = label.getAttribute('data-fulltext') || label.innerText;
    label.setAttribute('data-fulltext', text);
    label.innerText = '';
    label.classList.add('typewriter');
    let i = 0;
    function type() {
      label.innerText = text.slice(0, i);
      i++;
      if (i <= text.length) {
        setTimeout(type, 28 + Math.random() * 32);
      } else {
        label.innerText = text;
        label.classList.remove('typewriter');
      }
    }
    type();
  }

  // Randomized labels for demo
  const labelOptions = {
    kitchen: [
      "A faint smell of something burnt lingers here.",
      "The fridge hums, but nothing inside is fresh.",
      "You hear a clock ticking, but see no clock.",
      "The kitchen is colder than it should be."
    ],
    bathroom: [
      "The mirror is fogged, but you see no reflection.",
      "A single drip echoes in the silence.",
      "The tiles are cold, and the air is damp.",
      "You sense someone was just here."
    ],
    basement: [
      "Something moves in the shadows below.",
      "The air is thick with dust and secrets.",
      "A chill runs down your spine.",
      "You hear a faint whisper, but see no one."
    ]
  };

  function getRandomLabel(section) {
    const opts = labelOptions[section];
    if (!opts) return null;
    return opts[Math.floor(Math.random() * opts.length)];
  }

  let lastTypewriterIdx = -1;
  let lastRandomLabel = {};

  function playCurrentRoomAudio() {
    const idx = currentSectionIdx;
    // Debug: log current section index and class
    if (idx !== -1) {
      const panel = panels[idx];
      console.log('Current section index:', idx, 'Class:', panel.className);
      // Typewriter effect for label (only when section changes)
      panels.forEach((p, i) => {
        const label = p.querySelector('.section-label');
        if (i === idx && label) {
          // Randomize label for kitchen, bathroom, basement
          if (i !== 0) { // skip attic
            const section = p.classList.contains('kitchen') ? 'kitchen' : p.classList.contains('bathroom') ? 'bathroom' : p.classList.contains('basement') ? 'basement' : null;
            if (section) {
              let randomLabel = getRandomLabel(section);
              // Avoid repeating the same label consecutively
              while (lastRandomLabel[section] === randomLabel && labelOptions[section].length > 1) {
                randomLabel = getRandomLabel(section);
              }
              lastRandomLabel[section] = randomLabel;
              label.setAttribute('data-fulltext', randomLabel);
            }
          }
          if (lastTypewriterIdx !== idx) {
            typewriterEffect(label);
            lastTypewriterIdx = idx;
          }
        } else if (label) {
          // Reset label to full text if not active
          const full = label.getAttribute('data-fulltext');
          if (full) label.innerText = full;
          label.classList.remove('typewriter');
        }
      });
    } else {
      console.log('No section in view');
    }
    audios.forEach((audio, i) => {
      if (!audio) return;
      if (i === idx && !isMuted) {
        if (audio !== currentAudio) {
          if (currentAudio) currentAudio.pause();
          audio.currentTime = 0;
          audio.play().catch(()=>{});
          currentAudio = audio;
        } else if (audio.paused) {
          audio.play().catch(()=>{});
        }
      } else {
        audio.pause();
      }
    });
  }

  muteBtn.addEventListener('click', () => {
    setMute(!isMuted);
  });

  // Initial call
  setTimeout(playCurrentRoomAudio, 200);

  // Parallax effect for backgrounds has been fully removed.

  // Set --vh custom property for mobile viewport height fix
  function setPanelHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  window.addEventListener('resize', setPanelHeight);
  setPanelHeight();
}); 