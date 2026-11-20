import { readFileSync } from 'node:fs';
import { runHeadless } from '../src/sim/run.js';

export const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
export const T = contract.tuning;
export const ticks = (s) => Math.round(s * 60);

// Đưa các đèn ra xa để test một luật không bị đèn khác ảnh hưởng.
export const FAR_LANTERNS = [
  { id: 'L1', pos: [200, 0, 200] },
  { id: 'L2', pos: [-200, 0, 200] },
  { id: 'L3', pos: [200, 0, -200] },
  { id: 'L4', pos: [-200, 0, -200] },
  { id: 'L5', pos: [0, 0, -300] },
];

// Chạy mô phỏng trực tiếp (không qua CLI); mặc định tắt mọi sinh ngẫu nhiên và gió, snapshot mỗi tick.
// `events` không gồm night_start (sự kiện mở đầu Đêm, tick 0).
export function run(scenario = {}, frames = [], n = 60, { seed = 1, snapshotEvery = 1, night = 1 } = {}) {
  const base = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
  if (night === 1) base.lanterns = FAR_LANTERNS;
  const sc = { ...base, ...scenario };
  const lines = runHeadless({ tuning: T, seed, night, scenario: sc, frames, ticks: n, snapshotEvery }).map((l) => JSON.parse(l));
  const snaps = lines.filter((l) => l.type === 'snapshot');
  return {
    lines,
    events: lines.filter((l) => l.type === 'event' && l.name !== 'night_start'),
    snap: (t) => snaps.find((s) => s.tick === t),
    end: lines[lines.length - 1],
  };
}

export const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;
