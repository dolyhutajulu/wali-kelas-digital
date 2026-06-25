# Custom PH Components + Editable Weights + Mobile Grade Entry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let teachers add/delete an unlimited number of PH (Penilaian Harian) columns per subject per semester, edit PH/SAS weights, and enter grades comfortably on mobile.

**Architecture:** Revive the store's flexible-assessment model (currently shadowed by a hardcoded list) so components live on `subject.assessmentsBySemester[sem]`. The desktop grid renders dynamic columns for the *current semester only*; the per-student form becomes the mobile path. Pure store logic is covered by Node unit tests (`node:test`); DOM rendering is verified manually in the browser, matching this project's no-build, no-test-harness convention.

**Tech Stack:** Vanilla ES6 (browser), localStorage state, Node ≥18 built-in `node:test` runner for store unit tests. No new runtime dependencies.

## Global Constraints

- No build step, no new runtime dependencies. App must keep running by opening `index.html`.
- Grade values stay in `state.grades[studentId][subjectId][componentId]`; do not change that shape.
- Component ids keep the `s{sem}_...` scheme so existing entered grades remain valid (no grade-value migration).
- Category ids are `ph` and `sas` only. Default weights `{ ph: 60, sas: 40 }`.
- Each (subject × semester) has an independent component list. PH columns are class-wide.
- Always keep at least 1 PH and the SAS; they are not deletable.
- All UI strings in Indonesian, consistent with the existing app.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

- `js/store.js` — data model + grade computation (Tasks 2–4, 7). Add a Node `module.exports` guard.
- `tests/store.grades.test.js` — Node unit tests for store grade logic (Tasks 1–4). **Create.**
- `tests/helpers/browser-shim.js` — minimal `window`/`localStorage` shim for Node (Task 1). **Create.**
- `js/app.js` — grade grid + per-student form rendering, mobile defaulting (Tasks 5–6).
- `index.html` — grades toolbar buttons + weight popover markup (Task 5).
- `css/style.css` — single-semester grid sizing, per-student inputs, popover (Tasks 5–6).

---

## Task 1: Make the store unit-testable in Node

**Files:**
- Modify: `js/store.js` (append module-export guard at end of file)
- Create: `tests/helpers/browser-shim.js`
- Test: `tests/store.grades.test.js`

**Interfaces:**
- Produces: `require('../js/store.js')` returns `{ Store }`. `require('./helpers/browser-shim.js')` installs `global.window` and `global.localStorage` and exports `resetStorage()`.

- [ ] **Step 1: Write the browser shim**

Create `tests/helpers/browser-shim.js`:

```js
// Minimal browser globals so js/store.js can load under Node's test runner.
const storage = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
  clear() { this._d = {}; }
};

global.localStorage = storage;
global.window = {
  supabase: null,
  addEventListener() {},
  dispatchEvent() {}
};

function resetStorage() { storage.clear(); }

module.exports = { resetStorage, storage };
```

- [ ] **Step 2: Add the Node export guard to `js/store.js`**

At the very end of `js/store.js` (after `window.WaliKelasStore = new Store();`), append:

```js
// Node test harness support (no effect in the browser).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Store };
}
```

- [ ] **Step 3: Write the failing smoke test**

Create `tests/store.grades.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { resetStorage } = require('./helpers/browser-shim');
const { Store } = require('../js/store.js');

function freshStore() {
  resetStorage();
  return new Store();
}

test('store constructs with default subjects', () => {
  const store = freshStore();
  const subjects = store.getSubjects();
  assert.ok(subjects.length > 0, 'expected seeded subjects');
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/`
Expected: `store constructs with default subjects` PASSES. (If `getSubjects` is named differently, adjust to the real accessor confirmed in `js/store.js`.)

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/helpers/browser-shim.js tests/store.grades.test.js
git commit -m "test: add Node harness for store grade logic

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Reduce categories to PH+SAS and make components per-semester

**Files:**
- Modify: `js/store.js` — `GRADE_CATEGORIES`, `GRADE_CATEGORY_IDS`, `DEFAULT_CATEGORY_WEIGHTS` (lines ~7–16); replace `getSubjectAssessments` (lines ~771–784); add `_currentSemester` and `_ensureSemesterAssessments`.
- Test: `tests/store.grades.test.js`

**Interfaces:**
- Produces:
  - `store._currentSemester()` → string semester id (`'1'`/`'2'`).
  - `store._ensureSemesterAssessments(subjectId, semester)` → ordered array of `{ id, name, category, core? }`, seeding `PH1,PH2,PH3,SAS` if absent and persisting.
  - `store.getSubjectAssessments(subjectId)` → current-semester components with PH labels normalized to `PH{position}` and SAS labeled `SAS`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/store.grades.test.js`:

```js
test('getSubjectAssessments seeds PH1..PH3 + SAS for current semester', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  const comps = store.getSubjectAssessments(subjectId);
  const ph = comps.filter(c => c.category === 'ph').map(c => c.name);
  const sas = comps.filter(c => c.category === 'sas');
  assert.deepStrictEqual(ph, ['PH1', 'PH2', 'PH3']);
  assert.strictEqual(sas.length, 1);
  assert.strictEqual(sas[0].name, 'SAS');
  assert.ok(comps.every(c => c.id.startsWith('s1_')), 'ids carry s1_ prefix');
});

test('each semester has an independent component list', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  const s1 = store.getSubjectAssessments(subjectId);
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 2);
  const s2 = store.getSubjectAssessments(subjectId);
  assert.ok(s1.every(c => c.id.startsWith('s1_')));
  assert.ok(s2.every(c => c.id.startsWith('s2_')));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/`
Expected: FAIL — current `getSubjectAssessments` returns hardcoded names like `Penilaian Harian 1 (PH1)` and `Remedial PH1 (Re1)`, so the `deepStrictEqual(['PH1','PH2','PH3'])` assertion fails.

- [ ] **Step 3: Replace the category constants**

In `js/store.js`, replace the `GRADE_CATEGORIES` / `GRADE_CATEGORY_IDS` / `SINGLE_CATEGORIES` / `DEFAULT_CATEGORY_WEIGHTS` block (lines ~7–16) with:

```js
// Grade categories. PH is MULTI-entry (averaged); SAS is SINGLE-entry.
const GRADE_CATEGORIES = [
  { id: 'ph', name: 'Penilaian Harian', multi: true },
  { id: 'sas', name: 'Sumatif Akhir Semester (SAS)', multi: false }
];
const GRADE_CATEGORY_IDS = GRADE_CATEGORIES.map(c => c.id);
const SINGLE_CATEGORIES = GRADE_CATEGORIES.filter(c => !c.multi).map(c => c.id);
// Default per-category weight (percentages, sum 100). Editable per subject.
const DEFAULT_CATEGORY_WEIGHTS = { ph: 60, sas: 40 };
```

- [ ] **Step 4: Replace `getSubjectAssessments` and add helpers**

In `js/store.js`, replace the entire `getSubjectAssessments(subjectId) { ... }` method (lines ~771–784) with:

```js
// Current semester id as a string ('1' or '2').
_currentSemester() {
  return String(this.state.settings.semester || 1);
}

// Returns the stored component array for (subject, semester), seeding a default
// PH1,PH2,PH3,SAS list on first use. Mutates + persists only when it seeds.
_ensureSemesterAssessments(subjectId, semester) {
  const subject = (this.state.settings.subjects || []).find(s => s.id === subjectId);
  if (!subject) return [];
  if (!subject.assessmentsBySemester) subject.assessmentsBySemester = {};
  const sem = String(semester);
  const existing = subject.assessmentsBySemester[sem];
  if (!Array.isArray(existing) || existing.length === 0) {
    subject.assessmentsBySemester[sem] = [
      { id: `s${sem}_ph1`, name: 'PH1', category: 'ph', core: true },
      { id: `s${sem}_ph2`, name: 'PH2', category: 'ph' },
      { id: `s${sem}_ph3`, name: 'PH3', category: 'ph' },
      { id: `s${sem}_sas`, name: 'SAS', category: 'sas', core: true }
    ];
    this.saveState();
  }
  return subject.assessmentsBySemester[sem];
}

// Components for the CURRENT semester. PH labels are normalized to position
// (PH1, PH2, ...) so deleting a middle PH never leaves a numbering gap.
getSubjectAssessments(subjectId) {
  const sem = this._currentSemester();
  const list = this._ensureSemesterAssessments(subjectId, sem);
  let phPos = 0;
  return list.map(a => {
    if (a.category === 'ph') { phPos += 1; return { ...a, name: `PH${phPos}` }; }
    return { ...a, name: 'SAS' };
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/`
Expected: PASS for both new tests and the Task 1 smoke test.

- [ ] **Step 6: Commit**

```bash
git add js/store.js tests/store.grades.test.js
git commit -m "feat(grades): per-semester PH+SAS component model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Add and delete PH components

**Files:**
- Modify: `js/store.js` — add `addPhComponent`, `deletePhComponent` (place near the old `addSubjectAssessment`, ~line 840).
- Test: `tests/store.grades.test.js`

**Interfaces:**
- Consumes: `_currentSemester`, `_ensureSemesterAssessments` (Task 2).
- Produces:
  - `store.addPhComponent(subjectId)` → `{ success: true, component: { id, name, category:'ph' } }`. Inserts a new PH before SAS in the current semester.
  - `store.deletePhComponent(subjectId, componentId)` → `{ success: true }` or `{ success: false, error }`. Refuses if only 1 PH remains; deletes the component and its grade values for all students.

- [ ] **Step 1: Write the failing tests**

Append to `tests/store.grades.test.js`:

```js
test('addPhComponent appends PH4 before SAS and is independent per semester', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  const res = store.addPhComponent(subjectId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.component.id, 's1_ph4');
  const comps = store.getSubjectAssessments(subjectId);
  const names = comps.map(c => c.name);
  assert.deepStrictEqual(names, ['PH1', 'PH2', 'PH3', 'PH4', 'SAS']);
  // semester 2 untouched
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 2);
  const s2 = store.getSubjectAssessments(subjectId).filter(c => c.category === 'ph');
  assert.strictEqual(s2.length, 3);
});

test('deletePhComponent removes the column and its grades; keeps >=1 PH', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.saveGrade(studentId, subjectId, 's1_ph2', 88);
  const del = store.deletePhComponent(subjectId, 's1_ph2');
  assert.strictEqual(del.success, true);
  const ids = store.getSubjectAssessments(subjectId).map(c => c.id);
  assert.ok(!ids.includes('s1_ph2'), 'ph2 removed');
  assert.strictEqual(store.getGrades(studentId)[subjectId]['s1_ph2'], undefined);
  // labels re-number: remaining PH are PH1, PH2
  const phNames = store.getSubjectAssessments(subjectId).filter(c => c.category === 'ph').map(c => c.name);
  assert.deepStrictEqual(phNames, ['PH1', 'PH2']);
});

test('deletePhComponent refuses to remove the last PH', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.deletePhComponent(subjectId, 's1_ph3');
  store.deletePhComponent(subjectId, 's1_ph2');
  const res = store.deletePhComponent(subjectId, 's1_ph1');
  assert.strictEqual(res.success, false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `addPhComponent`/`deletePhComponent` are not defined.

- [ ] **Step 3: Implement the methods**

In `js/store.js`, add these two methods inside the `Store` class (next to the existing assessment methods, ~line 840):

```js
addPhComponent(subjectId) {
  const sem = this._currentSemester();
  const list = this._ensureSemesterAssessments(subjectId, sem);
  let n = 1;
  while (list.some(a => a.id === `s${sem}_ph${n}`)) n += 1;
  const component = { id: `s${sem}_ph${n}`, name: `PH${n}`, category: 'ph' };
  const sasIdx = list.findIndex(a => a.category === 'sas');
  if (sasIdx === -1) list.push(component);
  else list.splice(sasIdx, 0, component);
  this.saveState();
  return { success: true, component };
}

deletePhComponent(subjectId, componentId) {
  const sem = this._currentSemester();
  const list = this._ensureSemesterAssessments(subjectId, sem);
  const phCount = list.filter(a => a.category === 'ph').length;
  if (phCount <= 1) return { success: false, error: 'Minimal harus ada 1 Penilaian Harian.' };
  const idx = list.findIndex(a => a.id === componentId && a.category === 'ph');
  if (idx === -1) return { success: false, error: 'Komponen PH tidak ditemukan.' };
  list.splice(idx, 1);
  Object.keys(this.state.grades || {}).forEach(sid => {
    const subjGrades = this.state.grades[sid][subjectId];
    if (subjGrades && Object.prototype.hasOwnProperty.call(subjGrades, componentId)) {
      delete subjGrades[componentId];
    }
  });
  this.saveState();
  return { success: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/`
Expected: PASS for all three new tests.

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/store.grades.test.js
git commit -m "feat(grades): add/delete custom PH components per semester

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: PH/SAS weights and Nilai Rapor computation

**Files:**
- Modify: `js/store.js` — `getCategoryWeights`/`setCategoryWeights` (already iterate `GRADE_CATEGORY_IDS`, so they auto-reduce to ph/sas — verify only); replace `getSubjectAverage` (lines ~1110–1138); delete `getSubjectSemesterAverage` (lines ~1140–1182); add `getSubjectPhAverage`.
- Test: `tests/store.grades.test.js`

**Interfaces:**
- Consumes: `getSubjectAssessments` (Task 2), `getCategoryWeights`.
- Produces:
  - `store.getSubjectPhAverage(studentId, subjectId)` → rounded-to-2dp mean of entered PH values, or null.
  - `store.getSubjectAverage(studentId, subjectId)` → integer Nilai Rapor for the current semester using PH/SAS weights, or null.

- [ ] **Step 1: Write the failing tests**

Append to `tests/store.grades.test.js`:

```js
test('Nilai Rapor = round(PHavg*phW + SAS*sasW) with default 60/40', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.saveGrade(studentId, subjectId, 's1_ph1', 70);
  store.saveGrade(studentId, subjectId, 's1_ph2', 90); // PH avg = 80
  store.saveGrade(studentId, subjectId, 's1_sas', 90);
  assert.strictEqual(store.getSubjectPhAverage(studentId, subjectId), 80);
  // 0.6*80 + 0.4*90 = 84
  assert.strictEqual(store.getSubjectAverage(studentId, subjectId), 84);
});

test('weights renormalize when only PH entered, and custom weights apply', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.saveGrade(studentId, subjectId, 's1_ph1', 80);
  assert.strictEqual(store.getSubjectAverage(studentId, subjectId), 80); // only PH
  store.setCategoryWeights(subjectId, { ph: 70, sas: 30 });
  store.saveGrade(studentId, subjectId, 's1_sas', 90);
  // 0.7*80 + 0.3*90 = 83
  assert.strictEqual(store.getSubjectAverage(studentId, subjectId), 83);
});

test('getSubjectAverage is null when nothing entered', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  assert.strictEqual(store.getSubjectAverage(studentId, subjectId), null);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `getSubjectPhAverage` undefined, and the old `getSubjectAverage` routes through `getSubjectSemesterAverage` (hardcoded 0.6/0.4 with `max(PH,Re)` over only 3 slots), so the custom-weight test fails.

- [ ] **Step 3: Replace `getSubjectAverage`, add `getSubjectPhAverage`, delete the semester helper**

In `js/store.js`:

(a) Replace the whole `getSubjectAverage(studentId, subjectId) { ... }` method (lines ~1110–1138) with:

```js
getSubjectPhAverage(studentId, subjectId) {
  const scores = (this.state.grades[studentId] || {})[subjectId] || {};
  const vals = this.getSubjectAssessments(subjectId)
    .filter(a => a.category === 'ph')
    .map(a => scores[a.id])
    .filter(v => v !== undefined && v !== null && v !== '' && !isNaN(parseFloat(v)))
    .map(v => parseFloat(v));
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

// Final subject grade (Nilai Rapor) for the CURRENT semester.
// PH average and SAS are combined by per-subject weights, renormalized so a
// missing category does not drag the result down. Null when nothing entered.
getSubjectAverage(studentId, subjectId) {
  const scores = (this.state.grades[studentId] || {})[subjectId] || {};
  const rataPH = this.getSubjectPhAverage(studentId, subjectId);
  const sasComp = this.getSubjectAssessments(subjectId).find(a => a.category === 'sas');
  const sasRaw = sasComp ? scores[sasComp.id] : undefined;
  const sasVal = (sasRaw === undefined || sasRaw === null || sasRaw === '' || isNaN(parseFloat(sasRaw)))
    ? null : parseFloat(sasRaw);

  const weights = this.getCategoryWeights(subjectId);
  let sum = 0;
  let wTotal = 0;
  if (rataPH !== null) { sum += rataPH * (weights.ph || 0); wTotal += (weights.ph || 0); }
  if (sasVal !== null) { sum += sasVal * (weights.sas || 0); wTotal += (weights.sas || 0); }
  if (wTotal === 0) return null;
  return Math.round(sum / wTotal);
}
```

(b) Delete the entire `getSubjectSemesterAverage(studentId, subjectId, semester) { ... }` method (lines ~1140–1182). Search the file for remaining references to `getSubjectSemesterAverage`; if any exist (e.g. in `renderGradeGrid`), they are removed in Task 5.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/`
Expected: PASS for all grade-computation tests and all earlier tests.

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/store.grades.test.js
git commit -m "feat(grades): weighted PH/SAS Nilai Rapor with custom weights

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Rewrite the desktop grid — single semester, dynamic columns, add/delete PH, weights popover

**Files:**
- Modify: `index.html` — grades toolbar (around line 320–341): add `+ Tambah PH` and `Atur Bobot` buttons + a weight popover container.
- Modify: `js/app.js` — replace `renderGradeGrid` (lines ~2826–2975) and `gridCategoryLayout` (~2810); wire the new buttons in the grades event-binding area (~2069–2126).
- Modify: `css/style.css` — drop reliance on `min-width:1800px`; style the PH delete header button and the weight popover.
- Verify: manual (browser).

**Interfaces:**
- Consumes: `store.getSubjectAssessments`, `store.getSubjectPhAverage`, `store.getSubjectAverage`, `store.addPhComponent`, `store.deletePhComponent`, `store.getCategoryWeights`, `store.setCategoryWeights`, `store.saveGradesBatch`, existing `confirmAction`, `window.showToast`, `gradeGridSubjectId`.
- Produces: a `renderGradeGrid()` that renders `No · Nama · PH1..PHn · RATA PH · SAS · NILAI RAPOR` for the current semester.

- [ ] **Step 1: Update the grades toolbar in `index.html`**

In the `#tab-grades-grid` toolbar (the row that currently holds the "Kosongkan Mapel" button, ~line 320–335), add the two buttons and a popover. Place beside the existing button:

```html
<button id="btn-add-ph" class="btn btn-secondary" type="button">
  <i class="fas fa-plus"></i> Tambah PH
</button>
<div style="position: relative; display: inline-block;">
  <button id="btn-edit-weights" class="btn btn-secondary" type="button">
    <i class="fas fa-sliders-h"></i> Atur Bobot
  </button>
  <div id="weight-popover" class="weight-popover" hidden>
    <h4>Bobot Nilai Rapor</h4>
    <label>PH (%) <input id="weight-ph" type="number" min="0" max="100" inputmode="numeric"></label>
    <label>SAS (%) <input id="weight-sas" type="number" min="0" max="100" inputmode="numeric"></label>
    <p id="weight-total" class="weight-total"></p>
    <div class="weight-popover-actions">
      <button id="btn-weight-cancel" class="btn btn-secondary" type="button">Batal</button>
      <button id="btn-weight-save" class="btn btn-primary" type="button">Simpan</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Replace `gridCategoryLayout` and `renderGradeGrid` in `js/app.js`**

Replace `gridCategoryLayout()` (~2810) and `renderGradeGrid()` (~2826–2975) with a single-semester dynamic renderer:

```js
function renderGradeGrid() {
  const table = document.getElementById('grade-grid-table');
  const body = document.getElementById('grade-grid-body');
  const tabContainer = document.getElementById('spreadsheet-subject-tabs');
  if (!table || !body || !tabContainer) return;
  const thead = table.querySelector('thead');

  const subjects = store.getSubjects();
  if (subjects.length === 0) {
    tabContainer.innerHTML = '';
    body.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Belum ada mata pelajaran. Tambahkan di tab Pengaturan.</td></tr>`;
    return;
  }
  if (!gradeGridSubjectId || !subjects.some(s => s.id === gradeGridSubjectId)) {
    gradeGridSubjectId = subjects[0].id;
  }

  // Subject tabs
  tabContainer.innerHTML = subjects.map(s => `
    <button class="spreadsheet-tab-btn ${s.id === gradeGridSubjectId ? 'active' : ''}" data-subject="${s.id}">
      <i class="fas fa-file-excel" style="color:#107c41;"></i> ${s.name}
    </button>
  `).join('');
  tabContainer.querySelectorAll('.spreadsheet-tab-btn').forEach(btn => {
    btn.onclick = () => { gradeGridSubjectId = btn.getAttribute('data-subject'); renderGradeGrid(); };
  });

  const students = store.state.students;
  const kkm = store.getKkm();
  const assessments = store.getSubjectAssessments(gradeGridSubjectId);
  const phComps = assessments.filter(a => a.category === 'ph');
  const sasComp = assessments.find(a => a.category === 'sas');
  const semLabel = store.state.settings.semester === 2 ? 'Semester 2' : 'Semester 1';

  // Header: No | Nama | PH1..PHn (each deletable) | RATA PH | SAS | NILAI RAPOR
  let head = `
    <th style="width:40px;text-align:center;border:1px solid var(--border-color);">No</th>
    <th style="min-width:170px;text-align:left;border:1px solid var(--border-color);position:sticky;left:0;background:var(--bg-card);z-index:5;">Nama Murid <span style="font-weight:400;color:var(--text-muted);font-size:0.72rem;">· ${semLabel}</span></th>
  `;
  phComps.forEach(a => {
    const canDelete = phComps.length > 1;
    head += `<th class="text-center ph-col-head" style="width:64px;border:1px solid var(--border-color);">
      <span>${a.name}</span>${canDelete ? `<button type="button" class="ph-del-btn" data-comp="${a.id}" title="Hapus ${a.name}" aria-label="Hapus ${a.name}"><i class="fas fa-times"></i></button>` : ''}
    </th>`;
  });
  head += `<th class="text-center" style="width:74px;border:1px solid var(--border-color);background:rgba(13,148,136,0.05);color:var(--primary);font-weight:bold;">RATA PH</th>`;
  head += `<th class="text-center" style="width:64px;border:1px solid var(--border-color);">SAS</th>`;
  head += `<th class="text-center" style="width:92px;border:1px solid var(--border-color);background:var(--primary-light);color:var(--primary);font-weight:bold;">NILAI RAPOR</th>`;
  thead.innerHTML = `<tr>${head}</tr>`;

  if (students.length === 0) {
    body.innerHTML = `<tr><td colspan="${phComps.length + 5}" class="text-center text-muted py-4">Belum ada data murid. Tambahkan di tab Buku Induk.</td></tr>`;
  } else {
    body.innerHTML = '';
    students.forEach((student, idx) => {
      const scores = (store.getGrades(student.id)[gradeGridSubjectId]) || {};
      const cellInput = (comp) => {
        const val = scores[comp.id] !== undefined ? scores[comp.id] : '';
        const under = val !== '' && parseFloat(val) < kkm;
        return `<td style="border:1px solid var(--border-color);padding:2px;text-align:center;">
          <input type="number" min="0" max="100" inputmode="numeric"
            class="spreadsheet-cell-input grid-cell ${under ? 'spreadsheet-cell-under-kkm' : ''}"
            data-student="${student.id}" data-comp="${comp.id}" value="${val}" placeholder="-"></td>`;
      };
      const rataPH = store.getSubjectPhAverage(student.id, gradeGridSubjectId);
      const rapor = store.getSubjectAverage(student.id, gradeGridSubjectId);
      let row = `
        <td style="text-align:center;border:1px solid var(--border-color);font-weight:500;">${idx + 1}</td>
        <td style="border:1px solid var(--border-color);font-weight:600;padding:6px 12px;position:sticky;left:0;background:var(--bg-card);z-index:5;">${student.name}</td>
      `;
      phComps.forEach(a => { row += cellInput(a); });
      row += `<td class="text-center" style="border:1px solid var(--border-color);font-weight:bold;color:var(--text-muted);background:rgba(13,148,136,0.02);">${rataPH === null ? '-' : Math.round(rataPH)}</td>`;
      row += sasComp ? cellInput(sasComp) : `<td style="border:1px solid var(--border-color);"></td>`;
      const raporUnder = rapor !== null && rapor < kkm;
      row += `<td class="text-center ${raporUnder ? 'spreadsheet-cell-under-kkm' : ''}" style="border:1px solid var(--border-color);font-weight:bold;background:var(--primary-light);color:var(--primary);">${rapor === null ? '-' : rapor}</td>`;
      const tr = document.createElement('tr');
      tr.innerHTML = row;
      body.appendChild(tr);
    });
  }

  // Auto-save on input + live recompute of the whole row.
  body.querySelectorAll('.spreadsheet-cell-input.grid-cell').forEach(inp => {
    inp.onchange = () => {
      const sid = inp.getAttribute('data-student');
      const cid = inp.getAttribute('data-comp');
      store.saveGrade(sid, gradeGridSubjectId, cid, inp.value);
      renderGradeGrid();
      renderGradesRecap();
      renderStudents();
    };
  });

  // PH column delete buttons.
  thead.querySelectorAll('.ph-del-btn').forEach(btn => {
    btn.onclick = () => {
      const compId = btn.getAttribute('data-comp');
      confirmAction({
        title: 'Hapus Kolom PH',
        message: 'Hapus kolom PH ini? Nilai PH ini untuk <strong>semua murid</strong> akan terhapus permanen.',
        confirmLabel: 'Hapus PH',
        onConfirm: () => {
          const res = store.deletePhComponent(gradeGridSubjectId, compId);
          if (!res.success) { window.showToast(res.error, 'error'); return; }
          window.showToast('Kolom PH dihapus.', 'success');
          renderGradeGrid(); renderGradesRecap(); renderStudents();
        }
      });
    };
  });
}
```

- [ ] **Step 3: Wire the toolbar buttons in the grades event-binding area of `js/app.js`**

Near the existing grade-grid button wiring (~2069–2126), add:

```js
const btnAddPh = document.getElementById('btn-add-ph');
if (btnAddPh) {
  btnAddPh.onclick = () => {
    if (!gradeGridSubjectId) { window.showToast('Pilih mata pelajaran dahulu.', 'error'); return; }
    const res = store.addPhComponent(gradeGridSubjectId);
    if (res.success) {
      window.showToast(`Kolom ${res.component.name} ditambahkan.`, 'success');
      renderGradeGrid();
    }
  };
}

const btnEditWeights = document.getElementById('btn-edit-weights');
const weightPopover = document.getElementById('weight-popover');
const weightPh = document.getElementById('weight-ph');
const weightSas = document.getElementById('weight-sas');
const weightTotal = document.getElementById('weight-total');
function refreshWeightTotal() {
  const total = (parseFloat(weightPh.value) || 0) + (parseFloat(weightSas.value) || 0);
  weightTotal.textContent = total === 100
    ? `Total: ${total}% ✓`
    : `Total: ${total}% — idealnya 100% (sistem tetap menormalisasi).`;
}
if (btnEditWeights && weightPopover) {
  btnEditWeights.onclick = () => {
    if (!gradeGridSubjectId) { window.showToast('Pilih mata pelajaran dahulu.', 'error'); return; }
    const w = store.getCategoryWeights(gradeGridSubjectId);
    weightPh.value = w.ph; weightSas.value = w.sas; refreshWeightTotal();
    weightPopover.hidden = !weightPopover.hidden;
  };
  weightPh.oninput = refreshWeightTotal;
  weightSas.oninput = refreshWeightTotal;
  document.getElementById('btn-weight-cancel').onclick = () => { weightPopover.hidden = true; };
  document.getElementById('btn-weight-save').onclick = () => {
    store.setCategoryWeights(gradeGridSubjectId, { ph: weightPh.value, sas: weightSas.value });
    weightPopover.hidden = true;
    window.showToast('Bobot disimpan.', 'success');
    renderGradeGrid(); renderGradesRecap(); renderStudents();
  };
}
```

- [ ] **Step 4: Adjust grid CSS in `css/style.css`**

Change the grade table min-width and add popover/delete styles. First, in `index.html` the table tag (~line 341) sets `min-width:1800px` inline — change that inline value to `min-width:680px`. Then append to `css/style.css`:

```css
.ph-col-head { position: relative; }
.ph-del-btn {
  position: absolute; top: 2px; right: 2px;
  background: none; border: none; color: var(--danger);
  font-size: 0.62rem; cursor: pointer; padding: 2px; line-height: 1;
}
.weight-popover {
  position: absolute; right: 0; top: calc(100% + 8px);
  width: 240px; background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
  padding: 14px; z-index: 1000; display: flex; flex-direction: column; gap: 10px;
}
.weight-popover h4 { font-size: 0.9rem; color: var(--primary); }
.weight-popover label { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; }
.weight-popover input { width: 80px; min-height: 40px; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); text-align: center; }
.weight-total { font-size: 0.75rem; color: var(--text-muted); }
.weight-popover-actions { display: flex; gap: 8px; justify-content: flex-end; }
```

- [ ] **Step 5: Manual verification in the browser**

Run a static server and verify (no automated test for DOM):

Run: `python3 -m http.server 3000` then open `http://localhost:3000`, log in (password `admin`), open **Nilai & Akademik → Input Sekelas (Grid)**.
Expected:
1. Grid shows one semester only with columns `No, Nama, PH1, PH2, PH3, RATA PH, SAS, NILAI RAPOR` and no horizontal-scroll need on desktop.
2. Click **+ Tambah PH** → a `PH4` column appears with a red ✕ in its header.
3. Enter PH values → `RATA PH` and `NILAI RAPOR` update on blur; under-KKM cells go red.
4. Click a PH ✕ → confirm dialog → column and its values removed; remaining PH renumber.
5. Click **Atur Bobot**, set PH 70 / SAS 30, Save → `NILAI RAPOR` recomputes.
6. Switch the semester selector → PH list is independent; switch subject tab → independent.

- [ ] **Step 6: Run store tests (regression) and commit**

Run: `node --test tests/`
Expected: PASS (unchanged).

```bash
git add index.html js/app.js css/style.css
git commit -m "feat(grades): single-semester dynamic grid with add/delete PH + weight editor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Per-student mobile form + mobile defaulting

**Files:**
- Modify: `js/app.js` — the per-student grade entry (`renderDynamicAssessments` / `loadQuickGradeSubjectData` area, ~2785, and the "Input Per Siswa" panel renderer) to render PH1..PHn + SAS vertically with an inline `+ Tambah PH`, a live Nilai Rapor preview, and auto-save; add mobile tab defaulting in `renderGrades` (~1042–1073).
- Modify: `css/style.css` — per-student input sizing (≥44px) + mobile tab emphasis.
- Verify: manual (browser at 375px).

**Interfaces:**
- Consumes: `store.getSubjectAssessments`, `store.saveGrade`, `store.getSubjectAverage`, `store.addPhComponent`, `gradeGridSubjectId` or the per-siswa subject/student selects.
- Produces: a per-student vertical grade form that stays in sync with the grid (same store calls).

- [ ] **Step 1: Render the per-student form fields dynamically**

Replace the existing `renderDynamicAssessments(containerId, subjectId, studentId, prefix)` function (`js/app.js:1145`). It is called as `renderDynamicAssessments('main-grade-inputs-container', subject, studentId, 'grade')` (app.js:1141) for the "Input Per Siswa" panel and `renderDynamicAssessments('quick-grade-inputs-container', subject, studentId, 'quick-grade')` for the quick-grade modal — both keep working with the version below (its 4th arg is named `mode` here, same role as the existing `prefix`). Replace its field-building so it lists the current-semester components vertically with auto-save and a live preview:

```js
function renderDynamicAssessments(containerId, subjectId, studentId, mode) {
  const container = document.getElementById(containerId);
  if (!container || !subjectId || !studentId) { if (container) container.innerHTML = ''; return; }
  const assessments = store.getSubjectAssessments(subjectId);
  const scores = (store.getGrades(studentId)[subjectId]) || {};
  const field = (a) => `
    <div class="ps-grade-field">
      <label for="${mode}-${a.id}">${a.name}${a.category === 'sas' ? ' (Sumatif Akhir Semester)' : ''}</label>
      <input id="${mode}-${a.id}" type="number" min="0" max="100" inputmode="numeric"
        class="ps-grade-input" data-student="${studentId}" data-subject="${subjectId}" data-comp="${a.id}"
        value="${scores[a.id] !== undefined ? scores[a.id] : ''}" placeholder="-">
    </div>`;
  const phFields = assessments.filter(a => a.category === 'ph').map(field).join('');
  const sasField = assessments.filter(a => a.category === 'sas').map(field).join('');
  container.innerHTML = `
    <div class="ps-grade-section-title">Penilaian Harian</div>
    ${phFields}
    <button type="button" class="btn btn-secondary ps-add-ph" data-subject="${subjectId}"><i class="fas fa-plus"></i> Tambah PH</button>
    <div class="ps-grade-section-title">Sumatif</div>
    ${sasField}
    <div class="ps-rapor-preview">Nilai Rapor: <strong id="${mode}-rapor-preview">-</strong></div>
  `;
  const updatePreview = () => {
    const rapor = store.getSubjectAverage(studentId, subjectId);
    const el = document.getElementById(`${mode}-rapor-preview`);
    if (el) el.textContent = rapor === null ? '-' : rapor;
  };
  container.querySelectorAll('.ps-grade-input').forEach(inp => {
    inp.onchange = () => {
      store.saveGrade(inp.getAttribute('data-student'), inp.getAttribute('data-subject'), inp.getAttribute('data-comp'), inp.value);
      updatePreview();
      renderGradesRecap();
      renderStudents();
    };
  });
  const addBtn = container.querySelector('.ps-add-ph');
  if (addBtn) addBtn.onclick = () => {
    const res = store.addPhComponent(subjectId);
    if (res.success) { window.showToast(`${res.component.name} ditambahkan.`, 'success'); renderDynamicAssessments(containerId, subjectId, studentId, mode); }
  };
  updatePreview();
}
```

- [ ] **Step 2: Default to the per-student tab on mobile**

In `renderGrades()` (~1042), after the tab panels are set up, add a one-time mobile default:

```js
// On phones, open the comfortable per-student entry first.
if (window.matchMedia('(max-width: 768px)').matches && !window.__gradesMobileDefaulted) {
  const perSiswaTabBtn = document.querySelector('.tab-btn[data-tab="tab-grades-input"]');
  if (perSiswaTabBtn) { perSiswaTabBtn.click(); window.__gradesMobileDefaulted = true; }
}
```

(The "Input Per Siswa" tab is `data-tab="tab-grades-input"`, confirmed in `index.html:314`.)

- [ ] **Step 3: Add per-student form CSS**

Append to `css/style.css`:

```css
.ps-grade-section-title { font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase; margin: 14px 0 6px; }
.ps-grade-field { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.ps-grade-field label { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
.ps-grade-input { width: 96px; min-height: 44px; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); text-align: center; font-size: 1rem; }
.ps-grade-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.ps-add-ph { margin: 4px 0 8px; }
.ps-rapor-preview { margin-top: 14px; padding: 12px; background: var(--primary-light); color: var(--primary); border-radius: var(--radius-md); font-weight: 600; text-align: center; }
@media (max-width: 768px) {
  .ps-grade-input { width: 110px; }
}
```

- [ ] **Step 4: Manual verification at mobile width**

Run: `python3 -m http.server 3000`, open DevTools at 375px width, go to **Nilai & Akademik**.
Expected:
1. Page opens on **Input Per Siswa**.
2. Pick a student + subject → vertical form: PH1, PH2, PH3, `+ Tambah PH`, SAS, and a "Nilai Rapor" preview. Inputs are ≥44px tall, no horizontal scroll.
3. `+ Tambah PH` adds PH4 to the form; entering values updates the preview and persists after reload.
4. Adding a PH here also shows as a new column in **Input Sekelas (Grid)** (consistency).

- [ ] **Step 5: Run store tests and commit**

Run: `node --test tests/`
Expected: PASS.

```bash
git add js/app.js css/style.css
git commit -m "feat(grades): mobile per-student vertical entry + default tab on phones

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Remove dead code and final integration pass

**Files:**
- Modify: `js/store.js` — remove now-unused `DEFAULT_ASSESSMENTS`, `_ensureAssessments`, `addSubjectAssessment`, `updateSubjectAssessment`, `deleteSubjectAssessment` **only if** no longer referenced; remove leftover `s1_/s2_` `hasSpreadsheetKeys` logic if any remains; simplify `getSubjectCategoryAverages` references.
- Modify: `js/app.js` — remove any remaining references to the old hardcoded grid (e.g. `openAssessmentComponentModal` wiring at ~1879–1894, `modal-assessment-component`) if those flows are replaced; remove `getSubjectSemesterAverage` callers.
- Modify: `index.html` — remove the now-unused "Tambah Komponen Nilai Baru" modal (`modal-assessment-component`, ~line 1236, 1410) if nothing else opens it.
- Verify: manual + grep.

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces: a single coherent grades code path (no shadowed/dead functions).

- [ ] **Step 1: Find dead references**

Run:
```bash
grep -rn "getSubjectSemesterAverage\|addSubjectAssessment\|_ensureAssessments\|DEFAULT_ASSESSMENTS\|hasSpreadsheetKeys\|modal-assessment-component\|gridCategoryLayout" js/ index.html
```
Expected: a list of remaining references. Each must be either still-needed or removed.

- [ ] **Step 2: Remove confirmed-dead code**

For each match from Step 1 that is no longer reached (verify by reading its callers), delete the definition and its now-orphaned markup/wiring. Do NOT delete anything still referenced. Keep `getSubjectCategoryAverages` only if still used by recap/detail; otherwise remove it.

- [ ] **Step 3: Re-grep to confirm cleanliness**

Run:
```bash
grep -rn "getSubjectSemesterAverage\|hasSpreadsheetKeys\|gridCategoryLayout" js/ index.html
```
Expected: no matches.

- [ ] **Step 4: Full manual regression**

Run: `python3 -m http.server 3000`, open the app, and verify end to end:
1. **Settings → Muat Data Demo** (or use existing data): grades page loads without console errors.
2. Grid: add/delete PH, edit weights, switch semester + subject — all work.
3. Per-student form on mobile width works and stays in sync.
4. **Tabel Rekap Nilai** and **Buku Induk** show averages consistent with the grid's NILAI RAPOR.
5. Export/print profile (`showStudentDetails` print) still renders grade rows without error.
6. Reload the page — all entered values and added PH columns persist.

- [ ] **Step 5: Run store tests and commit**

Run: `node --test tests/`
Expected: PASS.

```bash
git add js/store.js js/app.js index.html
git commit -m "refactor(grades): remove dead hardcoded grade-grid code paths

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** custom PH add (Task 3/5/6), delete PH (Task 3/5), per subject×semester independence (Task 2/3), class-wide PH columns (Task 5), editable PH/SAS weights (Task 4/5), Nilai Rapor computation (Task 4), single-semester grid (Task 5), mobile per-student entry + default (Task 6), data preservation via `s{sem}_` ids (Task 2), remedial removed (Task 4 computation + Task 7 cleanup). All covered.
- **Type/name consistency:** `addPhComponent` returns `{ success, component }` (used in Tasks 5–6); `deletePhComponent` returns `{ success, error }` (used in Task 5); `getSubjectPhAverage` and `getSubjectAverage` defined in Task 4 and consumed in Tasks 5–6.
- **Confirmed names (from source):** `getSubjects()` (store.js:699), `getKkm()` (store.js:688), `getGrades()` (store.js:1076), `updateClassSettings(className, schoolName, curriculum, academicYear, kkm, semester)` (store.js:673 — semester is the 6th arg, so the tests' `updateClassSettings(undefined,…,1)` set only the semester). Per-student tab `data-tab="tab-grades-input"` (index.html:314); per-student container `main-grade-inputs-container` (app.js:1141); quick-grade container `quick-grade-inputs-container`; existing `renderDynamicAssessments(containerId, subjectId, studentId, prefix)` at app.js:1145.
- **Remaining assumption (do not block):** that `confirmAction({ title, message, confirmLabel, onConfirm })` and `window.showToast(msg, type)` exist with those shapes — both are used elsewhere in app.js; confirm signatures when wiring Task 5.
