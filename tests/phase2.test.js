// Tính năng mới của Ticket-02: mỗi tính năng ít nhất một scenario headless.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, T, ticks, near } from './helpers.js';

test('P1 lướt: 14 m/s trong 0.2 s theo hướng di chuyển, hồi chiêu 1.5 s tính từ lúc bắt đầu', () => {
  const r = run({}, [{ tick: 0, move: [0, 1], dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 90, dash: true }], 100);
  const dashes = r.events.filter((e) => e.name === 'dash').map((e) => e.tick);
  assert.deepEqual(dashes, [1, 91]);
  const z12 = r.snap(12).player.pos[2];
  assert.ok(near(z12, (T.dash_speed * ticks(T.dash_duration_s)) / 60), `z sau 12 tick = ${z12}`);
  assert.equal(r.snap(1).player.dash_cd_s, T.dash_cooldown_s);
});

test('P2 lướt khi đứng yên đi theo hướng đang quay mặt (+Z lúc xuất phát); trên không giữ độ cao', () => {
  const r = run({}, [{ tick: 0, jump: true, dash: true }], 20);
  const p = r.snap(12).player;
  assert.ok(p.pos[2] > 2 && near(p.pos[0], 0), JSON.stringify(p.pos));
  assert.equal(r.snap(5).player.pos[1], r.snap(10).player.pos[1]);
});

test('P3 tạm dừng: tick vẫn tăng, sim_tick và thời gian đứng yên, state "paused"', () => {
  const frames = [{ tick: 9, pause: true }, { tick: 10, pause: false }, { tick: 29, pause: true }];
  const r = run({}, frames, 40);
  assert.deepEqual(r.events.map((e) => [e.tick, e.name]), [[10, 'paused'], [30, 'resumed']]);
  assert.equal(r.snap(20).state, 'paused');
  assert.equal(r.snap(20).sim_tick, 9);
  assert.equal(r.snap(20).time_left_s, r.snap(10).time_left_s);
  assert.equal(r.snap(30).sim_tick, 10);
});

test('P4 rơi khỏi đảo (Y < -10): -1 lửa, mất hết đom đóm, chờ 60 tick rồi hồi sinh ở điểm xuất phát, bất tử', () => {
  const r = run({ player: { pos: [39.5, 0, 0], carried: 4 } }, [{ tick: 0, move: [1, 0], cam_yaw_deg: 0 }, { tick: 5, move: [0, 0] }], 300);
  const fall = r.events.find((e) => e.name === 'player_hit');
  assert.deepEqual(fall.data, { by: 'fall', flames: T.flames - 1, dropped: 0, lost: 4 });
  const after = r.snap(fall.tick + 60).player;
  assert.deepEqual(after.pos, [0, 0, 0]);
  assert.equal(after.invuln, true);
  assert.equal(after.carried, 0);
});

test('P5 bị Bóng Mực đánh rơi floor(mang/2) đom đóm ra vành 1.5–2.5 m, tồn tại 480 tick', () => {
  const r = run({ player: { carried: 5 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }, [], 10);
  const hit = r.events.find((e) => e.name === 'player_hit');
  assert.deepEqual(hit.data, { by: 'shade', flames: T.flames - 1, dropped: 2 });
  const s = r.snap(hit.tick);
  const dropped = s.motes.filter((m) => m.kind === 'dropped');
  assert.equal(dropped.length, 2);
  for (const m of dropped) {
    const d = Math.hypot(m.pos[0] - s.player.pos[0], m.pos[2] - s.player.pos[2]);
    assert.ok(d >= 1.5 - 1e-3 && d <= 2.5 + 1e-3, String(d));
    assert.equal(m.ttl_s, 8);
  }
  assert.equal(s.shades[0].state, 'recoil');
});

test('P6 Bóng Mực: ngoài 12 m thì wander, trong 12 m thì chase', () => {
  const r = run({ shades: [{ id: 'S1', pos: [13, 1, 0] }, { id: 'S2', pos: [-11, 1, 0] }] }, [], 2);
  assert.deepEqual(r.snap(1).shades.map((s) => s.state), ['wander', 'chase']);
});

test('P7 đèn vừa thắp đẩy Bóng Mực bên trong ra mép 6 m trong 30 tick, không gây sát thương', () => {
  const lanterns = [{ id: 'L1', pos: [0, 0, 1.5] }, ...['L2', 'L3', 'L4', 'L5'].map((id, i) => ({ id, pos: [200 + i, 0, 200] }))];
  const sc = { player: { carried: T.lantern_cost }, lanterns, shades: [{ id: 'S1', pos: [3, 1, 1.5] }] };
  const r = run(sc, [{ tick: 0, interact: true }], 40);
  assert.equal(r.events.filter((e) => e.name === 'player_hit').length, 0);
  const s = r.snap(31).shades[0].pos;
  assert.ok(Math.hypot(s[0], s[2] - 1.5) >= T.safe_radius - 1e-3, JSON.stringify(s));
});

test('P8 Đêm 2: bục nhảy bắn sang đảo kia, bay khoảng 1.4 s', () => {
  const r = run({ player: { pos: [20, 0, 18] } }, [], 150, { night: 2 });
  const land = r.lines.filter((l) => l.type === 'snapshot' && l.tick > 5).find((s) => s.player.grounded);
  assert.ok(land, 'không thấy chạm đất');
  assert.ok(Math.abs(land.tick - 85) <= 3, `chạm đất ở tick ${land.tick}`);
  const p = land.player.pos;
  assert.ok(Math.hypot(p[0] - 70, p[2]) <= 28, JSON.stringify(p));
});

test('P9 Đêm 2: Gió Lạc đuổi khi Mây mang >= 5 đom đóm, cướp 3, bỏ chạy 240 tick rồi biến mất', () => {
  const r = run({ player: { carried: 6 }, drifters: [{ id: 'D1', pos: [6, 1.5, 0] }] }, [], 400, { night: 2 });
  const steal = r.events.find((e) => e.name === 'drifter_steal');
  assert.deepEqual(steal.data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.equal(r.snap(steal.tick).drifters[0].state, 'flee');
  assert.equal(r.snap(steal.tick + 240).drifters[0].state, 'removed');
  const calm = run({ player: { carried: 4 }, drifters: [{ id: 'D1', pos: [6, 1.5, 0] }] }, [], 60, { night: 2 });
  assert.equal(calm.events.length, 0);
});

test('P10 Tỏa Sáng trúng Gió Lạc đang bỏ chạy có mang đồ thì thả lại đom đóm (drifter_drop)', () => {
  const sc = { player: { carried: T.pulse_cost }, drifters: [{ id: 'D1', pos: [2, 1.5, 0], state: 'flee', stolen: 3 }] };
  const r = run(sc, [{ tick: 0, pulse: true }], 10, { night: 2 });
  const drop = r.events.find((e) => e.name === 'drifter_drop');
  assert.deepEqual([drop.tick, drop.data], [1, { drifter_id: 'D1', amount: 3 }]);
  assert.equal(r.snap(1).motes.filter((m) => m.kind === 'dropped').length, 3);
});

test('P11 Bùa Gió: nhặt như đom đóm, 600 tick chạy 7.2 m/s, xuất hiện lại sau 2700 tick', () => {
  const r = run({ player: { pos: [35, 0, 0] } }, [{ tick: 1, move: [-1, 0] }], 62, { night: 2 });
  const c = r.events.find((e) => e.name === 'charm_picked');
  assert.deepEqual([c.tick, c.data], [1, { charm_id: 'C1', charm_ticks: 600 }]);
  const s1 = r.snap(1);
  assert.deepEqual(s1.charms[0], { id: 'C1', available: false, respawn_s: 45 });
  assert.equal(s1.player.charm_s, 10);
  assert.ok(near(s1.player.pos[0] - r.snap(61).player.pos[0], 7.2), JSON.stringify(r.snap(61).player.pos));
});

test('P12 Đêm 3: vách tầng chặn đi lên, dốc ở 30° đưa lên tầng 1 (Y = 3)', () => {
  const wall = run({ player: { pos: [0, 0, 10] } }, [{ tick: 0, move: [0, 1] }], 60, { night: 3 });
  assert.ok(wall.snap(60).player.pos[2] <= 12 && wall.snap(60).player.pos[1] === 0, JSON.stringify(wall.snap(60).player.pos));
  const a = (30 * Math.PI) / 180;
  const start = [Math.cos(a) * 31, 0, Math.sin(a) * 31];
  const yaw = (Math.atan2(-Math.cos(a), -Math.sin(a)) * 180) / Math.PI;
  const ramp = run({ player: { pos: start } }, [{ tick: 0, move: [0, 1], cam_yaw_deg: yaw }], 90, { night: 3 });
  assert.ok(near(ramp.snap(90).player.pos[1], 3), JSON.stringify(ramp.snap(90).player.pos));
});

test('P13 Đêm 3: gió mạnh mỗi 30 s kéo dài 5 s, đẩy Mây 2 m/s', () => {
  const r = run({ wind_enabled: true }, [], 1900, { night: 3, snapshotEvery: 10 });
  assert.equal(r.snap(1790).wind.active, false);
  assert.equal(r.snap(1800).wind.active, true);
  const p0 = r.snap(1800).player.pos;
  const p1 = r.snap(1860).player.pos;
  assert.ok(near(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), 2, 0.05), `${p0} -> ${p1}`);
});

test('P14 đom đóm: 20 lúc đầu, thêm 1 mỗi 240 tick', () => {
  const r = run({ random_motes: true }, [], 250, { snapshotEvery: 10 });
  assert.equal(r.snap(0).motes_active, 20);
  assert.equal(r.snap(240).motes_active, 21);
  assert.equal(new Set(r.snap(0).motes.map((m) => m.pos.join())).size, 20);
});

test('P15 Đêm 2 và 3 có đúng số đèn (6 và 7) theo bản đồ chuẩn', () => {
  assert.equal(run({}, [], 1, { night: 2 }).snap(0).lanterns.length, 6);
  const n3 = run({}, [], 1, { night: 3 }).snap(0);
  assert.equal(n3.lanterns.length, 7);
  assert.deepEqual(n3.lanterns[0].pos, [0, 6, 6]);
});
