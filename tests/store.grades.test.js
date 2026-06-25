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
