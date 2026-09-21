// Drives the hero's live readout: a simulated workload that heats the CPU, fans that answer it,
// and a temperature trace that shows the loop closing. It is the product's whole argument in one
// panel, which a still screenshot cannot make.
//
// Deliberately independent of fan-demo.js rather than sharing it: that file binds to its own
// element ids, and getElementById returns the first match in the document, so a second panel
// reusing those names would quietly steal them from the demo further down the page.
(function () {
  const frame = document.querySelector(".hero-instrument-frame");
  const tempEl = document.getElementById("hero-temp");
  const rpmEl = document.getElementById("hero-rpm");
  const modeEl = document.getElementById("hero-mode");
  const loadEl = document.getElementById("hero-load");
  const lineEl = document.getElementById("hero-graph-line");
  const areaEl = document.getElementById("hero-graph-area");
  const fanEl = document.getElementById("hero-graph-fan");
  if (!frame || !tempEl || !rpmEl || !lineEl || !areaEl) return;

  const IDLE_TEMP = 46;
  const MAX_TEMP = 96;
  const MIN_RPM = 1600;
  const MAX_RPM = 6800;
  const POINTS = 64;
  const W = 320;
  const H = 96;

  // A day's work rather than one repeating breath. The panel used to loop a single
  // idle-export-idle cycle, which on a 20-second window meant the same shape scrolling past
  // forever — it read as an animation rather than as a Mac doing things. These are the loads a
  // Mac actually sees, each with its own level and duration, so the trace keeps producing shapes
  // the viewer has not seen yet and every one of them is a claim the product can back.
  //
  // `wobble` is the swing either side of `load`, in load units, for work that is not steady —
  // a game's frame-to-frame variance looks nothing like an export's flat wall, and drawing both
  // as the same plateau would be the lie that made this feel canned in the first place.
  const TIMELINE = [
    { label: "Idle", load: 0.06, seconds: 5 },
    { label: "Video export", load: 0.95, seconds: 11 },
    { label: "Idle", load: 0.07, seconds: 6 },
    { label: "Gaming", load: 0.74, seconds: 10, wobble: 0.12 },
    // Deliberately here: the subhead promises "quiet on a call", and this is where the trace
    // gets to show it — a real load that never comes near needing the fans.
    { label: "Video call", load: 0.3, seconds: 9 },
    { label: "Xcode build", load: 0.93, seconds: 6 },
    { label: "Idle", load: 0.05, seconds: 9 },
  ];

  // Absolute start time of each segment, accumulated once rather than summed on every lookup —
  // phaseAt runs 60 times a second in the live loop and 64 times per sub-step while seeding.
  let clock = 0;
  for (const segment of TIMELINE) {
    segment.start = clock;
    clock += segment.seconds;
  }
  const CYCLE = clock;

  // Seeded with a cycle that has already happened rather than a flat idle line. An empty panel
  // is the first thing a visitor sees, and "nothing yet" is a poor argument for a product whose
  // whole claim is that it reacts — the trace should arrive mid-story, already proving the loop.
  const history = [];
  // Fan speed gets its own trace. Showing only temperature made the panel a line with no stated
  // cause; plotting the response beside it is what turns the picture into the actual claim —
  // heat rises, fans follow, heat comes back down.
  const rpmHistory = [];
  let temp = IDLE_TEMP;
  let rpm = MIN_RPM;
  // Declared with the rest of the simulation state, not down beside the animation loop: render()
  // reads it for the phase label, and the reduced-motion path calls render() and returns without
  // ever reaching the loop — a `let` further down would be in its temporal dead zone there and
  // throw, taking the whole panel with it on exactly the machines set to reduce motion.
  let elapsed = 0;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // The graph's x-axis is labelled "20 seconds ago → now", so the window has to actually be
  // twenty seconds. Derived from that label rather than chosen for the shape of the curve — an
  // axis that lies is worse than no axis, which is what the previous "quiet / ramping / full"
  // row was. The 22s cycle then sits slightly wider than the window, so the visible span always
  // holds a rise and a fall rather than a single slope.
  const WINDOW_SECONDS = 20;
  const STEP = WINDOW_SECONDS / POINTS;

  function phaseAt(seconds) {
    const t = ((seconds % CYCLE) + CYCLE) % CYCLE;
    let segment = TIMELINE[TIMELINE.length - 1];
    for (const candidate of TIMELINE) {
      if (t < candidate.start + candidate.seconds) {
        segment = candidate;
        break;
      }
    }
    if (!segment.wobble) return segment;
    // Two detuned sines rather than one, so the variation never settles into an obvious rhythm,
    // and never random() — the seed replays this same function to build its history, and a
    // random source would draw a past that could not have produced the present.
    const swing =
      Math.sin(t * 2.7) * 0.6 + Math.sin(t * 1.13) * 0.4;
    return {
      label: segment.label,
      load: Math.min(1, Math.max(0, segment.load + swing * segment.wobble)),
    };
  }

  // Heat ramp: cool below 60, hot at 85+, interpolated between. Read from the element's own
  // custom properties so the CSS stays the single source of truth for the palette — including
  // the light-mode overrides, which this would otherwise have to duplicate and drift from.
  const styles = getComputedStyle(frame);
  const COOL = styles.getPropertyValue("--heat-cool").trim() || "#5ac8fa";
  const WARM = styles.getPropertyValue("--heat-warm").trim() || "#ff9f0a";
  const HOT = styles.getPropertyValue("--heat-hot").trim() || "#ff453a";

  function heatColor(celsius) {
    if (celsius >= 85) return HOT;
    if (celsius >= 68) return WARM;
    return COOL;
  }

  // Generalised over its own min/max so temperature and fan speed, which share no units, can be
  // plotted in the same box — each against its own full range, so "high" means the same thing
  // visually for both and the gap between the lines reads as lag rather than scale.
  function pathFor(values, min, max) {
    const span = max - min;
    return values
      .map((value, i) => {
        const x = (i / (values.length - 1)) * W;
        const clamped = Math.min(Math.max(value, min), max);
        // SVG y grows downward, so a higher reading has to sit nearer the top.
        const y = H - ((clamped - min) / span) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  // Runs the same physics as tick(), just without drawing, to fill the trace before the first
  // paint. Sharing the integrator rather than faking a plausible-looking curve means the seeded
  // history obeys exactly the rules the live one does — no seam where the real data takes over.
  // One integration step of the thermal model. Shared by the seed and the live loop so both
  // obey identical physics — the seeded stretch and the live stretch must meet without a seam.
  function advance(celsius, seconds, load) {
    const target = IDLE_TEMP + (MAX_TEMP - IDLE_TEMP) * load;
    // Heat arrives faster than it leaves — silicon spikes and then lingers. A symmetric curve
    // reads as fake to anyone who has watched a real temperature graph.
    const rate = target > celsius ? 2.4 : 1.1;
    return celsius + (target - celsius) * Math.min(1, seconds * rate);
  }

  function rpmFor(celsius) {
    // Fans answer temperature, not load: nothing spins up until there is heat to move. That lag
    // is the product's actual behaviour and the reason the trace bends back down at all.
    const demand = Math.min(1, Math.max(0, (celsius - 55) / (MAX_TEMP - 55)));
    return MIN_RPM + (MAX_RPM - MIN_RPM) * demand;
  }

  function seedHistory() {
    let t = 0;
    let seedTemp = IDLE_TEMP;
    let seedRPM = MIN_RPM;
    // Opens part-way through the export, so the first thing anyone sees is the trace already
    // high with the fans up — the state that makes the product's case — rather than a flat idle
    // line waiting for something to happen.
    const offset = TIMELINE[1].start + TIMELINE[1].seconds * 0.8;
    // Sub-stepped at the same resolution the live loop runs at, then sampled once per STEP.
    // Integrating in single STEP-sized jumps instead made each step cover ~70% of the remaining
    // gap, so the ramp collapsed into two points and drew a square wave rather than a curve.
    const SUB = 1 / 60;
    for (let i = 0; i < POINTS; i++) {
      for (let s = 0; s < STEP; s += SUB) {
        seedTemp = advance(seedTemp, SUB, phaseAt(offset + t + s).load);
      }
      t += STEP;
      history.push(seedTemp);
      // Eased toward its target the same way the live loop does, rather than taking rpmFor()
      // outright — the fan trace's whole point is that it trails the temperature, and a seeded
      // stretch that tracked it exactly would show no lag at all for the first twenty seconds.
      seedRPM += (rpmFor(seedTemp) - seedRPM) * Math.min(1, STEP * 1.6);
      rpmHistory.push(seedRPM);
    }
    temp = seedTemp;
    rpm = seedRPM;
    elapsed = offset + t;
  }

  // Every label is derived here from current state, rather than only inside the animation loop.
  // Left to the loop, the seeded frame painted its markup defaults — "Auto" and "Idle" sitting
  // above 93°C and 6,482rpm, which is the one combination the panel must never show, since it
  // contradicts the behaviour the panel exists to demonstrate.
  function render() {
    const line = pathFor(history, IDLE_TEMP, MAX_TEMP);
    lineEl.setAttribute("d", line);
    areaEl.setAttribute("d", `${line} L${W},${H} L0,${H} Z`);
    if (fanEl) fanEl.setAttribute("d", pathFor(rpmHistory, MIN_RPM, MAX_RPM));
    tempEl.textContent = Math.round(temp);
    rpmEl.textContent = Math.round(rpm).toLocaleString("en-US");
    frame.style.color = heatColor(temp);

    const demand = (rpm - MIN_RPM) / (MAX_RPM - MIN_RPM);
    if (modeEl) modeEl.textContent = demand > 0.75 ? "Blast" : "Auto";
    if (loadEl) loadEl.textContent = phaseAt(elapsed).label;
  }

  // Reduced motion: draw the story's peak once and stop. Still informative, never moving.
  if (reduceMotion.matches) {
    let staticRPM = MIN_RPM;
    for (let i = 0; i < POINTS; i++) {
      const c = IDLE_TEMP + (MAX_TEMP - IDLE_TEMP) * Math.min(1, i / (POINTS * 0.7));
      history.push(c);
      staticRPM += (rpmFor(c) - staticRPM) * 0.12;
      rpmHistory.push(staticRPM);
    }
    temp = history[POINTS - 1];
    rpm = rpmFor(temp);
    // Parked mid-export so the static frame shows the interesting state, not an idle one.
    elapsed = 10;
    render();
    return;
  }

  let last = performance.now();
  let running = true;
  let sinceSample = 0;

  seedHistory();

  function tick(now) {
    if (!running) return;
    // Clamped: a backgrounded tab resumes with a huge gap, which would otherwise jump the
    // simulation forward in one frame and snap the trace into a vertical wall.
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;

    const phase = phaseAt(elapsed);
    temp = advance(temp, dt, phase.load);
    rpm += (rpmFor(temp) - rpm) * Math.min(1, dt * 1.6);

    // A point per STEP of simulated time, NOT per frame. Pushing every frame filled all 64
    // points in about a second at 60fps, so the whole window scrolled past faster than the
    // thermal cycle it was meant to be showing — the trace raced while the numbers crawled.
    sinceSample += dt;
    while (sinceSample >= STEP) {
      sinceSample -= STEP;
      history.push(temp);
      history.shift();
      rpmHistory.push(rpm);
      rpmHistory.shift();
    }

    render();
    requestAnimationFrame(tick);
  }

  // Nothing animates while the panel is off screen or the tab is hidden — this runs on a
  // marketing page someone may leave open for hours, and a permanent rAF loop for a decoration
  // nobody is looking at is a real battery cost. Doubly so on an app about heat.
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  if ("IntersectionObserver" in window) {
    running = false;
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting && !document.hidden ? start() : stop())),
      { threshold: 0 }
    ).observe(frame);
  } else {
    requestAnimationFrame(tick);
  }

  render();
})();
