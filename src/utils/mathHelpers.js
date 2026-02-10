import { Y_MIN, Y_MAX } from '../state/config.js';

export function msToLabel(ms) {
  if (ms >= 1000) return `${(ms / 1000)}s`;
  return `${ms}ms`;
}

export function clampY(v) {
  return Math.max(Y_MIN, Math.min(Y_MAX, v));
}

export function clampEven(v, min, max) {
  v = Math.round(v);
  if (v % 2 !== 0) v += 1;
  v = Math.max(min, Math.min(max, v));
  if (v % 2 !== 0) v -= 1;
  return v;
}

export function normalized01(x) {
  x = x % 1;
  return x < 0 ? x + 1 : x;
}

export function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  if (n <= 1) return 1 * p;
  if (n <= 2) return 2 * p;
  if (n <= 5) return 5 * p;
  return 10 * p;
}
