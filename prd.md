**✅ Here is a detailed PRD** you can hand directly to your developer. It builds on the starter HTML I provided earlier, adding the requested features: a dedicated **target/prescribed box** on the canvas, **on-page analysis + visualizations** (graphs + interactive table), and **instant feedback** without needing to export first.

---

### **Finger Precision & Sensor Data Trainer**  
**Product Requirements Document (PRD) v1.0**

**Date:** June 28, 2026  
**Type:** Single-file web app (HTML + CSS + JS)  
**Platforms:** iPad Pro (Safari) and Amazon Fire Max 11 (Chrome/Firefox browser)  
**Goal:** Capture, visualize, and analyze raw capacitive touch sensor data (position, contact size/radius, pressure proxy, timing) in real time for finger precision, accuracy, speed, and control training. Provide instant on-screen feedback via metrics, graphs, and table.

#### 1. Overview & Objectives
A lightweight, self-contained web tool that turns the tablet’s touch sensor into a quantifiable training + diagnostic device.  
Users interact inside a clearly defined **target box** on the canvas. All other screen real estate is dedicated to live data, analysis, and reporting.  
No app store submission, developer accounts, or native code required. Runs locally or hosted (GitHub Pages, Netlify, etc.).

**Key Benefits**
- Full access to sensor data (`x/y`, `radiusX/radiusY` or equivalent, pressure proxy, timestamps).
- Instant visual + quantitative feedback.
- Training-oriented with simple prescribed tasks.
- Exportable raw + analyzed data for further use.

#### 2. User Stories
- As a user, I want to press/trace inside a defined box so my training is focused and repeatable.
- As a user, I want to see live sensor values while interacting.
- As a user, I want instant post-session (or live) analysis: speed, contact consistency, accuracy, with graphs and a data table.
- As a developer/tester, I want easy export of raw events + computed metrics.

#### 3. UI Layout (Recommended)
**Visual reference (tablet mockup):**




**Layout breakdown (flex/grid, tablet-optimized):**
- **Header (top bar):** Title “Finger Precision Trainer” + Task selector dropdown (Free Draw, Trace Box Perimeter, Steady Hold, Precision Taps, Custom) + Session status.
- **Left/Main area (60-70% width):** Large `<canvas>` with prominent **target box** (blue-bordered rectangle, clearly labeled “Press or trace inside this box”). Touches outside are ignored or dimmed. Path is drawn with variable thickness based on contact radius. Optional overlays (grid, center dot, trace path for guided tasks).
- **Right Sidebar (30-40% width, scrollable):**
  - **Live Sensor Data** — Cards or clean grid: Current X, Y, Radius X/Y (contact size), Pressure proxy, Delta Time / Instant Speed.
  - **Session Controls** — Big buttons: Start Logging, Pause, Stop & Analyze, Reset/Clear.
  - **Analysis Dashboard** — Summary metrics cards (calculated on Stop or live-updating where cheap): Avg/Max/Min Speed, Path Length, Contact Size Consistency (mean ± std dev of radius), Pressure Variation, Accuracy % (if task has target), Time Inside Box, # Events.
  - **Graphs section** — Two side-by-side or tabbed line charts:
    - Radius / Contact Size over Time
    - Instantaneous Speed over Time
    - (Optional third: Pressure proxy over time)
  - **Data Table** — Scrollable HTML table of logged events (columns: Time, X, Y, RadiusX, RadiusY, Pressure, Delta (ms), Inst. Speed). Limit to last 50–100 rows or paginate for performance; “Show All” toggle.
- **Footer (optional):** Export buttons (CSV of raw events + JSON summary) + “Copy Metrics” button.

**Responsive notes:** On narrower views, sidebar stacks below canvas. Use large touch-friendly targets and high-contrast colors.

#### 4. Functional Requirements

**4.1 Target Box & Interaction**
- Fixed or user-adjustable rectangular target area on canvas (e.g., 60–80% of canvas, centered or offset).
- Only process `pointer`/`touch` events whose coordinates fall inside the box.
- Draw current and historical path inside the box with line width proportional to `radiusX`/`radiusY`.
- Visual feedback: Highlight box on touch, show current contact ellipse if desired.

**4.2 Data Capture**
- Primary: Pointer Events API (best cross-device compatibility).
- Fallback: Touch Events.
- Per event captured: `timestamp` (performance.now()), `x`, `y`, `radiusX`, `radiusY`, `pressure`/`force` (or 0 if unavailable), `deltaTime` from previous event.
- Compute on-the-fly: Instant speed = distance / deltaTime.

**4.3 Tasks / Modes (selectable)**
- **Free Draw** — Unconstrained inside box.
- **Trace Box** — Guide user to follow the perimeter (show faint path or corners).
- **Steady Hold** — Hold finger steady; measure radius/pressure variance over time.
- **Precision Taps** — Multiple small targets inside box; score tap accuracy + timing.
- Easy to extend later.

**4.4 Analysis & Visualization (Core Value)**
- **Live partial updates** where possible (speed, current radius).
- **On Stop / Analyze:**
  - Calculate full session metrics (see below).
  - Populate/update graphs (Chart.js recommended via CDN for simplicity).
  - Populate data table.
- **Metrics to compute** (examples — adjust with dev):
  - Duration, number of touch points/events.
  - Total path length (sum of distances between consecutive points).
  - Average / max / min instantaneous speed.
  - Contact size consistency: mean(radiusX), stdDev(radiusX), same for radiusY.
  - Pressure proxy: mean & stdDev.
  - Accuracy (task-dependent): % of points inside ideal area, mean deviation from center/path, time spent with stable radius.
  - Reaction/hold metrics for Steady Hold task.

**4.5 Graphs**
- Use Chart.js (CDN) or lightweight canvas-based line charts.
- Update live during session (throttled) or fully on Stop.
- Interactive: hover to see exact values, zoom/pan optional in v1.

**4.6 Data Table**
- Real-time append during logging (or batch on stop).
- Sortable columns (basic JS).
- Exportable together with raw CSV.

**4.7 Export**
- CSV: All raw events + computed columns.
- Optional: JSON summary object with metrics + task info.
- “Download Dashboard Screenshot” (html2canvas or simple).

#### 5. Technical Approach & Recommendations
- **Single HTML file** preferred for v1 (easy to share/edit).
- **Dependencies (minimal):** Chart.js via CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js">`).
- **Performance:** Throttle canvas redraws and table updates (requestAnimationFrame + debounce). Limit in-memory events or use efficient array.
- **Data model:** Simple JS array of event objects. Compute metrics with small helper functions.
- **Styling:** Tailwind CSS via CDN or plain CSS for zero-dependency version.
- **Accessibility:** ARIA labels, sufficient contrast, large interactive areas.
- **Offline:** Works once loaded (cache manifest or PWA manifest for “Add to Home Screen”).

#### 6. Code Snippets for Key Parts (for your dev)

**Target box definition + drawing (inside canvas setup):**
```js
const targetBox = { x: 150, y: 100, width: 500, height: 400 }; // adjustable

function drawTargetBox() {
  ctx.strokeStyle = '#0066ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
  ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
  ctx.fillRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
  // label
  ctx.fillStyle = '#0066ff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Press or trace inside this box', targetBox.x + 10, targetBox.y + 25);
}
```

**Event handling (Pointer Events preferred) + filtering to box:**
```js
canvas.addEventListener('pointerdown', handlePointer);
canvas.addEventListener('pointermove', (e) => { if (e.buttons) handlePointer(e); });

function handlePointer(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (x < targetBox.x || x > targetBox.x + targetBox.width ||
      y < targetBox.y || y > targetBox.y + targetBox.height) return; // outside box

  // ... capture radiusX = e.radiusX || 10; etc.
  // compute delta, instantSpeed
  // draw path with ctx.lineWidth = radiusX * scale;
  // push to log array if logging
  // update live UI
}
```

**Metrics calculation example (on Stop):**
```js
function calculateMetrics(events) {
  if (!events.length) return {};
  // path length, avg speed, stdDev radius, etc.
  // Use simple math helpers or a small stats library
  return { avgSpeed, pathLength, radiusMean, radiusStd, accuracy: 0 /* task-specific */ };
}
```

**Chart.js example (Radius over Time):**
```js
let radiusChart;
function initCharts() {
  const ctxR = document.getElementById('radiusChart').getContext('2d');
  radiusChart = new Chart(ctxR, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Radius X', data: [] }] },
    options: { /* responsive, animation off for performance */ }
  });
}

function updateRadiusChart(newPoint) {
  radiusChart.data.labels.push(newPoint.timeLabel);
  radiusChart.data.datasets[0].data.push(newPoint.radiusX);
  radiusChart.update();
}
```

**Simple data table rendering:**
```js
function renderTable(events) {
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';
  events.slice(-50).forEach(ev => { /* create tr with cells */ });
}
```

#### 7. Non-Functional Requirements
- Smooth 60+ fps canvas interaction.
- Handles high-frequency touch sampling (iPad ~120 Hz) without lag.
- Works offline after first load.
- Privacy: All data stays local (no network calls unless user exports).

#### 8. Out of Scope (v1)
- Multi-touch detailed per-finger analysis.
- User accounts / cloud storage.
- Advanced statistical tests or ML.
- Native iOS/Android wrappers.

#### 9. Acceptance Criteria (for QA)
- User can only meaningfully interact inside the target box.
- Live sensor panel updates in real time.
- On “Stop & Analyze”: metrics appear, graphs populate with correct data, table shows events.
- Export produces valid CSV/JSON with all captured fields + computed metrics.
- Runs smoothly on both target devices (iPad Pro 2020 and Fire Max 11).
- No external dependencies beyond optional Chart.js CDN.

#### 10. Next Steps & Recommendations for Dev
1. Start with the starter HTML I gave you and implement the target box + filtering first.
2. Add event logging array + basic metrics.
3. Integrate Chart.js for the two main graphs.
4. Build the sidebar layout and table.
5. Add task modes incrementally.
6. Polish visuals and responsiveness.

This PRD gives your developer a clear, self-contained spec with concrete code examples to discuss and iterate on. The result will be a polished, immediately useful training tool that surfaces exactly the sensor information we discussed (position trajectory + contact size/radius variation + timing/pressure proxies) with instant analysis.
