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
    'living-room': [
      "The TV is on, but only static fills the screen.",
      "The couch is empty, but you sense someone was just here.",
      "A faint glow flickers from the television.",
      "The remote is missing, and the static never ends."
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
    ],
    contact: [
      "Leave a message after the static…",
      "Sometimes, the only way out is to call for help.",
      "The clock ticks, but no one answers.",
      "Your words may echo in the void."
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
        const contactPhrases = p.querySelector('.contact-phrases');
        if (i === idx && label) {
          // Randomize label for living-room, bathroom, basement, contact
          if (i !== 0) { // skip attic
            const section = p.classList.contains('living-room') ? 'living-room' :
                            p.classList.contains('bathroom') ? 'bathroom' :
                            p.classList.contains('basement') ? 'basement' :
                            p.classList.contains('contact') ? 'contact' : null;
            if (section) {
              let randomLabel = getRandomLabel(section);
              // Avoid repeating the same label consecutively
              while (lastRandomLabel[section] === randomLabel && labelOptions[section].length > 1) {
                randomLabel = getRandomLabel(section);
              }
              lastRandomLabel[section] = randomLabel;
              if (section === 'contact' && contactPhrases) {
                contactPhrases.setAttribute('data-fulltext', randomLabel);
              } else {
                label.setAttribute('data-fulltext', randomLabel);
              }
            }
          }
          if (lastTypewriterIdx !== idx) {
            if (panel.classList.contains('contact') && contactPhrases) {
              typewriterEffect(contactPhrases);
            } else {
              typewriterEffect(label);
            }
            lastTypewriterIdx = idx;
          }
        } else {
          // Reset label to full text if not active
          if (contactPhrases) {
            const full = contactPhrases.getAttribute('data-fulltext');
            if (full) contactPhrases.innerText = full;
            contactPhrases.classList.remove('typewriter');
          }
          if (label) {
            const full = label.getAttribute('data-fulltext');
            if (full) label.innerText = full;
            label.classList.remove('typewriter');
          }
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

    // Set the contact page audio volume to normal
    panels.forEach((panel, i) => {
      const audio = audios[i];
      if (!audio) return;
      if (panel.classList.contains('contact')) {
        audio.volume = 1.0;
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

  // Living room dust motes effect
  const livingRoom = document.querySelector('.panel.living-room');
  const livingCanvas = livingRoom ? livingRoom.querySelector('.living-dust') : null;
  if (livingCanvas) {
    const ctx = livingCanvas.getContext('2d');
    function resizeLivingCanvas() {
      livingCanvas.width = livingRoom.offsetWidth;
      livingCanvas.height = livingRoom.offsetHeight;
    }
    resizeLivingCanvas();
    window.addEventListener('resize', resizeLivingCanvas);
    // Force resize when living room becomes visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) resizeLivingCanvas();
      });
    }, { threshold: 0.1 });
    observer.observe(livingRoom);
    const NUM_MOTES = 18;
    const motes = [];
    for (let i = 0; i < NUM_MOTES; i++) {
      motes.push({
        x: Math.random() * livingCanvas.width,
        y: Math.random() * livingCanvas.height,
        r: 1.2 + Math.random() * 1.6,
        alpha: 0.07 + Math.random() * 0.09,
        speed: 0.04 + Math.random() * 0.09,
        drift: (Math.random() - 0.5) * 0.12
      });
    }
    function animateLivingDust() {
      ctx.clearRect(0, 0, livingCanvas.width, livingCanvas.height);
      for (const m of motes) {
        ctx.save();
        ctx.globalAlpha = m.alpha;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff7c2';
        ctx.shadowColor = '#fff7c2';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();
        m.x += m.drift;
        m.y -= m.speed;
        if (m.y + m.r < 0) {
          m.x = Math.random() * livingCanvas.width;
          m.y = livingCanvas.height + m.r;
        }
        if (m.x < 0) m.x = livingCanvas.width;
        if (m.x > livingCanvas.width) m.x = 0;
      }
      requestAnimationFrame(animateLivingDust);
    }
    animateLivingDust();
  }
});

// Modal functionality - moved outside main event listener
document.addEventListener('DOMContentLoaded', function() {
  const modalOverlay = document.getElementById('modal-overlay');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.querySelector('.modal-close');

  console.log('Modal elements found:', { modalOverlay, modalBody, modalClose });

  // Bio content
  const bios = {
    quinn: {
      title: 'About Quinn',
      content: `
        <h2>Quinn</h2>
        <p><strong>Lead Investigator & Host</strong></p>
        <p>Quinn has been investigating mysterious disappearances for over a decade. A former investigative journalist, they turned to podcasting after discovering a pattern of unexplained vanishings in abandoned locations throughout the country.</p>
        <p>Known for their methodical approach and ability to find connections others miss, Quinn brings a unique perspective to each case. Their background in journalism provides the foundation for thorough research and compelling storytelling.</p>
        <p>When not investigating disappearances, Quinn can be found exploring forgotten places, documenting their findings, and piecing together the stories of those who never returned from the Twilight Zone.</p>
      `
    },
    allie: {
      title: 'About Allie',
      content: `
        <h2>Allie</h2>
        <p><strong>Technical Producer & Researcher</strong></p>
        <p>Allie handles the technical aspects of the podcast, from audio production to digital research. With a background in sound engineering and a fascination with the unexplained, they bring both technical expertise and creative vision to each episode.</p>
        <p>Their work includes field recording in abandoned locations, audio restoration of found recordings, and deep-dive research into historical cases. Allie's attention to detail has uncovered crucial evidence in several investigations.</p>
        <p>Allie believes that every sound, every detail, and every piece of evidence tells a story. Their technical skills help bring those stories to life for listeners, creating an immersive experience that draws audiences deeper into each mystery.</p>
      `
    }
  };

  // Check if modal elements exist
  if (!modalOverlay || !modalBody || !modalClose) {
    console.error('Modal elements not found:', { modalOverlay, modalBody, modalClose });
    return;
  }

  // About link clicks
  document.addEventListener('click', function(e) {
    console.log('Click detected on:', e.target);
    if (e.target.classList.contains('about-link')) {
      e.preventDefault();
      const modalType = e.target.getAttribute('data-modal');
      console.log('About link clicked:', modalType);
      openModal(modalType);
    }
  });

  // Close modal
  modalClose.addEventListener('click', function() {
    console.log('Close button clicked');
    closeModal();
  });
  
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      console.log('Overlay clicked');
      closeModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      console.log('Escape key pressed');
      closeModal();
    }
  });

  function openModal(type) {
    console.log('Opening modal for:', type);
    const bio = bios[type];
    if (bio) {
      modalBody.innerHTML = bio.content;
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      console.log('Modal opened:', type);
    } else {
      console.error('Bio not found for type:', type);
    }
  }

  function closeModal() {
    console.log('Closing modal');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }

  // Test modal function (for debugging)
  window.testModal = function() {
    console.log('Testing modal...');
    openModal('quinn');
  };
}); 