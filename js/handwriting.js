/* =========================================================================
   handwriting.js
   Reveals letter text as though a hand were writing it with a pencil —
   not a typewriter. Characters appear at a natural, uneven pace, a small
   pencil glyph tracks the current writing position, and pencil_write.mp3
   plays only for as long as the hand is actually moving.
   ========================================================================= */

/**
 * Writes `text` into `container` character by character.
 *
 * @param {HTMLElement} container   Element the revealed text lives in.
 * @param {HTMLElement} pencilEl    Small pencil glyph that follows the writing.
 * @param {HTMLAudioElement} pencilAudio  Looping scratch sound for the pencil.
 * @param {string} text             The letter body (plain text, may contain \n).
 * @param {Function} onDone         Called once every character has been written.
 * @returns {{ skip: Function }}    Call .skip() to instantly finish writing.
 */
function writeByHand(container, pencilEl, pencilAudio, text, onDone) {
  container.innerHTML = '';

  // Wrap every character (including spaces) in its own span so we can
  // measure its position for the pencil glyph and fade it in individually.
  // Newlines become <br> and are not wrapped.
  const spans = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    [...line].forEach((ch) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.opacity = '0';
      container.appendChild(span);
      spans.push(span);
    });
    if (lineIndex < lines.length - 1) {
      container.appendChild(document.createElement('br'));
      spans.push(null); // marks a line break: no glyph, just a pause
    }
  });

  let index = 0;
  let finished = false;
  let timeoutId = null;
  const containerRect = container.getBoundingClientRect();

 function placePencilAt(span) {

    if (!span) return;

    const r = span.getBoundingClientRect();

    gsap.to(pencilEl, {
        left: r.left - containerRect.left + 6,
        top: r.top - containerRect.top + 2,
        duration: 0.05,
        ease: "power1.out"
    });

    pencilEl.style.opacity = "1";
}
  function stepDelay(ch) {
    if (ch === null) return 260;               // pause on new line
    if (/[.,!?]/.test(ch)) return 260;          // longer pause at punctuation
    if (ch === '\u00A0') return 55;             // quick over spaces
    return 32 + Math.random() * 55;             // natural uneven pace
  }

  function finish() {
    if (finished) return;
    finished = true;

    // Hentikan timer yang masih berjalan
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }

    spans.forEach((s) => {
        if (s) s.style.opacity = "1";
    });

    pencilEl.style.opacity = "0";
    pencilAudio.pause();
    pencilAudio.currentTime = 0;

    if (onDone) onDone();
}

  function tick() {
    if (finished) return;

    if (index >= spans.length) {
      finish();
      return;
    }

    const span = spans[index];
    if (span) {
      span.style.opacity = '1';
      placePencilAt(span);
      if (pencilAudio.paused) {
        pencilAudio.currentTime = 0;
        pencilAudio.play().catch(() => {});
      }
    }

    const delay = stepDelay(span ? span.textContent : null);
    index++;
    timeoutId = setTimeout(tick, delay);
  }
  const firstSpan = spans.find(s => s !== null);

if (firstSpan) {
    const r = firstSpan.getBoundingClientRect();

    pencilEl.style.left =
        (r.left - containerRect.left + 6) + "px";

    pencilEl.style.top =
        (r.top - containerRect.top + 2) + "px";

    pencilEl.style.opacity = "1";
}
  tick();

  return {
    skip() {
      if (timeoutId) clearTimeout(timeoutId);
      finish();
    },
  };
}
