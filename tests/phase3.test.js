// Ticket-03 "Đèn cạn dầu": mỗi luật mới ít nhất một scenario headless.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, T, FAR_LANTERNS } from './helpers.js';

const L = (...upd) => FAR_LANTERNS.map((l) => upd.find((u) => u.id === l.id) || l);

test('F1 đèn sáng hao 1 dầu/giây; hết dầu thì tắt, deposited = 0, nhớ ever_lit, phát lantern_out', () => {
  const r = run({ lanterns: L({ id: 'L1', pos: [5, 0, 5], lit: true, fuel: 1 }) }, [], 80);
  assert.equal(r.snap(30).lanterns[0].fuel, 0.5);
  const out = r.events.find((e) => e.name === 'lantern_out');
  assert.deepEqual([out.tick, out.data], [60, { lantern_id: 'L1' }]);
  assert.deepEqual(r.snap(60).lanterns[0], { id: 'L1', pos: [5, 0, 5], lit: false, deposited: 0, fuel: 0, ever_lit: true, relit_count: 0 });
});

test('F2 châm dầu: used = min(mang, ceil((100 - fuel)/10)), fuel tối đa 100, +5 điểm mỗi đom đóm', () => {
  const r = run({ player: { carried: 10 }, lanterns: L({ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 50 }) }, [{ tick: 0, interact: true }], 3);
  const ref = r.events.find((e) => e.name === 'refuel');
  assert.deepEqual([ref.tick, ref.data], [1, { lantern_id: 'L1', amount: 6, fuel: 100 }]);
  assert.equal(r.snap(1).player.carried, 4);
  assert.equal(r.snap(1).score, 6 * T.score.per_mote);
});

test('F3 thắp lại đèn đã từng sáng chỉ cần relight_cost (5), +40 điểm, relight: true', () => {
  const r = run({ player: { carried: 5 }, lanterns: L({ id: 'L1', pos: [0, 0, 1], ever_lit: true }) }, [{ tick: 0, interact: true }], 3);
  assert.deepEqual(r.events.map((e) => [e.name, e.data]), [
    ['deposit', { lantern_id: 'L1', amount: 5, deposited: 5 }],
    ['lantern_lit', { lantern_id: 'L1', relight: true }],
  ]);
  assert.equal(r.snap(1).score, 5 * T.score.per_mote + 40);
  assert.equal(r.snap(1).lanterns[0].relit_count, 1);
});

test('F4 sức chứa = 10 + 2 × successful_lights, tối đa 20', () => {
  const r = run({ player: { carried: 10 }, lanterns: L({ id: 'L1', pos: [0, 0, 1] }) }, [{ tick: 0, interact: true }], 2);
  assert.equal(r.snap(0).player.capacity, 10);
  assert.equal(r.snap(1).player.capacity, 12);
  assert.equal(run({ player: { successful_lights: 9 } }, [], 1).snap(0).player.capacity, T.capacity_max);
});

test('F5 Bóng Mực wander tới đèn yếu (< 30), cách <= 2 m thì drain: đứng yên hút 5/giây, fuel_drain mỗi 60 tick', () => {
  const sc = { lanterns: L({ id: 'L1', pos: [0, 0, 20], lit: true, fuel: 20 }), shades: [{ id: 'S1', pos: [0, 1, 26] }] };
  const r = run(sc, [], 400);
  const t0 = r.lines.find((l) => l.type === 'snapshot' && l.shades[0].state === 'drain').tick;
  const d1 = r.events.find((e) => e.name === 'fuel_drain');
  assert.equal(d1.tick, t0 + 60);
  assert.deepEqual(Object.keys(d1.data), ['lantern_id', 'shade_id', 'fuel']);
  const f0 = r.snap(t0).lanterns[0].fuel;
  assert.ok(Math.abs(f0 - r.snap(t0 + 60).lanterns[0].fuel - 6) < 0.05, 'mỗi giây mất 1 (hao) + 5 (hút)');
  assert.ok(r.events.some((e) => e.name === 'lantern_out'));
});

test('F6 đèn có fuel < 30 mất vùng an toàn; fuel >= 30 vẫn chặn Bóng Mực', () => {
  const sc = (fuel) => ({ lanterns: L({ id: 'L1', pos: [0, 0, 0], lit: true, fuel }), shades: [{ id: 'S1', pos: [10, 1, 0] }] });
  assert.ok(run(sc(29), [], 300).events.some((e) => e.name === 'player_hit'));
  assert.equal(run(sc(40), [], 300).events.filter((e) => e.name === 'player_hit').length, 0);
});

test('F7 drain -> chase khi Mây vào 6 m; Tỏa Sáng trúng con đang drain được tổng +15', () => {
  const lanterns = L({ id: 'L1', pos: [0, 0, 3], lit: true, fuel: 20 });
  const shades = [{ id: 'S1', pos: [0, 1, 4.5], state: 'drain', target_lantern_id: 'L1' }];
  const r = run({ player: { carried: 3 }, lanterns, shades }, [{ tick: 0, pulse: true }], 3);
  assert.equal(r.snap(1).score, 15);
  const near = run({ lanterns, shades }, [], 2);
  assert.equal(near.snap(1).shades[0].state, 'chase');
});

test('F8 bình minh: dưới ngưỡng ceil(0.6 × tổng) đèn sáng thì thua dawn; hết lửa luôn thua no_flames', () => {
  const two = L({ id: 'L1', lit: true }, { id: 'L2', lit: true });
  const r = run({ lanterns: two, time_left_s: 1 }, [], 100);
  assert.deepEqual(r.events.find((e) => e.name === 'game_over').data, { result: 'lost', reason: 'dawn' });
  const three = L({ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true });
  const w = run({ lanterns: three, time_left_s: 1 }, [], 100);
  assert.deepEqual(w.end, { type: 'end', ticks: 60, state: 'won', score: 3 * (50 + 99) + T.flames * 50 });
});
