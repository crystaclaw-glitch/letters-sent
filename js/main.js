/* =========================================================================
   main.js
   Orchestrates the full single-page journey:
   landing -> gather -> choose a letter -> open envelope -> read (by hand)
   -> ending -> back to choose a letter.
   Every transition is a continuous GSAP animation — no reloads, no jumps.
   ========================================================================= */

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Shared state
  // -----------------------------------------------------------------------
  const state = {
    letters: [],
    scatteredEnvelopes: [],   // the 14 landing-page envelopes
    currentLetterIndex: 0,
    soundOn: false,
    isAnimating: false,       // guards against double-clicks mid-transition
  };

  // -----------------------------------------------------------------------
  // DOM references
  // -----------------------------------------------------------------------
  const sceneLanding = document.getElementById('scene-landing');
  const sceneSelection = document.getElementById('scene-selection');
  const sceneReading = document.getElementById('scene-reading');
  const sceneEnding = document.getElementById('scene-ending');

  const envelopeField = document.getElementById('envelope-field');
  const landingCopy = document.querySelector('.landing-copy');
  const beginBtn = document.getElementById('begin-btn');
  const selectionTitle = document.querySelector('.selection-title');
  const selectionEnvelopesEl = document.getElementById('selection-envelopes');

  const paperStage = document.getElementById('paper-stage');
  const paperImg = document.getElementById('paper-img');
  const stampImg = document.getElementById('stamp-img');
  const letterTextEl = document.getElementById('letter-text');
  const pencilCursor = document.getElementById('pencil-cursor');
  const readingNav = document.getElementById('reading-nav');
  const prevBtn = document.getElementById('prev-letter');
  const nextBtn = document.getElementById('next-letter');
  const letterCounter = document.getElementById('letter-counter');

  const restartBtn = document.getElementById('restart-btn');
  const endingLines = [
    document.getElementById('ending-line-1'),
    document.getElementById('ending-line-2'),
    document.getElementById('ending-line-3'),
  ];

  const audioBg = document.getElementById('audio-bg');
  const audioSlide = document.getElementById('audio-slide');
  const audioPencil = document.getElementById('audio-pencil');
  const soundToggle = document.getElementById('sound-toggle');

  // -----------------------------------------------------------------------
  // Sound
  // -----------------------------------------------------------------------
  function tryPlayBgMusic() {
    audioBg.volume = 0.35;
    audioBg.play().then(() => {
      state.soundOn = true;
      updateSoundIcon();
    }).catch(() => { /* blocked until a user gesture arrives */ });
  }

  function updateSoundIcon() {
    soundToggle.querySelector('.icon-sound-on').style.display = state.soundOn ? 'block' : 'none';
    soundToggle.querySelector('.icon-sound-off').style.display = state.soundOn ? 'none' : 'block';
    soundToggle.setAttribute('aria-pressed', String(state.soundOn));
  }

  soundToggle.addEventListener('click', () => {
    if (state.soundOn) {
      audioBg.pause();
      state.soundOn = false;
    } else {
      audioBg.volume = 0.35;
      audioBg.play().catch(() => {});
      state.soundOn = true;
    }
    updateSoundIcon();
  });

  // -----------------------------------------------------------------------
  // Boot
  // -----------------------------------------------------------------------
  async function init() {
    try {
      state.letters = await loadLetters();
    } catch (e) {
      state.letters = [{ title: 'LETTER 1', body: 'The letter could not be found.' }];
    }

    audioSlide.volume = 0.6;
    audioPencil.volume = 0.45;

    state.scatteredEnvelopes = buildScatteredEnvelopes(envelopeField);
    startIdleDrift(state.scatteredEnvelopes);

    // Gentle entrance for the landing copy itself
    gsap.set(landingCopy, { opacity: 0, y: 16 });
    gsap.to(landingCopy, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out', delay: 0.3 });

    beginBtn.addEventListener('click', onBegin, { once: true });
    prevBtn.addEventListener('click', () => goToLetter(state.currentLetterIndex - 1));
    nextBtn.addEventListener('click', onNext);
    restartBtn.addEventListener('click', onRestart);
  }

  // -----------------------------------------------------------------------
  // BEGIN — scattered envelopes gather into exactly three, aligned
  // -----------------------------------------------------------------------
  function onBegin() {
    if (state.isAnimating) return;
    state.isAnimating = true;
    tryPlayBgMusic();

    stopIdleDrift(state.scatteredEnvelopes);

    // Build the (hidden) selection scene ahead of time so we can measure
    // exactly where its three envelopes will live, and animate our
    // scattered envelopes to those precise coordinates for a seamless
    // hand-off between scenes.
    const targets = layoutSelectionEnvelopes(); // returns 3 rects {left, top, size}

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Choose 3 of the 14 scattered envelopes to become the final three.
    const shuffled = [...state.scatteredEnvelopes].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 3);
    const rest = shuffled.slice(3);

    const tl = gsap.timeline({
      onComplete: () => {
        // Fade the landing title/subtitle/button away only now.
        gsap.to(landingCopy, {
          opacity: 0, y: -18, duration: 0.8, ease: 'power2.out',
          onComplete: () => {
            sceneLanding.style.display = 'none';
            sceneSelection.style.display = 'flex';
            gsap.to(selectionTitle, { opacity: 1, duration: 0.9, ease: 'power2.out' });
            state.isAnimating = false;
          },
        });
      },
    });

    // The 11 "extra" envelopes drift inward, shrink, and dissolve —
    // absorbed back into the center as the three true letters emerge.
    rest.forEach((item, i) => {
      tl.to(item.el, {
        left: centerX - item.size / 2 + gsap.utils.random(-30, 30),
        top: centerY - item.size / 2 + gsap.utils.random(-30, 30),
        scale: 0.4,
        opacity: 0,
        rotation: item.baseRotation * 0.3,
        duration: 1.5,
        ease: 'power3.inOut',
      }, i * 0.02);
    });

    // The 3 chosen envelopes travel to the exact selection-scene layout.
    chosen.forEach((item, i) => {
      const t = targets[i];
      tl.to(item.el, {
        left: t.left,
        top: t.top,
        width: t.size,
        rotation: 0,
        duration: 1.7,
        ease: 'power3.inOut',
      }, i * 0.05);
    });
  }

  /**
   * Builds the three "Choose a Letter" envelope elements inside
   * #selection-envelopes (normal flex layout, currently invisible because
   * the scene itself is display:none), then measures their screen rects
   * so the landing scene's envelopes can fly to the exact same spot.
   */
  function layoutSelectionEnvelopes() {
    selectionEnvelopesEl.innerHTML = '';
    const rects = [];

    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      el.className = 'pick-envelope';
      el.dataset.index = String(i);

      const img = document.createElement('img');
      img.src = 'assets/images/envelope_closed.png';
      img.alt = 'A closed envelope, one of three unsent letters';
      el.appendChild(img);

      el.addEventListener('click', () => onEnvelopeChosen(i, el));
      el.addEventListener('mouseenter', () => {
        gsap.to(el, { y: -8, scale: 1.03, duration: 0.35, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { y: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
      });

      selectionEnvelopesEl.appendChild(el);
    }

    // Temporarily reveal off-interaction to measure true layout rects.
    const prevDisplay = sceneSelection.style.display;
    const prevOpacity = sceneSelection.style.opacity;
    sceneSelection.style.display = 'flex';
    sceneSelection.style.visibility = 'hidden';

    [...selectionEnvelopesEl.children].forEach((el) => {
      const r = el.getBoundingClientRect();
      rects.push({ left: r.left, top: r.top, size: r.width });
    });

    sceneSelection.style.display = prevDisplay || 'none';
    sceneSelection.style.visibility = 'visible';
    sceneSelection.style.opacity = prevOpacity || '';

    return rects;
  }

  // -----------------------------------------------------------------------
  // OPEN ENVELOPE — chosen envelope moves to center, paper slides out,
  // then a seamless hand-off into the reading scene.
  // -----------------------------------------------------------------------
  function onEnvelopeChosen(index, envelopeEl) {
    if (state.isAnimating) return;
    state.isAnimating = true;
    state.currentLetterIndex = index;

    const others = [...selectionEnvelopesEl.children].filter((el) => el !== envelopeEl);
    others.forEach((el) => {
      // Pin each to its current viewport position first, so removing the
      // chosen envelope from the flex row doesn't reflow these two.
      const r = el.getBoundingClientRect();
      el.style.position = 'fixed';
      el.style.margin = '0';
      el.style.left = r.left + 'px';
      el.style.top = r.top + 'px';
      el.style.width = r.width + 'px';
      el.style.pointerEvents = 'none';
      gsap.to(el, { y: -60, opacity: 0.25, duration: 0.8, ease: 'power2.out' });
    });

    const img = envelopeEl.querySelector('img');
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const rect = envelopeEl.getBoundingClientRect();
    const targetSize = Math.min(window.innerWidth, window.innerHeight) * 0.34;

    // Lift the chosen envelope out of the flex row and anchor it to the
    // viewport (fixed) at its current on-screen spot, so it can travel
    // freely to screen center without the flex layout fighting it.
    envelopeEl.style.position = 'fixed';
    envelopeEl.style.margin = '0';
    envelopeEl.style.left = rect.left + 'px';
    envelopeEl.style.top = rect.top + 'px';
    envelopeEl.style.width = rect.width + 'px';
    document.body.appendChild(envelopeEl);
    envelopeEl.style.zIndex = 20;

    const tl = gsap.timeline();

    // Lift → travel to center → scale up → rotate → settle straight.
    tl.to(envelopeEl, {
      left: centerX - rect.width / 2,
      top: centerY - rect.height / 2,
      y: -18,
      duration: 0.5,
      ease: 'power2.out',
    })
      .to(envelopeEl, {
        width: targetSize,
        y: 0,
        rotation: 8,
        duration: 0.9,
        ease: 'power3.inOut',
      }, '<0.05')
      .to(envelopeEl, {
        rotation: 0,
        duration: 0.6,
        ease: 'power2.out',
      })
      .call(() => {
        img.src = 'assets/images/envelope_open_with_paper.png';
        audioSlide.currentTime = 0;
        audioSlide.play().catch(() => {});
      })
      .to({}, { duration: 0.15 }); // tiny beat so the new image settles

    // Build a temporary sliding-paper element that rises out of the
    // envelope and grows into exactly the reading scene's paper rect.
    const slidingPaper = document.createElement('img');
    slidingPaper.src = 'assets/images/paper.png';
    slidingPaper.alt = '';
    slidingPaper.style.position = 'fixed';
    slidingPaper.style.zIndex = 21;
    slidingPaper.style.pointerEvents = 'none';
    slidingPaper.style.filter = 'drop-shadow(0 20px 28px rgba(0,0,0,0.45))';
    document.body.appendChild(slidingPaper);

    const targetRect = measureReadingPaperRect();
    const startWidth = targetSize * 0.66;
    const startHeight = startWidth * 1.29;
    const startLeft = centerX - startWidth / 2;
    const startTop = centerY - startHeight * 0.62;

    gsap.set(slidingPaper, {
      left: startLeft, top: startTop, width: startWidth, height: startHeight * 0.35, opacity: 0,
    });

    tl.to(slidingPaper, {
      opacity: 1,
      duration: 0.25,
      ease: 'power1.out',
    }, '-=0.1')
      .to(slidingPaper, {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height,
        duration: 1.1,
        ease: 'power3.inOut',
      }, '<')
      .to(envelopeEl, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      }, '-=0.5')
      .call(() => {
        // Seamless crossfade: the real reading scene fades in at the
        // exact same rect the sliding paper just arrived at.
        sceneReading.style.display = 'flex';
        sceneReading.style.opacity = '0';
        gsap.to(sceneReading, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            slidingPaper.remove();
            envelopeEl.remove();
            sceneSelection.style.display = 'none';
            // reset selection scene styles for its next visit
            gsap.set(selectionTitle, { opacity: 0 });
            beginReadingLetter(state.currentLetterIndex, true);
            state.isAnimating = false;
          },
        });
      });
  }

  /**
   * Measures where #paper-stage naturally sits (the reading scene is
   * momentarily shown off-screen-invisible to get an accurate rect).
   */
  function measureReadingPaperRect() {
    const prevDisplay = sceneReading.style.display;
    const prevVisibility = sceneReading.style.visibility;
    sceneReading.style.display = 'flex';
    sceneReading.style.visibility = 'hidden';
    const r = paperStage.getBoundingClientRect();
    sceneReading.style.display = prevDisplay || 'none';
    sceneReading.style.visibility = prevVisibility || 'visible';
    return r;
  }

  // -----------------------------------------------------------------------
  // READING — handwriting reveal, stamp, navigation
  // -----------------------------------------------------------------------
  let activeWriter = null;

  function beginReadingLetter(index, isFirstOpen) {
    const letter = state.letters[index];
    if (!letter) return;

    stampImg.src = index % 2 === 0
      ? 'assets/images/postage_stamp1.png'
      : 'assets/images/postage_stamp2.png';

    updateLetterCounter(index);
    updateNavButtons(index, true);

    if (activeWriter) activeWriter.skip();

    // The nav is hidden while the hand is writing, and only offered once
    // the letter is fully written — every time a letter is (re)written.
    gsap.set(readingNav, { opacity: 0 });

    activeWriter = writeByHand(letterTextEl, pencilCursor, audioPencil, letter.body, () => {
      gsap.to(readingNav, { opacity: 1, duration: 0.7, ease: 'power2.out' });
      updateNavButtons(index, false);
    });
  }

  function updateLetterCounter(index) {
    letterCounter.textContent = `Letter ${index + 1} of ${state.letters.length}`;
  }

  function updateNavButtons(index, isWriting) {
    prevBtn.disabled = isWriting || index === 0;
    nextBtn.disabled = isWriting;
  }

  function goToLetter(index) {
    if (state.isAnimating) return;
    if (index < 0 || index >= state.letters.length) return;

    state.isAnimating = true;
    gsap.to(letterTextEl, {
      opacity: 0,
      duration: 0.45,
      ease: 'power2.out',
      onComplete: () => {
        state.currentLetterIndex = index;
        gsap.to(letterTextEl, { opacity: 1, duration: 0.3 });
        beginReadingLetter(index, false);
        state.isAnimating = false;
      },
    });
  }

  function onNext() {
    if (state.isAnimating || nextBtn.disabled) return;
    if (state.currentLetterIndex >= state.letters.length - 1) {
      goToEnding();
    } else {
      goToLetter(state.currentLetterIndex + 1);
    }
  }

  // -----------------------------------------------------------------------
  // ENDING
  // -----------------------------------------------------------------------
  function goToEnding() {
    state.isAnimating = true;
    gsap.to(sceneReading, {
      opacity: 0,
      duration: 0.9,
      ease: 'power2.out',
      onComplete: () => {
        sceneReading.style.display = 'none';
        sceneEnding.style.display = 'flex';
        sceneEnding.style.opacity = '1';
        playEndingSequence();
      },
    });
  }

  function playEndingSequence() {
    gsap.set(endingLines, { opacity: 0, y: 12 });
    gsap.set(restartBtn, { opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => { state.isAnimating = false; },
    });

    tl.to(endingLines[0], { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out' })
      .to({}, { duration: 1.3 }) // pause
      .to(endingLines[1], { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out' })
      .to({}, { duration: 1.3 }) // pause
      .to(endingLines[2], { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' })
      .to(restartBtn, { opacity: 1, duration: 0.9, ease: 'power2.out' }, '-=0.2');
  }

  function onRestart() {
    if (state.isAnimating) return;
    state.isAnimating = true;

    gsap.to(sceneEnding, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        sceneEnding.style.display = 'none';

        // Rebuild a fresh three-envelope choice, centered, ready to open.
        layoutSelectionEnvelopes();
        sceneSelection.style.display = 'flex';
        sceneSelection.style.opacity = '0';
        gsap.to(sceneSelection, {
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(selectionTitle, { opacity: 1, duration: 0.6 });
            state.isAnimating = false;
          },
        });
      },
    });
  }

  // -----------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', init);
})();
