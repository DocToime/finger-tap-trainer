# Finger Tap Precision Trainer — Build Plan

**Derived from:** `prd.md` (v1.0)
**Revision focus:** Tap-centric measurement (not drawing), live analysis, per-finger calibration & normalization, persistent progress tracking.
**Stack:** Split files (`index.html` / `styles.css` / `app.js`), Chart.js via CDN, plain CSS. No build step — open the file or serve statically.
**Targets:** iPad Pro (Safari), Amazon Fire Max 11 (Chrome/Firefox).

---

## 1. What changed vs the PRD

The PRD was written around *drawing/tracing* with a "Stop & Analyze" step. Per discussion, v1 is **tap-focused** and **fully live**:

| PRD concept | v1 decision |
|---|---|
| Free Draw / Trace / Steady Hold / Precision Taps modes | **Tap Analysis**, **Accuracy**, **Calibration** modes |
| Stop & Analyze (batch) | **Live analysis** — every tap computes & displays instantly |
| Fixed tasks | Freeform tapping; session = Start → Stop/Save |
| Raw radius/pressure only | Same, **plus normalization** against a calibrated max |
| Export only | **Persistent localStorage** history + progress charts + export |

---

## 2. Modes

### 2.1 Calibration mode
- Prompt: "Press as hard as you can, several times, inside the box."
- Capture peak `radiusX`/`radiusY` (→ effective contact area) and peak `pressure`/`force` across a few presses.
- Store per active profile: `maxArea`, `maxRadiusX`, `maxRadiusY`, `maxPressure`, timestamp.
- All later "hardness" metrics reported as **% of calibrated max** (normalized) alongside raw values.
- One-tap **Recalibrate** button; calibration is per profile, so switching finger/user just switches calibration.
- If no calibration exists, app still works but flags hardness as "uncalibrated (raw only)."

### 2.2 Tap Analysis mode (default)
- User taps anywhere inside the target box.
- Per tap, on finger-up, compute:
  - **Contact area / surface size** — from `radiusX`×`radiusY` (ellipse area ≈ π·rx·ry), raw + normalized %.
  - **Hardness proxy** — normalized contact area (and `pressure` if device reports it).
  - **Contact time** — `up_timestamp − down_timestamp` (ms).
  - **Peak vs mean area during contact** — sampled across pointermove events while down.
  - **Position** (x, y) of tap centroid.
- Live feedback: animated ring sized to contact area, colored by normalized hardness; metric cards + table + charts update immediately.

### 2.3 Accuracy mode
- Single fixed **center dot** drawn in the box.
- Per tap, additionally compute:
  - **Offset** = distance from tap centroid to dot center (px and mm if we calibrate DPI later).
  - **Accuracy score** = inverse of offset, normalized to box size (e.g. 100% at dead center → 0% at box edge).
- Live **scatter plot** of tap landing points relative to the dot; running mean offset + spread (std dev).

---

## 3. Data model

```js
// One captured tap
Tap = {
  id, t,                       // index, wall-clock start
  downTs, upTs, contactMs,     // timing (performance.now based)
  x, y,                        // centroid position in box coords
  radiusXPeak, radiusYPeak,
  areaPeak, areaMean,          // px^2 (ellipse)
  pressurePeak, pressureMean,  // 0 if unsupported
  areaNorm, pressureNorm,      // % of calibrated max (null if uncalibrated)
  offset, accuracyPct,         // accuracy mode only
  samples: [{ts, rx, ry, p}]   // raw move samples during contact (optional, for area-over-time)
}

// Saved session
Session = { id, profileId, mode, startedAt, endedAt, taps:[...], summary:{...} }

// Profile
Profile = {
  id, name,
  calibration: { maxArea, maxRadiusX, maxRadiusY, maxPressure, calibratedAt } | null,
  sessions: [Session, ...]   // or session ids referencing a sessions store
}

// localStorage root
Store = { activeProfileId, profiles: { [id]: Profile } }
```

Persistence: write to `localStorage` on session save and on calibration. Versioned key (e.g. `tapTrainer.v1`) for forward migration.

---

## 4. Capture pipeline

- **Pointer Events API** primary (`pointerdown` / `pointermove` / `pointerup` / `pointercancel`); Touch Events fallback if `radiusX` absent.
- On `pointerdown` inside box: open a tap record, start sampling.
- On each `pointermove` while down: push `{ts, radiusX, radiusY, pressure}` sample (throttled to rAF).
- On `pointerup`: close record, compute metrics, normalize, render live, append to session, persist incrementally (or on save).
- Ignore / dim taps outside the box.
- Guard against multi-touch in v1: track a single active `pointerId`; ignore others (out of scope per PRD §8).
- Note device caveats: Safari/iPad exposes `radiusX/radiusY`; many Android/Chrome builds report coarse or constant radius and `pressure` may be 0 — UI must degrade gracefully and label what's actually available.

---

## 5. UI layout

- **Header:** Title · Profile selector (+ New / Rename) · Mode selector (Calibration / Tap Analysis / Accuracy) · Calibration status badge.
- **Main (left, ~65%):** `<canvas>` with target box, center dot (accuracy mode), live contact-ring feedback.
- **Sidebar (right, ~35%, scrollable):**
  - **Live cards:** last tap area (raw + %), hardness, contact time, offset/accuracy (accuracy mode), tap count.
  - **Session controls:** Start, Pause, Stop & Save, Reset.
  - **Live charts (Chart.js):** (1) contact area / hardness per tap, (2) contact time per tap, (3) accuracy scatter (accuracy mode).
  - **Tap table:** last 50 rows (Time, X, Y, Area, Area%, Pressure, Contact ms, Offset/Acc); "Show all" toggle.
  - **Progress (cross-session):** trend chart of saved-session summaries (avg accuracy / avg hardness / avg contact time over time) for the active profile.
- **Footer:** Export CSV (taps) · Export JSON (session+summary) · Copy metrics.
- Responsive: sidebar stacks under canvas on narrow widths; large touch targets, high contrast.

---

## 6. Metrics (computed live, aggregated per session)

Per tap: area (raw/norm), hardness, contact time, offset, accuracy%.
Session summary: count; mean/min/max/stdDev of area, hardness, contact time; mean offset & accuracy; consistency (lower std = better). These summaries are what feed the cross-session progress trends.

---

## 7. Build order (incremental, runnable at each step)

1. **Scaffold** — split files, canvas + target box drawing, responsive layout shell.
2. **Capture core** — pointer pipeline, single-tap record, draw contact ring on tap.
3. **Tap Analysis metrics** — area/time/position compute, live cards + table.
4. **Profiles + persistence** — localStorage store, profile create/select, session save/load.
5. **Calibration mode** — max-press capture, normalization wired into hardness metrics.
6. **Live charts** — Chart.js area + contact-time per-tap charts.
7. **Accuracy mode** — center dot, offset/accuracy, scatter plot.
8. **Progress view** — cross-session trend charts from saved summaries.
9. **Export** — CSV/JSON/copy.
10. **Polish** — device-capability labeling, throttling/perf, contrast/ARIA, offline (PWA manifest optional).

A usable app exists after step 3; calibration+normalization (5) and progress (8) complete the core value.

---

## 8. Non-functional / acceptance

- Smooth on iPad (~120 Hz) and Fire Max 11; throttle redraws via rAF.
- Each tap's metrics appear within one frame of finger-up (live).
- Calibration normalizes hardness; switching profiles switches calibration + history.
- Saved sessions persist across reloads and feed progress charts.
- Export produces valid CSV/JSON with raw + computed + normalized fields.
- Gracefully labels missing sensor data (radius/pressure) per device.
- All data local; no network except CDN load + user-initiated export.

---

## 9. Open questions

1. **Profiles:** named profiles in localStorage assumed. Want **export/import JSON** too (survives browser clearing / device change)? (Recommended yes, small add.)
2. **Accuracy target:** single fixed center dot for v1 assumed — OK, or do you want the dot to move to random/sequenced positions?
3. **Multi-touch:** single-finger only in v1 (ignore extra pointers) — fine?
4. **Real-world units:** report area in px² for v1; add mm² later via a DPI calibration step? (Out of scope v1 unless you need it.)
5. **Progress scope:** trends computed from saved sessions only (you choose when to save) — good, or auto-save every session?
