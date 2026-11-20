// Test Contract v1.0 ở mức CLI: định dạng JSONL, mã thoát, tất định, file game.contract.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contract } from './helpers.js';

const CLI = new URL('../src/headless.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
let n = 0;
const file = (obj) => {
  const p = join(dir, `f${n++}.json`);
  writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return p;
};
function cli(args) {
  const out = join(dir, `o${n++}.jsonl`);
  const r = spawnSync(process.execPath, [CLI, ...args, '--out', out], { encoding: 'utf8' });
  let text = '';
  try {
    text = readFileSync(out, 'utf8');
  } catch {}
  return { code: r.status, stderr: r.stderr, text, lines: text ? text.trim().split('\n').map((l) => JSON.parse(l)) : [] };
}

test('C1 game.contract.json có đủ trường và tuning', () => {
  for (const k of ['contract_version', 'team', 'build_cmd', 'run_cmd', 'headless_cmd', 'tuning']) assert.ok(k in contract, k);
  assert.equal(contract.contract_version, '1.0');
  const keys = [
    'player_speed', 'carry_capacity', 'lantern_cost', 'lantern_count_night1', 'pickup_radius', 'interact_radius',
    'pulse_cost', 'pulse_radius', 'night1_duration_s', 'flames', 'invuln_s', 'hit_drop_ratio', 'pulse_stun_s',
    'pulse_push_m', 'pulse_cooldown_s', 'safe_radius', 'shade_speed', 'shade_hit_radius', 'fall_enabled', 'score',
  ];
  for (const k of keys) assert.ok(k in contract.tuning, k);
  for (const k of ['per_mote', 'per_lantern', 'per_stun', 'per_second_left', 'per_flame_left']) assert.ok(k in contract.tuning.score, k);
  assert.equal(contract.tuning.lantern_count_night1, 5);
});

test('C2 output: snapshot tick 0, snapshot mỗi 10 tick (mặc định), dòng cuối là end', () => {
  const r = cli(['--seed', '3', '--night', '1', '--ticks', '95']);
  assert.equal(r.code, 0, r.stderr);
  const snaps = r.lines.filter((l) => l.type === 'snapshot');
  assert.deepEqual(snaps.map((s) => s.tick), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  const s = snaps[1];
  for (const k of ['tick', 'sim_tick', 'state', 'time_left_s', 'score', 'player', 'lanterns', 'shades', 'motes_active']) assert.ok(k in s, k);
  assert.deepEqual(Object.keys(s.player), ['pos', 'flames', 'carried']);
  assert.equal(s.lanterns.length, 5);
  assert.deepEqual(r.lines.at(-1), { type: 'end', ticks: 95, state: 'playing', score: r.lines.at(-1).score });
  for (const l of r.lines) for (const v of JSON.stringify(l).match(/-?\d+\.\d+/g) || []) assert.ok(v.split('.')[1].length <= 3, v);
});

test('C3 --snapshot-every 1 cho N+1 snapshot; dừng sớm khi game kết thúc', () => {
  const r = cli(['--seed', '1', '--night', '1', '--ticks', '20', '--snapshot-every', '1']);
  assert.equal(r.lines.filter((l) => l.type === 'snapshot').length, 21);
  const sc = file({ random_shades: false, time_left_s: 0.5 });
  const e = cli(['--seed', '1', '--night', '1', '--ticks', '1000', '--scenario', sc]);
  assert.equal(e.code, 0);
  assert.deepEqual(e.lines.at(-1), { type: 'end', ticks: 30, state: 'lost', score: 0 });
});

test('C4 tất định: cùng seed giống hệt từng byte, khác seed thì khác', () => {
  const a = cli(['--seed', '42', '--night', '1', '--ticks', '3000']);
  const b = cli(['--seed', '42', '--night', '1', '--ticks', '3000']);
  const c = cli(['--seed', '43', '--night', '1', '--ticks', '3000']);
  assert.equal(a.text, b.text);
  assert.notEqual(a.text, c.text);
});

test('C5 file inputs/scenario sai định dạng thì thoát mã 2 và báo lỗi ra stderr', () => {
  const bad = [
    ['--inputs', file('{ not json')],
    ['--inputs', file({ frames: [{ tick: 5 }, { tick: 5 }] })],
    ['--inputs', file({ frames: [{ tick: 0, move: [2, 0] }] })],
    ['--inputs', file({ frames: [{ tick: 0, interact: 'yes' }] })],
    ['--scenario', file({ lanterns: [{ id: 'L9' }] })],
    ['--scenario', file({ motes: 'many' })],
    ['--scenario', join(dir, 'khong-ton-tai.json')],
  ];
  for (const extra of bad) {
    const r = cli(['--seed', '1', '--night', '1', '--ticks', '10', ...extra]);
    assert.equal(r.code, 2, extra.join(' '));
    assert.ok(r.stderr.length > 0);
  }
});

test('C6 tham số sai thì thoát mã khác 0', () => {
  for (const args of [['--night', '1', '--ticks', '5'], ['--seed', '1', '--night', '2', '--ticks', '5'], ['--seed', 'x', '--night', '1', '--ticks', '5']]) {
    const r = cli(args);
    assert.notEqual(r.code, 0, args.join(' '));
  }
  const r = spawnSync(process.execPath, [CLI, '--seed', '1', '--night', '1', '--ticks', '5'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
});

test('C7 ví dụ trên board (scenario + inputs mẫu) chạy được, sự kiện ghi tick = k+1', () => {
  const sc = file({
    player: { pos: [0, 0, 0], carried: 0, flames: 3 },
    random_motes: false,
    random_shades: false,
    motes: [[0, 0, 5]],
    shades: [{ pos: [10, 0, 0] }],
    lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 0 }],
    time_left_s: 300,
  });
  const inp = file({
    frames: [
      { tick: 0, move: [0, 1], cam_yaw_deg: 0 },
      { tick: 120, move: [0, 0], interact: true },
      { tick: 121, interact: false },
      { tick: 200, pulse: true },
      { tick: 201, pulse: false },
    ],
  });
  const r = cli(['--seed', '1', '--night', '1', '--scenario', sc, '--inputs', inp, '--ticks', '300']);
  assert.equal(r.code, 0, r.stderr);
  const pulse = r.lines.find((l) => l.name === 'pulse');
  assert.equal(pulse.tick, 201);
  assert.equal(r.lines.find((l) => l.type === 'snapshot' && l.tick === 120).player.pos[2], 12);
});
