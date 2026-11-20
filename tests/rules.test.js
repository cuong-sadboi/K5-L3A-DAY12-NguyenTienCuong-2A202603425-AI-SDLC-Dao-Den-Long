// Luật gameplay (Phase 1, cập nhật theo số chuẩn Ticket-02). Kết quả mong đợi tính từ tuning trong game.contract.json.
// Những chỗ đổi so với Phase 1 có ghi "Ticket-02:" kèm lý do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, T, ticks, near, FAR_LANTERNS } from './helpers.js';

const withLanterns = (...upd) => FAR_LANTERNS.map((l) => upd.find((u) => u.id === l.id) || l);

test('R1 di chuyển: move [0,1] trong 1 giây đi đúng player_speed theo +Z', () => {
  const r = run({}, [{ tick: 0, move: [0, 1] }], 60);
  const p = r.snap(60).player.pos;
  assert.ok(near(p[2], T.player_speed) && near(p[0], 0), JSON.stringify(p));
});

test('R2 cam_yaw_deg 90: move [0,1] đi theo +X', () => {
  const r = run({}, [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }], 60);
  const p = r.snap(60).player.pos;
  assert.ok(near(p[0], T.player_speed) && near(p[2], 0), JSON.stringify(p));
});

test('R3 vector dài hơn 1 được chuẩn hóa; frame giữ giá trị cũ khi vắng trường', () => {
  const r = run({}, [{ tick: 0, move: [1, 1] }, { tick: 30, jump: false }], 60);
  const p = r.snap(60).player.pos;
  assert.ok(near(Math.hypot(p[0], p[2]), T.player_speed), JSON.stringify(p));
});

test('R4 nhặt đom đóm tự động khi khoảng cách <= pickup_radius', () => {
  const r = run({ motes: [[0, 0, T.pickup_radius]] }, [], 5);
  const e = r.events.find((x) => x.name === 'mote_picked');
  assert.equal(e.tick, 1);
  assert.deepEqual(e.data, { carried: 1 });
  // Ticket-02: điểm đom đóm tính lúc NẠP vào đèn, không tính lúc nhặt.
  assert.equal(r.snap(1).score, 0);
  const far = run({ motes: [[0, 0, T.pickup_radius + 0.01]] }, [], 30);
  assert.equal(far.events.length, 0);
});

test('R5 không mang quá carry_capacity', () => {
  const motes = Array.from({ length: T.carry_capacity + 2 }, () => [0, 0, 0]);
  const r = run({ motes }, [], 3);
  assert.equal(r.snap(3).player.carried, T.carry_capacity);
  assert.equal(r.snap(3).motes_active, 2);
});

test('R6 nạp đèn trong interact_radius: deposit + lantern_lit + điểm', () => {
  const lanterns = withLanterns({ id: 'L1', pos: [0, 0, T.interact_radius] });
  const r = run({ player: { carried: T.lantern_cost }, lanterns }, [{ tick: 0, interact: true }], 5);
  const dep = r.events.find((x) => x.name === 'deposit');
  assert.equal(dep.tick, 1);
  assert.deepEqual(dep.data, { lantern_id: 'L1', amount: T.lantern_cost, deposited: T.lantern_cost });
  const lit = r.events.find((x) => x.name === 'lantern_lit');
  // Ticket-03: lantern_lit thêm trường relight.
  assert.deepEqual([lit.tick, lit.data], [1, { lantern_id: 'L1', relight: false }]);
  // Ticket-02: +per_mote cho mỗi đom đóm nạp, +per_lantern khi thắp (Ticket-03: per_mote = 5).
  assert.equal(r.snap(1).score, T.score.per_lantern + T.score.per_mote * T.lantern_cost);
  assert.equal(r.snap(1).lanterns.find((l) => l.id === 'L1').lit, true);
});

test('R7 nạp một phần thì chưa thắp; ngoài interact_radius thì không nạp', () => {
  const lanterns = withLanterns({ id: 'L1', pos: [0, 0, 1] });
  const r = run({ player: { carried: 1 }, lanterns }, [{ tick: 0, interact: true }], 3);
  assert.deepEqual(r.events.map((e) => e.name), ['deposit']);
  assert.equal(r.snap(3).lanterns.find((l) => l.id === 'L1').deposited, 1);
  const out = run(
    { player: { carried: 1 }, lanterns: withLanterns({ id: 'L1', pos: [0, 0, T.interact_radius + 0.01] }) },
    [{ tick: 0, interact: true }],
    3,
  );
  assert.equal(out.events.length, 0);
});

test('R8 thắp hết đèn KHÔNG kết thúc Đêm; bình minh còn >= ceil(0.6 × tổng) đèn sáng thì thắng dawn_survived', () => {
  // Ticket-03 thay luật Phase 1–2 "thắng ngay khi tất cả đèn sáng" (all_lit không còn dùng).
  const lanterns = FAR_LANTERNS.map((l) => (l.id === 'L1' ? { id: 'L1', pos: [0, 0, 1] } : { ...l, lit: true }));
  const r = run({ player: { carried: T.lantern_cost }, lanterns, time_left_s: 2 }, [{ tick: 0, interact: true }], 200);
  assert.deepEqual(r.events.filter((e) => e.tick === 1).map((e) => e.name), ['deposit', 'lantern_lit']);
  const over = r.events.find((e) => e.name === 'game_over');
  assert.deepEqual([over.tick, over.data], [120, { result: 'won', reason: 'dawn_survived' }]);
  const fuel = T.fuel_max - 2; // 4 đèn đặt sẵn và L1 đều cháy 2 giây (L1 thắp ở tick 1 nên còn 98.0167 -> floor 98)
  const expected = T.score.per_mote * T.lantern_cost + T.score.per_lantern + 5 * (50 + fuel) + T.flames * T.score.per_flame_left;
  assert.equal(r.end.score, expected);
});

test('R9 dựng scenario không phát sự kiện và không cộng điểm', () => {
  const lanterns = withLanterns({ id: 'L2', pos: [5, 0, 5], lit: true, deposited: 10 });
  const r = run({ lanterns }, [], 10);
  assert.equal(r.events.length, 0);
  assert.equal(r.snap(0).score, 0);
  const l2 = r.snap(0).lanterns.find((l) => l.id === 'L2');
  // Ticket-03: đèn có thêm fuel (mặc định 100 khi lit: true), ever_lit, relit_count.
  assert.deepEqual(l2, { id: 'L2', pos: [5, 0, 5], lit: true, deposited: 10, fuel: 100, ever_lit: true, relit_count: 0 });
});

test('R10 Bóng Mực trong tầm phát hiện đuổi theo, chạm (<= shade_hit_radius) thì mất 1 flame', () => {
  const d = 10;
  const r = run({ shades: [{ id: 'S1', pos: [d, 1, 0] }] }, [], 600);
  const hit = r.events.find((x) => x.name === 'player_hit');
  const expectedTick = Math.ceil(((d - T.shade_hit_radius) / T.shade_speed) * 60);
  assert.ok(Math.abs(hit.tick - expectedTick) <= 1, `hit tick ${hit.tick}, mong đợi ~${expectedTick}`);
  assert.deepEqual(hit.data, { by: 'shade', flames: T.flames - 1, dropped: 0 });
});

test('R11 bất tử invuln_s sau khi bị chạm; hết flame thì thua no_flames', () => {
  const r = run({ shades: [{ id: 'S1', pos: [2, 1, 0] }] }, [], 2000);
  const hits = r.events.filter((x) => x.name === 'player_hit');
  assert.equal(hits.length, T.flames);
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].tick - hits[i - 1].tick >= ticks(T.invuln_s));
  const over = r.events.find((x) => x.name === 'game_over');
  assert.deepEqual(over.data, { result: 'lost', reason: 'no_flames' });
  assert.equal(r.end.state, 'lost');
});

test('R12 tỏa sáng: tốn pulse_cost, choáng + đẩy Bóng Mực trong pulse_radius, cộng per_stun', () => {
  const x0 = T.pulse_radius - 0.5;
  const r = run({ player: { carried: T.pulse_cost }, shades: [{ id: 'S1', pos: [x0, 1, 0] }] }, [{ tick: 0, pulse: true }], 400);
  const pulse = r.events.find((x) => x.name === 'pulse');
  assert.deepEqual([pulse.tick, pulse.data], [1, { stunned_ids: ['S1'] }]);
  assert.equal(r.snap(1).shades[0].state, 'stunned');
  // Ticket-02: đẩy lùi tổng pulse_push_m trong 15 tick đầu (không còn đẩy tức thì).
  assert.ok(near(r.snap(15).shades[0].pos[0], x0 + T.pulse_push_m), JSON.stringify(r.snap(15).shades[0]));
  assert.equal(r.snap(1).player.carried, 0);
  assert.equal(r.snap(1).score, T.score.per_stun);
  const stun = ticks(T.pulse_stun_s);
  assert.equal(r.snap(stun).shades[0].state, 'stunned');
  assert.notEqual(r.snap(stun + 1).shades[0].state, 'stunned');
});

test('R13 tỏa sáng kích hoạt theo cạnh false->true, tôn trọng hồi chiêu và chi phí', () => {
  const cd = ticks(T.pulse_cooldown_s);
  // Ticket-02: pulse_cost = 3 nên mang 10 để đủ cho 2 lần.
  const held = run({ player: { carried: 10 } }, [{ tick: 0, pulse: true }], cd * 3);
  assert.equal(held.events.filter((e) => e.name === 'pulse').length, 1);
  const frames = [
    { tick: 0, pulse: true },
    { tick: 1, pulse: false },
    { tick: 5, pulse: true },
    { tick: 6, pulse: false },
    { tick: cd + 1, pulse: true },
  ];
  const r = run({ player: { carried: 10 } }, frames, cd + 10);
  assert.deepEqual(r.events.filter((e) => e.name === 'pulse').map((e) => e.tick), [1, cd + 2]);
  const broke = run({ player: { carried: T.pulse_cost - 1 } }, [{ tick: 0, pulse: true }], 5);
  assert.equal(broke.events.length, 0);
});

test('R14 Bóng Mực không vào được safe_radius quanh ĐÈN ĐÃ SÁNG; đèn chưa sáng không chặn', () => {
  // Ticket-02 (trả lời giả định A1): chỉ đèn đã sáng tạo vùng an toàn.
  const lit = run({ lanterns: withLanterns({ id: 'L1', pos: [0, 0, 0], lit: true }), shades: [{ id: 'S1', pos: [10, 1, 0] }] }, [], 900);
  for (const l of lit.lines.filter((x) => x.type === 'snapshot')) {
    const s = l.shades[0].pos;
    assert.ok(Math.hypot(s[0], s[2]) >= T.safe_radius - 1e-3, `tick ${l.tick}: ${s}`);
  }
  assert.equal(lit.events.filter((e) => e.name === 'player_hit').length, 0);
  const unlit = run({ lanterns: withLanterns({ id: 'L1', pos: [0, 0, 0] }), shades: [{ id: 'S1', pos: [10, 1, 0] }] }, [], 900);
  assert.ok(unlit.events.some((e) => e.name === 'player_hit'));
});

test('R15 time_left_s giảm theo số bước; hết giờ thì thua dawn', () => {
  const r = run({}, [], 130);
  assert.equal(r.snap(120).time_left_s, T.night1_duration_s - 2);
  const dawn = run({ time_left_s: 1 }, [], 500);
  const over = dawn.events.find((e) => e.name === 'game_over');
  assert.deepEqual([over.tick, over.data], [60, { result: 'lost', reason: 'dawn' }]);
  assert.deepEqual(dawn.end, { type: 'end', ticks: 60, state: 'lost', score: 0 });
});

test('R16 scenario: shades [] thay danh sách; random_shades vẫn sinh theo lịch (2 con ở tick 300)', () => {
  // Ticket-02: lịch sinh chuẩn là 2 con tại tick 300 (Phase 1 tôi tự chọn giây 15).
  const r = run({ random_shades: true, shades: [] }, [], 400);
  assert.equal(r.snap(0).shades.length, 0);
  const sp = r.events.filter((e) => e.name === 'shade_spawned');
  assert.deepEqual(sp.map((e) => e.tick), [300, 300]);
  assert.equal(r.snap(300).shades[0].state, 'spawning');
  assert.equal(r.snap(301).shades[0].state, 'wander');
});

test('R17 nhảy chỉ đổi độ cao, không đổi vị trí XZ', () => {
  const r = run({}, [{ tick: 0, jump: true }], 20);
  const p = r.snap(10).player.pos;
  assert.ok(p[1] > 0 && p[0] === 0 && p[2] === 0, JSON.stringify(p));
  assert.equal(r.snap(10).player.grounded, false);
});
