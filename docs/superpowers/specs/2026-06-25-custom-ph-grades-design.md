# Design: Fully-Custom PH Components + Editable Weights + Mobile-Friendly Grade Entry

**Date:** 2026-06-25
**Status:** Approved — REVISED 2026-06-25 (see "Revision 2" at end)
**Area:** Nilai & Akademik (grades) — `js/store.js`, `js/app.js`, `index.html`, `css/style.css`

## Problem

The grades page currently uses a **hardcoded spreadsheet**:

- `store.getSubjectAssessments()` (store.js:771) returns a fixed list:
  `s{sem}_ph1, re1, ph2, re2, ph3, re3, sas, resas` — exactly **3 PH + remedials per semester**, identical for every subject.
- `renderGradeGrid()` (app.js:2826) renders a fixed 22-column, two-semester table with
  `min-width: 1800px`.

Consequences:

1. **Cannot add PH4/PH5/PH6…** — columns are fixed in code; there is no "add" control.
2. **Weights are not editable** in this grid; `Nilai Rapor` is hardcoded to `0.6*rataTA + 0.4*SAS`
   (`getSubjectSemesterAverage`, store.js:1175).
3. **Cramped on mobile** — an 1800px-wide table forced into a ~360px phone screen.

An older, more flexible system (`addSubjectAssessment`, `setCategoryWeights`,
`getSubjectCategoryAverages`) still exists in the store but is **dead** — it is shadowed by the
hardcoded `getSubjectAssessments`.

## Goals

1. **Fully custom PH count** — add PH4, PH5, PH6, … with no upper limit.
2. **Independent per (subject × semester)** — e.g. Matematika Sem 1 can have 5 PH while
   Matematika Sem 2 has 3, and Bahasa Indonesia Sem 1 has 4. Adding/removing a PH in one
   (subject, semester) never affects another.
3. **PH columns are class-wide** — one PH column applies to all students (blank cells allowed
   for students who did not sit that PH). No per-student PH counts.
4. **Editable weights per subject** — PH% / SAS% (default 60/40), used to compute Nilai Rapor.
5. **Mobile-friendly entry** — "Input Per Siswa" becomes the primary phone path (vertical form,
   ≥44px inputs, no horizontal scroll). The wide grid is desktop-oriented and shows **only the
   current semester**.
6. **Preserve existing entered grades** (the PH1–3 / SAS values teachers already typed).

## Non-Goals (YAGNI)

- No remedial (Re/ReSAS) columns or "max(PH, Re)" logic. Dropped per decision.
- No arbitrary new category types beyond **PH** and **SAS**.
- No per-component custom weights (weight is per category: PH and SAS only).
- No per-student variable PH counts.

## Data Model

### Categories

Reduce the working category set to two:

- `ph` — **Penilaian Harian**, multi-component (PH1…PHn).
- `sas` — **Sumatif Akhir Semester**, single-component.

**Category id naming:** the working ids are renamed to `ph` and `sas` (the old code used `uh` for
PH and `uas` for SAS). `getCategoryWeights` returns `{ ph, sas }` only, seeded with defaults
`{ ph: 60, sas: 40 }`; any legacy `categoryWeights` keys (`tugas`/`uh`/`uts`/`uas`) are ignored
(weights had no editing UI before, so stored values are effectively defaults — low-risk). The old
`tugas`/`uts` constants may remain in the file for backward data tolerance but are not part of the
default model or UI.

### Component storage — per subject **and** per semester

Components become editable and are stored on the subject, keyed by semester:

```js
// settings.subjects[i]
{
  id: 'matematika',
  name: 'Matematika',
  // NEW: components keyed by semester number -> ordered array
  assessmentsBySemester: {
    '1': [
      { id: 's1_ph1', name: 'PH1', category: 'ph', core: true },
      { id: 's1_ph2', name: 'PH2', category: 'ph' },
      { id: 's1_ph3', name: 'PH3', category: 'ph' },
      { id: 's1_ph4', name: 'PH4', category: 'ph' },   // added by teacher
      { id: 's1_sas', name: 'SAS', category: 'sas', core: true }
    ],
    '2': [ /* independent list */ ]
  },
  categoryWeights: { ph: 60, sas: 40 }
}
```

- **Seeding:** the first time a (subject, semester) is touched and has no stored list, seed it with
  `PH1, PH2, PH3, SAS` — matching the ids `s{sem}_ph1..3`, `s{sem}_sas` that current data already
  uses, so **existing grades line up with no migration of grade values**.
- **Ids:** new PH ids are `s{sem}_ph{n}` where `n` is the next free index. Ids are stable once
  created (deleting PH2 does not renumber PH3 → its id stays `s{sem}_ph3`; only the display label
  is recomputed, see below).
- **Grade values** stay in `state.grades[studentId][subjectId][componentId]` exactly as today
  (`saveGrade` / `saveGradesBatch` unchanged).

### Display labels vs ids

- Stored `name` is the editable display label ("PH1", "PH2"…). To avoid confusing gaps after a
  delete, PH labels are **re-derived on render** as `PH{position}` by their order in the array,
  while the underlying id is permanent. SAS label is fixed "SAS".

### Store API (revised)

- `getSubjectAssessments(subjectId)` → returns the **current-semester** ordered component list from
  `assessmentsBySemester[currentSemester]` (seeding if absent). Removes the hardcoded return.
- `addPhComponent(subjectId)` → appends a new `ph` component to the current semester; returns it.
- `deletePhComponent(subjectId, componentId)` → removes the component from the current semester and
  deletes its stored grade values for all students. SAS and the last remaining PH are **not**
  deletable (must keep ≥1 PH and the SAS).
- `getCategoryWeights(subjectId)` / `setCategoryWeights(subjectId, {ph, sas})` → kept; reduced to
  the two relevant keys.
- **Final grade** (replaces `getSubjectSemesterAverage`'s hardcoded logic):
  - `rataPH` = mean of all **entered** PH values in the current semester (null if none).
  - `sas` = the entered SAS value (null if none).
  - If both present: `Nilai Rapor = round((rataPH*phW + sas*sasW) / (phW + sasW))`.
  - If only one category present: use that category's value alone (weight renormalizes).
  - If neither: null.
  - Weights come from `getCategoryWeights(subjectId)`.

### Migration consequence (explicit)

Existing `re*` / `resas` values remain in storage but are **no longer read**. For any student who
previously relied on a remedial beating the original (old logic used `max(PH, Re)`), the computed
Nilai Rapor will now reflect the raw PH/SAS only. This is intended (remedial dropped by decision).
No destructive migration runs; orphaned `re*` keys are simply ignored.

## UI / UX

### Tabs (unchanged set)

`Input Sekelas (Grid)` · `Input Per Siswa` · `Observasi Sikap` · `Tabel Rekap Nilai`.

### Input Sekelas (Grid) — desktop-oriented

- Shows **only the currently selected semester** (no Semester 1 + 2 side by side). Table width
  roughly halves.
- **Dynamic columns:** `No · Nama Murid · PH1 … PHn · RATA PH · SAS · NILAI RAPOR`.
  - `RATA PH` and `NILAI RAPOR` are read-only computed cells; `NILAI RAPOR` highlights under-KKM.
- **Toolbar additions** (next to "Kosongkan Mapel"):
  - **`+ Tambah PH`** — appends a PH column immediately and focuses it. Direct answer to
    "bagaimana menambahkan PH".
  - **`Atur Bobot`** — opens a small popover with `PH [60] %` and `SAS [40] %` inputs plus a live
    total indicator; saves via `setCategoryWeights`.
- Each PH column header carries a small **🗑** to delete that PH (with a confirm dialog, since it
  removes that PH's values for all students). Delete is disabled when only one PH remains.
- Existing auto-save behavior ("Perubahan disimpan otomatis") is preserved.

### Input Per Siswa — primary mobile path

- Pick a student → a **vertical form** for the selected subject and current semester:
  `PH1 [__]  PH2 [__]  …  PHn [__]   ( + Tambah PH )   SAS [__]`
- Inputs are full-width, ≥44px tall, `inputmode="numeric"`; values auto-save on blur/change.
- A live **Nilai Rapor** preview updates as values change.
- `+ Tambah PH` here adds a class-wide PH column too (same store call), keeping the two views
  consistent.

### Mobile defaulting

- On viewports ≤768px, the grades page **defaults to "Input Per Siswa"** and the wide
  "Input Sekelas (Grid)" tab is de-emphasized (still reachable, horizontally scrollable for the
  current semester only).

## Affected Files

- `js/store.js` — replace hardcoded `getSubjectAssessments`; add `assessmentsBySemester` model,
  `addPhComponent`, `deletePhComponent`; rewrite final-grade computation; trim category set.
- `js/app.js` — rewrite `renderGradeGrid` (single semester, dynamic columns, add/delete PH, weight
  popover); enhance the per-student grade form; mobile tab defaulting; remove dead hardcoded paths.
- `index.html` — grades toolbar buttons (`+ Tambah PH`, `Atur Bobot`); weight popover markup.
- `css/style.css` — single-semester grid sizing; per-student form inputs (≥44px); popover styles;
  remove reliance on the 1800px min-width.

## Testing / Verification

Manual verification on a seeded demo class (no automated test harness exists in this project):

1. **Add PH:** Matematika Sem 1 → `+ Tambah PH` three times → PH4, PH5, PH6 appear; enter values;
   reload → values persist.
2. **Independence:** switch to Semester 2 → PH list is independent (still default 3); add 1 → Sem 1
   still shows 6. Switch subject → independent again.
3. **Delete PH:** delete PH5 → its column and all its values removed; PH6 relabels to PH5 but keeps
   data; cannot delete the last PH or SAS.
4. **Weights:** set PH 70 / SAS 30 → Nilai Rapor recomputes; total indicator warns if ≠100 but
   still normalizes.
5. **Computation:** with PH avg 80 and SAS 90 at 60/40 → Nilai Rapor = round(0.6*80+0.4*90)=84.
6. **Data preservation:** existing PH1–3/SAS values from before the change still display and compute.
7. **Mobile:** at 360px width, grades page opens on "Input Per Siswa"; entering a student shows a
   vertical no-horizontal-scroll form with ≥44px inputs; `+ Tambah PH` works.
8. **Rekap/Buku Induk:** per-subject average and overall average reflect the new computation.

---

## Revision 2 (2026-06-25) — Remedial, two semesters, materi descriptions

After the first implementation landed, the teacher requested three changes that
partially reverse earlier decisions. These supersede the relevant sections above.

### R2.1 Remedial is back (paired per slot)
- Every PH slot has a paired **Re** (remedial) input; the SAS has a paired **ReSAS**.
- Effective value per slot = **max(PH, Re)**; effective SAS = **max(SAS, ReSAS)**.
- `RATA PH` = mean of effective PH values over slots that have any value.
- **Nilai Rapor = round(RATA PH × phW + SAS_eff × sasW)** with weights renormalized
  when a category is empty (weights still editable, default 60/40).

### R2.2 Both semesters shown side by side (grid)
- "Input Sekelas (Grid)" shows **Semester 1 and Semester 2 together** in one wide table
  (desktop-oriented; phones use "Input Per Siswa"). This reverses R1's single-semester grid.
- PH count stays **independent per (subject × semester)**. Adding/removing a PH targets a
  specific semester via a per-semester **+ PH** control in that semester's header group.

### R2.3 Materi (topic) description per PH slot
- Each PH slot carries a **materi** text shown in the header spanning its PH + Re columns,
  editable inline (pencil affordance). Stored per (subject × semester × slot).

### R2.4 Data model (supersedes "Component storage")
Per subject, per semester, an ordered component list seeded to match legacy ids so existing
grades reappear and now count again:

```js
subject.assessmentsBySemester['1'] = [
  { id: 's1_ph1', name: 'PH1', category: 'ph', materi: '' },
  { id: 's1_re1', name: 'Re1', category: 're', slot: 1 },
  { id: 's1_ph2', name: 'PH2', category: 'ph', materi: '' },
  { id: 's1_re2', name: 'Re2', category: 're', slot: 2 },
  { id: 's1_ph3', name: 'PH3', category: 'ph', materi: '' },
  { id: 's1_re3', name: 'Re3', category: 're', slot: 3 },
  { id: 's1_sas',   name: 'SAS',   category: 'sas'   },
  { id: 's1_resas', name: 'ReSAS', category: 'resas' }
];
```
- PH slot n is paired with Re id `s{sem}_re{n}`. `addPhComponent(subjectId, semester)` appends
  `ph{n}` + `re{n}` before SAS. `deletePhComponent(subjectId, phId, semester)` removes both the
  PH and its Re plus their stored grades. Keep ≥1 PH and the SAS/ReSAS.
- `setMateri(subjectId, semester, phId, text)` updates a slot's materi.

### R2.5 Store API (supersedes earlier compute methods)
- `getSubjectAssessments(subjectId, semester = current)` → that semester's component list.
- `getSubjectSemesterAverage(studentId, subjectId, semester)` → Nilai Rapor for that semester
  using max(PH,Re) per slot and max(SAS,ReSAS), weighted.
- `getSubjectAverage(studentId, subjectId)` = `getSubjectSemesterAverage(..., currentSemester)`
  (keeps Buku Induk / recap on the active semester).
- `getSubjectPhAverage(studentId, subjectId, semester = current)` → mean of max(PH,Re).

### R2.6 Per-student form (mobile)
- "Input Per Siswa" shows **both semesters** stacked vertically (chosen over single-semester):
  each semester section lists, per PH slot, the materi label + PH input + Re input, then SAS + ReSAS,
  and a live Nilai Rapor preview per semester. `+ Tambah PH` per semester section.

### R2.7 Verification additions
- Unit tests: `max(PH,Re)` per slot; `max(SAS,ReSAS)`; RATA PH over effective values; weighted
  Nilai Rapor; add/delete slot removes both PH+Re and their grades; materi persists; per-semester
  independence; legacy `s{sem}_re*`/`resas` values now contribute again.
