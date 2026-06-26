const { test } = require('node:test');
const assert = require('node:assert');
const { resetStorage } = require('./helpers/browser-shim');
const { Store } = require('../js/store.js');

function freshStore() {
  resetStorage();
  return new Store();
}

// Fresh store guaranteed to have at least one student (default state has none).
function freshStoreWithStudent() {
  const store = freshStore();
  store.addStudent({ name: 'Murid Uji', gender: 'L' });
  return store;
}

test('store constructs with default subjects', () => {
  const store = freshStore();
  const subjects = store.getSubjects();
  assert.ok(subjects.length > 0, 'expected seeded subjects');
});

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

test('addPhComponent appends PH4 (+ paired Re4) before SAS, independent per semester', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  const res = store.addPhComponent(subjectId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.component.id, 's1_ph4');
  const comps = store.getSubjectAssessments(subjectId);
  const phNames = comps.filter(c => c.category === 'ph').map(c => c.name);
  assert.deepStrictEqual(phNames, ['PH1', 'PH2', 'PH3', 'PH4']);
  assert.ok(comps.some(c => c.id === 's1_re4' && c.category === 're'), 'paired Re4 added');
  // SAS stays last (after the new slot)
  assert.strictEqual(comps[comps.length - 2].category, 'sas');
  assert.strictEqual(comps[comps.length - 1].category, 'resas');
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 2);
  const s2 = store.getSubjectAssessments(subjectId).filter(c => c.category === 'ph');
  assert.strictEqual(s2.length, 3);
});

test('deletePhComponent removes the PH + its paired Re and their grades; keeps >=1 PH', () => {
  const store = freshStoreWithStudent();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.saveGrade(studentId, subjectId, 's1_ph2', 88);
  store.saveGrade(studentId, subjectId, 's1_re2', 95);
  const del = store.deletePhComponent(subjectId, 's1_ph2');
  assert.strictEqual(del.success, true);
  const ids = store.getSubjectAssessments(subjectId).map(c => c.id);
  assert.ok(!ids.includes('s1_ph2'), 'ph2 removed');
  assert.ok(!ids.includes('s1_re2'), 'paired re2 removed');
  assert.strictEqual(store.getGrades(studentId)[subjectId]['s1_ph2'], undefined);
  assert.strictEqual(store.getGrades(studentId)[subjectId]['s1_re2'], undefined);
  const phNames = store.getSubjectAssessments(subjectId).filter(c => c.category === 'ph').map(c => c.name);
  assert.deepStrictEqual(phNames, ['PH1', 'PH2']);
});

test('remedial: effective PH = max(PH, Re); SAS = max(SAS, ReSAS)', () => {
  const store = freshStoreWithStudent();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.saveGrade(studentId, subjectId, 's1_ph1', 50);
  store.saveGrade(studentId, subjectId, 's1_re1', 80); // eff = 80
  store.saveGrade(studentId, subjectId, 's1_ph2', 90); // eff = 90 (no re)
  store.saveGrade(studentId, subjectId, 's1_sas', 70);
  store.saveGrade(studentId, subjectId, 's1_resas', 60); // eff = 70
  assert.strictEqual(store.getSubjectPhAverage(studentId, subjectId), 85); // (80+90)/2
  // 0.6*85 + 0.4*70 = 51 + 28 = 79
  assert.strictEqual(store.getSubjectAverage(studentId, subjectId), 79);
});

test('setMateri persists per slot and is independent per semester', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  const ok = store.setMateri(subjectId, 1, 's1_ph2', 'Pecahan');
  assert.strictEqual(ok.success, true);
  const slot = store.getSubjectPhSlots(subjectId, 1).find(s => s.ph.id === 's1_ph2');
  assert.strictEqual(slot.materi, 'Pecahan');
  // semester 2 slot 2 has no materi
  const slot2 = store.getSubjectPhSlots(subjectId, 2).find(s => s.ph.id === 's2_ph2');
  assert.strictEqual(slot2.materi, '');
});

test('legacy PH-only list migrates to include paired Re + ReSAS', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  // Simulate a legacy stored list seeded before remedial existed.
  const subj = store.state.settings.subjects.find(s => s.id === subjectId);
  subj.assessmentsBySemester = {
    '1': [
      { id: 's1_ph1', name: 'PH1', category: 'ph', materi: 'X', core: true },
      { id: 's1_ph2', name: 'PH2', category: 'ph' },
      { id: 's1_sas', name: 'SAS', category: 'sas', core: true }
    ]
  };
  const comps = store.getSubjectAssessments(subjectId, 1);
  const ids = comps.map(c => c.id);
  assert.ok(ids.includes('s1_re1') && ids.includes('s1_re2'), 'paired Re added');
  assert.ok(ids.includes('s1_resas'), 'ReSAS added');
  // PH materi preserved
  assert.strictEqual(comps.find(c => c.id === 's1_ph1').materi, 'X');
  // slots now expose remedial
  const slot = store.getSubjectPhSlots(subjectId, 1).find(s => s.ph.id === 's1_ph1');
  assert.ok(slot.re && slot.re.id === 's1_re1');
});

test('getSubjectSemesterAverage computes each semester independently', () => {
  const store = freshStoreWithStudent();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.saveGrade(studentId, subjectId, 's1_ph1', 80);
  store.saveGrade(studentId, subjectId, 's2_ph1', 60);
  assert.strictEqual(store.getSubjectSemesterAverage(studentId, subjectId, 1), 80);
  assert.strictEqual(store.getSubjectSemesterAverage(studentId, subjectId, 2), 60);
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

test('Nilai Rapor = round(PHavg*phW + SAS*sasW) with default 60/40', () => {
  const store = freshStoreWithStudent();
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
  const store = freshStoreWithStudent();
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
  const store = freshStoreWithStudent();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  assert.strictEqual(store.getSubjectAverage(studentId, subjectId), null);
});
