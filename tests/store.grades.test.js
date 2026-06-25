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
