/* =========================================================================
   envelopes.js
   Populates the landing scene with scattered closed envelopes and gives
   each one its own independent, endlessly looping idle drift — as if a
   dozen unsent letters were quietly breathing on top of a desk.
   ========================================================================= */

const ENVELOPE_COUNT = 14;

/**
 * Random helper: float between min and max.
 */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Builds ENVELOPE_COUNT closed-envelope elements, positioned around the
 * edges of the screen (the center is deliberately left empty), each with
 * a slightly different size and rotation. Returns the array of DOM
 * elements created, together with the idle GSAP tweens driving them, so
 * the caller can later kill those tweens and reuse the elements for the
 * "gather to center" transition.
 */
function buildScatteredEnvelopes(container) {
  container.innerHTML = '';
  const envelopes = [];
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Keep a generous empty zone at the center for the title copy.
  const centerZoneW = w * 0.46;
  const centerZoneH = h * 0.62;
  const centerLeft = (w - centerZoneW) / 2;
  const centerTop = (h - centerZoneH) / 2;

  function overlapsCenter(x, y, size) {
    return (
      x + size > centerLeft &&
      x < centerLeft + centerZoneW &&
      y + size > centerTop &&
      y < centerTop + centerZoneH
    );
  }

  for (let i = 0; i < ENVELOPE_COUNT; i++) {
    const size = rand(90, 168);
    let x, y, attempts = 0;
    do {
      x = rand(-size * 0.3, w - size * 0.7);
      y = rand(-size * 0.2, h - size * 0.7);
      attempts++;
    } while (overlapsCenter(x, y, size) && attempts < 30);

    const rotation = rand(-22, 22);

    const el = document.createElement('div');
    el.className = 'scattered-envelope';
    el.style.width = size + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = `rotate(${rotation}deg)`;
    el.dataset.baseRotation = rotation;

    const img = document.createElement('img');
    img.src = 'assets/images/envelope_closed.png';
    img.alt = '';
    el.appendChild(img);

    container.appendChild(el);
    envelopes.push({ el, baseX: x, baseY: y, baseRotation: rotation, size });
  }

  return envelopes;
}

/**
 * Starts the slow, independent idle animation (float + rotate + shadow
 * breathing) on a set of envelope records built by buildScatteredEnvelopes.
 * Each envelope gets its own random duration, delay and drift distance so
 * that none of them ever move in sync.
 */
function startIdleDrift(envelopes) {
  envelopes.forEach((item) => {
    const dx = rand(-8, 8);
    const dy = rand(-12, 12);
    const dRot = rand(-4, 4);
    const duration = rand(4, 8);
    const delay = rand(0, 3);

    item.idleTween = gsap.to(item.el, {
      x: dx,
      y: dy,
      rotation: item.baseRotation + dRot,
      duration,
      delay,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  });
}

/**
 * Stops every idle tween in the given list (used right before the
 * "gather to center" cinematic begins).
 */
function stopIdleDrift(envelopes) {
  envelopes.forEach((item) => {
    if (item.idleTween) item.idleTween.kill();
  });
}
