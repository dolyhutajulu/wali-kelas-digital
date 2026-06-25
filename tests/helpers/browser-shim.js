// Minimal browser globals so js/store.js can load under Node's test runner.
const storage = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
  clear() { this._d = {}; }
};

global.localStorage = storage;

// A permissive stub element so DOM-status updaters in store.js are harmless.
const stubEl = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'classList') return { add() {}, remove() {}, toggle() {} };
    if (prop === 'style') return {};
    return typeof prop === 'string' ? '' : undefined;
  },
  set() { return true; }
});

global.document = {
  getElementById() { return stubEl; },
  querySelector() { return stubEl; },
  querySelectorAll() { return []; },
  createElement() { return stubEl; }
};
global.Event = class Event { constructor(type) { this.type = type; } };
global.window = {
  supabase: null,
  addEventListener() {},
  dispatchEvent() {},
  matchMedia() { return { matches: false, addEventListener() {} }; }
};

function resetStorage() { storage.clear(); }

module.exports = { resetStorage, storage };
