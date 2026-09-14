// Fan modes demo — a hand-built, interactive replica of the app's Fans card
// (not a screenshot, not a recording). Click a mode or an app, drag the
// slider yourself in Manual; everything else is a live simulation so the
// numbers never sit dead.
(() => {
  const card = document.getElementById("fan-demo-card");
  if (!card) return;

  const modesEl = document.getElementById("fan-demo-modes");
  const controlEl = document.getElementById("fan-demo-control");
  const controlNoteEl = document.getElementById("fan-demo-control-note");
  const liveDotEl = document.getElementById("fan-demo-live-dot");
  const leftEl = document.getElementById("fan-demo-left");
  const rightEl = document.getElementById("fan-demo-right");
  const sliderRowEl = document.getElementById("fan-demo-slider-row");
  const sliderEl = document.getElementById("fan-demo-slider");
  const sliderFillEl = document.getElementById("fan-demo-slider-fill");
  const sliderKnobEl = document.getElementById("fan-demo-slider-knob");
  const manualSpeedEl = document.getElementById("fan-demo-manual-speed");
  const curveEl = document.getElementById("fan-demo-curve");
  const curveLineEl = document.getElementById("fan-demo-curve-line");
  const markerLineEl = document.getElementById("fan-demo-curve-marker-line");
  const markerDotEl = document.getElementById("fan-demo-curve-marker-dot");
  const curveSpeedEl = document.getElementById("fan-demo-curve-speed");
  const blastEl = document.getElementById("fan-demo-blast");
  const captionEl = document.getElementById("fan-demo-caption");
  const appsEl = document.getElementById("fan-demo-apps");
  const lockNoteEl = document.getElementById("fan-demo-lock-note");
  const lockAppEl = document.getElementById("fan-demo-lock-app");
  const cpuEl = document.getElementById("fan-demo-cpu");
  const gpuEl = document.getElementById("fan-demo-gpu");

  const RPM_MIN = 1700;
  const RPM_MAX = 6500;
  const RPM_BLAST = 6200;

  // °F. Idle-to-throttle range for a MacBook under normal use, not a lab's
  // full 0-100° span — this is what the sensor axis and readouts map onto.
  const TEMP_MIN = 92;
  const TEMP_MAX = 208;
  const TEMP_MANUAL_LOW = 90; // manual mode: more fan speed cools it down
  const TEMP_MANUAL_HIGH = 190;
  const TEMP_BLAST = 86; // Blast overrides everything — full speed chills the system down

  // How fast the displayed numbers/positions ease toward their real target
  // whenever a mode, app, or Blast changes — smoothing per frame at 60fps.
  // Temps/RPM ease gently (a real transition, ~1s to settle); the slider
  // knob and curve marker ease faster so direct dragging still feels 1:1.
  const EASE_SLOW = 0.08;
  const EASE_FAST = 0.25;

  const VB_X0 = 10, VB_X1 = 290, VB_Y0 = 108, VB_Y1 = 12; // padding inside the 300x120 viewBox

  // Curve data as (temp-fraction, speed-fraction) pairs, 0-1, independent of
  // pixel space. The standard curve stays quiet until it's genuinely warm,
  // then ramps hard near the top — how MacBooks actually behave, not a
  // straight line from idle to redline.
  const CURVES = {
    standard: [
      { t: 0, speed: 0.04 },
      { t: 0.3, speed: 0.05 },
      { t: 0.5, speed: 0.1 },
      { t: 0.65, speed: 0.22 },
      { t: 0.8, speed: 0.48 },
      { t: 0.92, speed: 0.78 },
      { t: 1, speed: 1.0 },
    ],
    // Sustained warm export/encode load: media engine does most of the work,
    // so the curve rises gently and levels off well short of full speed.
    resolve: [
      { t: 0, speed: 0.15 },
      { t: 0.2, speed: 0.22 },
      { t: 0.4, speed: 0.32 },
      { t: 0.6, speed: 0.48 },
      { t: 0.8, speed: 0.62 },
      { t: 1, speed: 0.72 },
    ],
    // Heavy sustained CPU+GPU render load: ramps hard and early, spends most
    // of its time near the top of the curve — a very different shape from
    // Resolve's, not just a higher offset of the same one.
    blender: [
      { t: 0, speed: 0.22 },
      { t: 0.15, speed: 0.38 },
      { t: 0.3, speed: 0.58 },
      { t: 0.45, speed: 0.78 },
      { t: 0.6, speed: 0.92 },
      { t: 1, speed: 1.0 },
    ],
  };

  // A running app locks the mode picker/slider/curve and pins the fans to
  // its own behavior — matches the real priority order (App Automations
  // override whatever mode was selected), described on the Profiles tab.
  // Resolve and Blender sit at the SAME temperature (0.5) so the difference
  // in fan speed comes entirely from the shape of each app's own curve.
  const APPS = {
    resolve: { label: "DaVinci Resolve", kind: "sensor", curve: CURVES.resolve, curveT: 0.5 },
    blender: { label: "Blender", kind: "sensor", curve: CURVES.blender, curveT: 0.5 },
    ai: { label: "Claude", kind: "manual", manualPct: 100 },
  };

  // Piecewise-linear interpolation over each point's own t value — the
  // points are NOT evenly spaced (that's the point, it's what makes the
  // curves realistic), so this can't assume uniform steps between indices.
  function speedAt(t, curveArr) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < curveArr.length - 1; i++) {
      const a = curveArr[i], b = curveArr[i + 1];
      if (t >= a.t && t <= b.t) {
        const localT = (t - a.t) / (b.t - a.t);
        return a.speed + (b.speed - a.speed) * localT;
      }
    }
    return curveArr[curveArr.length - 1].speed;
  }

  function curvePoints(curveArr) {
    return curveArr
      .map((p) => {
        const x = VB_X0 + (VB_X1 - VB_X0) * p.t;
        const y = VB_Y0 + (VB_Y1 - VB_Y0) * p.speed;
        return x.toFixed(1) + "," + y.toFixed(1);
      })
      .join(" ");
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    mode: "auto", // last user-picked mode; preserved under a lock, restored when released
    manualPct: 45,
    blastOn: false,
    app: "none",
  };

  // Ambient "alive" values — a slow breathing cycle for Auto/Sensor, and a
  // small independent wiggle applied to every temperature reading. Static
  // (no motion) under reduced motion.
  let breathe = 0.3;
  let wiggleCpu = 0;
  let wiggleGpu = 0;

  function locked() {
    return state.app !== "none";
  }

  function effectiveMode() {
    if (locked()) return APPS[state.app].kind;
    return state.mode;
  }

  function activeCurve() {
    if (locked() && APPS[state.app].kind === "sensor") return APPS[state.app].curve;
    return CURVES.standard;
  }

  function activeCurveT() {
    if (locked() && APPS[state.app].kind === "sensor") return APPS[state.app].curveT;
    return 0.15 + breathe * 0.55; // ambient sweep when nothing is locked
  }

  function effectiveManualPct() {
    if (locked() && APPS[state.app].kind === "manual") return APPS[state.app].manualPct;
    return state.manualPct;
  }

  function rpmFromPct(pct) {
    return RPM_MIN + (RPM_MAX - RPM_MIN) * (pct / 100);
  }

  function targetRpm() {
    if (state.blastOn) return RPM_BLAST;
    const m = effectiveMode();
    if (m === "manual") return rpmFromPct(effectiveManualPct());
    if (m === "sensor") return rpmFromPct(speedAt(activeCurveT(), activeCurve()) * 100);
    return 1720 + breathe * 700; // auto
  }

  // Blast overrides everything, including the thermal story: full speed
  // chills the system down, so it wins over whatever mode/app is underneath.
  function baseTemp() {
    if (state.blastOn) return TEMP_BLAST;
    const m = effectiveMode();
    if (m === "sensor") return TEMP_MIN + (TEMP_MAX - TEMP_MIN) * activeCurveT();
    if (m === "manual") return TEMP_MANUAL_HIGH - (TEMP_MANUAL_HIGH - TEMP_MANUAL_LOW) * (effectiveManualPct() / 100);
    return 96 + breathe * 30; // auto
  }

  function targetCpuTemp() {
    return baseTemp() + wiggleCpu;
  }

  function targetGpuTemp() {
    return baseTemp() - 4 + wiggleGpu;
  }

  // Displayed values ease toward these targets every frame (see the tick
  // loop) rather than snapping — that's the "transition" on mode/app/Blast
  // changes. Seeded from the initial Auto state so there's no grow-from-zero
  // pop on first paint.
  const display = {
    rpm: 1720,
    cpu: 96,
    gpu: 92,
    sliderPct: state.manualPct,
    markerX: VB_X0 + (VB_X1 - VB_X0) * 0.15,
    markerY: VB_Y0,
    speed: 0,
  };

  function lerp(current, target, factor) {
    return current + (target - current) * factor;
  }

  function updateDisplay() {
    display.rpm = lerp(display.rpm, targetRpm(), EASE_SLOW);
    display.cpu = lerp(display.cpu, targetCpuTemp(), EASE_SLOW);
    display.gpu = lerp(display.gpu, targetGpuTemp(), EASE_SLOW);

    const m = effectiveMode();
    if (m === "manual") {
      display.sliderPct = lerp(display.sliderPct, effectiveManualPct(), EASE_FAST);
    }
    if (m === "sensor") {
      const curve = activeCurve();
      const t = activeCurveT();
      const targetSpeed = speedAt(t, curve);
      const targetX = VB_X0 + (VB_X1 - VB_X0) * t;
      const targetY = VB_Y0 + (VB_Y1 - VB_Y0) * targetSpeed;
      display.markerX = lerp(display.markerX, targetX, EASE_FAST);
      display.markerY = lerp(display.markerY, targetY, EASE_FAST);
      display.speed = lerp(display.speed, targetSpeed, EASE_FAST);
    }
  }

  function snapDisplay() {
    // Reduced motion / no-animation-loop path: jump straight to target.
    display.rpm = targetRpm();
    display.cpu = targetCpuTemp();
    display.gpu = targetGpuTemp();
    const m = effectiveMode();
    if (m === "manual") display.sliderPct = effectiveManualPct();
    if (m === "sensor") {
      const curve = activeCurve();
      const t = activeCurveT();
      display.speed = speedAt(t, curve);
      display.markerX = VB_X0 + (VB_X1 - VB_X0) * t;
      display.markerY = VB_Y0 + (VB_Y1 - VB_Y0) * display.speed;
    }
  }

  function render() {
    const rpm = Math.round(display.rpm);
    leftEl.textContent = (rpm - 3).toLocaleString("en-US");
    rightEl.textContent = (rpm + 3).toLocaleString("en-US");

    cpuEl.textContent = Math.round(display.cpu) + "°F";
    gpuEl.textContent = Math.round(display.gpu) + "°F";

    appsEl.querySelectorAll(".fan-demo-app").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.app === state.app);
    });
    lockNoteEl.hidden = !locked();
    if (locked()) lockAppEl.textContent = APPS[state.app].label;
    modesEl.classList.toggle("locked", locked());

    const m = effectiveMode();
    modesEl.querySelectorAll(".fan-demo-mode").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === m);
    });

    blastEl.classList.toggle("active", state.blastOn);

    sliderRowEl.hidden = m !== "manual";
    curveEl.hidden = m !== "sensor";
    controlNoteEl.hidden = m !== "auto";
    if (m === "auto") {
      const scale = 0.85 + breathe * 0.5;
      liveDotEl.style.transform = "scale(" + scale.toFixed(2) + ")";
      liveDotEl.style.opacity = (0.6 + breathe * 0.4).toFixed(2);
    }

    const sliderInteractive = m === "manual" && !state.blastOn && !locked();
    sliderEl.classList.toggle("disabled", !sliderInteractive);

    if (m === "manual") {
      sliderFillEl.style.width = display.sliderPct + "%";
      sliderKnobEl.style.left = display.sliderPct + "%";
      manualSpeedEl.textContent = Math.round(display.sliderPct) + "%";
    }

    if (m === "sensor") {
      curveLineEl.setAttribute("points", curvePoints(activeCurve()));
      markerLineEl.setAttribute("x1", display.markerX);
      markerLineEl.setAttribute("x2", display.markerX);
      markerDotEl.setAttribute("cx", display.markerX);
      markerDotEl.setAttribute("cy", display.markerY);
      curveSpeedEl.textContent = Math.round(display.speed * 100) + "%";
    }

    captionEl.textContent = caption(m);
  }

  function caption(m) {
    if (state.blastOn) return "Blast — full-speed override, on top of any mode. Cools things right down. Click Blast again to release it.";
    if (locked()) {
      const app = APPS[state.app];
      return app.kind === "manual"
        ? `${app.label} is running — MacBreeze locks the fans to full speed. Pick None to try modes again.`
        : `${app.label} is running — MacBreeze follows its own curve for this app. Pick None to try modes again.`;
    }
    if (m === "auto") return "Auto — macOS drives the fans on its own.";
    if (m === "manual") return "Manual — drag the slider to set a fixed speed.";
    return "Sensor — fans follow a temperature curve; watch it respond as the system warms up.";
  }

  // Under reduced motion there's no per-frame loop to ease values toward
  // their target, so a state change has to jump straight there instead.
  function afterChange() {
    if (prefersReducedMotion) snapDisplay();
    render();
  }

  // One continuous loop drives the "breathing" temperature swing (Auto and
  // the unlocked Sensor sweep), re-rolls the small per-reading wiggle every
  // ~1.5s, and eases the displayed numbers/positions toward their target —
  // the transition on every mode/app/Blast change. Skipped entirely under
  // reduced motion — everything just renders once with static values.
  if (!prefersReducedMotion) {
    const start = performance.now();
    let lastWiggle = 0;
    function tick(now) {
      const elapsed = now - start;
      breathe = (Math.sin(elapsed / 4000) + 1) / 2;
      if (now - lastWiggle > 1500) {
        wiggleCpu = (Math.random() - 0.5) * 3;
        wiggleGpu = (Math.random() - 0.5) * 3;
        lastWiggle = now;
      }
      updateDisplay();
      render();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  modesEl.querySelectorAll(".fan-demo-mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (locked()) return;
      state.mode = btn.dataset.mode;
      afterChange();
    });
  });

  appsEl.querySelectorAll(".fan-demo-app").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.app = btn.dataset.app;
      afterChange();
    });
  });

  blastEl.addEventListener("click", () => {
    state.blastOn = !state.blastOn;
    afterChange();
  });

  function dragSlider(startEvent) {
    if (effectiveMode() !== "manual" || state.blastOn || locked()) return;
    startEvent.preventDefault();
    function update(clientX) {
      const rect = sliderEl.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      state.manualPct = Math.max(0, Math.min(100, pct));
      afterChange();
    }
    update(startEvent.clientX);
    function onMove(e) {
      update(e.clientX);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
  sliderEl.addEventListener("pointerdown", dragSlider);

  snapDisplay();
  render();
})();
