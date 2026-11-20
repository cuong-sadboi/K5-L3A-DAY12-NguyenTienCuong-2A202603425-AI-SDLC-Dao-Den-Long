// Chế độ thư giãn (sáng tạo, chỉ ở giao diện): đồi cao thấp, gấp đôi đom đóm, đèn hao dầu chậm một nửa.
// Chế độ chuẩn và headless phải giữ nguyên số chuẩn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hillHeight, surfacesAt } from '../src/sim/core.js';
import { T } from './helpers.js';

test('X1 có đồi và gấp đôi đom đóm; chế độ chuẩn vẫn phẳng và 20 đom đóm', () => {
  assert.equal(createWorld(T, { seed: 3, night: 1 }).motes.length, 20);
  assert.equal(createWorld(T, { seed: 3, night: 1, relax: true }).motes.length, 40);
  let max = 0;
  for (let x = -38; x <= 38; x += 2) for (let z = -38; z <= 38; z += 2) max = Math.max(max, hillHeight(1, x, z));
  assert.ok(max > 1.5, String(max));
  assert.deepEqual(surfacesAt(1, 10, 10), [0]);
  assert.equal(hillHeight(1, 0, 0), 0, 'điểm xuất phát phẳng');
  for (const l of [[0, 25], [23.8, 7.7]]) assert.equal(hillHeight(1, l[0], l[1]), 0, 'chân đèn phẳng');
});

test('X2 đèn hao dầu chậm một nửa (600 tick: chuẩn còn 90, thư giãn còn 95)', () => {
  const sc = { random_motes: false, random_shades: false, lanterns: [{ id: 'L1', lit: true, fuel: 100 }] };
  const a = createWorld(T, { seed: 1, night: 1, scenario: sc });
  const b = createWorld(T, { seed: 1, night: 1, scenario: sc, relax: true });
  for (let i = 0; i < 600; i++) {
    step(a, {});
    step(b, {});
  }
  assert.equal(a.lanterns[0].fuelU / 60, 90);
  assert.equal(b.lanterns[0].fuelU / 60, 95);
});

test('X3 Mây đi qua đồi thì lên xuống theo địa hình, không rơi', () => {
  let best = 0;
  let bestYaw = 0;
  for (let yaw = 0; yaw < 360; yaw += 15) {
    let m = 0;
    for (let d = 0; d <= 28; d += 1) m = Math.max(m, hillHeight(1, Math.sin((yaw * Math.PI) / 180) * d, Math.cos((yaw * Math.PI) / 180) * d));
    if (m > best) (best = m), (bestYaw = yaw);
  }
  const w = createWorld(T, { seed: 1, night: 1, relax: true, scenario: { random_motes: false, random_shades: false } });
  let maxY = 0;
  for (let i = 0; i < 280; i++) {
    step(w, { move: [0, 1], cam_yaw_deg: bestYaw });
    maxY = Math.max(maxY, w.player.pos[1]);
  }
  assert.ok(maxY > 0.5, `cao nhất ${maxY}`);
  assert.equal(w.player.flames, T.flames);
  assert.equal(w.player.grounded, true);
});
