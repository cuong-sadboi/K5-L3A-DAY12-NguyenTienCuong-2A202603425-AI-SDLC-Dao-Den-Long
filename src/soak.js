#!/usr/bin/env node
// Soak test (Ticket-04): node --expose-gc src/soak.js --seed 7 --nights 10 --out soak.json
// Chạy headless N Đêm liên tiếp trong cùng một tiến trình (Đêm 1 -> 2 -> 3 xoay vòng), Đêm thứ i (i = 0..N-1) dùng seed + i.
// Input ngẫu nhiên theo seed: mỗi 30 tick chọn lại hướng đi; mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createWorld, step, createRng, NIGHTS, TICK_RATE } from './sim/core.js';

function fail(msg) {
  process.stderr.write(`soak: ${msg}\n`);
  process.exit(1);
}
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) {
  if (!['--seed', '--nights', '--out'].includes(argv[i]) || argv[i + 1] === undefined) fail(`tham số không hợp lệ: ${argv[i]}`);
  args[argv[i].slice(2)] = argv[i + 1];
}
const seed = Number(args.seed ?? 7);
const nights = Number(args.nights ?? 10);
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) fail('--seed và --nights phải là số nguyên, nights >= 1');
if (!args.out) fail('thiếu --out');

const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
const T = contract.tuning;
const rssMb = () => Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
const t0 = performance.now();
let memStart = null;
let crashes = 0;
const results = [];

for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1;
  const s = seed + i;
  try {
    let world = createWorld(T, { seed: s, night });
    if (i === 0) memStart = rssMb();
    const rnd = createRng((s * 2654435761) >>> 0);
    const maxTicks = Math.round(T[NIGHTS[night].durationKey] * TICK_RATE);
    let move = [0, 0];
    for (let k = 0; k < maxTicks && world.state === 'playing'; k++) {
      if (k % 30 === 0) {
        const a = rnd() * Math.PI * 2;
        move = [Math.cos(a), Math.sin(a)];
      }
      const input = { move, cam_yaw_deg: 0, jump: rnd() < 0.05, dash: rnd() < 0.03, pulse: rnd() < 0.02, interact: rnd() < 0.1, pause: false };
      step(world, input);
    }
    results.push(world.state === 'won' ? 'won' : 'lost');
    world = null; // reset Đêm
  } catch (e) {
    crashes += 1;
    results.push('crash');
    process.stderr.write(`soak: Đêm thứ ${i} (night ${night}, seed ${s}) lỗi: ${e.stack || e}\n`);
  }
}
if (globalThis.gc) globalThis.gc();
const report = {
  nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: rssMb(),
  duration_s: Math.round((performance.now() - t0) / 100) / 10,
};
mkdirSync(dirname(resolve(args.out)), { recursive: true });
writeFileSync(args.out, JSON.stringify(report) + '\n');
console.log(JSON.stringify(report));
process.exit(0);
