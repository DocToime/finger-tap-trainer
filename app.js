/* Finger Tap Precision Trainer — app.js
 * Tap-centric, live analysis, per-profile calibration & normalization,
 * persistent progress tracking. No build step; plain ES + Chart.js (CDN).
 */
(() => {
  'use strict';

  const STORE_KEY = 'tapTrainer.v1';

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const board = $('board');
  const ctx = board.getContext('2d');
  const els = {
    profileSelect: $('profileSelect'),
    newProfileBtn: $('newProfileBtn'),
    renameProfileBtn: $('renameProfileBtn'),
    modeSelect: $('modeSelect'),
    calBadge: $('calBadge'),
    modeHint: $('modeHint'),
    targetField: $('targetField'),
    targetRadius: $('targetRadius'),
    targetVal: $('targetVal'),
    handSelect: $('handSelect'),
    fingerSelect: $('fingerSelect'),
    // finger test
    testPanel: $('testPanel'), tapsPer: $('tapsPer'), fingerGrid: $('fingerGrid'),
    startTestBtn: $('startTestBtn'), cancelTestBtn: $('cancelTestBtn'), testStatus: $('testStatus'),
    testOverlay: $('testOverlay'), testOverlayText: $('testOverlayText'), testContinueBtn: $('testContinueBtn'),
    // compare
    compareMetric: $('compareMetric'), compareEmpty: $('compareEmpty'),
    compareExpandBtn: $('compareExpandBtn'), compareSingle: $('compareSingle'), compareExpanded: $('compareExpanded'),
    // per-finger history modal
    historyBtn: $('historyBtn'), historyModal: $('historyModal'), historyCloseBtn: $('historyCloseBtn'),
    historyMetric: $('historyMetric'), historyEmpty: $('historyEmpty'),
    // live cards
    mTaps: $('mTaps'), mArea: $('mArea'), mHardness: $('mHardness'),
    mContact: $('mContact'), mAccuracy: $('mAccuracy'), mOffset: $('mOffset'),
    cardAccuracy: $('cardAccuracy'), cardOffset: $('cardOffset'),
    // controls
    startBtn: $('startBtn'), pauseBtn: $('pauseBtn'), saveBtn: $('saveBtn'), resetBtn: $('resetBtn'),
    sessionStatus: $('sessionStatus'),
    // calibration
    calPanel: $('calPanel'), calPresses: $('calPresses'), calMaxArea: $('calMaxArea'),
    calSaveBtn: $('calSaveBtn'), calClearBtn: $('calClearBtn'),
    // charts
    scatterBox: $('scatterBox'),
    offsetBox: $('offsetBox'),
    precisionBox: $('precisionBox'),
    analysisTitle: $('analysisTitle'),
    areaScaleBtn: $('areaScaleBtn'),
    timeScaleBtn: $('timeScaleBtn'),
    progressEmpty: $('progressEmpty'),
    // table
    tapTableBody: document.querySelector('#tapTable tbody'),
    showAllBtn: $('showAllBtn'),
    // footer
    capNote: $('capNote'),
    exportCsvBtn: $('exportCsvBtn'), exportJsonBtn: $('exportJsonBtn'), copyBtn: $('copyBtn'),
    exportProfileBtn: $('exportProfileBtn'), importProfileBtn: $('importProfileBtn'), importFile: $('importFile'),
  };

  // ---------- Persistent store ----------
  let store = loadStore();

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through */ }
    const id = uid();
    return { activeProfileId: id, profiles: { [id]: newProfile('Default') } };
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { console.warn('Persist failed', e); }
  }
  function newProfile(name) {
    return { id: uid(), name, calibration: null, sessions: [] };
  }
  function activeProfile() { return store.profiles[store.activeProfileId]; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- Runtime state ----------
  const state = {
    mode: 'tap',          // tap | accuracy | test | calibration
    running: false,
    paused: false,
    taps: [],             // current session taps
    showAll: false,
    active: null,         // in-progress tap being sampled
    calPresses: [],       // calibration presses (areas)
    calPressPeaks: [],    // calibration presses (pressure peaks, where reported)
    hand: 'Right',        // tag for saved sessions
    finger: 'Index',
    test: null,           // guided finger-test run (see startTest)
  };

  const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
  const HANDS = ['Left', 'Right'];
  // accuracy-like modes draw the dot + score offset/accuracy/precision
  function accLike() { return state.mode === 'accuracy' || state.mode === 'test'; }

  // ---------- Geometry ----------
  let dpr = 1, box = null, dot = null;
  const aCanvas = $('analysisCanvas');
  const actx = aCanvas.getContext('2d');
  let aW = 0, aH = 0;

  // Largest CSS-px side the tap box is ever allowed to grow to (was #board max-height).
  const BOARD_MAX = 460;

  function layout() {
    dpr = window.devicePixelRatio || 1;
    // Derive a definite square from the wrapper's content box rather than
    // letting CSS size the canvas. A <canvas> is a replaced element, so
    // aspect-ratio / width:auto are resolved from its intrinsic (attribute)
    // size in some engines (Safari), which we rewrite every layout — that
    // feedback loop is what stretched the box and skewed the dots.
    const wrap = board.parentElement;
    const cs = getComputedStyle(wrap);
    const availW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const side = Math.max(0, Math.min(availW, availH, BOARD_MAX));
    board.style.width = side + 'px';
    board.style.height = side + 'px';
    board.width = Math.round(side * dpr);
    board.height = Math.round(side * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = side, H = side;
    const m = Math.max(16, Math.min(W, H) * 0.06);
    box = { x: m, y: m, width: W - 2 * m, height: H - 2 * m };
    dot = { x: box.x + box.width / 2, y: box.y + box.height / 2, r: 14 };
    draw();
    layoutAnalysis();
    if (accLike()) syncTargetSlider();
  }

  function layoutAnalysis() {
    const r = aCanvas.getBoundingClientRect();
    if (!r.width) return;
    aCanvas.width = Math.round(r.width * dpr);
    aCanvas.height = Math.round(r.height * dpr);
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    aW = r.width; aH = r.height;
    drawAnalysis();
  }

  function maxOffset() { return Math.min(box.width, box.height) / 2; }
  // Accuracy full-scale radius: distance from dot that counts as 0%. Defaults to box half.
  function getTargetRadius() { return store.targetRadius == null ? maxOffset() : store.targetRadius; }
  function syncTargetSlider() {
    const max = Math.round(maxOffset());
    els.targetRadius.max = max;
    let v = Math.round(getTargetRadius());
    if (v > max) v = max;
    els.targetRadius.value = v;
    els.targetVal.textContent = v;
  }
  function onTargetChange() {
    store.targetRadius = +els.targetRadius.value;
    els.targetVal.textContent = store.targetRadius;
    saveStore();
    recomputeAccuracy();
    draw(); drawAnalysis();
  }
  function recomputeAccuracy() {
    const r = getTargetRadius();
    for (const t of state.taps) {
      if (t.offset == null) continue;
      t.accuracyPct = clamp(100 * (1 - t.offset / r), 0, 100);
    }
    renderTable();
    const last = lastTap();
    if (last) updateLive(last);
  }

  function inBox(x, y) {
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  }

  // ---------- Drawing ----------
  let liveRings = []; // transient feedback rings {x,y,rx,ry,age,hardness}

  function draw() {
    const W = board.width / dpr, H = board.height / dpr;
    ctx.clearRect(0, 0, W, H);

    // target box
    ctx.fillStyle = 'rgba(47,129,247,0.06)';
    ctx.strokeStyle = '#2f81f7';
    ctx.lineWidth = 2;
    roundRect(box.x, box.y, box.width, box.height, 12);
    ctx.fill(); ctx.stroke();

    // label
    ctx.fillStyle = 'rgba(139,152,165,0.9)';
    ctx.textAlign = 'left';
    const label = state.mode === 'calibration'
      ? 'Press AS HARD AS YOU CAN inside this box'
      : accLike()
        ? 'Tap the dot as accurately as you can'
        : 'Tap anywhere inside this box';
    // Shrink font until the label fits the box width on narrow viewports.
    let fontPx = 14;
    const maxLabelW = box.width - 24;
    ctx.font = `${fontPx}px -apple-system, sans-serif`;
    while (fontPx > 9 && ctx.measureText(label).width > maxLabelW) {
      fontPx -= 1;
      ctx.font = `${fontPx}px -apple-system, sans-serif`;
    }
    ctx.fillText(label, box.x + 12, box.y + 22);

    // accuracy dot
    if (accLike()) {
      // configurable target radius ring (0% accuracy boundary)
      const tr = getTargetRadius();
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, tr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(248,81,73,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248,81,73,0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f85149';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(248,81,73,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // landed taps (small markers)
    for (const t of state.taps) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46,160,67,0.5)';
      ctx.fill();
    }

    // transient feedback rings
    for (const ring of liveRings) {
      const alpha = Math.max(0, 1 - ring.age / 30);
      ctx.beginPath();
      ctx.ellipse(ring.x, ring.y, Math.max(ring.rx, 6), Math.max(ring.ry, 6), 0, 0, Math.PI * 2);
      ctx.strokeStyle = hardnessColor(ring.hardness, alpha);
      ctx.lineWidth = 3;
      ctx.stroke();
    }

  }

  // ---------- Live analysis viz (separate, compact canvas) ----------
  function lastTap() { return state.taps[state.taps.length - 1] || null; }

  function aRound(x, y, w, h, r) {
    actx.beginPath();
    actx.moveTo(x + r, y);
    actx.arcTo(x + w, y, x + w, y + h, r);
    actx.arcTo(x + w, y + h, x, y + h, r);
    actx.arcTo(x, y + h, x, y, r);
    actx.arcTo(x, y, x + w, y, r);
    actx.closePath();
  }
  function aBig(txt, x, y, size, color) {
    actx.fillStyle = color; actx.textAlign = 'center';
    actx.font = `700 ${size}px -apple-system, sans-serif`;
    actx.fillText(txt, x, y);
  }
  function aSmall(txt, x, y) {
    actx.fillStyle = '#8b98a5'; actx.textAlign = 'center';
    actx.font = '11px -apple-system, sans-serif';
    actx.fillText(txt, x, y);
  }

  function drawAnalysis() {
    if (!aW) return;
    actx.clearRect(0, 0, aW, aH);
    if (accLike()) drawTargetViz();
    else if (state.mode === 'calibration') drawCalibViz();
    else drawTapViz();
  }

  function drawTargetViz() {
    const cx = aW * 0.64, cy = aH * 0.52;
    const R = Math.min(aW * 0.6, aH) * 0.42;
    const maxOff = getTargetRadius();
    for (const acc of [0, 25, 50, 75]) {
      const rr = R * (1 - acc / 100);
      actx.beginPath();
      actx.arc(cx, cy, rr, 0, Math.PI * 2);
      actx.strokeStyle = acc === 0 ? 'rgba(248,81,73,0.55)' : 'rgba(139,152,165,0.25)';
      actx.lineWidth = 1;
      actx.stroke();
    }
    actx.beginPath(); actx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    actx.fillStyle = '#f85149'; actx.fill();

    const taps = state.taps;
    taps.forEach((t, i) => {
      if (t.offset == null) return;
      const px = cx + ((t.x - dot.x) / maxOff) * R;
      const py = cy + ((t.y - dot.y) / maxOff) * R;
      const latest = i === taps.length - 1;
      actx.beginPath();
      actx.arc(px, py, latest ? 5 : 2.5, 0, Math.PI * 2);
      actx.fillStyle = latest ? '#f0d000' : 'rgba(46,160,67,0.55)';
      actx.fill();
      if (latest) { actx.strokeStyle = '#fff'; actx.lineWidth = 1.5; actx.stroke(); }
    });

    const t = lastTap();
    aBig(t && t.accuracyPct != null ? t.accuracyPct.toFixed(1) + '%' : '–', aW * 0.2, cy - 2, 24, '#2ea043');
    aSmall('latest', aW * 0.2, cy + 16);
    aSmall('accuracy', aW * 0.2, cy + 30);
  }

  function drawTapViz() {
    const t = lastTap();
    const gW = 44, gH = aH * 0.55, gx = aW * 0.16, gTop = (aH - gH) / 2 - 8;
    actx.fillStyle = 'rgba(139,152,165,0.12)';
    aRound(gx, gTop, gW, gH, 8); actx.fill();
    const h = t && t.areaNorm != null ? Math.min(1.1, t.areaNorm) : null;
    if (h != null) {
      const fh = gH * Math.min(1, h);
      actx.fillStyle = hardnessColor(h, 0.9);
      aRound(gx, gTop + gH - fh, gW, fh, 8); actx.fill();
    }
    aSmall('hardness', gx + gW / 2, gTop + gH + 16);
    aBig(h != null ? Math.round(h * 100) + '%' : '–', gx + gW / 2, gTop + gH + 38, 20, '#e6edf3');

    const rx = aW * 0.62;
    aBig(t ? Math.round(t.areaPeak) + '' : '–', rx, aH * 0.4, 22, '#2f81f7');
    aSmall('area px²', rx, aH * 0.4 + 16);
    aBig(t ? t.contactMs + '' : '–', rx, aH * 0.74, 22, '#d29922');
    aSmall('contact ms', rx, aH * 0.74 + 16);
  }

  function drawCalibViz() {
    const cx = aW / 2;
    const mx = state.calPresses.length ? Math.max(...state.calPresses) : null;
    aBig(state.calPresses.length + '', cx, aH * 0.34, 26, '#2f81f7');
    aSmall('presses recorded', cx, aH * 0.34 + 16);
    aBig(mx != null ? Math.round(mx) + '' : '–', cx, aH * 0.72, 26, '#2ea043');
    aSmall('max contact area px²', cx, aH * 0.72 + 16);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hardnessColor(h, alpha) {
    // h: 0..1 (null -> blue). green(soft) -> red(hard)
    if (h == null) return `rgba(47,129,247,${alpha})`;
    const hue = (1 - Math.min(1, h)) * 120; // 120=green, 0=red
    return `hsla(${hue},80%,55%,${alpha})`;
  }

  // animate transient rings
  function tick() {
    if (liveRings.length) {
      liveRings.forEach(r => r.age++);
      liveRings = liveRings.filter(r => r.age < 30);
      draw();
    }
    requestAnimationFrame(tick);
  }

  // ---------- Capture pipeline ----------
  let activePointerId = null;

  function pos(e) {
    const r = board.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  // PointerEvent.width/height = contact geometry (CSS px); fall back to Touch radius.
  function contactSize(e) {
    let w = e.width, h = e.height;
    if ((w == null || w <= 1) && e.radiusX) { w = e.radiusX * 2; h = e.radiusY * 2; }
    return { w: w || 0, h: h || 0 };
  }
  function ellipseArea(w, h) { return Math.PI * (w / 2) * (h / 2); }

  function canCapture() {
    if (state.mode === 'calibration') return true;
    if (state.mode === 'test') return state.test && state.test.phase === 'running';
    return state.running && !state.paused;
  }

  function onDown(e) {
    if (!canCapture()) return;
    const p = pos(e);
    if (!inBox(p.x, p.y)) return;
    if (activePointerId !== null) return; // single-touch only (v1)
    activePointerId = e.pointerId;
    board.setPointerCapture?.(e.pointerId);
    const cs = contactSize(e);
    state.active = {
      downTs: performance.now(),
      x: p.x, y: p.y,
      wPeak: cs.w, hPeak: cs.h,
      areaPeak: ellipseArea(cs.w, cs.h),
      areaSum: ellipseArea(cs.w, cs.h), samples: 1,
      pPeak: e.pressure || 0, pSum: e.pressure || 0,
    };
    e.preventDefault();
  }

  function onMove(e) {
    if (state.active == null || e.pointerId !== activePointerId) return;
    const cs = contactSize(e);
    const a = ellipseArea(cs.w, cs.h);
    const t = state.active;
    if (a > t.areaPeak) { t.areaPeak = a; t.wPeak = cs.w; t.hPeak = cs.h; }
    t.areaSum += a; t.samples++;
    const pr = e.pressure || 0;
    if (pr > t.pPeak) t.pPeak = pr;
    t.pSum += pr;
    e.preventDefault();
  }

  function onUp(e) {
    if (state.active == null || e.pointerId !== activePointerId) return;
    const t = state.active;
    const up = performance.now();
    const cal = activeProfile().calibration;
    const areaNorm = cal && cal.maxArea ? clamp(t.areaPeak / cal.maxArea, 0, 1.2) : null;
    const pNorm = cal && cal.maxPressure ? clamp(t.pPeak / cal.maxPressure, 0, 1.2) : null;

    const tap = {
      id: state.taps.length + 1,
      downTs: t.downTs, upTs: up,
      contactMs: Math.round(up - t.downTs),
      x: t.x, y: t.y,
      wPeak: t.wPeak, hPeak: t.hPeak,
      areaPeak: t.areaPeak,
      areaMean: t.areaSum / t.samples,
      pressurePeak: t.pPeak, pressureMean: t.pSum / t.samples,
      areaNorm, pressureNorm: pNorm,
      offset: null, accuracyPct: null,
    };

    if (accLike()) {
      const dx = t.x - dot.x, dy = t.y - dot.y;
      tap.offset = Math.hypot(dx, dy);
      tap.accuracyPct = clamp(100 * (1 - tap.offset / getTargetRadius()), 0, 100);
    }

    // feedback ring
    liveRings.push({ x: t.x, y: t.y, rx: t.wPeak / 2, ry: t.hPeak / 2, age: 0, hardness: areaNorm });

    state.active = null;
    activePointerId = null;

    if (state.mode === 'calibration') {
      handleCalibrationPress(tap);
    } else {
      state.taps.push(tap);
      updateLive(tap);
      pushCharts();
      renderTable();
      if (state.mode === 'test') handleTestTap();
    }
    draw();
    drawAnalysis();
    e.preventDefault();
  }

  function onCancel(e) {
    if (e.pointerId === activePointerId) { state.active = null; activePointerId = null; }
  }

  // ---------- Calibration ----------
  function handleCalibrationPress(tap) {
    state.calPresses.push(tap.areaPeak);
    state.calPressPeaks.push(tap.pressurePeak || 0);
    els.calPresses.textContent = state.calPresses.length;
    const mx = Math.max(...state.calPresses);
    els.calMaxArea.textContent = Math.round(mx);
    els.calSaveBtn.disabled = state.calPresses.length < 1;
  }
  function saveCalibration() {
    if (!state.calPresses.length) return;
    // use the top presses (max area) as the reference
    const sorted = [...state.calPresses].sort((a, b) => b - a);
    const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
    const maxArea = top.reduce((s, v) => s + v, 0) / top.length;
    // Capture max reported pressure too; stays 0 (→ pressureNorm null) on
    // devices that don't report pressure, so behaviour is unchanged there.
    const pressures = state.calPressPeaks.filter(p => p > 0);
    const maxPressure = pressures.length ? Math.max(...pressures) : 0;
    activeProfile().calibration = {
      maxArea,
      maxPressure,
      calibratedAt: new Date().toISOString(),
    };
    saveStore();
    refreshCalBadge();
    setStatus(`Calibrated (max area ≈ ${Math.round(maxArea)} px²)`);
  }
  function clearCalibration() {
    state.calPresses = [];
    state.calPressPeaks = [];
    els.calPresses.textContent = '0';
    els.calMaxArea.textContent = '–';
    els.calSaveBtn.disabled = true;
  }

  function refreshCalBadge() {
    const cal = activeProfile().calibration;
    if (cal && cal.maxArea) {
      els.calBadge.textContent = 'Calibrated';
      els.calBadge.className = 'badge badge-ok';
    } else {
      els.calBadge.textContent = 'Uncalibrated';
      els.calBadge.className = 'badge badge-warn';
    }
  }

  // ---------- Live cards ----------
  function updateLive(tap) {
    els.mTaps.textContent = state.taps.length;
    els.mArea.textContent = Math.round(tap.areaPeak);
    els.mHardness.textContent = tap.areaNorm == null ? '–' : Math.round(tap.areaNorm * 100);
    els.mContact.textContent = tap.contactMs;
    els.mAccuracy.textContent = tap.accuracyPct == null ? '–' : tap.accuracyPct.toFixed(2);
    els.mOffset.textContent = tap.offset == null ? '–' : tap.offset.toFixed(1);
  }

  // ---------- Charts ----------
  let areaChart, timeChart, scatterChart, offsetChart, precisionChart, progressChart, compareChart;
  const chartFont = { color: '#8b98a5' };
  const grid = { color: 'rgba(255,255,255,0.06)' };

  function baseOpts(yLabel) {
    return {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { ticks: chartFont, grid },
        y: { title: { display: true, text: yLabel, color: '#8b98a5' }, ticks: chartFont, grid, beginAtZero: true },
      },
    };
  }

  function initCharts() {
    areaChart = new Chart($('areaChart'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Area', data: [], borderColor: '#2f81f7', backgroundColor: 'rgba(47,129,247,.15)', tension: .25, pointRadius: 2, fill: true }] },
      options: baseOpts('Contact area (px²)'),
    });
    timeChart = new Chart($('timeChart'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Contact ms', data: [], borderColor: '#d29922', backgroundColor: 'rgba(210,153,34,.15)', tension: .25, pointRadius: 2, fill: true }] },
      options: baseOpts('Contact time (ms)'),
    });
    scatterChart = new Chart($('scatterChart'), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Previous', data: [], backgroundColor: 'rgba(46,160,67,0.5)', pointRadius: 3 },
        { label: 'Latest', data: [], backgroundColor: '#f0d000', borderColor: '#fff', borderWidth: 1.5, pointRadius: 6 },
        { label: 'Target', data: [{ x: 0, y: 0 }], backgroundColor: '#f85149', pointRadius: 6, pointStyle: 'crossRot' },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: true, labels: { color: '#8b98a5', boxWidth: 10, font: { size: 10 } } } },
        scales: {
          x: { title: { display: true, text: 'Δx from dot (px)', color: '#8b98a5' }, ticks: chartFont, grid },
          y: { title: { display: true, text: 'Δy (px)', color: '#8b98a5' }, ticks: chartFont, grid },
        },
      },
    });
    offsetChart = new Chart($('offsetChart'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Distance', data: [], borderColor: '#2ea043', backgroundColor: 'rgba(46,160,67,.15)', tension: .25, pointRadius: 2, fill: true }] },
      options: baseOpts('Distance from dot (px)'),
    });
    // Rolling precision: spread (mean distance from centroid) of the last ≤10 taps.
    // Same definition as the per-session "precision" metric, but as a moving window.
    precisionChart = new Chart($('precisionChart'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Precision', data: [], borderColor: '#a371f7', backgroundColor: 'rgba(163,113,247,.15)', tension: .25, pointRadius: 2, fill: true, spanGaps: true }] },
      options: baseOpts('Precision: spread of last 10 (px)'),
    });
    progressChart = new Chart($('progressChart'), {
      type: 'line',
      data: { labels: [], datasets: [
        { label: 'Avg accuracy %', data: [], borderColor: '#2ea043', tension: .25, pointRadius: 3, spanGaps: true },
        { label: 'Avg hardness %', data: [], borderColor: '#f85149', tension: .25, pointRadius: 3, spanGaps: true },
        { label: 'Avg contact ms', data: [], borderColor: '#d29922', tension: .25, pointRadius: 3, yAxisID: 'y1', spanGaps: true },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: true, labels: { color: '#8b98a5', boxWidth: 10, font: { size: 10 } } } },
        scales: {
          x: { ticks: chartFont, grid },
          y: { position: 'left', ticks: chartFont, grid, beginAtZero: true, suggestedMax: 100 },
          y1: { position: 'right', ticks: chartFont, grid: { display: false }, beginAtZero: true },
        },
      },
    });
    compareChart = new Chart($('compareChart'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: '', data: [], backgroundColor: [] }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { ticks: chartFont, grid }, y: { ticks: chartFont, grid, beginAtZero: true } },
      },
    });
    renderProgress();
    renderCompare();
  }

  // ---------- Comparison across fingers/hands ----------
  function metricVal(sum, m) {
    return m === 'acc' ? sum.avgAccuracy
      : m === 'prec' ? sum.precision
      : m === 'off' ? sum.avgOffset
      : m === 'hard' ? sum.avgHardness
      : sum.avgContactMs;
  }
  // Metrics shown in the compare panel. Order = both the <select> order and the
  // top-to-bottom order of the "Expand all" small-multiples (offset first since
  // it's an absolute px measure; accuracy % last as it's relative to circle size).
  const COMPARE_METRICS = [
    { key: 'off', label: 'Offset px (lower better)' },
    { key: 'prec', label: 'Precision: spread px (lower better)' },
    { key: 'hard', label: 'Hardness %' },
    { key: 'ms', label: 'Contact ms' },
    { key: 'acc', label: 'Accuracy % (higher better)' },
  ];
  let expandedCharts = null, compareExpanded = false;

  // Group saved sessions by hand+finger (e.g. "R Index"), sorted hand then finger.
  function compareGroups() {
    const groups = {};
    for (const s of activeProfile().sessions) {
      if (!s.hand || !s.finger) continue;
      const k = `${s.hand[0]} ${s.finger}`;
      (groups[k] ||= { hand: s.hand, finger: s.finger, sessions: [] }).sessions.push(s);
    }
    const keys = Object.keys(groups).sort((a, b) => {
      const ga = groups[a], gb = groups[b];
      if (ga.hand !== gb.hand) return ga.hand < gb.hand ? -1 : 1;
      return FINGERS.indexOf(ga.finger) - FINGERS.indexOf(gb.finger);
    });
    return { groups, keys };
  }
  function metricAvg(group, m) {
    let sum = 0, n = 0;
    for (const s of group.sessions) { const v = metricVal(s.summary, m); if (v == null) continue; sum += v; n++; }
    return n ? round1(sum / n) : null;
  }
  function fillCompareChart(chart, keys, groups, m) {
    chart.data.labels = keys;
    chart.data.datasets[0].data = keys.map(k => metricAvg(groups[k], m));
    chart.data.datasets[0].backgroundColor = keys.map(k => groups[k].hand === 'Right' ? '#2f81f7' : '#2ea043');
    chart.update();
  }
  function buildExpandedCharts() {
    els.compareExpanded.innerHTML = '';
    expandedCharts = {};
    for (const mt of COMPARE_METRICS) {
      const head = document.createElement('div');
      head.className = 'chart-head';
      head.innerHTML = `<span>${mt.label}</span>`;
      const box = document.createElement('div');
      box.className = 'chart-box';
      const cv = document.createElement('canvas');
      box.appendChild(cv);
      els.compareExpanded.append(head, box);
      expandedCharts[mt.key] = new Chart(cv, {
        type: 'bar',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: { x: { ticks: chartFont, grid }, y: { ticks: chartFont, grid, beginAtZero: true } },
        },
      });
    }
  }
  function toggleCompareExpand() {
    compareExpanded = !compareExpanded;
    els.compareExpandBtn.textContent = compareExpanded ? 'Collapse' : 'Expand all';
    els.compareExpandBtn.classList.toggle('btn-primary', compareExpanded);
    els.compareSingle.hidden = compareExpanded;
    els.compareExpanded.hidden = !compareExpanded;
    if (compareExpanded && !expandedCharts) buildExpandedCharts();
    renderCompare();
  }
  function renderCompare() {
    const { groups, keys } = compareGroups();
    fillCompareChart(compareChart, keys, groups, els.compareMetric.value);
    if (compareExpanded && expandedCharts) {
      for (const mt of COMPARE_METRICS) fillCompareChart(expandedCharts[mt.key], keys, groups, mt.key);
    }
    els.compareEmpty.hidden = keys.length > 0;
  }

  // ---------- Per-finger history modal ----------
  // One line per hand+finger across the saved-session timeline, so you can see
  // whether a given finger's offset / precision is trending down over time.
  let historyChart = null;
  const HISTORY_PALETTE = ['#2f81f7', '#2ea043', '#d29922', '#f85149', '#a371f7', '#56d4dd', '#e879f9', '#f0883e', '#39d353', '#db61a2'];

  function buildHistoryChart() {
    historyChart = new Chart($('historyChart'), {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: true, labels: { color: '#8b98a5', boxWidth: 10, font: { size: 10 } } } },
        scales: {
          x: { ticks: { ...chartFont, maxRotation: 0, autoSkip: true }, grid },
          y: { title: { display: true, text: '', color: '#8b98a5' }, ticks: chartFont, grid, beginAtZero: true },
        },
      },
    });
  }

  function renderHistory() {
    const m = els.historyMetric.value;
    const sessions = activeProfile().sessions
      .filter(s => s.hand && s.finger && metricVal(s.summary, m) != null)
      .slice()
      .sort((a, b) => new Date(a.endedAt) - new Date(b.endedAt));
    const labels = sessions.map(s =>
      new Date(s.endedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    // Each finger gets a value at the sessions that belong to it; null elsewhere
    // (spanGaps connects a finger's own points across the shared timeline).
    const groups = {}, order = [];
    sessions.forEach((s, i) => {
      const k = `${s.hand[0]} ${s.finger}`;
      if (!groups[k]) { groups[k] = { hand: s.hand, finger: s.finger, data: new Array(sessions.length).fill(null) }; order.push(k); }
      groups[k].data[i] = round1(metricVal(s.summary, m));
    });
    const keys = order.sort((a, b) => {
      const ga = groups[a], gb = groups[b];
      if (ga.hand !== gb.hand) return ga.hand < gb.hand ? -1 : 1;
      return FINGERS.indexOf(ga.finger) - FINGERS.indexOf(gb.finger);
    });
    historyChart.data.labels = labels;
    historyChart.data.datasets = keys.map((k, idx) => {
      const c = HISTORY_PALETTE[idx % HISTORY_PALETTE.length];
      return { label: k, data: groups[k].data, borderColor: c, backgroundColor: c, tension: .25, pointRadius: 3, spanGaps: true, fill: false };
    });
    historyChart.options.scales.y.title.text = (COMPARE_METRICS.find(x => x.key === m) || {}).label || '';
    historyChart.update();
    els.historyEmpty.hidden = sessions.length > 0;
  }

  function openHistory() {
    els.historyModal.hidden = false;
    if (!historyChart) buildHistoryChart();
    renderHistory();
    // Canvas was display:none until now; let it pick up the real size.
    requestAnimationFrame(() => historyChart.resize());
  }
  function closeHistory() { els.historyModal.hidden = true; }

  // Spread (mean distance from centroid, px) of the last ≤10 taps. Needs ≥2
  // taps to define a spread; returns null otherwise so the line starts as a gap.
  function rollingPrecision() {
    const w = state.taps.slice(-10);
    if (w.length < 2) return null;
    const cx = w.reduce((s, t) => s + t.x, 0) / w.length;
    const cy = w.reduce((s, t) => s + t.y, 0) / w.length;
    return round1(w.reduce((s, t) => s + Math.hypot(t.x - cx, t.y - cy), 0) / w.length);
  }

  function pushCharts() {
    const t = state.taps[state.taps.length - 1];
    areaChart.data.labels.push(t.id);
    areaChart.data.datasets[0].data.push(Math.round(t.areaPeak));
    areaChart.update();
    timeChart.data.labels.push(t.id);
    timeChart.data.datasets[0].data.push(t.contactMs);
    timeChart.update();
    if (accLike()) {
      // demote the prior "latest" point into the previous-taps dataset
      const prevLatest = scatterChart.data.datasets[1].data[0];
      if (prevLatest) scatterChart.data.datasets[0].data.push(prevLatest);
      scatterChart.data.datasets[1].data = [{ x: t.x - dot.x, y: t.y - dot.y }];
      scatterChart.update();
      offsetChart.data.labels.push(t.id);
      offsetChart.data.datasets[0].data.push(round1(t.offset));
      offsetChart.update();
      precisionChart.data.labels.push(t.id);
      precisionChart.data.datasets[0].data.push(rollingPrecision());
      precisionChart.update();
    }
  }

  function setScaleBtn(btn, fixed) {
    btn.textContent = fixed ? 'Auto' : '2× last';
    btn.classList.toggle('btn-primary', fixed);
  }

  // Snapshot the y-axis to 2× the current last tap (once). Toggle again -> back to auto.
  function toggleScale(which) {
    const chart = which === 'area' ? areaChart : timeChart;
    const btn = which === 'area' ? els.areaScaleBtn : els.timeScaleBtn;
    if (chart.options.scales.y.max == null) {
      const last = lastTap();
      if (!last) return; // need a tap to base the scale on
      const v = which === 'area' ? last.areaPeak : last.contactMs;
      chart.options.scales.y.max = Math.max(1, 2 * v);
      setScaleBtn(btn, true);
    } else {
      chart.options.scales.y.max = undefined;
      setScaleBtn(btn, false);
    }
    chart.update();
  }

  function resetCharts() {
    for (const c of [areaChart, timeChart, offsetChart, precisionChart]) { c.data.labels = []; c.data.datasets[0].data = []; c.update(); }
    scatterChart.data.datasets[0].data = [];
    scatterChart.data.datasets[1].data = [];
    scatterChart.update();
    areaChart.options.scales.y.max = undefined;
    timeChart.options.scales.y.max = undefined;
    setScaleBtn(els.areaScaleBtn, false);
    setScaleBtn(els.timeScaleBtn, false);
  }

  function renderProgress() {
    const sessions = activeProfile().sessions;
    const labels = [], acc = [], hard = [], ms = [];
    for (const s of sessions) {
      // Include time so multiple sessions on the same day are distinguishable.
      labels.push(new Date(s.endedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      acc.push(s.summary.avgAccuracy);
      hard.push(s.summary.avgHardness);
      ms.push(s.summary.avgContactMs);
    }
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = acc;
    progressChart.data.datasets[1].data = hard;
    progressChart.data.datasets[2].data = ms;
    progressChart.update();
    els.progressEmpty.hidden = sessions.length > 0;
  }

  // ---------- Table ----------
  function renderTable() {
    const rows = state.showAll ? state.taps : state.taps.slice(-50);
    const html = rows.map(t => `<tr>
      <td>${t.id}</td>
      <td>${Math.round(t.areaPeak)}</td>
      <td>${t.areaNorm == null ? '–' : Math.round(t.areaNorm * 100)}</td>
      <td>${t.contactMs}</td>
      <td>${t.offset == null ? '–' : t.offset.toFixed(1)}</td>
      <td>${t.accuracyPct == null ? '–' : t.accuracyPct.toFixed(2)}</td>
      <td>${Math.round(t.x)}</td>
      <td>${Math.round(t.y)}</td>
    </tr>`).reverse().join('');
    els.tapTableBody.innerHTML = html;
  }

  // ---------- Session metrics ----------
  function summarize(taps) {
    if (!taps.length) return { count: 0, avgAccuracy: null, avgHardness: null, avgContactMs: 0 };
    const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = (arr) => { const m = mean(arr); return Math.sqrt(mean(arr.map(v => (v - m) ** 2))); };
    const areas = taps.map(t => t.areaPeak);
    const times = taps.map(t => t.contactMs);
    const accs = taps.filter(t => t.accuracyPct != null).map(t => t.accuracyPct);
    const hards = taps.filter(t => t.areaNorm != null).map(t => t.areaNorm * 100);
    const offs = taps.filter(t => t.offset != null).map(t => t.offset);
    // Precision = spread of the targeted taps around their OWN centroid (px),
    // independent of where the target was. Lower = more consistent/repeatable.
    const pts = taps.filter(t => t.offset != null);
    let precision = null;
    if (pts.length > 1) {
      const cxp = mean(pts.map(p => p.x)), cyp = mean(pts.map(p => p.y));
      precision = round1(mean(pts.map(p => Math.hypot(p.x - cxp, p.y - cyp))));
    } else if (pts.length === 1) {
      precision = 0;
    }
    return {
      count: taps.length,
      avgArea: round1(mean(areas)), stdArea: round1(std(areas)),
      avgContactMs: round1(mean(times)), stdContactMs: round1(std(times)),
      avgAccuracy: accs.length ? round1(mean(accs)) : null,
      stdAccuracy: accs.length ? round1(std(accs)) : null,
      avgOffset: offs.length ? round1(mean(offs)) : null,
      precision,
      avgHardness: hards.length ? round1(mean(hards)) : null,
      stdHardness: hards.length ? round1(std(hards)) : null,
    };
  }

  // ---------- Session controls ----------
  function setStatus(s) { els.sessionStatus.textContent = s; }

  function startSession() {
    state.running = true; state.paused = false;
    state.taps = []; resetCharts(); renderTable(); draw(); drawAnalysis();
    els.mTaps.textContent = '0';
    els.startBtn.disabled = true;
    els.pauseBtn.disabled = false;
    els.saveBtn.disabled = false;
    setStatus('Recording…');
  }
  function pauseSession() {
    state.paused = !state.paused;
    els.pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
    setStatus(state.paused ? 'Paused' : 'Recording…');
  }
  function commitSession(taps, mode, hand, finger) {
    const session = {
      id: uid(), profileId: store.activeProfileId, mode, hand, finger,
      startedAt: new Date(taps[0].downTs + performance.timeOrigin).toISOString(),
      endedAt: new Date().toISOString(),
      taps, summary: summarize(taps),
    };
    activeProfile().sessions.push(session);
    saveStore();
    return session;
  }
  function saveSession() {
    if (!state.taps.length) {
      const auto = state.mode === 'tap' || state.mode === 'accuracy';
      resetSession();
      if (auto) startSession();
      setStatus('Nothing to save');
      return;
    }
    const session = commitSession(state.taps, state.mode, state.hand, state.finger);
    renderProgress(); renderCompare();
    setStatus(`Saved: ${session.summary.count} taps (${state.hand} ${state.finger})`);
    resetSession();
  }
  function resetSession() {
    state.running = false; state.paused = false;
    state.taps = []; state.active = null; activePointerId = null;
    els.startBtn.disabled = false;
    els.pauseBtn.disabled = true; els.pauseBtn.textContent = 'Pause';
    els.saveBtn.disabled = true;
    resetCharts(); renderTable(); draw(); drawAnalysis();
    ['mTaps','mArea','mHardness','mContact','mAccuracy','mOffset'].forEach(k => {
      els[k].textContent = k === 'mTaps' ? '0' : '–';
    });
  }
  // Reset button: clear data, then keep recording in auto-record modes so
  // status/buttons stay consistent with the auto-start behaviour on mode entry.
  function onResetClick() {
    const auto = state.mode === 'tap' || state.mode === 'accuracy';
    resetSession();
    if (auto) startSession();
    else setStatus('Idle');
  }

  // ---------- Finger test (guided, multi-finger) ----------
  function buildFingerGrid() {
    els.fingerGrid.innerHTML = '';
    for (const hand of HANDS) {
      const col = document.createElement('div');
      col.className = 'finger-col';
      const h = document.createElement('div');
      h.className = 'finger-col-h'; h.textContent = hand;
      col.appendChild(h);
      for (const f of FINGERS) {
        const lab = document.createElement('label');
        lab.className = 'finger-chk';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = `chk-${hand}-${f}`;
        if (f === 'Index') cb.checked = true; // default: both index fingers
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(' ' + f));
        col.appendChild(lab);
      }
      els.fingerGrid.appendChild(col);
    }
  }
  function getTestSeq() {
    const seq = [];
    for (const hand of HANDS) for (const f of FINGERS) {
      const cb = $(`chk-${hand}-${f}`);
      if (cb && cb.checked) seq.push({ hand, finger: f });
    }
    return seq;
  }
  function setTestInputsDisabled(d) {
    els.fingerGrid.querySelectorAll('input').forEach(cb => { cb.disabled = d; });
    els.tapsPer.disabled = d;
  }
  function endTestUI() {
    setTestInputsDisabled(false);
    els.startTestBtn.disabled = false;
    els.cancelTestBtn.disabled = true;
  }
  function updateTestStatus() {
    const T = state.test;
    if (!T) { els.testStatus.textContent = 'Not started'; els.modeHint.textContent = ''; return; }
    if (T.phase === 'running') {
      const cur = T.seq[T.idx];
      const txt = `${cur.hand} ${cur.finger} — ${T.count}/${T.tapsPer} (finger ${T.idx + 1}/${T.seq.length})`;
      els.testStatus.textContent = txt;
      els.modeHint.textContent = txt;
    } else if (T.phase === 'between') {
      els.testStatus.textContent = `Waiting — finger ${T.idx + 1}/${T.seq.length}`;
      els.modeHint.textContent = '';
    } else {
      els.testStatus.textContent = 'Complete';
      els.modeHint.textContent = '';
    }
  }
  function startTest() {
    const seq = getTestSeq();
    if (!seq.length) { els.testStatus.textContent = 'Select at least one finger.'; return; }
    const tapsPer = clamp(parseInt(els.tapsPer.value, 10) || 10, 1, 100);
    state.test = { seq, tapsPer, idx: 0, count: 0, phase: 'between' };
    state.taps = []; resetCharts(); renderTable();
    setTestInputsDisabled(true);
    els.startTestBtn.disabled = true; els.cancelTestBtn.disabled = false;
    const first = seq[0];
    els.testOverlayText.textContent = `Ready: ${first.hand} ${first.finger} — ${tapsPer} taps. Press Continue to begin.`;
    els.testOverlay.hidden = false;
    updateTestStatus();
  }
  function testContinue() {
    const T = state.test;
    if (!T) { els.testOverlay.hidden = true; return; }
    if (T.phase === 'done' || T.idx >= T.seq.length) { els.testOverlay.hidden = true; endTestUI(); return; }
    const cur = T.seq[T.idx];
    state.hand = cur.hand; state.finger = cur.finger;
    els.handSelect.value = cur.hand; els.fingerSelect.value = cur.finger;
    state.taps = []; resetCharts(); renderTable();
    T.count = 0; T.phase = 'running';
    els.testOverlay.hidden = true;
    updateTestStatus();
    draw(); drawAnalysis();
  }
  function handleTestTap() {
    const T = state.test;
    if (!T) return;
    T.count++;
    updateTestStatus();
    if (T.count >= T.tapsPer) finishFinger();
  }
  function finishFinger() {
    const T = state.test;
    const cur = T.seq[T.idx];
    if (state.taps.length) { commitSession(state.taps, 'test', cur.hand, cur.finger); renderProgress(); renderCompare(); }
    T.idx++;
    if (T.idx >= T.seq.length) { finishTest(); return; }
    T.phase = 'between';
    const nxt = T.seq[T.idx];
    els.testOverlayText.textContent = `Done. Next: ${nxt.hand} ${nxt.finger} — ${T.tapsPer} taps. Switch fingers, then press Continue.`;
    els.testOverlay.hidden = false;
    updateTestStatus();
  }
  function finishTest() {
    state.test.phase = 'done';
    endTestUI();
    els.compareMetric.value = 'off';
    renderCompare();
    els.testOverlayText.textContent = 'Test complete! Compare fingers below — switch the metric, or hit "Expand all" to see every metric at once.';
    els.testOverlay.hidden = false;
    els.modeHint.textContent = '';
    els.testStatus.textContent = 'Complete';
  }
  function cancelTest() {
    if (!state.test) return;
    state.test = null;
    els.testOverlay.hidden = true;
    endTestUI();
    els.testStatus.textContent = 'Not started';
    els.modeHint.textContent = '';
  }

  // ---------- Mode switching ----------
  function setMode(mode) {
    cancelTest(); // leaving any in-progress test
    state.mode = mode;
    const calMode = mode === 'calibration';
    const testMode = mode === 'test';
    const acc = accLike(); // accuracy or test
    els.calPanel.hidden = !calMode;
    els.testPanel.hidden = !testMode;
    els.scatterBox.hidden = !acc;
    els.offsetBox.hidden = !acc;
    els.precisionBox.hidden = !acc;
    els.cardAccuracy.style.display = acc ? '' : 'none';
    els.cardOffset.style.display = acc ? '' : 'none';
    els.analysisTitle.textContent = acc ? 'Live accuracy' : calMode ? 'Calibration' : 'Live tap';
    els.targetField.hidden = !acc;
    els.modeHint.textContent = '';
    if (acc) syncTargetSlider();
    // calibration & test use their own flows, not the Start/Save session controls
    const normalSession = !calMode && !testMode;
    resetSession();
    els.startBtn.disabled = !normalSession;
    els.pauseBtn.disabled = true;
    els.saveBtn.disabled = true;
    if (calMode) clearCalibration();
    // tap/accuracy auto-record; test waits for Start test
    if (normalSession) startSession();
    else setStatus(calMode ? 'Calibration — press hard inside the box' : 'Finger Test — select fingers and Start');
    draw();
    drawAnalysis();
  }

  // ---------- Profiles ----------
  function renderProfiles() {
    els.profileSelect.innerHTML = '';
    for (const id in store.profiles) {
      const o = document.createElement('option');
      o.value = id; o.textContent = store.profiles[id].name;
      if (id === store.activeProfileId) o.selected = true;
      els.profileSelect.appendChild(o);
    }
  }
  function switchProfile(id) {
    store.activeProfileId = id; saveStore();
    resetSession(); refreshCalBadge(); renderProgress(); renderCompare();
  }

  // ---------- Export ----------
  function download(name, type, data) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCsv() {
    if (!state.taps.length) { setStatus('Nothing to export'); return; }
    const cols =['id','contactMs','x','y','wPeak','hPeak','areaPeak','areaMean','pressurePeak','pressureMean','areaNorm','pressureNorm','offset','accuracyPct'];
    const head = cols.join(',');
    const body = state.taps.map(t => cols.map(c => t[c] == null ? '' : (typeof t[c] === 'number' ? round1(t[c]) : t[c])).join(',')).join('\n');
    download(`taps-${Date.now()}.csv`, 'text/csv', head + '\n' + body);
  }
  function exportJson() {
    if (!state.taps.length) { setStatus('Nothing to export'); return; }
    const out ={ profile: activeProfile().name, mode: state.mode, summary: summarize(state.taps), taps: state.taps };
    download(`session-${Date.now()}.json`, 'application/json', JSON.stringify(out, null, 2));
  }
  async function copyMetrics() {
    const s = summarize(state.taps);
    const text = Object.entries(s).map(([k, v]) => `${k}: ${v}`).join('\n');
    try { await navigator.clipboard.writeText(text); setStatus('Metrics copied'); }
    catch { setStatus('Copy failed (clipboard blocked)'); }
  }
  function exportProfile() {
    const p = activeProfile();
    download(`profile-${p.name}-${Date.now()}.json`, 'application/json', JSON.stringify(p, null, 2));
  }
  function importProfile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        if (!p || typeof p.name !== 'string' || !p.name) throw new Error('bad');
        // Guard malformed data so the charts don't break on import.
        if (!Array.isArray(p.sessions)) p.sessions = [];
        p.id = uid();
        store.profiles[p.id] = p;
        store.activeProfileId = p.id;
        saveStore(); renderProfiles(); refreshCalBadge(); renderProgress(); renderCompare(); resetSession();
        setStatus(`Imported profile "${p.name}"`);
      } catch { setStatus('Import failed: invalid file'); }
    };
    reader.readAsText(file);
  }

  // ---------- Utils ----------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round1(v) { return v == null ? null : Math.round(v * 10) / 10; }

  // ---------- Capability note ----------
  function capabilityNote() {
    const supportsPE = 'PointerEvent' in window;
    let note = supportsPE ? 'Pointer Events ✓' : 'Touch fallback';
    note += '. Contact size from pointer width/height (or touch radius). ';
    note += 'Hardness = contact area vs your calibrated max. Pressure shown where the device reports it.';
    els.capNote.textContent = note;
  }

  // ---------- Wire up ----------
  function bind() {
    // pointer
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onCancel);
    board.addEventListener('pointerleave', onCancel);

    // controls
    els.startBtn.addEventListener('click', startSession);
    els.pauseBtn.addEventListener('click', pauseSession);
    els.saveBtn.addEventListener('click', saveSession);
    els.resetBtn.addEventListener('click', onResetClick);

    // calibration
    els.calSaveBtn.addEventListener('click', saveCalibration);
    els.calClearBtn.addEventListener('click', () => { activeProfile().calibration = null; saveStore(); clearCalibration(); refreshCalBadge(); drawAnalysis(); setStatus('Calibration cleared'); });

    // chart scale toggles
    els.areaScaleBtn.addEventListener('click', () => toggleScale('area'));
    els.timeScaleBtn.addEventListener('click', () => toggleScale('time'));

    // accuracy target radius
    els.targetRadius.addEventListener('input', onTargetChange);

    // hand / finger tagging
    els.handSelect.addEventListener('change', (e) => { state.hand = e.target.value; store.lastHand = state.hand; saveStore(); });
    els.fingerSelect.addEventListener('change', (e) => { state.finger = e.target.value; store.lastFinger = state.finger; saveStore(); });

    // finger test
    els.startTestBtn.addEventListener('click', startTest);
    els.cancelTestBtn.addEventListener('click', () => { cancelTest(); state.taps = []; resetCharts(); renderTable(); draw(); drawAnalysis(); });
    els.testContinueBtn.addEventListener('click', testContinue);

    // comparison metric
    els.compareMetric.addEventListener('change', renderCompare);
    els.compareExpandBtn.addEventListener('click', toggleCompareExpand);

    els.historyBtn.addEventListener('click', openHistory);
    els.historyCloseBtn.addEventListener('click', closeHistory);
    els.historyMetric.addEventListener('change', renderHistory);
    els.historyModal.addEventListener('click', (e) => { if (e.target === els.historyModal) closeHistory(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !els.historyModal.hidden) closeHistory(); });

    // mode / profile
    els.modeSelect.addEventListener('change', (e) => setMode(e.target.value));
    els.profileSelect.addEventListener('change', (e) => switchProfile(e.target.value));
    els.newProfileBtn.addEventListener('click', () => {
      const name = prompt('Profile name (e.g. "Right index")');
      if (!name) return;
      const p = newProfile(name.trim());
      store.profiles[p.id] = p; store.activeProfileId = p.id;
      saveStore(); renderProfiles(); switchProfile(p.id);
    });
    els.renameProfileBtn.addEventListener('click', () => {
      const name = prompt('Rename profile', activeProfile().name);
      if (!name) return;
      activeProfile().name = name.trim(); saveStore(); renderProfiles();
    });

    // table
    els.showAllBtn.addEventListener('click', () => {
      state.showAll = !state.showAll;
      els.showAllBtn.textContent = state.showAll ? 'Show last 50' : 'Show all';
      renderTable();
    });

    // export
    els.exportCsvBtn.addEventListener('click', exportCsv);
    els.exportJsonBtn.addEventListener('click', exportJson);
    els.copyBtn.addEventListener('click', copyMetrics);
    els.exportProfileBtn.addEventListener('click', exportProfile);
    els.importProfileBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', (e) => { if (e.target.files[0]) importProfile(e.target.files[0]); });

    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  }

  // ---------- Init ----------
  function init() {
    renderProfiles();
    refreshCalBadge();
    state.hand = store.lastHand || 'Right';
    state.finger = store.lastFinger || 'Index';
    els.handSelect.value = state.hand;
    els.fingerSelect.value = state.finger;
    buildFingerGrid();
    layout();
    initCharts();
    bind();
    setMode('tap'); // auto-starts a recording session (no Start needed)
    capabilityNote();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
