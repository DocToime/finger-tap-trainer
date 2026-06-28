# Finger Tap Trainer — QA Review & Dev Discussion Notes

**Reviewed:** 28 June 2026  
**Environment:** Local dev server (`http://127.0.0.1:8000`) via Cursor browser automation (desktop + 390×844 mobile viewport)  
**Scope:** Full walkthrough of Tap Analysis, Accuracy, Calibration, Finger Test, profiles, charts, persistence, and export flows

---

## Resolution status (28 June 2026)

The numbered bugs below have been addressed; selected cheap UX wins were also taken. Larger UX/product items are deferred and tracked.

| Item | Status | Notes |
|------|--------|-------|
| #1 Reset leaves "Recording…" status | ✅ Fixed | Reset now restarts recording in Tap/Accuracy via a dedicated `onResetClick()`; Cal/Test set an idle status. `resetSession()` left status-free so it doesn't clobber "Saved…"/"Imported…". |
| #2 Reset stops capture without restarting | ✅ Fixed | Same handler — auto-record modes keep recording after Reset. |
| #3 Import doesn't refresh Compare | ✅ Fixed | `importProfile()` now calls `renderCompare()`; added light schema validation. |
| #4 Progress null gaps | ✅ Fixed | `spanGaps: true` on all three Progress datasets. |
| #5 Canvas label truncated on mobile | ✅ Fixed | Label font auto-shrinks (14→9px) to fit box width; also covers the longer Calibration string. |
| #6 Status not cleared on mode switch | ✅ Fixed | `setMode()` sets a mode-appropriate status for Cal/Test (Tap/Accuracy get "Recording…" from `startSession`). |
| #7 Progress date labels collide | ✅ Fixed | Labels now include `HH:mm`. |
| #8 `pressureNorm` never populated | ✅ Fixed | Calibration captures max reported pressure; stays `0`→`null` on devices without pressure (no regression). |
| Stop & Save with zero taps | ✅ Fixed | Reports "Nothing to save". |
| Export CSV/JSON with zero taps | ✅ Fixed | Aborts with "Nothing to export". |
| Import validation | ✅ Partial | Name + sessions-array guard added; full schema validation deferred. |
| Title vs header naming | ✅ Fixed | `<title>` set to "Finger Tap Trainer". |

**Deferred (feature/design, not bugs):** profile delete & per-session delete; replace `prompt()` with inline modal; restore per-profile last hand/finger; ARIA live region + keyboard canvas alternative + `aria-hidden` on collapsed panels; Progress secondary-axis toggle/normalized view; Compare axis unit labels; Calibration unsaved-presses / clear confirmations; PRD modes (Trace/Hold/Free-Draw/sortable table/speed metrics). See README → *Recent changes / Known limitations*.

---

## Executive summary

The app is well-built for a zero-build static site: clear mode separation, sensible data model, live feedback, and local-only persistence. Core tap capture, calibration, accuracy scoring, finger test flow, session save, and compare/progress charts all work.

There are a handful of **state/UX bugs** (mostly around Reset and session status), a few **missing refresh hooks**, and some **mobile polish** items. Nothing appears fundamentally broken, but the Reset/status mismatch is confusing enough to fix before wider testing on real tablets.

---

## What works well

| Area | Notes |
|------|-------|
| **Tap Analysis** | Auto-starts on load; taps register; live cards, table, per-tap charts, and analysis canvas update correctly |
| **Pause** | Taps ignored while paused; Resume restores capture |
| **Stop & Save** | Sessions persist to `localStorage`; Progress and Compare charts update |
| **Calibration** | Hard presses recorded; Save sets per-profile max area; Hardness % appears on subsequent taps |
| **Accuracy mode** | Target dot, offset/accuracy columns, scatter + offset charts; target-radius slider recalculates all taps live |
| **Finger Test** | Overlay gate between fingers works; auto-saves per finger; completion switches Compare metric to Accuracy |
| **Outside-box filtering** | Taps outside the inner box are ignored |
| **Compare chart** | Groups by hand+finger with colour coding (Right=blue, Left=green) |
| **2× last chart scale** | Toggles y-axis zoom; button label switches to “Auto” |
| **Persistence** | Profiles, calibration, sessions, hand/finger, and target radius survive reload |
| **Responsive layout** | Three-column → two-column → single-column breakpoints behave as documented |

---

## Bugs & fixes needed

### 1. Reset leaves misleading “Recording…” status (High)

**Steps:** Tap Analysis → recording active → press **Reset**.

**Expected:** Status reflects idle/stopped state (e.g. “Ready” or “Tap Start to record”), and behaviour matches.

**Actual:** Status stays **“Recording…”**, but **Start** becomes enabled and **Pause/Stop & Save** disabled — recording has actually stopped. Taps no longer register until Start is pressed.

**Fix:** In `resetSession()`, call `setStatus(...)` with an appropriate idle message. Consider either:
- auto-restarting recording in Tap/Accuracy modes (to match auto-start on mode entry), **or**
- clearly showing “Stopped — press Start” so status and buttons align.

**File:** `app.js` → `resetSession()` (~line 774)

---

### 2. Reset in auto-record modes stops capture without restarting (Medium)

Related to #1. Tap Analysis and Accuracy modes auto-start via `setMode()` → `startSession()`. After Reset, the user must manually press Start even though the product README says recording starts automatically.

**Fix:** After `resetSession()` in tap/accuracy modes, call `startSession()` again (unless paused was intentional — Reset could imply “clear data, keep recording”).

---

### 3. Import profile does not refresh Compare chart (Medium)

**Steps:** Export profile → import on a clean state (or after clearing sessions) → open Compare panel.

**Expected:** Compare chart shows imported session data.

**Actual:** `importProfile()` calls `renderProgress()` but **not** `renderCompare()`. Compare stays empty until the user changes the metric dropdown.

**Fix:** Add `renderCompare()` in `importProfile()` success path.

**File:** `app.js` → `importProfile()` (~line 988)

---

### 4. Progress chart shows `null` gaps for tap-only / uncalibrated sessions (Low–Medium)

Saved Tap Analysis sessions before calibration produce `avgAccuracy: null` and `avgHardness: null`. Chart.js renders broken/gapped lines on the Progress chart (confirmed: first session point null, second populated).

**Fix options:**
- Filter nulls and connect only valid points
- Use separate progress series per metric with “N/A” tooltips
- Hide accuracy/hardness lines until at least one session has data for that metric
- Store `mode` on session and only plot relevant metrics

**File:** `app.js` → `renderProgress()` (~line 673)

---

### 5. Canvas instruction text truncated on narrow viewports (Low)

On mobile (390px), label **“Tap anywhere inside this box”** is clipped to **“Tap anywhere inside this”**.

**Fix:** Shorten copy on small screens, reduce font size, wrap text, or widen usable label area inside the box draw call.

**File:** `app.js` → `draw()` label (~line 176–185)

---

### 6. Session status not cleared on mode switch (Low)

Switching e.g. Calibration → Tap Analysis leaves prior messages (“Saved: …”, “Calibrated …”) until the next action updates status. Mode changes should reset status to something mode-appropriate.

**File:** `app.js` → `setMode()` (~line 907)

---

### 7. Progress chart date labels collide on same day (Low)

Multiple sessions on one day all label as e.g. “Jun 28”. Hard to distinguish sessions in Progress view.

**Fix:** Include time (`HH:mm`) or session index/mode in labels.

**File:** `app.js` → `renderProgress()` (~line 677)

---

### 8. `pressureNorm` never populated (Low — data accuracy)

Calibration always sets `maxPressure: 0`, so `pressureNorm` is always `null` even when devices report pressure.

**Fix:** Either capture max pressure during calibration (parallel to area) or remove pressure columns from export/docs until supported.

**File:** `app.js` → `saveCalibration()` (~line 474–477)

---

## UX / product improvements (suggestions)

### Session controls clarity

- README says “starts recording automatically — no need to press Start”, but **Start/Pause/Stop** are still prominent. On auto-record modes, consider hiding Start or renaming to “New session”.
- **Stop & Save** with zero taps silently resets — a brief “Nothing to save” message would help.

### Profiles

- **New/Rename** use `prompt()`, which is awkward on iPad and blocked in some embedded browsers. Replace with inline modal or small form panel.
- No way to **delete** a profile or individual saved sessions — will matter once users accumulate history.
- Switching profiles does not restore that profile’s last-used hand/finger (only global `store.lastHand/lastFinger`).

### Finger Test

- After test completes, the overlay message remains in the DOM (hidden). Fine visually, but consider clearing overlay text on dismiss.
- **Cancel test** mid-run leaves any already-finished finger sessions saved (probably correct) but gives no summary — worth confirming intended behaviour in docs.

### Compare & Progress

- Compare metric dropdown could show **units/direction** in chart axis title (e.g. “Precision (px, lower is better)”).
- Progress chart plots accuracy %, hardness %, and contact ms together — contact ms on a secondary axis can dominate visually. Consider toggles or normalised view.
- Empty Compare state could mention Finger Test as the fastest way to populate data (README does; inline hint is good).

### Calibration

- **Clear calibration** is one click with no confirmation — easy to mis-tap.
- Entering Calibration mode clears in-progress presses (`clearCalibration()` in `setMode`) — expected, but a “you have unsaved presses” guard would be nicer.

### Export

- Export CSV/JSON with **zero taps** downloads header-only / empty session — disable buttons or warn when empty.
- No **import validation** beyond `name` check — malformed session arrays could break charts (add schema validation).
- PRD mentioned dashboard screenshot export — not implemented (fine for v1 if documented).

### Accessibility

- Canvas tap area has no keyboard alternative (acceptable for touch-first, but add ARIA live region announcing latest tap metrics for low-vision users).
- Hidden panels (Calibration, Finger Test) still appear in accessibility snapshots — ensure `[hidden]` panels are `aria-hidden="true"` when collapsed.

### Naming consistency

- Page `<title>`: “Finger Tap **Precision** Trainer” vs header: “Finger Tap Trainer” — pick one.

---

## PRD vs implementation gaps (for scope discussion)

The original `prd.md` described additional task modes not built in v1:

| PRD mode | Current app |
|----------|-------------|
| Free Draw | → **Tap Analysis** (tap-only, no path drawing) |
| Trace Box Perimeter | Not implemented |
| Steady Hold | Not implemented |
| Precision Taps | Partially covered by **Accuracy** + **Finger Test** |
| Path drawing with variable line width | Not implemented |
| Sortable data table | Not implemented |
| Instant speed / path length metrics | Not implemented |

These are reasonable v1 cuts if intentional — worth aligning README/PRD so stakeholders don’t expect trace/hold modes.

---

## Device-specific notes (not fully testable in desktop browser)

Tested with **simulated PointerEvents** (`width`/`height` contact geometry). Real-device validation still needed:

| Device | What to verify |
|--------|----------------|
| **iPad Pro / Safari** | Contact area variance, 120 Hz sampling performance, Add to Home Screen |
| **Fire Max 11 / Chrome** | README notes coarse/constant contact size — confirm hardness still useful or show explicit “limited sensor data” banner |
| **Android Chrome** | Same as above; confirm footer capability note matches device |

---

## Suggested fix priority

| Priority | Item |
|----------|------|
| **P0** | Reset/status mismatch (#1, #2) |
| **P1** | Import → Compare refresh (#3); mode-switch status (#6) |
| **P2** | Progress null handling (#4); mobile label clip (#5); progress date labels (#7) |
| **P3** | Profile UX, export empty-state, pressure calibration, accessibility polish |

---

## Test checklist for real-device QA

Use this on iPad + Fire tablet after fixes:

- [ ] Tap Analysis: 10 taps, Pause mid-way, Resume, Stop & Save
- [ ] Reset during recording — status and capture behaviour correct
- [ ] Calibration: 5+ hard presses, Save, verify Hardness % on Tap Analysis
- [ ] Accuracy: 10 taps, adjust target radius slider, confirm Acc% recalculates
- [ ] Finger Test: 2 fingers × 5 taps, verify overlay gate and Compare bars
- [ ] Profile: create, rename, switch, export, import, reload page
- [ ] Progress + Compare after mixed tap-only and accuracy sessions
- [ ] Export CSV/JSON; Copy metrics to clipboard
- [ ] Portrait + landscape layout; no clipped instructional text
- [ ] Reload page — all data persists

---

## Files reviewed

| File | Role |
|------|------|
| `index.html` | Layout, controls, panels |
| `app.js` | All application logic (~1100 lines) |
| `styles.css` | Responsive grid, dark theme |
| `README.md` | User-facing documentation (accurate and thorough) |
| `prd.md` | Original requirements (broader scope than built) |

---

*Generated from interactive browser testing and static code review. Simulated taps used PointerEvents with synthetic contact geometry; hardness/area values reflect simulation, not real finger pressure.*
