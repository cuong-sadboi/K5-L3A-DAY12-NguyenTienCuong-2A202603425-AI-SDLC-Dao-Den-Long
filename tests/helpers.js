import { readFileSync } from 'node:fs';
import { runHeadless } from '../src/sim/run.js';

export const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
export const T = contract.tuning;
export const ticks = (s) => Math.round(s * 60);

// Đưa các đèn ra xa để test một luật không bị vùng an toàn của đèn khác ảnh hưởng.
export const FAR_LANTERNS = [
  { id: 'L1', pos: [200, 0, 200] },
  { id: 'L2', pos: [-200, 0, 200] },
  { id: 'L3', pos: [200, 0, -200] },
  { id: 'L4', pos: [-200, 0, -200] },
  { id: 'L5', pos: [0, 0, -300] },
];

// Chạy mô phỏng trực tiếp (không qua CLI), mặc định tắt sinh ngẫu nhiên, snapshot mỗi tick.
export function run(scenario = {}, frames = [], n = 60, { seed = 1, snapshotEvery = 1 } = {}) {
  const sc = { random_motes: false, random_shades: false, lanterns: FAR_LANTERNS, ...scenario };
  const lines = runHeadless({ tuning: T, seed, night: 1, scenario: sc, frames, ticks: n, snapshotEvery }).map((l) => JSON.parse(l));
  const snaps = lines.filter((l) => l.type === 'snapshot');
  return {
    lines,
    events: lines.filter((l) => l.type === 'event'),
    snap: (t) => snaps.find((s) => s.tick === t),
    end: lines[lines.length - 1],
  };
}

export const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;
