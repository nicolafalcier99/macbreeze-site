// Vanilla-JS port of the RotatingText React Bits component. Uses a real
// damped-spring integrator (matches Framer Motion's { type: 'spring',
// damping, stiffness }) instead of CSS transitions, since a fixed-easing
// transition-delay cascade reads as mechanical — a spring's mild overshoot
// while settling is what makes the per-letter stagger feel organic.

function springStep(current, velocity, target, stiffness, damping, mass, dt) {
  const force = -stiffness * (current - target);
  const dampingForce = -damping * velocity;
  const acceleration = (force + dampingForce) / mass;
  const nextVelocity = velocity + acceleration * dt;
  const nextCurrent = current + nextVelocity * dt;
  return [nextCurrent, nextVelocity];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function initRotatingText(mountEl, options = {}) {
  const {
    texts = [],
    rotationInterval = 2000,
    staggerDuration = 0.025,
    staggerFrom = 'first',
    stiffness = 400,
    damping = 30,
    mass = 1,
    mainClassName = '',
  } = options;

  const wrap = document.createElement('span');
  wrap.className = `text-rotate ${mainClassName}`;
  mountEl.appendChild(wrap);

  let currentIndex = 0;
  let animating = false;

  function getDelay(index, total) {
    if (staggerFrom === 'first') return index * staggerDuration;
    if (staggerFrom === 'last') return (total - 1 - index) * staggerDuration;
    if (staggerFrom === 'center') {
      const center = Math.floor(total / 2);
      return Math.abs(center - index) * staggerDuration;
    }
    return index * staggerDuration;
  }

  function render(text) {
    wrap.innerHTML = '';
    const chars = Array.from(text);
    const wordSpan = document.createElement('span');
    wordSpan.className = 'text-rotate-word';
    const spans = chars.map((ch) => {
      const span = document.createElement('span');
      span.className = 'text-rotate-element';
      span.textContent = ch === ' ' ? ' ' : ch;
      wordSpan.appendChild(span);
      return span;
    });
    wrap.appendChild(wordSpan);
    return spans;
  }

  // Springs `progress` 0 -> 1 per character (each with its own start delay),
  // then maps progress to y/opacity between `from` and `to`.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function runSpring(spans, from, to, onDone) {
    if (reduceMotion) {
      spans.forEach((el) => {
        el.style.transform = `translateY(${to.y}%)`;
        el.style.opacity = to.opacity;
      });
      onDone();
      return;
    }

    const total = spans.length;
    const startedAt = performance.now();
    const states = spans.map((el, i) => ({
      el,
      delay: getDelay(i, total) * 1000,
      progress: 0,
      velocity: 0,
      settled: false,
    }));

    let lastFrame = startedAt;

    function apply(state) {
      const y = lerp(from.y, to.y, state.progress);
      const opacity = lerp(from.opacity, to.opacity, state.progress);
      state.el.style.transform = `translateY(${y}%)`;
      state.el.style.opacity = opacity;
    }

    states.forEach(apply);

    function frame(now) {
      const dt = Math.min((now - lastFrame) / 1000, 0.032);
      lastFrame = now;
      let allSettled = true;

      states.forEach((state) => {
        if (state.settled) return;
        if (now - startedAt < state.delay) {
          allSettled = false;
          return;
        }
        const [next, velocity] = springStep(state.progress, state.velocity, 1, stiffness, damping, mass, dt);
        state.progress = next;
        state.velocity = velocity;
        if (Math.abs(1 - state.progress) < 0.001 && Math.abs(state.velocity) < 0.001) {
          state.progress = 1;
          state.settled = true;
        } else {
          allSettled = false;
        }
        apply(state);
      });

      if (allSettled) onDone();
      else requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  let currentSpans = render(texts[0]);
  runSpring(currentSpans, { y: 100, opacity: 0 }, { y: 0, opacity: 1 }, () => {});

  function rotate() {
    if (animating || texts.length < 2) return;
    animating = true;

    runSpring(currentSpans, { y: 0, opacity: 1 }, { y: -120, opacity: 0 }, () => {
      const startWidth = wrap.getBoundingClientRect().width;

      currentIndex = (currentIndex + 1) % texts.length;
      currentSpans = render(texts[currentIndex]);
      const targetWidth = wrap.scrollWidth;

      wrap.style.width = `${startWidth}px`;
      const widthAnim = wrap.animate(
        [{ width: `${startWidth}px` }, { width: `${targetWidth}px` }],
        { duration: 350, easing: 'ease', fill: 'forwards' }
      );
      widthAnim.finished
        .then(() => {
          widthAnim.cancel(); // release the fill-forwards hold
          wrap.style.width = 'auto'; // size naturally again (e.g. on resize)
        })
        .catch(() => {});

      runSpring(currentSpans, { y: 100, opacity: 0 }, { y: 0, opacity: 1 }, () => {
        animating = false;
      });
    });
  }

  setInterval(rotate, rotationInterval);
}

document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('pricing-fun-mount');
  if (!mount) return;

  const line = document.createElement('span');
  line.className = 'text-rotate-line';

  const prefix = document.createElement('span');
  prefix.textContent = 'Your Mac stays';
  line.appendChild(prefix);

  const pillMount = document.createElement('span');
  line.appendChild(pillMount);
  mount.appendChild(line);

  initRotatingText(pillMount, {
    texts: ['fanless', 'whisperquiet', 'icecold', 'thermallyoptimized', 'coolheaded'],
    rotationInterval: 2000,
    staggerFrom: 'first',
    staggerDuration: 0.025,
    stiffness: 400,
    damping: 30,
    mainClassName: 'pricing-fun-pill',
  });
});
