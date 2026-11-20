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
  // Ticket-02: contract v1.1, tuning phải khớp số chuẩn (Phần 1).
  assert.equal(contract.contract_version, '1.1');
  const standard = {
    player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5, pickup_radius: 1, interact_radius: 2,
    pulse_cost: 3, pulse_radius: 5, night1_duration_s: 300, flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5, pulse_stun_s: 2,
    pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6, shade_speed: 4, shade_hit_radius: 1, fall_enabled: true,
    dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5, night2_duration_s: 330, night3_duration_s: 360,
  };
  for (const [k, v] of Object.entries(standard)) assert.equal(contract.tuning[k], v, k);
  assert.deepEqual(contract.tuning.score, { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 });
});

test('C2 output: snapshot tick 0, snapshot mỗi 10 tick (mặc định), dòng cuối là end', () => {
  const r = cli(['--seed', '3', '--night', '1', '--ticks', '95']);
  assert.equal(r.code, 0, r.stderr);
  const snaps = r.lines.filter((l) => l.type === 'snapshot');
  assert.deepEqual(snaps.map((s) => s.tick), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  const s = snaps[1];
  const keys = ['tick', 'sim_tick', 'night', 'state', 'time_left_s', 'score', 'wind', 'player', 'lanterns', 'shades', 'motes_active', 'motes', 'drifters', 'charms'];
  for (const k of keys) assert.ok(k in s, k);
  assert.deepEqual(Object.keys(s.wind), ['active', 'dir_deg']);
  assert.deepEqual(Object.keys(s.player), ['pos', 'vel', 'grounded', 'flames', 'carried', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']);
  assert.deepEqual(Object.keys(s.motes[0]), ['id', 'pos', 'kind', 'ttl_s']);
  assert.equal(s.lanterns.length, 5);
  assert.equal(r.lines[1].name, 'night_start');
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
  // Ticket-02: --night nhận 1, 2, 3 nên dùng night 4 làm giá trị sai.
  for (const args of [['--night', '1', '--ticks', '5'], ['--seed', '1', '--night', '4', '--ticks', '5'], ['--seed', 'x', '--night', '1', '--ticks', '5']]) {
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
  assert.equal(r.lines.find((l) => l.name === 'mote_picked').tick, 40);
  assert.equal(r.lines.find((l) => l.type === 'snapshot' && l.tick === 120).player.pos[2], 12);
  // Ticket-02: pulse_cost = 3, Mây chỉ mang 1 đom đóm nên tỏa sáng không kích hoạt (Phase 1 có pulse ở tick 201).
  assert.equal(r.lines.filter((l) => l.name === 'pulse').length, 0);
});

test('C8 --night 2 và 3 chạy được; một Đêm đầy đủ chạy xong <= 30 giây', () => {
  for (const night of ['2', '3']) {
    const t0 = Date.now();
    const r = cli(['--seed', '9', '--night', night, '--ticks', '21600']);
    assert.equal(r.code, 0, r.stderr);
    assert.ok(Date.now() - t0 < 30000);
    assert.equal(r.lines[0].night, Number(night));
  }
});
