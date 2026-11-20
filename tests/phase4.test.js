// Ticket-04: bảng xếp hạng (hàm thuần + lệnh xuất), soak test, cảnh benchmark chuẩn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validName, addEntry, sortEntries, isoWithOffset } from '../src/sim/leaderboard.js';
import { createBenchWorld, step } from '../src/sim/core.js';
import { T } from './helpers.js';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const e = (name, score, at) => ({ name, score, nights_won: 1, achieved_at: at, seed: 1 });

test('B1 tên 3–12 ký tự [A-Za-z0-9_], nhận thêm chữ tiếng Việt có dấu', () => {
  for (const ok of ['May', 'Cuong_2004', 'abcdefghijkl', 'Cường']) assert.ok(validName(ok), ok);
  for (const bad of ['ab', 'abcdefghijklm', 'co dau cach', 'a-b-c', '']) assert.ok(!validName(bad), bad);
});

test('B2 top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên', () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addEntry(list, e(`P${i}xx`, i * 10, `2026-11-20T10:00:${String(i).padStart(2, '0')}+07:00`));
  assert.equal(list.length, 10);
  assert.deepEqual(list.map((x) => x.score), [110, 100, 90, 80, 70, 60, 50, 40, 30, 20]);
  const tie = sortEntries([e('Late1', 50, '2026-11-20T10:00:05+07:00'), e('Early', 50, '2026-11-20T09:00:00+07:00')]);
  assert.deepEqual(tie.map((x) => x.name), ['Early', 'Late1']);
  assert.match(isoWithOffset(new Date()), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
});

test('B3 run_cmd --export-leaderboard xuất {"entries": [...]} đúng thứ tự từ data/leaderboard.json', () => {
  const file = join(root, 'data', 'leaderboard.json');
  const backup = existsSync(file) ? readFileSync(file, 'utf8') : null;
  try {
    mkdirSync(join(root, 'data'), { recursive: true });
    writeFileSync(file, JSON.stringify({ entries: [e('Bbb', 10, '2026-11-20T10:00:00+07:00'), e('Aaa', 30, '2026-11-20T11:00:00+07:00')] }));
    const out = join(mkdtempSync(join(tmpdir(), 'lb-')), 'out.json');
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'run.js'), '--export-leaderboard', out], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).entries.map((x) => x.name), ['Aaa', 'Bbb']);
  } finally {
    if (backup === null) rmSync(file, { force: true });
    else writeFileSync(file, backup);
  }
});

test('S1 soak: 10 Đêm, không crash, bộ nhớ cuối <= 1.2 × đầu, kết quả từng Đêm', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'soak-')), 'soak.json');
  const r = spawnSync(process.execPath, ['--expose-gc', join(root, 'src', 'soak.js'), '--seed', '7', '--nights', '10', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(s.nights, 10);
  assert.equal(s.crashes, 0);
  assert.equal(s.results.length, 10);
  assert.ok(s.results.every((x) => x === 'won' || x === 'lost'));
  assert.ok(s.mem_end_mb <= 1.2 * s.mem_start_mb, `${s.mem_end_mb} > 1.2 × ${s.mem_start_mb}`);
});

test('K1 cảnh bench: 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng dầu 100; không sinh, không sát thương, không hao dầu, không kết thúc', () => {
  const w = createBenchWorld(T, 42);
  assert.equal(w.shades.length, 200);
  assert.ok(w.shades.every((s) => s.state === 'wander'));
  assert.equal(w.motes.length, 100);
  assert.deepEqual(w.lanterns.map((l) => l.lit), [true, true, true, false, false]);
  for (let i = 0; i < 60 * 60 * 5; i++) step(w, { move: [0, 0] });
  assert.equal(w.state, 'playing');
  assert.equal(w.player.flames, T.flames);
  assert.equal(w.shades.length, 200);
  assert.equal(w.motes.length, 100);
  assert.equal(w.lanterns[0].fuelU, T.fuel_max * 60);
});
