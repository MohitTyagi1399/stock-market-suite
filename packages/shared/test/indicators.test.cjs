const test = require('node:test');
const assert = require('node:assert/strict');

const { ema, rsi, sma, vwap } = require('../dist/indicators.js');

test('sma computes expected values', () => {
  const values = [1, 2, 3, 4, 5];
  assert.deepEqual(sma(values, 3), [null, null, 2, 3, 4]);
});

test('ema returns nulls then values', () => {
  const values = [1, 2, 3, 4, 5, 6];
  const out = ema(values, 3);
  assert.equal(out[0], null);
  assert.equal(out[1], null);
  assert.ok(typeof out[2] === 'number');
});

test('rsi is in 0..100', () => {
  const values = Array.from({ length: 30 }, (_, i) => i + 1);
  const out = rsi(values, 14).filter((v) => v !== null);
  assert.ok(out.length > 0);
  for (const v of out) {
    assert.ok(v >= 0 && v <= 100);
  }
});

test('vwap returns same length and final number', () => {
  const candles = [
    { t: 't1', o: 1, h: 2, l: 1, c: 2, v: 10 },
    { t: 't2', o: 2, h: 3, l: 2, c: 3, v: 10 },
  ];
  const out = vwap(candles);
  assert.equal(out.length, 2);
  assert.ok(typeof out[1] === 'number');
});

