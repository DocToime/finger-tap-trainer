# Finger Tap Precision Trainer

A lightweight web app that turns a touchscreen into a **finger precision, accuracy, and consistency trainer**. You tap inside a target box and the app measures everything about each tap — how big the contact patch is (a proxy for how hard you press), how long your finger is in contact, where you land relative to a target, and how tightly your taps cluster — then shows it back to you **live**, tracks progress over time, and lets you **compare different fingers and hands**.

Suitable for kids and adults. No install, no accounts, no servers — everything runs in the browser and all data stays on your device.

**Live app:** https://doctoime.github.io/finger-tap-trainer/

---

## Table of contents

- [Quick start](#quick-start)
- [Core concepts](#core-concepts)
- [Modes](#modes)
- [Metrics explained](#metrics-explained)
- [Profiles](#profiles)
- [Calibration & normalization](#calibration--normalization)
- [Comparing fingers and hands](#comparing-fingers-and-hands)
- [The screen layout](#the-screen-layout)
- [Charts and visualizations](#charts-and-visualizations)
- [Saving, progress, and data](#saving-progress-and-data)
- [Export & import](#export--import)
- [How tap data is captured](#how-tap-data-is-captured)
- [Device notes](#device-notes)
- [Running it yourself](#running-it-yourself)
- [Project structure](#project-structure)
- [Privacy](#privacy)

---

## Quick start

1. Open the app. It loads in **Tap Analysis** mode and **starts recording automatically** — no need to press Start.
2. Tap inside the box. Each tap instantly shows its metrics in the live cards, the table, and the charts.
3. (Recommended) Run **Calibration** once so "hardness" is meaningful for your finger.
4. Switch to **Accuracy** to tap a target dot, or **Finger Test** to run a guided test across several fingers and compare them.
5. Press **Stop & Save** to store a session; saved sessions feed the **Progress** and **Compare** charts.

---

## Core concepts

- **Tap** — one finger-down → finger-up event. The app records its timing, contact size, position, and (in accuracy modes) distance from a target.
- **Session** — a run of taps from Start until you Stop & Save (or, in Finger Test, the taps for one finger). Saved sessions are tagged with the **hand** and **finger** you selected.
- **Profile** — a named person/finger setup stored locally, holding its own **calibration** and **session history**.
- **Accuracy vs Precision** — two different things the app measures separately (see [Metrics](#metrics-explained)).

---

## Modes

Choose the mode from the **Mode** dropdown in the header.

### Tap Analysis (default)
Tap anywhere inside the box. Measures contact size/hardness, contact time, and position for every tap. Best for exploring raw tap behaviour and pressing consistency. Records automatically on load.

### Accuracy
A fixed **target dot** appears in the centre of the box. Each tap additionally measures how far you landed from the dot (**offset**) and an **accuracy %**. A dashed ring shows the boundary that counts as 0% accuracy — its size is adjustable (see [Target radius](#target-radius)).

### Finger Test (guided)
A structured test that walks you through several fingers in turn and then compares them.

1. In the **Finger Test** panel, tick which fingers to test (both index fingers are ticked by default), set **taps per finger** (default 10), and press **Start test**.
2. A prompt appears: *"Ready: Right Index — 10 taps. Press Continue to begin."*
3. Tap the dot the required number of times (an on-screen counter tracks progress).
4. When done, you're prompted to switch fingers and press **Continue** — this gate prevents taps from being miscounted between fingers.
5. After the last finger, the **Compare** chart updates so you can compare each finger's **accuracy** and **precision** (toggle the metric).

Each finger's taps are saved as a tagged session, so they also flow into Progress and Compare history.

### Calibration
Used to make "hardness" meaningful. See [Calibration & normalization](#calibration--normalization).

---

## Metrics explained

For each tap:

| Metric | Meaning |
|---|---|
| **Contact area (px²)** | Size of the finger's contact patch, computed as an ellipse from the pointer's contact width/height (or touch radius). Bigger patch ≈ pressing harder/flatter. |
| **Hardness %** | Contact area expressed as a percentage of your **calibrated maximum** (see calibration). 100% ≈ pressing as hard as during calibration. Shows "–" if not yet calibrated. |
| **Contact time (ms)** | How long the finger was down (finger-down to finger-up). |
| **Position (X, Y)** | Where the tap landed inside the box. |
| **Offset (px)** | *(Accuracy/Test only)* Straight-line distance from the tap to the target dot. A pure positive distance, regardless of direction. |
| **Accuracy %** | *(Accuracy/Test only)* `100% × (1 − offset / target-radius)`, clamped to 0–100. Dead-centre = 100%; at/beyond the target radius = 0%. |

For each saved session (summary):

- Count, average/min/max and **standard deviation** of area and contact time.
- Average accuracy and average offset.
- Average and standard deviation of hardness.
- **Precision** — see below.

### Accuracy vs Precision (important)

These measure two different skills:

- **Accuracy** = how close your taps are to the **target dot**. (Are you hitting the bullseye?)
- **Precision** = how tightly your taps cluster around **their own centre**, ignoring where the target is. (Are your taps consistent/repeatable?)

Precision is computed as the average distance of the taps from their own centroid (in px). **Lower = more precise/consistent.** A finger can be *precise but inaccurate* (a tight cluster sitting off to one side) — measuring both tells you whether to work on consistency or on aim.

---

## Profiles

A **profile** is a named setup (e.g. "Jane", "Right index", "Grandpa") stored in your browser. Each profile keeps its **own calibration** and **own saved sessions**.

- **+ New** — create a profile.
- **Rename** — rename the active profile.
- **Profile** dropdown — switch between them. Switching updates the calibration badge, progress, and comparison to that profile's data.

Use separate profiles per person, or per finger if you want each finger to have its own calibration baseline.

---

## Calibration & normalization

Different fingers and people produce different contact sizes, so raw area isn't comparable on its own. Calibration fixes this.

1. Switch to **Calibration** mode.
2. **Press as hard as you can** inside the box, several times.
3. The app captures your maximum contact area and shows the press count and max area.
4. Press **Save calibration**.

After calibration, every tap's **Hardness %** is shown relative to that maximum (e.g. a tap at half your max area reads ~50%). The header badge shows **Calibrated** / **Uncalibrated**.

- Calibration is **per profile** — switching profiles switches the calibration.
- **Clear** removes it; the app still works but hardness shows raw-only ("–" for the %).
- Recalibrate any time (e.g. for a different finger or user).

---

## Comparing fingers and hands

Every saved session is tagged with the **Hand** (Left/Right) and **Finger** (Thumb/Index/Middle/Ring/Little) selected in the header.

The **Compare fingers** panel shows a bar chart grouped by hand+finger (e.g. "R Index", "L Index"; right hand = blue, left hand = green). Pick what to compare with the **Metric** dropdown:

- **Accuracy %** (higher is better)
- **Precision: spread px** (lower is better)
- **Offset px** (lower is better)
- **Hardness %**
- **Contact ms**

Each bar is the average across all that profile's saved sessions for that finger. The **Finger Test** mode is the quickest way to populate this fairly (same number of taps per finger in one sitting).

---

## The screen layout

The layout adapts to screen size and the tap box is deliberately kept modest so results stay visible.

- **Desktop (wide):** three columns — tap box · live analysis + taps table · dashboard sidebar.
- **Tablet landscape:** two columns — box and table on the left, dashboard on the right.
- **Phone / portrait:** single column — a small box, then the results overview (live cards + comparison) directly beneath it, then the analysis viz and table.

The header holds Profile, Hand, Finger, Mode, the calibration badge, and (in accuracy modes) the target-radius slider.

---

## Charts and visualizations

- **Live analysis canvas** (next to the box): changes per mode —
  - *Tap:* a hardness gauge plus big area and contact-time readouts.
  - *Accuracy/Test:* a bullseye target with rings (75/50/25/0%), every tap plotted, the **latest tap highlighted in yellow**, and a live accuracy readout.
  - *Calibration:* press count and max-area readouts.
- **Per-tap charts** (sidebar): contact area and contact time per tap. Each has a **2× last** button that snaps the y-axis to twice the most recent tap's value (a one-time zoom); press again for auto-scale.
- **Distance from dot** chart *(accuracy/test)*: pure offset distance per tap.
- **Scatter** *(accuracy/test)*: tap positions relative to the dot, latest highlighted.
- **Progress** chart: average accuracy / hardness / contact-time across your saved sessions over time.
- **Compare** chart: see [above](#comparing-fingers-and-hands).

### Target radius
In Accuracy/Test modes a slider sets the **target radius** — the distance from the dot that scores 0%. Smaller radius = stricter scoring. A dashed ring shows the boundary on the box. Dragging it instantly rescales the bullseye and recomputes accuracy for the current taps. The value is saved.

---

## Saving, progress, and data

- **Start / Pause / Stop & Save / Reset** control a Tap or Accuracy session. Tap and Accuracy modes auto-start on entry; Calibration and Finger Test use their own flows.
- **Stop & Save** stores the session (tagged with hand + finger) into the active profile and updates Progress and Compare.
- The **Taps** table lists recent taps (last 50, with a **Show all** toggle). Columns: # · Area · % · ms · Off · Acc% · X · Y.
- All saved data persists in the browser's **localStorage** under the key `tapTrainer.v1`, so it survives reloads on the same device/browser.

---

## Export & import

Open the **Data & export** panel (collapsed at the bottom of the sidebar):

- **Export CSV** — all taps in the current session with raw + computed columns.
- **Export JSON** — the current session plus its summary (includes precision, accuracy, etc.).
- **Copy metrics** — copies the current session's summary to the clipboard.
- **Export profile** — the whole active profile (calibration + all sessions) as JSON.
- **Import profile** — load a previously exported profile JSON (added as a new profile). Useful for moving data between devices or backing it up, since localStorage can be cleared by the browser.

---

## How tap data is captured

- The app uses the **Pointer Events API** (`pointerdown` / `pointermove` / `pointerup`), falling back to touch radius where needed.
- Contact size comes from the pointer's **`width`/`height`** (the contact geometry in CSS pixels), or `radiusX/radiusY` on touch. Area is computed as an ellipse: `π × (width/2) × (height/2)`.
- While the finger is down, samples are taken to capture the **peak** and **mean** contact area and pressure; contact time is `up − down`.
- Only one finger is tracked at a time (single-touch); extra simultaneous touches are ignored.
- Taps outside the box are ignored.

---

## Device notes

- **iPad / Safari** report rich contact geometry, so area/hardness are most meaningful there.
- Many **Android/Chrome** devices report a coarse or constant contact size and `pressure` of 0. The app degrades gracefully and the footer note states what's available on your device.
- Pressure is recorded where the device exposes it, but **contact area is the primary hardness signal** because it's more widely and reliably reported.

---

## Running it yourself

It's a static site — no build step.

```bash
# from the project folder
python3 -m http.server 8000
# then open http://127.0.0.1:8000
```

To use it on a tablet/phone on your network, serve on all interfaces and open `http://<your-computer-ip>:8000`:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Or just use the hosted version on GitHub Pages (link at the top).

---

## Project structure

```
index.html    Markup: header controls, tap canvas, live viz, table, dashboard panels
styles.css    Minimal, responsive styling (grid layout, capped box, dark theme)
app.js        All logic: capture pipeline, metrics, modes, charts, profiles,
              calibration, finger test, comparison, persistence, export/import
prd.md        Original product requirements
PLAN.md       Implementation plan
README.md     This document
```

Dependencies: **Chart.js** (via CDN) for the charts; fonts (IBM Plex) via Google Fonts. Everything else is vanilla HTML/CSS/JS.

---

## Privacy

All measurements and history stay **on your device** in browser localStorage. Nothing is sent anywhere. The only network requests are loading the page, the Chart.js library, and the fonts. Exports are files you download yourself.
