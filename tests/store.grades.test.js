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

test('addPhComponent appends PH4 before SAS and is independent per semester', () => {
  const store = freshStore();
  const subjectId = store.getSubjects()[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  const res = store.addPhComponent(subjectId);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.component.id, 's1_ph4');
  const names = store.getSubjectAssessments(subjectId).map(c => c.name);
  assert.deepStrictEqual(names, ['PH1', 'PH2', 'PH3', 'PH4', 'SAS']);
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 2);
  const s2 = store.getSubjectAssessments(subjectId).filter(c => c.category === 'ph');
  assert.strictEqual(s2.length, 3);
});

test('deletePhComponent removes the column and its grades; keeps >=1 PH', () => {
  const store = freshStoreWithStudent();
  const subjectId = store.getSubjects()[0].id;
  const studentId = store.state.students[0].id;
  store.updateClassSettings(undefined, undefined, undefined, undefined, undefined, 1);
  store.saveGrade(studentId, subjectId, 's1_ph2', 88);
  const del = store.deletePhComponent(subjectId, 's1_ph2');
  assert.strictEqual(del.success, true);
  const ids = store.getSubjectAssessments(subjectId).map(c => c.id);
  assert.ok(!ids.includes('s1_ph2'), 'ph2 removed');
  assert.strictEqual(store.getGrades(studentId)[subjectId]['s1_ph2'], undefined);
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
