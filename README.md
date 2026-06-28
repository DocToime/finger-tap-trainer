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
5. After the last finger, the **Compare** chart updates so you can compare the fingers — switch the **Metric** (offset, precision, …), or press **Expand all** to see every metric at once. Use **Per finger ↗** to chart how each finger has changed across earlier tests too.

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
- Calibration also records your **maximum reported pressure** (where the device exposes it), which drives the normalized-pressure export column. On devices that don't report pressure this stays empty, exactly as before — contact area remains the primary hardness signal.

---

## Comparing fingers and hands

Every saved session is tagged with the **Hand** (Left/Right) and **Finger** (Thumb/Index/Middle/Ring/Little) selected in the header.

The **Compare fingers** panel shows a bar chart grouped by hand+finger (e.g. "R Index", "L Index"; right hand = blue, left hand = green). Pick what to compare with the **Metric** dropdown:

- **Offset px** (lower is better) — *default*
- **Precision: spread px** (lower is better)
- **Hardness %**
- **Contact ms**
- **Accuracy %** (higher is better)

**Offset px** is the default and **Accuracy %** is last on purpose: the two measure much the same thing (how close you land to the dot), but accuracy % is *relative* to the chosen target radius — change the circle size and the number changes — whereas offset is an absolute pixel distance that's comparable across any setup.

Each bar is the average across all that profile's saved sessions for that finger. The **Finger Test** mode is the quickest way to populate this fairly (same number of taps per finger in one sitting).

### Expand all (see every metric at once)
Press **Expand all** in the panel header to swap the single selectable chart for a stack of **small-multiple charts — one per metric** (offset, precision, hardness, contact ms, accuracy), all sharing the same finger groups. This lets you read every metric side-by-side without flipping the dropdown. Press **Collapse** to return to the single-chart view. (Each metric gets its own chart rather than being crammed onto one axis, because the metrics have incompatible scales — px vs % vs ms.)

### Per-finger history over time
Press **Per finger ↗** in the **Progress (saved sessions)** panel header to open the **history modal**. It plots **one line per hand+finger across your saved-session timeline**, so you can see whether a given finger is genuinely improving — e.g. its **offset** or **precision** trending downward — over many sessions, not just its current average.

- The **Metric** dropdown (defaults to **Offset px**; the same five metrics as Compare) switches what the lines show.
- The x-axis is the chronological run of saved sessions (dated/timed); each finger's points are connected across the sessions of *other* fingers in between, so its own trend stays readable.
- Close the modal with the **✕**, by clicking outside it, or with **Esc**.

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
- **Rolling precision** chart *(accuracy/test)*: the **spread of the last 10 taps** (their mean distance from their own moving centroid, in px) plotted per tap — **lower = tighter/more consistent**. It uses the same definition as the per-session "precision" metric, but as a moving window, so you can watch your consistency tighten or drift within a run. The line begins once there are at least two taps.
- **Scatter** *(accuracy/test)*: tap positions relative to the dot, latest highlighted.
- **Progress** chart: average accuracy / hardness / contact-time across your saved sessions over time. Point labels include the **time** as well as the date, so multiple sessions on the same day are distinguishable. Sessions missing a metric (e.g. tap-only sessions have no accuracy) connect across the gap rather than breaking the line.
- **Compare** chart: see [above](#comparing-fingers-and-hands).

### Target radius
In Accuracy/Test modes a slider sets the **target radius** — the distance from the dot that scores 0%. Smaller radius = stricter scoring. A dashed ring shows the boundary on the box. Dragging it instantly rescales the bullseye and recomputes accuracy for the current taps. The value is saved.

---

## Saving, progress, and data

- **Start / Pause / Stop & Save / Reset** control a Tap or Accuracy session. Tap and Accuracy modes auto-start on entry; Calibration and Finger Test use their own flows.
- **Reset** clears the current taps and charts. In Tap and Accuracy modes it then **keeps recording** (matching the auto-start behaviour), so you can immediately start a fresh run without pressing Start.
- **Stop & Save** stores the session (tagged with hand + finger) into the active profile and updates Progress and Compare. Pressing it with no taps does nothing and reports *"Nothing to save"*.
- The **Taps** table lists recent taps (last 50, with a **Show all** toggle). Columns: # · Area · % · ms · Off · Acc% · X · Y.
- All saved data persists in the browser's **localStorage** under the key `tapTrainer.v1`, so it survives reloads on the same device/browser.

---

## Export & import

Open the **Data & export** panel (collapsed at the bottom of the sidebar):

- **Export CSV** — all taps in the current session with raw + computed columns. (Disabled-effect: with no taps it reports *"Nothing to export"* instead of writing an empty file.)
- **Export JSON** — the current session plus its summary (includes precision, accuracy, etc.). Also a no-op with the same message when there are no taps.
- **Copy metrics** — copies the current session's summary to the clipboard.
- **Export profile** — the whole active profile (calibration + all sessions) as JSON.
- **Import profile** — load a previously exported profile JSON (added as a new profile). The file is lightly validated (must have a `name`; a missing or malformed session list is coerced to empty) so a bad file can't break the charts. On success, **Progress and Compare both refresh immediately**. Useful for moving data between devices or backing it up, since localStorage can be cleared by the browser.

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

## Recent changes (design + analysis update)

- **iPad / Safari tap-box fix.** After a layout redesign, the tap box rendered **stretched** on iPad Safari, the feedback dots appeared **offset and oval**, and taps only registered near the centre hint text. Cause: the canvas was sized with CSS `aspect-ratio` / `width:auto`, which WebKit resolves from the canvas's *intrinsic* (attribute) size — the very size the script rewrites each layout — so the displayed size and the drawing buffer drifted apart. The canvas is now sized to an **explicit square in JavaScript**, keeping the display size, drawing buffer, and hit-region in lockstep across Safari and Chrome.
- **Rolling-precision chart** added in Accuracy/Test modes — the spread of the last 10 taps per tap, so consistency is visible live (see [Charts](#charts-and-visualizations)).
- **Compare fingers — "Expand all"** shows every metric at once as small multiples, and the metric order now leads with **Offset px** (default) and ends with **Accuracy %** (see [Comparing fingers and hands](#comparing-fingers-and-hands)).
- **Per-finger history modal** (**Per finger ↗**) charts how each finger's offset/precision change across saved sessions over time.

---

## Recent changes (QA review fixes)

Following an internal QA review (see `REVIEW.md`), these issues were fixed:

- **Reset no longer leaves a misleading "Recording…" status.** In Tap/Accuracy modes, Reset now clears data and keeps recording so the status and Start/Pause/Stop buttons stay consistent; Calibration/Test return to an idle status.
- **Importing a profile now refreshes the Compare chart** (previously it only refreshed Progress), and the imported file is lightly validated.
- **Mode switches reset the session status** to a mode-appropriate message instead of leaving the previous one ("Saved…", "Calibrated…") on screen.
- **Progress chart** connects across sessions that lack a metric (no more broken/gapped lines) and **labels include the time** so same-day sessions don't collide.
- **The tap-box instruction label auto-shrinks** to fit narrow (phone) viewports instead of being clipped.
- **Calibration captures maximum pressure** where the device reports it, so the normalized-pressure export column is populated on capable devices.
- **Zero-tap guards:** Stop & Save and CSV/JSON export now report "Nothing to save/export" instead of saving/downloading empty data.
- **Naming:** the browser tab title now matches the in-app header ("Finger Tap Trainer").

### Known limitations / deferred

These review suggestions are intentionally **not** in this revision — they're feature/design work rather than bug fixes, and are tracked for a future pass:

- New/Rename profiles still use the browser `prompt()` dialog (awkward in some embedded browsers); no UI to **delete** a profile or individual sessions yet.
- Switching profiles doesn't restore that profile's last-used hand/finger (only the global last-used values).
- Accessibility: no keyboard alternative for the tap canvas and no ARIA live region announcing tap metrics; collapsed panels aren't `aria-hidden`.
- Progress chart plots contact-ms on a secondary axis with no toggle/normalized view.
- PRD modes not built in v1 (Trace Box Perimeter, Steady Hold, Free-Draw path drawing, sortable table, instant speed/path-length metrics) remain out of scope.

---

## Privacy

All measurements and history stay **on your device** in browser localStorage. Nothing is sent anywhere. The only network requests are loading the page, the Chart.js library, and the fonts. Exports are files you download yourself.
